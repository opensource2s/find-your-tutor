const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "PostComment",
  tableName: "post_comments",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    post_id: { type: "uuid" },
    user_type: { type: "varchar", length: 20 },
    user_id: { type: "uuid" },
    parent_comment_id: { type: "uuid", nullable: true },
    content: { type: "varchar", length: 1000 },
    edited_at: { type: "timestamptz", nullable: true },
    deleted_at: { type: "timestamptz", nullable: true },
    created_at: { type: "timestamptz", createDate: true },
    updated_at: { type: "timestamptz", updateDate: true },
  },
});
