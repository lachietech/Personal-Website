import express from'express';
import path from 'path';
import { isAuthenticated } from './middleware/auth.js';
import { registerUserWithWeather, loginUser, updateWeatherForUser, updateUserLocation } from './modules/userController.js';
import { runCWISAnalysis } from './modules/msw.js';
import UserWeatherRecord from './models/users.js';
import { authLimiter, getLimiter } from '../ratelimits.js';
import { InputError, getEmail, getOptionalString, getPassword, getUsername, regenerateSession } from '../security.js';

const router = express.Router();

// Public MeanderSuite page
router.get('/', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/mainfiles/index.html'));
});

// Register page
router.get('/register', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/mainfiles/register.html'));
});
router.post('/register', authLimiter, async (req, res) => {
    try {
        const username = getUsername(req.body.username);
        const password = getPassword(req.body.password);
        const passwordConfirm = getPassword(req.body.passwordconf);

        if (password !== passwordConfirm) {
            return res.status(400).send('Passwords do not match');
        }

        await registerUserWithWeather({
            username,
            password,
            email: getEmail(req.body.email),
            first_name: getOptionalString(req.body.first_name, 80),
            last_name: getOptionalString(req.body.last_name, 80),
            location: {
                local: getOptionalString(req.body.locationl, 120),
                state: getOptionalString(req.body.locations, 120),
                country: getOptionalString(req.body.locationc, 120)
            }
        });
        await loginUser({ username, password });
        await regenerateSession(req, {
            app: 'meandersuite',
            logged_in: true,
            username
        });
        res.redirect('/meandersuite/suite');
    } catch (error) {
        if (error instanceof InputError) {
            return res.status(400).send(error.message);
        }

        console.error('Registration error:', error);
        res.status(500).send('Internal server error');
    }
});

  
// Login page
router.get('/login', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/mainfiles/login.html'));
});
router.post('/login', authLimiter, async (req, res) => {
    try {
        const username = getUsername(req.body.username);
        const password = getPassword(req.body.password);
        const user = await loginUser({username, password});
        if (user) {
            await regenerateSession(req, {
                app: 'meandersuite',
                logged_in: true,
                username
            });
            res.redirect('/meandersuite/suite');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        if (error instanceof InputError) {
            return res.status(400).send(error.message);
        }

        console.error('Login error:', error);
        res.status(401).send('Invalid username or password');
    }
});


// Protected Suite route
router.get('/suite', isAuthenticated, async (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/suitefiles/index.html'));
});

router.get('/suite/suitedata', getLimiter, isAuthenticated, async (req, res) => {
    const username = req.session.username;
    const user = await UserWeatherRecord.findOne({ username }).lean();
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const cwis = await runCWISAnalysis(user);
    res.json(cwis);
});



//  router.post('/login', login);
export default router;
