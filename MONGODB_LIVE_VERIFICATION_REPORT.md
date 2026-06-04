# MongoDB Live Verification Report

Date: 2026-06-04

## 1. MongoDB Connection Status

MongoDB connection is working against the local URI:

`mongodb://127.0.0.1:27017/cinema_db`

`npm start` connected successfully and the backend listened on `http://localhost:5000`.

## 2. Active Backend Path

Active backend entrypoint:

`backend/server.js`

Root command verified:

`npm start` runs `node backend/server.js`.

## 3. MONGO_URI Source Used

The project now loads environment variables from both:

- `.env`
- `backend/.env`

Both use `MONGO_URI=mongodb://127.0.0.1:27017/cinema_db`.

No password-bearing MongoDB Atlas URI was present in the tested `MONGO_URI`.

## 4. APIs Tested

Live API checks against MongoDB:

- `GET /api/health`: HTTP 200
- `GET /api/movies`: 7 movies after seed
- `GET /api/theaters`: 4 theaters after seed
- `GET /api/shows`: 560 shows after seed
- `GET /api/shows/:id/seats`: live seat availability
- `POST /api/users/login/customer`: customer login token returned
- `POST /api/users/login/admin`: admin login token returned
- `POST /api/bookings`: booking saved in MongoDB
- `PUT /api/bookings/:id/confirm`: booking confirmed
- `GET /api/bookings/my`: customer booking visible
- `GET /api/bookings`: admin booking visible
- `POST /api/movies/upload/poster`: poster uploaded
- `PUT /api/movies/:id`: poster URL saved to movie document

## 5. Auth Test Result

Verified:

- Admin login returns `token` and `user`.
- Customer login returns `token` and `user`.
- Customer account is blocked from admin login: HTTP 403.
- Admin account is blocked from customer login: HTTP 403.
- Admin APIs accept the real admin login token.
- Frontend storage keys are separated by code path: admin uses `adminToken/adminUser/isAdminLoggedIn`; customer uses `userToken/userData/isUserLoggedIn`.

## 6. Public Frontend MongoDB Data Result

Public frontend scripts use backend APIs for movies, shows, seat availability, and booking creation. The live backend endpoints returned real MongoDB data.

Minor manual check remaining: browser click-through of homepage, movies page, details page, booking page, and payment page.

## 7. Admin Dashboard MongoDB Data Result

Admin APIs returned real MongoDB data. Admin show management was fixed to preserve Mongo ObjectId strings instead of converting them to `NaN`.

Admin bookings API returned the live booking created during the test.

Minor manual check remaining: browser click-through of all admin screens.

## 8. Booking Flow Result

Live booking flow succeeded:

- Customer login: HTTP 200
- Booking create: HTTP 201
- Booking confirm: HTTP 200
- Customer booking list included the booking
- Admin booking list included the booking

Test booking id:

`6a21b9f7bdbe626cafffdbed`

## 9. Seat Availability Result

Verified seat availability before and after booking:

- Before booking: 268 available seats
- After booking A1 and A2: 266 available seats
- Booked seats were no longer returned by `GET /api/shows/:id/seats`

Also fixed seed data so Dolby capacity matches generated seats: 268.

## 10. Double Booking Result

Double booking the same seats for the same show was rejected:

`POST /api/bookings` duplicate attempt returned HTTP 409.

## 11. Poster Upload Result

Poster upload succeeded:

- `POST /api/movies/upload/poster`: HTTP 201
- Uploaded file saved under `public/uploads`
- Returned URL was saved to a movie with `PUT /api/movies/:id`
- Movie document kept the uploaded poster URL

## 12. Tests Run

Passed:

- `npm install`
- `npm test`
- `npm run seed`
- `npm start`
- `node --check backend/server.js`
- `node --check backend/config/loadEnv.js`
- `node --check backend/config/passport.js`
- `node --check backend/controllers/userController.js`
- `node --check backend/models/Show.js`
- `node --check admin/js/Shows.js`
- `node --check frontend/js/payment.js`
- live API verification script
- live auth separation script

## 13. Commands Passed

- `npm install`: completed, dependencies up to date
- `npm test`: 6 suites passed, 13 tests passed
- `npm run seed`: seeded users, theaters, seats, movies, shows
- `npm start`: connected to MongoDB and served port 5000
- `GET /api/health`: HTTP 200
- Live booking/API script: passed

## 14. Commands Failed

Initial failures during verification:

- First `npm start` probe failed with `ECONNREFUSED 127.0.0.1:27017` before env loading was corrected and the local MongoDB endpoint was reachable.
- One early admin-token test failed because the script used the root Mongoose package while backend models used the backend Mongoose package.
- Admin login initially returned an OTP challenge that the active admin frontend did not handle.

All listed failures were resolved or replaced with successful final runs.

## 15. Files Changed

- `.env`
- `backend/.env`
- `backend/config/loadEnv.js`
- `backend/config/database.js`
- `backend/config/env.js`
- `backend/config/passport.js`
- `backend/server.js`
- `backend/controllers/userController.js`
- `backend/models/Show.js`
- `backend/seeds/seed.js`
- `admin/js/Shows.js`
- `frontend/js/payment.js`
- `MONGODB_LIVE_VERIFICATION_REPORT.md`

Runtime upload artifact created during testing:

- `public/uploads/movie-*.png`

## 16. Remaining Issues

Minor manual checks remain:

- Open the public frontend in a browser and click through movie selection, seat selection, and payment.
- Open the admin pages in a browser and confirm tables/forms render as expected with the live API.

No backend MongoDB blocker remains from the tested flows.

## 17. Final Verdict

MONGODB WORKS BUT NEEDS MINOR MANUAL CHECKS
