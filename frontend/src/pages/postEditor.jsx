import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/header";
import { publicApi, useApi } from "../services/api";

const initial={
  title:"",content:"",post_type:"teaching_tip",course_id:"",
  media_type:"none",media_url:"",link_url:"",tags:"",
  status:"published",allow_comments:true
};

export default function PostEditor(){
  const {id}=useParams();
  const editing=!!id;
  const api=useApi();
  const navigate=useNavigate();
  const [form,setForm]=useState(initial);
  const [courses,setCourses]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    publicApi.get("/tutors/meta/courses").then(r=>setCourses(r.data.courses||[])).catch(()=>{});
    if(editing){
      api.get(`/tutor-portal/posts/${id}`).then(r=>{
        const p=r.data.post;
        setForm({
          title:p.title||"",content:p.content||"",post_type:p.post_type||"teaching_tip",
          course_id:p.course_id||"",media_type:p.media_type||"none",
          media_url:p.media_url||"",link_url:p.link_url||"",
          tags:(p.tags||[]).join(", "),status:p.status||"published",
          allow_comments:p.allow_comments!==false
        });
      }).catch(e=>setError(e.response?.data?.message||"Could not load post."));
    }
  },[id]);

  const change=e=>{
    const {name,type,checked,value}=e.target;
    setForm(f=>({...f,[name]:type==="checkbox"?checked:value}));
  };

  const submit=async e=>{
    e.preventDefault();setBusy(true);setError("");
    const payload={...form,tags:form.tags.split(",").map(x=>x.trim()).filter(Boolean),course_id:form.course_id||null};
    try{
      if(editing) await api.patch(`/tutor-portal/posts/${id}`,payload);
      else await api.post("/tutor-portal/posts",payload);
      navigate("/tutor/posts");
    }catch(e){setError(e.response?.data?.message||"Could not save post.");}
    finally{setBusy(false);}
  };

  return <>
    <Header portal="tutor"/>
    <main className="post-editor-page">
      <button className="back" onClick={()=>navigate("/tutor/posts")}>← My Posts</button>
      <section className="post-editor-grid">
        <form className="panel post-editor-form" onSubmit={submit}>
          <span className="eyebrow">{editing?"EDIT POST":"CREATE POST"}</span>
          <h1>{editing?"Update your post":"Share something useful"}</h1>
          <p>Posts should help students learn or understand your teaching style. Avoid unrelated promotional content.</p>
          {error && <div className="notice error">{error}</div>}

          <label>Post type<select name="post_type" value={form.post_type} onChange={change}>
            <option value="teaching_tip">Teaching tip</option>
            <option value="lesson_note">Lesson note</option>
            <option value="question">Question</option>
            <option value="course_update">Course update</option>
            <option value="availability">Availability</option>
            <option value="announcement">Announcement</option>
          </select></label>

          <label>Subject / course<select name="course_id" value={form.course_id} onChange={change}>
            <option value="">General learning</option>
            {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>

          <label>Title *<input name="title" maxLength={180} required value={form.title} onChange={change} placeholder="3 mistakes beginners make with C pointers"/></label>
          <label>Post content *<textarea name="content" maxLength={10000} required value={form.content} onChange={change} placeholder="Explain the idea clearly and give students something useful to learn…"/></label>

          <div className="form-grid">
            <label>Media type<select name="media_type" value={form.media_type} onChange={change}>
              <option value="none">No media</option>
              <option value="image">Image URL</option>
              <option value="video">Video URL</option>
              <option value="link">External resource</option>
            </select></label>
            <label>Status<select name="status" value={form.status} onChange={change}>
              <option value="published">Publish now</option>
              <option value="draft">Save draft</option>
              <option value="archived">Archive</option>
            </select></label>
          </div>

          {(form.media_type==="image"||form.media_type==="video") && <label>Media URL<input name="media_url" type="url" value={form.media_url} onChange={change} placeholder="https://..."/></label>}
          {form.media_type==="link" && <label>Resource URL<input name="link_url" type="url" value={form.link_url} onChange={change} placeholder="https://..."/></label>}

          <label>Tags<input name="tags" value={form.tags} onChange={change} placeholder="CProgramming, Pointers, Beginners"/></label>
          <label className="checkbox-line"><input name="allow_comments" type="checkbox" checked={form.allow_comments} onChange={change}/> Allow students and tutors to comment</label>

          <button className="primary wide" disabled={busy}>{busy?"Saving…":editing?"Save changes":"Publish post"}</button>
        </form>

        <aside className="panel post-editor-help">
          <span className="eyebrow">GOOD TUTOR CONTENT</span>
          <h3>Posts should demonstrate expertise.</h3>
          <div className="editor-tips">
            <span><b>Teaching tip</b>Explain one concept students commonly struggle with.</span>
            <span><b>Lesson note</b>Share a mini lesson with an example.</span>
            <span><b>Question</b>Start a subject discussion.</span>
            <span><b>Course update</b>Tell students what you are currently teaching.</span>
            <span><b>Availability</b>Share newly opened teaching slots.</span>
          </div>
        </aside>
      </section>
    </main>
  </>;
}
