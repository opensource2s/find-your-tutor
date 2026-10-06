const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateRegistration } = require("../src/services/registrationValidation");

const profile = { name: " New Learner ", mobile: "+91 9876543210", timezone: "Asia/Kolkata" };

test("registration requires contact data even when the Auth0 token has only sub", () => {
  assert.throws(() => validateRegistration({ name: "Learner" }), { status: 400 });
  assert.equal(validateRegistration(profile).mobile, "+919876543210");
});

test("validation rejects malformed input and removes privileged fields", () => {
  for (const values of [null, [], { ...profile, name: " " }, { ...profile, mobile: "abc123" }, { ...profile, timezone: "Not/AZone" }, { ...profile, preferred_languages: "English" }]) {
    assert.throws(() => validateRegistration(values), { status: 400 });
  }
  const clean = validateRegistration({ ...profile, auth0_id: "attacker", is_active: false, password_hash: "injected" });
  assert.equal(clean.name, "New Learner");
  assert.equal(clean.auth0_id, undefined);
  assert.equal(clean.password_hash, undefined);
});

test("tutor validation rejects invalid rates, experience and teaching modes", () => {
  const tutor = { ...profile, title: "Math teacher", hourly_rate: 500 };
  for (const values of [{ ...tutor, hourly_rate: "" }, { ...tutor, hourly_rate: -1 }, { ...tutor, hourly_rate: true }, { ...tutor, experience_years: 1.5 }, { ...tutor, teaching_modes: ["invalid"] }]) {
    assert.throws(() => validateRegistration(values, true), { status: 400 });
  }
  assert.equal(validateRegistration(tutor, true).hourly_rate, 500);
});

