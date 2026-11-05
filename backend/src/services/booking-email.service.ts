import nodemailer from 'nodemailer';
import type { AppConfig } from '../config/env.js';
import { inTransaction } from '../config/database.js';
import { nextBookingEmail, finishBookingEmail } from '../repositories/booking-email.repository.js';

export async function deliverBookingEmails(config: AppConfig): Promise<void> {
  if (!config.SMTP_HOST || !config.SMTP_FROM) return;
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
  });
  try {
    for (let i = 0; i < 5; i++) {
      const found = await inTransaction(async client => {
        const email = (await nextBookingEmail(client)).rows[0];
        if (!email) return false;
        try {
          await transport.sendMail({ from: config.SMTP_FROM, to: email.recipient, subject: email.subject,
            text: email.body, messageId: `<booking-email-${email.id}@${new URL(config.APP_ORIGIN).hostname}>` });
          await finishBookingEmail(client, email.id, true);
        } catch {
          await finishBookingEmail(client, email.id, false);
          console.warn('Booking email delivery failed; queued for retry', { emailId: email.id });
        }
        return true;
      });
      if (!found) break;
    }
  } finally { transport.close(); }
}
