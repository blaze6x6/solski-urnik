import { Router } from 'express';
import { execute } from '../db.js';
import { authMiddleware, adminMiddleware } from '../auth.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Link parent to child
router.post('/link', async (req, res) => {
  try {
    const { parentId, childId } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({ error: 'ID starša in otroka sta obvezna' });
    }

    await execute(
      'INSERT INTO parent_children (parent_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [parentId, childId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Link parent error:', error);
    res.status(500).json({ error: 'Napaka pri povezovanju' });
  }
});

// Unlink parent from child
router.post('/unlink', async (req, res) => {
  try {
    const { parentId, childId } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({ error: 'ID starša in otroka sta obvezna' });
    }

    await execute(
      'DELETE FROM parent_children WHERE parent_id = $1 AND student_id = $2',
      [parentId, childId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Unlink parent error:', error);
    res.status(500).json({ error: 'Napaka pri odvezovanju' });
  }
});

export default router;
