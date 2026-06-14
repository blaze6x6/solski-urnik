import bcrypt from 'bcryptjs';
import { execute, queryOne } from './db.js';

export async function seedAdmin(): Promise<void> {
  try {
    // Lightweight migrations for existing installations.
    await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT FALSE");
    await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS start_time TIME");
    await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS end_time TIME");
    await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) NOT NULL DEFAULT 'none'");
    await execute("UPDATE day_events SET start_time = COALESCE(start_time, '00:00'), end_time = COALESCE(end_time, '23:59'), is_all_day = false WHERE is_all_day = true OR start_time IS NULL OR end_time IS NULL");

    // Check if admin exists
    const admin = await queryOne<{ id: string; password_hash: string }>(
      "SELECT id, password_hash FROM users WHERE username = 'admin'"
    );

    if (!admin) {
      // Create admin user
      const hash = await bcrypt.hash('admin123', 10);
      await queryOne(
        "INSERT INTO users (username, password_hash, full_name, role) VALUES ('admin', $1, 'Administrator', 'admin') RETURNING id",
        [hash]
      );
      console.log('✅ Admin user created (admin / admin123)');
    } else {
      // Check if password is a valid bcrypt hash — if not, rehash it
      const isBcrypt = admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$');
      if (!isBcrypt) {
        const hash = await bcrypt.hash('admin123', 10);
        await queryOne(
          "UPDATE users SET password_hash = $1 WHERE username = 'admin' RETURNING id",
          [hash]
        );
        console.log('✅ Admin password rehashed');
      } else {
        console.log('✅ Admin user exists');
      }
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}
