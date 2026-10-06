const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "TutorFollower",
  tableName: "tutor_followers",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    tutor_id: { type: "uuid" },
    student_id: { type: "uuid" },
    notifications_enabled: { type: "boolean", default: true },
    created_at: { type: "timestamptz", createDate: true },
  },
});
