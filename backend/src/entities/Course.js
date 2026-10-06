const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Course", tableName: "courses",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 120, unique: true },
    slug: { type: "varchar", length: 140, unique: true },
    category: { type: "varchar", length: 80, nullable: true },
    description: { type: "text", nullable: true },
    is_active: { type: "boolean", default: true },
    created_at: { type: "timestamp", createDate: true },
    updated_at: { type: "timestamp", updateDate: true },
  },
});
