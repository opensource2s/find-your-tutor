const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { auth } = require("express-oauth2-jwt-bearer");
const db = require("../src/database/authDatabase");

test("public signup is token-free while signin/me require a valid JWT", async t => {
  process.env.AUTH0_DOMAIN = "tenant.example.test";
  process.env.AUTH0_M2M_CLIENT_ID = "client";
  process.env.AUTH0_M2M_CLIENT_SECRET = "secret";

  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format:"jwk" }), kid:"test-key", use:"sig", alg:"RS256" };
  const issuerApp = express();
  issuerApp.get("/jwks", (req,res)=>res.json({keys:[jwk]}));
  const issuerServer = await new Promise(resolve=>{const server=issuerApp.listen(0,"127.0.0.1",()=>resolve(server));});
  t.after(()=>new Promise(resolve=>issuerServer.close(resolve)));
  const issuer=`http://127.0.0.1:${issuerServer.address().port}/`;
  const audience="https://test-tutorly-api";
  const verifier=auth({issuer,jwksUri:`${issuer}jwks`,audience,tokenSigningAlg:"RS256"});
  const configPath=require.resolve("../src/config/auth");
  require.cache[configPath]={id:configPath,filename:configPath,loaded:true,exports:verifier};
  t.after(()=>{delete require.cache[configPath]});

  const app=express();app.use(express.json());app.use("/api/auth",require("../src/controllers/authController"));app.use((err,req,res,next)=>res.status(err.status||401).json({success:false}));
  const server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const token=()=>jwt.sign({sub:"auth0|test"},privateKey,{algorithm:"RS256",keyid:"test-key",issuer,audience,expiresIn:"5m"});
  const post=(path,body,bearer)=>fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(bearer?{Authorization:`Bearer ${bearer}`}:{})},body:JSON.stringify(body)});

  t.mock.method(db,"findAnyProfileByEmail",async()=>null);
  t.mock.method(db,"createProfile",async(role,values)=>({id:`${role}-id`,...values}));
  t.mock.method(db,"findProfile",async(role)=>role==="student"?{id:"student-id",auth0_id:"auth0|test",is_active:true}:null);

  const realFetch=global.fetch;
  t.mock.method(global,"fetch",async(url,options={})=>{
    if(String(url).endsWith("/oauth/token"))return{ok:true,json:async()=>({access_token:"management"})};
    if(String(url).endsWith("/api/v2/users"))return{ok:true,status:201,json:async()=>({user_id:"auth0|created"})};
    return realFetch(url,options);
  });

  const signup=await post("/api/auth/register/student",{name:"HTTP Learner",email:"http@example.test",password:"Tutorly@123",mobile:"+919876543210",country:"India",timezone:"Asia/Kolkata",preferred_languages:["English"]});
  assert.equal(signup.status,201);

  const noToken=await post("/api/auth/signin",{role:"student"});
  assert.equal(noToken.status,401);
  const signedIn=await post("/api/auth/signin",{role:"student"},token());
  assert.equal(signedIn.status,200);
  assert.equal((await signedIn.json()).student.id,"student-id");
});
