const { AppDataSource } = require("../config/db");

const basePostSelect = `
SELECT
  p.id, p.tutor_id, p.course_id, p.title, p.content, p.post_type,
  p.media_type, p.media_url, p.link_url, p.tags, p.status,
  p.allow_comments, p.view_count, p.published_at, p.created_at, p.updated_at,
  t.name tutor_name, t.title tutor_title, t.profile_image tutor_image,
  t.is_verified tutor_verified, t.country tutor_country, t.city tutor_city,
  t.experience_years tutor_experience_years, t.hourly_rate tutor_hourly_rate,
  t.currency tutor_currency, t.response_time_hours tutor_response_time_hours,
  c.name course_name, c.slug course_slug, c.category course_category,
  (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id=p.id) like_count,
  (SELECT COUNT(*)::int FROM post_comments pc WHERE pc.post_id=p.id AND pc.deleted_at IS NULL) comment_count,
  (SELECT COUNT(*)::int FROM post_saves ps WHERE ps.post_id=p.id) save_count
FROM tutor_posts p
JOIN tutors t ON t.id=p.tutor_id
LEFT JOIN courses c ON c.id=p.course_id
`;

const getFeed = async ({ q, courseId, tutorId, postType, sort="latest", limit=12, offset=0 } = {}) => {
  const params = [];
  const where = [`p.status='published'`, `t.is_active=TRUE`, `t.profile_published=TRUE`];

  if (q) {
    params.push(`%${String(q).trim()}%`);
    const n=params.length;
    where.push(`(
      p.title ILIKE $${n} OR p.content ILIKE $${n} OR t.name ILIKE $${n}
      OR t.title ILIKE $${n} OR c.name ILIKE $${n}
      OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.tags,ARRAY[]::text[])) tag WHERE tag ILIKE $${n})
    )`);
  }

  if (courseId) { params.push(courseId); where.push(`p.course_id=$${params.length}`); }
  if (tutorId) { params.push(tutorId); where.push(`p.tutor_id=$${params.length}`); }
  if (postType) { params.push(postType); where.push(`p.post_type=$${params.length}`); }

  const order = sort === "popular"
    ? `like_count DESC, comment_count DESC, p.published_at DESC`
    : `p.published_at DESC`;

  params.push(Math.min(Math.max(Number(limit)||12,1),50));
  const limitParam=params.length;
  params.push(Math.max(Number(offset)||0,0));
  const offsetParam=params.length;

  return AppDataSource.query(`
    ${basePostSelect}
    WHERE ${where.join(" AND ")}
    ORDER BY ${order}
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `, params);
};

const getPostById = async (id) => {
  const rows = await AppDataSource.query(`
    ${basePostSelect}
    WHERE p.id=$1 AND p.status='published' AND t.is_active=TRUE AND t.profile_published=TRUE
  `,[id]);
  return rows[0] || null;
};

const incrementView = (id) =>
  AppDataSource.query(`UPDATE tutor_posts SET view_count=view_count+1 WHERE id=$1 AND status='published'`,[id]);

const getComments = (postId) => AppDataSource.query(`
  SELECT
    pc.id, pc.post_id, pc.user_type, pc.user_id, pc.parent_comment_id,
    pc.content, pc.edited_at, pc.deleted_at, pc.created_at, pc.updated_at,
    CASE WHEN pc.user_type='student' THEN s.name ELSE t.name END user_name,
    CASE WHEN pc.user_type='student' THEN s.profile_image ELSE t.profile_image END user_image,
    CASE WHEN pc.user_type='tutor' THEN TRUE ELSE FALSE END is_tutor
  FROM post_comments pc
  LEFT JOIN students s ON pc.user_type='student' AND s.id=pc.user_id
  LEFT JOIN tutors t ON pc.user_type='tutor' AND t.id=pc.user_id
  WHERE pc.post_id=$1
  ORDER BY pc.created_at ASC
`,[postId]);

const getViewerState = async (postId, userType, userId) => {
  if (!userType || !userId) return { liked:false, saved:false };
  const [state] = await AppDataSource.query(`
    SELECT
      EXISTS(SELECT 1 FROM post_likes WHERE post_id=$1 AND user_type=$2 AND user_id=$3) liked,
      CASE WHEN $2='student'
        THEN EXISTS(SELECT 1 FROM post_saves WHERE post_id=$1 AND student_id=$3)
        ELSE FALSE
      END saved
  `,[postId,userType,userId]);
  return state || {liked:false,saved:false};
};

const likePost = async (postId,userType,userId) => {
  const inserted=await AppDataSource.query(`
    INSERT INTO post_likes(post_id,user_type,user_id)
    SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM tutor_posts WHERE id=$1 AND status='published')
    ON CONFLICT(post_id,user_type,user_id) DO NOTHING
    RETURNING id
  `,[postId,userType,userId]);

  if(inserted[0] && userType==="student"){
    const [post]=await AppDataSource.query(`SELECT tutor_id,title FROM tutor_posts WHERE id=$1`,[postId]);
    const [student]=await AppDataSource.query(`SELECT name FROM students WHERE id=$1`,[userId]);
    if(post) await AppDataSource.query(`
      INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
      VALUES('tutor',$1,'post_like','Someone liked your post',$2,$3)
    `,[post.tutor_id,`${student?.name||"A student"} liked "${post.title}".`,postId]);
  }

  const [{count}] = await AppDataSource.query(`SELECT COUNT(*)::int count FROM post_likes WHERE post_id=$1`,[postId]);
  return Number(count||0);
};

const unlikePost = async (postId,userType,userId) => {
  await AppDataSource.query(`DELETE FROM post_likes WHERE post_id=$1 AND user_type=$2 AND user_id=$3`,[postId,userType,userId]);
  const [{count}] = await AppDataSource.query(`SELECT COUNT(*)::int count FROM post_likes WHERE post_id=$1`,[postId]);
  return Number(count||0);
};

const addComment = async (postId,userType,userId,content,parentCommentId=null) => {
  const posts=await AppDataSource.query(`SELECT tutor_id,title,allow_comments FROM tutor_posts WHERE id=$1 AND status='published'`,[postId]);
  const post=posts[0];
  if(!post) return null;
  if(!post.allow_comments) throw Object.assign(new Error("Comments are disabled for this post"),{status:409});

  let parent=null;
  if(parentCommentId){
    const parents=await AppDataSource.query(`SELECT id,user_type,user_id FROM post_comments WHERE id=$1 AND post_id=$2 AND deleted_at IS NULL`,[parentCommentId,postId]);
    parent=parents[0];
    if(!parent) throw Object.assign(new Error("Reply target not found"),{status:404});
  }

  const rows=await AppDataSource.query(`
    INSERT INTO post_comments(post_id,user_type,user_id,parent_comment_id,content)
    VALUES($1,$2,$3,$4,$5) RETURNING *
  `,[postId,userType,userId,parentCommentId,content]);

  if(parent && !(parent.user_type===userType && parent.user_id===userId)){
    const actorTable=userType==="student"?"students":"tutors";
    const [actor]=await AppDataSource.query(`SELECT name FROM ${actorTable} WHERE id=$1`,[userId]);
    await AppDataSource.query(`
      INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
      VALUES($1,$2,'comment_reply','New reply to your comment',$3,$4)
    `,[parent.user_type,parent.user_id,`${actor?.name||"Someone"} replied on "${post.title}".`,postId]);
  } else if(userType==="student"){
    const [student]=await AppDataSource.query(`SELECT name FROM students WHERE id=$1`,[userId]);
    await AppDataSource.query(`
      INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
      VALUES('tutor',$1,'post_comment','New comment on your post',$2,$3)
    `,[post.tutor_id,`${student?.name||"A student"} commented on "${post.title}".`,postId]);
  }

  return rows[0];
};

const updateComment = async (commentId,userType,userId,content) => {
  const rows=await AppDataSource.query(`
    UPDATE post_comments
    SET content=$1,edited_at=NOW(),updated_at=NOW()
    WHERE id=$2 AND user_type=$3 AND user_id=$4 AND deleted_at IS NULL
    RETURNING *
  `,[content,commentId,userType,userId]);
  return rows[0]||null;
};

const deleteComment = async (commentId,userType,userId) => {
  const rows=await AppDataSource.query(`
    UPDATE post_comments
    SET content='[deleted]',deleted_at=NOW(),updated_at=NOW()
    WHERE id=$1 AND user_type=$2 AND user_id=$3 AND deleted_at IS NULL
    RETURNING id
  `,[commentId,userType,userId]);
  return !!rows[0];
};

const savePost = async (postId,studentId) => {
  await AppDataSource.query(`
    INSERT INTO post_saves(post_id,student_id)
    SELECT $1,$2 WHERE EXISTS(SELECT 1 FROM tutor_posts WHERE id=$1 AND status='published')
    ON CONFLICT(post_id,student_id) DO NOTHING
  `,[postId,studentId]);
  return true;
};

const unsavePost = (postId,studentId) =>
  AppDataSource.query(`DELETE FROM post_saves WHERE post_id=$1 AND student_id=$2`,[postId,studentId]);

const getSavedPosts = (studentId) => AppDataSource.query(`
  ${basePostSelect}
  JOIN post_saves saved ON saved.post_id=p.id
  WHERE saved.student_id=$1 AND p.status='published' AND t.is_active=TRUE AND t.profile_published=TRUE
  ORDER BY saved.created_at DESC
`,[studentId]);

const getTutorPosts = (tutorId) => AppDataSource.query(`
  ${basePostSelect}
  WHERE p.tutor_id=$1
  ORDER BY p.created_at DESC
`,[tutorId]);

const getTutorPost = async (tutorId,postId) => {
  const rows=await AppDataSource.query(`SELECT * FROM tutor_posts WHERE id=$1 AND tutor_id=$2`,[postId,tutorId]);
  return rows[0]||null;
};

const createTutorPost = async (tutorId,values) => {
  const rows=await AppDataSource.query(`
    INSERT INTO tutor_posts(
      tutor_id,course_id,title,content,post_type,media_type,media_url,link_url,
      tags,status,allow_comments,published_at
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
      CASE WHEN $10='published' THEN NOW() ELSE NULL END)
    RETURNING *
  `,[
    tutorId,values.course_id||null,values.title,values.content,values.post_type,
    values.media_type,values.media_url||null,values.link_url||null,values.tags,
    values.status,values.allow_comments
  ]);
  return rows[0];
};

const updateTutorPost = async (tutorId,postId,values) => {
  const rows=await AppDataSource.query(`
    UPDATE tutor_posts SET
      course_id=$1,title=$2,content=$3,post_type=$4,media_type=$5,
      media_url=$6,link_url=$7,tags=$8,status=$9,allow_comments=$10,
      published_at=CASE
        WHEN $9='published' AND published_at IS NULL THEN NOW()
        WHEN $9<>'published' THEN NULL
        ELSE published_at
      END,
      updated_at=NOW()
    WHERE id=$11 AND tutor_id=$12
    RETURNING *
  `,[
    values.course_id||null,values.title,values.content,values.post_type,
    values.media_type,values.media_url||null,values.link_url||null,
    values.tags,values.status,values.allow_comments,postId,tutorId
  ]);
  return rows[0]||null;
};

const deleteTutorPost = async (tutorId,postId) => {
  const rows=await AppDataSource.query(`DELETE FROM tutor_posts WHERE id=$1 AND tutor_id=$2 RETURNING id`,[postId,tutorId]);
  return !!rows[0];
};

module.exports={
  getFeed,getPostById,incrementView,getComments,getViewerState,
  likePost,unlikePost,addComment,updateComment,deleteComment,
  savePost,unsavePost,getSavedPosts,
  getTutorPosts,getTutorPost,createTutorPost,updateTutorPost,deleteTutorPost
};
