-- Šolski Urnik - MariaDB Database Schema
-- Alternative to PostgreSQL. Uncomment the MariaDB service in docker-compose.yml to use.

-- Users table (admins and parents)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('admin', 'parent') NOT NULL DEFAULT 'parent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- School classes
CREATE TABLE IF NOT EXISTS classes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) NOT NULL,
    grade INT NOT NULL CHECK (grade BETWEEN 1 AND 9),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Students
CREATE TABLE IF NOT EXISTS students (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    class_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(10) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Schedule entries
CREATE TABLE IF NOT EXISTS schedule_entries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    class_id CHAR(36) NOT NULL,
    subject_id CHAR(36) NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
    period INT NOT NULL CHECK (period BETWEEN 1 AND 8),
    room VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_class_day_period (class_id, day_of_week, period),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parent-child relationships
CREATE TABLE IF NOT EXISTS parent_children (
    parent_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    PRIMARY KEY (parent_id, student_id),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- School year configuration
CREATE TABLE IF NOT EXISTS school_year (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_schedule_class ON schedule_entries(class_id);
CREATE INDEX idx_schedule_class_day ON schedule_entries(class_id, day_of_week);
CREATE INDEX idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX idx_parent_children_student ON parent_children(student_id);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'admin123', 'Administrator', 'admin');

-- Insert default school year
INSERT IGNORE INTO school_year (id, start_date, end_date)
VALUES (1, '2025-09-01', '2026-06-24');

-- Insert default subjects
INSERT IGNORE INTO subjects (name, short_name, color) VALUES
    ('Matematika', 'MAT', '#3B82F6'),
    ('Slovenščina', 'SLO', '#EF4444'),
    ('Angleščina', 'ANG', '#8B5CF6'),
    ('Naravoslovje', 'NAR', '#10B981'),
    ('Družba', 'DRU', '#F59E0B'),
    ('Šport', 'ŠPO', '#EC4899'),
    ('Likovna umetnost', 'LUM', '#F97316'),
    ('Glasbena umetnost', 'GUM', '#06B6D4'),
    ('Tehnika in tehnologija', 'TIT', '#6366F1'),
    ('Gospodinjstvo', 'GOS', '#84CC16');

-- Insert default classes
INSERT IGNORE INTO classes (name, grade) VALUES
    ('1.a', 1),
    ('2.a', 2),
    ('3.a', 3),
    ('4.a', 4),
    ('5.a', 5);
