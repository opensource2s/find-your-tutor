import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { publicApi } from "../services/api";
import "../styles/auth.css";

const splitCsv = value => String(value || "").split(",").map(x => x.trim()).filter(Boolean);

export default function RegistrationForm({ tutor = false }) {
  const navigate = useNavigate();
  const role = tutor ? "tutor" : "student";
  const loginPath = tutor ? "/tutor/login?registered=1" : "/login?registered=1";

  const defaults = useMemo(() => ({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    mobile: "",
    country: "India",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    languages: "English",
    title: "",
    bio: "",
    city: "",
    tutor_type: "teacher",
    skills: "",
    experience_years: "0",
    hourly_rate: "500",
    teaching_mode: "online"
  }), []);

  const [form, setForm] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const validate = () => {
    const mobile = form.mobile.replace(/[\s()-]/g, "");
    if (!form.name.trim()) throw new Error("Full name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw new Error("Enter a valid email address.");
    if (form.password.length < 9) throw new Error("Password must contain at least 9 characters.");
    if (form.password !== form.confirm_password) throw new Error("Passwords do not match.");
    if (!/^\+?[0-9]{7,15}$/.test(mobile)) throw new Error("Enter a mobile number with 7–15 digits, including country code.");
    try { new Intl.DateTimeFormat("en", { timeZone: form.timezone.trim() }); }
    catch { throw new Error("Enter a valid timezone, such as Asia/Kolkata."); }
    if (tutor && !form.title.trim()) throw new Error("Professional title is required.");
    if (tutor && (!Number.isFinite(Number(form.hourly_rate)) || Number(form.hourly_rate) < 0)) throw new Error("Enter a valid hourly rate.");
    return mobile;
  };

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      const mobile = validate();
      setBusy(true);

      const body = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        mobile,
        country: form.country.trim(),
        timezone: form.timezone.trim()
      };

      if (tutor) {
        Object.assign(body, {
          title: form.title.trim(),
          bio: form.bio.trim(),
          city: form.city.trim(),
          tutor_type: form.tutor_type,
          skills: splitCsv(form.skills),
          languages: splitCsv(form.languages),
          teaching_modes: [form.teaching_mode],
          experience_years: Number(form.experience_years),
          hourly_rate: Number(form.hourly_rate)
        });
      } else {
        body.preferred_languages = splitCsv(form.languages);
      }

      await publicApi.post(`/auth/register/${role}`, body);
      navigate(loginPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <div className={`auth-shell registration-shell ${tutor ? "tutor-auth" : ""}`}>
    <section className="auth-hero"><div>
      <Link className="auth-brand" to="/home">Tutorly {tutor && <small>Tutor Portal</small>}</Link>
      <span className="eyebrow">{tutor ? "TEACH. CONNECT. GROW." : "LEARN WITH THE RIGHT PERSON"}</span>
      <h1>{tutor ? <>Create one account.<br/>Build your <em>teaching practice.</em></> : <>Start learning with a <em>tutor who fits.</em></>}</h1>
      <p>{tutor ? "Your Tutorly form creates your Auth0 login and Tutorly tutor profile in one registration." : "Create your account once, then search tutors, send requests, message and learn."}</p>
      <div className="registration-benefits">
        <span>✓ One signup — no second Auth0 registration form</span>
        <span>✓ Password is stored only by Auth0</span>
        <span>✓ Tutor/student application data is stored in PostgreSQL</span>
      </div>
    </div></section>

    <section className="auth-panel"><div className="auth-card registration-card">
      <nav className="registration-roles" aria-label="Account type">
        <Link to="/signup" aria-current={!tutor ? "page" : undefined}>I’m a student</Link>
        <Link to="/tutor/signup" aria-current={tutor ? "page" : undefined}>I’m a tutor</Link>
      </nav>

      <span className="eyebrow">{tutor ? "TUTOR SIGNUP" : "STUDENT SIGNUP"}</span>
      <h2>Create your account</h2>
      <p>Complete this form once. Tutorly creates the Auth0 account and your {role} database profile together.</p>
      {error && <div className="notice error" role="alert">{error}</div>}

      <form onSubmit={submit} className="registration-form">
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label className="full">Full name *<input name="name" autoComplete="name" maxLength={100} required value={form.name} onChange={change}/></label>
            <label>Email *<input name="email" type="email" autoComplete="email" required value={form.email} onChange={change}/></label>
            <label>Mobile *<input name="mobile" type="tel" autoComplete="tel" required value={form.mobile} onChange={change} placeholder="+919876543210"/></label>
            <label>Password *<input name="password" type="password" autoComplete="new-password" minLength={9} required value={form.password} onChange={change}/><small className="field-help">Minimum 9 characters.</small></label>
            <label>Confirm password *<input name="confirm_password" type="password" autoComplete="new-password" minLength={9} required value={form.confirm_password} onChange={change}/></label>
            <label>Country<input name="country" value={form.country} onChange={change}/></label>
            <label>Timezone *<input name="timezone" required value={form.timezone} onChange={change}/></label>
            <label>{tutor ? "Teaching languages" : "Preferred languages"}<input name="languages" value={form.languages} onChange={change} placeholder="English, Telugu"/></label>

            {tutor && <>
              <label className="full">Professional title *<input name="title" required maxLength={150} value={form.title} onChange={change} placeholder="C Programming & DSA Tutor"/></label>
              <label>City<input name="city" value={form.city} onChange={change} placeholder="Hyderabad"/></label>
              <label>Tutor type<select name="tutor_type" value={form.tutor_type} onChange={change}><option value="teacher">Teacher</option><option value="trainer">Trainer</option><option value="coach">Coach</option><option value="mentor">Mentor</option><option value="motivator">Motivator</option></select></label>
              <label>Experience (years) *<input name="experience_years" type="number" min="0" max="100" value={form.experience_years} onChange={change}/></label>
              <label>Hourly rate (₹) *<input name="hourly_rate" type="number" min="0" step="50" value={form.hourly_rate} onChange={change}/></label>
              <label>Teaching mode<select name="teaching_mode" value={form.teaching_mode} onChange={change}><option value="online">Online</option><option value="in-person">In person</option></select></label>
              <label className="full">Skills<input name="skills" value={form.skills} onChange={change} placeholder="C Programming, Pointers, DSA"/></label>
              <label className="full">Short bio<textarea name="bio" maxLength={5000} value={form.bio} onChange={change} placeholder="Tell students about your teaching background. You can complete the full profile after login."/></label>
              <div className="full auth-note">ID proof, qualification proof, certificates and other verification documents are optional during testing. Tutors can add them later from My Profile.</div>
            </>}
          </div>
          <button className="primary wide" type="submit">{busy ? "Creating account…" : tutor ? "Create Tutor Account →" : "Create Student Account →"}</button>
        </fieldset>
      </form>

      <p className="switch-page">Already registered? <Link to={tutor ? "/tutor/login" : "/login"}>Sign in</Link></p>
    </div></section>
  </div>;
}
