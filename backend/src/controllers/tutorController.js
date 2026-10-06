const express=require("express");
const tutorService=require("../services/tutorService");
const router=express.Router();

router.get("/meta/courses",async(req,res)=>{try{res.json({success:true,courses:await tutorService.getCourses()});}catch(e){res.status(500).json({success:false,message:"Failed to load courses"});}});
router.get("/meta/countries",async(req,res)=>{try{res.json({success:true,countries:(await tutorService.getCountries()).map(x=>x.country)});}catch(e){res.status(500).json({success:false,message:"Failed to load countries"});}});
router.get("/",async(req,res)=>{try{res.json({success:true,tutors:await tutorService.getAllTutors(req.query)});}catch(e){console.error("Tutor search error",e);res.status(500).json({success:false,message:"Failed to fetch tutors"});}});
router.get("/:id",async(req,res)=>{try{const tutor=await tutorService.getTutorById(req.params.id);if(!tutor)return res.status(404).json({success:false,message:"Tutor not found"});res.json({success:true,tutor});}catch(e){console.error(e);res.status(500).json({success:false,message:"Failed to fetch tutor"});}});
module.exports=router;
