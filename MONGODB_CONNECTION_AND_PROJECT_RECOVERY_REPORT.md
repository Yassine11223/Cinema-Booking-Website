# MongoDB Connection And Project Recovery Report

Date: 2026-06-04

## 1. Database Source Of Truth

The active backend for this project is the `backend/` application, and it uses MongoDB through Mongoose.

Proof:

- `backend/server.js` imports `connectDB` from `backend/config/database.js`.
- `backend/config/database.js` imports `mongoose` and connects to `process.env.MONGO_URI || 'mongodb://localhost:27017/cinema_db'`.
- `backend/package.json` depends on `mongoose` and does not depend on `pg`.
- `backend/models/Booking.js`, `Movie.js`, `Payment.js`, `Seat.js`, `Show.js`, `Theater.js`, and `User.js` are Mongoose schemas/models.
- `backend/seeds/seed.js` imports `connectDB` and `mongoose`.
- `backend/.env.example` defines `MONGO_URI`.

## 2. PostgreSQL References

PostgreSQL files and root-level SQL-oriented code are legacy/duplicate artifacts for this project, not the active backend source of truth.

Legacy PostgreSQL artifacts found:

- `database/schema.sql`
- `database/sample-data.sql`
- `database/seed.sql`
- `database/migrations/add_login_tracking.sql`
- duplicate SQL-oriented files under the root `models/`, `controllers/`, `routes/`, and `config/`
- older reports that described the backend as PostgreSQL

No SQL files were deleted.

Correction made:

- Root `npm start` now runs `node backend/server.js`.
- Root `server.js` is now a thin wrapper around `./backend/server`.
- Root `.env.example` now documents `MONGO_URI` instead of PostgreSQL `DB_*` values.

## 3. MongoDB Connection Status

MongoDB is required for the active backend.

Current live result:

- `npm start` invokes `node backend/server.js`.
- Backend attempts MongoDB at fallback URI: `mongodb://localhost:27017/cinema_db`.
- Connection failed with:
  `connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017`

Status: MongoDB is not running locally, or no reachable `MONGO_URI` is configured.

Required setup:

1. Install/start local MongoDB, then run:
   `mongod --dbpath <your-data-folder>`
2. Or configure MongoDB Atlas in `.env`:
   `MONGO_URI=mongodb+srv://USER:PASSWORD@HOST/cinema_db?retryWrites=true&w=majority`
3. Start backend:
   `npm start`
4. Optional seed:
   `npm run seed`

## 4. Required Environment Variables

Required:

- `MONGO_URI`
- `JWT_SECRET`

Optional/config-dependent:

- `PORT`
- `NODE_ENV`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`
- `TMDB_API_KEY`
- `OPENAI_API_KEY`
- `FRONTEND_URL`

No `.env` file exists at the root or under `backend/`, so the backend currently uses the default local MongoDB URI.

## 5. Mongoose Models

MongoDB/Mongoose models confirmed:

- `backend/models/User.js`
- `backend/models/Movie.js`
- `backend/models/Theater.js`
- `backend/models/Seat.js`
- `backend/models/Show.js`
- `backend/models/Booking.js`
- `backend/models/Payment.js`

## 6. Flow Status

| Flow | MongoDB Status | Notes |
|---|---|---|
| Admin login/auth separation | Fixed in code | `/api/users/login/admin` now returns `{ token, user }` for admin/superadmin only, matching `admin/js/admin-auth.js`. |
| Customer login/auth | Connected to MongoDB | Customer route blocks admin/superadmin and uses OTP flow. Live test blocked by MongoDB offline and email env missing. |
| Public movie data | Connected to MongoDB | `/api/movies` uses `backend/models/Movie.js`. Live test blocked by MongoDB offline. |
| Public showtime data | Connected to MongoDB | `/api/shows` uses `backend/models/Show.js` and converts TMDB IDs to Mongo `_id` when needed. |
| Booking save | Fixed in code | `backend/models/Booking.js` saves bookings to MongoDB. |
| Seat availability | Fixed in code | `backend/models/Seat.js` calculates available seats from non-cancelled Mongo bookings. |
| Double booking prevention | Improved in code | Booking creation validates selected seats and rejects seats already used by non-cancelled bookings. |
| Admin bookings | Connected to MongoDB | `/api/bookings` uses populated Mongo bookings and requires admin token. |
| Poster upload | Fixed in code | Added `backend/middleware/upload.js` and `POST /api/movies/upload/poster`. Files save under `public/uploads` and are served at `/uploads/...`. |
| Admin dashboard data | Connected to backend APIs | Admin scripts call `/api/movies`, `/api/users`, `/api/bookings`, `/api/shows`; live verification blocked by MongoDB offline. |

## 7. Files Changed

- `server.js`
- `package.json`
- `package-lock.json`
- `.env.example`
- `backend/models/Booking.js`
- `backend/controllers/userController.js`
- `backend/routes/movies.js`
- `backend/middleware/upload.js`
- `frontend/js/booking.js`
- Legacy duplicate files touched during correction but no longer used by root startup:
  - `config/database.js`
  - `middleware/errorHandler.js`
  - `routes/users.js`

## 8. PostgreSQL Report Corrections

Incorrect PostgreSQL conclusions from earlier recovery notes are superseded by this report.

Corrected statements:

- The active project database is MongoDB, not PostgreSQL.
- `MONGO_URI` is the required database env variable.
- SQL schema/seed files are legacy/unused unless the project owner intentionally revives the SQL duplicate.
- Database-live booking, movie, show, user, seat, and admin verification must be performed against MongoDB.

## 9. Commands Run

- `npm install`
- `npm test`
- `node --check server.js`
- `node --check backend/server.js`
- `node --check backend/models/Booking.js`
- `node --check backend/controllers/userController.js`
- `node --check backend/middleware/upload.js`
- `node backend/server.js` startup probe
- `npm start` startup probe

## 10. Test Results

- `npm install`: PASS, added missing `nodemailer`.
- `npm test`: PASS, 6 test suites and 13 tests passed.
- Syntax checks for changed backend files: PASS.
- MongoDB connection: ISSUE, local MongoDB refused connection at `localhost:27017`.
- Browser/API flow verification: blocked until MongoDB is running and `.env` is configured.

## 11. Remaining Issues

- MongoDB must be started locally or `MONGO_URI` must be configured for Atlas.
- Live admin/customer login cannot be fully verified until MongoDB is reachable.
- Customer OTP and ticket confirmation email require valid mail settings.
- Older PostgreSQL files/reports remain in the repository as legacy artifacts and should be cleaned only with owner approval.

## 12. Final Verdict

FIXED BUT NEEDS DATABASE/BROWSER VERIFICATION
