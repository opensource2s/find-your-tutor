import { useEffect, useState } from "react";
import Header from "../components/header";
import PostCard from "../components/postCard";
import { useApi } from "../services/api";

export default function SavedPosts(){
  const api=useApi();
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async()=>{
    try{
      const r=await api.get("/posts/saved/me");
      setPosts(r.data.posts||[]);
      setError("");
    }catch(e){setError(e.response?.data?.message||"Could not load saved posts.");}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  return <>
    <Header/>
    <main className="feed-page">
      <section className="section-title">
        <div><span className="eyebrow">YOUR LIBRARY</span><h1>Saved tutor posts</h1><p>Keep useful tutor explanations and resources for later.</p></div>
      </section>
      {error && <div className="notice error">{error}</div>}
      {loading && <div className="panel">Loading saved posts…</div>}
      {!loading&&!posts.length&&<div className="panel feed-empty"><b>No saved posts yet.</b><span>Open Tutor Feed and save posts you want to revisit.</span></div>}
      <section className="feed-stream saved-feed">{posts.map(p=><PostCard key={p.id} post={p} onChanged={load}/>)}</section>
    </main>
  </>;
}
