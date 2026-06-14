import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

// Get all periods (sorted by start_time)
router.get('/', async (req, res) => {
  try {
    const periods = await query<{
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      is_break: boolean;
    }>('SELECT id, name, start_time::text, end_time::text, is_break FROM periods ORDER BY start_time');

    res.json(periods.map(p => ({
      id: p.id,
      name: p.name,
      startTime: p.start_time.substring(0, 5), // HH:MM
      endTime: p.end_time.substring(0, 5),
      isBreak: p.is_break,
    })));
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju ur' });
  }
});

// Create period (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, startTime, endTime, isBreak } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Ime, začetek in konec so obvezni' });
    }

    const period = await queryOne<{
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      is_break: boolean;
    }>(
      'INSERT INTO periods (name, start_time, end_time, is_break) VALUES ($1, $2, $3, $4) RETURNING id, name, start_time::text, end_time::text, is_break',
      [name, startTime, endTime, isBreak || false]
    );

    res.status(201).json({
      id: period!.id,
      name: period!.name,
      startTime: period!.start_time.substring(0, 5),
      endTime: period!.end_time.substring(0, 5),
      isBreak: period!.is_break,
    });
  } catch (error) {
    console.error('Create period error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju ure' });
  }
});

// Update period (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, isBreak } = req.body;

    const period = await queryOne<{
      id: string;
      name: string;
      start_time: string;
      end_time: string;
      is_break: boolean;
    }>(
      `UPDATE periods SET 
        name = COALESCE($1, name),
        start_time = COALESCE($2, start_time),
        end_time = COALESCE($3, end_time),
        is_break = COALESCE($4, is_break)
       WHERE id = $5 
       RETURNING id, name, start_time::text, end_time::text, is_break`,
      [name || null, startTime || null, endTime || null, isBreak ?? null, id]
    );

    if (!period) {
      return res.status(404).json({ error: 'Ura ne obstaja' });
    }

    res.json({
      id: period.id,
      name: period.name,
      startTime: period.start_time.substring(0, 5),
      endTime: period.end_time.substring(0, 5),
      isBreak: period.is_break,
    });
  } catch (error) {
    console.error('Update period error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju ure' });
  }
});

// Delete period (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await execute('DELETE FROM periods WHERE id = $1', [id]);
    
    if (count === 0) {
      return res.status(404).json({ error: 'Ura ne obstaja' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete period error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju ure' });
  }
});

export default router;
