const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "PostLike",
  tableName: "post_likes",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    post_id: { type: "uuid" },
    user_type: { type: "varchar", length: 20 },
    user_id: { type: "uuid" },
    created_at: { type: "timestamptz", createDate: true },
  },
});
