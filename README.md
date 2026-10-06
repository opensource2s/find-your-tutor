# Tutorly — full-stack tutor marketplace

Tutorly is a React + Node.js + PostgreSQL + TypeORM + Auth0 portfolio application with separate student and tutor experiences.

## Core workflow

Students register once in Tutorly, login through Auth0, search tutors by subject/course/country/language/experience/rating/price/availability, open detailed tutor profiles, send direct messages and connection requests. Tutors register once in Tutorly, login through Auth0, build/publish a profile, receive inquiries, reply in chat and accept or reject student requests. Accepted relationships are persisted in `tutor_connections`.

## Authentication

Signup is **not** Auth0 Universal Login signup. Tutorly collects the registration form once and the Node backend creates the Auth0 database identity through the Management API plus the local PostgreSQL profile. Login is handled by Auth0 Universal Login and access tokens protect Node APIs. Passwords are never stored in PostgreSQL.

## Main data model

The project uses separate `students` and `tutors` tables plus normalized tables for courses, tutor courses, availability, connection requests, accepted connections, bookings, favorites, conversations, messages, notifications and reviews. Reviews remain a separate table.

## Chat

Students can initiate conversations before connection acceptance. Tutors can reply to incoming conversations. Messages are persisted and support one tick (sent), two ticks (delivered) and blue double ticks (read), plus reply/edit/delete/archive/mute behavior.

## Tutor verification

Tutor profiles include optional ID-proof and qualification-proof fields plus a verification-status model. They are deliberately **not mandatory** during current development/testing.

## Run

Backend:
```bash
cd backend
npm install
npm run db:upgrade
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/home`.

See `AUTH0_SETUP.md` for authentication configuration and `END_TO_END_V3.md` for the complete end-to-end test sequence and API/screen checklist.
