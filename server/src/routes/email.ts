import { Router } from 'express';
import { queryOne } from '../db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth.js';
import { sendTestEmail } from '../mailer.js';
const router = Router();
router.use(authMiddleware);
// Get SMTP settings (admin only)
router.get('/smtp', adminMiddleware, async (_req, res) => {
  try {
    const row = await queryOne<{
      host: string;
      port: number;
      secure: boolean;
      smtp_user: string;
      smtp_password: string;
      from_name: string;
      from_email: string;
    }>('SELECT host, port, secure, smtp_user, smtp_password, from_name, from_email FROM smtp_settings WHERE id = 1');
    if (!row) {
      return res.json({ host: '', port: 587, secure: false, user: '', password: '', fromName: 'Šolski Urnik', fromEmail: '' });
    }
    res.json({
      host: row.host,
      port: row.port,
      secure: row.secure,
      user: row.smtp_user,
      password: row.smtp_password,
      fromName: row.from_name,
      fromEmail: row.from_email,
    });
  } catch (error) {
    console.error('Get SMTP error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju SMTP nastavitev' });
  }
});
// Update SMTP settings (admin only)
router.put('/smtp', adminMiddleware, async (req, res) => {
  try {
    const { host, port, secure, user, password, fromName, fromEmail } = req.body;
    await queryOne(
      `INSERT INTO smtp_settings (id, host, port, secure, smtp_user, smtp_password, from_name, from_email, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         host = $1, port = $2, secure = $3, smtp_user = $4, smtp_password = $5,
         from_name = $6, from_email = $7, updated_at = NOW()
       RETURNING id`,
      [host || '', port || 587, secure || false, user || '', password || '', fromName || 'Šolski Urnik', fromEmail || '']
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update SMTP error:', error);
    res.status(500).json({ error: 'Napaka pri shranjevanju SMTP nastavitev' });
  }
});
// Send test email (admin only)
router.post('/test', adminMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email je obvezen' });
    const success = await sendTestEmail(email);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'SMTP ni nastavljen ali pošiljanje ni uspelo' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Napaka pri pošiljanju testnega emaila' });
  }
});
// Get my notification preferences
router.get('/preferences', async (req: AuthRequest, res) => {
  try {
    const row = await queryOne<{ email: string | null; email_notifications: boolean }>(
      'SELECT email, email_notifications FROM users WHERE id = $1',
      [req.user!.userId]
    );
    res.json({
      email: row?.email || '',
      emailNotifications: row?.email_notifications || false,
    });
  } catch (error) {
    console.error('Get prefs error:', error);
    res.status(500).json({ error: 'Napaka' });
  }
});
// Update my notification preferences
router.put('/preferences', async (req: AuthRequest, res) => {
  try {
    const { email, emailNotifications } = req.body;
    await queryOne(
      'UPDATE users SET email = $1, email_notifications = $2, updated_at = NOW() WHERE id = $3 RETURNING id',
      [email || null, emailNotifications || false, req.user!.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update prefs error:', error);
    res.status(500).json({ error: 'Napaka pri shranjevanju nastavitev' });
  }
});
export default router;
