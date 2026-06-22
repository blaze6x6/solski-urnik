import { query, queryOne, execute } from './db.js';
import { notifyAll } from './mailer.js';
import { notifyAllInApp } from './notify.js';
interface CalEvent {
  id: string;
  title: string;
  event_date: Date;
  end_date: Date | null;
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
// Check if a reminder should fire right now (within 1-minute window)
function shouldFire(event: CalEvent, reminder: Reminder, now: Date): { fire: boolean; key: string } {
  const eventDate = event.event_date.toISOString().split('T')[0];
  const [startH, startM] = (event.start_time || '00:00').substring(0, 5).split(':').map(Number);
  if (reminder.type === 'custom') {
    // Fire at specific date+time
    const targetDate = reminder.customDate || eventDate;
    const targetTime = reminder.customTime || '09:00';
    const [tH, tM] = targetTime.split(':').map(Number);
    const target = new Date(targetDate + 'T00:00:00');
    target.setHours(tH, tM, 0, 0);
    const diff = Math.abs(now.getTime() - target.getTime());
    const key = `custom-${targetDate}-${targetTime}`;
    return { fire: diff < 60_000, key }; // within 1 minute
  }
  // For recurring events, find next occurrence relative to now
  let nextOccurrence = new Date(eventDate + 'T00:00:00');
  nextOccurrence.setHours(startH, startM, 0, 0);
  // If event is in the past for non-recurring, skip
  if (event.recurrence === 'none' || !event.recurrence) {
    // Single event — use its date directly
  } else if (event.recurrence === 'daily') {
    // Find next occurrence: today or tomorrow
    const today = new Date(now);
    today.setHours(startH, startM, 0, 0);
    if (today.getTime() >= now.getTime()) {
      nextOccurrence = today;
    } else {
      nextOccurrence = new Date(today);
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }
  } else if (event.recurrence === 'weekly' || event.recurrence === 'biweekly' || event.recurrence === 'triweekly') {
    // Find next matching day of week
    const eventDow = new Date(eventDate + 'T00:00:00').getDay();
    const todayDow = now.getDay();
    let daysUntil = eventDow - todayDow;
    if (daysUntil < 0) daysUntil += 7;
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + daysUntil);
    candidate.setHours(startH, startM, 0, 0);
    if (candidate.getTime() < now.getTime()) {
      candidate.setDate(candidate.getDate() + 7);
    }
    nextOccurrence = candidate;
  } else if (event.recurrence === 'monthly') {
    const eventDay = new Date(eventDate + 'T00:00:00').getDate();
    const candidate = new Date(now.getFullYear(), now.getMonth(), eventDay, startH, startM, 0);
    if (candidate.getTime() < now.getTime()) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    nextOccurrence = candidate;
  } else if (event.recurrence === 'range') {
    // Range: treat like single event on first day
    // Already set above
  }
  if (reminder.type === 'hours') {
    const target = new Date(nextOccurrence.getTime() - reminder.value * 60 * 60 * 1000);
    const diff = Math.abs(now.getTime() - target.getTime());
    const key = `hours-${reminder.value}-${nextOccurrence.toISOString().split('T')[0]}`;
    return { fire: diff < 60_000, key };
  }
  if (reminder.type === 'days') {
    const target = new Date(nextOccurrence.getTime() - reminder.value * 24 * 60 * 60 * 1000);
    target.setHours(9, 0, 0, 0); // Send day-reminders at 9:00
    const diff = Math.abs(now.getTime() - target.getTime());
    const key = `days-${reminder.value}-${nextOccurrence.toISOString().split('T')[0]}`;
    return { fire: diff < 60_000, key };
  }
  return { fire: false, key: '' };
}
export async function checkReminders(): Promise<void> {
  try {
    const events = await query<CalEvent>(
      `SELECT id, title, event_date, end_date, start_time::text, end_time::text, recurrence, reminders
       FROM calendar_events
       WHERE reminders IS NOT NULL AND reminders != '[]'::jsonb`
    );
    const now = new Date();
    for (const event of events) {
      const reminders: Reminder[] = Array.isArray(event.reminders) ? event.reminders : [];
      for (const reminder of reminders) {
        const { fire, key } = shouldFire(event, reminder, now);
        if (!fire || !key) continue;
        // Check if already sent
        const already = await queryOne(
          'SELECT 1 FROM sent_reminders WHERE event_id = $1 AND reminder_key = $2',
          [event.id, key]
        );
        if (already) continue;
        // Send notification
        const startTime = event.start_time?.substring(0, 5) || '';
        const endTime = event.end_time?.substring(0, 5) || '';
        const msg = `⏰ Opomnik: ${event.title} (${startTime} – ${endTime})`;
        await notifyAll(
          `Opomnik: ${event.title}`,
          `<h3>⏰ ${event.title}</h3>
           <p><strong>Čas:</strong> ${startTime} – ${endTime}</p>
           <p><strong>Datum:</strong> ${event.event_date.toISOString().split('T')[0]}</p>`
        ).catch(() => {});
        notifyAllInApp(msg, 'warning').catch(() => {});
        // Mark as sent
        await execute(
          'INSERT INTO sent_reminders (event_id, reminder_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [event.id, key]
        );
        console.log(`⏰ Reminder sent: ${event.title} [${key}]`);
      }
    }
  } catch (error) {
    console.error('checkReminders error:', error);
  }
}
// Start cron — check every minute
export function startReminderCron(): void {
  console.log('⏰ Reminder cron started (every 60s)');
  setInterval(checkReminders, 60_000);
  // Also check immediately on startup
  setTimeout(checkReminders, 5_000);
}
