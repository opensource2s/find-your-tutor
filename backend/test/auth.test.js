const { test } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/database/authDatabase");
const service = require("../src/services/authService");

const studentValues = {
  name: "Learner One",
  email: "learner1@example.test",
  password: "Tutorly@123",
  mobile: "+919876543210",
  country: "India",
  timezone: "Asia/Kolkata",
  preferred_languages: ["English"]
};

function mockAuth0(t, userId = "auth0|new-user") {
  let calls = 0;
  return t.mock.method(global, "fetch", async (url, options = {}) => {
    calls += 1;
    if (String(url).endsWith("/oauth/token")) {
      return { ok: true, json: async () => ({ access_token: "management-token" }) };
    }
    if (String(url).endsWith("/api/v2/users") && options.method === "POST") {
      const body = JSON.parse(options.body);
      assert.equal(body.email, studentValues.email);
      assert.equal(body.password, studentValues.password);
      assert.ok(body.username);
      return { ok: true, status: 201, json: async () => ({ user_id: userId, picture: "https://example.test/avatar.png" }) };
    }
    if (String(url).includes("/api/v2/users/") && options.method === "DELETE") {
      return { ok: true, status: 204, json: async () => ({}) };
    }
    throw new Error(`Unexpected Auth0 request: ${url}`);
  });
}

test("one-step student signup creates Auth0 identity and PostgreSQL profile without storing password", async t => {
  process.env.AUTH0_DOMAIN = "tenant.example.test";
  process.env.AUTH0_M2M_CLIENT_ID = "client";
  process.env.AUTH0_M2M_CLIENT_SECRET = "secret";
  mockAuth0(t);
  t.mock.method(db, "findAnyProfileByEmail", async () => null);
  let saved;
  t.mock.method(db, "createProfile", async (role, values) => { saved = values; return { id: "student-id", ...values }; });

  const result = await service.registerUser("student", studentValues);
  assert.equal(saved.auth0_id, "auth0|new-user");
  assert.equal(saved.email, studentValues.email);
  assert.equal(saved.password, undefined);
  assert.equal(saved.password_hash, undefined);
  assert.equal(result.profile.id, "student-id");
});

test("one-step tutor signup forces safe defaults and keeps proof optional", async t => {
  process.env.AUTH0_DOMAIN = "tenant.example.test";
  mockAuth0(t, "auth0|tutor");
  t.mock.method(db, "findAnyProfileByEmail", async () => null);
  let saved;
  t.mock.method(db, "createProfile", async (role, values) => { saved = values; return { id: "tutor-id", ...values }; });
  t.mock.method(db, "syncTutorCoursesFromSkills", async () => []);

  const values = { ...studentValues, email: "tutor1@example.test", title: "C Programming Tutor", hourly_rate: 700, experience_years: 5, tutor_type: "teacher", teaching_modes: ["online"], languages: ["English"], skills: ["C Programming"] };
  // mock uses studentValues email for assertion, so replace fetch with a generic mock for this test
  global.fetch.mock.mockImplementation(async (url, options={}) => {
    if (String(url).endsWith("/oauth/token")) return { ok:true, json:async()=>({access_token:"management-token"}) };
    if (String(url).endsWith("/api/v2/users")) return { ok:true, status:201, json:async()=>({user_id:"auth0|tutor"}) };
    return { ok:true, status:204, json:async()=>({}) };
  });

  await service.registerUser("tutor", values);
  assert.equal(saved.is_verified, false);
  assert.equal(saved.max_students, 50);
  assert.equal(saved.profile_published, true);
  assert.equal(saved.is_accepting_messages, true);
  assert.equal(saved.id_proof_url, undefined);
  assert.equal(saved.password, undefined);
});

test("registration rejects duplicate local email before creating Auth0 user", async t => {
  const fetchMock = t.mock.method(global, "fetch", async () => { throw new Error("Auth0 should not be called"); });
  t.mock.method(db, "findAnyProfileByEmail", async () => ({ id: "existing" }));
  await assert.rejects(service.registerUser("student", studentValues), { status:409, code:"EMAIL_ALREADY_REGISTERED" });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("database failure triggers Auth0 compensation delete", async t => {
  process.env.AUTH0_DOMAIN = "tenant.example.test";
  const fetchMock = mockAuth0(t, "auth0|orphan");
  t.mock.method(db, "findAnyProfileByEmail", async () => null);
  t.mock.method(db, "createProfile", async () => { throw Object.assign(new Error("duplicate"), { code:"23505" }); });
  await assert.rejects(service.registerUser("student", studentValues), { status:409 });
  const deleteCalls = fetchMock.mock.calls.filter(c => String(c.arguments[0]).includes("/api/v2/users/") && c.arguments[1]?.method === "DELETE");
  assert.equal(deleteCalls.length, 1);
});

test("signin requires an existing active role and never returns password hash", async t => {
  t.mock.method(db, "findProfile", async role => role === "student" ? { id:"s1", auth0_id:"auth0|s1", is_active:true, password_hash:"hidden" } : null);
  const profile = await service.requireProfile("student", {sub:"auth0|s1"});
  assert.equal(profile.id, "s1");
  assert.equal(profile.password_hash, undefined);
  await assert.rejects(service.requireProfile("tutor", {sub:"auth0|s1"}), { status:404, code:"REGISTRATION_REQUIRED" });
});
