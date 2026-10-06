const db = require("../database/tutorPortalDatabase");

const appError = (message, status = 400) => Object.assign(new Error(message), { status });
const allowedDurations = new Set([30,45,60,90,120]);
const trimArray = (value) => Array.isArray(value) ? [...new Set(value.map(x => String(x).trim()).filter(Boolean))].slice(0,30) : value;
const optionalUrl = (value, field) => {
  if (value === "" || value == null) return null;
  try {
    const url = new URL(value);
    if (!["http:","https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch { throw appError(`${field} must be a valid http/https URL`); }
};

const updateTutor = async (id, values = {}) => {
  const clean = { ...values };
  for (const field of ["skills","languages","teaching_modes","certifications","achievements","specialties","student_levels"]) {
    if (field in clean) clean[field] = trimArray(clean[field]);
  }
  if ("lesson_duration_minutes" in clean) {
    if (!Array.isArray(clean.lesson_duration_minutes)) throw appError("Lesson durations must be an array");
    clean.lesson_duration_minutes = [...new Set(clean.lesson_duration_minutes.map(Number))].filter(x => allowedDurations.has(x));
    if (!clean.lesson_duration_minutes.length) throw appError("Choose at least one valid lesson duration");
  }
  if ("experience_years" in clean && (!Number.isInteger(Number(clean.experience_years)) || Number(clean.experience_years) < 0 || Number(clean.experience_years) > 60)) throw appError("Experience must be between 0 and 60 years");
  if ("hourly_rate" in clean && clean.hourly_rate !== null && (Number(clean.hourly_rate) <= 0 || Number(clean.hourly_rate) > 100000)) throw appError("Hourly rate must be between 1 and 100000");
  if ("response_time_hours" in clean && (Number(clean.response_time_hours) < 1 || Number(clean.response_time_hours) > 168)) throw appError("Response time must be between 1 and 168 hours");
  if ("short_intro" in clean && String(clean.short_intro || "").length > 280) throw appError("Short introduction cannot exceed 280 characters");
  for (const field of ["linkedin_url","website_url","intro_video_url","profile_image","id_proof_url","qualification_proof_url"]) if (field in clean) clean[field] = optionalUrl(clean[field], field.replaceAll("_"," "));
  return db.updateTutor(id, clean);
};

const publishProfile = async (id) => {
  const readiness = await db.getProfileReadiness(id);
  if (!readiness) throw appError("Tutor profile not found",404);
  if (readiness.completion < 80) {
    const missing = Object.entries(readiness).filter(([k,v]) => !["completion","profile_published","profile_published_at"].includes(k) && v === false).map(([k]) => k.replaceAll("_"," "));
    throw appError(`Complete at least 80% of your profile before publishing. Missing: ${missing.join(", ")}`,409);
  }
  return db.setProfilePublished(id,true);
};

const unpublishProfile = (id) => db.setProfilePublished(id,false);

module.exports={...db,updateTutor,publishProfile,unpublishProfile};
