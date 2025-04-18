require('dotenv').config();

const decodePassword = (password) => {
    if (!password) return null;
    try {
        return decodeURIComponent(password);
    } catch (error) {
        console.error('Error decoding SMTP password:', error);
        return password;
    }
};

module.exports = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'https://api.octaneinteractive.co.uk/auth/discord/callback',
    scopes: ['identify', 'guilds'],
    sessionSecret: process.env.SESSION_SECRET,
    botToken: process.env.BOT_TOKEN,
    secretKey: process.env.SECRET_KEY,
    siteUrl: process.env.SITE_URL,
    pingSecret: process.env.PING_SECRET,
    botSecret: process.env.BOT_API_SECRET,

    smtp: {
        user: process.env.SMTP_USER,
        pass: decodePassword(process.env.SMTP_PASS),
        host: 'mail.privateemail.com',
        port: 465,
        secure: true,
        admin: process.env.ADMIN_EMAIL,
        noreplyUser: process.env.SMTP_USER_NOREPLY,
        noreplyPass: decodePassword(process.env.SMTP_PASS_NOREPLY),
    },

    google: {
        sheetScriptUrl: process.env.SHEET_SCRIPT_URL,
        sheetScriptUrl2: process.env.SHEET_SCRIPT_URL2,
        sheetScriptUrl3: process.env.SHEET_SCRIPT_URL3,
    }
};
