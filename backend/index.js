require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const DiscordStrategy = require('passport-discord').Strategy;
const config = require('./config');
const routes = require('./routes');
const pingDH = require('./requests/ping-dh-bot');

const app = express();
const PORT = process.env.PORT || 3000;

// app.use(bodyParser.json({ limit: '50mb' }));

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3001',
    'http://192.168.1.205:3001',
    'https://diode.octaneinteractive.co.uk',
    config.google.sheetScriptUrl,
    config.google.sheetScriptUrl2,
    'https://www.google.com',
    'https://sites.google.com',
    'https://sites.google.com/sites.google.com/view/gradebookservice',
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: config.secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,
        httpOnly: true,
        sameSite: 'none'
    }
}));

passport.use(new DiscordStrategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackURL,
    scope: config.scopes
}, function (accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    console.log('Profile Object:', profile);
    process.nextTick(() => done(null, profile));
}));

passport.serializeUser((user, done) => {
    console.log('Serialising user:',user)
    done(null, {
        id: user.id,
        avatar: user.avatar,
        accessToken: user.accessToken,
        username: user.username
    });
});

passport.deserializeUser((obj, done) => {
    console.log('Deserialising user:',obj)
    done(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());

pingDH.pingBot();

app.use('/', routes);


app.get('/health', (req, res) => {
    res.status(200).send({ message: 'Backend is running!' });
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://192.168.1.205:${PORT}`);
});
