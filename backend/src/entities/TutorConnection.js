const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "TutorConnection", tableName: "tutor_connections",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    student_id: { type: "uuid" }, tutor_id: { type: "uuid" },
    request_id: { type: "uuid", nullable: true }, status: { type: "varchar", length: 20, default: "active" },
    connected_at: { type: "timestamp", createDate: true }, ended_at: { type: "timestamp", nullable: true },
  },
});
