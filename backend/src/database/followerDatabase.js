const { AppDataSource } = require("../config/db");

const getTutorSocial = async (tutorId, studentId = null) => {
  const [row] = await AppDataSource.query(`
    SELECT t.id tutor_id,
      (SELECT COUNT(*)::int FROM tutor_followers tf WHERE tf.tutor_id=t.id) follower_count,
      (SELECT COUNT(*)::int FROM tutor_posts p WHERE p.tutor_id=t.id AND p.status='published') post_count,
      CASE WHEN $2::uuid IS NULL THEN FALSE ELSE EXISTS(
        SELECT 1 FROM tutor_followers tf WHERE tf.tutor_id=t.id AND tf.student_id=$2
      ) END following
    FROM tutors t WHERE t.id=$1 AND t.is_active=TRUE AND t.profile_published=TRUE
  `,[tutorId,studentId]);
  return row || null;
};

const follow = async (tutorId, studentId) => {
  const rows=await AppDataSource.query(`
    INSERT INTO tutor_followers(tutor_id,student_id)
    VALUES($1,$2)
    ON CONFLICT(tutor_id,student_id) DO NOTHING
    RETURNING *
  `,[tutorId,studentId]);

  if(rows[0]){
    const [student]=await AppDataSource.query(`SELECT name FROM students WHERE id=$1`,[studentId]);
    await AppDataSource.query(`
      INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
      VALUES('tutor',$1,'new_follower','New follower',$2,$3)
    `,[tutorId,`${student?.name||"A student"} started following you.`,studentId]);
  }
  return getTutorSocial(tutorId,studentId);
};

const unfollow = async (tutorId, studentId) => {
  await AppDataSource.query(`DELETE FROM tutor_followers WHERE tutor_id=$1 AND student_id=$2`,[tutorId,studentId]);
  return getTutorSocial(tutorId,studentId);
};

const setNotifications = async (tutorId,studentId,enabled) => {
  const rows=await AppDataSource.query(`
    UPDATE tutor_followers SET notifications_enabled=$3
    WHERE tutor_id=$1 AND student_id=$2 RETURNING *
  `,[tutorId,studentId,!!enabled]);
  return rows[0]||null;
};

const getFollowingTutors = studentId => AppDataSource.query(`
  SELECT t.id,t.name,t.title,t.profile_image,t.is_verified,t.country,t.city,t.experience_years,
    t.hourly_rate,t.currency,t.response_time_hours,tf.notifications_enabled,tf.created_at followed_at,
    (SELECT COUNT(*)::int FROM tutor_followers x WHERE x.tutor_id=t.id) follower_count,
    (SELECT COUNT(*)::int FROM tutor_posts p WHERE p.tutor_id=t.id AND p.status='published') post_count
  FROM tutor_followers tf JOIN tutors t ON t.id=tf.tutor_id
  WHERE tf.student_id=$1 AND t.is_active=TRUE AND t.profile_published=TRUE
  ORDER BY tf.created_at DESC
`,[studentId]);

const getFollowers = tutorId => AppDataSource.query(`
  SELECT s.id,s.name,s.profile_image,s.country,s.timezone,tf.notifications_enabled,tf.created_at followed_at
  FROM tutor_followers tf JOIN students s ON s.id=tf.student_id
  WHERE tf.tutor_id=$1 AND s.is_active=TRUE
  ORDER BY tf.created_at DESC
`,[tutorId]);

const getFollowingFeed = (studentId,{limit=20,offset=0}={}) => AppDataSource.query(`
  SELECT
    p.id,p.tutor_id,p.course_id,p.title,p.content,p.post_type,p.media_type,p.media_url,p.link_url,
    p.tags,p.status,p.allow_comments,p.view_count,p.published_at,p.created_at,p.updated_at,
    t.name tutor_name,t.title tutor_title,t.profile_image tutor_image,t.is_verified tutor_verified,
    t.country tutor_country,t.city tutor_city,t.experience_years tutor_experience_years,
    t.hourly_rate tutor_hourly_rate,t.currency tutor_currency,t.response_time_hours tutor_response_time_hours,
    c.name course_name,c.slug course_slug,c.category course_category,
    (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id=p.id) like_count,
    (SELECT COUNT(*)::int FROM post_comments pc WHERE pc.post_id=p.id AND pc.deleted_at IS NULL) comment_count,
    (SELECT COUNT(*)::int FROM post_saves ps WHERE ps.post_id=p.id) save_count
  FROM tutor_followers tf
  JOIN tutor_posts p ON p.tutor_id=tf.tutor_id AND p.status='published'
  JOIN tutors t ON t.id=p.tutor_id AND t.is_active=TRUE AND t.profile_published=TRUE
  LEFT JOIN courses c ON c.id=p.course_id
  WHERE tf.student_id=$1
  ORDER BY p.published_at DESC
  LIMIT $2 OFFSET $3
`,[studentId,Math.min(Math.max(Number(limit)||20,1),50),Math.max(Number(offset)||0,0)]);

const notifyFollowersOfPost = async (tutorId,postId,title) => {
  await AppDataSource.query(`
    INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
    SELECT 'student',tf.student_id,'new_tutor_post','New post from a tutor you follow',
      $3,$2
    FROM tutor_followers tf
    WHERE tf.tutor_id=$1 AND tf.notifications_enabled=TRUE
  `,[tutorId,postId,title]);
};

module.exports={getTutorSocial,follow,unfollow,setNotifications,getFollowingTutors,getFollowers,getFollowingFeed,notifyFollowersOfPost};
