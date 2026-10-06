# Tutorly Auth0 setup — current architecture

Tutorly uses **one signup form per role**. The browser does not open Auth0's hosted signup page.

## Signup

Student:
`/signup` → `POST /api/auth/register/student` → Node backend → Auth0 Management API creates credential identity → PostgreSQL creates `students` row → `/login?registered=1`

Tutor:
`/tutor/signup` → `POST /api/auth/register/tutor` → Node backend → Auth0 Management API creates credential identity → PostgreSQL creates `tutors` row → `/tutor/login?registered=1`

Passwords are never written to PostgreSQL.

## Login

Login still uses Auth0 Universal Login:

`Tutorly login button` → Auth0 verifies email/password → SPA receives token → `POST /api/auth/signin` with Bearer token → backend maps JWT `sub` to the requested student/tutor profile.

Email OTP is intentionally left as the second login method for later configuration. Both student and tutor login pages use `VITE_AUTH0_EMAIL_CONNECTION`.

## Auth0 applications

1. **Tutorly Frontend** — Single Page Application. Used for student/tutor login.
2. **Tutorly Backend M2M** — Machine-to-Machine application. Used only by Node to call Auth0 Management API during signup.
3. **Tutorly API** — API audience/identifier. Example: `https://tutorly-api`.

Do not put the M2M client secret in the React `.env`.

## SPA settings

Allowed Callback URLs:
`http://localhost:5173`

Allowed Logout URLs:
`http://localhost:5173`

Allowed Web Origins:
`http://localhost:5173`

The SPA must be allowed to request access tokens for the Tutorly API audience.

## Backend environment

Copy `backend/.env.example` to `.env` and fill your real values.

Important values:
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_CLIENT_ID` — SPA client ID, used by forgot-password endpoint
- `AUTH0_M2M_CLIENT_ID`
- `AUTH0_M2M_CLIENT_SECRET`
- `AUTH0_DB_CONNECTION=Username-Password-Authentication`

## Frontend environment

Copy `frontend/.env.example` to `.env` and configure:
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`
- `VITE_AUTH0_DB_CONNECTION`
- `VITE_AUTH0_EMAIL_CONNECTION=email`

## Important registration rule

These are the only signup APIs used by the current application:

- `POST /api/auth/register/student` — public
- `POST /api/auth/register/tutor` — public

The older token-first registration routes were removed so there is no second signup method competing with Tutorly's form.
