import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth.js';
import { sendEmail } from '../mailer.js';
import { notifyUsersInApp } from '../notify.js';

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
      date: n.note_date,
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
      date: n.note_date,
      content: note!.content,
      createdAt: note!.created_at.toISOString(),
    });
    // Notify linked parents
    (async () => {
      try {
        const student = await queryOne<{ first_name: string; last_name: string }>(
          'SELECT first_name, last_name FROM students WHERE id = $1', [studentId]
        );
        const sName = `${student?.first_name || ''} ${student?.last_name || ''}`;
        // Email
        const parents = await query<{ id: string; email: string }>(
          `SELECT u.id, u.email FROM users u
           JOIN parent_children pc ON pc.parent_id = u.id
           WHERE pc.student_id = $1`,
          [studentId]
        );
        for (const p of parents) {
          if (p.email) {
            sendEmail(
              p.email,
              `Nova beležka za ${sName}`,
              `<p>Nova beležka za <strong>${sName}</strong>:</p>
               <p>${content}</p>
               <p><small>Datum: ${date}</small></p>`
            ).catch(() => {});
          }
        }
        // In-app
        const parentIds = parents.map(p => p.id);
        notifyUsersInApp(parentIds, `Nova beležka za ${sName}: ${content.substring(0, 100)}`, 'info').catch(() => {});
      } catch {}
    })();
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
      date: n.note_date,
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
