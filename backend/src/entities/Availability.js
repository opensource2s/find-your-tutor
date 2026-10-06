const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Availability", tableName: "tutor_availability",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    tutor_id: { type: "uuid" }, day_of_week: { type: "int" },
    start_time: { type: "time" }, end_time: { type: "time" },
    timezone: { type: "varchar", length: 80, default: "Asia/Kolkata" },
    is_active: { type: "boolean", default: true },
    created_at: { type: "timestamp", createDate: true },
  },
});
