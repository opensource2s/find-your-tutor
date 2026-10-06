import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import { useApi } from "../services/api";

export default function TutorPosts(){
  const api=useApi();
  const navigate=useNavigate();
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async()=>{
    try{
      const r=await api.get("/tutor-portal/posts");
      setPosts(r.data.posts||[]);
      setError("");
    }catch(e){setError(e.response?.data?.message||"Could not load your posts.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  const remove=async id=>{
    if(!window.confirm("Delete this post? Likes, comments and saves will also be removed.")) return;
    try{await api.delete(`/tutor-portal/posts/${id}`);await load();}
    catch(e){setError(e.response?.data?.message||"Could not delete post.");}
  };

  return <>
    <Header portal="tutor"/>
    <main className="dashboard-wrap tutor-posts-page">
      <section className="section-title">
        <div><span className="eyebrow">CONTENT STUDIO</span><h1>My Posts</h1><p>Publish useful content so students can understand how you teach before contacting you.</p></div>
        <button className="primary" onClick={()=>navigate("/tutor/posts/new")}>+ Create post</button>
      </section>

      {error && <div className="notice error">{error}</div>}
      {loading && <div className="panel">Loading posts…</div>}

      {!loading && !posts.length && <div className="panel feed-empty">
        <b>You haven't published anything yet.</b>
        <span>Create a teaching tip, lesson note, question or course update.</span>
        <button className="primary" onClick={()=>navigate("/tutor/posts/new")}>Create your first post</button>
      </div>}

      <div className="tutor-post-table">
        {posts.map(p=><article className="panel tutor-post-row" key={p.id}>
          <div>
            <div className="post-admin-meta">
              <span className={`publish-state ${p.status==="published"?"live":"draft"}`}>{p.status}</span>
              <span>{p.post_type.replaceAll("_"," ")}</span>
              <span>{p.course_name||"General"}</span>
            </div>
            <h3>{p.title}</h3>
            <p>{p.content}</p>
            <div className="post-admin-stats">
              <span>♥ {p.like_count||0}</span>
              <span>💬 {p.comment_count||0}</span>
              <span>★ {p.save_count||0} saves</span>
              <span>◉ {p.view_count||0} views</span>
            </div>
          </div>
          <div className="tutor-post-actions">
            {p.status==="published" && <button className="secondary" onClick={()=>navigate(`/posts/${p.id}`)}>View</button>}
            <button className="secondary" onClick={()=>navigate(`/tutor/posts/${p.id}/edit`)}>Edit</button>
            <button className="text-btn danger" onClick={()=>remove(p.id)}>Delete</button>
          </div>
        </article>)}
      </div>
    </main>
  </>;
}
