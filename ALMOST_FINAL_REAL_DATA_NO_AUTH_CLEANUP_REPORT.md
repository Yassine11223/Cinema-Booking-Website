# Almost Final Real Data No Auth Cleanup Report

Date: 2026-06-05

## Final Verdict

PARTIAL

The main requested public movie pages, booking path, admin dashboard, admin movies, admin showtimes, admin bookings, admin users, and admin stats are now wired to the MongoDB backend instead of TMDB/mock/localStorage source-of-truth data. The backend was restarted from root `npm start`, MongoDB connected, syntax checks passed, live APIs responded, booking creation worked with exact selected seats, duplicate booking returned `409`, and admin CRUD checks passed.

This is not marked `FIXED` because I did not perform browser/Playwright visual page openings, and the whole repository still contains non-core or stale fake/offline logic in auth/profile/watchlist/payment/admin-auth/admins-manage, duplicated old folders under `backend/frontend` and `backend/admin`, old report/repopack files, and unused TMDB utility files.

## Summary Of What Was Fixed

- Root `npm start` continues to run the real backend at `backend/server.js`.
- Homepage loader now reads movies from `GET /api/movies?status=now_showing` only.
- Public movie listing and detail now read from `GET /api/movies`, `GET /api/movies/:id`, and `GET /api/shows?movieId=...`.
- Public movie detail "Book Now" now passes real MongoDB movie/show IDs.
- Booking flow still creates a backend booking before payment redirect.
- Booking flow sends exact selected seats and no longer invents fake showtimes, fake seats, or fake prices.
- Booking page no longer uses a real-looking hardcoded movie fallback when no backend-backed selection exists.
- Admin dashboard now reads real stats from `GET /api/admin/stats`.
- Admin movies now use backend CRUD only.
- Admin showtimes now use backend CRUD only.
- Admin bookings now display real MongoDB bookings and exact seat labels.
- Admin users now read real MongoDB users from backend.
- Active backend movie routes no longer expose TMDB/import/poster helper endpoints.
- Active showtime queries now reject non-Mongo `movieId` values instead of translating legacy external IDs.

## Files Changed

- `package.json`
- `backend/server.js`
- `backend/controllers/adminStatsController.js`
- `backend/controllers/showController.js`
- `backend/routes/adminStats.js`
- `backend/routes/movies.js`
- `frontend/js/tmdb-api.js`
- `frontend/js/movies.js`
- `frontend/js/booking.js`
- `frontend/index.html`
- `frontend/css/style.css`
- `admin/js/dashboard.js`
- `admin/js/Shows.js`
- `admin/js/bookings.js`
- `admin/js/movies-admin.js`
- `admin/js/users-admin.js`
- `admin/shows-manage.html`
- `admin/movies-manage.html`
- `admin/css/movies.css`

## Fake/Mock/localStorage/TMDB Logic Removed

- Removed homepage TMDB/fallback movie loading from the active homepage script.
- Removed movie listing/detail TMDB/mock arrays and generated showtime fallback logic.
- Removed admin dashboard fake stats, fake recent bookings, fake top movies, and localStorage stats source.
- Removed admin movies localStorage/TMDB fallback source of truth.
- Removed admin showtimes generated/localStorage showtime source.
- Removed admin bookings mock booking array/source.
- Removed admin users fake/localStorage user source from `admin/js/users-admin.js`.
- Removed active backend TMDB movie search/detail/poster routes from `backend/routes/movies.js`.
- Removed active show controller conversion from external numeric movie IDs to MongoDB IDs.

Token/session localStorage remains intentionally in the active admin scripts because the request allowed existing token/session storage and asked to ignore auth.

## Backend APIs Used

- `GET /api/health`
- `GET /api/movies`
- `GET /api/movies/:id`
- `POST /api/movies`
- `PUT /api/movies/:id`
- `DELETE /api/movies/:id`
- `GET /api/shows`
- `GET /api/shows?movieId=...`
- `GET /api/shows/:id/seats`
- `POST /api/shows`
- `PUT /api/shows/:id`
- `DELETE /api/shows/:id`
- `GET /api/theaters`
- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/users`
- `GET /api/admin/stats`

## Backend APIs Created Or Modified

- Created `GET /api/admin/stats`.
- Mounted admin stats in `backend/server.js`.
- Modified `GET /api/movies` route file to MongoDB-backed catalog CRUD only.
- Modified show controller to require MongoDB movie IDs for showtime filtering.

## Public Pages Verified

- Homepage script syntax checked and API source changed to MongoDB backend only.
- Movie listing/detail script syntax checked and API source changed to MongoDB backend only.
- Booking script syntax checked.
- Live API verification confirmed movies, movie detail, all shows, movie-specific shows, seat availability, booking creation, seat availability refresh, duplicate prevention, and exact admin seat labels.

Not browser-verified visually.

## Admin Pages Verified

- Admin dashboard script syntax checked and stats API returned `totals`, `monthlyRevenue`, `topMovies`, and `recentBookings`.
- Admin movies script syntax checked and movie create/edit/delete API checks passed.
- Admin showtimes script syntax checked and showtime create/edit/delete API checks passed.
- Admin bookings script syntax checked and latest admin booking showed exact seats.
- Admin users script syntax checked and users API returned real users.

Not browser-verified visually.

## Booking Tests Passed

- Selected fresh available seats: `A5,A6`.
- Created booking through `POST /api/bookings`: `201`.
- Booking ID returned: `6a2200aff70de4ab70135e32`.
- Refreshed seats through `GET /api/shows/:id/seats`.
- Confirmed `A5,A6` were no longer available after booking.
- Attempted duplicate booking for the same seats.
- Duplicate booking returned `409`.
- Admin bookings API latest seat labels returned `A5,A6`.

Earlier verification in the same cleanup run also created `A3,A4` and confirmed duplicate protection.

## Commands Run

- `npm install`
- `npm test`
- `npm start`
- `GET /api/health`
- `GET /api/movies`
- `GET /api/movies/:id`
- `GET /api/shows`
- `GET /api/shows?movieId=...`
- `GET /api/shows/:id/seats`
- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/users`
- `GET /api/admin/stats`
- Admin movie create/edit/delete API check
- Admin showtime create/edit/delete API check
- `rg -n "mock|localStorage|fallback|sample|demo|dummy|hardcoded|TMDB|fake|Math\.random" ...`
- `git status --short`
- `git diff --stat`

## Commands Passed

- `npm install`: passed; dependencies up to date; npm reported 2 moderate vulnerabilities.
- `npm test`: passed.
- `npm start`: passed; MongoDB connected to `127.0.0.1/cinema_db`; server running on `http://localhost:5000`.
- Health API: `200`.
- Movies API: `200`, count `7`.
- Movie detail API: `200`.
- All shows API: `200`, count `560`.
- Movie-specific shows API: `200`, count `112`.
- Seats API: `200`.
- Booking create: `201`.
- Duplicate booking: `409`.
- Admin stats API: `200`.
- Users API: `200`, count `6`.
- Admin bookings API: `200`.
- Admin movie create/edit/delete: `201 / 200 / 200`.
- Admin showtime create/edit/delete: `201 / 200 / 200`.

## Commands Failed Or Adjusted

- Some unelevated shell commands hit the Windows sandbox `spawn setup refresh` issue; they were rerun successfully with approval.
- The first live booking verification chose the first movie returned by `/api/movies`, which currently had `0` showtimes. That was a valid empty state, not a backend failure. The booking verification was rerun against the first real show returned by `/api/shows` and passed.

## Remaining Issues

- No browser/Playwright visual verification was performed for public/admin pages.
- `frontend/js/payment.js` still contains localStorage booking cache/offline ticket fallback wording and random receipt/reference generation. Booking already happens before payment redirect, but payment cleanup remains adjacent work.
- `frontend/js/watchlist.js` still uses localStorage and TMDB-style poster URL handling for watchlist persistence.
- `frontend/js/profile.js` still contains demo/offline localStorage behavior.
- `frontend/js/auth.js`, `admin/js/admin-auth.js`, and `admin/js/admins-manage.js` still contain offline/demo/localStorage auth/admin-user fallback logic. These were intentionally not fixed because auth/OTP/login/register were excluded.
- Stale duplicated folders under `backend/frontend` and `backend/admin` still contain old mock/TMDB/localStorage code. They are not served by the active `backend/server.js`, but they remain in the repository.
- Old generated reports and `repopack-output.txt` still contain historical references to mock/TMDB/localStorage code.
- `utils/tmdb.js` and `backend/utils/tmdb.js` still exist but are no longer used by active movie routes.
- Seed/sample files still contain seed-data wording. Seed data is allowed when inserted into MongoDB and read through APIs.

## Things Intentionally Ignored

- OTP
- Email verification
- Login/register fixes
- Auth offline fallback cleanup
- Admin auth cleanup except where token/session storage was needed to call real backend APIs

