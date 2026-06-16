import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

// Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await query<{
      id: string;
      name: string;
      grade: number;
    }>('SELECT id, name, grade FROM classes ORDER BY grade, name');

    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju razredov' });
  }
});

// Create class (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, grade } = req.body;

    if (!name || grade === undefined) {
      return res.status(400).json({ error: 'Ime in razred sta obvezna' });
    }

    const cls = await queryOne<{ id: string; name: string; grade: number }>(
      'INSERT INTO classes (name, grade) VALUES ($1, $2) RETURNING id, name, grade',
      [name, grade]
    );

    res.status(201).json(cls);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju razreda' });
  }
});

// Update class (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade } = req.body;

    const cls = await queryOne<{ id: string; name: string; grade: number }>(
      `UPDATE classes SET 
        name = COALESCE($1, name),
        grade = COALESCE($2, grade)
       WHERE id = $3 
       RETURNING id, name, grade`,
      [name || null, grade ?? null, id]
    );

    if (!cls) {
      return res.status(404).json({ error: 'Razred ne obstaja' });
    }

    res.json(cls);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju razreda' });
  }
});

// Delete class (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await execute('DELETE FROM classes WHERE id = $1', [id]);
    
    if (count === 0) {
      return res.status(404).json({ error: 'Razred ne obstaja' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju razreda' });
  }
});

export default router;
