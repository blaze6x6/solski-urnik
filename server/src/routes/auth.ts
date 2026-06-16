import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db.js';
import { generateToken, authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Uporabniško ime in geslo sta obvezna' });
    }

    const user = await queryOne<{
      id: string;
      username: string;
      password_hash: string;
      full_name: string;
      role: 'admin' | 'parent';
    }>('SELECT id, username, password_hash, full_name, role FROM users WHERE username = $1', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Napačno uporabniško ime ali geslo' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Napačno uporabniško ime ali geslo' });
    }

    // Get children IDs for this user
    const children = await query<{ student_id: string }>(
      'SELECT student_id FROM parent_children WHERE parent_id = $1',
      [user.id]
    );

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        childrenIds: children.map(c => c.student_id),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Napaka pri prijavi' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await queryOne<{
      id: string;
      username: string;
      full_name: string;
      role: 'admin' | 'parent';
    }>('SELECT id, username, full_name, role FROM users WHERE id = $1', [req.user!.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ne obstaja' });
    }

    const children = await query<{ student_id: string }>(
      'SELECT student_id FROM parent_children WHERE parent_id = $1',
      [user.id]
    );

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      childrenIds: children.map(c => c.student_id),
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
  }
});

export default router;
