-- Tutorly marketplace + direct messaging upgrade
-- Safe to re-run. Run with: npm run db:upgrade

-- Rich tutor profile fields.
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS achievements TEXT[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS intro_video_url TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS response_time_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS trial_lesson_available BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS is_accepting_messages BOOLEAN NOT NULL DEFAULT TRUE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tutor_response_time_hours') THEN
    ALTER TABLE tutors ADD CONSTRAINT chk_tutor_response_time_hours CHECK (response_time_hours BETWEEN 1 AND 168);
  END IF;
END $$;

-- WhatsApp-style message state:
-- sent      = row exists, delivered_at is NULL
-- delivered = delivered_at is set, read_at is NULL
-- read      = read_at is set (blue double tick in UI)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Keep the legacy is_read flag in sync for older code/data.
UPDATE messages SET read_at = COALESCE(read_at, created_at), delivered_at = COALESCE(delivered_at, created_at)
WHERE is_read = TRUE AND read_at IS NULL;
UPDATE messages SET delivered_at = read_at WHERE read_at IS NOT NULL AND delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_delivery_state
  ON messages(conversation_id, delivered_at, read_at, created_at);

-- Existing tutors remain discoverable and can receive direct messages.
UPDATE tutors
SET response_time_hours = COALESCE(response_time_hours, 24),
    trial_lesson_available = COALESCE(trial_lesson_available, FALSE),
    is_accepting_messages = COALESCE(is_accepting_messages, TRUE)
WHERE is_active = TRUE;
