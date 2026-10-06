const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Notification", tableName: "notifications",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" }, recipient_type: { type: "varchar", length: 20 },
    recipient_id: { type: "uuid" }, type: { type: "varchar", length: 50 }, title: { type: "varchar", length: 180 }, body: { type: "text", nullable: true },
    reference_id: { type: "uuid", nullable: true }, is_read: { type: "boolean", default: false }, created_at: { type: "timestamp", createDate: true },
  },
});
