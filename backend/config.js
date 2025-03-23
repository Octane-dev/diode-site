module.exports = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'https://api.octaneinteractive.co.uk/auth/discord/callback',
    scopes: ['identify', 'guilds'],
    sessionSecret: process.env.SESSION_SECRET,
    botToken: process.env.BOT_TOKEN,
    secretKey: process.env.SECRET_KEY,
    siteUrl: process.env.SITE_URL
};
