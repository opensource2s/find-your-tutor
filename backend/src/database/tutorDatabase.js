const { AppDataSource } = require("../config/db");

const getAllTutors = async (filters = {}) => {
  const params = [];
  const where = ["t.is_active = TRUE", "t.profile_published = TRUE"];
  const add = (value) => { params.push(value); return `$${params.length}`; };

  if (filters.search) {
    const raw = String(filters.search).trim().toLowerCase();
    const aliases = {
      "c": "c programming",
      "c language": "c programming",
      "c programming language": "c programming",
      "cpp": "c++",
      "node": "node.js",
      "dsa": "data structures algorithms",
      "data structures": "data structures algorithms",
    };
    const terms = [...new Set([raw, aliases[raw]].filter(Boolean))];
    const clauses = [];
    for (const term of terms) {
      const p = add(`%${term}%`);
      clauses.push(`(
        LOWER(t.name) LIKE ${p}
        OR LOWER(COALESCE(t.title,'')) LIKE ${p}
        OR LOWER(COALESCE(t.bio,'')) LIKE ${p}
        OR EXISTS (SELECT 1 FROM unnest(COALESCE(t.skills, ARRAY[]::text[])) s WHERE LOWER(s) LIKE ${p})
        OR EXISTS (SELECT 1 FROM unnest(COALESCE(t.languages, ARRAY[]::text[])) l WHERE LOWER(l) LIKE ${p})
        OR EXISTS (
          SELECT 1 FROM tutor_courses stc JOIN courses sc ON sc.id=stc.course_id
          WHERE stc.tutor_id=t.id
            AND (LOWER(sc.name) LIKE ${p} OR LOWER(COALESCE(sc.category,'')) LIKE ${p} OR LOWER(sc.slug) LIKE ${p})
        )
      )`);
    }
    where.push(`(${clauses.join(" OR ")})`);
  }
  if (filters.country) where.push(`LOWER(t.country) = LOWER(${add(filters.country)})`);
  if (filters.tutorType) where.push(`LOWER(t.tutor_type) = LOWER(${add(filters.tutorType)})`);
  if (filters.language) where.push(`EXISTS (SELECT 1 FROM unnest(COALESCE(t.languages, ARRAY[]::text[])) l WHERE LOWER(l)=LOWER(${add(filters.language)}))`);
  if (filters.mode) where.push(`EXISTS (SELECT 1 FROM unnest(COALESCE(t.teaching_modes, ARRAY[]::text[])) m WHERE LOWER(m)=LOWER(${add(filters.mode)}))`);
  if (filters.level) where.push(`EXISTS (SELECT 1 FROM unnest(COALESCE(t.student_levels, ARRAY[]::text[])) l WHERE LOWER(l)=LOWER(${add(filters.level)}))`);
  if (filters.minExperience) where.push(`t.experience_years >= ${add(Number(filters.minExperience))}`);
  if (filters.maxRate) where.push(`t.hourly_rate <= ${add(Number(filters.maxRate))}`);
  if (filters.minRating) where.push(`COALESCE(r.avg_rating,0) >= ${add(Number(filters.minRating))}`);
  if (filters.course) {
    const p = add(filters.course);
    where.push(`EXISTS (
      SELECT 1 FROM tutor_courses tc JOIN courses c ON c.id = tc.course_id
      WHERE tc.tutor_id = t.id AND (LOWER(c.slug) = LOWER(${p}) OR LOWER(c.name) = LOWER(${p}))
    )`);
  }
  if (filters.day !== undefined && filters.day !== "") {
    where.push(`EXISTS (SELECT 1 FROM tutor_availability a WHERE a.tutor_id=t.id AND a.is_active=TRUE AND a.day_of_week=${add(Number(filters.day))})`);
  }
  if (filters.time) {
    where.push(`EXISTS (SELECT 1 FROM tutor_availability a WHERE a.tutor_id=t.id AND a.is_active=TRUE AND a.start_time <= ${add(filters.time)}::time AND a.end_time > ${add(filters.time)}::time)`);
  }

  const orderBy = filters.sort === "price" ? "t.hourly_rate ASC NULLS LAST" :
    filters.sort === "experience" ? "t.experience_years DESC" : "COALESCE(r.avg_rating,0) DESC, r.review_count DESC, t.is_verified DESC, t.created_at DESC";

  const sql = `
    SELECT t.id,t.name,t.title,t.bio,t.tutor_type,t.skills,t.experience_years,t.hourly_rate,
      t.profile_image,t.country,t.city,t.timezone,t.languages,t.teaching_modes,t.is_verified,t.max_students,
      t.response_time_hours,t.trial_lesson_available,t.is_accepting_messages,t.short_intro,t.specialties,t.student_levels,t.lesson_duration_minutes,t.currency,
      COALESCE(r.avg_rating,0)::numeric(3,2) AS avg_rating, COALESCE(r.review_count,0)::int AS review_count,
      COALESCE(cn.connected_students,0)::int AS connected_students,
      COALESCE(cs.course_names, ARRAY[]::text[]) AS courses
    FROM tutors t
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(rating)::numeric,2) avg_rating, COUNT(*) review_count FROM reviews WHERE tutor_id=t.id
    ) r ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) connected_students FROM tutor_connections WHERE tutor_id=t.id AND status='active'
    ) cn ON TRUE
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(c.name ORDER BY c.name) course_names FROM tutor_courses tc JOIN courses c ON c.id=tc.course_id WHERE tc.tutor_id=t.id
    ) cs ON TRUE
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT 100`;
  return AppDataSource.query(sql, params);
};

const getTutorById = async (id) => {
  const rows = await AppDataSource.query(`
    SELECT t.id,t.name,t.title,t.bio,t.tutor_type,t.skills,t.experience_years,t.hourly_rate,t.profile_image,
      t.country,t.city,t.timezone,t.languages,t.teaching_modes,t.max_students,t.is_verified,
      t.education,t.certifications,t.achievements,t.linkedin_url,t.website_url,t.intro_video_url,
      t.response_time_hours,t.trial_lesson_available,t.is_accepting_messages,t.short_intro,t.teaching_philosophy,t.specialties,t.student_levels,t.lesson_duration_minutes,t.currency,t.profile_published,t.profile_published_at,t.created_at,
      COALESCE(r.avg_rating,0)::numeric(3,2) AS avg_rating, COALESCE(r.review_count,0)::int AS review_count,
      COALESCE(cn.connected_students,0)::int AS connected_students,
      COALESCE(ls.total_lessons,0)::int AS total_lessons,
      COALESCE(cs.courses,'[]'::json) AS courses,
      COALESCE(av.availability,'[]'::json) AS availability,
      COALESCE(rv.reviews,'[]'::json) AS reviews
    FROM tutors t
    LEFT JOIN LATERAL (SELECT ROUND(AVG(rating)::numeric,2) avg_rating, COUNT(*) review_count FROM reviews WHERE tutor_id=t.id) r ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*) connected_students FROM tutor_connections WHERE tutor_id=t.id AND status='active') cn ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*) total_lessons FROM bookings WHERE tutor_id=t.id AND status='completed') ls ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object('id',c.id,'name',c.name,'slug',c.slug,'category',c.category,'custom_rate',tc.custom_rate,'proficiency_level',tc.proficiency_level) ORDER BY c.name) courses
      FROM tutor_courses tc JOIN courses c ON c.id=tc.course_id WHERE tc.tutor_id=t.id
    ) cs ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object('id',a.id,'day_of_week',a.day_of_week,'start_time',a.start_time,'end_time',a.end_time,'timezone',a.timezone) ORDER BY a.day_of_week,a.start_time) availability
      FROM tutor_availability a WHERE a.tutor_id=t.id AND a.is_active=TRUE
    ) av ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(x ORDER BY x.created_at DESC) reviews FROM (
        SELECT r.id,r.rating,r.review,r.created_at,s.name student_name,s.profile_image student_image
        FROM reviews r JOIN students s ON s.id=r.student_id WHERE r.tutor_id=t.id ORDER BY r.created_at DESC LIMIT 20
      ) x
    ) rv ON TRUE
    WHERE t.id=$1 AND t.is_active=TRUE AND t.profile_published=TRUE`, [id]);
  return rows[0] || null;
};

const getCourses = async () => AppDataSource.query(`SELECT id,name,slug,category FROM courses WHERE is_active=TRUE ORDER BY category,name`);
const getCountries = async () => AppDataSource.query(`SELECT DISTINCT country FROM tutors WHERE is_active=TRUE AND country IS NOT NULL ORDER BY country`);

module.exports = { getAllTutors, getTutorById, getCourses, getCountries };
