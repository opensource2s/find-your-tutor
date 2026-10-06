const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "Message", tableName: "messages",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    conversation_id: { type: "uuid" },
    sender_type: { type: "varchar", length: 20 },
    sender_id: { type: "uuid" },
    body: { type: "text" },
    is_read: { type: "boolean", default: false },
    delivered_at: { type: "timestamptz", nullable: true },
    read_at: { type: "timestamptz", nullable: true },
    edited_at: { type: "timestamptz", nullable: true },
    reply_to_message_id: { type: "uuid", nullable: true },
    deleted_at: { type: "timestamptz", nullable: true },
    created_at: { type: "timestamp", createDate: true },
  },
});
