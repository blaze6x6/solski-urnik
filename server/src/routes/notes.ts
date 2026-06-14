import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth.js';

const router = Router();

router.use(authMiddleware);

// Get notes for a student (admin or linked parent)
router.get('/student/:studentId', async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;

    // Check if user is admin or linked parent
    if (req.user!.role !== 'admin') {
      const link = await queryOne(
        'SELECT 1 FROM parent_children WHERE parent_id = $1 AND student_id = $2',
        [req.user!.userId, studentId]
      );
      if (!link) {
        return res.status(403).json({ error: 'Nimate dostopa do beležk tega otroka' });
      }
    }

    const notes = await query<{
      id: string;
      student_id: string;
      note_date: Date;
      content: string;
      created_at: Date;
    }>(
      'SELECT id, student_id, note_date, content, created_at FROM student_notes WHERE student_id = $1 ORDER BY note_date DESC, created_at DESC',
      [studentId]
    );

    res.json(notes.map(n => ({
      id: n.id,
      studentId: n.student_id,
      date: n.note_date.toISOString().split('T')[0],
      content: n.content,
      createdAt: n.created_at.toISOString(),
    })));
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju beležk' });
  }
});

// Create note (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { studentId, date, content } = req.body;

    if (!studentId || !date || !content) {
      return res.status(400).json({ error: 'Učenec, datum in vsebina so obvezni' });
    }

    const note = await queryOne<{
      id: string;
      student_id: string;
      note_date: Date;
      content: string;
      created_at: Date;
    }>(
      'INSERT INTO student_notes (student_id, note_date, content) VALUES ($1, $2, $3) RETURNING *',
      [studentId, date, content]
    );

    res.status(201).json({
      id: note!.id,
      studentId: note!.student_id,
      date: note!.note_date.toISOString().split('T')[0],
      content: note!.content,
      createdAt: note!.created_at.toISOString(),
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju beležke' });
  }
});

// Update note (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, content } = req.body;

    const note = await queryOne<{
      id: string;
      student_id: string;
      note_date: Date;
      content: string;
      created_at: Date;
    }>(
      `UPDATE student_notes SET 
        note_date = COALESCE($1, note_date),
        content = COALESCE($2, content)
       WHERE id = $3 
       RETURNING *`,
      [date || null, content || null, id]
    );

    if (!note) {
      return res.status(404).json({ error: 'Beležka ne obstaja' });
    }

    res.json({
      id: note.id,
      studentId: note.student_id,
      date: note.note_date.toISOString().split('T')[0],
      content: note.content,
      createdAt: note.created_at.toISOString(),
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju beležke' });
  }
});

// Delete note (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const count = await execute('DELETE FROM student_notes WHERE id = $1', [id]);
    
    if (count === 0) {
      return res.status(404).json({ error: 'Beležka ne obstaja' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju beležke' });
  }
});

export default router;
