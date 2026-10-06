const { AppDataSource } = require("../config/db");
const Student = require("../entities/Student");
const Tutor = require("../entities/Tutor");

const repository = role => AppDataSource.getRepository(role === "student" ? Student : Tutor);

const findProfile = (role, sub) =>
  repository(role).findOne({ where: { auth0_id: sub } });

const createProfile = (role, values) => {
  const repo = repository(role);
  return repo.save(repo.create(values));
};

const findProfileByEmail = (role, email) =>
  repository(role).findOne({ where: { email: String(email || "").trim().toLowerCase() } });

const findAnyProfileByEmail = async (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  return (await AppDataSource.getRepository(Student).findOne({ where: { email: normalized } })) ||
    (await AppDataSource.getRepository(Tutor).findOne({ where: { email: normalized } }));
};

const syncTutorCoursesFromSkills = async (tutorId, skills = []) => {
  const clean = Array.isArray(skills)
    ? [...new Set(skills.map(x => String(x).trim().toLowerCase()).filter(Boolean))]
    : [];

  if (!clean.length) return [];

  const aliases = {
    "c": "c-programming",
    "c language": "c-programming",
    "c programming language": "c-programming",
    "c programming": "c-programming",
    "cpp": "cpp",
    "c++": "cpp",
    "dsa": "data-structures-algorithms",
    "data structures": "data-structures-algorithms",
    "data structures and algorithms": "data-structures-algorithms",
    "data structures & algorithms": "data-structures-algorithms",
    "javascript": "javascript",
    "react": "react",
    "reactjs": "react",
    "react.js": "react",
    "node": "nodejs",
    "nodejs": "nodejs",
    "node.js": "nodejs",
    "python": "python",
    "system design": "system-design",
    "interview preparation": "interview-preparation",
    "communication skills": "communication-skills"
  };

  for (const skill of clean) {
    const slug = aliases[skill] || skill.replace(/[^a-z0-9+]+/g, "-").replace(/^-|-$/g, "");

    await AppDataSource.query(`
      INSERT INTO tutor_courses(tutor_id, course_id, proficiency_level)
      SELECT $1, c.id, 'expert'
      FROM courses c
      WHERE LOWER(c.slug)=LOWER($2) OR LOWER(c.name)=LOWER($3)
      ON CONFLICT(tutor_id, course_id) DO NOTHING
    `, [tutorId, slug, skill]);
  }

  return AppDataSource.query(`
    SELECT c.id,c.name,c.slug,c.category
    FROM tutor_courses tc
    JOIN courses c ON c.id=tc.course_id
    WHERE tc.tutor_id=$1
    ORDER BY c.name
  `, [tutorId]);
};

module.exports = {
  findProfile,
  createProfile,
  findProfileByEmail,
  findAnyProfileByEmail,
  syncTutorCoursesFromSkills
};
