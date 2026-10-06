# Tutorly — Tutor Profile & Chat V2

## Tutor marketplace
- Public tutor profiles are publishable drafts. A tutor must reach at least 80% profile readiness before publishing.
- Search supports subject/course aliases such as `C language` → `C Programming` and filters for country, language, teaching mode, student level, minimum experience, day/time, rating and hourly rate.
- Rich public profiles show title, short introduction, biography, teaching philosophy, courses, skills, specialties, student levels, languages, lesson durations, credentials, professional links, reviews, availability, experience, completed lessons and response expectations.

## Tutor profile studio
Route: `/tutor/profile`

Tutors can manage:
- identity, photo, title, location and pricing
- short introduction and full biography
- courses, skills and specialties
- languages, student levels and teaching modes
- teaching philosophy
- education, certifications and achievements
- LinkedIn, website and introduction video
- lesson durations
- weekly availability
- response time, trial lesson and direct-message settings
- draft/publish/unpublish state and completion checklist

Only the authenticated tutor can edit these fields.

## Chat
Routes: `/messages` for students and `/tutor/messages` for tutors.

Features:
- student initiates conversation from a tutor public profile
- tutor receives the inquiry and can reply
- one conversation per student/tutor pair
- single tick = sent
- double tick = delivered
- blue double tick = read
- unread counters
- direct-inquiry vs connected-student state
- reply to message
- edit own message within 15 minutes
- delete own message
- date separators
- archive conversation
- mute/unmute conversation
- tutor last-active display for students
- conversation search
- polling-based near-real-time updates

Booking remains restricted to accepted tutor connections.

## Database upgrade
Run from `backend`:

```bash
npm install
npm run db:upgrade
```

This now applies:
1. `portfolio_upgrade.sql`
2. `marketplace_messaging_upgrade.sql`
3. `tutor_profile_chat_v2.sql`
