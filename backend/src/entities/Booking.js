const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Booking", tableName: "bookings",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    student_id: { type: "uuid" }, tutor_id: { type: "uuid" }, course_id: { type: "uuid", nullable: true },
    scheduled_start: { type: "timestamptz" }, scheduled_end: { type: "timestamptz" },
    hourly_rate: { type: "numeric", precision: 10, scale: 2 }, total_amount: { type: "numeric", precision: 10, scale: 2 },
    status: { type: "varchar", length: 20, default: "requested" }, meeting_url: { type: "text", nullable: true },
    notes: { type: "text", nullable: true }, created_at: { type: "timestamp", createDate: true }, updated_at: { type: "timestamp", updateDate: true },
  },
});
