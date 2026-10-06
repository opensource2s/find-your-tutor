-- Tutorly end-to-end workflow v3
-- Safe to re-run with npm run db:upgrade

-- Student profile data used for richer matching and dashboards.
ALTER TABLE students ADD COLUMN IF NOT EXISTS learning_goals TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_level VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS interests TEXT[];

-- Optional tutor verification data. Nothing below is mandatory during development/testing.
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS id_proof_type VARCHAR(50);
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS id_proof_url TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS qualification_proof_url TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted';
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_tutor_verification_status') THEN
    ALTER TABLE tutors ADD CONSTRAINT chk_tutor_verification_status
      CHECK (verification_status IN ('not_submitted','pending','verified','rejected'));
  END IF;
END $$;

-- Audit timestamps for the student/tutor connection lifecycle.
ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE tutor_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_connection_student_tutor_status
  ON tutor_connections(student_id,tutor_id,status);
CREATE INDEX IF NOT EXISTS idx_requests_student_status
  ON connection_requests(student_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_tutor_status_v3
  ON connection_requests(tutor_id,status,created_at DESC);

-- Reviews are intentionally a separate table. Prevent duplicate reviews for one booking.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_booking_once
  ON reviews(booking_id) WHERE booking_id IS NOT NULL;
