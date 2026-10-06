# Tutorly end-to-end v3 test guide

## Goal

Create tutors and students, then test the complete workflow:

Student signup → student login → tutor search → tutor profile → direct message → connection request → tutor login → tutor reads/replies → tutor accepts request → persistent connection → optional booking/review.

## Database records involved

- `students`: one application profile per student Auth0 identity.
- `tutors`: one tutor profile per tutor Auth0 identity.
- `courses`: normalized subjects such as C Programming, React and Node.js.
- `tutor_courses`: which courses each tutor teaches.
- `tutor_availability`: tutor weekly schedule.
- `connection_requests`: every pending/accepted/rejected/cancelled student request.
- `tutor_connections`: persistent accepted student↔tutor relationships.
- `conversations`: one student↔tutor chat thread.
- `messages`: every message plus sent/delivered/read timestamps.
- `reviews`: separate review table.
- `favorites`: saved tutors.
- `bookings`: tutoring sessions.
- `notifications`: request/message/booking activity.

## Database upgrade

From `backend`:

```bash
npm install
npm run db:upgrade
npm run dev
```

Expected migration list includes:
- `portfolio_upgrade.sql`
- `marketplace_messaging_upgrade.sql`
- `tutor_profile_chat_v2.sql`
- `end_to_end_v3.sql`

Then from `frontend`:

```bash
npm install
npm run dev
```

## Tutor test flow

1. Open `/tutor/signup`.
2. Register with Tutorly's single form. There must be no second Auth0 signup screen.
3. Login at `/tutor/login` using Auth0 email/password.
4. Open `/tutor/profile`.
5. Complete the profile, select at least one course and add availability.
6. ID proof and qualification proof are optional.
7. Publish profile.
8. Repeat for your test tutors.

A newly created tutor is not searchable until their profile is published.

## Student test flow

1. Open `/signup` and register.
2. Login at `/login`.
3. Search `/home`, e.g. `C language`.
4. Open a tutor profile.
5. Click **Message tutor** and send a message.
6. Return to tutor profile and click **Request to connect**.
7. Student can see request status from `/dashboard`.

## Tutor response flow

1. Login as the tutor.
2. `/tutor/messages` shows the student inquiry.
3. Opening the chat marks incoming messages read.
4. Reply to the student.
5. `/tutor/requests` shows the formal connection request.
6. Click **Accept**.
7. `tutor_connections` stores the active relationship; the request remains in `connection_requests` as accepted.
8. `/tutor/students` shows the accepted student.

## Message receipts

- `✓`: message row exists; recipient has not received it in their inbox session yet.
- `✓✓`: `delivered_at` set.
- blue `✓✓`: `read_at` set after the recipient opens the conversation.

## Important screens

Public:
`/home`, `/tutors/:id`, `/about`, `/how-it-works`, `/faq`, `/rules`, `/safety`, `/terms`, `/privacy`, `/copyright`, `/contact`

Student:
`/signup`, `/login`, `/dashboard`, `/student/profile`, `/messages`, `/notifications`

Tutor:
`/tutor/signup`, `/tutor/login`, `/tutor/dashboard`, `/tutor/profile`, `/tutor/requests`, `/tutor/students`, `/tutor/messages`, `/tutor/notifications`

## Core APIs

Public/auth:
- `POST /api/auth/register/student`
- `POST /api/auth/register/tutor`
- `POST /api/auth/forgot-password`
- `POST /api/auth/signin` (JWT required)
- `GET /api/auth/me` (JWT required)

Marketplace:
- `GET /api/tutors`
- `GET /api/tutors/:id`
- `GET /api/tutors/meta/courses`
- `GET /api/tutors/meta/countries`

Student:
- `GET/PATCH /api/student/me`
- `POST /api/student/requests/:tutorId`
- `GET /api/student/requests`
- `PATCH /api/student/requests/:id/cancel`
- favorites, connections, bookings, reviews and notifications endpoints

Tutor portal:
- `GET/PATCH /api/tutor-portal/me`
- courses, availability, publish/unpublish
- `GET /api/tutor-portal/requests`
- `PATCH /api/tutor-portal/requests/:id`
- `GET /api/tutor-portal/students`
- bookings and notifications endpoints

Chat:
- `GET /api/chat/conversations?role=student|tutor`
- `POST /api/chat/conversations/:tutorId` — student only
- `GET /api/chat/conversations/:id/messages?role=...`
- `POST /api/chat/conversations/:id/messages?role=...`
- edit/delete/archive/mute endpoints
