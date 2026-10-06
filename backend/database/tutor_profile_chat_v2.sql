-- Tutorly rich tutor profile + production chat v2
-- Safe to re-run. Applied by: npm run db:upgrade

ALTER TABLE tutors ADD COLUMN IF NOT EXISTS short_intro VARCHAR(280);
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS teaching_philosophy TEXT;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS student_levels TEXT[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS lesson_duration_minutes INTEGER[];
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'INR';
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS profile_published BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS profile_published_at TIMESTAMPTZ;
ALTER TABLE tutors ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_tutor_short_intro') THEN
    ALTER TABLE tutors ADD CONSTRAINT chk_tutor_short_intro CHECK (short_intro IS NULL OR char_length(short_intro) <= 280);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_tutor_lesson_duration_minutes') THEN
    ALTER TABLE tutors ADD CONSTRAINT chk_tutor_lesson_duration_minutes CHECK (
      lesson_duration_minutes IS NULL OR lesson_duration_minutes <@ ARRAY[30,45,60,90,120]::integer[]
    );
  END IF;
END $$;

-- Preserve discoverability for tutors that existed before publication controls were introduced.
UPDATE tutors
SET profile_published=TRUE,
    profile_published_at=COALESCE(profile_published_at, NOW())
WHERE is_active=TRUE
  AND profile_published=FALSE
  AND (COALESCE(title,'') <> '' OR COALESCE(bio,'') <> '' OR hourly_rate IS NOT NULL);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS student_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tutor_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS student_muted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tutor_muted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tutors_marketplace_profile ON tutors(profile_published,is_active,is_verified,created_at DESC);
