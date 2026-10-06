import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { publicApi, useApi } from "../services/api";

export default function FollowButton({ tutorId, compact=false, onChange }) {
  const api=useApi();
  const navigate=useNavigate();
  const {isAuthenticated}=useAuth0();
  const [social,setSocial]=useState({following:false,follower_count:0,post_count:0});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const load=async()=>{
    try{
      const r=isAuthenticated ? await api.get(`/follows/tutors/${tutorId}/state`) : await publicApi.get(`/follows/tutors/${tutorId}`);
      setSocial(r.data.social||social);
    }catch(e){ setError(e.response?.data?.message||""); }
  };
  useEffect(()=>{if(tutorId)load();},[tutorId,isAuthenticated]);

  const toggle=async e=>{
    e?.stopPropagation?.();
    if(!isAuthenticated){sessionStorage.setItem("post_auth_path",`/tutors/${tutorId}`);navigate("/login");return;}
    if(busy)return;setBusy(true);setError("");
    try{
      const r=social.following ? await api.delete(`/follows/tutors/${tutorId}`) : await api.post(`/follows/tutors/${tutorId}`);
      setSocial(r.data.social);onChange?.(r.data.social);
    }catch(e){setError(e.response?.data?.message||"Could not update follow status.");}
    finally{setBusy(false);}
  };

  return <div className={`follow-control ${compact?"compact":""}`} onClick={e=>e.stopPropagation()}>
    <button type="button" className={social.following?"secondary following-btn":"primary follow-btn"} onClick={toggle} disabled={busy}>
      {busy?"Please wait…":social.following?"✓ Following":"+ Follow"}
    </button>
    <span><b>{Number(social.follower_count||0).toLocaleString()}</b> followers · <b>{social.post_count||0}</b> posts</span>
    {error&&<small>{error}</small>}
  </div>;
}
