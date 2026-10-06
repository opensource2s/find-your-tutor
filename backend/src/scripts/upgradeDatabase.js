const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { AppDataSource } = require("../config/db");

async function run() {
  try {
    await AppDataSource.initialize();
    const files = [
      "portfolio_upgrade.sql",
      "marketplace_messaging_upgrade.sql",
      "tutor_profile_chat_v2.sql",
      "end_to_end_v3.sql",
  "e2e_reliability_v4.sql",
  "tutor_social_feed_v6.sql",
      "tutor_followers_v7.sql",
    ];

    for (const file of files) {
      const sql = fs.readFileSync(path.join(__dirname, "../../database", file), "utf8");
      await AppDataSource.query(sql);
      console.log(`✅ Applied ${file}`);
    }

    console.log("✅ Tutorly database upgrade completed.");
  } catch (error) {
    console.error("❌ Database upgrade failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}
run();
