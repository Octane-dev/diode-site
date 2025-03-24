require('dotenv').config();
const express = require('express');
const passport = require('passport');
const querystring = require('querystring');
const axios = require('axios');
const router = express.Router();
const config = require('./config');
const NodeCache = require('node-cache');
const nodemailer = require('nodemailer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { getGuildRoles, getGuildChannels } = require('./controllers/guildController');


// Ping Discord Bot

app.get('/ping', (req, res) => {
    res.status(200).send('Pong!');
});

///////////////////////////

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/discord');
}

class RequestQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.globalCooldown = false; // Track global rate limits
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const { requestFunction, resolve, reject } = this.queue.shift();

            try {
                // Wait for global cooldown if active
                if (this.globalCooldown) {
                    console.warn('Global cooldown active. Waiting...');
                    await new Promise((resolve) => setTimeout(resolve, this.globalCooldown));
                    this.globalCooldown = false; // Reset cooldown
                }

                const result = await requestFunction();
                resolve(result);
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    // Handle rate limit: Extract retry_after
                    const retryAfter = Math.ceil(err.response.data.retry_after * 1000); // Convert seconds to ms
                    console.warn(`Rate limit hit. Retrying after ${retryAfter}ms...`);
                    this.globalCooldown = retryAfter; // Set global cooldown
                    this.queue.unshift({ requestFunction, resolve, reject }); // Re-add the request to the queue
                    await new Promise((resolve) => setTimeout(resolve, retryAfter)); // Wait for cooldown
                } else {
                    reject(err);
                }
            }
        }

        this.isProcessing = false;
    }

    addToQueue(requestFunction) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFunction, resolve, reject });
            this.processQueue();
        });
    }
}

const requestQueue = new RequestQueue();

async function fetchGuildDataWithRateLimit(guild, botToken) {
    return requestQueue.addToQueue(async () => {
        return await axios.get(`https://discord.com/api/v10/guilds/${guild.id}`, {
            headers: {
                Authorization: `Bot ${botToken}`,
            },
        });
    });
}

const guildCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

async function fetchGuildDataWithCache(guild, botToken) {
    const cacheKey = `guild_${guild.id}`;

    const cachedData = guildCache.get(cacheKey);
    if (cachedData) {
        console.log(`Cache hit for guild ${guild.id}`);
        return cachedData;
    }

    return requestQueue.addToQueue(async () => {
        try {
            const response = await axios.get(`https://discord.com/api/v10/guilds/${guild.id}`, {
                headers: {
                    Authorization: `Bot ${botToken}`,
                },
            });

            guildCache.set(cacheKey, response.data);
            console.log(`Cache set for guild ${guild.id}`);

            return response.data;
        } catch (err) {
            if (err.response && err.response.status === 429) {
                const retryAfter = Math.ceil(err.response.data.retry_after * 1000);
                console.warn(`Rate limit hit for guild ${guild.id}. Retrying after ${retryAfter}ms...`);
                await new Promise((resolve) => setTimeout(resolve, retryAfter));
                return fetchGuildDataWithCache(guild, botToken);
            }
            throw err;
        }
    });
}

///////////////////////////////////

router.get('/auth/discord', passport.authenticate('discord'));

router.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    console.log('User authenticated successfully. User:', req.user);
    console.log('Session:', req.session);
    res.setHeader('Set-Cookie', req.headers['set-cookie']);
    console.log('Set-Cookie:', res.getHeaders()['set-cookie']);
    res.redirect(`${config.siteUrl}/`);
});


router.get('/auth/discord/server', (req,res) => {
    // extra logic

    res.redirect(`${config.siteUrl}/dashboard`)
})

router.get('/auth/check', (req, res) => {
    console.log('Session Data:', req.session);
    console.log('Passport Data:', req.session?.passport);
    console.log('Session user:', req.user);

    if (req.isAuthenticated()) {
        console.log('User is authenticated.');
        res.json({
            authenticated: true,
            user: req.user
        });
    } else {
        console.log('User is NOT authenticated.');
        res.json({
            authenticated: false
        });
    }
});

router.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to logout' });
        }
        res.clearCookie('connect.sid');
        res.redirect(`${config.siteUrl}/`);
    });
});

router.get('/api/guilds', checkAuth, async (req, res) => {
    try {
        const userGuildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${req.user.accessToken}`,
            },
        });

        const userGuilds = userGuildsResponse.data;

        const adminGuilds = userGuilds.filter((guild) => {
            const permissions = BigInt(guild.permissions);
            const ADMINISTRATOR = BigInt(0x00000008);
            return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
        });

        const botToken = config.botToken;

        const enrichedGuilds = [];
        for (const guild of adminGuilds) {
            try {
                const guildDetails = await fetchGuildDataWithCache(guild, botToken);
                enrichedGuilds.push({ ...guild, botPresent: true, details: guildDetails });
            } catch (err) {
                if (err.response && (err.response.status === 401 || err.response.status === 404)) {
                    enrichedGuilds.push({ ...guild, botPresent: false });
                } else {
                    throw err;
                }
            }
        }

        res.json(enrichedGuilds);
    } catch (error) {
        console.error('Error fetching guilds:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error fetching guilds' });
    }
});

router.get('/api/guilds/:guildId', checkAuth, async (req, res) => {
    const { guildId } = req.params;
    const botToken = config.botToken;

    try {
        const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}`, {
            headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json',
            },
        });

        res.json({ 
            botPresent: true, 
            guild: response.data 
        });
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 404)) {
            res.json({ 
                botPresent: false 
            });
        } else {
            console.error('Error fetching guild details:', error.response ? error.response.data : error.message);
            res.status(error.response ? error.response.status : 500).json({
                error: 'Error fetching guild details',
                details: error.response ? error.response.data : error.message
            });
        }
    }
});

router.get('/discord/invite', (req, res) => {
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot&redirect_uri=${encodeURIComponent(config.callbackURL)}`;
    res.redirect(inviteUrl);
});

router.get('/discord/invite/:guildId', (req, res) => {
    const { guildId } = req.params;
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&guild_id=${guildId}&permissions=8&scope=bot&redirect_uri=${encodeURIComponent(config.callbackURL)}`;
    res.redirect(inviteUrl);
});

router.get('/api/users/@me', async (req, res) => {
    try {
        const accessToken = req.session?.passport?.user?.accessToken;

        if (!accessToken) {
            console.error('No access token found in session');
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        res.json(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/guilds/:guildId/roles', async (req, res) => {
    const { guildId } = req.params;

    try {
        const roles = await getGuildRoles(guildId);
        res.json({ roles });
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'Unable to fetch roles' });
    }
});

router.get('/api/guilds/:guildId/channels', async (req, res) => {
    const { guildId } = req.params;

    try {
        const channels = await getGuildChannels(guildId);
        res.json({ channels });
    } catch (err) {
        console.error('Error fetching channels:', err);
        res.status(500).json({ error: 'Unable to fetch channels' });
    }
});


// Non-Discord Processes

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
    },
});

console.log(config.smtp)

const mailOptions = {
    from: config.smtp.user,
    to: 'bjoernflew@gmail.com',
    subject: 'Test Email from PrivateEmail',
    text: 'This is a test email sent via PrivateEmail and Nodemailer.',
};

transporter.verify((err, success) => {
    if (err) {
        console.error('SMTP connection error:', err);
    } else {
        console.log('SMTP server is ready to take messages');
    }
});

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.error('Error:', error);
    }
    console.log('Email sent:', info.response);
});

router.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });

        const ownerMailOptions = {
            from: config.smtp.user,
            to: config.smtp.admin,
            subject: `Contact Form: ${subject}`,
            text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
            replyTo: email,
        };

        const userMailOptions = {
            from: config.smtp.user,
            to: email,
            subject: `Thank you for reaching out!`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #4CAF50; text-align: center;">Thank You for Reaching Out!</h2>
                    <p>Hi <strong>${name}</strong>,</p>
                    <p>Thank you for contacting us! We’ve received your message and will get back to you as soon as possible.</p>
                    
                    <h3>Your Message:</h3>
                    <div style="background: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p>${message}</p>
                    </div>
                    
                    <p>In the meantime, feel free to check out our website or follow us on social media:</p>
                    <ul style="list-style: none; padding: 0; margin: 20px 0;">
                        <li style="margin-bottom: 10px;">
                            <a href="https://diode.octaneinteractive.co.uk" style="color: #4CAF50; text-decoration: none;">Visit Our Website</a>
                        </li>
                        <li style="margin-bottom: 10px;">
                            <a href="https://twitter.com/" style="color: #4CAF50; text-decoration: none;">Follow Us on Twitter</a>
                        </li>
                        <li style="margin-bottom: 10px;">
                            <a href="https://github.com/" style="color: #4CAF50; text-decoration: none;">Check out our Github</a>
                        </li>
                    </ul>
                    
                    <p style="text-align: center; color: #555;">Best regards,<br><strong>Diode Team</strong></p>
                </div>
            `,
        };        

        await transporter.sendMail(ownerMailOptions);
        await transporter.sendMail(userMailOptions);

        res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email.' });
    }
});


module.exports = router;