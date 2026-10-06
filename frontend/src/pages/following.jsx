import { useEffect,useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import ProfilePhoto from "../components/profilePhoto";
import { useApi } from "../services/api";

export default function Following(){
  const api=useApi();const navigate=useNavigate();
  const [tutors,setTutors]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const load=async()=>{try{const r=await api.get("/follows/me/tutors");setTutors(r.data.tutors||[]);setError("");}catch(e){setError(e.response?.data?.message||"Could not load followed tutors.");}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const unfollow=async id=>{try{await api.delete(`/follows/tutors/${id}`);await load();}catch(e){setError(e.response?.data?.message||"Could not unfollow tutor.");}};
  const toggleAlerts=async t=>{try{await api.patch(`/follows/tutors/${t.id}/notifications`,{enabled:!t.notifications_enabled});await load();}catch(e){setError(e.response?.data?.message||"Could not update post alerts.");}};
  return <><Header/><main className="feed-page"><section className="section-title"><div><span className="eyebrow">YOUR TUTORS</span><h1>Following</h1><p>Follow tutors whose teaching style you like. Their newest posts appear in your Following Feed.</p></div><button className="primary" onClick={()=>navigate("/following-feed")}>Open following feed →</button></section>
  {error&&<div className="notice error">{error}</div>}{loading&&<div className="panel">Loading followed tutors…</div>}
  {!loading&&!tutors.length&&<div className="panel feed-empty"><b>You are not following any tutors yet.</b><span>Find a tutor or discover one through Tutor Feed.</span><button className="primary" onClick={()=>navigate("/feed")}>Discover tutors</button></div>}
  <section className="following-grid">{tutors.map(t=><article className="panel following-card" key={t.id}><ProfilePhoto src={t.profile_image} name={t.name} size={70} verified={!!t.is_verified}/><div><h3>{t.name}</h3><p>{t.title||"Tutorly Tutor"}</p><span>{t.follower_count||0} followers · {t.post_count||0} posts</span><small>Following since {new Date(t.followed_at).toLocaleDateString()}</small></div><div className="following-actions"><button className="primary" onClick={()=>navigate(`/tutors/${t.id}`)}>View profile</button><button className="secondary" onClick={()=>toggleAlerts(t)}>{t.notifications_enabled?"🔔 Alerts on":"🔕 Alerts off"}</button><button className="secondary" onClick={()=>unfollow(t.id)}>Unfollow</button></div></article>)}</section></main></>;
}
