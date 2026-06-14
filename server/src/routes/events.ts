import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

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

// SQL fragment that checks whether a given $date matches the recurrence
// pattern of a row whose start date is event_date.
// $1 = the date we are checking against
const RECURRENCE_MATCH = `(
  (recurrence = 'none'      AND event_date = $1)
  OR
  (recurrence = 'daily'     AND event_date <= $1)
  OR
  (recurrence = 'weekly'    AND event_date <= $1
                            AND EXTRACT(ISODOW FROM event_date::timestamp)::int = EXTRACT(ISODOW FROM $1::date)::int)
  OR
  (recurrence = 'biweekly'  AND event_date <= $1
                            AND EXTRACT(ISODOW FROM event_date::timestamp)::int = EXTRACT(ISODOW FROM $1::date)::int
                            AND (($1::date - event_date) / 7) % 2 = 0)
  OR
  (recurrence = 'triweekly' AND event_date <= $1
                            AND EXTRACT(ISODOW FROM event_date::timestamp)::int = EXTRACT(ISODOW FROM $1::date)::int
                            AND (($1::date - event_date) / 7) % 3 = 0)
  OR
  (recurrence = 'monthly'   AND event_date <= $1
                            AND EXTRACT(DAY FROM event_date::timestamp)::int = EXTRACT(DAY FROM $1::date)::int)
)`;

// ----- routes -----

// Get all events (admin list – shows each event once)
router.get('/', async (_req, res) => {
  try {
    const events = await query<EventRow>(
      `SELECT id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence
       FROM day_events
       WHERE start_time IS NOT NULL AND end_time IS NOT NULL
       ORDER BY event_date, start_time`
    );
    res.json(events.map(mapEvent));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju dogodkov' });
  }
});

// Get time-specific events for a class on a particular date (respects recurrence)
router.get('/time-events', async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ error: 'Razred in datum sta obvezna' });
    }

    const events = await query<EventRow>(
      `SELECT id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence
       FROM day_events
       WHERE start_time IS NOT NULL
         AND end_time IS NOT NULL
         AND (class_ids = '{}' OR $2 = ANY(class_ids))
         AND ${RECURRENCE_MATCH}
       ORDER BY start_time`,
      [date, classId]
    );

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
       RETURNING id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence`,
      [date, title, color, classIds || [], startTime, endTime, recurrence || 'none']
    );

    res.status(201).json(mapEvent(event!));
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
       RETURNING id, event_date, title, color, class_ids, start_time::text, end_time::text, recurrence`,
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
