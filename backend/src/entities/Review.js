const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Review",
  tableName: "reviews",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    student_id: { type: "uuid" }, tutor_id: { type: "uuid" }, booking_id: { type: "uuid", nullable: true },
    rating: { type: "int" }, review: { type: "text", nullable: true },
    created_at: { type: "timestamp", createDate: true }, updated_at: { type: "timestamp", updateDate: true },
  },
});
