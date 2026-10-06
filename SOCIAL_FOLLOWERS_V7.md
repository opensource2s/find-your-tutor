# Tutorly Social + Followers v7

## What this adds
Tutorly now has a tutor-focused social layer instead of a generic Facebook clone.

Tutor -> builds profile -> publishes educational posts -> gains followers.
Student -> follows tutor -> sees that tutor in Following -> receives new posts in Following Feed -> likes/comments/saves -> opens tutor profile -> messages/connects.

## Database
New v6 social tables:
- tutor_posts
- post_likes
- post_comments
- post_saves

New v7 social-graph table:
- tutor_followers

`tutor_followers` has a unique `(tutor_id, student_id)` pair, cascading FKs, post-notification preference and indexes for both directions.

## Student screens
- `/feed` - discover all published tutor content
- `/following-feed` - only posts from tutors the student follows
- `/following` - all tutors followed by the student
- `/saved-posts` - saved tutor posts
- `/posts/:id` - post + comments/replies
- `/tutors/:id` - tutor profile, follower/post counts and Follow/Following action

## Tutor screens
- `/tutor/posts` - content studio
- `/tutor/posts/new` - create a post
- `/tutor/posts/:id/edit` - edit/draft/archive
- `/tutor/followers` - follower list
- `/tutor/feed` - tutor feed

## Social behavior
- Only students can follow/unfollow tutors.
- Following is separate from a learning connection. A student can follow without sending a connection request.
- Students and tutors can like/comment on posts.
- Only students save tutor posts.
- Tutor gets a notification when a student follows or comments.
- Followers with alerts enabled get a notification when a tutor publishes a new post.
- Publishing a draft later sends the notification once; editing an already-published post does not resend it.
- Tutor can disable comments per post.
- Post deletion cascades through likes/comments/saves.

## Run
Backend:
```
cd backend
npm install
npm run db:upgrade
npm run dev
```

Frontend:
```
cd frontend
npm install
npm run dev
```

## End-to-end test
1. Register/login Tutor A.
2. Complete and publish Tutor A profile.
3. Student A logs in -> Tutor A profile -> Follow.
4. Student A sees Tutor A under Following.
5. Tutor A sees Student A under Followers and gets New follower notification.
6. Tutor A publishes a teaching tip.
7. Student A sees it in Following Feed and gets a new-post notification.
8. Student likes, comments and saves the post.
9. Tutor gets comment notification.
10. Student opens Tutor A from the post, sends a message and connection request.
11. Tutor accepts and replies using the existing request/chat system.
