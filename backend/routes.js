require('dotenv').config();
const express = require('express');
const passport = require('passport');
const querystring = require('querystring');
const axios = require('axios');
const router = express.Router();
const config = require('./config');
const NodeCache = require('node-cache');
const nodemailer = require('nodemailer');
const fs = require('fs')
const path = require('path')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { getGuildRoles, getGuildChannels } = require('./controllers/guildController');
const { error } = require('console');
// const csv = require('csv-parser');
// const { Readable } = require('stream')
// const multer = require('multer');

// File Viewing

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GOOGLE SHEETS

const fetchSheetData = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/google/receive-data'); // Update URL as needed
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            console.log('No valid data received.');
            return [];
        }

        // Extract only valid name-email pairs
        const formattedData = data
            .map(entry => {
                const [fullName, email] = entry; // Assuming first value is name, second is email
                if (!email || email.trim().toUpperCase() === 'N/A') return null; // Skip invalid emails
                return [fullName, email.trim()];
            })
            .filter(entry => entry !== null); // Remove null values

        return formattedData;
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return [];
    }
};

// UPLOADING

router.post('/api/google/upload', async (req, res) => {
    const { file, fileName } = req.body;
  
    if (!file || !fileName) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }
  
    try {
      const dirPath = path.join(process.cwd(), 'uploads');
  
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
  
      const fileBuffer = Buffer.from(file, 'base64');
  
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, fileBuffer);
  
      res.status(200).json({ message: 'PDF uploaded successfully', filePath });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload PDF' });
    }
  });

// Ping Discord Bot

router.get('/ping', (req, res) => {
    const receivedSecret = req.headers['authorization']?.replace('Bearer ', '').trim();
    const expectedSecret = config.pingSecret;

    if (receivedSecret !== expectedSecret) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('Ping received and authenticated');
    res.status(200).json({ message: 'Pong' });
});


// Get Bot Stats

router.post('/api/bot-data', (req, res) => {
    const receivedSecret = req.headers['authorization']?.replace('Bearer ', '').trim();
    const expectedSecret = config.botSecret;

    if (receivedSecret !== expectedSecret) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ error: 'No data provided' });
    }

    console.log('Data received from bot:', data);

    res.status(200).json({ message: 'Data received successfully!' });
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


// Get Google Sheet Info

let sheetData = [];

router.post('/api/google/receive-data', async (req, res) => {
    try {
        const { data } = req.body;
        console.log(data)
        
        sheetData = data.filter(row => row.length >= 2);

        res.status(200).send('Data received successfully')
    } catch (error) {
        console.error('Error fetching data:',error)
        res.status(500).send('Internal server error')
    }
});

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
    },
});

const noreplyTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
        user: config.smtp.noreplyUser,
        pass: config.smtp.noreplyPass,
    },
})

console.log(config.smtp)

const mailOptions = {
    from: config.smtp.user,
    to: config.smtp.admin,
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


router.post('/api/google/signup', async (req, res) => {
    const type = req.query.type || "none"

    if (type === 'gradebook') {
        const { fullName, email, yearGroup } = req.body;

        if (!fullName || !email || !yearGroup) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log(`New Signup: ${fullName}, ${email}, Year: ${yearGroup}`);

        const mailOptions = {
            from: `"GradeBot" <${config.smtp.noreplyUser}>`,
            to: email,
            subject: "Welcome to the Gradebook System!",
            text: `Hi ${fullName},\n\nWelcome! You have been successfully registered.\n\nYear Group: ${yearGroup}\n\nRegards,\nGradeBot`,
            html: `<p>Hi ${fullName},</p><p>Welcome! You have been successfully registered.</p><p><b>Year Group:</b> ${yearGroup}</p><p>Regards,<br>GradeBot</p>`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Confirmation email sent to ${email}`);

            const studentData = `"${fullName}","${email}","${yearGroup}"\n`;

            console.log(`Added to gradebook: ${fullName}`);

            return res.status(200).json({ message: "Signup successful" });

        } catch (error) {
            console.error(`Error processing signup: ${error.message}`);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    else {
        return res.status(422).json({ error: "Invalid type parameter" });
    }
});

router.post('/api/google/email', async (req, res) => {
    try {
        const emailType = req.query.emailType || 'cust';

        if (emailType === 'new') {
            if (!sheetData || sheetData.length === 0) {
                return res.status(400).json({ error: 'No email data available' });
            }

            function isValidEmail(email) {
                const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                return emailPattern.test(email);
            }

            for (const [fullName, email, link] of sheetData) {
                if (!email || email.trim().toUpperCase() === 'N/A' || !isValidEmail(email)) {
                    console.log(`Skipping invalid email for ${fullName}`);
                    continue;
                }

                const nameParts = fullName.split(',');
                const firstName = nameParts[1]?.trim() || 'Valued Customer';
                const lastName = nameParts[0]?.trim() || '';

                const emailBody = `
                Hi ${firstName}. GradeBot here! You can find your GRADEBOOK DASHBOARD for this 
                school year in Google Drive/Shared With Me or using the link: 
                ${link}
                Bookmark it right away using the star icon in the address bar.  Once 
                teachers enter progress information it will show up here!  Keep checking it 
                to see how you are getting on.  Make sure you show it to your family!  
                If you aren't sure about anything, ask your subject teacher, or your tutor 
                teacher.  Once you receive this email it will take me a couple of days to 
                activate each pupil's Gradebook, so bear with me if nothing is showing up 
                right away.  If you want to share this with your parents, do so with the 
                Share button. I'll then have to grant them access.
                `;

                const htmlBody = `
                <p>Hi <strong>${firstName}</strong>,</p>
                
                <p>GradeBot here! You can find your <strong>GRADEBOOK DASHBOARD</strong> for this school year in <b>Google Drive/Shared With Me</b> or using the link: <a href="${link}">${link}</a></p>    
                
                <p>Bookmark it right away using the star icon in the address bar. Once teachers enter progress information, it will show up here! Keep checking it to see how you're getting on. Make sure you show it to your family!</p>
                
                <p>If you aren't sure about anything, ask your subject teacher or your tutor teacher. Once you receive this email, it will take me a couple of days to activate each pupil's Gradebook, so bear with me if nothing is showing up right away.</p>
                
                <p>If you want to share this with your parents, do so with the Share button. I'll then have to grant them access.</p>
                `;

                const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@octaneinteractive.co.uk>`;
                console.log(messageId);

                const mailOptions = {
                    from: `"GradeBot" <${config.smtp.noreplyUser}>`,
                    to: email,
                    subject: `Your GRADEBOOK DASHBOARD has been shared with you`,
                    text: emailBody,
                    html: htmlBody,
                    messageId: messageId,
                    headers: {
                        'X-Email-Type': emailType,
                        'In-Reply-To': undefined,
                        'References': undefined,
                    }
                };

                try {
                    await noreplyTransporter.sendMail(mailOptions);
                    console.log(`Email sent to ${email} (Name: ${firstName} ${lastName})`);
                } catch (error) {
                    console.error(`Error sending email to ${email}:`, error);
                }
            }

            return res.status(200).json({ message: 'Emails sent successfully' });
        } 
        else if (emailType === 'term') {
            if (!sheetData || sheetData.length === 0) {
                return res.status(400).json({ error: 'No email data available' });
            }
        
            function isValidEmail(email) {
                const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                return emailPattern.test(email);
            }
        
            for (const [fullName, email, link] of sheetData) {
                if (!email || email.trim().toUpperCase() === 'N/A' || !isValidEmail(email)) {
                    console.log(`Skipping invalid email for ${fullName}`);
                    continue;
                }
        
                const nameParts = fullName.split(',');
                const firstName = nameParts[1]?.trim() || 'Valued Customer';
                const lastName = nameParts[0]?.trim() || '';
        
                // Construct expected PDF filename
                const sanitizedFirstName = firstName.replace(/[\/:*?"<>|]/g, '_');
                const sanitizedLastName = lastName.replace(/[\/:*?"<>|]/g, '_');
                const expectedFilename = `${sanitizedFirstName}_${sanitizedLastName}_estimated_grades.pdf`;
        
                const filePath = path.join(__dirname, 'uploads', expectedFilename);
        
                if (!fs.existsSync(filePath)) {
                    console.warn(`PDF file not found for ${fullName}: ${filePath}`);
                    continue;
                }
        
                const emailBody = `
                Hi.
        
                Here is an email copy of your gradebook
                Please check your Gradebook dashboard, and speak to your teachers
                if anything is incorrect or unclear.
                
                This file is a PDF and should open in Gmail and other mail apps. Some
                users may need to save the file and open it in a PDF reader.
        
                Kind regards,
                GradeBot
                `;
        
                const htmlBody = `
                <p>Hi.</p>
        
                <p>Here is an email copy of your gradebook</p>
                <p>Please check your Gradebook dashboard, and speak to your teachers</p>
                <p>if anything is incorrect or unclear.</p>
                
                <p>This file is a PDF and should open in Gmail and other mail apps. Some</p>
                <p>users may need to save the file and open it in a PDF reader.</p>
        
                <p>Kind regards,</p>
                <p>GradeBot</p>
                `;
        
                const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@octaneinteractive.co.uk>`;
                console.log(`Sending email to: ${email} with attachment: ${filePath}`);
        
                const mailOptions = {
                    from: `"GradeBot" <${config.smtp.noreplyUser}>`,
                    to: email,
                    subject: `Your SENIOR PHASE REPORT`,
                    text: emailBody,
                    html: htmlBody,
                    messageId: messageId,
                    attachments: [
                        {
                            filename: path.basename(filePath),
                            path: filePath,
                        }
                    ],
                    headers: {
                        'X-Email-Type': emailType,
                        'In-Reply-To': undefined,
                        'References': undefined,
                    }
                };
        
                try {
                    await noreplyTransporter.sendMail(mailOptions);
                    console.log(`Email sent to ${email} with PDF attachment`);
                } catch (error) {
                    console.error(`Error sending email to ${email}:`, error);
                }
            }
        
            return res.status(200).json({ message: 'Emails with PDFs sent successfully' });
        }
        else if (emailType === 'estimate') {
            if (!sheetData || sheetData.length === 0) {
                return res.status(400).json({ error: 'No email data available' });
            }
        
            function isValidEmail(email) {
                const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                return emailPattern.test(email);
            }
        
            for (const [fullName, email, link] of sheetData) {
                if (!email || email.trim().toUpperCase() === 'N/A' || !isValidEmail(email)) {
                    console.log(`Skipping invalid email for ${fullName}`);
                    continue;
                }
        
                const nameParts = fullName.split(',');
                const firstName = nameParts[1]?.trim() || 'Valued Customer';
                const lastName = nameParts[0]?.trim() || '';
        
                // Construct expected PDF filename
                const sanitizedFirstName = firstName.replace(/[\/:*?"<>|]/g, '_');
                const sanitizedLastName = lastName.replace(/[\/:*?"<>|]/g, '_');
                const expectedFilename = `${sanitizedFirstName}_${sanitizedLastName}_estimated_grades.pdf`;
        
                const filePath = path.join(__dirname, 'uploads', expectedFilename);
        
                if (!fs.existsSync(filePath)) {
                    console.warn(`PDF file not found for ${fullName}: ${filePath}`);
                    continue;
                }
        
                const emailBody = `
                Hi. Here are the SQA estimates and tracking for: ${fullName}

                Please read this in conjunction with the school letter, where more 
                information is given about how estimates relate to targets, Marking Reviews 
                and Exceptional Circumstances.
                `;
        
                const htmlBody = `
                <p>Hi. Here are the SQA estimates and tracking for: ${fullName}</p>

                <p>Please read this in conjunction with the school letter, where more</p>
                <p>information is given about how estimates relate to targets, Marking Reviews</p>
                <p>and Exceptional Circumstances.</p>
                `;
        
                const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@octaneinteractive.co.uk>`;
                console.log(`Sending email to: ${email} with attachment: ${filePath}`);
        
                const mailOptions = {
                    from: `"GradeBot" <${config.smtp.noreplyUser}>`,
                    to: email,
                    subject: `${fullName} SQA ESTIMATES 2024-2025`,
                    text: emailBody,
                    html: htmlBody,
                    messageId: messageId,
                    attachments: [
                        {
                            filename: path.basename(filePath),
                            path: filePath,
                        }
                    ],
                    headers: {
                        'X-Email-Type': emailType,
                        'In-Reply-To': undefined,
                        'References': undefined,
                    }
                };
        
                try {
                    await noreplyTransporter.sendMail(mailOptions);
                    console.log(`Email sent to ${email} with PDF attachment`);
                } catch (error) {
                    console.error(`Error sending email to ${email}:`, error);
                }
            }
        
            return res.status(200).json({ message: 'Emails with PDFs sent successfully' });
        }
        else if (emailType === 'cust') {
            const recipientEmail = req.body.recipientEmail;
            if (!recipientEmail) {
                return res.status(400).json({ error: 'Recipient email is required for custom emails' });
            }

            const senderId = req.body.senderId || "";

            const emailBody = req.body.emailData || `Empty email. Apologies for the hold-up.`;
            const htmlBody = `<p>${req.body.emailData || `Empty email. Apologies for the hold-up.`}</p>`;

            const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@octaneinteractive.co.uk>`;
            console.log(messageId);

            const mailOptions = {
                from: `"${senderId}" <${config.smtp.noreplyUser}>`,
                to: recipientEmail,
                subject: req.body.subject || 'No Subject',
                text: emailBody,
                html: htmlBody,
                messageId: messageId,
                headers: {
                    'X-Email-Type': emailType,
                    'In-Reply-To': undefined,
                    'References': undefined,
                }
            };

            try {
                await noreplyTransporter.sendMail(mailOptions);
                console.log(`Custom email sent to ${recipientEmail}`);
                return res.status(200).json({ message: 'Custom email sent successfully' });
            } catch (error) {
                console.error(`Error sending custom email to ${recipientEmail}:`, error);
                return res.status(500).json({ error: 'Failed to send custom email' });
            }
        } 
        else {
            return res.status(400).json({ error: 'Invalid emailType' });
        }

    } catch (error) {
        console.error('Error sending emails:', error);
        return res.status(500).json({ error: 'Failed to send emails' });
    }
});

module.exports = router;