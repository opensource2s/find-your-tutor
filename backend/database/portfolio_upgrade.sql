-- Tutorly portfolio upgrade
-- Run once against full_stack_db. Safe to re-run for CREATE/ALTER statements.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE students ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS country VARCHAR(80);
ALTER TABLE students ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE students ADD COLUMN IF NOT EXISTS preferred_languages TEXT[];
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_auth0_id ON students(auth0_id) WHERE auth0_id IS NOT NULL;

ALTER TABLE tutors ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255);
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS country VARCHAR(80);
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS city VARCHAR(80);
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS teaching_modes TEXT[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS max_students INTEGER NOT NULL DEFAULT 50;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutors_auth0_id ON tutors(auth0_id) WHERE auth0_id IS NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tutors_max_students') THEN
    ALTER TABLE tutors ADD CONSTRAINT chk_tutors_max_students CHECK (max_students BETWEEN 1 AND 50);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) NOT NULL UNIQUE,
  category VARCHAR(80),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tutor_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(30) NOT NULL DEFAULT 'expert',
  custom_rate NUMERIC(10,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tutor_id, course_id),
  CHECK (custom_rate IS NULL OR custom_rate >= 0)
);

CREATE TABLE IF NOT EXISTS tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_availability_tutor_day ON tutor_availability(tutor_id, day_of_week, start_time);

CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  message TEXT,
  preferred_day INTEGER CHECK (preferred_day IS NULL OR preferred_day BETWEEN 0 AND 6),
  preferred_time TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_connection_request
  ON connection_requests(student_id, tutor_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_connection_requests_tutor_status ON connection_requests(tutor_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS tutor_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  request_id UUID REFERENCES connection_requests(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  UNIQUE(student_id, tutor_id)
);
CREATE INDEX IF NOT EXISTS idx_tutor_connections_tutor_status ON tutor_connections(tutor_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed','cancelled','declined')),
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (scheduled_end > scheduled_start)
);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_time ON bookings(tutor_id, scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_bookings_student_time ON bookings(student_id, scheduled_start DESC);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_tutor_bookings') THEN
    ALTER TABLE bookings ADD CONSTRAINT no_overlapping_tutor_bookings
      EXCLUDE USING gist (tutor_id WITH =, tstzrange(scheduled_start, scheduled_end, '[)') WITH &&)
      WHERE (status IN ('requested','confirmed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, tutor_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, tutor_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('student','tutor')),
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('student','tutor')),
  recipient_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id, is_read, created_at DESC);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_booking') THEN
    ALTER TABLE reviews ADD CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_reviews_tutor_created ON reviews(tutor_id, created_at DESC);

-- Seed portfolio catalog.
INSERT INTO courses(name, slug, category, description) VALUES
('C Programming','c-programming','Programming','C fundamentals, pointers, memory and problem solving'),
('C++','cpp','Programming','Modern C++ and object-oriented programming'),
('Data Structures & Algorithms','data-structures-algorithms','Computer Science','DSA for interviews and competitive programming'),
('JavaScript','javascript','Web Development','JavaScript from fundamentals to advanced concepts'),
('React','react','Web Development','Modern React, hooks and frontend architecture'),
('Node.js','nodejs','Web Development','Backend APIs, performance and scalable Node.js'),
('Python','python','Programming','Python fundamentals and application development'),
('System Design','system-design','Computer Science','High-level design, scalability and distributed systems'),
('Interview Preparation','interview-preparation','Career','Technical interview strategy and mock interviews'),
('Communication Skills','communication-skills','Professional Skills','Public speaking and professional communication')
ON CONFLICT (slug) DO NOTHING;

-- Enrich existing tutor records for the search demo without overwriting user values.
UPDATE tutors SET country = COALESCE(country, 'India'), timezone = COALESCE(timezone, 'Asia/Kolkata'),
  languages = COALESCE(languages, ARRAY['English']), teaching_modes = COALESCE(teaching_modes, ARRAY['online'])
WHERE country IS NULL OR languages IS NULL OR teaching_modes IS NULL;

-- Match the existing skills array into normalized tutor_courses.
INSERT INTO tutor_courses(tutor_id, course_id, proficiency_level)
SELECT DISTINCT t.id, c.id, 'expert'
FROM tutors t
JOIN courses c ON EXISTS (
  SELECT 1 FROM unnest(COALESCE(t.skills, ARRAY[]::text[])) s
  WHERE lower(s) = lower(c.name)
     OR (lower(s) = 'dsa' AND c.slug = 'data-structures-algorithms')
)
ON CONFLICT (tutor_id, course_id) DO NOTHING;

-- Give existing tutors weekday/evening availability for the UI demo.
INSERT INTO tutor_availability(tutor_id, day_of_week, start_time, end_time, timezone)
SELECT t.id, d.day_of_week, d.start_time, d.end_time, COALESCE(t.timezone, 'Asia/Kolkata')
FROM tutors t
CROSS JOIN (VALUES (1, TIME '18:00', TIME '21:00'), (3, TIME '18:00', TIME '21:00'), (6, TIME '10:00', TIME '14:00')) AS d(day_of_week,start_time,end_time)
WHERE NOT EXISTS (SELECT 1 FROM tutor_availability a WHERE a.tutor_id = t.id);
