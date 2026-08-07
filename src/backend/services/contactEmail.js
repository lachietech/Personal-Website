import { Resend } from "resend";
import { environment } from "../config/environment.js";
import { escapeHtml } from "../security.js";

const resend = new Resend(environment.resendApiKey);

export async function sendContactEmail({ name, email, subject, message }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");

  const { error } = await resend.emails.send({
    from: environment.contactFrom,
    to: [environment.contactTo],
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
      </div>
    `,
    replyTo: email,
  });

  if (error) {
    throw new Error("The email provider rejected the message.");
  }
}
