# Tutorly E2E Reliability v4

This build fixes the exact end-to-end flow under test:

1. Tutor signs up once in Tutorly.
2. Tutor logs in and lands on /tutor/dashboard.
3. New test tutors are immediately discoverable after successful signup.
4. Student searches by keyword or Course dropdown.
5. Student opens tutor profile.
6. Student can send a connection request.
7. connection_requests persists the request and a tutor notification is created.
8. Tutor sees the request in /tutor/requests or dashboard.
9. Tutor accepts in a DB transaction.
10. tutor_connections persists the active student+tutor relationship.
11. Student gets an acceptance notification.
12. Student can open direct chat before or after acceptance.
13. conversations stores one student+tutor conversation.
14. messages stores each message.
15. sent = row exists; delivered = recipient inbox polling; read = recipient opens the conversation.

Key v4 fixes:
- Student login now stores role/path BEFORE Auth0 redirect.
- Both login flows request the Tutorly API audience during interactive login.
- consent_required/login_required are handled instead of leaving a dead page.
- Existing/new test tutors with valid signup data are published for search.
- Signup skills are normalized into tutor_courses for dropdown filtering.
- Student chat creation explicitly resolves as student.
- Home shows API errors instead of silently looking like "0 tutors".

Run:
cd backend
npm install
npm run db:upgrade
npm test
npm run dev

Then in another terminal:
cd frontend
npm install
npm run dev
