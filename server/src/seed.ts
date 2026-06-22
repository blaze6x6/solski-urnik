import bcrypt from 'bcryptjs';
import { execute, queryOne } from './db.js';

// Pomožna funkcija za čakanje (v milisekundah)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function seedAdmin(): Promise<void> {
  const maxRetries = 10;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Poskus inicializacije baze (${attempt + 1}/${maxRetries})...`);

      // 1. Najprej preverimo povezavo s preprostim ukazom
      await execute("SELECT 1");

      // 2. Izvedemo migracije in ustvarjanje tabel
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT FALSE");
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS start_time TIME");
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS end_time TIME");
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20) NOT NULL DEFAULT 'none'");
      await execute("UPDATE day_events SET start_time = COALESCE(start_time, '00:00'), end_time = COALESCE(end_time, '23:59'), is_all_day = false WHERE is_all_day = true OR start_time IS NULL OR end_time IS NULL");

      // User email columns
      await execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
      await execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT false");
      // SMTP settings table
      await execute(`CREATE TABLE IF NOT EXISTS smtp_settings (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        host VARCHAR(255) NOT NULL DEFAULT '',
        port INTEGER NOT NULL DEFAULT 587,
        secure BOOLEAN NOT NULL DEFAULT false,
        smtp_user VARCHAR(255) NOT NULL DEFAULT '',
        smtp_password VARCHAR(255) NOT NULL DEFAULT '',
        from_name VARCHAR(255) NOT NULL DEFAULT 'Šolski Urnik',
        from_email VARCHAR(255) NOT NULL DEFAULT '',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);
      await execute("INSERT INTO smtp_settings (id, host) VALUES (1, '') ON CONFLICT (id) DO NOTHING");

      // day_events end_date column
      await execute("ALTER TABLE day_events ADD COLUMN IF NOT EXISTS end_date DATE");
      // calendar_events table
      await execute(`CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
        event_date DATE NOT NULL,
        end_date DATE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        recurrence VARCHAR(20) NOT NULL DEFAULT 'none',
        note VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);
      await execute("CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date)");

      // grades table
      await execute(`CREATE TABLE IF NOT EXISTS grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
        type VARCHAR(20) NOT NULL CHECK (type IN ('written', 'oral')),
        grade_date DATE NOT NULL,
        note VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);
      await execute("CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id)");
      await execute("CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(student_id, subject_id)");
      // grades table
      await execute(`CREATE TABLE IF NOT EXISTS grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
        type VARCHAR(20) NOT NULL CHECK (type IN ('written', 'oral')),
        grade_date DATE NOT NULL,
        note VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);
      await execute("CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id)");
      await execute("CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(student_id, subject_id)");

      // notifications table
      await execute(`CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'info',
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);
      await execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC)");

      // bus_rides table
      await execute(`CREATE TABLE IF NOT EXISTS bus_rides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        direction VARCHAR(20) NOT NULL CHECK (direction IN ('to_school', 'from_school')),
        departure_time TIME NOT NULL,
        arrival_time TIME NOT NULL,
        label VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);

      
      await execute(`CREATE TABLE IF NOT EXISTS afternoon_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
        name VARCHAR(200) NOT NULL,
        color VARCHAR(20) NOT NULL DEFAULT '#10B981',
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`);

      // 3. Logika za Admin uporabnika
      const admin = await queryOne<{ id: string; password_hash: string }>(
        "SELECT id, password_hash FROM users WHERE username = 'admin'"
      );

      if (!admin) {
        const hash = await bcrypt.hash('admin123', 10);
        await queryOne(
          "INSERT INTO users (username, password_hash, full_name, role) VALUES ('admin', $1, 'Administrator', 'admin') RETURNING id",
          [hash]
        );
        console.log('✅ Admin user created (admin / admin123)');
      } else {
        const isBcrypt = admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$');
        if (!isBcrypt) {
          const hash = await bcrypt.hash('admin123', 10);
          await queryOne(
            "UPDATE users SET password_hash = $1 WHERE username = 'admin' RETURNING id",
            [hash]
          );
          console.log('✅ Admin password rehashed');
        }
      }

      console.log('✅ Seeding completed successfully.');
      return; // Uspešno zaključeno, izstopimo iz funkcije

    } catch (error: any) {
      attempt++;
      console.warn(`⚠️ Baza še ni pripravljena: ${error.message}. Čakam 3 sekunde...`);
      
      if (attempt >= maxRetries) {
        console.error('❌ Napaka pri seeding-u po več poskusih. Preverite povezavo z bazo.');
        throw error;
      }
      
      await wait(3000); // Počakaj 3 sekunde pred naslednjim poskusom
    }
  }
}
