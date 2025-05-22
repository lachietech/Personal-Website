import express from'express';
import path from 'path';

const router = express.Router();

// Home page
router.get('/', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../../public/templates/main/index.html'));
});


export default router;