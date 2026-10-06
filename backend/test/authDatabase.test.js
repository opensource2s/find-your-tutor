const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

test("PostgreSQL saves both roles and signs them in; test records are rolled back", { skip: process.env.RUN_AUTH_DB_TESTS !== "true" }, async t => {
  require("dotenv").config({ quiet: true });
  const { AppDataSource: ds } = require("../src/config/db");
  const service = require("../src/services/authService");
  await ds.initialize();
  const runner = ds.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    t.mock.method(ds, "getRepository", entity => runner.manager.getRepository(entity));
    const sub = `auth0|test-${randomUUID()}`;
    t.mock.method(global, "fetch", async () => ({ ok: true, json: async () => ({ sub, email: `${randomUUID()}@example.test` }) }));
    const details = { name: "Registration transaction test", mobile: `+99${String(BigInt('0x' + randomUUID().replaceAll('-', '').slice(0, 10))).padStart(13, '0')}`, timezone: "Asia/Kolkata" };
    for (const role of ["student", "tutor"]) {
      const values = role === "student" ? details : { ...details, title: "Test Tutor", hourly_rate: 500 };
      const result = await service.registerProfile(role, { sub }, values, "mocked-auth0-token");
      assert.equal(result.created, true);
      assert.equal(result.profile.auth0_id, sub);
      assert.equal(result.profile.password_hash, undefined);
      const signedIn = await service.requireProfile(role, { sub });
      assert.equal(signedIn.id, result.profile.id);
      assert.equal((await service.registerProfile(role, { sub }, values, "mocked-auth0-token")).created, false);
    }
    assert.deepEqual((await service.getSession({ sub })).roles, ["student", "tutor"]);
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await ds.destroy();
  }
});
