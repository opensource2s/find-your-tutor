const { AppDataSource } = require("../config/db");

const createConnectionRequest = async ({ studentId, tutorId, courseId, message, preferredDay, preferredTime }) => {
  const tutor = (await AppDataSource.query(`SELECT id,max_students,is_active,profile_published FROM tutors WHERE id=$1`, [tutorId]))[0];
  if (!tutor || !tutor.is_active || !tutor.profile_published) throw Object.assign(new Error("Tutor not found"), { status: 404 });
  const connected = (await AppDataSource.query(`SELECT 1 FROM tutor_connections WHERE student_id=$1 AND tutor_id=$2 AND status='active'`, [studentId,tutorId]))[0];
  if (connected) throw Object.assign(new Error("You are already connected with this tutor"), { status: 409 });
  const active = Number((await AppDataSource.query(`SELECT COUNT(*) count FROM tutor_connections WHERE tutor_id=$1 AND status='active'`, [tutorId]))[0].count);
  if (active >= Math.min(Number(tutor.max_students || 50), 50)) throw Object.assign(new Error("Tutor has reached the 50-student capacity"), { status: 409 });
  try {
    const rows = await AppDataSource.query(`INSERT INTO connection_requests(student_id,tutor_id,course_id,message,preferred_day,preferred_time)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [studentId,tutorId,courseId || null,message || null,preferredDay ?? null,preferredTime || null]);
    await AppDataSource.query(`INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
      VALUES('tutor',$1,'connection_request','New student request',$2,$3)`, [tutorId, message || "A student wants to connect with you.", rows[0].id]);
    return rows[0];
  } catch (error) {
    if (error.code === "23505") throw Object.assign(new Error("You already have a pending request for this tutor"), { status: 409 });
    throw error;
  }
};

const getStudentRequests = (studentId) => AppDataSource.query(`
  SELECT cr.*,t.name tutor_name,t.title tutor_title,t.profile_image,c.name course_name
  FROM connection_requests cr JOIN tutors t ON t.id=cr.tutor_id LEFT JOIN courses c ON c.id=cr.course_id
  WHERE cr.student_id=$1 ORDER BY cr.created_at DESC`, [studentId]);

const cancelRequest = async (studentId, requestId) => {
  const rows = await AppDataSource.query(`UPDATE connection_requests SET status='cancelled',updated_at=NOW()
    WHERE id=$1 AND student_id=$2 AND status='pending' RETURNING *`, [requestId,studentId]);
  return rows[0] || null;
};

const getFavorites = (studentId) => AppDataSource.query(`
  SELECT f.id favorite_id,t.id,t.name,t.title,t.profile_image,t.hourly_rate,t.country,t.skills,t.is_verified,
    COALESCE(r.avg_rating,0)::numeric(3,2) avg_rating,COALESCE(r.review_count,0)::int review_count
  FROM favorites f JOIN tutors t ON t.id=f.tutor_id
  LEFT JOIN LATERAL (SELECT ROUND(AVG(rating)::numeric,2) avg_rating,COUNT(*) review_count FROM reviews WHERE tutor_id=t.id) r ON TRUE
  WHERE f.student_id=$1 ORDER BY f.created_at DESC`, [studentId]);
const addFavorite = async (studentId,tutorId) => (await AppDataSource.query(`INSERT INTO favorites(student_id,tutor_id) VALUES($1,$2) ON CONFLICT(student_id,tutor_id) DO UPDATE SET tutor_id=EXCLUDED.tutor_id RETURNING *`,[studentId,tutorId]))[0];
const removeFavorite = (studentId,tutorId) => AppDataSource.query(`DELETE FROM favorites WHERE student_id=$1 AND tutor_id=$2`,[studentId,tutorId]);

const getStudentConnections = (studentId) => AppDataSource.query(`SELECT tc.*,t.name tutor_name,t.title tutor_title,t.profile_image,t.hourly_rate FROM tutor_connections tc JOIN tutors t ON t.id=tc.tutor_id WHERE tc.student_id=$1 AND tc.status='active' ORDER BY tc.connected_at DESC`,[studentId]);

const createBooking = async ({studentId,tutorId,courseId,start,end,notes}) => {
  const connected = (await AppDataSource.query(`SELECT 1 FROM tutor_connections WHERE student_id=$1 AND tutor_id=$2 AND status='active'`,[studentId,tutorId]))[0];
  if (!connected) throw Object.assign(new Error("Connect with this tutor before booking a session"),{status:403});
  const tutor = (await AppDataSource.query(`SELECT hourly_rate FROM tutors WHERE id=$1 AND is_active=TRUE`,[tutorId]))[0];
  if (!tutor) throw Object.assign(new Error("Tutor not found"),{status:404});
  const conflict = (await AppDataSource.query(`SELECT 1 FROM bookings WHERE tutor_id=$1 AND status IN ('requested','confirmed') AND scheduled_start < $3 AND scheduled_end > $2 LIMIT 1`,[tutorId,start,end]))[0];
  if (conflict) throw Object.assign(new Error("That tutor already has a session during this time"),{status:409});
  const startDate = new Date(start), endDate = new Date(end);
  if (!(endDate > startDate) || startDate <= new Date()) throw Object.assign(new Error("Choose a valid future time range"),{status:400});
  const hours=(endDate-startDate)/3600000; const rate=Number(tutor.hourly_rate || 0); const total=Math.round(rate*hours*100)/100;
  let rows;
  try {
    rows=await AppDataSource.query(`INSERT INTO bookings(student_id,tutor_id,course_id,scheduled_start,scheduled_end,hourly_rate,total_amount,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[studentId,tutorId,courseId||null,start,end,rate,total,notes||null]);
  } catch (error) {
    if (error.code === "23P01") throw Object.assign(new Error("That tutor already has a session during this time"),{status:409});
    throw error;
  }
  await AppDataSource.query(`INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id) VALUES('tutor',$1,'booking_request','New session booking','A connected student requested a session.',$2)`,[tutorId,rows[0].id]);
  return rows[0];
};
const getStudentBookings = (studentId) => AppDataSource.query(`SELECT b.*,t.name tutor_name,t.profile_image,c.name course_name FROM bookings b JOIN tutors t ON t.id=b.tutor_id LEFT JOIN courses c ON c.id=b.course_id WHERE b.student_id=$1 ORDER BY b.scheduled_start DESC`,[studentId]);

const createReview = async ({studentId,tutorId,bookingId,rating,review}) => {
  const eligible=(await AppDataSource.query(`SELECT 1 FROM tutor_connections WHERE student_id=$1 AND tutor_id=$2 AND status='active'`,[studentId,tutorId]))[0];
  if(!eligible) throw Object.assign(new Error("Only connected students can review this tutor"),{status:403});
  if(Number(rating)<1||Number(rating)>5) throw Object.assign(new Error("Rating must be between 1 and 5"),{status:400});
  const rows=await AppDataSource.query(`INSERT INTO reviews(student_id,tutor_id,booking_id,rating,review) VALUES($1,$2,$3,$4,$5) RETURNING *`,[studentId,tutorId,bookingId||null,Number(rating),review||null]);
  return rows[0];
};

const getNotifications = (type,id) => AppDataSource.query(`SELECT * FROM notifications WHERE recipient_type=$1 AND recipient_id=$2 ORDER BY created_at DESC LIMIT 100`,[type,id]);
const markNotificationRead = (type,id,notificationId) => AppDataSource.query(`UPDATE notifications SET is_read=TRUE WHERE id=$1 AND recipient_type=$2 AND recipient_id=$3`,[notificationId,type,id]);

module.exports={createConnectionRequest,getStudentRequests,cancelRequest,getFavorites,addFavorite,removeFavorite,getStudentConnections,createBooking,getStudentBookings,createReview,getNotifications,markNotificationRead};
