const db=require("../database/followerDatabase");
const auth=require("./authService");
const fail=(message,status=400)=>Object.assign(new Error(message),{status});

const student=claims=>auth.requireProfile("student",claims);
const tutor=claims=>auth.requireProfile("tutor",claims);

const getPublicSocial=async tutorId=>{
  const state=await db.getTutorSocial(tutorId,null);
  if(!state) throw fail("Tutor not found",404);
  return state;
};
const getState=async(claims,tutorId)=>{
  const s=await student(claims); const state=await db.getTutorSocial(tutorId,s.id);
  if(!state) throw fail("Tutor not found",404); return state;
};
const follow=async(claims,tutorId)=>{const s=await student(claims);return db.follow(tutorId,s.id);};
const unfollow=async(claims,tutorId)=>{const s=await student(claims);return db.unfollow(tutorId,s.id);};
const notifications=async(claims,tutorId,enabled)=>{const s=await student(claims);const row=await db.setNotifications(tutorId,s.id,enabled);if(!row)throw fail("Follow this tutor first",409);return row;};
const following=async claims=>{const s=await student(claims);return db.getFollowingTutors(s.id);};
const followingFeed=async(claims,q)=>{const s=await student(claims);return db.getFollowingFeed(s.id,q);};
const followers=async claims=>{const t=await tutor(claims);return db.getFollowers(t.id);};
module.exports={getPublicSocial,getState,follow,unfollow,notifications,following,followingFeed,followers};
