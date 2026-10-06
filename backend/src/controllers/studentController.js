const express=require("express");
const checkJwt=require("../config/auth");
const studentService=require("../services/studentService");
const service=require("../services/marketplaceService");
const router=express.Router();
router.use(checkJwt);
const student=async(req)=>studentService.requireStudent(req.auth.payload);
const fail=(res,e)=>res.status(e.status||500).json({success:false,message:e.message||"Something went wrong"});


router.get("/me",async(req,res)=>{try{res.json({success:true,student:await student(req)});}catch(e){fail(res,e);}});
router.patch("/me",async(req,res)=>{try{const s=await student(req);res.json({success:true,student:await studentService.updateStudent(s.id,req.body)});}catch(e){fail(res,e);}});
router.post("/requests/:tutorId",async(req,res)=>{try{const s=await student(req);const request=await service.createConnectionRequest({studentId:s.id,tutorId:req.params.tutorId,courseId:req.body.course_id,message:req.body.message,preferredDay:req.body.preferred_day,preferredTime:req.body.preferred_time});res.status(201).json({success:true,request});}catch(e){fail(res,e);}});
router.get("/requests",async(req,res)=>{try{const s=await student(req);res.json({success:true,requests:await service.getStudentRequests(s.id)});}catch(e){fail(res,e);}});
router.patch("/requests/:id/cancel",async(req,res)=>{try{const s=await student(req);const request=await service.cancelRequest(s.id,req.params.id);if(!request)return res.status(404).json({success:false,message:"Pending request not found"});res.json({success:true,request});}catch(e){fail(res,e);}});
router.get("/favorites",async(req,res)=>{try{const s=await student(req);res.json({success:true,favorites:await service.getFavorites(s.id)});}catch(e){fail(res,e);}});
router.post("/favorites/:tutorId",async(req,res)=>{try{const s=await student(req);res.status(201).json({success:true,favorite:await service.addFavorite(s.id,req.params.tutorId)});}catch(e){fail(res,e);}});
router.delete("/favorites/:tutorId",async(req,res)=>{try{const s=await student(req);await service.removeFavorite(s.id,req.params.tutorId);res.json({success:true});}catch(e){fail(res,e);}});
router.get("/connections",async(req,res)=>{try{const s=await student(req);res.json({success:true,connections:await service.getStudentConnections(s.id)});}catch(e){fail(res,e);}});
router.post("/bookings",async(req,res)=>{try{const s=await student(req);const b=await service.createBooking({studentId:s.id,tutorId:req.body.tutor_id,courseId:req.body.course_id,start:req.body.scheduled_start,end:req.body.scheduled_end,notes:req.body.notes});res.status(201).json({success:true,booking:b});}catch(e){fail(res,e);}});
router.get("/bookings",async(req,res)=>{try{const s=await student(req);res.json({success:true,bookings:await service.getStudentBookings(s.id)});}catch(e){fail(res,e);}});
router.post("/reviews/:tutorId",async(req,res)=>{try{const s=await student(req);const review=await service.createReview({studentId:s.id,tutorId:req.params.tutorId,bookingId:req.body.booking_id,rating:req.body.rating,review:req.body.review});res.status(201).json({success:true,review});}catch(e){fail(res,e);}});
router.get("/notifications",async(req,res)=>{try{const s=await student(req);res.json({success:true,notifications:await service.getNotifications("student",s.id)});}catch(e){fail(res,e);}});
router.patch("/notifications/:id/read",async(req,res)=>{try{const s=await student(req);await service.markNotificationRead("student",s.id,req.params.id);res.json({success:true});}catch(e){fail(res,e);}});
module.exports=router;
