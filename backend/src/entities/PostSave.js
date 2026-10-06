const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "PostSave",
  tableName: "post_saves",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    post_id: { type: "uuid" },
    student_id: { type: "uuid" },
    created_at: { type: "timestamptz", createDate: true },
  },
});
