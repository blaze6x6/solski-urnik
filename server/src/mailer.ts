import nodemailer from 'nodemailer';
import ical, { ICalCalendarMethod, ICalEventRepeatingFreq } from 'ical-generator';
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
// Send a simple email
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
// Send email with .ics calendar attachment
export async function sendEmailWithCalendar(
  to: string,
  subject: string,
  html: string,
  calendarEvent: {
    title: string;
    date: string;       // YYYY-MM-DD
    startTime: string;  // HH:MM
    endTime: string;    // HH:MM
    recurrence?: string;
    description?: string;
  }
): Promise<boolean> {
  try {
    const transport = await createTransport();
    if (!transport) return false;
    const smtp = await getSmtpSettings();
    if (!smtp) return false;
    // Build .ics
    const cal = ical({ name: 'Šolski Urnik', method: ICalCalendarMethod.PUBLISH });
    const [startH, startM] = calendarEvent.startTime.split(':').map(Number);
    const [endH, endM] = calendarEvent.endTime.split(':').map(Number);
    const startDate = new Date(calendarEvent.date + 'T00:00:00');
    startDate.setHours(startH, startM, 0, 0);
    const endDate = new Date(calendarEvent.date + 'T00:00:00');
    endDate.setHours(endH, endM, 0, 0);
    const event = cal.createEvent({
      start: startDate,
      end: endDate,
      summary: calendarEvent.title,
      description: calendarEvent.description || calendarEvent.title,
    });
    // Add recurrence rule
    if (calendarEvent.recurrence && calendarEvent.recurrence !== 'none') {
      const freqMap: Record<string, { freq: ICalEventRepeatingFreq; interval: number }> = {
        daily:      { freq: ICalEventRepeatingFreq.DAILY, interval: 1 },
        weekly:     { freq: ICalEventRepeatingFreq.WEEKLY, interval: 1 },
        biweekly:   { freq: ICalEventRepeatingFreq.WEEKLY, interval: 2 },
        triweekly:  { freq: ICalEventRepeatingFreq.WEEKLY, interval: 3 },
        monthly:    { freq: ICalEventRepeatingFreq.MONTHLY, interval: 1 },
      };
      const rule = freqMap[calendarEvent.recurrence];
      if (rule) {
        // Get school year end for UNTIL
        const schoolYear = await queryOne<{ end_date: Date }>('SELECT end_date FROM school_year WHERE id = 1');
        const until = schoolYear ? schoolYear.end_date : new Date(startDate.getFullYear() + 1, 5, 30);
        event.repeating({
          freq: rule.freq,
          interval: rule.interval,
          until,
        });
      }
    }
    const icsContent = cal.toString();
    await transport.sendMail({
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to,
      subject,
      html,
      icalEvent: {
        filename: 'event.ics',
        method: 'PUBLISH',
        content: icsContent,
      },
    });
    console.log(`📧 Email with .ics sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('📧 Email with calendar error:', error);
    return false;
  }
}
// Notify all users with notifications enabled (simple email)
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
          html: html, // Normalna HTML vsebina
          alternatives: [
            {
              contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
              content: icsContent,
            }
          ]
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
// Notify all with calendar attachment
export async function notifyAllWithCalendar(
  subject: string,
  html: string,
  calendarEvent: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    recurrence?: string;
    description?: string;
  }
): Promise<void> {
  try {
    const users = await query<{ email: string }>(
      "SELECT email FROM users WHERE email IS NOT NULL AND email != '' AND email_notifications = true"
    );
    if (users.length === 0) return;
    for (const user of users) {
      sendEmailWithCalendar(user.email, subject, html, calendarEvent).catch(() => {});
    }
  } catch (error) {
    console.error('📧 notifyAllWithCalendar error:', error);
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
