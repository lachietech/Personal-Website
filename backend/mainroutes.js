import express from'express';
import path from 'path';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { contactLimiter } from './ratelimits.js';
import { InputError, escapeHtml, getEmail, getMessage, getRequiredString } from './security.js';

dotenv.config();

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Home page
router.get('/', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '../public/templates/main/index.html'));
});

// Contact form submission
router.post('/contact', contactLimiter, async (req, res) => {
    try {
        const name = getRequiredString(req.body.name, 'Name', 120);
        const email = getEmail(req.body.email);
        const subject = getRequiredString(req.body.subject, 'Subject', 160);
        const message = getMessage(req.body.message);

        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safeSubject = escapeHtml(subject);
        const safeMessage = escapeHtml(message).replaceAll('\n', '<br>');

        // Send email using Resend
        const { data, error } = await resend.emails.send({
            from: 'Contact Us <contactus@nielseninnovations.com>', // Change this to your verified domain
            to: ['nielseninnovation@outlook.com'], // Your email to receive messages
            subject: `New Contact Form: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">New Contact Form Submission</h2>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Name:</strong> ${safeName}</p>
                        <p><strong>Email:</strong> ${safeEmail}</p>
                        <p><strong>Subject:</strong> ${safeSubject}</p>
                    </div>
                    <div style="margin: 20px 0;">
                        <h3 style="color: #333;">Message:</h3>
                        <p style="line-height: 1.6;">${safeMessage}</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">This email was sent from the Nielsen Innovations contact form.</p>
                </div>
            `,
            replyTo: email
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(400).json({ 
                success: false, 
                message: 'Failed to send email. Please try again.' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Message sent successfully! We\'ll get back to you soon.' 
        });
    } catch (error) {
        if (error instanceof InputError) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error('Contact form error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again later.' 
        });
    }
});

export default router;
