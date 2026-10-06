const express=require("express");
const cors=require("cors");
require("dotenv").config();
const {AppDataSource,connectDB}=require("./config/db");
const authController=require("./controllers/authController");
const tutorController=require("./controllers/tutorController");
const studentController=require("./controllers/studentController");
const tutorPortalController=require("./controllers/tutorPortalController");
const chatController=require("./controllers/chatController");
const socialController=require("./controllers/socialController");
const followerController=require("./controllers/followerController");

const app=express();
app.use(cors({origin:process.env.FRONTEND_URL||"http://localhost:5173",credentials:true}));
app.use(express.json({limit:"1mb"}));
app.use((req,res,next)=>{res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("X-Frame-Options","DENY");next();});

app.use("/api/auth",authController);
app.use("/api/tutors",tutorController);
app.use("/api/student",studentController);
app.use("/api/tutor-portal",tutorPortalController);
app.use("/api/chat",chatController);
app.use("/api/posts",socialController);
app.use("/api/follows",followerController);
app.get("/api/health",async(req,res)=>{try{const [row]=await AppDataSource.query("SELECT current_database(), NOW()");res.json({success:true,database:row.current_database,time:row.now,service:"Tutorly API"});}catch(e){res.status(500).json({success:false,message:"Database connection failed"});}});
app.use((req,res)=>res.status(404).json({success:false,message:"API route not found"}));

app.use((error,req,res,next)=>{
  console.error(error);
  const status=error.status||error.statusCode||500;
  if(status===401){
    return res.status(401).json({success:false,code:"AUTH_TOKEN_REQUIRED_OR_INVALID",message:"A valid Auth0 access token is required for this endpoint."});
  }
  if(status===400 && (error.name==="InvalidRequestError" || error.name==="InvalidTokenError")){
    return res.status(400).json({success:false,code:"INVALID_AUTHORIZATION_HEADER",message:"Authorization header must be: Bearer <valid Auth0 access token>."});
  }
  res.status(status).json({success:false,message:error.message||"Internal server error"});
});

const PORT=process.env.PORT||5000;
connectDB().then(()=>app.listen(PORT,()=>console.log(`✅ Tutorly API running on http://localhost:${PORT}`)));
