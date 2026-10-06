import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import { useApi } from "../services/api";
import { getCourses } from "../services/tutorApi";
import "../styles/app.css";

const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const splitCsv = (value) => String(value || "").split(",").map(x => x.trim()).filter(Boolean);
const joinCsv = (value) => Array.isArray(value) ? value.join(", ") : "";
const durationOptions=[30,45,60,90,120];

export default function TutorProfile() {
  const api = useApi();
  const navigate=useNavigate();
  const [tutorId,setTutorId]=useState("");
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [availability,setAvailability]=useState([]);
  const [slot,setSlot]=useState({day_of_week:1,start_time:"18:00",end_time:"20:00",timezone:"Asia/Kolkata"});
  const [form, setForm] = useState(null);
  const [readiness,setReadiness]=useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing,setPublishing]=useState(false);

  const load=async()=>{
    try{
      const [me,allCourses,ownCourses,slots,ready]=await Promise.all([
        api.get("/tutor-portal/me"), getCourses(), api.get("/tutor-portal/courses"),
        api.get("/tutor-portal/availability"), api.get("/tutor-portal/profile-readiness")
      ]);
      const t=me.data.tutor;
      setTutorId(t.id);
      setCourses(allCourses);
      setSelectedCourses((ownCourses.data.courses||[]).map(c=>c.id));
      setAvailability(slots.data.availability||[]);
      setReadiness(ready.data.readiness);
      setForm({
        name:t.name||"", mobile:t.mobile||"", title:t.title||"", short_intro:t.short_intro||"", bio:t.bio||"",
        teaching_philosophy:t.teaching_philosophy||"", tutor_type:t.tutor_type||"individual",
        experience_years:t.experience_years??0, hourly_rate:t.hourly_rate??"", currency:t.currency||"INR",
        profile_image:t.profile_image||"", country:t.country||"", city:t.city||"", timezone:t.timezone||"Asia/Kolkata",
        skills:joinCsv(t.skills), specialties:joinCsv(t.specialties), languages:joinCsv(t.languages),
        teaching_modes:joinCsv(t.teaching_modes), student_levels:joinCsv(t.student_levels), education:t.education||"",
        certifications:joinCsv(t.certifications), achievements:joinCsv(t.achievements), linkedin_url:t.linkedin_url||"",
        website_url:t.website_url||"", intro_video_url:t.intro_video_url||"", response_time_hours:t.response_time_hours??24,
        trial_lesson_available:!!t.trial_lesson_available, is_accepting_messages:t.is_accepting_messages!==false,
        lesson_duration_minutes:Array.isArray(t.lesson_duration_minutes)&&t.lesson_duration_minutes.length?t.lesson_duration_minutes:[60],
        profile_published:!!t.profile_published, id_proof_type:t.id_proof_type||"", id_proof_url:t.id_proof_url||"",
        qualification_proof_url:t.qualification_proof_url||"", verification_status:t.verification_status||"not_submitted"
      });
      setSlot(v=>({...v,timezone:t.timezone||"Asia/Kolkata"}));
    }catch(e){setNotice(e.response?.data?.message||"Could not load tutor profile.");}
  };

  useEffect(()=>{load();},[]);

  const localCompletion=useMemo(()=>readiness?.completion??0,[readiness]);
  const change=e=>{const{name,value,type,checked}=e.target;setForm(v=>({...v,[name]:type==="checkbox"?checked:value}));};
  const toggleCourse=id=>setSelectedCourses(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id]);
  const toggleDuration=min=>setForm(v=>({...v,lesson_duration_minutes:v.lesson_duration_minutes.includes(min)?v.lesson_duration_minutes.filter(x=>x!==min):[...v.lesson_duration_minutes,min].sort((a,b)=>a-b)}));

  const payload=()=>({
    ...form,
    experience_years:Number(form.experience_years||0), hourly_rate:form.hourly_rate===""?null:Number(form.hourly_rate),
    response_time_hours:Number(form.response_time_hours||24), skills:splitCsv(form.skills), specialties:splitCsv(form.specialties),
    languages:splitCsv(form.languages), teaching_modes:splitCsv(form.teaching_modes), student_levels:splitCsv(form.student_levels),
    certifications:splitCsv(form.certifications), achievements:splitCsv(form.achievements), lesson_duration_minutes:form.lesson_duration_minutes
  });

  const persist=async()=>{
    await Promise.all([api.patch("/tutor-portal/me",payload()),api.put("/tutor-portal/courses",{course_ids:selectedCourses})]);
    const ready=await api.get("/tutor-portal/profile-readiness");setReadiness(ready.data.readiness);return ready.data.readiness;
  };
  const save=async(e)=>{
    e?.preventDefault();setSaving(true);setNotice("");
    try{await persist();setNotice("Profile saved successfully.");}
    catch(e){setNotice(e.response?.data?.message||"Could not save tutor profile.");}
    finally{setSaving(false);}
  };

  const addSlot=async()=>{try{await api.post("/tutor-portal/availability",slot);setNotice("Availability added.");await load();}catch(e){setNotice(e.response?.data?.message||"Could not add availability.");}};
  const removeSlot=async id=>{try{await api.delete(`/tutor-portal/availability/${id}`);await load();}catch(e){setNotice(e.response?.data?.message||"Could not remove availability.");}};

  const publish=async()=>{
    setPublishing(true);setNotice("");
    try{
      await persist();
      await api.post("/tutor-portal/publish",{});
      setNotice("Your tutor profile is now published in the marketplace.");
      await load();
    }catch(e){setNotice(e.response?.data?.message||"Could not publish profile.");}
    finally{setPublishing(false);}
  };
  const unpublish=async()=>{setPublishing(true);try{await api.post("/tutor-portal/unpublish",{});setNotice("Profile hidden from marketplace. You can continue editing it.");await load();}catch(e){setNotice(e.response?.data?.message||"Could not hide profile.");}finally{setPublishing(false);}};

  if(!form)return <div className="page-loader">Loading tutor profile studio…</div>;

  return <><Header portal="tutor"/><main className="dashboard-wrap profile-builder-wrap">
    <section className="profile-builder-hero"><div><span className="eyebrow">TUTOR PROFILE STUDIO</span><h1>Build a profile students want to message.</h1><p>Show your subject expertise, teaching approach, credentials, languages, pricing and weekly availability. Publish only when you are ready.</p><div className="action-row"><button type="button" className="secondary small" onClick={()=>tutorId&&navigate(`/tutors/${tutorId}`)} disabled={!form.profile_published}>Preview public profile</button><span className={`publish-state ${form.profile_published?"live":"draft"}`}>{form.profile_published?"● LIVE IN MARKETPLACE":"● DRAFT"}</span></div></div><div className="profile-score"><b>{localCompletion}%</b><span>profile complete</span><div><i style={{width:`${localCompletion}%`}}/></div><small>{localCompletion>=80?"Ready to publish":"Reach 80% to publish"}</small></div></section>
    {notice&&<div className="notice">{notice}</div>}

    <form className="profile-builder-grid" onSubmit={save}>
      <div className="profile-builder-main">
        <section className="panel form-section"><div className="section-title compact"><div><span className="eyebrow">01 · IDENTITY</span><h2>Professional introduction</h2></div></div><div className="form-grid">
          <label>Name<input name="name" value={form.name} onChange={change} maxLength={100} required/></label>
          <label>Professional title<input name="title" value={form.title} onChange={change} placeholder="Senior C & DSA Tutor" maxLength={150}/></label>
          <label>Country<input name="country" value={form.country} onChange={change} placeholder="India"/></label><label>City<input name="city" value={form.city} onChange={change} placeholder="Hyderabad"/></label>
          <label>Experience (years)<input type="number" min="0" max="60" name="experience_years" value={form.experience_years} onChange={change}/></label>
          <label>Hourly rate<input type="number" min="1" step="50" name="hourly_rate" value={form.hourly_rate} onChange={change}/></label>
          <label>Currency<select name="currency" value={form.currency} onChange={change}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
          <label>Tutor type<select name="tutor_type" value={form.tutor_type} onChange={change}><option value="individual">Individual tutor</option><option value="professional">Professional tutor</option><option value="mentor">Mentor</option></select></label>
          <label className="full">Profile photo URL<input name="profile_image" value={form.profile_image} onChange={change} placeholder="https://..."/></label>
          <label className="full">Short introduction <small>{form.short_intro.length}/280</small><textarea name="short_intro" value={form.short_intro} onChange={change} maxLength={280} placeholder="Example: Backend engineer with 8 years of experience helping students master C, DSA and interview problem solving."/></label>
          <label className="full">About you<textarea name="bio" value={form.bio} onChange={change} maxLength={3000} placeholder="Explain your background, who you help and the outcomes students can expect."/></label>
        </div></section>

        <section className="panel form-section"><div className="section-title compact"><div><span className="eyebrow">02 · EXPERTISE</span><h2>Subjects & student fit</h2></div></div>
          <label className="field-label">Courses you teach</label><div className="course-picker">{courses.map(c=><button type="button" key={c.id} className={selectedCourses.includes(c.id)?"selected":""} onClick={()=>toggleCourse(c.id)}><b>{c.name}</b><span>{c.category||"Course"}</span></button>)}</div>
          <div className="form-grid"><label className="full">Skills<input name="skills" value={form.skills} onChange={change} placeholder="C, Pointers, DSA, Debugging, Problem Solving"/></label><label className="full">Specialties<input name="specialties" value={form.specialties} onChange={change} placeholder="Interview preparation, College assignments, Beginner programming"/></label><label>Languages<input name="languages" value={form.languages} onChange={change} placeholder="English, Telugu, Hindi"/></label><label>Student levels<input name="student_levels" value={form.student_levels} onChange={change} placeholder="Beginner, Intermediate, Advanced"/></label><label>Teaching modes<input name="teaching_modes" value={form.teaching_modes} onChange={change} placeholder="online, 1-on-1, group"/></label><label>Timezone<input name="timezone" value={form.timezone} onChange={change}/></label><label className="full">Teaching philosophy<textarea name="teaching_philosophy" value={form.teaching_philosophy} onChange={change} placeholder="Describe how you explain concepts, structure practice and measure progress."/></label></div>
          <label className="field-label">Lesson duration options</label><div className="duration-picker">{durationOptions.map(min=><button type="button" key={min} className={form.lesson_duration_minutes.includes(min)?"selected":""} onClick={()=>toggleDuration(min)}>{min} min</button>)}</div>
        </section>

        <section className="panel form-section"><div className="section-title compact"><div><span className="eyebrow">03 · CREDENTIALS</span><h2>Education & proof of expertise</h2></div></div><div className="form-grid">
          <label className="full">Education<textarea name="education" value={form.education} onChange={change} placeholder="B.Tech CSE — University name, 2018"/></label><label className="full">Certifications<input name="certifications" value={form.certifications} onChange={change} placeholder="AWS Developer Associate, Meta Front-End"/></label><label className="full">Achievements<input name="achievements" value={form.achievements} onChange={change} placeholder="500+ sessions taught, Top mentor 2025"/></label><label>LinkedIn URL<input name="linkedin_url" value={form.linkedin_url} onChange={change} placeholder="https://linkedin.com/in/..."/></label><label>Portfolio / website<input name="website_url" value={form.website_url} onChange={change} placeholder="https://..."/></label><label className="full">Intro video URL<input name="intro_video_url" value={form.intro_video_url} onChange={change} placeholder="https://youtube.com/..."/></label>
          <div className="full auth-note"><b>Optional verification for testing</b><br/>You can leave all proof fields empty. They are available now so we can add an admin verification workflow later without changing the tutor model.</div>
          <label>ID proof type<select name="id_proof_type" value={form.id_proof_type} onChange={change}><option value="">Not provided</option><option value="passport">Passport</option><option value="driving_license">Driving licence</option><option value="national_id">National ID</option><option value="other">Other</option></select></label>
          <label>Verification status<input value={form.verification_status.replaceAll("_"," ")} disabled/></label>
          <label className="full">ID proof URL (optional)<input name="id_proof_url" value={form.id_proof_url} onChange={change} placeholder="https://secure-storage.example/id-proof"/></label>
          <label className="full">Qualification proof URL (optional)<input name="qualification_proof_url" value={form.qualification_proof_url} onChange={change} placeholder="https://secure-storage.example/qualification"/></label>
        </div></section>

        <section className="panel form-section"><div className="section-title compact"><div><span className="eyebrow">04 · AVAILABILITY</span><h2>Weekly teaching schedule</h2></div></div><p className="muted">Students see these slots on your public profile. Add all regular windows in your own timezone.</p><div className="slot-form profile-slot-form"><label>Day<select value={slot.day_of_week} onChange={e=>setSlot({...slot,day_of_week:Number(e.target.value)})}>{days.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><label>From<input type="time" value={slot.start_time} onChange={e=>setSlot({...slot,start_time:e.target.value})}/></label><label>To<input type="time" value={slot.end_time} onChange={e=>setSlot({...slot,end_time:e.target.value})}/></label><button type="button" className="primary" onClick={addSlot}>Add slot</button></div><div className="availability-editor">{availability.map(x=><div key={x.id}><div><b>{days[x.day_of_week]}</b><span>{String(x.start_time).slice(0,5)} – {String(x.end_time).slice(0,5)} · {x.timezone}</span></div><button type="button" className="text-btn danger" onClick={()=>removeSlot(x.id)}>Remove</button></div>)}{!availability.length&&<div className="empty small">No availability added yet.</div>}</div></section>
      </div>

      <aside className="profile-builder-side"><section className="panel sticky profile-settings-card"><span className="eyebrow">STUDENT EXPERIENCE</span><h2>Communication settings</h2><label>Typical response time<select name="response_time_hours" value={form.response_time_hours} onChange={change}><option value="1">Within 1 hour</option><option value="4">Within 4 hours</option><option value="12">Within 12 hours</option><option value="24">Within 24 hours</option><option value="48">Within 2 days</option></select></label><label className="toggle-row"><span><b>Accept direct messages</b><small>Students can contact you before connecting.</small></span><input type="checkbox" name="is_accepting_messages" checked={form.is_accepting_messages} onChange={change}/></label><label className="toggle-row"><span><b>Trial lesson available</b><small>Show a trial badge on your marketplace profile.</small></span><input type="checkbox" name="trial_lesson_available" checked={form.trial_lesson_available} onChange={change}/></label><button className="primary wide" disabled={saving}>{saving?"Saving…":"Save profile"}</button><hr/><div className="readiness-list"><b>Publication checklist</b><span className={readiness?.course?"done":""}>✓ Course selected</span><span className={readiness?.availability?"done":""}>✓ Availability added</span><span className={readiness?.languages?"done":""}>✓ Languages added</span><span className={readiness?.education?"done":""}>✓ Education added</span><span className={readiness?.short_intro?"done":""}>✓ Introduction added</span></div>{form.profile_published?<button type="button" className="secondary wide" disabled={publishing} onClick={unpublish}>Hide from marketplace</button>:<button type="button" className="publish-btn wide" disabled={publishing||localCompletion<80} onClick={publish}>{publishing?"Publishing…":"Publish profile"}</button>}<p className="helper-text">Published profiles appear in student search. You can hide the profile anytime without deleting your account.</p></section></aside>
    </form>
  </main></>;
}
