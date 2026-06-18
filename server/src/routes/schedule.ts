import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';
import { notifyAll } from '../mailer.js';

const router = Router();

router.use(authMiddleware);

// Get schedule for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;

    const entries = await query<{
      id: string;
      class_id: string;
      subject_id: string;
      day_of_week: number;
      period_id: string;
      room: string | null;
    }>('SELECT id, class_id, subject_id, day_of_week, period_id, room FROM schedule_entries WHERE class_id = $1', [classId]);

    res.json(entries.map(e => ({
      id: e.id,
      classId: e.class_id,
      subjectId: e.subject_id,
      dayOfWeek: e.day_of_week,
      periodId: e.period_id,
      room: e.room,
    })));
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju urnika' });
  }
});

// Set schedule entry (admin only) - creates or updates
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { classId, subjectId, dayOfWeek, periodId, room } = req.body;

    if (!classId || !subjectId || dayOfWeek === undefined || !periodId) {
      return res.status(400).json({ error: 'Razred, predmet, dan in ura so obvezni' });
    }

    // Upsert - delete existing and insert new
    await execute(
      'DELETE FROM schedule_entries WHERE class_id = $1 AND day_of_week = $2 AND period_id = $3',
      [classId, dayOfWeek, periodId]
    );

    const entry = await queryOne<{
      id: string;
      class_id: string;
      subject_id: string;
      day_of_week: number;
      period_id: string;
      room: string | null;
    }>(
      'INSERT INTO schedule_entries (class_id, subject_id, day_of_week, period_id, room) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [classId, subjectId, dayOfWeek, periodId, room || null]
    );

    res.status(201).json({
      id: entry!.id,
      classId: entry!.class_id,
      subjectId: entry!.subject_id,
      dayOfWeek: entry!.day_of_week,
      periodId: entry!.period_id,
      room: entry!.room,
    });
    // Notify in background
    const cls = await queryOne<{ name: string }>('SELECT name FROM classes WHERE id = $1', [classId]);
    const subj = await queryOne<{ name: string }>('SELECT name FROM subjects WHERE id = $1', [subjectId]);
    const days = ['ponedeljek', 'torek', 'sreda', 'četrtek', 'petek'];
    notifyAll(
      'Sprememba urnika',
      `<p>Urnik za razred <strong>${cls?.name || ''}</strong> je bil spremenjen.</p>
       <p>Predmet <strong>${subj?.name || ''}</strong> – ${days[dayOfWeek] || ''}.</p>`
    ).catch(() => {});
  } catch (error) {
    console.error('Set schedule entry error:', error);
    res.status(500).json({ error: 'Napaka pri shranjevanju urnika' });
  }
});

// Delete schedule entry (admin only)
router.delete('/', adminMiddleware, async (req, res) => {
  try {
    const { classId, dayOfWeek, periodId } = req.body;

    if (!classId || dayOfWeek === undefined || !periodId) {
      return res.status(400).json({ error: 'Razred, dan in ura so obvezni' });
    }

    const count = await execute(
      'DELETE FROM schedule_entries WHERE class_id = $1 AND day_of_week = $2 AND period_id = $3',
      [classId, dayOfWeek, periodId]
    );

    res.json({ success: true, deleted: count });
  } catch (error) {
    console.error('Delete schedule entry error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju vnosa urnika' });
  }
});

export default router;
