import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../db.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await query<{
      id: string;
      username: string;
      full_name: string;
      role: 'admin' | 'parent';
    }>('SELECT id, username, full_name, role FROM users ORDER BY full_name');

    // Get children for each user
    const result = await Promise.all(
      users.map(async (user) => {
        const children = await query<{ student_id: string }>(
          'SELECT student_id FROM parent_children WHERE parent_id = $1',
          [user.id]
        );
        return {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          childrenIds: children.map(c => c.student_id),
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnikov' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Vsa polja so obvezna' });
    }

    // Check if username exists
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Uporabniško ime že obstaja' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await queryOne<{ id: string; username: string; full_name: string; role: string }>(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
      [username, passwordHash, fullName, role]
    );

    res.status(201).json({
      id: user!.id,
      username: user!.username,
      fullName: user!.full_name,
      role: user!.role,
      childrenIds: [],
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Napaka pri ustvarjanju uporabnika' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, role } = req.body;

    // Check if username is taken by another user
    if (username) {
      const existing = await queryOne('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
      if (existing) {
        return res.status(400).json({ error: 'Uporabniško ime že obstaja' });
      }
    }

    let updateQuery = 'UPDATE users SET ';
    const params: any[] = [];
    const updates: string[] = [];

    if (username) {
      params.push(username);
      updates.push(`username = $${params.length}`);
    }
    if (fullName) {
      params.push(fullName);
      updates.push(`full_name = $${params.length}`);
    }
    if (role) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      updates.push(`password_hash = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Ni sprememb' });
    }

    params.push(id);
    updateQuery += updates.join(', ') + `, updated_at = NOW() WHERE id = $${params.length} RETURNING id, username, full_name, role`;

    const user = await queryOne<{ id: string; username: string; full_name: string; role: string }>(
      updateQuery,
      params
    );

    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ne obstaja' });
    }

    const children = await query<{ student_id: string }>(
      'SELECT student_id FROM parent_children WHERE parent_id = $1',
      [id]
    );

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      childrenIds: children.map(c => c.student_id),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Napaka pri posodabljanju uporabnika' });
  }
});

// Delete user
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'Ne morete izbrisati svojega računa' });
    }

    const count = await execute('DELETE FROM users WHERE id = $1', [id]);
    
    if (count === 0) {
      return res.status(404).json({ error: 'Uporabnik ne obstaja' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Napaka pri brisanju uporabnika' });
  }
});

export default router;
