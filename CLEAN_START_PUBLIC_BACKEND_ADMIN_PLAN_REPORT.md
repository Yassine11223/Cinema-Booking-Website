# Clean Start Public Backend Admin Plan Report

## 1. Project structure

- Root contains legacy duplicated backend files plus the real MongoDB backend under `backend/`.
- Public frontend is under `frontend/`.
- Admin dashboard is under `admin/`.
- Shared assets/client helpers are under `shared/`.

## 2. Active backend path

Active backend is now `backend/server.js`.

Root `npm start` was changed from the legacy PostgreSQL root server to `node backend/server.js`.

## 3. MongoDB connection status

MongoDB connected successfully:

- Host/database: `127.0.0.1/cinema_db`
- Server URL: `http://localhost:5000`
- Health check: `/api/health` returned HTTP 200

Warnings seen on startup:

- Google OAuth disabled because OAuth env vars are missing.
- TMDB API key is not configured.

## 4. Public website status

Partially fixed.

Fixed public booking page behavior:

- Showtimes are loaded from `/api/shows`.
- Seats are loaded from `/api/shows/:id/seats`.
- Checkout must create a real backend booking before redirecting to payment.
- Ticket price in booking summary uses the backend show price.
- Mock showtime and mock seat-state generators were removed from `frontend/js/booking.js`.

Still not fully fixed:

- Homepage uses `frontend/js/tmdb-api.js`, not MongoDB movies.
- `frontend/js/movies.js` still contains TMDB/mock fallback movie data.
- Movie detail page still has TMDB/mock fallback code.

## 5. Fake data found and removed

Removed or disabled from public booking flow:

- Fake generated showtimes in `frontend/js/booking.js`.
- Fake generated booked/held seats in `frontend/js/booking.js`.
- Hardcoded ticket price fallback in booking checkout totals.
- Checkout success without a MongoDB booking.

Fake data still found:

- `frontend/js/movies.js` has mock movie arrays and TMDB fallback flow.
- `frontend/js/tmdb-api.js` controls homepage content.
- Admin dashboard files still include mock/localStorage bookings, stats, shows, theaters, and users.

## 6. APIs tested

- `GET /api/health`: HTTP 200
- `GET /api/movies`: HTTP 200
- `GET /api/shows`: HTTP 200
- `POST /api/bookings`: HTTP 201 with real MongoDB booking
- repeated `POST /api/bookings` for same show/seats: HTTP 409
- `GET /api/shows/:id/seats`: booked seats no longer available
- `GET /api/bookings` with admin token: HTTP 200 with exact seats populated

## 7. Booking flow status

Backend booking flow is fixed for exact selected seats.

Verified booking:

- Movie: `Thunderbolts*`
- Show ID: `6a21b9bf851a8fe74ba5efad`
- Selected seats: `A1,A2`
- Total price: `560`
- Saved booking status: `pending`

## 8. Manual seat selection status

Manual seat selection is preserved.

The frontend still requires the user to click exact visual seats, and checkout sends those exact seats to the backend after mapping labels to MongoDB seat IDs.

## 9. Exact seat persistence status

Verified.

The backend saved exact seats `A1,A2`, the seats endpoint removed them from availability, and the admin bookings API returned exact seats `A1,A2`.

## 10. Double booking status

Verified.

The second attempt to book the same seats for the same show returned HTTP 409.

Backend protection added:

- Duplicate seat IDs in one request are rejected.
- Seat IDs must be valid MongoDB ObjectIds.
- Seats must belong to the show's theater.
- Existing active bookings block selected seats.
- Unique partial index blocks duplicate active bookings for the same show and seat.

## 11. Auth status

Partially checked.

- Booking API requires JWT authentication.
- Customer token was generated for API verification.
- Admin token was generated for admin bookings verification.

Not fully checked:

- Browser customer login flow.
- Browser admin login flow.
- OTP/email login flow, because email env vars are not configured.
- localStorage key separation remains inconsistent in frontend/admin scripts.

## 12. Admin dashboard status

Admin dashboard is still partial.

Fixed backend data returned to admin bookings:

- `GET /api/bookings` now populates exact seat objects.
- `seat_labels` is included for direct exact-seat display.

Still not fixed:

- Admin pages still include mock/localStorage fallback code.
- Admin dashboard stats are not fully real.
- Admin movies/showtimes/theaters/users pages were not fully rebuilt in this pass.

## 13. Admin real data status

Partial.

Admin bookings API now returns real MongoDB booking data with exact selected seats.

Other admin modules still need cleanup to remove mock/localStorage behavior.

## 14. Theme status

No theme changes were made.

- Public red theme was not changed.
- Admin dark/gold theme was not changed.

## 15. Files changed

- `.env.example`
- `package.json`
- `package-lock.json`
- `backend/server.js`
- `backend/config/database.js`
- `backend/config/env.js`
- `backend/seeds/seed.js`
- `backend/models/Booking.js`
- `backend/controllers/bookingController.js`
- `backend/middleware/validation.js`
- `frontend/js/booking.js`
- `CLEAN_START_PUBLIC_BACKEND_ADMIN_PLAN_REPORT.md`

## 16. Tests run

- `npm install`
- `npm test`
- `npm start`
- `GET /api/health`
- `GET /api/movies`
- `GET /api/shows`
- real booking API create
- duplicate booking API create
- seat availability API after booking
- admin bookings API exact-seat check

## 17. What passed

- Dependencies installed.
- Syntax test passed.
- Backend started.
- MongoDB connected.
- Health API returned 200.
- Movies API returned 200.
- Shows API returned 200.
- Booking API saved real booking.
- Double booking was rejected.
- Booked seats disappeared from availability.
- Admin bookings API returned exact seats.

## 18. What failed

Project/environment issues:

- OAuth is not configured.
- TMDB API key is not configured.
- Admin dashboard still contains fake/localStorage modules.
- Homepage and movie detail/listing still contain TMDB/mock fallback flows.
- npm reported 2 moderate vulnerabilities.

Command/environment hiccups:

- Several sandboxed shell invocations failed with `windows sandbox: spawn setup refresh`.
- `Start-Process -FilePath npm` failed because Windows requires `npm.cmd`; retry with `npm.cmd` worked.

## 19. What still needs manual check

- Browser homepage after moving it to MongoDB movies.
- Browser Now Showing after removing TMDB/mock fallback.
- Browser movie detail by MongoDB `_id`.
- Browser checkout/payment end to end.
- OTP/customer login with real email config.
- Admin login in browser.
- Admin movies CRUD.
- Admin showtimes CRUD.
- Admin users page.
- Admin stats/reports.
- Admin seat blocking/unblocking if required.
- Image upload with multer or existing upload middleware.

## 20. Final verdict

PARTIALLY FIXED

The MongoDB backend now starts from root commands, public booking no longer fakes showtimes/seats/prices, exact manual seats are persisted, double booking is rejected, and admin bookings can read exact seats. The full public homepage/movie pages and admin dashboard still need cleanup before this can be called verified.

## Summary table

| Area | Problem Found | Fix Done | Test Result | Status |
|---|---|---|---|---|
| Active backend | Root start used legacy PostgreSQL server | Root scripts now start `backend/server.js` | Backend started and connected to MongoDB | FIXED |
| MongoDB | Root env template documented PostgreSQL | Root env template now documents `MONGO_URI` | MongoDB connected | FIXED |
| Public booking showtimes | Mock showtimes used when backend unavailable | Removed booking mock fallback | Missing backend data now shows empty/error state | FIXED |
| Public booking seats | Fake seat-state generator controlled availability fallback | Removed fake seat-state fallback | Seats load from API | FIXED |
| Checkout | Payment could continue without backend booking | Checkout requires successful `/api/bookings` response | Booking POST returned 201 | FIXED |
| Pricing | Hardcoded booking prices controlled totals | Booking summary uses backend show price | Total price was 560 for 2 seats at 280 | FIXED |
| Exact seats | Backend did not fully validate selected seats | Validates ObjectIds, theater ownership, duplicates, availability | Saved `A1,A2` | FIXED |
| Double booking | Backend could race or accept duplicate seats | Active booking unique index plus pre-check | Duplicate POST returned 409 | FIXED |
| Seat availability | Booked seats needed to disappear after booking | Availability excludes active booked seats | `A1/A2` unavailable after booking | PASS |
| Admin bookings | Admin API returned raw seat ObjectIds | Populated seats and added `seat_labels` | Admin API returned `A1,A2` | FIXED |
| Homepage | TMDB/frontend script still controls content | Not fixed this pass | Not verified | ISSUE |
| Movie listing/detail | TMDB/mock fallback still exists | Not fixed this pass | Not verified | ISSUE |
| Admin dashboard | Mock/localStorage dashboard modules remain | Only bookings API improved | Browser admin not verified | ISSUE |
| Auth separation | Mixed localStorage keys remain | Not fixed this pass | Not browser-tested | NEEDS CHECK |
| Uploads/images | Upload flow not audited deeply | Not fixed this pass | Not verified | NEEDS CHECK |
