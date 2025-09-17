import nodemailer from 'nodemailer';
import { prettyLog } from './logger.js';

const createTransporter = () => {
  if (process.env.USE_SENDGRID && process.env.SENDGRID_API_KEY) {
    prettyLog('Using SendGrid for email transport');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  prettyLog('Using Gmail for email transport');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const transporter = createTransporter();

export { transporter };