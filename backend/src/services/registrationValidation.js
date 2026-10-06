const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };

function validateRegistration(values, tutor = false) {
  if (!values || typeof values !== "object" || Array.isArray(values)) invalid("Profile details are required.");
  const string = (key, label, max, required = false) => {
    const value = values[key] ?? "";
    if (typeof value !== "string") invalid(`${label} must be text.`);
    const clean = value.trim();
    if ((required && !clean) || clean.length > max) invalid(`${label} ${required ? "is required and " : ""}must be at most ${max} characters.`);
    return clean;
  };
  const list = (key, fallback = []) => {
    const value = values[key] ?? fallback;
    if (!Array.isArray(value) || value.length > 30 || value.some(x => typeof x !== "string" || x.length > 100)) invalid(`Invalid ${key.replaceAll("_", " ")}.`);
    return [...new Set(value.map(x => x.trim()).filter(Boolean))];
  };
  const profile = {
    name: string("name", "Full name", 100, true),
    mobile: string("mobile", "Mobile number", 20, true).replace(/[\s()-]/g, ""),
    country: string("country", "Country", 80) || null,
    timezone: string("timezone", "Timezone", 80) || "Asia/Kolkata",
  };
  if (!/^\+?[0-9]{7,15}$/.test(profile.mobile)) invalid("Enter a mobile number with 7–15 digits, including your country code.");
  try { new Intl.DateTimeFormat("en", { timeZone: profile.timezone }); } catch { invalid("Enter a valid timezone, such as Asia/Kolkata."); }
  if (!tutor) return { ...profile, preferred_languages: list("preferred_languages") };
  const rate = values.hourly_rate;
  const experience = values.experience_years ?? 0;
  if (!["number", "string"].includes(typeof rate) || String(rate).trim() === "" || !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 99999999.99) invalid("Enter a valid non-negative hourly rate.");
  if (!["number", "string"].includes(typeof experience) || !Number.isInteger(Number(experience)) || Number(experience) < 0 || Number(experience) > 100) invalid("Experience must be a whole number between 0 and 100.");
  const tutorType = string("tutor_type", "Tutor type", 50) || "teacher";
  if (!["teacher", "trainer", "coach", "mentor", "motivator"].includes(tutorType)) invalid("Choose a valid tutor type.");
  const modes = list("teaching_modes", ["online"]);
  if (!modes.length || modes.some(x => !["online", "in-person"].includes(x))) invalid("Choose online or in-person teaching.");
  return { ...profile, title: string("title", "Professional title", 150, true), bio: string("bio", "Bio", 5000) || null,
    city: string("city", "City", 80) || null, tutor_type: tutorType, skills: list("skills"),
    languages: list("languages", ["English"]), teaching_modes: modes,
    hourly_rate: Number(rate), experience_years: Number(experience) };
}

module.exports = { validateRegistration };
