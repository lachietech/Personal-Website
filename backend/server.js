import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import bodyParser from 'body-parser';
import mainroutes from'./mainroutes.js';
import meanderroutes from'./meandersuite/meanderroutes.js';
import superchatroutes from'./superchat/superchatroutes.js';
import pinpointroutes from'./pinpoint/pinpointroutes.js';

dotenv.config();
const app = express();

app.use(express.static(path.join(import.meta.dirname , "../public")))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // true if HTTPS
}));

// Routes
app.use('/', mainroutes);
app.use('/meandersuite', meanderroutes);
app.use('/superchat', superchatroutes);
app.use('/api/pinpoint', pinpointroutes);



app.listen(5000, () => {
    console.log("Server started at http://localhost:5000");
});
