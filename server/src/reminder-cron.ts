import { query, queryOne, execute } from './db.js';
import { notifyAll } from './mailer.js';
import { notifyAllInApp } from './notify.js';
interface CalEvent {
  id: string;
  title: string;
  event_date: string;      // string after pg.types.setTypeParser fix
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  recurrence: string;
  reminders: any[];
}
interface Reminder {
  type: 'hours' | 'days' | 'custom';
  value: number;
  customDate?: string;
  customTime?: string;
}
// Tolerance window: 90 seconds
const TOLERANCE_MS = 90_000;
/**
 * Format a Date to "YYYY-MM-DD" using LOCAL time (not UTC).
 * This avoids the .toISOString() timezone shift bug.
 */
function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
/**
 * Parse a date string + time string into a Date in local timezone.
 */
function buildDateTime(dateStr: string, timeStr: string): Date {
  const [h, mm] = timeStr.substring(0, 5).split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, mm, 0, 0);
  return d;
}
/**
 * Number of full weeks between two dates.
 */
function weeksBetween(d1: Date, d2: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / msPerWeek);
}
/**
 * Find next occurrence of a recurring event relative to now.
 */
function findNextOccurrence(event: CalEvent, now: Date): Date | null {
  const eventDateStr = event.event_date;
  const startTime = (event.start_time || '00:00').substring(0, 5);
  const eventStart = buildDateTime(eventDateStr, startTime);
  const recurrence = event.recurrence || 'none';
  if (recurrence === 'none' || recurrence === '' || recurrence === 'range') {
    return eventStart;
  }
  if (recurrence === 'daily') {
    const today = new Date(now);
    today.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
    if (today.getTime() >= now.getTime() - TOLERANCE_MS) {
      return today;
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (recurrence === 'weekly' || recurrence === 'biweekly' || recurrence === 'triweekly') {
    const interval = recurrence === 'biweekly' ? 2 : recurrence === 'triweekly' ? 3 : 1;
    const eventDow = eventStart.getDay();
    const candidate = new Date(now);
    const todayDow = now.getDay();
    let daysUntil = eventDow - todayDow;
    if (daysUntil < 0) daysUntil += 7;
    candidate.setDate(now.getDate() + daysUntil);
    candidate.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
    if (candidate.getTime() < now.getTime() - TOLERANCE_MS) {
      candidate.setDate(candidate.getDate() + 7);
    }
    if (interval > 1) {
      const weeks = weeksBetween(eventStart, candidate);
      const remainder = weeks % interval;
      if (remainder !== 0) {
        candidate.setDate(candidate.getDate() + (interval - remainder) * 7);
      }
    }
    if (candidate.getTime() < eventStart.getTime()) return null;
    return candidate;
  }
  if (recurrence === 'monthly') {
    const eventDay = eventStart.getDate();
    const candidate = new Date(
      now.getFullYear(), now.getMonth(), eventDay,
      eventStart.getHours(), eventStart.getMinutes(), 0, 0
    );
    if (candidate.getTime() < now.getTime() - TOLERANCE_MS) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    if (candidate.getTime() < eventStart.getTime()) return null;
    return candidate;
  }
  return null;
}
/**
 * Determine if a reminder should fire right now.
 */
function shouldFire(
  event: CalEvent,
  reminder: Reminder,
  now: Date
): { fire: boolean; key: string } {
  const eventDateStr = event.event_date;
  if (reminder.type === 'custom') {
    const targetDate = reminder.customDate || eventDateStr;
    const targetTime = reminder.customTime || '09:00';
    const target = buildDateTime(targetDate, targetTime);
    const diff = Math.abs(now.getTime() - target.getTime());
    const key = `custom-${targetDate}-${targetTime}`;
    return { fire: diff < TOLERANCE_MS, key };
  }
  const nextOccurrence = findNextOccurrence(event, now);
  if (!nextOccurrence) return { fire: false, key: '' };
  const occDateStr = formatDateLocal(nextOccurrence);
  if (reminder.type === 'hours') {
    const target = new Date(nextOccurrence.getTime() - reminder.value * 60 * 60 * 1000);
    const diff = Math.abs(now.getTime() - target.getTime());
    const key = `hours-${reminder.value}-${occDateStr}`;
    return { fire: diff < TOLERANCE_MS, key };
  }
  if (reminder.type === 'days') {
    const target = new Date(nextOccurrence.getTime() - reminder.value * 24 * 60 * 60 * 1000);
    target.setHours(9, 0, 0, 0);
    const diff = Math.abs(now.getTime() - target.getTime());
    const key = `days-${reminder.value}-${occDateStr}`;
    return { fire: diff < TOLERANCE_MS, key };
  }
  return { fire: false, key: '' };
}
/**
 * Main cron check: iterate all calendar events with reminders.
 */
export async function checkReminders(): Promise<void> {
  try {
    const events = await query<CalEvent>(
      `SELECT id, title, event_date, end_date, start_time::text, end_time::text,
              recurrence, reminders
       FROM calendar_events
       WHERE reminders IS NOT NULL AND reminders != '[]'::jsonb`
    );
    const now = new Date();
    if (events.length > 0) {
      console.log(
        `⏰ Checking ${events.length} events at ${now.toLocaleString('sl-SI')} (TZ offset: ${now.getTimezoneOffset()}min)`
      );
    }
    for (const event of events) {
      const reminders: Reminder[] = Array.isArray(event.reminders)
        ? event.reminders
        : [];
      for (const reminder of reminders) {
        const { fire, key } = shouldFire(event, reminder, now);
        if (!fire || !key) continue;
        const already = await queryOne(
          'SELECT 1 FROM sent_reminders WHERE event_id = $1 AND reminder_key = $2',
          [event.id, key]
        );
        if (already) continue;
        const startTime = event.start_time?.substring(0, 5) || '';
        const endTime = event.end_time?.substring(0, 5) || '';
        const eventDate = event.event_date;
        const msg = `⏰ Opomnik: ${event.title} (${startTime} – ${endTime})`;
        await notifyAll(
          `Opomnik: ${event.title}`,
          `<h3>⏰ ${event.title}</h3>
           <p><strong>Čas:</strong> ${startTime} – ${endTime}</p>
           <p><strong>Datum:</strong> ${eventDate}</p>`
        ).catch((err) => console.error('Email notification error:', err));
        notifyAllInApp(msg, 'warning').catch((err) =>
          console.error('In-app notification error:', err)
        );
        await execute(
          'INSERT INTO sent_reminders (event_id, reminder_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [event.id, key]
        );
        console.log(`✅ Reminder sent: ${event.title} [key=${key}]`);
      }
    }
  } catch (error) {
    console.error('❌ checkReminders error:', error);
  }
}
/**
 * Start the reminder cron — checks every 60 seconds.
 */
export function startReminderCron(): void {
  console.log(`⏰ Reminder cron started (every 60s) — TZ offset: ${new Date().getTimezoneOffset()}min`);
  setInterval(checkReminders, 60_000);
  setTimeout(checkReminders, 5_000);
}
