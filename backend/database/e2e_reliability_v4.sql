-- Tutorly E2E reliability v4

-- Make already-created test tutors visible when they have the minimum signup data.
UPDATE tutors
SET profile_published = TRUE,
    profile_published_at = COALESCE(profile_published_at, NOW()),
    is_accepting_messages = COALESCE(is_accepting_messages, TRUE),
    student_levels = CASE
      WHEN student_levels IS NULL OR cardinality(student_levels)=0
      THEN ARRAY['Beginner','Intermediate']::text[]
      ELSE student_levels
    END,
    lesson_duration_minutes = CASE
      WHEN lesson_duration_minutes IS NULL OR cardinality(lesson_duration_minutes)=0
      THEN ARRAY[60]::int[]
      ELSE lesson_duration_minutes
    END,
    updated_at = NOW()
WHERE is_active=TRUE
  AND COALESCE(title,'') <> ''
  AND hourly_rate IS NOT NULL
  AND profile_published=FALSE;

-- Normalize common signup skills into tutor_courses, so the Course dropdown works.
INSERT INTO tutor_courses(tutor_id, course_id, proficiency_level)
SELECT DISTINCT t.id, c.id, 'expert'
FROM tutors t
CROSS JOIN LATERAL unnest(COALESCE(t.skills, ARRAY[]::text[])) AS skill(value)
JOIN courses c ON
     LOWER(c.name)=LOWER(skill.value)
  OR LOWER(c.slug)=LOWER(
       CASE LOWER(skill.value)
         WHEN 'c' THEN 'c-programming'
         WHEN 'c language' THEN 'c-programming'
         WHEN 'c programming language' THEN 'c-programming'
         WHEN 'c programming' THEN 'c-programming'
         WHEN 'c++' THEN 'cpp'
         WHEN 'cpp' THEN 'cpp'
         WHEN 'dsa' THEN 'data-structures-algorithms'
         WHEN 'data structures' THEN 'data-structures-algorithms'
         WHEN 'data structures and algorithms' THEN 'data-structures-algorithms'
         WHEN 'data structures & algorithms' THEN 'data-structures-algorithms'
         WHEN 'reactjs' THEN 'react'
         WHEN 'react.js' THEN 'react'
         WHEN 'node' THEN 'nodejs'
         WHEN 'node.js' THEN 'nodejs'
         WHEN 'nodejs' THEN 'nodejs'
         ELSE LOWER(regexp_replace(skill.value, '[^a-zA-Z0-9+]+', '-', 'g'))
       END
     )
WHERE t.is_active=TRUE
ON CONFLICT(tutor_id,course_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tutor_connections_student_active
  ON tutor_connections(student_id, status, connected_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_tutor_recent
  ON conversations(tutor_id, last_message_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_student_recent
  ON conversations(student_id, last_message_at DESC, created_at DESC);
