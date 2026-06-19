import { Router } from 'express';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
const router = Router();
router.use(authMiddleware);
// Get my notifications (latest 50)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const rows = await query<{
      id: string;
      user_id: string;
      message: string;
      type: string;
      read: boolean;
      created_at: Date;
    }>(
      `SELECT id, user_id, message, type, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.userId]
    );
    res.json(rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      message: r.message,
      type: r.type,
      read: r.read,
      createdAt: r.created_at.toISOString(),
    })));
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju obvestil' });
  }
});
// Get unread count
router.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const row = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user!.userId]
    );
    res.json({ count: parseInt(row?.count || '0') });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Napaka' });
  }
});
// Mark one as read
router.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    await execute(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Napaka' });
  }
});
// Mark all as read
router.put('/read-all', async (req: AuthRequest, res) => {
  try {
    await execute(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [req.user!.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Napaka' });
  }
});
// Delete one
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await execute(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Napaka' });
  }
});
export default router;
