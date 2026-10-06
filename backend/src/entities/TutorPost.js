const { EntitySchema } = require("typeorm");
module.exports = new EntitySchema({
  name: "TutorPost",
  tableName: "tutor_posts",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    tutor_id: { type: "uuid" },
    course_id: { type: "uuid", nullable: true },
    title: { type: "varchar", length: 180 },
    content: { type: "text" },
    post_type: { type: "varchar", length: 30, default: "teaching_tip" },
    media_type: { type: "varchar", length: 20, default: "none" },
    media_url: { type: "text", nullable: true },
    link_url: { type: "text", nullable: true },
    tags: { type: "text", array: true, default: "{}" },
    status: { type: "varchar", length: 20, default: "published" },
    allow_comments: { type: "boolean", default: true },
    view_count: { type: "int", default: 0 },
    published_at: { type: "timestamptz", nullable: true },
    created_at: { type: "timestamptz", createDate: true },
    updated_at: { type: "timestamptz", updateDate: true },
  },
});
