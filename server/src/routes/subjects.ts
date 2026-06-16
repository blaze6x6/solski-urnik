import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await query<{
      id: string;
      name: string;
      short_name: string;
      color: string;
    }>('SELECT id, name, short_name, color FROM subjects ORDER BY name');

    res.json(subjects.map(s => ({
      id: s.id,
      name: s.name,
      shortName: s.short_name,
      color: s.color,
    })));
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju predmetov' });
  }
});

// Create subject (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, shortName, color } = req.body;

    if (!name || !shortName || !color) {
      return res.status(400).json({ error: 'Ime, kratica in barva so obvezni' });
    }

    const subject = await queryOne<{ id: string; name: string; short_name: string; color: string }>(
      'INSERT INTO subjects (name, short_name, color) VALUES ($1, $2, $3) RETURNING id, name, short_name, color',
      [name, shortName, color]
    );

    res.status(201).json({
      id: subject!.id,
      name: subject!.name,
      shortName: subject!.short_name,
      color: subject!.color,
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju predmeta' });
  }
});

// Update subject (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortName, color } = req.body;

    const subject = await queryOne<{ id: string; name: string; short_name: string; color: string }>(
      `UPDATE subjects SET 
        name = COALESCE($1, name),
        short_name = COALESCE($2, short_name),
        color = COALESCE($3, color)
       WHERE id = $4 
       RETURNING id, name, short_name, color`,
      [name || null, shortName || null, color || null, id]
    );

    if (!subject) {
      return res.status(404).json({ error: 'Predmet ne obstaja' });
    }

    res.json({
      id: subject.id,
      name: subject.name,
      shortName: subject.short_name,
      color: subject.color,
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju predmeta' });
  }
});

// Delete subject (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await execute('DELETE FROM subjects WHERE id = $1', [id]);
    
    if (count === 0) {
      return res.status(404).json({ error: 'Predmet ne obstaja' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju predmeta' });
  }
});

export default router;
