# MongoDB Final Cleanup and Recovery Report

Generated: 2026-06-04

## 1. Executive Summary

The active backend for this project uses MongoDB through Mongoose. PostgreSQL is not required by the running backend.

The incorrect PostgreSQL assumption has been corrected in code, dependency configuration, tests, and documentation. Proven-unused PostgreSQL/SQL duplicate files were archived under `legacy-postgresql-unused/` instead of deleted.

Current status: MongoDB backend is structurally clean and tests pass, but live startup cannot complete until a reachable MongoDB instance is available through `MONGO_URI` or local MongoDB at `mongodb://localhost:27017/cinema_db`.

## 2. Proof That MongoDB Is The Active Database

| Evidence | Result |
| --- | --- |
| Root `package.json` | Contains `mongoose`; no active `pg` dependency. `start` runs `node backend/server.js`. |
| `backend/package.json` | Contains `mongoose`; no active `pg` dependency. |
| `backend/config/database.js` | Imports `mongoose`, reads `process.env.MONGO_URI`, falls back to `mongodb://localhost:27017/cinema_db`, and calls `mongoose.connect(...)`. |
| `backend/server.js` | Imports `connectDB` from `./config/database` and starts Express only after MongoDB connection resolves. |
| Active model folder | `backend/models` contains Mongoose schemas for `User`, `Movie`, `Theater`, `Seat`, `Show`, `Booking`, and `Payment`. |
| Active controllers/routes | Controllers import models from `../models/...`; routes are mounted from `backend/routes/...` by `backend/server.js`. |
| Startup probe | `node backend/server.js` attempts MongoDB and fails with `ECONNREFUSED ::1:27017, 127.0.0.1:27017` when no MongoDB server is running. No PostgreSQL connection is attempted. |

## 3. Active Backend Path

The active backend entry point is:

- `backend/server.js`

The root `server.js` is now only a compatibility wrapper that loads the real MongoDB backend:

- `module.exports = require('./backend/server');`

The active npm startup path is:

- `npm start` -> `node backend/server.js`
- `npm run dev` -> `nodemon backend/server.js`
- `npm run seed` -> `node backend/seeds/seed.js`

## 4. PostgreSQL/SQL References Found

The project contained old duplicate SQL/PostgreSQL material in root-level backend-like folders and nested duplicate folders, including:

- `config/`
- `controllers/`
- `database/`
- `middleware/`
- `models/`
- `routes/`
- `seeds/`
- `update_password.js`
- `backend/backend/`
- `backend/database/`
- old SQL reports and generated snapshots

These files were not connected to the active startup path after verification. The running backend imports from `backend/...`, not from those duplicate root SQL folders.

## 5. PostgreSQL/SQL References Removed, Archived, Or Marked Legacy

Proven-unused SQL/PostgreSQL files were archived here:

- `legacy-postgresql-unused/`

Archived legacy contents include:

- `legacy-postgresql-unused/database/`
- `legacy-postgresql-unused/backend__database/`
- `legacy-postgresql-unused/config/`
- `legacy-postgresql-unused/controllers/`
- `legacy-postgresql-unused/models/`
- `legacy-postgresql-unused/routes/`
- `legacy-postgresql-unused/middleware/`
- `legacy-postgresql-unused/seeds/`
- `legacy-postgresql-unused/backend__backend/`
- `legacy-postgresql-unused/superseded-reports-and-generated-snapshots/`

No SQL file was treated as active. No PostgreSQL file is required to start the backend.

## 6. MongoDB Environment Variables

Required:

- `MONGO_URI`

Default if omitted:

- `mongodb://localhost:27017/cinema_db`

Local MongoDB setup:

- Start a local MongoDB server on port `27017`.
- Use `MONGO_URI=mongodb://localhost:27017/cinema_db`.

MongoDB Atlas setup:

- Set `MONGO_URI` to the Atlas connection string.
- Allow this machine's IP in Atlas Network Access.
- Make sure the Atlas database user has read/write access.

Other important environment variables:

- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `TMDB_API_KEY`
- `OPENAI_API_KEY`
- `FRONTEND_URL`

`.env.example` has been updated to document the MongoDB configuration.

## 7. MongoDB Connection Status

Command run:

- `node backend/server.js`

Observed result:

- The backend attempted to connect to MongoDB.
- It did not attempt PostgreSQL.
- It failed because no MongoDB endpoint is currently reachable:

```text
MongoDB disconnected
MongoDB connection error: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

Conclusion:

- MongoDB wiring is correct.
- Live database verification still requires local MongoDB running or a valid Atlas `MONGO_URI`.

## 8. Models Verified

Active Mongoose/MongoDB models:

| Model | File | MongoDB status |
| --- | --- | --- |
| User | `backend/models/User.js` | Mongoose model |
| Movie | `backend/models/Movie.js` | Mongoose model |
| Theater | `backend/models/Theater.js` | Mongoose model |
| Seat | `backend/models/Seat.js` | Mongoose model |
| Show | `backend/models/Show.js` | Mongoose model |
| Booking | `backend/models/Booking.js` | Mongoose model |
| Payment | `backend/models/Payment.js` | Mongoose model |

## 9. Routes Verified

Active routes are mounted in `backend/server.js`:

| Route prefix | Active route file | Data source |
| --- | --- | --- |
| `/api/movies` | `backend/routes/movies.js` | MongoDB/Mongoose models |
| `/api/bookings` | `backend/routes/bookings.js` | MongoDB/Mongoose models |
| `/api/users` | `backend/routes/users.js` | MongoDB/Mongoose models |
| `/api/payments` | `backend/routes/payments.js` | MongoDB/Mongoose models |
| `/api/shows` | `backend/routes/shows.js` | MongoDB/Mongoose models |
| `/api/theaters` | `backend/routes/theaters.js` | MongoDB/Mongoose models |
| `/api/tickets` | `backend/routes/tickets.js` | MongoDB/Mongoose models |
| `/api/chatbot` | `backend/routes/chatbot.js` | backend utilities |
| `/api/contact` | `backend/routes/contact.js` | backend email utility |

## 10. Frontend And Admin Connection Status

| Flow | Status |
| --- | --- |
| Public movie data | Uses backend API routes backed by MongoDB models. |
| Public showtime data | Uses backend show routes backed by MongoDB `Show`, `Movie`, and `Theater`. |
| Customer login/auth | Uses backend user controller and MongoDB `User` model. |
| Admin login/auth | Fixed to return admin token/user data directly for admin/superadmin logins. |
| Admin bookings dashboard | Uses real `/api/bookings`; no fake fallback data should be treated as source of truth. |
| Admin dashboard data | Uses real backend APIs and empty/error states when backend data is unavailable. |
| Admin poster upload | Added backend upload middleware and `/api/movies/upload/poster`; saved URLs point to `/uploads/...`. |

## 11. Booking And Double Booking Status

Booking flow was rechecked using MongoDB assumptions.

Fixes applied:

- Removed old numeric ID assumptions in `frontend/js/booking.js` so MongoDB ObjectIds are accepted.
- Booking creation now requires all selected seat ObjectIds to resolve before checkout continues.
- Checkout no longer continues into fake/local success if backend booking creation fails.
- `backend/models/Booking.js` validates:
  - valid MongoDB ObjectIds
  - no duplicate seat IDs in one request
  - show exists
  - selected seats belong to the show's theater
  - selected seats are not already attached to a non-cancelled booking
- Booking model now has indexes for user, show, status, and show/seat/status lookups.
- Additional unique partial indexes were added for active booking statuses.

Remaining live verification:

- Unique index creation must be verified against a running MongoDB database during first startup.
- Concurrent booking behavior should be tested with live MongoDB after `MONGO_URI` is configured.

## 12. Image Upload Status

Added:

- `backend/middleware/upload.js`

Active upload route:

- `POST /api/movies/upload/poster`

Requirements:

- Authenticated admin or superadmin user.
- Multipart field name: `image`.

Saved location:

- `public/uploads/`

Saved database value:

- Movie poster paths can use the returned `/uploads/<filename>` URL.

## 13. Auth Separation Status

| Auth flow | Status |
| --- | --- |
| Customer login | Uses MongoDB `User`; normal customer flow remains separated from admin login behavior. |
| Admin login | Fixed so admin/superadmin receives `{ user, token }` directly. |
| Admin-only routes | Protected by `authenticate` and `adminOnly`. |
| Booking ownership | Added owner/admin checks for booking read/cancel/confirm flows. |

## 14. Tests Run

Commands passed:

```text
node --check server.js
node --check backend/server.js
node --check backend/models/Booking.js
node --check backend/controllers/bookingController.js
node --check backend/controllers/userController.js
node --check backend/routes/movies.js
node --check backend/middleware/upload.js
node --check frontend/js/booking.js
npm test
```

Jest result:

```text
Test Suites: 6 passed, 6 total
Tests: 13 passed, 13 total
```

## 15. Commands Failed

Live backend startup failed only because MongoDB was not reachable:

```text
node backend/server.js
MongoDB connection error: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
```

This is a MongoDB availability/configuration issue, not a PostgreSQL issue.

## 16. Remaining Manual Setup

One of these is required:

1. Start local MongoDB on port `27017`.
2. Create a project `.env` with a valid MongoDB Atlas `MONGO_URI`.

Recommended minimum `.env`:

```env
MONGO_URI=mongodb://localhost:27017/cinema_db
PORT=5000
JWT_SECRET=change-this-secret
```

After MongoDB is reachable, run:

```text
npm run seed
npm start
```

Then verify:

- `/api/health`
- admin login
- customer login
- movie/show listing
- booking creation
- duplicate seat rejection
- admin bookings dashboard
- poster upload

## 17. Files Changed

Important active files changed:

- `package.json`
- `package-lock.json`
- `.env.example`
- `server.js`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/controllers/userController.js`
- `backend/controllers/bookingController.js`
- `backend/models/Booking.js`
- `backend/routes/movies.js`
- `backend/middleware/upload.js`
- `frontend/js/booking.js`
- `tests/integration/api.test.js`
- `tests/integration/booking-flow.test.js`
- `docs/PROJECT_ROADMAP.md`
- `backend/docs/PROJECT_ROADMAP.md`

Legacy archive added:

- `legacy-postgresql-unused/`

## 18. Corrected PostgreSQL-Related Statements

Corrected project interpretation:

- Incorrect: PostgreSQL is required for this project.
- Correct: MongoDB/Mongoose is required for the active backend.

Corrected connection issue:

- Incorrect: PostgreSQL connection needs debugging.
- Correct: MongoDB connection needs a reachable `MONGO_URI` endpoint.

Corrected schema interpretation:

- Incorrect: SQL schema files define the active backend.
- Correct: Mongoose schemas in `backend/models` define the active backend data model.

Corrected seed/startup interpretation:

- Incorrect: SQL migrations or SQL seed files are required.
- Correct: `backend/seeds/seed.js` is the active MongoDB seed path.

## 19. Final Verdict

Final verdict: MongoDB/Mongoose is the real project database source of truth.

PostgreSQL/SQL files are legacy/unused archive material and are not connected to the running backend.

The codebase is now cleaned so the active path consistently points to MongoDB. Automated tests and syntax checks pass. Live backend startup is blocked only by missing MongoDB availability/configuration:

- either start local MongoDB at `mongodb://localhost:27017/cinema_db`
- or set a valid MongoDB Atlas `MONGO_URI`

Status: MONGODB CLEAN, LIVE DB CONNECTION STILL NEEDS A RUNNING MONGODB ENDPOINT.
