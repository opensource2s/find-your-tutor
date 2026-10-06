const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Favorite", tableName: "favorites",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" }, student_id: { type: "uuid" }, tutor_id: { type: "uuid" },
    created_at: { type: "timestamp", createDate: true },
  },
});
