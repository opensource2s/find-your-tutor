const express=require("express");
const checkJwt=require("../config/auth");
const service=require("../services/followerService");
const router=express.Router();
const send=(res,e)=>res.status(e.status||500).json({success:false,message:e.message||"Something went wrong"});

router.get("/tutors/:id",async(req,res)=>{try{res.json({success:true,social:await service.getPublicSocial(req.params.id)});}catch(e){send(res,e);}});
router.get("/tutors/:id/state",checkJwt,async(req,res)=>{try{res.json({success:true,social:await service.getState(req.auth.payload,req.params.id)});}catch(e){send(res,e);}});
router.post("/tutors/:id",checkJwt,async(req,res)=>{try{res.status(201).json({success:true,social:await service.follow(req.auth.payload,req.params.id)});}catch(e){send(res,e);}});
router.delete("/tutors/:id",checkJwt,async(req,res)=>{try{res.json({success:true,social:await service.unfollow(req.auth.payload,req.params.id)});}catch(e){send(res,e);}});
router.patch("/tutors/:id/notifications",checkJwt,async(req,res)=>{try{res.json({success:true,follow:await service.notifications(req.auth.payload,req.params.id,req.body?.enabled)});}catch(e){send(res,e);}});
router.get("/me/tutors",checkJwt,async(req,res)=>{try{res.json({success:true,tutors:await service.following(req.auth.payload)});}catch(e){send(res,e);}});
router.get("/me/feed",checkJwt,async(req,res)=>{try{res.json({success:true,posts:await service.followingFeed(req.auth.payload,req.query)});}catch(e){send(res,e);}});
router.get("/me/followers",checkJwt,async(req,res)=>{try{res.json({success:true,followers:await service.followers(req.auth.payload)});}catch(e){send(res,e);}});
module.exports=router;
