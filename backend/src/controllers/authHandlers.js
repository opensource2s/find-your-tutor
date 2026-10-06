const service = require("../services/authService");

const sendError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({ success: false,
    code: status === 500 ? "INTERNAL_ERROR" : error.code || "REQUEST_FAILED",
    message: status === 500 ? "Unable to process authentication. Please try again." : error.message });
};
const register = (role) => async (req, res) => {
  try {
    const result = await service.registerUser(
      role,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      role,
      [role]: result.profile,
    });

  } catch (error) {
    console.error("Registration error:", error);

    return sendError(res, error);
  }
};
const signin = async (req, res) => {
  try {
    const role = req.body?.role;
    const profile = await service.requireProfile(role, req.auth.payload);
    res.json({ success: true, authenticated: true, role, [role]: profile });
  } catch (error) { sendError(res, error); }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    await service.forgotPassword(email);

    return res.json({
      success: true,
      message:
        "If an account exists for this email, a password reset email has been sent.",
    });

  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return sendError(res, error);
  }
};

const me = async (req, res) => {
  try { res.json({ success: true, ...await service.getSession(req.auth.payload) }); }
  catch (error) { sendError(res, error); }
};
module.exports = { register, signin, me, forgotPassword };
