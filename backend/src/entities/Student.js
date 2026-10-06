const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Student",
  tableName: "students",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    auth0_id: { type: "varchar", length: 255, nullable: true, unique: true },
    name: { type: "varchar", length: 100 },
    email: { type: "varchar", length: 150, nullable: true, unique: true },
    mobile: { type: "varchar", length: 20, nullable: true, unique: true },
    password_hash: { type: "text", nullable: true },
    profile_image: { type: "text", nullable: true },
    country: { type: "varchar", length: 80, nullable: true },
    timezone: { type: "varchar", length: 80, default: "Asia/Kolkata" },
    preferred_languages: { type: "text", array: true, nullable: true },
    learning_goals: { type: "text", nullable: true },
    current_level: { type: "varchar", length: 50, nullable: true },
    interests: { type: "text", array: true, nullable: true },
    is_active: { type: "boolean", default: true },
    created_at: { type: "timestamp", createDate: true }, updated_at: { type: "timestamp", updateDate: true },
  },
});
