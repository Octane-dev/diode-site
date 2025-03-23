require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const DiscordStrategy = require('passport-discord').Strategy;
const config = require('./config');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3001',
    'http://192.168.1.205:3001',
    'https://diode.octaneinteractive.co.uk'        
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            console.error(`Blocked by CORS: ${origin}`);
            return callback(new Error('CORS policy error: Origin not allowed'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: config.secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }
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
    done(null, {
        id: user.id,
        avatar: user.avatar,
        accessToken: user.accessToken,
        username: user.username
    });
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());


app.use('/', routes);


app.get('/health', (req, res) => {
    res.status(200).send({ message: 'Backend is running!' });
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://192.168.1.205:${PORT}`);
});
