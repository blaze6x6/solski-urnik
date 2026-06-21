import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';
import { notifyAllWithCalendar } from '../mailer.js';
import { notifyAllInApp } from '../notify.js';
const router = Router();
router.use(authMiddleware);
// ----- helpers -----
interface EventRow {
  id: string;
  event_date: Date;
  title: string;
  color: string;
  class_ids: string[];
  start_time: string | null;
  end_time: string | null;
  recurrence: string;
}
function mapEvent(e: EventRow) {
  return {
    id: e.id,
    date: e.event_date.toISOString().split('T')[0],
    title: e.title,
    color: e.color,
    classIds: e.class_ids || [],
    startTime: e.start_time?.substring(0, 5) || '00:00',
    endTime: e.end_time?.substring(0, 5) || '23:59',
    recurrence: e.recurrence || 'none',
  };
}
function recurrenceWhere(dateParam: string): string {
  const d = `${dateParam}::date`;
  return `(
    ((recurrence IS NULL OR recurrence = 'none' OR recurrence = '') AND event_date = ${d})
    OR
    (recurrence = 'daily'     AND event_date <= ${d})
    OR
    (recurrence = 'weekly'    AND event_date <= ${d}
                              AND EXTRACT(ISODOW FROM event_date) = EXTRACT(ISODOW FROM ${d}))
    OR
    (recurrence = 'biweekly'  AND event_date <= ${d}
                              AND EXTRACT(ISODOW FROM event_date) = EXTRACT(ISODOW FROM ${d})
                              AND MOD( (${d} - event_date) / 7 , 2) = 0)
    OR
    (recurrence = 'triweekly' AND event_date <= ${d}
                              AND EXTRACT(ISODOW FROM event_date) = EXTRACT(ISODOW FROM ${d})
                              AND MOD( (${d} - event_date) / 7 , 3) = 0)
    OR
    (recurrence = 'monthly'   AND event_date <= ${d}
                              AND EXTRACT(DAY FROM event_date) = EXTRACT(DAY FROM ${d}))
  )`;
}
const RETURNING = `RETURNING id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence`;
// ----- routes -----
// Get all events (admin list)
router.get('/', async (_req, res) => {
  try {
    const events = await query<EventRow>(
      `SELECT id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence
       FROM day_events
       ORDER BY event_date, start_time`
    );
    res.json(events.map(mapEvent));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju dogodkov' });
  }
});
// Get events for a class on a specific date (recurrence-aware)
router.get('/time-events', async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ error: 'Razred in datum sta obvezna' });
    }
    // Debug: dump all events so we can see what's in the DB
    const allEvents = await query<EventRow>(
      `SELECT id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence
       FROM day_events`
    );
    if (allEvents.length > 0) {
      console.log(`📅 DEBUG all ${allEvents.length} events in DB:`);
      for (const e of allEvents) {
        console.log(`   - "${e.title}" date=${e.event_date.toISOString().split('T')[0]} time=${e.start_time}-${e.end_time} rec=${e.recurrence} classIds=${JSON.stringify(e.class_ids)}`);
      }
    }
    const timeEventsSql = `
      SELECT id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence
      FROM day_events
      WHERE start_time IS NOT NULL
        AND end_time IS NOT NULL
        AND (class_ids IS NULL OR class_ids = '{}' OR $2::uuid = ANY(class_ids))
        AND ${recurrenceWhere('$1')}
      ORDER BY start_time
    `;
    const events = await query<EventRow>(timeEventsSql, [date, classId]);
    console.log(`📅 time-events: date=${date}, classId=${classId}, found=${events.length}`);
    res.json(events.map(mapEvent));
  } catch (error) {
    console.error('Get time events error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju dogodkov' });
  }
});
// Create event
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { date, title, color, classIds, startTime, endTime, recurrence } = req.body;
    if (!date || !title || !color || !startTime || !endTime) {
      return res.status(400).json({ error: 'Datum, naziv, barva, začetek in konec so obvezni' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'Ura začetka mora biti pred uro konca' });
    }
    const event = await queryOne<EventRow>(
      `INSERT INTO day_events (event_date, title, color, class_ids, is_all_day, start_time, end_time, recurrence)
       VALUES ($1, $2, $3, $4, false, $5, $6, $7)
       ${RETURNING}`,
      [date, title, color, classIds || [], startTime, endTime, recurrence || 'none']
    );
    res.status(201).json(mapEvent(event!));
    const recLabels: Record<string, string> = {
      none: '', daily: ' (vsak dan)', weekly: ' (vsak teden)',
      biweekly: ' (vsak drugi teden)', triweekly: ' (vsak tretji teden)', monthly: ' (vsak mesec)',
    };
    notifyAllWithCalendar(
      'Nov dogodek: ' + title,
      `<p>Dodan je bil nov dogodek: <strong>${title}</strong></p>
       <p>Datum: ${date}, ${startTime} – ${endTime}${recLabels[recurrence || 'none'] || ''}</p>
       <p><small>Odprite priloženo .ics datoteko za dodajanje v Google Koledar ali drug koledar.</small></p>`,
      { title, date, startTime, endTime, recurrence: recurrence || 'none', description: title }
    ).catch(() => {});
    notifyAllInApp(`Nov dogodek: ${title} (${date}, ${startTime}–${endTime})`, 'info').catch(() => {});
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju dogodka' });
  }
});
// Update event
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, title, color, classIds, startTime, endTime, recurrence } = req.body;
    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({ error: 'Ura začetka mora biti pred uro konca' });
    }
    const event = await queryOne<EventRow>(
      `UPDATE day_events SET
        event_date = COALESCE($1, event_date),
        title      = COALESCE($2, title),
        color      = COALESCE($3, color),
        class_ids  = COALESCE($4, class_ids),
        start_time = COALESCE($5, start_time),
        end_time   = COALESCE($6, end_time),
        recurrence = COALESCE($7, recurrence),
        is_all_day = false
       WHERE id = $8
       ${RETURNING}`,
      [date || null, title || null, color || null, classIds ?? null,
       startTime || null, endTime || null, recurrence || null, id]
    );
    if (!event) {
      return res.status(404).json({ error: 'Dogodek ne obstaja' });
    }
    res.json(mapEvent(event));
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju dogodka' });
  }
});
// Delete event
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await execute('DELETE FROM day_events WHERE id = $1', [id]);
    if (count === 0) {
      return res.status(404).json({ error: 'Dogodek ne obstaja' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju dogodka' });
  }
});
export default router;
