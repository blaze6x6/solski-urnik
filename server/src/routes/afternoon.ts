import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';
import { notifyAllWithCalendar } from '../mailer.js';
import { notifyAllInApp } from '../notify.js';

const router = Router();

router.use(authMiddleware);

interface AfternoonRow {
  id: string;
  class_id: string;
  day_of_week: number;
  name: string;
  color: string;
  start_time: string | null;
  end_time: string | null;
}

function mapEntry(r: AfternoonRow) {
  return {
    id: r.id,
    classId: r.class_id,
    dayOfWeek: r.day_of_week,
    name: r.name,
    color: r.color,
    startTime: r.start_time?.substring(0, 5) || '',
    endTime: r.end_time?.substring(0, 5) || '',
  };
}

// Get afternoon entries for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const rows = await query<AfternoonRow>(
      `SELECT id, class_id, day_of_week, name, color, start_time::text, end_time::text
       FROM afternoon_schedule
       WHERE class_id = $1
       ORDER BY day_of_week, start_time`,
      [classId]
    );
    res.json(rows.map(mapEntry));
  } catch (error) {
    console.error('Get afternoon error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju popoldanskih dejavnosti' });
  }
});

// Create
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { classId, dayOfWeek, name, color, startTime, endTime } = req.body;
    if (!classId || dayOfWeek === undefined || !name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Vsa polja so obvezna' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'Ura začetka mora biti pred uro konca' });
    }

    const row = await queryOne<AfternoonRow>(
      `INSERT INTO afternoon_schedule (class_id, day_of_week, name, color, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, class_id, day_of_week, name, color, start_time::text, end_time::text`,
      [classId, dayOfWeek, name, color || '#10B981', startTime, endTime]
    );
    res.status(201).json(mapEntry(row!));
    const days = ['ponedeljek', 'torek', 'sreda', 'četrtek', 'petek'];
    // Find the next occurrence of this weekday for the .ics date
    const today = new Date();
    const todayDow = (today.getDay() + 6) % 7; // 0=Mon
    let daysUntil = dayOfWeek - todayDow;
    if (daysUntil <= 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    const dateStr = nextDate.toISOString().split('T')[0];
    notifyAllWithCalendar(
      'Nova popoldanska dejavnost: ' + name,
      `<p>Dodana je bila nova popoldanska dejavnost: <strong>${name}</strong></p>
       <p>${days[dayOfWeek] || ''}, ${startTime} – ${endTime} (vsak teden)</p>
       <p><small>Odprite priloženo .ics datoteko za dodajanje v koledar.</small></p>`,
      { title: name, date: dateStr, startTime, endTime, recurrence: 'weekly', description: name }
    ).catch(() => {});
    notifyAllInApp(`Nova popoldanska dejavnost: ${name} (${days[dayOfWeek]}, ${startTime}–${endTime})`, 'info').catch(() => {});
  } catch (error) {
    console.error('Create afternoon error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju' });
  }
});

// Update
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, name, color, startTime, endTime } = req.body;

    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({ error: 'Ura začetka mora biti pred uro konca' });
    }

    const row = await queryOne<AfternoonRow>(
      `UPDATE afternoon_schedule SET
        day_of_week = COALESCE($1, day_of_week),
        name        = COALESCE($2, name),
        color       = COALESCE($3, color),
        start_time  = COALESCE($4, start_time),
        end_time    = COALESCE($5, end_time)
       WHERE id = $6
       RETURNING id, class_id, day_of_week, name, color, start_time::text, end_time::text`,
      [dayOfWeek ?? null, name || null, color || null, startTime || null, endTime || null, id]
    );
    if (!row) return res.status(404).json({ error: 'Ne obstaja' });
    res.json(mapEntry(row));
  } catch (error) {
    console.error('Update afternoon error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju' });
  }
});

// Delete
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const count = await execute('DELETE FROM afternoon_schedule WHERE id = $1', [req.params.id]);
    if (count === 0) return res.status(404).json({ error: 'Ne obstaja' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete afternoon error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju' });
  }
});

export default router;
