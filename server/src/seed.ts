import bcrypt from 'bcryptjs';
import { execute, queryOne } from './db.js';

// Pomožna funkcija za čakanje (v milisekundah)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function seedAdmin(): Promise<void> {
  const maxRetries = 10;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Poskus povezave z bazo (${attempt + 1}/${maxRetries})...`);

      // 1. Najprej preverimo, če je baza sploh odzivna (preprosta poizvedba)
      await execute("SELECT 1");

      // 2. Izvedemo migracije
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT FALSE");
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS start_time TIME");
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS end_time TIME");
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) NOT NULL DEFAULT 'none'");
      await execute("UPDATE day_events SET start_time = COALESCE(start_time, '00:00'), end_time = COALESCE(end_time, '23:59'), is_all_day = false WHERE is_all_day = true OR start_time IS NULL OR end_time IS NULL");

      // 3. Preverimo obstoj admina
      const admin = await queryOne<{ id: string; password_hash: string }>(
        "SELECT id, password_hash FROM users WHERE username = 'admin'"
      );

      if (!admin) {
        const hash = await bcrypt.hash('admin123', 10);
        await execute(
          "INSERT INTO users (username, password_hash, full_name, role) VALUES ('admin', $1, 'Administrator', 'admin')",
          [hash]
        );
        console.log('✅ Admin user created (admin / admin123)');
      } else {
        const isBcrypt = admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$');
        if (!isBcrypt) {
          const hash = await bcrypt.hash('admin123', 10);
          await execute(
            "UPDATE users SET password_hash = $1 WHERE username = 'admin'",
            [hash]
          );
          console.log('✅ Admin password rehashed');
        } else {
          console.log('✅ Admin user already exists');
        }
      }

      console.log('✅ Seeding completed successfully.');
      return; // Vse je v redu, zaključimo funkcijo

    } catch (error: any) {
      attempt++;
      console.warn(`⚠️ Baza še ni pripravljena: ${error.message}. Čakam 3 sekunde...`);
      
      if (attempt >= maxRetries) {
        console.error('❌ Napaka pri seeding-u: Baza ni postala dosegljiva.');
        throw error; // Če po 10 poskusih ne deluje, vržemo napako
      }
      
      await wait(3000); // Počakaj 3 sekunde pred naslednjim poskusom
    }
  }
}
