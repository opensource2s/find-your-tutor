import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../services/api";
import ProfilePhoto from "./profilePhoto";

const typeLabels={
  teaching_tip:"Teaching tip",
  lesson_note:"Lesson note",
  question:"Question",
  course_update:"Course update",
  availability:"Availability",
  announcement:"Announcement"
};

export default function PostCard({ post, portal="student", onChanged }) {
  const api=useApi();
  const navigate=useNavigate();
  const {isAuthenticated}=useAuth0();
  const role=portal==="tutor"?"tutor":"student";
  const [liked,setLiked]=useState(false);
  const [saved,setSaved]=useState(false);
  const [likeCount,setLikeCount]=useState(Number(post.like_count||0));
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    if(!isAuthenticated) return;
    api.get(`/posts/${post.id}/viewer?role=${role}`)
      .then(r=>{setLiked(!!r.data.state?.liked);setSaved(!!r.data.state?.saved);})
      .catch(()=>{});
  },[post.id,isAuthenticated,portal]);

  const ensure=()=>{
    if(isAuthenticated) return true;
    sessionStorage.setItem("post_auth_path","/feed");
    navigate("/login");
    return false;
  };

  const like=async e=>{
    e.stopPropagation();
    if(!ensure()||busy) return;
    setBusy("like");setError("");
    try{
      const r=liked
        ? await api.delete(`/posts/${post.id}/like?role=${role}`)
        : await api.post(`/posts/${post.id}/like?role=${role}`);
      setLiked(!!r.data.liked);setLikeCount(Number(r.data.like_count||0));
      onChanged?.();
    }catch(err){setError(err.response?.data?.message||"Could not update like.");}
    finally{setBusy("");}
  };

  const save=async e=>{
    e.stopPropagation();
    if(role!=="student"){setError("Saved posts are available to students.");return;}
    if(!ensure()||busy) return;
    setBusy("save");setError("");
    try{
      if(saved) await api.delete(`/posts/${post.id}/save`);
      else await api.post(`/posts/${post.id}/save`);
      setSaved(!saved);onChanged?.();
    }catch(err){setError(err.response?.data?.message||"Could not save post.");}
    finally{setBusy("");}
  };

  const openTutor=e=>{e.stopPropagation();navigate(`/tutors/${post.tutor_id}`);};

  return <article className="social-post-card">
    <header className="post-author-row">
      <ProfilePhoto src={post.tutor_image} name={post.tutor_name} size={52} verified={!!post.tutor_verified}/>
      <button className="post-author-copy" onClick={openTutor}>
        <b>{post.tutor_name}</b>
        <span>{post.tutor_title || "Tutorly Tutor"}{post.tutor_experience_years!=null ? ` · ${post.tutor_experience_years} yrs`:""}</span>
        <small>{post.published_at ? new Date(post.published_at).toLocaleString() : "Draft"}</small>
      </button>
      <span className="post-type-pill">{typeLabels[post.post_type]||"Tutor post"}</span>
    </header>

    <button className="post-body-button" onClick={()=>navigate(`/posts/${post.id}`)}>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
    </button>

    {!!post.tags?.length && <div className="post-tags">{post.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>}

    {post.media_type==="image" && post.media_url && (
      <button className="post-media" onClick={()=>navigate(`/posts/${post.id}`)}>
        <img src={post.media_url} alt={post.title} onError={e=>e.currentTarget.parentElement.style.display="none"}/>
      </button>
    )}

    {post.media_type==="video" && post.media_url && (
      <div className="post-video"><video controls preload="metadata" src={post.media_url}/></div>
    )}

    {post.media_type==="link" && post.link_url && (
      <a className="post-link-card" href={post.link_url} target="_blank" rel="noreferrer">Open tutor resource ↗</a>
    )}

    <div className="post-context-row">
      <span>{post.course_name || "General learning"}</span>
      <span>{Number(post.view_count||0)} views</span>
    </div>

    {error && <div className="post-inline-error">{error}</div>}

    <div className="post-actions-row">
      <button className={liked?"active":""} onClick={like} disabled={busy==="like"}>
        {liked?"♥":"♡"} {likeCount} Like{likeCount===1?"":"s"}
      </button>
      <button onClick={()=>navigate(`/posts/${post.id}#comments`)}>
        💬 {Number(post.comment_count||0)} Comment{Number(post.comment_count||0)===1?"":"s"}
      </button>
      {role==="student" && <button className={saved?"active":""} onClick={save} disabled={busy==="save"}>
        {saved?"★ Saved":"☆ Save"}
      </button>}
      <button onClick={openTutor}>View tutor</button>
    </div>
  </article>;
}
