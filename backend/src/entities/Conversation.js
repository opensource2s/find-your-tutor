const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Conversation", tableName: "conversations",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" }, student_id: { type: "uuid" }, tutor_id: { type: "uuid" },
    last_message_at: { type: "timestamptz", nullable: true },
    student_archived: { type: "boolean", default: false }, tutor_archived: { type: "boolean", default: false },
    student_muted: { type: "boolean", default: false }, tutor_muted: { type: "boolean", default: false },
    created_at: { type: "timestamp", createDate: true },
  },
});
