const db = require("../database/authDatabase");
const { validateRegistration } = require("./registrationValidation");

const failure = (status, code, message) =>
  Object.assign(new Error(message), {
    status,
    code,
  });

const validateRole = (role) => {
  if (!["student", "tutor"].includes(role)) {
    throw failure(
      400,
      "INVALID_ROLE",
      "Choose student or tutor."
    );
  }
};

const subject = (claims) => {
  if (
    typeof claims?.sub !== "string" ||
    !claims.sub ||
    claims.sub.endsWith("@clients")
  ) {
    throw failure(
      401,
      "USER_TOKEN_REQUIRED",
      "Sign in through Auth0 with a user account."
    );
  }

  return claims.sub;
};

const assertActive = (profile) => {
  if (profile && !profile.is_active) {
    throw failure(
      403,
      "ACCOUNT_DISABLED",
      "This profile is disabled. Contact support."
    );
  }
};

const safeProfile = (profile) => {
  if (!profile) {
    return null;
  }

  const {
    password_hash,
    ...safe
  } = profile;

  return safe;
};


/*
|--------------------------------------------------------------------------
| AUTH0 MANAGEMENT API TOKEN
|--------------------------------------------------------------------------
*/

async function getManagementToken() {
  let response;

  try {
    response = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          client_id:
            process.env.AUTH0_M2M_CLIENT_ID,

          client_secret:
            process.env.AUTH0_M2M_CLIENT_SECRET,

          audience:
            `https://${process.env.AUTH0_DOMAIN}/api/v2/`,

          grant_type:
            "client_credentials",
        }),

        signal:
          AbortSignal.timeout(5000),
      }
    );
  } catch (error) {
    console.error(
      "Auth0 management token error:",
      error
    );

    throw failure(
      502,
      "AUTH0_UNAVAILABLE",
      "Unable to contact Auth0."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Auth0 token response:",
      data
    );

    throw failure(
      502,
      "AUTH0_TOKEN_FAILED",
      "Unable to authenticate with Auth0 Management API."
    );
  }

  return data.access_token;
}


/*
|--------------------------------------------------------------------------
| CREATE AUTH0 USER
|--------------------------------------------------------------------------
*/

async function createAuth0User({
  name,
  email,
  password,
}) {
  const managementToken =
    await getManagementToken();

  let response;

  try {
    response = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${managementToken}`,
        },

        body: JSON.stringify({
          connection:
            process.env.AUTH0_DB_CONNECTION ||
            "Username-Password-Authentication",

          email,

          password,

          name,

          // Some Auth0 database connections require a username. Tutorly does not
          // expose it to users; it is generated only for Auth0 compatibility.
          username: `${email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) || "user"}_${Date.now().toString(36).slice(-5)}`,

          email_verified: false,

          verify_email: process.env.AUTH0_SEND_VERIFICATION_EMAIL !== "false",
        }),

        signal:
          AbortSignal.timeout(5000),
      }
    );
  } catch (error) {
    console.error(
      "Create Auth0 user error:",
      error
    );

    throw failure(
      502,
      "AUTH0_UNAVAILABLE",
      "Unable to create Auth0 account."
    );
  }

  const user = await response.json();

  if (!response.ok) {
    console.error(
      "Auth0 create user response:",
      user
    );

    if (
      response.status === 409 ||
      user?.message
        ?.toLowerCase()
        .includes("already exists")
    ) {
      throw failure(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists."
      );
    }

    throw failure(
      response.status >= 400 &&
      response.status < 500
        ? 400
        : 502,

      "AUTH0_USER_CREATION_FAILED",

      user?.message ||
        "Unable to create Auth0 user."
    );
  }

  return user;
}


async function deleteAuth0User(userId) {
  if (!userId) return;
  try {
    const managementToken = await getManagementToken();
    await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${managementToken}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Auth0 compensation delete failed:", error);
  }
}

/*
|--------------------------------------------------------------------------
| PUBLIC REGISTRATION
|--------------------------------------------------------------------------
*/

async function registerUser(
  role,
  values
) {
  validateRole(role);

  const {
    name,
    email,
    password,
    mobile,
  } = values || {};

  if (!name?.trim()) {
    throw failure(
      400,
      "NAME_REQUIRED",
      "Name is required."
    );
  }

  if (!email?.trim()) {
    throw failure(
      400,
      "EMAIL_REQUIRED",
      "Email is required."
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw failure(400, "INVALID_EMAIL", "Enter a valid email address.");
  }

  if (!password) {
    throw failure(
      400,
      "PASSWORD_REQUIRED",
      "Password is required."
    );
  }

  if (password.length < 9) {
    throw failure(
      400,
      "WEAK_PASSWORD",
      "Password must contain at least 9 characters."
    );
  }

  /*
   * Use your existing validation for
   * application-specific fields.
   *
   * Do not send password to PostgreSQL.
   */

  const registrationValues = {
    ...values,
  };

  delete registrationValues.password;
  delete registrationValues.confirmPassword;
  delete registrationValues.confirm_password;

  const clean =
    validateRegistration(
      registrationValues,
      role === "tutor"
    );

  /*
   * Optional but recommended:
   * check PostgreSQL before creating
   * Auth0 account.
   */

  if (typeof db.findAnyProfileByEmail === "function") {
    const existing = await db.findAnyProfileByEmail(email);
    if (existing) {
      throw failure(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered.");
    }
  } else if (typeof db.findProfileByEmail === "function") {
    const existing = await db.findProfileByEmail(role, email);
    if (existing) throw failure(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered.");
  }

  /*
   * STEP 1:
   * Create Auth0 identity
   */

  const auth0User =
    await createAuth0User({
      name: name.trim(),
      email:
        email.trim().toLowerCase(),
      password,
    });

  /*
   * STEP 2:
   * Create PostgreSQL profile
   */

  const data = {
    ...clean,

    name: name.trim(),

    email:
      email.trim().toLowerCase(),

    mobile:
      mobile || null,

    auth0_id:
      auth0User.user_id,

    profile_image:
      auth0User.picture || null,

    is_active: true,
  };

  if (role === "tutor") {
    Object.assign(data, {
      max_students: 50,
      is_verified: false,
      is_accepting_messages: true,

      // The one-step tutor signup already collects the minimum searchable profile.
      // Publish immediately for end-to-end testing; tutors can hide the profile later.
      profile_published: true,
      profile_published_at: new Date(),

      student_levels: ["Beginner", "Intermediate"],
      lesson_duration_minutes: [60],
      response_time_hours: 24,
      currency: "INR",
    });
  }

  try {
    const profile =
      await db.createProfile(
        role,
        data
      );

    if (role === "tutor" && typeof db.syncTutorCoursesFromSkills === "function") {
      try {
        await db.syncTutorCoursesFromSkills(profile.id, profile.skills || []);
      } catch (courseSyncError) {
        // Course normalization is helpful for search, but must never turn an
        // otherwise successful account/profile creation into a failed signup.
        console.error("Tutor course normalization warning:", courseSyncError);
      }
    }

    return {
      profile:
        safeProfile(profile),
    };

  } catch (error) {

    console.error(
      "Database registration error:",
      error
    );

    // Avoid an orphan Auth0 identity when PostgreSQL creation fails.
    await deleteAuth0User(auth0User.user_id);

    if (error.code === "23505") {
      throw failure(
        409,
        "CONTACT_ALREADY_REGISTERED",
        "Email or mobile number is already registered."
      );
    }

    throw error;
  }
}


/*
|--------------------------------------------------------------------------
| LOGGED-IN USER PROFILE
|--------------------------------------------------------------------------
*/

async function requireProfile(
  role,
  claims
) {
  validateRole(role);

  const profile =
    await db.findProfile(
      role,
      subject(claims)
    );

  assertActive(profile);

  if (!profile) {
    throw failure(
      404,
      "REGISTRATION_REQUIRED",
      `Complete ${role} registration first.`
    );
  }

  return safeProfile(profile);
}

async function forgotPassword(email) {
  if (
    typeof email !== "string" ||
    !email.trim()
  ) {
    throw failure(
      400,
      "EMAIL_REQUIRED",
      "Email is required."
    );
  }

  let response;

  try {
    response = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/dbconnections/change_password`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          client_id:
            process.env.AUTH0_CLIENT_ID,

          email:
            email
              .trim()
              .toLowerCase(),

          connection:
            process.env.AUTH0_DB_CONNECTION ||
            "Username-Password-Authentication",
        }),

        signal:
          AbortSignal.timeout(5000),
      }
    );
  } catch (error) {
    console.error(
      "Auth0 forgot password error:",
      error
    );

    throw failure(
      502,
      "AUTH0_UNAVAILABLE",
      "Unable to contact authentication service."
    );
  }

  const text =
    await response.text();

  if (!response.ok) {
    console.error(
      "Auth0 change password response:",
      text
    );

    throw failure(
      502,
      "PASSWORD_RESET_FAILED",
      "Unable to start password reset."
    );
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| SESSION
|--------------------------------------------------------------------------
*/

async function getSession(claims) {
  const sub =
    subject(claims);

  const [
    student,
    tutor,
  ] =
    await Promise.all([
      db.findProfile(
        "student",
        sub
      ),

      db.findProfile(
        "tutor",
        sub
      ),
    ]);

  const roles = [];

  if (student?.is_active) {
    roles.push("student");
  }

  if (tutor?.is_active) {
    roles.push("tutor");
  }

  return {
    authenticated: true,

    auth0_id:
      sub,

    roles,

    registration_required:
      roles.length === 0,

    student:
      student?.is_active
        ? safeProfile(student)
        : null,

    tutor:
      tutor?.is_active
        ? safeProfile(tutor)
        : null,

    disabled_roles: [
      student &&
      !student.is_active
        ? "student"
        : null,

      tutor &&
      !tutor.is_active
        ? "tutor"
        : null,
    ].filter(Boolean),
  };
}

module.exports = {
  registerUser,
  requireProfile,
  getSession,
  safeProfile,
  forgotPassword
};
