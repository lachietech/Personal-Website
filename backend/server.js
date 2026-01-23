import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';
import { generalLimiter, apiLimiter } from './ratelimits.js';
import mainroutes from'./mainroutes.js';
import meanderroutes from'./meandersuite/meanderroutes.js';
import superchatroutes from'./superchat/superchatroutes.js';
import pinpointroutes from'./pinpoint/pinpointroutes.js';

dotenv.config();
const app = express();

// Security middleware - Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable if using inline scripts/styles
}));

// CSRF Protection Setup
const { generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: false, // Set to true in production with HTTPS
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Make CSRF token generator available to routes
app.locals.generateCsrfToken = generateToken;

// Cookie parser must come before CSRF
app.use(cookieParser());

app.use(express.static(path.join(import.meta.dirname , "../public")))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // true if HTTPS
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// CSRF token endpoint (must be before CSRF protection)
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: generateToken(req, res) });
});

// Apply CSRF protection to all routes except GET requests
app.use(doubleCsrfProtection);

// Routes with specific rate limiters
app.use('/', mainroutes);
app.use('/meandersuite', meanderroutes);
app.use('/superchat', superchatroutes);
app.use('/api/pinpoint', apiLimiter, pinpointroutes);

app.listen(5000, () => {
    console.log("Server started at http://localhost:5000");
});
