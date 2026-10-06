CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tutor_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  course_id UUID NULL REFERENCES courses(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  post_type VARCHAR(30) NOT NULL DEFAULT 'teaching_tip'
    CHECK (post_type IN ('teaching_tip','lesson_note','question','course_update','availability','announcement')),
  media_type VARCHAR(20) NOT NULL DEFAULT 'none'
    CHECK (media_type IN ('none','image','video','link')),
  media_url TEXT NULL,
  link_url TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','archived')),
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  published_at TIMESTAMPTZ NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES tutor_posts(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student','tutor')),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_type, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES tutor_posts(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student','tutor')),
  user_id UUID NOT NULL,
  parent_comment_id UUID NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  content VARCHAR(1000) NOT NULL,
  edited_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES tutor_posts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_posts_feed
  ON tutor_posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_posts_tutor
  ON tutor_posts(tutor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_posts_course
  ON tutor_posts(course_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON post_likes(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_comments_post
  ON post_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_post_saves_student
  ON post_saves(student_id, created_at DESC);

-- Postgres cannot enforce a polymorphic FK for post_likes/post_comments user_id.
-- These triggers ensure the referenced student/tutor exists.
CREATE OR REPLACE FUNCTION tutorly_validate_social_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'student' THEN
    IF NOT EXISTS (SELECT 1 FROM students WHERE id = NEW.user_id AND is_active = TRUE) THEN
      RAISE EXCEPTION 'Student account not found';
    END IF;
  ELSIF NEW.user_type = 'tutor' THEN
    IF NOT EXISTS (SELECT 1 FROM tutors WHERE id = NEW.user_id AND is_active = TRUE) THEN
      RAISE EXCEPTION 'Tutor account not found';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_post_like_user ON post_likes;
CREATE TRIGGER trg_validate_post_like_user
BEFORE INSERT OR UPDATE ON post_likes
FOR EACH ROW EXECUTE FUNCTION tutorly_validate_social_user();

DROP TRIGGER IF EXISTS trg_validate_post_comment_user ON post_comments;
CREATE TRIGGER trg_validate_post_comment_user
BEFORE INSERT OR UPDATE ON post_comments
FOR EACH ROW EXECUTE FUNCTION tutorly_validate_social_user();
