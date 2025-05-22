import express from'express';
import path from 'path';
import { isAuthenticated } from '../middleware/auth.js';
import { registerUserWithWeather, loginUser, updateWeatherForUser, updateUserLocation } from '../modules/userController.js';
import { runCWISAnalysis } from '../modules/msw.js';
import UserWeatherRecord from '../models/users.js';

const router = express.Router();

// Public MeanderSuite page
router.get('/', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/mainfiles/index.html'));
});

// Register page
router.get('/register', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/mainfiles/register.html'));
});
router.post('/register', async (req, res) => {
    const { username, password, email, first_name, last_name, locationl, locations, locationc  } = req.body;

    try {
        await registerUserWithWeather({
            username: username,
            password: password,
            email: email,
            first_name: first_name,
            last_name: last_name,
            location: {
                local: locationl,
                state: locations,
                country: locationc
            }
        });
        await loginUser({ username, password });
        req.session.logged_in = true;
        req.session.username = username;
        res.redirect('/meandersuite/suite');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('Internal server error');
    }
});

  
// Login page
router.get('/login', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/mainfiles/login.html'));
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await loginUser({username, password});
        if (user) {
            req.session.logged_in = true;
            req.session.username = username;
            res.redirect('/meandersuite/suite');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/meandersuite/suite');
        res.status(500).send('Internal server error');
    }
});


// Protected Suite route
router.get('/suite', isAuthenticated, async (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/meandersuiteprerelease/suitefiles/index.html'));
});

router.get('/suite/suitedata',  async (req, res) => {
    const username = req.session.username;
    const user = await UserWeatherRecord.findOne({ username });
    const cwis = runCWISAnalysis(user);
    console.log('CWIS Analysis:', cwis);
    res.json(cwis);
});



//  router.post('/login', login);
export default router;