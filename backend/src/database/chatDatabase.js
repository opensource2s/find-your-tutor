const { AppDataSource } = require("../config/db");

const appError = (message, status = 400) => Object.assign(new Error(message), { status });

const resolvePrincipal = async (auth0Id, preferredType = null) => {
  const findStudent=async()=> (await AppDataSource.query(`SELECT id,name,profile_image FROM students WHERE auth0_id=$1 AND is_active=TRUE`,[auth0Id]))[0];
  const findTutor=async()=> (await AppDataSource.query(`SELECT id,name,profile_image FROM tutors WHERE auth0_id=$1 AND is_active=TRUE`,[auth0Id]))[0];
  if(preferredType === "tutor") {
    const tutor=await findTutor();
    if(tutor){await AppDataSource.query(`UPDATE tutors SET last_active_at=NOW() WHERE id=$1`,[tutor.id]);return {type:"tutor",...tutor};}
    return null;
  }
  if(preferredType === "student") { const student=await findStudent(); return student?{type:"student",...student}:null; }
  const student=await findStudent();
  if(student) return {type:"student",...student};
  const tutor=await findTutor();
  if(tutor){await AppDataSource.query(`UPDATE tutors SET last_active_at=NOW() WHERE id=$1`,[tutor.id]);return {type:"tutor",...tutor};}
  return null;
};

const ensureConversationForStudent = async (studentId,tutorId) => {
  const tutor=(await AppDataSource.query(`SELECT id,is_active,is_accepting_messages,profile_published FROM tutors WHERE id=$1`,[tutorId]))[0];
  if(!tutor || !tutor.is_active || !tutor.profile_published) throw appError("Tutor not found",404);
  if(tutor.is_accepting_messages === false) throw appError("This tutor is not accepting new messages right now",409);
  const rows=await AppDataSource.query(`
    INSERT INTO conversations(student_id,tutor_id,student_archived)
    VALUES($1,$2,FALSE)
    ON CONFLICT(student_id,tutor_id) DO UPDATE SET student_archived=FALSE
    RETURNING *`,[studentId,tutorId]);
  return rows[0];
};

const markDelivered = async (principal) => {
  const field=principal.type==="student"?"c.student_id":"c.tutor_id";
  await AppDataSource.query(`
    UPDATE messages m
    SET delivered_at=COALESCE(m.delivered_at,NOW())
    FROM conversations c
    WHERE m.conversation_id=c.id
      AND ${field}=$1
      AND NOT(m.sender_type=$2 AND m.sender_id=$1)
      AND m.delivered_at IS NULL`,[principal.id,principal.type]);
};

const getConversations = async (principal, includeArchived=false) => {
  await markDelivered(principal);
  const archivedField=principal.type==="student"?"c.student_archived":"c.tutor_archived";
  return AppDataSource.query(`
    SELECT c.id,c.student_id,c.tutor_id,c.last_message_at,c.created_at,
      c.student_archived,c.tutor_archived,c.student_muted,c.tutor_muted,
      s.name student_name,s.profile_image student_image,t.name tutor_name,t.profile_image tutor_image,
      t.title tutor_title,t.is_verified,t.response_time_hours,t.last_active_at,
      lm.body last_message,lm.created_at last_message_created_at,lm.sender_type last_message_sender_type,lm.deleted_at last_message_deleted_at,
      (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.read_at IS NULL AND m.deleted_at IS NULL AND NOT (m.sender_type=$1 AND m.sender_id=$2)) unread_count,
      EXISTS(SELECT 1 FROM tutor_connections tc WHERE tc.student_id=c.student_id AND tc.tutor_id=c.tutor_id AND tc.status='active') connected
    FROM conversations c
    JOIN students s ON s.id=c.student_id
    JOIN tutors t ON t.id=c.tutor_id
    LEFT JOIN LATERAL (
      SELECT body,created_at,sender_type,deleted_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1
    ) lm ON TRUE
    WHERE ${principal.type==="student"?"c.student_id=$2":"c.tutor_id=$2"}
      AND ($3::boolean=TRUE OR ${archivedField}=FALSE)
    ORDER BY COALESCE(c.last_message_at,c.created_at) DESC`,[principal.type,principal.id,!!includeArchived]);
};

const assertConversationAccess = async (principal,conversationId) => {
  const rows=await AppDataSource.query(`SELECT * FROM conversations WHERE id=$1 AND ${principal.type==="student"?"student_id=$2":"tutor_id=$2"}`,[conversationId,principal.id]);
  if(!rows[0]) throw appError("Conversation not found",404);
  return rows[0];
};

const getMessages = async (principal,conversationId) => {
  await assertConversationAccess(principal,conversationId);
  await AppDataSource.query(`
    UPDATE messages
    SET delivered_at=COALESCE(delivered_at,NOW()), read_at=COALESCE(read_at,NOW()), is_read=TRUE
    WHERE conversation_id=$1
      AND NOT(sender_type=$2 AND sender_id=$3)
      AND read_at IS NULL`,[conversationId,principal.type,principal.id]);
  return AppDataSource.query(`
    SELECT m.*,r.body reply_body,r.sender_type reply_sender_type,r.deleted_at reply_deleted_at
    FROM messages m
    LEFT JOIN messages r ON r.id=m.reply_to_message_id
    WHERE m.conversation_id=$1
    ORDER BY m.created_at ASC
    LIMIT 500`,[conversationId]);
};

const sendMessage = async (principal,conversationId,body,replyToMessageId=null) => {
  if(!body||!body.trim()||body.trim().length>2000) throw appError("Message must be between 1 and 2000 characters",400);
  const conversation=await assertConversationAccess(principal,conversationId);
  if(replyToMessageId) {
    const [reply]=await AppDataSource.query(`SELECT id FROM messages WHERE id=$1 AND conversation_id=$2`,[replyToMessageId,conversationId]);
    if(!reply) throw appError("Reply message not found",404);
  }
  const rows=await AppDataSource.query(`
    INSERT INTO messages(conversation_id,sender_type,sender_id,body,is_read,delivered_at,read_at,reply_to_message_id)
    VALUES($1,$2,$3,$4,FALSE,NULL,NULL,$5)
    RETURNING *`,[conversationId,principal.type,principal.id,body.trim(),replyToMessageId||null]);
  await AppDataSource.query(`UPDATE conversations SET last_message_at=NOW(),student_archived=CASE WHEN $2='student' THEN FALSE ELSE student_archived END,tutor_archived=CASE WHEN $2='tutor' THEN FALSE ELSE tutor_archived END WHERE id=$1`,[conversationId,principal.type]);
  const recipientType=principal.type==="student"?"tutor":"student";
  const recipientId=principal.type==="student"?conversation.tutor_id:conversation.student_id;
  await AppDataSource.query(`
    INSERT INTO notifications(recipient_type,recipient_id,type,title,body,reference_id)
    VALUES($1,$2,'message','New message',$3,$4)`,[recipientType,recipientId,body.trim().slice(0,160),conversationId]);
  return rows[0];
};

const editMessage = async (principal,conversationId,messageId,body) => {
  if(!body||!body.trim()||body.trim().length>2000) throw appError("Message must be between 1 and 2000 characters",400);
  await assertConversationAccess(principal,conversationId);
  const rows=await AppDataSource.query(`
    UPDATE messages SET body=$1,edited_at=NOW()
    WHERE id=$2 AND conversation_id=$3 AND sender_type=$4 AND sender_id=$5 AND deleted_at IS NULL
      AND created_at >= NOW() - INTERVAL '15 minutes'
    RETURNING *`,[body.trim(),messageId,conversationId,principal.type,principal.id]);
  if(!rows[0]) throw appError("You can edit only your own messages within 15 minutes",409);
  return rows[0];
};

const deleteMessage = async (principal,conversationId,messageId) => {
  await assertConversationAccess(principal,conversationId);
  const rows=await AppDataSource.query(`
    UPDATE messages SET body='Message deleted',deleted_at=NOW(),edited_at=NULL
    WHERE id=$1 AND conversation_id=$2 AND sender_type=$3 AND sender_id=$4 AND deleted_at IS NULL
    RETURNING *`,[messageId,conversationId,principal.type,principal.id]);
  if(!rows[0]) throw appError("You can delete only your own messages",403);
  return rows[0];
};

const setConversationPreference = async (principal,conversationId,{archived,muted}) => {
  await assertConversationAccess(principal,conversationId);
  const updates=[]; const values=[];
  if(typeof archived==="boolean") { values.push(archived); updates.push(`${principal.type}_archived=$${values.length}`); }
  if(typeof muted==="boolean") { values.push(muted); updates.push(`${principal.type}_muted=$${values.length}`); }
  if(!updates.length) throw appError("Provide archived or muted",400);
  values.push(conversationId);
  const rows=await AppDataSource.query(`UPDATE conversations SET ${updates.join(",")} WHERE id=$${values.length} RETURNING *`,values);
  return rows[0];
};

module.exports={resolvePrincipal,ensureConversationForStudent,getConversations,getMessages,sendMessage,editMessage,deleteMessage,setConversationPreference};
