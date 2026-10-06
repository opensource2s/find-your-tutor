import { useNavigate } from "react-router-dom";
import ProfilePhoto from "./profilePhoto";
import FollowButton from "./followButton";

export default function TutorCard({ tutor }) {
  const navigate = useNavigate();
  const rating = Number(tutor.avg_rating || 0);
  const spots = Math.max(0, Number(tutor.max_students || 50) - Number(tutor.connected_students || 0));
  const subjects=(tutor.courses?.length ? tutor.courses : tutor.skills || [])
    .map(x => typeof x === "string" ? x : x?.name)
    .filter(Boolean)
    .slice(0,4);

  return <article className="tutor-card tutor-card-v6" onClick={() => navigate(`/tutors/${tutor.id}`)}>
    <div className="tutor-card-top">
      <ProfilePhoto
        src={tutor.profile_image}
        name={tutor.name}
        size={82}
        verified={!!tutor.is_verified}
      />

      <div className="tutor-card-identity">
        <div className="tutor-name-line">
          <h3>{tutor.name}</h3>
          {tutor.is_verified && <span className="verified-inline">✓ Verified</span>}
        </div>
        <p>{tutor.title || "Tutorly Tutor"}</p>
        <div className="rating">★ {rating.toFixed(1)} <span>({tutor.review_count || 0} reviews)</span></div>
      </div>

      <strong className="tutor-card-price">
        {tutor.currency === "INR" ? "₹" : `${tutor.currency || "INR"} `}
        {Number(tutor.hourly_rate || 0).toLocaleString()}
        <small>/hr</small>
      </strong>
    </div>

    {!!subjects.length && <div className="chips tutor-card-subjects">
      {subjects.map(x => <span key={x}>{x}</span>)}
    </div>}

    {tutor.short_intro && <p className="card-intro">{tutor.short_intro}</p>}

    <div className="tutor-card-meta-grid">
      <span><b>🌍 Location</b>{[tutor.city,tutor.country].filter(Boolean).join(", ") || "Remote"}</span>
      <span><b>💼 Experience</b>{Number(tutor.experience_years || 0)} years</span>
      <span><b>🗣 Languages</b>{(tutor.languages || []).slice(0,2).join(", ") || "English"}</span>
      <span><b>💬 Response</b>~{tutor.response_time_hours || 24}h</span>
    </div>

    <FollowButton tutorId={tutor.id} compact/>

    <div className="tutor-card-footer">
      <span className={spots > 0 ? "spots-open" : "spots-full"}>
        {spots > 0 ? `${spots} connection spots open` : "Currently full"}
      </span>

      <div>
        <button type="button" className="secondary compact-btn" onClick={e => {e.stopPropagation();navigate(`/tutors/${tutor.id}`);}}>
          View profile
        </button>
        <button type="button" className="primary compact-btn" onClick={e => {e.stopPropagation();navigate(`/tutors/${tutor.id}`);}}>
          Message
        </button>
      </div>
    </div>
  </article>;
}
