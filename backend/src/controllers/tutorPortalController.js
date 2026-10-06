const express=require("express");
const checkJwt=require("../config/auth");
const service=require("../services/tutorPortalService");
const marketplace=require("../services/marketplaceService");
const social=require("../services/socialService");
const router=express.Router(); router.use(checkJwt);
const fail=(res,e)=>res.status(e.status||500).json({success:false,message:e.message||"Something went wrong"});
const requireTutor=req=>require("../services/authService").requireProfile("tutor",req.auth.payload);

router.get("/me",async(req,res)=>{try{res.json({success:true,tutor:await requireTutor(req)});}catch(e){fail(res,e);}});
router.patch("/me",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,tutor:await service.updateTutor(t.id,req.body)});}catch(e){fail(res,e);}});
router.get("/courses",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,courses:await service.getTutorCourses(t.id)});}catch(e){fail(res,e);}});
router.put("/courses",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,courses:await service.setTutorCourses(t.id,req.body.course_ids||[])});}catch(e){fail(res,e);}});
router.get("/profile-readiness",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,readiness:await service.getProfileReadiness(t.id)});}catch(e){fail(res,e);}});
router.post("/publish",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,tutor:await service.publishProfile(t.id)});}catch(e){fail(res,e);}});
router.post("/unpublish",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,tutor:await service.unpublishProfile(t.id)});}catch(e){fail(res,e);}});
router.get("/dashboard",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,dashboard:await service.getDashboard(t.id)});}catch(e){fail(res,e);}});
router.get("/requests",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,requests:await service.getRequests(t.id)});}catch(e){fail(res,e);}});
router.patch("/requests/:id",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,request:await service.updateRequestStatus(t.id,req.params.id,req.body.status)});}catch(e){fail(res,e);}});
router.get("/students",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,students:await service.getConnections(t.id)});}catch(e){fail(res,e);}});
router.get("/availability",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,availability:await service.getAvailability(t.id)});}catch(e){fail(res,e);}});
router.post("/availability",async(req,res)=>{try{const t=await requireTutor(req);res.status(201).json({success:true,availability:await service.addAvailability(t.id,req.body)});}catch(e){fail(res,e);}});
router.delete("/availability/:id",async(req,res)=>{try{const t=await requireTutor(req);await service.removeAvailability(t.id,req.params.id);res.json({success:true});}catch(e){fail(res,e);}});
router.get("/bookings",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,bookings:await service.getBookings(t.id)});}catch(e){fail(res,e);}});
router.patch("/bookings/:id",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,booking:await service.updateBookingStatus(t.id,req.params.id,req.body.status,req.body.meeting_url)});}catch(e){fail(res,e);}});
router.get("/notifications",async(req,res)=>{try{const t=await requireTutor(req);res.json({success:true,notifications:await marketplace.getNotifications("tutor",t.id)});}catch(e){fail(res,e);}});
router.patch("/notifications/:id/read",async(req,res)=>{try{const t=await requireTutor(req);await marketplace.markNotificationRead("tutor",t.id,req.params.id);res.json({success:true});}catch(e){fail(res,e);}});

router.get("/posts",async(req,res)=>{try{res.json({success:true,posts:await social.tutorPosts(req.auth.payload)});}catch(e){fail(res,e);}});
router.get("/posts/:id",async(req,res)=>{try{res.json({success:true,post:await social.tutorPost(req.auth.payload,req.params.id)});}catch(e){fail(res,e);}});
router.post("/posts",async(req,res)=>{try{res.status(201).json({success:true,post:await social.createTutorPost(req.auth.payload,req.body)});}catch(e){fail(res,e);}});
router.patch("/posts/:id",async(req,res)=>{try{res.json({success:true,post:await social.updateTutorPost(req.auth.payload,req.params.id,req.body)});}catch(e){fail(res,e);}});
router.delete("/posts/:id",async(req,res)=>{try{await social.deleteTutorPost(req.auth.payload,req.params.id);res.json({success:true});}catch(e){fail(res,e);}});

module.exports=router;
