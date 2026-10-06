import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "../components/header";
import Footer from "../components/footer";
import PostCard from "../components/postCard";
import ProfilePhoto from "../components/profilePhoto";
import { publicApi, useApi } from "../services/api";

export default function PostDetails({portal="student"}) {
  const {id}=useParams();
  const navigate=useNavigate();
  const api=useApi();
  const {isAuthenticated}=useAuth0();
  const role=portal==="tutor"?"tutor":"student";
  const [post,setPost]=useState(null);
  const [comments,setComments]=useState([]);
  const [text,setText]=useState("");
  const [replyTo,setReplyTo]=useState(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    try{
      const r=await publicApi.get(`/posts/${id}`);
      setPost(r.data.post);
      setComments(Array.isArray(r.data.post?.comments)?r.data.post.comments:[]);
      setError("");
    }catch(e){setError(e.response?.data?.message||"Could not load post.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[id]);

  const ensure=()=>{
    if(isAuthenticated) return true;
    sessionStorage.setItem("post_auth_path",`/posts/${id}`);
    navigate("/login");
    return false;
  };

  const comment=async e=>{
    e.preventDefault();
    if(!ensure()||!text.trim()) return;
    try{
      await api.post(`/posts/${id}/comments?role=${role}`,{
        content:text.trim(),
        parent_comment_id:replyTo?.id||null
      });
      setText("");setReplyTo(null);await load();
    }catch(e){setError(e.response?.data?.message||"Could not add comment.");}
  };

  const remove=async c=>{
    try{
      await api.delete(`/posts/${id}/comments/${c.id}?role=${role}`);
      await load();
    }catch(e){setError(e.response?.data?.message||"Could not delete comment.");}
  };

  if(loading) return <div className="page-loader">Loading post…</div>;
  if(!post) return <><Header portal={portal}/><main className="feed-page"><div className="notice error">{error||"Post not found."}</div></main></>;

  return <>
    <Header portal={portal}/>
    <main className="post-details-page">
      <button className="back" onClick={()=>navigate(-1)}>← Back</button>
      {error && <div className="notice error">{error}</div>}
      <PostCard post={post} portal={portal} onChanged={load}/>

      <section className="panel comments-panel" id="comments">
        <div className="comments-heading">
          <div><span className="eyebrow">DISCUSSION</span><h2>{comments.filter(c=>!c.deleted_at).length} comments</h2></div>
          <span>Keep discussions respectful and learning-focused.</span>
        </div>

        {post.allow_comments ? <form className="comment-composer" onSubmit={comment}>
          {replyTo && <div className="replying-to">Replying to <b>{replyTo.user_name}</b><button type="button" onClick={()=>setReplyTo(null)}>×</button></div>}
          <textarea value={text} maxLength={1000} onChange={e=>setText(e.target.value)} placeholder="Add to the discussion…"/>
          <div><small>{text.length}/1000</small><button className="primary" disabled={!text.trim()}>Comment</button></div>
        </form> : <div className="notice">Comments are disabled for this post.</div>}

        <div className="comment-list">
          {!comments.length && <div className="feed-empty"><b>No comments yet.</b><span>Be the first to start a useful discussion.</span></div>}
          {comments.map(c=><article key={c.id} className={`comment-item ${c.parent_comment_id?"reply":""}`}>
            <ProfilePhoto src={c.user_image} name={c.user_name} size={38}/>
            <div>
              <div className="comment-meta">
                <b>{c.user_name||"Tutorly user"} {c.is_tutor && <em>Tutor</em>}</b>
                <span>{new Date(c.created_at).toLocaleString()}{c.edited_at?" · edited":""}</span>
              </div>
              <p>{c.deleted_at?<i>Comment deleted</i>:c.content}</p>
              {!c.deleted_at && <div className="comment-actions">
                <button onClick={()=>setReplyTo(c)}>Reply</button>
                <button onClick={()=>remove(c)}>Delete if mine</button>
              </div>}
            </div>
          </article>)}
        </div>
      </section>

      <section className="post-tutor-cta">
        <ProfilePhoto src={post.tutor_image} name={post.tutor_name} size={68} verified={!!post.tutor_verified}/>
        <div><span className="eyebrow">LIKE THIS TEACHING STYLE?</span><h3>{post.tutor_name}</h3><p>{post.tutor_title}</p></div>
        <button className="primary" onClick={()=>navigate(`/tutors/${post.tutor_id}`)}>View profile & message →</button>
      </section>
    </main>
    <Footer/>
  </>;
}
