-- Šolski Urnik - PostgreSQL Database Schema
-- This schema is initialized when the database container starts for the first time.

-- Enable pgcrypto for password hashing (optional, we use bcrypt in Node.js)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (admins and parents)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'parent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- School classes
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 9),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(10) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Periods (school hours) - sorted by start_time
CREATE TABLE IF NOT EXISTS periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule entries - references period by ID
CREATE TABLE IF NOT EXISTS schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
    period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    room VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, day_of_week, period_id)
);

-- Day events (time-specific, optionally recurring)
CREATE TABLE IF NOT EXISTS day_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    class_ids UUID[] DEFAULT '{}',
    is_all_day BOOLEAN DEFAULT FALSE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parent-child relationships
CREATE TABLE IF NOT EXISTS parent_children (
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, student_id)
);

-- Student notes (visible to linked parents)
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    note_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Afternoon activities per class (weekly recurring)
CREATE TABLE IF NOT EXISTS afternoon_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
    name VARCHAR(200) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#10B981',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_afternoon_class ON afternoon_schedule(class_id);

-- Bus schedule (same every day)
CREATE TABLE IF NOT EXISTS bus_rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('to_school', 'from_school')),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- School year configuration
CREATE TABLE IF NOT EXISTS school_year (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_class_day ON schedule_entries(class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_student ON parent_children(student_id);
CREATE INDEX IF NOT EXISTS idx_day_events_date ON day_events(event_date);
CREATE INDEX IF NOT EXISTS idx_periods_time ON periods(start_time);
CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_date ON student_notes(note_date);

-- Insert default admin user
-- Password will be properly hashed by the API server on first startup (seed.ts)
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'NEEDS_REHASH', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default school year
INSERT INTO school_year (id, start_date, end_date)
VALUES (1, '2025-09-01', '2026-06-24')
ON CONFLICT (id) DO NOTHING;

-- Insert default periods (school hours) - sorted by start_time automatically
INSERT INTO periods (name, start_time, end_time, is_break) VALUES
    ('Predura', '07:30', '08:15', FALSE),
    ('1. ura', '08:20', '09:05', FALSE),
    ('2. ura', '09:10', '09:55', FALSE),
    ('Odmor', '09:55', '10:15', TRUE),
    ('3. ura', '10:15', '11:00', FALSE),
    ('4. ura', '11:05', '11:50', FALSE),
    ('5. ura', '11:55', '12:40', FALSE),
    ('6. ura', '12:45', '13:30', FALSE),
    ('7. ura', '13:35', '14:20', FALSE)
ON CONFLICT DO NOTHING;

-- Insert default subjects
INSERT INTO subjects (name, short_name, color) VALUES
    ('Matematika', 'MAT', '#3B82F6'),
    ('Slovenščina', 'SLO', '#EF4444'),
    ('Angleščina', 'ANG', '#8B5CF6'),
    ('Naravoslovje', 'NAR', '#10B981'),
    ('Družba', 'DRU', '#F59E0B'),
    ('Šport', 'ŠPO', '#EC4899'),
    ('Likovna umetnost', 'LUM', '#F97316'),
    ('Glasbena umetnost', 'GUM', '#06B6D4'),
    ('Tehnika in tehnologija', 'TIT', '#6366F1'),
    ('Gospodinjstvo', 'GOS', '#84CC16')
ON CONFLICT DO NOTHING;

-- Insert default classes
INSERT INTO classes (name, grade) VALUES
    ('1.a', 1),
    ('2.a', 2),
    ('3.a', 3),
    ('4.a', 4),
    ('5.a', 5)
ON CONFLICT DO NOTHING;
