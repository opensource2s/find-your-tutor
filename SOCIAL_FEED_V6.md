# Tutorly Social Feed v6

## Product goal
Tutor posts are not a generic social network. They are a tutor-discovery layer:
Tutor publishes useful educational content -> student reads it -> opens tutor profile ->
messages the tutor and/or sends a connection request -> tutor replies and accepts.

## New database tables
- tutor_posts
- post_likes
- post_comments
- post_saves

Each post belongs to one tutor and can optionally belong to one course.
Likes/comments support student or tutor authors.
Saved posts belong to students.
Deleting a post cascades to its likes/comments/saves.

## New public/student screens
- /feed                Tutor Feed
- /posts/:id           Post details + comments
- /saved-posts         Student saved-post library

## New tutor screens
- /tutor/posts         My Posts / content studio
- /tutor/posts/new     Create post
- /tutor/posts/:id/edit
- /tutor/feed          Tutor view of feed

## New API
Public:
- GET /api/posts
- GET /api/posts/:id

Authenticated social:
- GET    /api/posts/:id/viewer?role=student|tutor
- POST   /api/posts/:id/like?role=student|tutor
- DELETE /api/posts/:id/like?role=student|tutor
- POST   /api/posts/:id/comments?role=student|tutor
- PATCH  /api/posts/:id/comments/:commentId?role=student|tutor
- DELETE /api/posts/:id/comments/:commentId?role=student|tutor
- POST   /api/posts/:id/save             (student)
- DELETE /api/posts/:id/save             (student)
- GET    /api/posts/saved/me             (student)

Tutor content management:
- GET    /api/tutor-portal/posts
- GET    /api/tutor-portal/posts/:id
- POST   /api/tutor-portal/posts
- PATCH  /api/tutor-portal/posts/:id
- DELETE /api/tutor-portal/posts/:id

## Tutor cards / photos
The large yellow image block is removed.
Tutor cards now use a small circular avatar like a professional marketplace/chat app.
If no image exists, initials are shown.
Clicking a real tutor photo opens a larger preview.

## Run migration
cd backend
npm install
npm run db:upgrade
npm run dev

Then:
cd frontend
npm install
npm run dev

## Recommended end-to-end test
1. Tutor logs in.
2. Tutor completes profile and has a visible marketplace profile.
3. Tutor opens My Posts -> Create Post.
4. Publish "3 common C pointer mistakes" under C Programming.
5. Student logs in and opens Tutor Feed.
6. Filter by C Programming.
7. Like the post, comment and save it.
8. Open the tutor profile from the post.
9. Click Message Tutor and send a message.
10. Send Request to Connect.
11. Tutor sees the request, accepts it, sees the conversation and replies.
12. Student sees accepted connection, tutor reply and message receipt ticks.

## Notifications
When a student comments on a tutor post, a tutor notification is created so the tutor can return to the discussion.
