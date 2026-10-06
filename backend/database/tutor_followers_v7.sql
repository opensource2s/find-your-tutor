CREATE TABLE IF NOT EXISTS tutor_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tutor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_followers_tutor ON tutor_followers(tutor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_followers_student ON tutor_followers(student_id, created_at DESC);

-- Prevent following hidden/inactive tutor profiles.
CREATE OR REPLACE FUNCTION tutorly_validate_follow()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tutors
    WHERE id=NEW.tutor_id AND is_active=TRUE AND profile_published=TRUE
  ) THEN
    RAISE EXCEPTION 'Tutor profile is not available to follow';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM students WHERE id=NEW.student_id AND is_active=TRUE) THEN
    RAISE EXCEPTION 'Student account is not active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_tutor_follow ON tutor_followers;
CREATE TRIGGER trg_validate_tutor_follow
BEFORE INSERT OR UPDATE ON tutor_followers
FOR EACH ROW EXECUTE FUNCTION tutorly_validate_follow();
