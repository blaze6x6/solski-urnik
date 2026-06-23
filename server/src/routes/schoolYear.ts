import { Router } from 'express';
import { queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

// Get school year
router.get('/', async (req, res) => {
  try {
    const year = await queryOne<{
      start_date: string;
      end_date: string;
    }>('SELECT start_date, end_date FROM school_year WHERE id = 1');

    if (!year) {
      return res.json({
        startDate: '2025-09-01',
        endDate: '2026-06-24',
      });
    }

    res.json({
      startDate: year.start_date,
      endDate: year.end_date,
    });
  } catch (error) {
    console.error('Get school year error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju šolskega leta' });
  }
});

// Update school year (admin only)
router.put('/', adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Začetni in končni datum sta obvezna' });
    }

    // Upsert
    await execute(
      `INSERT INTO school_year (id, start_date, end_date, updated_at) 
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET start_date = $1, end_date = $2, updated_at = NOW()`,
      [startDate, endDate]
    );

    res.json({
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Update school year error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju šolskega leta' });
  }
});

export default router;
