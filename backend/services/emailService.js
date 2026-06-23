import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const emailTemplates = {
  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1976d2;">Password Reset</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the button below:</p>
        <a href="${resetUrl}" style="background:#1976d2;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin:16px 0;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),

  leaveApproval: (name, status, leaveType, dates, comment) => ({
    subject: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'} - ${leaveType}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:${status === 'approved' ? '#2e7d32' : '#c62828'};">Leave ${status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}</h2>
        <p>Hi ${name},</p>
        <p>Your <strong>${leaveType}</strong> leave for <strong>${dates}</strong> has been <strong>${status}</strong>.</p>
        ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
      </div>
    `,
  }),

  checkInAlert: (name, time, location) => ({
    subject: 'Check-In Alert',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1976d2;">Check-In Recorded</h2>
        <p>Hi ${name}, your check-in was recorded at <strong>${time}</strong>.</p>
        ${location ? `<p>Location: ${location}</p>` : ''}
      </div>
    `,
  }),

  welcomeEmployee: (name, email, tempPassword) => ({
    subject: 'Welcome to Attendance System',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1976d2;">Welcome, ${name}!</h2>
        <p>Your employee account has been created.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please change your password after first login.</p>
      </div>
    `,
  }),
};

export const sendEmail = async (to, templateName, ...args) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates[templateName]?.(...args);
    if (!template) throw new Error(`Unknown email template: ${templateName}`);

    await transporter.sendMail({
      from: `"Attendance System" <${process.env.EMAIL_FROM}>`,
      to,
      subject: template.subject,
      html: template.html,
    });

    logger.info(`Email sent: ${templateName} → ${to}`);
    return true;
  } catch (err) {
    logger.error(`Email failed (${templateName} → ${to}):`, err.message);
    return false;
  }
};

export default { sendEmail };
