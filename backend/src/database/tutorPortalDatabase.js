const { AppDataSource } = require("../config/db");
const Tutor = require("../entities/Tutor");

const getTutorByAuth0Id = async (auth0Id) => AppDataSource.getRepository(Tutor).findOne({ where: { auth0_id: auth0Id, is_active: true } });

const onboardTutor = async (claims, profile, token) =>
  (await require("../services/authService").registerProfile("tutor", claims, profile, token)).profile;

const updateTutor = async (id, values) => {
  const allowed=["name","mobile","title","bio","tutor_type","skills","experience_years","hourly_rate","profile_image","country","city","timezone","languages","teaching_modes","education","certifications","achievements","linkedin_url","website_url","intro_video_url","response_time_hours","trial_lesson_available","is_accepting_messages","short_intro","teaching_philosophy","specialties","student_levels","lesson_duration_minutes","currency","id_proof_type","id_proof_url","qualification_proof_url"];
  const clean=Object.fromEntries(Object.entries(values).filter(([k,v])=>allowed.includes(k)&&v!==undefined));
  if(clean.max_students) delete clean.max_students;
  await AppDataSource.getRepository(Tutor).update({id},clean);
  return AppDataSource.getRepository(Tutor).findOneBy({id});
};

const getDashboard = async (tutorId) => {
  const [stats] = await AppDataSource.query(`SELECT
    (SELECT COUNT(*) FROM connection_requests WHERE tutor_id=$1 AND status='pending')::int pending_requests,
    (SELECT COUNT(*) FROM tutor_connections WHERE tutor_id=$1 AND status='active')::int active_students,
    (SELECT COUNT(*) FROM bookings WHERE tutor_id=$1 AND status='confirmed' AND scheduled_start>=NOW())::int upcoming_sessions,
    (SELECT COALESCE(ROUND(AVG(rating)::numeric,2),0) FROM reviews WHERE tutor_id=$1) avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE tutor_id=$1)::int review_count,
    (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.tutor_id=$1 AND m.sender_type='student' AND m.read_at IS NULL)::int unread_messages,
    (SELECT COUNT(*) FROM conversations c WHERE c.tutor_id=$1 AND NOT EXISTS (SELECT 1 FROM tutor_connections tc WHERE tc.student_id=c.student_id AND tc.tutor_id=c.tutor_id AND tc.status='active'))::int direct_inquiries,
    (SELECT COUNT(*) FROM tutor_posts WHERE tutor_id=$1)::int total_posts,
    (SELECT COUNT(*) FROM tutor_posts WHERE tutor_id=$1 AND status='published')::int published_posts`,[tutorId]);
  const upcoming=await AppDataSource.query(`SELECT b.*,s.name student_name,c.name course_name FROM bookings b JOIN students s ON s.id=b.student_id LEFT JOIN courses c ON c.id=b.course_id WHERE b.tutor_id=$1 AND b.status IN ('requested','confirmed') AND b.scheduled_start>=NOW() ORDER BY b.scheduled_start LIMIT 8`,[tutorId]);
  return { ...stats, capacity: 50, available_spots: Math.max(0,50-Number(stats.active_students||0)), upcoming };
};

const getRequests = (tutorId) => AppDataSource.query(`SELECT cr.*,s.name student_name,s.profile_image student_image,s.country student_country,c.name course_name FROM connection_requests cr JOIN students s ON s.id=cr.student_id LEFT JOIN courses c ON c.id=cr.course_id WHERE cr.tutor_id=$1 ORDER BY CASE cr.status WHEN 'pending' THEN 0 ELSE 1 END,cr.created_at DESC`,[tutorId]);

const updateRequestStatus = async (tutorId, requestId, status) => {
  if(!["accepted","rejected"].includes(status)) throw Object.assign(new Error("Status must be accepted or rejected"),{status:400});
  const qr=AppDataSource.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  try {
    const requests=await qr.query(`SELECT * FROM connection_requests WHERE id=$1 AND tutor_id=$2 FOR UPDATE`,[requestId,tutorId]);
    const request=requests[0];
    if(!request) throw Object.assign(new Error("Request not found"),{status:404});
    if(request.status!=="pending") throw Object.assign(new Error("Request has already been processed"),{status:409});
    if(status==="accepted") {
      const tutors=await qr.query(`SELECT max_students FROM tutors WHERE id=$1 FOR UPDATE`,[tutorId]);
      const capacity=Math.min(Number(tutors[0]?.max_students||50),50);
      const [{count}]=await qr.query(`SELECT COUNT(*)::int count FROM tutor_connections WHERE tutor_id=$1 AND status='active'`,[tutorId]);
      if(Number(count)>=capacity) throw Object.assign(new Error("Tutor has reached the 50-student capacity"),{status:409});
      await qr.query(`INSERT INTO tutor_connections(student_id,tutor_id,request_id,status) VALUES($1,$2,$3,'active') ON CONFLICT(student_id,tutor_id) DO UPDATE SET status='active',request_id=EXCLUDED.request_id,ended_at=NULL`,[request.student_id,tutorId,request.id]);
      await qr.query(`INSERT INTO conversations(student_id,tutor_id) VALUES($1,$2) ON CONFLICT(student_id,tutor_id) DO NOTHING`,[request.student_id,tutorId]);
    }
    const updated=(await qr.query(`UPDATE connection_requests SET status=$1,responded_at=NOW(),updated_at=NOW() WHERE id=$2 RETURNING *`,[status,requestId]))[0];
    await qr.query(`INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id) VALUES('student',$1,'connection_${status}',$2,$3,$4)`,[
      request.student_id,
      status==="accepted"?"Tutor accepted your request":"Tutor declined your request",
      status==="accepted"?"You can now book sessions with your tutor.":"You can continue discovering other tutors.",
      requestId,
    ]);
    await qr.commitTransaction(); return updated;
  } catch(error){ await qr.rollbackTransaction(); throw error; } finally { await qr.release(); }
};

const getConnections = (tutorId) => AppDataSource.query(`SELECT tc.*,s.name student_name,s.email student_email,s.profile_image student_image,s.country student_country FROM tutor_connections tc JOIN students s ON s.id=tc.student_id WHERE tc.tutor_id=$1 AND tc.status='active' ORDER BY tc.connected_at DESC`,[tutorId]);

const getAvailability = (tutorId) => AppDataSource.query(`SELECT * FROM tutor_availability WHERE tutor_id=$1 AND is_active=TRUE ORDER BY day_of_week,start_time`,[tutorId]);
const addAvailability = async (tutorId,{day_of_week,start_time,end_time,timezone}) => {
  if(Number(day_of_week)<0||Number(day_of_week)>6||!start_time||!end_time) throw Object.assign(new Error("Valid day, start time and end time are required"),{status:400});
  const rows=await AppDataSource.query(`INSERT INTO tutor_availability(tutor_id,day_of_week,start_time,end_time,timezone) VALUES($1,$2,$3,$4,$5) RETURNING *`,[tutorId,Number(day_of_week),start_time,end_time,timezone||"Asia/Kolkata"]); return rows[0];
};
const removeAvailability = (tutorId,id) => AppDataSource.query(`UPDATE tutor_availability SET is_active=FALSE WHERE id=$1 AND tutor_id=$2`,[id,tutorId]);

const getBookings = (tutorId) => AppDataSource.query(`SELECT b.*,s.name student_name,s.profile_image student_image,c.name course_name FROM bookings b JOIN students s ON s.id=b.student_id LEFT JOIN courses c ON c.id=b.course_id WHERE b.tutor_id=$1 ORDER BY b.scheduled_start DESC`,[tutorId]);
const updateBookingStatus = async (tutorId,id,status,meetingUrl) => {
  if(!["confirmed","completed","declined","cancelled"].includes(status)) throw Object.assign(new Error("Invalid booking status"),{status:400});
  const rows=await AppDataSource.query(`UPDATE bookings SET status=$1,meeting_url=COALESCE($2,meeting_url),updated_at=NOW() WHERE id=$3 AND tutor_id=$4 RETURNING *`,[status,meetingUrl||null,id,tutorId]);
  if(!rows[0]) throw Object.assign(new Error("Booking not found"),{status:404});
  await AppDataSource.query(`INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id) VALUES('student',$1,'booking_${status}',$2,$3,$4)`,[rows[0].student_id,`Booking ${status}`,status==="confirmed"?"Your tutor confirmed the session.":`Your booking is now ${status}.`,id]);
  return rows[0];
};

const setTutorCourses = async (tutorId, courseIds=[]) => {
  await AppDataSource.transaction(async manager => {
    await manager.query(`DELETE FROM tutor_courses WHERE tutor_id=$1`,[tutorId]);
    for(const courseId of courseIds) await manager.query(`INSERT INTO tutor_courses(tutor_id,course_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[tutorId,courseId]);
  });
  return AppDataSource.query(`SELECT c.* FROM tutor_courses tc JOIN courses c ON c.id=tc.course_id WHERE tc.tutor_id=$1 ORDER BY c.name`,[tutorId]);
};

const getTutorCourses = (tutorId) => AppDataSource.query(`
  SELECT c.id,c.name,c.slug,c.category,tc.proficiency_level,tc.custom_rate
  FROM tutor_courses tc JOIN courses c ON c.id=tc.course_id
  WHERE tc.tutor_id=$1 ORDER BY c.name`,[tutorId]);

const getProfileReadiness = async (tutorId) => {
  const [t] = await AppDataSource.query(`SELECT name,title,bio,experience_years,hourly_rate,profile_image,country,languages,skills,education,short_intro,student_levels,lesson_duration_minutes,profile_published,profile_published_at FROM tutors WHERE id=$1`,[tutorId]);
  if(!t) return null;
  const [{course_count}] = await AppDataSource.query(`SELECT COUNT(*)::int course_count FROM tutor_courses WHERE tutor_id=$1`,[tutorId]);
  const [{availability_count}] = await AppDataSource.query(`SELECT COUNT(*)::int availability_count FROM tutor_availability WHERE tutor_id=$1 AND is_active=TRUE`,[tutorId]);
  const checks={
    name:!!t.name?.trim(), title:!!t.title?.trim(), bio:(t.bio||'').trim().length>=80,
    experience:Number(t.experience_years)>=0, rate:Number(t.hourly_rate)>0, country:!!t.country?.trim(),
    languages:Array.isArray(t.languages)&&t.languages.length>0, skills:Array.isArray(t.skills)&&t.skills.length>0,
    education:!!t.education?.trim(), course:Number(course_count)>0, availability:Number(availability_count)>0,
    short_intro:!!t.short_intro?.trim(), student_levels:Array.isArray(t.student_levels)&&t.student_levels.length>0,
    duration:Array.isArray(t.lesson_duration_minutes)&&t.lesson_duration_minutes.length>0
  };
  const completed=Object.values(checks).filter(Boolean).length;
  const completion=Math.round(completed/Object.keys(checks).length*100);
  return {...checks,completion,profile_published:t.profile_published,profile_published_at:t.profile_published_at};
};

const setProfilePublished = async (tutorId,published) => {
  const rows=await AppDataSource.query(`UPDATE tutors SET profile_published=$1,profile_published_at=CASE WHEN $1 THEN COALESCE(profile_published_at,NOW()) ELSE NULL END,updated_at=NOW() WHERE id=$2 RETURNING *`,[published,tutorId]);
  return rows[0];
};

module.exports={getTutorByAuth0Id,onboardTutor,updateTutor,getDashboard,getRequests,updateRequestStatus,getConnections,getAvailability,addAvailability,removeAvailability,getBookings,updateBookingStatus,setTutorCourses,getTutorCourses,getProfileReadiness,setProfilePublished};
