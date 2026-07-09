import express from 'express';
import path from 'path';
import User from './models/users.js';
import Message from './models/message.js';
import bcrypt from 'bcrypt';
import { decryptPrivateKeyWithPassword, encryptPrivateKeyWithPassword, generateKeyPairRSA } from './middleware/encryption.js';
import { authLimiter, apiLimiter, getLimiter } from '../ratelimits.js';
import { InputError, getEmail, getPassword, getRequiredString, getUsername, regenerateSession } from '../security.js';

const router = express.Router();

/**
 * GET /
 * Serve the main index page.
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/superchat/index.html'));
});

/**
 * GET /login
 * Serve the login page.
 */
router.get('/login', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/superchat/login.html'));
});

/**
 * GET /register
 * Serve the registration page.
 */
router.get('/register', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/superchat/register.html'));
});

/**
 * POST /login
 * Handle user login:
 * - Verify username and password
 * - Decrypt and load user's private key
 * - Store user details in session
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const username = getUsername(req.body.username);
        const password = getPassword(req.body.password);

        // Lookup user in DB
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).send('User not found');
        }

        // Validate password with bcrypt
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).send('Invalid password');
        }

        // Decrypt the stored private key using the password
        const privateKey = decryptPrivateKeyWithPassword(password, user.privateKey);

        // Store session details
        await regenerateSession(req, {
            app: 'superchat',
            privateKey,
            logged_in: true,
            username,
            publicKey: user.publicKey
        });

        // Redirect to chat app
        res.redirect('/superchat/app');
    } catch (err) {
        if (err instanceof InputError) {
            return res.status(400).send(err.message);
        }

        console.error('Login error:', err);
        res.status(500).send('Server error');
    }
});

/**
 * POST /register
 * Handle new user registration:
 * - Validate passwords
 * - Check if username already exists
 * - Hash password with bcrypt
 * - Generate RSA key pair
 * - Encrypt private key with password (Vigenère cipher)
 * - Save new user in DB
 * - Store session details and log them in automatically
 */
router.post('/register', authLimiter, async (req, res) => {
    try {
        const firstname = getRequiredString(req.body.firstname, 'First name', 80);
        const lastname = getRequiredString(req.body.lastname, 'Last name', 80);
        const email = getEmail(req.body.email);
        const username = getUsername(req.body.username);
        const password = getPassword(req.body.password);
        const passwordconfirm = getPassword(req.body.passwordconfirm);

        // Ensure passwords match
        if (password !== passwordconfirm) {
            return res.status(400).send('Passwords do not match');
        }

        // Check if username is already taken
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).send('Username already exists');

        // Hash password securely
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate RSA key pair
        const { publicKey, privateKey } = generateKeyPairRSA();

        // Store user in DB with encrypted private key
        const user = new User({
            firstname,
            lastname,
            email,
            username,
            password: hashedPassword,
            publicKey,
            privateKey: encryptPrivateKeyWithPassword(password, privateKey)
        });
        await user.save();

        // Create user session (auto-login after registration)
        await regenerateSession(req, {
            app: 'superchat',
            logged_in: true,
            username,
            privateKey,
            publicKey
        });

        res.redirect('/superchat/app');
    } catch (err) {
        if (err instanceof InputError) {
            return res.status(400).send(err.message);
        }

        console.error('Register error:', err);
        res.status(500).send('Server error');
    }
});

/**
 * Middleware: Check if a user is authenticated via session.
 * If not logged in, redirect them to the login page.
 */
function isAuthenticated(req, res, next) {
    if (req.session.logged_in && req.session.app === 'superchat') {
        next(); // proceed to the next middleware/route handler
    } else {
        res.redirect('/superchat/login'); // send them back to login
    }
}

/**
 * GET /app
 * Serve the main chat application page.
 * User must be authenticated.
 */
router.get('/app', isAuthenticated, (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/superchat/chat.html'));
});

/**
 * GET /api/session-data
 * Returns the current session’s user details:
 * - username
 * - publicKey
 * - privateKey
 * These are pulled from the session object after login.
 */
router.get('/api/session-data', getLimiter, isAuthenticated, (req, res) => {
    res.json({
        username: req.session.username, 
        publicKey: req.session.publicKey, 
        privateKey: req.session.privateKey
    });
});

/**
 * GET /api/userkey?name=<username>
 * Lookup and return the public key of another user by username.
 * Used when encrypting messages for a recipient.
 */
router.get('/api/userkey', getLimiter, isAuthenticated, async (req, res) => {
    try {
        const recipientusername = getUsername(req.query.name);
        const user = await User.findOne({ username: recipientusername });
        if (user === null) {
            return res.status(404).send('User not found');
        }
        res.send(user.publicKey);
    } catch (err) {
        if (err instanceof InputError) {
            return res.status(400).send(err.message);
        }

        console.error('Server error while fetching key');
        res.status(500).send('Server error');
    }
});

/**
 * POST /api/send-message
 * Saves an encrypted message to the database.
 * Expects body fields: user, recipient, message, timestamp, iv, key1, key2.
 */
router.post('/api/send-message', apiLimiter, isAuthenticated, async (req, res) => {
    try {
        const sender = req.session.username;
        const recipient = getUsername(req.body.recipient);
        const message = getRequiredString(req.body.message, 'Message', 20000);
        const iv = getRequiredString(req.body.iv, 'IV', 128);
        const key1 = getRequiredString(req.body.key1, 'Key', 2048);
        const key2 = getRequiredString(req.body.key2, 'Key', 2048);
        const timestamp = new Date(Number(req.body.timestamp));

        // Validate required fields
        if (Number.isNaN(timestamp.getTime())) {
            return res.status(400).send('Missing fields');
        }

        const recipientUser = await User.exists({ username: recipient });
        if (!recipientUser) {
            return res.status(404).send('Recipient not found');
        }

        // Create and save the message document
        const newMessage = new Message({ user: sender, recipient, message, timestamp, iv, key1, key2 });
        await newMessage.save();

        res.status(200).send('Message sent');
    } catch (err) {
        if (err instanceof InputError) {
            return res.status(400).send(err.message);
        }

        console.error('Error saving message:', err);
        res.status(500).send('Server error');
    }
});

/**
 * GET /api/messages?chat=<username>
 * Fetch the full conversation between the logged-in user and another user.
 * Messages are sorted by timestamp in ascending order.
 */
router.get('/api/messages', getLimiter, isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        const recipientusername = getUsername(req.query.chat);
        if (!recipientusername) {
            return res.status(400).send('Missing chat parameter');
        }

        // Query for messages where either:
        // - current user sent to recipient, OR
        // - recipient sent to current user
        const messages = await Message.find({
            $or: [
                { user: username, recipient: recipientusername },
                { user: recipientusername, recipient: username }
            ]
        }).sort({ timestamp: 1 }); // oldest → newest

        res.json(messages);
    } catch (err) {
        if (err instanceof InputError) {
            return res.status(400).send(err.message);
        }

        console.error('Error fetching messages:', err);
        res.status(500).send('Server error');
    }
});

/**
 * GET /api/users
 * Fetch all users except the currently logged-in one.
 * Only returns usernames (not sensitive fields).
 */
router.get('/api/users', getLimiter, isAuthenticated, async (req, res) => {
    try {
        const users = await User.find({ username: { $ne: req.session.username } }).select('username').lean();
        res.json(users.map(u => u.username));
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server error');
    }
});

export default router;
