import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';
import { generalLimiter, apiLimiter } from './ratelimits.js';
import mainroutes from'./mainroutes.js';
import meanderroutes from'./meandersuite/meanderroutes.js';
import superchatroutes from'./superchat/superchatroutes.js';
import pinpointroutes from'./pinpoint/pinpointroutes.js';
import hfssuniformsroutes from './hfssuniformsapp/hfssuniformsroutes.js';

dotenv.config();
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5000;

if (isProduction) {
    app.set('trust proxy', 1);
}

// Security middleware - Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable if using inline scripts/styles
}));

// CSRF Protection Setup
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    getSessionIdentifier: (req) => req.sessionID,
    cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: isProduction,
        httpOnly: true,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
            return req.headers['x-csrf-token'];
        }
        if (contentType.includes('application/x-www-form-urlencoded')) {
            return req.body?._csrf;
        }
        return req.headers['x-csrf-token'];
    },
});

// Make CSRF token generator available to routes
app.locals.generateCsrfToken = generateCsrfToken;

// Cookie parser must come before CSRF
app.use(cookieParser());

app.use(express.static(path.join(import.meta.dirname , "../public")))
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(express.json({ limit: '50kb' }));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    name: 'psifi.sid',
    cookie: { 
        secure: isProduction,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 8,
    }
}));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// CSRF token endpoint (must be before CSRF protection)
app.get('/csrf-token', (req, res) => {
    req.session.csrfReady = true;
    const csrfToken = generateCsrfToken(req, res);
    req.session.save((error) => {
        if (error) {
            res.status(500).json({ message: 'Unable to create CSRF token' });
            return;
        }

        res.json({ csrfToken });
    });
});

// Apply CSRF protection to all routes except GET requests. The HFSS Uniforms
// app has its own namespaced CSRF flow because it was imported as a sub-app.
app.use((req, res, next) => {
    if (req.path.startsWith('/hfssuniformsapp')) {
        next();
        return;
    }

    doubleCsrfProtection(req, res, next);
});

// Routes with specific rate limiters
app.use('/', mainroutes);
app.use('/meandersuite', meanderroutes);
app.use('/superchat', superchatroutes);
app.use('/hfssuniformsapp', hfssuniformsroutes);
app.use('/api/pinpoint', apiLimiter, pinpointroutes);

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
