import express from 'express';
import path from 'path';
import User from '../models/superchat/users.js';
import Message from '../models/superchat/message.js';
import bcrypt from 'bcrypt';
import { generateKeyPairRSA, vigenereEncrypt, vigenereDecrypt } from '../middleware/encryption.js';


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
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Ensure required fields are provided
        if (!username || !password) {
            return res.status(400).send('Username and password required');
        }

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
        const privateKey = vigenereDecrypt(password, user.privateKey);

        // Store session details
        req.session.privateKey = privateKey;
        req.session.logged_in = true;
        req.session.username = username;
        req.session.publicKey = user.publicKey;

        // Redirect to chat app
        res.redirect('/superchat/app');
    } catch (err) {
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
router.post('/register', async (req, res) => {
    try {
        const { firstname, lastname, email, username, password, passwordconfirm } = req.body;

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
            privateKey: vigenereEncrypt(password, privateKey) // private key encrypted with password
        });
        await user.save();

        // Create user session (auto-login after registration)
        req.session.logged_in = true;
        req.session.username = username;
        req.session.privateKey = privateKey; // decrypted key available in session
        req.session.publicKey = publicKey;

        res.redirect('/superchat/app');
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).send('Server error');
    }
});

/**
 * Middleware: Check if a user is authenticated via session.
 * If not logged in, redirect them to the login page.
 */
function isAuthenticated(req, res, next) {
    if (req.session.logged_in) {
        next(); // proceed to the next middleware/route handler
    } else {
        res.redirect('superchat/login'); // send them back to login
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
router.get('/api/session-data', isAuthenticated, (req, res) => {
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
router.get('/api/userkey', isAuthenticated, async (req, res) => {
    const recipientusername = req.query.name;
    try {
        const user = await User.findOne({ username: recipientusername });
        if (user === null) {
            return res.status(404).send('User not found');
        }
        res.send(user.publicKey);
    } catch (err) {
        console.log('Server error while fetching key for ' + recipientusername);
        res.status(500).send('Server error');
    }
});

/**
 * POST /api/send-message
 * Saves an encrypted message to the database.
 * Expects body fields: user, recipient, message, timestamp, iv, key1, key2.
 */
router.post('/api/send-message', isAuthenticated, async (req, res) => {
    try {
        const { user, recipient, message, timestamp, iv, key1, key2 } = req.body;

        // Validate required fields
        if (!user || !recipient || !message || !timestamp || !iv || !key1 || !key2) {
            return res.status(400).send('Missing fields');
        }

        // Create and save the message document
        const newMessage = new Message({ user, recipient, message, timestamp, iv, key1, key2 });
        await newMessage.save();

        res.status(200).send('Message sent');
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).send('Server error');
    }
});

/**
 * GET /api/messages?chat=<username>
 * Fetch the full conversation between the logged-in user and another user.
 * Messages are sorted by timestamp in ascending order.
 */
router.get('/api/messages', isAuthenticated, async (req, res) => {
    const recipientusername = req.query.chat;
    try {
        const username = req.session.username;
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
        console.error('Error fetching messages:', err);
        res.status(500).send('Server error');
    }
});

/**
 * GET /api/users
 * Fetch all users except the currently logged-in one.
 * Only returns usernames (not sensitive fields).
 */
router.get('/api/users', isAuthenticated, async (req, res) => {
    try {
        const users = await User.find({ username: { $ne: req.session.username } }).select('username');
        res.json(users.map(u => u.username));
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server error');
    }
});

export default router;