import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';
const router = Router();
router.use(authMiddleware);
interface CalRow {
  id: string;
  title: string;
  color: string;
  event_date: Date;
  end_date: Date | null;
  start_time: string | null;
  end_time: string | null;
  recurrence: string;
  note: string | null;
  reminders: any;
}
function mapCal(r: CalRow) {
  return {
    id: r.id,
    title: r.title,
    color: r.color,
    date: r.event_date.toISOString().split('T')[0],
    endDate: r.end_date ? r.end_date.toISOString().split('T')[0] : undefined,
    startTime: r.start_time?.substring(0, 5) || '00:00',
    endTime: r.end_time?.substring(0, 5) || '23:59',
    recurrence: r.recurrence || 'none',
    note: r.note || undefined,
    reminders: r.reminders || [],
  };
}
const SELECT_COLS = `id, title, color, event_date, end_date, start_time::text, end_time::text, recurrence, note, reminders`;
// Get all
router.get('/', async (_req, res) => {
  try {
    const rows = await query<CalRow>(`SELECT ${SELECT_COLS} FROM calendar_events ORDER BY event_date, start_time`);
    res.json(rows.map(mapCal));
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju koledarskih dogodkov' });
  }
});
// Get for a specific date (recurrence-aware)
router.get('/date', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Datum je obvezen' });
    const d = '$1::date';
    const sql = `
      SELECT ${SELECT_COLS} FROM calendar_events
      WHERE (
        (recurrence = 'range' AND event_date <= ${d} AND end_date >= ${d})
        OR ((recurrence IS NULL OR recurrence = 'none' OR recurrence = '') AND event_date = ${d})
        OR (recurrence = 'daily' AND event_date <= ${d})
        OR (recurrence = 'weekly' AND event_date <= ${d}
            AND EXTRACT(ISODOW FROM event_date) = EXTRACT(ISODOW FROM ${d}))
        OR (recurrence = 'biweekly' AND event_date <= ${d}
            AND EXTRACT(ISODOW FROM event_date) = EXTRACT(ISODOW FROM ${d})
            AND MOD((${d} - event_date) / 7, 2) = 0)
        OR (recurrence = 'triweekly' AND event_date <= ${d}
            AND EXTRACT(ISODOW FROM event_date) = EXTRACT(ISODOW FROM ${d})
            AND MOD((${d} - event_date) / 7, 3) = 0)
        OR (recurrence = 'monthly' AND event_date <= ${d}
            AND EXTRACT(DAY FROM event_date) = EXTRACT(DAY FROM ${d}))
      )
      ORDER BY start_time
    `;
    const rows = await query<CalRow>(sql, [date]);
    res.json(rows.map(mapCal));
  } catch (error) {
    console.error('Get calendar date error:', error);
    res.status(500).json({ error: 'Napaka' });
  }
});
// Create
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { title, color, date, endDate, startTime, endTime, recurrence, note, reminders } = req.body;
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Naziv, datum, začetek in konec so obvezni' });
    }
    if (recurrence === 'range' && !endDate) {
      return res.status(400).json({ error: 'Razpon zahteva končni datum' });
    }
    const row = await queryOne<CalRow>(
      `INSERT INTO calendar_events (title, color, event_date, end_date, start_time, end_time, recurrence, note, reminders)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${SELECT_COLS}`,
      [title, color || '#3B82F6', date, endDate || null, startTime, endTime, recurrence || 'none', note || null, JSON.stringify(reminders || [])]
    );
    res.status(201).json(mapCal(row!));
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju' });
  }
});
// Update
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, color, date, endDate, startTime, endTime, recurrence, note, reminders } = req.body;
    const row = await queryOne<CalRow>(
      `UPDATE calendar_events SET
        title = COALESCE($1, title), color = COALESCE($2, color),
        event_date = COALESCE($3, event_date), end_date = $4,
        start_time = COALESCE($5, start_time), end_time = COALESCE($6, end_time),
        recurrence = COALESCE($7, recurrence), note = $8,
        reminders = COALESCE($9, reminders)
       WHERE id = $10
       RETURNING ${SELECT_COLS}`,
      [title || null, color || null, date || null, endDate ?? null, startTime || null, endTime || null, recurrence || null, note ?? null, reminders ? JSON.stringify(reminders) : null, id]
    );
    if (!row) return res.status(404).json({ error: 'Dogodek ne obstaja' });
    res.json(mapCal(row));
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju' });
  }
});
// Delete
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const count = await execute('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);
    if (count === 0) return res.status(404).json({ error: 'Dogodek ne obstaja' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju' });
  }
});
export default router;
