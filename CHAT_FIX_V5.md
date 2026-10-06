# Chat Fix v5

Fixes the blank/disappearing chat screen after opening a newly created conversation.

Changes:
- defensive normalization of conversations/messages API responses
- conversation ID stays synchronized with the URL
- safe handling of missing/invalid dates and names
- visible API error messages instead of blank rendering
- loading states for conversation list and messages
- app-level React ErrorBoundary so a render failure shows the actual error
- student/tutor role stays explicit in every chat API call

Test:
1. Student login
2. Open tutor profile
3. Message tutor
4. /messages?conversation=<id> must remain visible
5. Send first message
6. Tutor login -> /tutor/messages
7. Open student conversation and reply
8. Student reopens chat and sees tutor reply
