const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "TutorCourse", tableName: "tutor_courses",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    tutor_id: { type: "uuid" }, course_id: { type: "uuid" },
    proficiency_level: { type: "varchar", length: 30, default: "expert" },
    custom_rate: { type: "numeric", precision: 10, scale: 2, nullable: true },
    created_at: { type: "timestamp", createDate: true },
  },
});
