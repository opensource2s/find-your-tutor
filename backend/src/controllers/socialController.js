const express=require("express");
const checkJwt=require("../config/auth");
const service=require("../services/socialService");
const router=express.Router();

const fail=(res,e)=>res.status(e.status||500).json({success:false,message:e.message||"Something went wrong"});
const role=req=>req.query.role||req.body?.role;

router.get("/",async(req,res)=>{try{res.json({success:true,posts:await service.getFeed(req.query)});}catch(e){fail(res,e);}});
router.get("/saved/me",checkJwt,async(req,res)=>{try{res.json({success:true,posts:await service.getSavedPosts(req.auth.payload)});}catch(e){fail(res,e);}});
router.get("/:id",async(req,res)=>{try{res.json({success:true,post:await service.getPost(req.params.id)});}catch(e){fail(res,e);}});
router.get("/:id/viewer",checkJwt,async(req,res)=>{try{res.json({success:true,state:await service.getViewerState(req.auth.payload,role(req),req.params.id)});}catch(e){fail(res,e);}});

router.post("/:id/like",checkJwt,async(req,res)=>{try{res.json({success:true,...await service.interact("like",{claims:req.auth.payload,role:role(req),postId:req.params.id,body:req.body||{}})});}catch(e){fail(res,e);}});
router.delete("/:id/like",checkJwt,async(req,res)=>{try{res.json({success:true,...await service.interact("unlike",{claims:req.auth.payload,role:role(req),postId:req.params.id,body:req.body||{}})});}catch(e){fail(res,e);}});
router.post("/:id/save",checkJwt,async(req,res)=>{try{res.json({success:true,...await service.interact("save",{claims:req.auth.payload,role:"student",postId:req.params.id,body:req.body||{}})});}catch(e){fail(res,e);}});
router.delete("/:id/save",checkJwt,async(req,res)=>{try{res.json({success:true,...await service.interact("unsave",{claims:req.auth.payload,role:"student",postId:req.params.id,body:req.body||{}})});}catch(e){fail(res,e);}});

router.post("/:id/comments",checkJwt,async(req,res)=>{try{res.status(201).json({success:true,comment:await service.interact("comment",{claims:req.auth.payload,role:role(req),postId:req.params.id,body:req.body||{}})});}catch(e){fail(res,e);}});
router.patch("/:id/comments/:commentId",checkJwt,async(req,res)=>{try{res.json({success:true,comment:await service.interact("editComment",{claims:req.auth.payload,role:role(req),postId:req.params.id,commentId:req.params.commentId,body:req.body||{}})});}catch(e){fail(res,e);}});
router.delete("/:id/comments/:commentId",checkJwt,async(req,res)=>{try{await service.interact("deleteComment",{claims:req.auth.payload,role:role(req),postId:req.params.id,commentId:req.params.commentId,body:{}});res.json({success:true});}catch(e){fail(res,e);}});

module.exports=router;
