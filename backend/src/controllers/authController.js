const express = require("express");
const checkJwt = require("../config/auth");
const handlers = require("./authHandlers");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

// Authentication information
router.get("/methods", (req, res) => {
  return res.json({
    success: true,
    signup: "email_password",
    login_methods: [
      "email_password",
      "email_otp"
    ],
    profile_registration_requires_access_token: false
  });
});

// Public registration
router.post(
  "/register/student",
  handlers.register("student")
);

router.post(
  "/register/tutor",
  handlers.register("tutor")
);


router.post(
  "/forgot-password",
  handlers.forgotPassword
);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/

router.use(checkJwt);

// Test JWT
router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "JWT authentication working successfully",
    sub: req.auth.payload.sub
  });
});

// Login/profile verification
router.post(
  "/signin",
  handlers.signin
);

// Logged-in user
router.get(
  "/me",
  handlers.me
);

module.exports = router;