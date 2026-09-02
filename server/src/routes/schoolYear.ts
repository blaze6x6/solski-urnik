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
      breaks: any;
    }>('SELECT start_date, end_date, breaks FROM school_year WHERE id = 1');

    if (!year) {
      return res.json({
        startDate: '2025-09-01',
        endDate: '2026-06-24',
        breaks: [],
      });
    }

    res.json({
      startDate: year.start_date,
      endDate: year.end_date,
      breaks: year.breaks || [],
    });
  } catch (error) {
    console.error('Get school year error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju šolskega leta' });
  }
});

// Update school year (admin only)
router.put('/', adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, breaks } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Začetni in končni datum sta obvezna' });
    }

    const breaksJson = JSON.stringify(breaks || []);

    // Upsert z vključenimi počitnicami
    await execute(
      `INSERT INTO school_year (id, start_date, end_date, breaks, updated_at) 
       VALUES (1, $1, $2, $3::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET start_date = $1, end_date = $2, breaks = $3::jsonb, updated_at = NOW()`,
      [startDate, endDate, breaksJson]
    );

    res.json({
      startDate,
      endDate,
      breaks: breaks || [],
    });
  } catch (error) {
    console.error('Update school year error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju šolskega leta' });
  }
});

export default router;
