import nodemailer from 'nodemailer';
import { queryOne, query } from './db.js';
interface SmtpRow {
  host: string;
  port: number;
  secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
  from_email: string;
}
async function getSmtpSettings(): Promise<SmtpRow | null> {
  const row = await queryOne<SmtpRow>(
    'SELECT host, port, secure, smtp_user, smtp_password, from_name, from_email FROM smtp_settings WHERE id = 1'
  );
  if (!row || !row.host || !row.from_email) return null;
  return row;
}
async function createTransport() {
  const smtp = await getSmtpSettings();
  if (!smtp) return null;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.smtp_user ? {
      user: smtp.smtp_user,
      pass: smtp.smtp_password,
    } : undefined,
  });
}
// Send to a single email
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transport = await createTransport();
    if (!transport) {
      console.log('📧 SMTP not configured, skipping email');
      return false;
    }
    const smtp = await getSmtpSettings();
    if (!smtp) return false;
    await transport.sendMail({
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('📧 Email send error:', error);
    return false;
  }
}
// Send notification to all users who have email_notifications = true and an email set
export async function notifyAll(subject: string, html: string): Promise<void> {
  try {
    const users = await query<{ email: string }>(
      "SELECT email FROM users WHERE email IS NOT NULL AND email != '' AND email_notifications = true"
    );
    if (users.length === 0) return;
    const transport = await createTransport();
    if (!transport) return;
    const smtp = await getSmtpSettings();
    if (!smtp) return;
    for (const user of users) {
      try {
        await transport.sendMail({
          from: `"${smtp.from_name}" <${smtp.from_email}>`,
          to: user.email,
          subject,
          html,
        });
        console.log(`📧 Notification sent to ${user.email}`);
      } catch (err) {
        console.error(`📧 Failed to send to ${user.email}:`, err);
      }
    }
  } catch (error) {
    console.error('📧 notifyAll error:', error);
  }
}
// Send test email
export async function sendTestEmail(to: string): Promise<boolean> {
  return sendEmail(
    to,
    'Šolski Urnik - Testno sporočilo',
    `<h2>✅ Email deluje!</h2>
    <p>To je testno sporočilo iz sistema Šolski Urnik.</p>
    <p>Če ste prejeli to sporočilo, je SMTP strežnik pravilno nastavljen.</p>`
  );
}
