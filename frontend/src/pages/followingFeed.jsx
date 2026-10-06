import { useEffect,useState } from "react";
import Header from "../components/header";
import PostCard from "../components/postCard";
import { useApi } from "../services/api";

export default function FollowingFeed(){
 const api=useApi();const [posts,setPosts]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const load=async()=>{try{const r=await api.get("/follows/me/feed");setPosts(r.data.posts||[]);setError("");}catch(e){setError(e.response?.data?.message||"Could not load following feed.");}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 return <><Header/><main className="feed-page"><section className="feed-hero following-hero"><span className="eyebrow">FOLLOWING FEED</span><h1>New lessons from tutors <em>you follow.</em></h1><p>This feed contains only posts from tutors you chose to follow.</p></section>{error&&<div className="notice error">{error}</div>}{loading&&<div className="panel">Loading your feed…</div>}{!loading&&!posts.length&&<div className="panel feed-empty"><b>Your following feed is empty.</b><span>Follow tutors to see their future posts here.</span></div>}<section className="feed-stream saved-feed">{posts.map(p=><PostCard key={p.id} post={p} onChanged={load}/>)}</section></main></>;
}
