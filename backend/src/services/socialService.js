const db=require("../database/socialDatabase");
const auth=require("./authService");
const followerDb=require("../database/followerDatabase");

const appError=(message,status=400)=>Object.assign(new Error(message),{status});
const postTypes=new Set(["teaching_tip","lesson_note","question","course_update","availability","announcement"]);
const mediaTypes=new Set(["none","image","video","link"]);
const statuses=new Set(["draft","published","archived"]);

const requirePrincipal=async(claims,role)=>{
  if(!["student","tutor"].includes(role)) throw appError("role must be student or tutor",400);
  const profile=await auth.requireProfile(role,claims);
  return {type:role,id:profile.id,profile};
};

const cleanUrl=(value,field)=>{
  if(value==null||String(value).trim()==="") return null;
  try{
    const url=new URL(String(value).trim());
    if(!["http:","https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  }catch{throw appError(`${field} must be a valid http/https URL`);}
};

const cleanTags=value=>{
  const raw=Array.isArray(value)?value:String(value||"").split(",");
  return [...new Set(raw.map(x=>String(x).trim().replace(/^#/,"")).filter(Boolean))].slice(0,12);
};

const validatePost=values=>{
  const title=String(values.title||"").trim();
  const content=String(values.content||"").trim();
  const post_type=values.post_type||"teaching_tip";
  const media_type=values.media_type||"none";
  const status=values.status||"published";

  if(title.length<3||title.length>180) throw appError("Post title must be between 3 and 180 characters");
  if(content.length<10||content.length>10000) throw appError("Post content must be between 10 and 10000 characters");
  if(!postTypes.has(post_type)) throw appError("Invalid post type");
  if(!mediaTypes.has(media_type)) throw appError("Invalid media type");
  if(!statuses.has(status)) throw appError("Invalid post status");

  const media_url=cleanUrl(values.media_url,"Media URL");
  const link_url=cleanUrl(values.link_url,"Link URL");
  if(["image","video"].includes(media_type)&&!media_url) throw appError("Media URL is required for image/video posts");
  if(media_type==="link"&&!link_url) throw appError("Link URL is required for link posts");

  return {
    course_id:values.course_id||null,
    title,content,post_type,media_type,media_url,link_url,
    tags:cleanTags(values.tags),
    status,
    allow_comments:values.allow_comments!==false
  };
};

const getFeed=(query={})=>db.getFeed({
  q:query.q,
  courseId:query.course_id,
  tutorId:query.tutor_id,
  postType:query.post_type,
  sort:query.sort,
  limit:query.limit,
  offset:query.offset
});

const getPost=async id=>{
  const post=await db.getPostById(id);
  if(!post) throw appError("Post not found",404);
  db.incrementView(id).catch(()=>{});
  return {...post,comments:await db.getComments(id)};
};

const interact=async(action,{claims,role,postId,commentId,body})=>{
  const principal=await requirePrincipal(claims,role);
  if(action==="like") return {like_count:await db.likePost(postId,principal.type,principal.id),liked:true};
  if(action==="unlike") return {like_count:await db.unlikePost(postId,principal.type,principal.id),liked:false};
  if(action==="comment"){
    const content=String(body.content||"").trim();
    if(!content||content.length>1000) throw appError("Comment must be between 1 and 1000 characters");
    const comment=await db.addComment(postId,principal.type,principal.id,content,body.parent_comment_id||null);
    if(!comment) throw appError("Post not found",404);
    return comment;
  }
  if(action==="editComment"){
    const content=String(body.content||"").trim();
    if(!content||content.length>1000) throw appError("Comment must be between 1 and 1000 characters");
    const comment=await db.updateComment(commentId,principal.type,principal.id,content);
    if(!comment) throw appError("Comment not found or you cannot edit it",404);
    return comment;
  }
  if(action==="deleteComment"){
    if(!await db.deleteComment(commentId,principal.type,principal.id)) throw appError("Comment not found or you cannot delete it",404);
    return true;
  }
  if(action==="save"){
    if(principal.type!=="student") throw appError("Only students can save tutor posts",403);
    await db.savePost(postId,principal.id); return {saved:true};
  }
  if(action==="unsave"){
    if(principal.type!=="student") throw appError("Only students can save tutor posts",403);
    await db.unsavePost(postId,principal.id); return {saved:false};
  }
  throw appError("Unsupported social action");
};

const getViewerState=async(claims,role,postId)=>{
  const principal=await requirePrincipal(claims,role);
  return db.getViewerState(postId,principal.type,principal.id);
};

const getSavedPosts=async claims=>{
  const principal=await requirePrincipal(claims,"student");
  return db.getSavedPosts(principal.id);
};

const tutorPosts=async(claims)=> {
  const p=await requirePrincipal(claims,"tutor");
  return db.getTutorPosts(p.id);
};

const tutorPost=async(claims,id)=>{
  const p=await requirePrincipal(claims,"tutor");
  const post=await db.getTutorPost(p.id,id);
  if(!post) throw appError("Post not found",404);
  return post;
};

const createTutorPost=async(claims,values)=>{
  const p=await requirePrincipal(claims,"tutor");
  const post=await db.createTutorPost(p.id,validatePost(values));
  if(post.status==="published") await followerDb.notifyFollowersOfPost(p.id,post.id,post.title);
  return post;
};

const updateTutorPost=async(claims,id,values)=>{
  const p=await requirePrincipal(claims,"tutor");
  const existing=await db.getTutorPost(p.id,id);
  if(!existing) throw appError("Post not found",404);
  const post=await db.updateTutorPost(p.id,id,validatePost({...existing,...values}));
  if(!post) throw appError("Post not found",404);
  if(existing.status!=="published" && post.status==="published") await followerDb.notifyFollowersOfPost(p.id,post.id,post.title);
  return post;
};

const deleteTutorPost=async(claims,id)=>{
  const p=await requirePrincipal(claims,"tutor");
  if(!await db.deleteTutorPost(p.id,id)) throw appError("Post not found",404);
  return true;
};

module.exports={
  getFeed,getPost,interact,getViewerState,getSavedPosts,
  tutorPosts,tutorPost,createTutorPost,updateTutorPost,deleteTutorPost
};
