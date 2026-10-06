import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "../components/header";
import ProfilePhoto from "../components/profilePhoto";
import FollowButton from "../components/followButton";
import PostCard from "../components/postCard";
import { getTutorById } from "../services/tutorApi";
import { publicApi, useApi } from "../services/api";
import "../styles/app.css";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TutorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { isAuthenticated } = useAuth0();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [message, setMessage] = useState("");
  const [courseId, setCourseId] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [notice, setNotice] = useState("");
  const [openingChat, setOpeningChat] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getTutorById(id).then(setTutor).catch(() => setTutor(null)).finally(() => setLoading(false));
    publicApi.get("/posts", { params: { tutor_id:id, limit:3 } })
      .then(r => setPosts(r.data.posts || []))
      .catch(() => setPosts([]));
  }, [id]);

  const ensure = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("post_auth_path", `/tutors/${id}`);
      navigate("/login");
      return false;
    }
    return true;
  };

  const favorite = async () => {
    if (!ensure()) return;
    try { await api.post(`/student/favorites/${id}`); setNotice("Tutor saved to your favorites."); }
    catch (e) { setNotice(e.response?.data?.message || "Could not save tutor"); }
  };

  const sendRequest = async () => {
    if (!ensure()) return;
    try {
      await api.post(`/student/requests/${id}`, { course_id: courseId || null, message, preferred_day: day === "" ? null : Number(day), preferred_time: time || null });
      setShowRequest(false);
      setNotice("Connection request sent. The tutor can review it from the Tutor Portal.");
    } catch (e) { setNotice(e.response?.data?.message || "Could not send request"); }
  };

  const startChat = async () => {
    if (!ensure()) return;
    setOpeningChat(true);
    setNotice("");
    try {
      const r = await api.post(`/chat/conversations/${id}?role=student`);
      navigate(`/messages?conversation=${r.data.conversation.id}`);
    } catch (e) {
      setNotice(e.response?.data?.message || "Could not open chat with this tutor.");
      setOpeningChat(false);
    }
  };

  if (loading) return <div className="page-loader">Loading tutor profile…</div>;
  if (!tutor) return <div className="page-loader">Tutor not found.</div>;

  const spots = Math.max(0, Number(tutor.max_students || 50) - Number(tutor.connected_students || 0));
  const responseText = Number(tutor.response_time_hours || 24) <= 1 ? "Usually replies within 1 hour" : `Usually replies within ${tutor.response_time_hours || 24} hours`;

  return <>
    <Header />
    <main className="details-wrap">
      <button className="back" onClick={() => navigate(-1)}>← Back to search</button>
      {notice && <div className="notice">{notice}</div>}

      <section className="profile-hero">
        <div className="profile-avatar-v6"><ProfilePhoto src={tutor.profile_image} name={tutor.name} size={126} verified={!!tutor.is_verified}/><small>Click photo to preview</small></div>
        <div className="profile-main">
          <div className="profile-heading">
            <div>
              <div className="verified-line">{tutor.is_verified && <span>✓ Verified tutor</span>}{tutor.trial_lesson_available && <span className="trial-badge">Trial lesson</span>}</div>
              <h1>{tutor.name}</h1>
              <p>{tutor.title || "Tutorly instructor"}</p>
            </div>
            <div className="price">{tutor.currency === "INR" ? "₹" : `${tutor.currency || "INR"} `}{Number(tutor.hourly_rate || 0).toLocaleString()}<small>/hour</small></div>
          </div>
          <div className="profile-stats">
            <span><b>★ {Number(tutor.avg_rating || 0).toFixed(1)}</b>{tutor.review_count} reviews</span>
            <span><b>{tutor.experience_years} yrs</b>teaching experience</span>
            <span><b>{tutor.total_lessons || 0}</b>lessons completed</span>
            <span><b>{tutor.country || "Remote"}</b>{tutor.city || tutor.timezone}</span>
          </div>
          <p className="bio">{tutor.short_intro || tutor.bio || "This tutor is building a personalized learning practice on Tutorly."}</p>
          <div className="chips profile-chips">
            {(tutor.languages || []).map(x => <span key={x}>🗣 {x}</span>)}
            {(tutor.teaching_modes || []).map(x => <span key={x}>◉ {x}</span>)}
          </div>
          <FollowButton tutorId={tutor.id}/>
        </div>
      </section>

      <div className="trust-strip">
        <span><b>💬 Direct messaging</b>Ask questions before connecting</span>
        <span><b>⏱ Response expectation</b>{responseText}</span>
        <span><b>🔒 Tutorly workflow</b>Connect before booking sessions</span>
      </div>

      <div className="details-grid">
        <div className="details-main">
          <section className="panel">
            <div className="section-title compact"><div><span className="eyebrow">ABOUT</span><h2>Teaching profile</h2></div></div>
            <div className="profile-facts">
              <div><span>Teaching type</span><b>{tutor.tutor_type || "Individual tutor"}</b></div>
              <div><span>Experience</span><b>{tutor.experience_years || 0} years</b></div>
              <div><span>Languages</span><b>{(tutor.languages || []).join(", ") || "English"}</b></div>
              <div><span>Location</span><b>{[tutor.city, tutor.country].filter(Boolean).join(", ") || "Remote"}</b></div>
              <div><span>Student levels</span><b>{(tutor.student_levels || []).join(", ") || "All levels"}</b></div>
              <div><span>Lesson duration</span><b>{(tutor.lesson_duration_minutes || [60]).map(x => `${x} min`).join(", ")}</b></div>
            </div>
            {tutor.bio && <div className="credential-block"><span className="eyebrow">ABOUT ME</span><p>{tutor.bio}</p></div>}
            {tutor.teaching_philosophy && <div className="credential-block"><span className="eyebrow">HOW I TEACH</span><p>{tutor.teaching_philosophy}</p></div>}
            {tutor.education && <div className="credential-block"><span className="eyebrow">EDUCATION</span><p>{tutor.education}</p></div>}
          </section>

          <section className="panel">
            <div className="section-title compact"><div><span className="eyebrow">EXPERTISE</span><h2>Courses & skills</h2></div></div>
            <div className="course-list">
              {(tutor.courses || []).map(c => <div className="course-row" key={c.id}><div><b>{c.name}</b><span>{c.category}</span></div><em>{c.proficiency_level}</em></div>)}
              {!tutor.courses?.length && (tutor.skills || []).map(s => <div className="course-row" key={s}><b>{s}</b></div>)}
            </div>
            {!!tutor.skills?.length && <div className="chips skill-cloud">{tutor.skills.map(s => <span key={s}>{s}</span>)}</div>}
            {!!tutor.specialties?.length && <div className="specialty-box"><b>Specialties</b><div className="chips">{tutor.specialties.map(s => <span key={s}>{s}</span>)}</div></div>}
          </section>

          {(tutor.certifications?.length || tutor.achievements?.length) && <section className="panel">
            <div className="section-title compact"><div><span className="eyebrow">CREDENTIALS</span><h2>Certifications & achievements</h2></div></div>
            <div className="credential-grid">
              <div><h3>Certifications</h3>{tutor.certifications?.length ? tutor.certifications.map(x => <p key={x}>✓ {x}</p>) : <p className="muted">No certifications added.</p>}</div>
              <div><h3>Achievements</h3>{tutor.achievements?.length ? tutor.achievements.map(x => <p key={x}>★ {x}</p>) : <p className="muted">No achievements added.</p>}</div>
            </div>
          </section>}

          {(tutor.linkedin_url || tutor.website_url || tutor.intro_video_url) && <section className="panel">
            <div className="section-title compact"><div><span className="eyebrow">MORE ABOUT THE TUTOR</span><h2>Professional links</h2></div></div>
            <div className="professional-links">
              {tutor.linkedin_url && <a href={tutor.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
              {tutor.website_url && <a href={tutor.website_url} target="_blank" rel="noreferrer">Portfolio / website ↗</a>}
              {tutor.intro_video_url && <a href={tutor.intro_video_url} target="_blank" rel="noreferrer">Watch introduction video ↗</a>}
            </div>
          </section>}

          <section className="panel tutor-profile-posts">
            <div className="section-title compact">
              <div><span className="eyebrow">FROM THIS TUTOR</span><h2>Recent posts</h2></div>
              <button className="text-btn" onClick={() => navigate(`/feed?tutor_id=${id}`)}>See all posts →</button>
            </div>
            {!posts.length && <p className="muted">This tutor has not published any posts yet.</p>}
            {posts.map(post => <PostCard key={post.id} post={post}/>)}
          </section>

          <section className="panel">
            <div className="section-title compact"><div><span className="eyebrow">SOCIAL PROOF</span><h2>Student reviews</h2></div><b>★ {Number(tutor.avg_rating || 0).toFixed(1)}</b></div>
            {tutor.reviews?.length ? tutor.reviews.map(r => <article className="review" key={r.id}><div className="review-head"><b>{r.student_name}</b><span>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div><p>{r.review}</p><small>{new Date(r.created_at).toLocaleDateString()}</small></article>) : <div className="empty small">No reviews yet.</div>}
          </section>
        </div>

        <aside>
          <section className="panel sticky contact-card">
            <span className="eyebrow">CONTACT & LEARN</span>
            <h2>{spots} of 50 connection spots available</h2>
            <p className="contact-summary">Message {tutor.name} first to discuss your goal. When you are ready to learn together, send a connection request.</p>
            <button className="primary wide message-primary" onClick={startChat} disabled={openingChat || tutor.is_accepting_messages === false}>{openingChat ? "Opening chat…" : "💬 Message tutor"}</button>
            {tutor.is_accepting_messages === false && <small className="warning-text">This tutor has paused new direct messages.</small>}
            <button className="secondary wide" onClick={() => { if (ensure()) setShowRequest(true); }}>Request to connect</button>
            <button className="ghost wide" onClick={favorite}>♡ Save tutor</button>
            <div className="response-box"><b>{responseText}</b><span>{tutor.trial_lesson_available ? "Trial lesson available" : "Standard paid sessions"}</span></div>
            <hr />
            <h3>Weekly availability</h3>
            <div className="availability">{tutor.availability?.length ? tutor.availability.map(a => <div key={a.id}><b>{days[a.day_of_week]}</b><span>{String(a.start_time).slice(0, 5)} – {String(a.end_time).slice(0, 5)}</span></div>) : <p className="muted">Tutor has not published availability yet.</p>}</div>
          </section>
        </aside>
      </div>

      {showRequest && <div className="modal-backdrop"><div className="modal"><button className="modal-x" onClick={() => setShowRequest(false)}>×</button><span className="eyebrow">CONNECTION REQUEST</span><h2>Request {tutor.name}</h2><p>Tell the tutor what you want to learn and your preferred time.</p><label>Course<select value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">General mentoring</option>{tutor.courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="two"><label>Preferred day<select value={day} onChange={e => setDay(e.target.value)}><option value="">Flexible</option>{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label><label>Preferred time<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label></div><label>Message<textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="I want help with…" /></label><button className="primary wide" onClick={sendRequest}>Send request</button></div></div>}
    </main>
  </>;
}
