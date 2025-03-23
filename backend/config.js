module.exports = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://192.168.1.205:3000/auth/discord/callback',
    scopes: ['identify', 'guilds'],
    sessionSecret: process.env.SESSION_SECRET,
    botToken: process.env.BOT_TOKEN,
    secretKey: process.env.SECRET_KEY
};
