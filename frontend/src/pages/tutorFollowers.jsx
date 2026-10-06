import { useEffect,useState } from "react";
import Header from "../components/header";
import ProfilePhoto from "../components/profilePhoto";
import { useApi } from "../services/api";

export default function TutorFollowers(){
 const api=useApi();const [followers,setFollowers]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{api.get("/follows/me/followers").then(r=>setFollowers(r.data.followers||[])).catch(e=>setError(e.response?.data?.message||"Could not load followers.")).finally(()=>setLoading(false));},[]);
 return <><Header portal="tutor"/><main className="dashboard-wrap"><section className="section-title"><div><span className="eyebrow">YOUR AUDIENCE</span><h1>Followers</h1><p>Students who follow your teaching content. Followers automatically see your published posts in their Following Feed.</p></div><div className="follower-total"><b>{followers.length}</b><span>followers</span></div></section>{error&&<div className="notice error">{error}</div>}{loading&&<div className="panel">Loading followers…</div>}{!loading&&!followers.length&&<div className="panel feed-empty"><b>No followers yet.</b><span>Publish useful tutor posts to build your audience.</span></div>}<section className="followers-list">{followers.map(s=><article className="panel follower-row" key={s.id}><ProfilePhoto src={s.profile_image} name={s.name} size={52}/><div><b>{s.name}</b><span>{s.country||"Student"}</span><small>Following since {new Date(s.followed_at).toLocaleDateString()}</small></div><span className="notification-state">{s.notifications_enabled?"🔔 Post alerts on":"Post alerts off"}</span></article>)}</section></main></>;
}
