import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await query<{
      id: string;
      first_name: string;
      last_name: string;
      class_id: string;
    }>('SELECT id, first_name, last_name, class_id FROM students ORDER BY last_name, first_name');

    const result = await Promise.all(
      students.map(async (s) => {
        const parents = await query<{ parent_id: string }>(
          'SELECT parent_id FROM parent_children WHERE student_id = $1',
          [s.id]
        );
        return {
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          classId: s.class_id,
          parentIds: parents.map(p => p.parent_id),
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju učencev' });
  }
});

// Get single student
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const student = await queryOne<{
      id: string;
      first_name: string;
      last_name: string;
      class_id: string;
    }>('SELECT id, first_name, last_name, class_id FROM students WHERE id = $1', [id]);

    if (!student) {
      return res.status(404).json({ error: 'Učenec ne obstaja' });
    }

    const parents = await query<{ parent_id: string }>(
      'SELECT parent_id FROM parent_children WHERE student_id = $1',
      [id]
    );

    res.json({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      classId: student.class_id,
      parentIds: parents.map(p => p.parent_id),
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju učenca' });
  }
});

// Create student (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, classId } = req.body;

    if (!firstName || !lastName || !classId) {
      return res.status(400).json({ error: 'Ime, priimek in razred so obvezni' });
    }

    const student = await queryOne<{
      id: string;
      first_name: string;
      last_name: string;
      class_id: string;
    }>(
      'INSERT INTO students (first_name, last_name, class_id) VALUES ($1, $2, $3) RETURNING id, first_name, last_name, class_id',
      [firstName, lastName, classId]
    );

    res.status(201).json({
      id: student!.id,
      firstName: student!.first_name,
      lastName: student!.last_name,
      classId: student!.class_id,
      parentIds: [],
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju učenca' });
  }
});

// Update student (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, classId } = req.body;

    const student = await queryOne<{
      id: string;
      first_name: string;
      last_name: string;
      class_id: string;
    }>(
      `UPDATE students SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        class_id = COALESCE($3, class_id),
        updated_at = NOW()
       WHERE id = $4 
       RETURNING id, first_name, last_name, class_id`,
      [firstName || null, lastName || null, classId || null, id]
    );

    if (!student) {
      return res.status(404).json({ error: 'Učenec ne obstaja' });
    }

    const parents = await query<{ parent_id: string }>(
      'SELECT parent_id FROM parent_children WHERE student_id = $1',
      [id]
    );

    res.json({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      classId: student.class_id,
      parentIds: parents.map(p => p.parent_id),
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju učenca' });
  }
});

// Delete student (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await execute('DELETE FROM students WHERE id = $1', [id]);
    
    if (count === 0) {
      return res.status(404).json({ error: 'Učenec ne obstaja' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju učenca' });
  }
});

export default router;
