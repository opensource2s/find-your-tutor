import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import PostCard from "../components/postCard";
import { publicApi } from "../services/api";

export default function Feed({portal="student"}) {
  const [params] = useSearchParams();
  const tutorId = params.get("tutor_id") || "";
  const [posts,setPosts]=useState([]);
  const [courses,setCourses]=useState([]);
  const [filters,setFilters]=useState({q:"",course_id:"",post_type:"",sort:"latest"});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async(next=filters)=>{
    setLoading(true);setError("");
    try{
      const requestParams=Object.fromEntries(Object.entries(next).filter(([,v])=>v!==""));
      if (tutorId) requestParams.tutor_id = tutorId;
      const r=await publicApi.get("/posts",{params:requestParams});
      setPosts(Array.isArray(r.data.posts)?r.data.posts:[]);
    }catch(e){
      setPosts([]);
      setError(e.response?.data?.message||"Could not load tutor posts.");
    }finally{setLoading(false);}
  };

  useEffect(()=>{
    load();
    publicApi.get("/tutors/meta/courses").then(r=>setCourses(r.data.courses||[])).catch(()=>{});
  },[tutorId]);

  const change=e=>setFilters(f=>({...f,[e.target.name]:e.target.value}));
  const search=e=>{e.preventDefault();load(filters);};

  return <>
    <Header portal={portal}/>
    <main className="feed-page">
      <section className="feed-hero">
        <span className="eyebrow">{tutorId ? "TUTOR POSTS" : "TUTOR FEED"}</span>
        <h1>Learn from tutors <em>before</em> you book.</h1>
        <p>Teaching tips, lesson notes, questions and course updates from Tutorly instructors. Discover how a tutor explains concepts, then open their profile, message them or send a connection request.</p>
      </section>

      <form className="feed-filter-bar" onSubmit={search}>
        <input name="q" value={filters.q} onChange={change} placeholder="Search posts, tutors or topics…"/>
        <select name="course_id" value={filters.course_id} onChange={change}>
          <option value="">All subjects</option>
          {courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="post_type" value={filters.post_type} onChange={change}>
          <option value="">All post types</option>
          <option value="teaching_tip">Teaching tips</option>
          <option value="lesson_note">Lesson notes</option>
          <option value="question">Questions</option>
          <option value="course_update">Course updates</option>
          <option value="availability">Availability</option>
          <option value="announcement">Announcements</option>
        </select>
        <select name="sort" value={filters.sort} onChange={change}>
          <option value="latest">Latest</option>
          <option value="popular">Popular</option>
        </select>
        <button className="primary">Search posts</button>
      </form>

      <div className="feed-layout">
        <section className="feed-stream">
          {error && <div className="notice error">{error}</div>}
          {loading && <div className="panel">Loading tutor posts…</div>}
          {!loading && !posts.length && <div className="panel feed-empty">
            <b>No tutor posts match these filters.</b>
            <span>Tutors can publish their first post from Tutor Portal → My Posts.</span>
          </div>}
          {!loading && posts.map(post=><PostCard key={post.id} post={post} portal={portal}/>)}
        </section>

        <aside className="feed-sidebar">
          <div className="panel sticky">
            <span className="eyebrow">WHY THE FEED?</span>
            <h3>Choose tutors by how they teach.</h3>
            <p>Search profiles for qualifications. Use posts to understand a tutor's explanation style and subject knowledge.</p>
            <div className="feed-guide">
              <span><b>1</b> Read a useful post</span>
              <span><b>2</b> Open the tutor profile</span>
              <span><b>3</b> Message or connect</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
    <Footer/>
  </>;
}
