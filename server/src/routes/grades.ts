import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth.js';
import { notifyUsersInApp } from '../notify.js';
import { sendEmail } from '../mailer.js';
const router = Router();
router.use(authMiddleware);
interface GradeRow {
  id: string;
  student_id: string;
  subject_id: string;
  grade: number;
  type: string;
  grade_date: Date;
  note: string | null;
  created_at: Date;
}
function mapGrade(r: GradeRow) {
  return {
    id: r.id,
    studentId: r.student_id,
    subjectId: r.subject_id,
    grade: r.grade,
    type: r.type,
    date: r.grade_date.toISOString().split('T')[0],
    note: r.note || undefined,
    createdAt: r.created_at.toISOString(),
  };
}
// Get grades for a student (admin or linked parent)
router.get('/student/:studentId', async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    // Check access
    if (req.user!.role !== 'admin') {
      const link = await queryOne(
        'SELECT 1 FROM parent_children WHERE parent_id = $1 AND student_id = $2',
        [req.user!.userId, studentId]
      );
      if (!link) {
        return res.status(403).json({ error: 'Nimate dostopa do ocen tega otroka' });
      }
    }
    const rows = await query<GradeRow>(
      `SELECT id, student_id, subject_id, grade, type, grade_date, note, created_at
       FROM grades WHERE student_id = $1
       ORDER BY grade_date DESC, created_at DESC`,
      [studentId]
    );
    res.json(rows.map(mapGrade));
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju ocen' });
  }
});
// Create grade (admin only)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { studentId, subjectId, grade, type, date, note } = req.body;
    if (!studentId || !subjectId || !grade || !type || !date) {
      return res.status(400).json({ error: 'Učenec, predmet, ocena, tip in datum so obvezni' });
    }
    if (grade < 1 || grade > 5) {
      return res.status(400).json({ error: 'Ocena mora biti med 1 in 5' });
    }
    const row = await queryOne<GradeRow>(
      `INSERT INTO grades (student_id, subject_id, grade, type, grade_date, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_id, subject_id, grade, type, grade_date, note, created_at`,
      [studentId, subjectId, grade, type, date, note || null]
    );
    res.status(201).json(mapGrade(row!));
    // Notify linked parents
    (async () => {
      try {
        const student = await queryOne<{ first_name: string; last_name: string }>(
          'SELECT first_name, last_name FROM students WHERE id = $1', [studentId]
        );
        const subject = await queryOne<{ name: string }>(
          'SELECT name FROM subjects WHERE id = $1', [subjectId]
        );
        const sName = `${student?.first_name || ''} ${student?.last_name || ''}`;
        const typeLabel = type === 'written' ? 'pisno' : 'ustno';
        const msg = `Nova ocena za ${sName}: ${subject?.name || ''} – ${grade} (${typeLabel})`;
        const parents = await query<{ id: string; email: string }>(
          `SELECT u.id, u.email FROM users u
           JOIN parent_children pc ON pc.parent_id = u.id
           WHERE pc.student_id = $1`,
          [studentId]
        );
        // In-app
        notifyUsersInApp(parents.map(p => p.id), msg, 'info').catch(() => {});
        // Email
        for (const p of parents) {
          if (p.email) {
            sendEmail(p.email, msg,
              `<p>${msg}</p>${note ? `<p>Opomba: ${note}</p>` : ''}<p><small>Datum: ${date}</small></p>`
            ).catch(() => {});
          }
        }
      } catch {}
    })();
  } catch (error) {
    console.error('Create grade error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju ocene' });
  }
});
// Update grade (admin only)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectId, grade, type, date, note } = req.body;
    const row = await queryOne<GradeRow>(
      `UPDATE grades SET
        subject_id = COALESCE($1, subject_id),
        grade = COALESCE($2, grade),
        type = COALESCE($3, type),
        grade_date = COALESCE($4, grade_date),
        note = $5
       WHERE id = $6
       RETURNING id, student_id, subject_id, grade, type, grade_date, note, created_at`,
      [subjectId || null, grade || null, type || null, date || null, note ?? null, id]
    );
    if (!row) return res.status(404).json({ error: 'Ocena ne obstaja' });
    res.json(mapGrade(row));
  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju ocene' });
  }
});
// Delete grade (admin only)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const count = await execute('DELETE FROM grades WHERE id = $1', [req.params.id]);
    if (count === 0) return res.status(404).json({ error: 'Ocena ne obstaja' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete grade error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju ocene' });
  }
});
export default router;
