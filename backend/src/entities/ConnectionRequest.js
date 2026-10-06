const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "ConnectionRequest", tableName: "connection_requests",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    student_id: { type: "uuid" }, tutor_id: { type: "uuid" },
    course_id: { type: "uuid", nullable: true }, message: { type: "text", nullable: true },
    preferred_day: { type: "int", nullable: true }, preferred_time: { type: "time", nullable: true },
    status: { type: "varchar", length: 20, default: "pending" },
    created_at: { type: "timestamp", createDate: true },
    updated_at: { type: "timestamp", updateDate: true },
  },
});
