# Backend signup and signin with Auth0

Auth0 Universal Login creates accounts, collects passwords, authenticates users, and issues access tokens. This backend never accepts or stores passwords and does not issue a second application JWT.

After Auth0 login, send an **access token for this API** with every request below:

```http
Authorization: Bearer <AUTH0_ACCESS_TOKEN>
Content-Type: application/json
```

The backend verifies RS256 signatures, issuer, audience and token expiration. ID tokens and machine-to-machine tokens cannot be used to register or sign in as a user.

## Endpoints

| Method | URL | Behavior |
| --- | --- | --- |
| POST | `/api/auth/register/student` | Save a student profile after Auth0 signup |
| POST | `/api/auth/register/tutor` | Save a tutor profile after Auth0 signup |
| POST | `/api/auth/signin` | Return an existing profile for the selected role |
| GET | `/api/auth/me` | Return active profiles, available roles and registration status |
| GET | `/api/auth/test` | Check JWT validation |

Existing frontend endpoints remain supported: `POST /api/student/register` and `POST /api/tutor-portal/onboard`. They call the same registration handlers.

Student registration body:

```json
{
  "name": "Student Name",
  "mobile": "+919876543210",
  "country": "India",
  "timezone": "Asia/Kolkata",
  "preferred_languages": ["English", "Hindi"]
}
```

Tutor registration body:

```json
{
  "name": "Tutor Name",
  "mobile": "+919876543211",
  "title": "Mathematics Teacher",
  "hourly_rate": 500,
  "experience_years": 3,
  "country": "India",
  "city": "Hyderabad",
  "timezone": "Asia/Kolkata",
  "tutor_type": "teacher",
  "skills": ["Mathematics"],
  "languages": ["English"],
  "teaching_modes": ["online"],
  "bio": "I teach mathematics."
}
```

Required: name and mobile for students; name, mobile, professional title and hourly rate for tutors. Contact numbers are stored as profile data; this flow does not verify ownership of a phone number. Rates must be non-negative. Tutors always start unverified with capacity 50.

Registration fetches `/userinfo` from the configured Auth0 tenant with the validated access token, verifies that its `sub` matches, and uses its email/image. Never send a password or rely on a browser-supplied email or Auth0 ID. Auth0 is the source of identity; PostgreSQL stores the application profile. An Auth0 account without an email may register using the mandatory mobile number.

First registration returns HTTP 201 with `{ "success": true, "role": "student", "created": true, "student": { ... } }`. Tutor responses use `tutor`. Retrying an already registered subject returns HTTP 200 and the original profile without overwriting it. A contact collision with another identity returns 409; accounts are never automatically linked by email or mobile. Disabled profiles cannot re-register.

Signin body:

```json
{ "role": "student" }
```

Use `"tutor"` for tutor signin. Success returns HTTP 200 with `authenticated`, `role`, and the selected profile. This request completes application signin **after Auth0 authenticates credentials**; it does not accept email/password. It never creates database rows.

`GET /api/auth/me` does not create profiles either. An authenticated but unregistered user gets HTTP 200, `roles: []`, and `registration_required: true`. An account can hold both roles; callers select a role explicitly at signin. This does not change the separate chat identity resolution implementation.

## Errors

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_ROLE` / `REQUEST_FAILED` | Invalid role or profile fields |
| 400 | `PASSWORD_MANAGED_BY_AUTH0` | Password submitted to the profile endpoint |
| 401 | JWT middleware rejection | Missing, expired, incorrectly signed, wrong issuer/audience token |
| 401 | `USER_TOKEN_REQUIRED` | No user subject or machine identity |
| 401 | `AUTH0_PROFILE_ACCESS_DENIED` | Token cannot read Auth0 userinfo; sign in again with the required scopes |
| 403 | `ACCOUNT_DISABLED` | Requested profile is inactive |
| 404 | `REGISTRATION_REQUIRED` | Auth0 authentication succeeded but the requested role has no profile |
| 409 | `CONTACT_ALREADY_REGISTERED` | Contact already belongs to another profile of this role |
| 502 | `IDENTITY_PROVIDER_UNAVAILABLE` | Auth0 profile request failed; retry later |

Registration and signin responses omit `password_hash`. Existing student protected routes now require registration instead of silently creating incomplete student records. Frontend handling of registration-required responses during normal login is separate follow-up work.

## Auth0 configuration required for live testing

Set `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` in `backend/.env`. The frontend must use the same intended tenant/issuer and API audience, and request `openid profile email` scopes.

In Auth0, the SPA application must be authorized for **user-delegated access** to the API identifier `https://tutorly-api`. Allow `http://localhost:5173` as the local callback/logout URL and web origin. Enable the application's intended login connection and signup in that connection.

The current browser error (“Client ... is not authorized ...”) occurs before a valid access token reaches these backend endpoints. Backend changes cannot grant the SPA access inside the Auth0 dashboard. Auth0 tenant setup and a real browser login must still be verified.

Official references:
- https://auth0.com/docs/quickstart/backend/nodejs
- https://auth0.com/docs/api/authentication/user-profile/get-user-info
- https://auth0.com/docs/get-started/apis/api-access-policies-for-applications

## Run and verify

From `backend`, run `npm run dev` to start the API and `npm test` for unit and HTTP tests. The HTTP tests use real RS256 signature verification with a local test JWKS server; Auth0 userinfo and database results are mocked. They do not prove live tenant configuration.

Optional PostgreSQL integration test in PowerShell:

```powershell
$env:RUN_AUTH_DB_TESTS = "true"
node --test test/authDatabase.test.js
Remove-Item Env:RUN_AUTH_DB_TESTS
```

This test uses the configured database, creates student/tutor profiles inside one transaction, checks signin and repeat registration, and rolls back all test records. Auth0 userinfo is mocked; no real Auth0 accounts are created.
