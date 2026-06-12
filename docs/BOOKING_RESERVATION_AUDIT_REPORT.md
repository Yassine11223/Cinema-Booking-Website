# Backend Booking, Reservation Synchronization, Admin Display, and Report Export Audit

**Project:** Cinema Booking Website (Vision X / Scene Cinemas)  
**Audit Date:** 2026-05-28  
**Auditor:** Automated System & Code Audit  
**Report Version:** 1.0  

---

## 1. Executive Summary

### Goal
Verify that the cinema booking website is NOT fake or frontend-only. The critical flow to verify:

```
User Login/Register → Public Website Booking → Backend API → Database 
→ Booking/Reservation Saved → Seat Status Updated → Admin Dashboard Shows Booking 
→ Public Website Shows Seat as Unavailable → Data Remains Correct After Refresh
```

### What Was Checked
- Full project structure (frontend, backend, database, admin)
- User login/register flow (frontend + backend)
- Public booking/reservation flow
- Backend booking API
- Database schema and models
- Admin booking display
- Seat availability synchronization
- Double booking prevention
- Price/checkout data integrity
- Hardcoded/mock data audit
- Admin add/edit/delete quick check
- Theme consistency

### What Was Found

> [!CAUTION]
> **The project has a DUAL architecture.** A real Express + PostgreSQL backend exists with proper routes, models, controllers, JWT auth, and transactional booking creation. HOWEVER, the frontend operates in an **offline-first** mode — it uses **localStorage and sessionStorage** for the actual booking flow, seat selection, and payment processing, and only attempts the real API as a first-try with localStorage as fallback. The admin dashboard uses **100% hardcoded static data** for bookings.

### What Was Fixed
No files were modified in this audit phase. This is a diagnostic report.

### Final Status
**NOT FULLY VERIFIED** — See detailed findings below.

---

## 2. Project Structure Reviewed

### File Tree

| Area | Path | Status |
|------|------|--------|
| **Public Frontend** | `frontend/` | ✅ EXISTS — HTML pages, CSS, JS |
| **Login/Register** | `frontend/login.html`, `frontend/register.html` | ✅ EXISTS |
| **Auth JS** | `frontend/js/auth.js` | ✅ EXISTS — Dual-mode (API + offline fallback) |
| **Booking JS** | `frontend/js/booking.js` | ⚠️ EXISTS — **Entirely client-side, no API calls** |
| **Payment JS** | `frontend/js/payment.js` | ⚠️ EXISTS — **Saves to localStorage only** |
| **Backend Server** | `backend/server.js` | ✅ EXISTS — Express.js on port 5000 |
| **Backend Routes** | `backend/routes/` | ✅ EXISTS — bookings, users, movies, shows, theaters, payments |
| **Backend Controllers** | `backend/controllers/` | ✅ EXISTS — bookingController, userController, etc. |
| **Backend Models** | `backend/models/` | ✅ EXISTS — Booking, User, Movie, Show, Seat, Theater, Payment |
| **Backend Middleware** | `backend/middleware/` | ✅ EXISTS — auth (JWT), validation, errorHandler |
| **Database Schema** | `database/schema.sql` | ✅ EXISTS — Full PostgreSQL schema |
| **Database Config** | `backend/config/database.js` | ✅ EXISTS — pg Pool connection |
| **Admin Booking JS** | `admin/js/bookings.js` | ❌ ISSUE — **100% hardcoded static booking data** |
| **Admin Dashboard JS** | `admin/js/dashboard.js` | ⚠️ NEEDS CHECK — May use static data |
| **Admin Users JS** | `admin/js/users-admin.js` | ⚠️ NEEDS CHECK |

---

## 3. User Login / Register Check

### Login Flow

| Step | Implementation | File | Status |
|------|---------------|------|--------|
| User enters email/password | Frontend form with validation | `frontend/js/auth.js` L198-318 | ✅ PASS |
| Frontend sends API request | `POST /api/users/login` via `fetch()` | `frontend/js/auth.js` L244-249 | ✅ PASS |
| Backend validates credentials | bcrypt comparison, JWT generation | `backend/controllers/userController.js` L30-53 | ✅ PASS |
| Backend records login metrics | `last_login`, `login_count` updated | `backend/models/User.js` L64-75 | ✅ PASS |
| Token stored in localStorage | `authToken`, `scene_user`, `userData` | `frontend/js/auth.js` L254-256 | ✅ PASS |
| Admin redirect | Admins → `/admin/index.html` | `frontend/js/auth.js` L274 | ✅ PASS |
| **Offline fallback** | If API fails, falls back to localStorage demo users | `frontend/js/auth.js` L280-313 | ⚠️ ISSUE |

### Register Flow

| Step | Implementation | File | Status |
|------|---------------|------|--------|
| User fills registration form | Frontend validation (name, email, password, phone) | `frontend/js/auth.js` L324-446 | ✅ PASS |
| Frontend sends API request | `POST /api/users/register` via `fetch()` | `frontend/js/auth.js` L398-403 | ✅ PASS |
| Backend hashes password | bcrypt with salt rounds 12 | `backend/models/User.js` L34 | ✅ PASS |
| Backend checks duplicate email | `findByEmail()` check | `backend/controllers/userController.js` L15-18 | ✅ PASS |
| User saved to database | INSERT INTO users ... | `backend/models/User.js` L35-41 | ✅ PASS |
| **Offline fallback** | If API fails, saves to localStorage only | `frontend/js/auth.js` L425-440 | ⚠️ ISSUE |

### Auth Verdict

| Component | Status |
|-----------|--------|
| Login → Backend API | ✅ PASS (when backend is running) |
| Register → Backend API | ✅ PASS (when backend is running) |
| JWT Authentication | ✅ PASS |
| Offline fallback with demo users | ⚠️ ISSUE — Hardcoded admin credentials (`admin@scene.com` / `admin112`) exist as offline fallback |
| User identity available for booking | ❌ **ISSUE** — Booking flow does NOT use user identity (see Phase 4) |

---

## 4. Public Booking / Reservation Flow Check

This is the **critical finding** of this audit.

### Expected Flow vs. Actual Implementation

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| 1. User opens public website | ✅ | ✅ | PASS |
| 2. User selects a movie | Movie from DB | Movie data from `sessionStorage` or hardcoded fallback ("Dune: Part Three") | ⚠️ ISSUE |
| 3. User selects date | From API | **Generated client-side** via `genDates()` — next 7 days | ❌ ISSUE |
| 4. User selects showtime | From API/DB | **Generated client-side** via `genShowtimes()` — deterministic hash-based fake data | ❌ ISSUE |
| 5. User selects experience | From API | **Hardcoded** IMAX/Dolby/Standard/Deluxe in `PRICING` object | ❌ ISSUE |
| 6. User selects available seats | From API (real availability) | **Generated client-side** via `genSeatStates()` — deterministic hash-based fake booked/held seats | ❌ ISSUE |
| 7. User goes to checkout | — | Stores `bookingSummary` in `sessionStorage` only | ⚠️ ISSUE |
| 8. User confirms booking | — | Sets `S.confirmed = true` in memory, redirects to `payment.html` | ❌ ISSUE |
| 9. Frontend sends booking API request | `POST /api/bookings` | **NO API CALL IS MADE** — booking.js contains zero `fetch()` calls | ❌ **CRITICAL** |
| 10. Backend receives request | — | Never reached | ❌ **CRITICAL** |
| 11. Backend validates data | — | Never reached | ❌ **CRITICAL** |
| 12. Backend checks seat availability | — | Never reached | ❌ **CRITICAL** |
| 13. Booking saved to database | — | **Saved to `localStorage` only** via `payment.js` `saveBooking()` L358-382 | ❌ **CRITICAL** |
| 14. Seats updated in database | — | Never happens | ❌ **CRITICAL** |
| 15. Public shows seats unavailable | — | Only in current session (sessionStorage), lost on refresh | ❌ **CRITICAL** |
| 16. Admin dashboard shows booking | — | Admin uses 100% hardcoded data, never reads from DB or localStorage | ❌ **CRITICAL** |
| 17. Data persists after refresh | — | Only partially via localStorage (not synced to DB) | ❌ **CRITICAL** |

### Key Evidence

**`frontend/js/booking.js`** — The entire 792-line file contains:
- **ZERO** `fetch()` calls
- **ZERO** references to any API endpoint
- **ZERO** references to `API_BASE` or `localhost:5000`
- All data is generated client-side via hash functions (`genShowtimes`, `genSeatStates`)
- Booking confirmation only stores to `sessionStorage`

**`frontend/js/payment.js`** — The `saveBooking()` function (L358-382):
```javascript
function saveBooking() {
    const bookings = JSON.parse(localStorage.getItem('scene_bookings') || '[]');
    bookings.push({ ... });
    localStorage.setItem('scene_bookings', JSON.stringify(bookings));
    // Clear session
    sessionStorage.removeItem('bookingSummary');
    sessionStorage.removeItem('cinema_bk_v3');
}
```
This saves to **localStorage only**. No API call to `POST /api/bookings`.

---

## 5. Backend Booking API Result

The backend booking API **exists and is well-implemented**, but is **never called** by the frontend.

### Backend Route: `POST /api/bookings`

| Component | File | Implementation | Status |
|-----------|------|---------------|--------|
| Route definition | `backend/routes/bookings.js` L14 | `router.post('/', authenticate, validateBooking, bookingController.create)` | ✅ EXISTS |
| Authentication | `backend/middleware/auth.js` | JWT Bearer token verification | ✅ EXISTS |
| Validation | `backend/middleware/validation.js` L43-60 | Validates `show_id` and `seat_ids` array | ✅ EXISTS |
| Show lookup | `bookingController.js` L50-53 | Verifies show exists, gets price | ✅ EXISTS |
| Price calculation | `bookingController.js` L55 | `show.price * seat_ids.length` | ✅ EXISTS |
| Transactional booking | `Booking.js` L55-83 | Uses `BEGIN/COMMIT/ROLLBACK` transaction | ✅ EXISTS |
| Booking record creation | `Booking.js` L61-66 | INSERT INTO bookings with status 'pending' | ✅ EXISTS |
| Seat-booking junction | `Booking.js` L69-73 | INSERT INTO booking_seats | ✅ EXISTS |

### Missing from Backend

| Missing Feature | Impact | Severity |
|----------------|--------|----------|
| **Seat availability check before booking** | Backend does NOT verify if seats are already booked before creating a new booking | ❌ HIGH |
| **Double booking prevention** | No `SELECT FOR UPDATE` or constraint check on booking_seats for same show_id + seat_id | ❌ HIGH |
| Guest booking support | Backend requires `req.user.id` — no guest checkout path | ⚠️ MEDIUM |

---

## 6. Booking → Admin Dashboard Verification

### Admin Booking Page: `admin/js/bookings.js`

| Check | Finding | Status |
|-------|---------|--------|
| Data source | **100% hardcoded static array** — 12 sample bookings at L33-286 | ❌ **CRITICAL** |
| API calls | **ZERO** `fetch()` calls in the entire 1120-line file | ❌ **CRITICAL** |
| Reference to API_BASE | **NONE** | ❌ **CRITICAL** |
| Reference to backend | **NONE** | ❌ **CRITICAL** |
| localStorage integration | **NONE** — Does not even read from `scene_bookings` | ❌ **CRITICAL** |
| Real booking display | **IMPOSSIBLE** — Only shows the 12 hardcoded bookings | ❌ **CRITICAL** |

### Admin Dashboard: `admin/js/dashboard.js`

The dashboard JS was not fully reviewed in this audit, but based on the pattern, it likely uses similar hardcoded data for stats.

---

## 7. Seat Availability Sync

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| User books a seat | Seat becomes unavailable in DB | Seat state only changes in `sessionStorage`, generated by hash function | ❌ ISSUE |
| Another user sees the seat | Unavailable | Still appears available (different session = different hash = different seats) | ❌ ISSUE |
| Admin sees reserved seat | Shows in admin seat view | Admin has no seat availability view connected to real data | ❌ ISSUE |
| Refresh keeps seat unavailable | Persisted in DB | Lost — `genSeatStates()` regenerates identical hash-based states | ❌ ISSUE |
| Admin blocks a seat | Saved in DB | No admin seat blocking feature exists | ❌ ISSUE |

---

## 8. Price and Checkout Result

| Check | Finding | Status |
|-------|---------|--------|
| Price source | **Hardcoded** in `frontend/js/booking.js` L51-56: `PRICING = { IMAX: 320, Dolby: 280, Standard: 180, Deluxe: 250 }` | ⚠️ ISSUE |
| Price from backend | Backend `shows` table has a `price` column, but frontend never reads it | ❌ ISSUE |
| Cart/summary correctness | Frontend correctly calculates `selected.length * price` | ✅ PASS |
| Booking total stored | Stored in `localStorage` via `payment.js` | ⚠️ ISSUE |
| Admin shows total | Admin shows hardcoded totals, not from bookings | ❌ ISSUE |

---

## 9. Hardcoded Data Audit

| Data Type | Location | Nature | Action Required |
|-----------|----------|--------|----------------|
| **Admin bookings** (12 records) | `admin/js/bookings.js` L33-286 | 100% static, hardcoded | Replace with real API call |
| **Demo users** (5 users) | `frontend/js/auth.js` L152-158 | Seeded to localStorage on page load | Acceptable for demo, but passwords stored in plaintext |
| **Movie data** (fallback) | `frontend/js/booking.js` L42-47 | Hardcoded "Dune: Part Three" fallback | Acceptable as fallback |
| **Showtimes** | `frontend/js/booking.js` L193-221 | 100% generated client-side via hash | Replace with API call to `/api/shows` |
| **Seat availability** | `frontend/js/booking.js` L226-243 | 100% generated client-side via hash | Replace with API call to `/api/seats` |
| **Pricing** | `frontend/js/booking.js` L51-56 | Hardcoded per experience type | Should come from show.price in DB |
| **Hall layouts** | `frontend/js/booking.js` L69-146 | Hardcoded per experience type | Acceptable for UI structure |
| **Food menu** | `frontend/js/payment.js` L13-28 | Hardcoded static data | Acceptable for demo |
| **Admin dashboard stats** | `admin/js/dashboard.js` | Likely hardcoded | NEEDS CHECK |
| **Admin users list** | `admin/js/users-admin.js` | NEEDS CHECK | NEEDS CHECK |

---

## 10. Quick Admin Connection Check

| Admin Feature | Connected to Backend? | Status |
|--------------|----------------------|--------|
| Admin movie management | Has backend routes (`/api/movies` CRUD) | NEEDS CHECK |
| Admin showtime management | Has backend routes (`/api/shows` CRUD) | NEEDS CHECK |
| Admin price changes affect checkout | Price is hardcoded in frontend, not from DB | ❌ ISSUE |
| Admin seat status changes affect public | No seat management in admin, public uses hash-generated seats | ❌ ISSUE |
| Admin booking page shows real bookings | **100% hardcoded data** | ❌ **CRITICAL** |

---

## 11. Theme Check

| Component | Expected Theme | Actual Theme | Status |
|-----------|---------------|-------------|--------|
| Public cinema website | Red/crimson cinema theme | Red/crimson (`--primary: #b71c1c`) | ✅ PASS |
| Admin dashboard | Dark/gold admin portal theme | Dark/amber-gold (`--admin-accent: #f5a623`) | ✅ PASS |
| Admin errors/danger | Red/dark red | Red (`--admin-error: #e53935`) | ✅ PASS |
| Admin primary actions | Gold/amber/orange | Amber/gold (`#f5a623`) | ✅ PASS |
| No theme mixing | Themes are separated | `admin-theme.css` scoped to admin only | ✅ PASS |

---

## 12. Tests Table

| Test | Description | Expected Result | Actual Result | Status |
|------|------------|-----------------|---------------|--------|
| User login (backend online) | Login sends POST to `/api/users/login` | Backend validates, returns JWT | Code correctly calls API | ✅ PASS |
| User login (backend offline) | Fallback to localStorage demo users | Offline login with demo data | Works, uses plaintext password match | ⚠️ ISSUE |
| User register (backend online) | Register sends POST to `/api/users/register` | Backend saves user to PostgreSQL | Code correctly calls API | ✅ PASS |
| User books available seat | Booking saved to database | Booking in PostgreSQL `bookings` table | **Saved to localStorage only** — no API call | ❌ ISSUE |
| Booking saved in database | Booking record in `bookings` table | Row in PostgreSQL | **Not saved to database** | ❌ ISSUE |
| Booking appears in admin | Admin page shows new booking | Booking in admin table | Admin uses **hardcoded data**, booking never appears | ❌ ISSUE |
| Seat becomes reserved/booked | Seat marked unavailable in DB | Seat status in `booking_seats` | **Not updated** — seats are hash-generated | ❌ ISSUE |
| Public website blocks reserved seat | Seat shown as occupied | Seat disabled on seat map | Only for **current session** — other sessions see different state | ❌ ISSUE |
| Admin shows reserved seat | Seat shown as booked | Admin seat display | **No seat display in admin** connected to real data | ❌ ISSUE |
| Refresh keeps data correct | Data persists | Data from DB unchanged | **localStorage persists partially**, DB not updated | ❌ ISSUE |
| Double booking prevented | Backend rejects duplicate | Error response | **Backend never reached** — no seat availability check in Booking.create() | ❌ ISSUE |
| Admin blocks seat | Seat unavailable on public | Public seat map updated | **No admin seat blocking feature** | ❌ ISSUE |
| Checkout total saved correctly | Total in DB matches checkout | Same amount | Total saved in **localStorage** only | ⚠️ ISSUE |
| Admin booking table uses real data | Real API data | Data from `/api/bookings` | **100% hardcoded array** | ❌ ISSUE |
| Public red theme | Red/crimson | Red primary | ✅ Correct | ✅ PASS |
| Admin gold theme | Dark/gold | Amber/gold primary | ✅ Correct | ✅ PASS |

---

## 13. Files Changed

**No files were modified in this audit.** This is a diagnostic-only report.

---

## 14. Remaining Issues (Priority Order)

### 🔴 Critical Issues

| # | Issue | Files Involved | Impact | Fix Required |
|---|-------|---------------|--------|-------------|
| 1 | **Frontend booking flow makes ZERO API calls** | `frontend/js/booking.js` | No booking is ever saved to the real database | Connect booking.js to `POST /api/bookings` |
| 2 | **Payment saves to localStorage only** | `frontend/js/payment.js` L358-382 | Bookings only exist in browser memory | Call API before/after payment |
| 3 | **Admin bookings page uses 100% hardcoded data** | `admin/js/bookings.js` L33-286 | Admin never sees real bookings | Replace with `GET /api/bookings` fetch |
| 4 | **Seat availability is hash-generated, not real** | `frontend/js/booking.js` L226-243 | Every session sees different "booked" seats | Fetch from `GET /api/seats/available/:showId` |
| 5 | **Showtimes are generated client-side, not from DB** | `frontend/js/booking.js` L193-221 | Showtimes don't match database | Fetch from `GET /api/shows` |

### 🟡 Important Issues

| # | Issue | Files Involved | Impact |
|---|-------|---------------|--------|
| 6 | Backend booking controller has no seat availability check | `backend/controllers/bookingController.js` | Double booking possible |
| 7 | No unique constraint on (show_id + seat_id) in booking_seats | `database/schema.sql` | Database allows duplicate seat bookings |
| 8 | Pricing is hardcoded in frontend | `frontend/js/booking.js` L51-56 | Doesn't use admin-controlled prices |
| 9 | Offline fallback stores admin password in plaintext | `frontend/js/auth.js` L301-303 | Security risk |
| 10 | Demo users seeded with plaintext passwords | `frontend/js/auth.js` L152-158 | Security risk |

### 🟢 Minor / Acceptable

| # | Issue | Notes |
|---|-------|-------|
| 11 | Hall layouts are hardcoded | Acceptable — these represent physical theater structure |
| 12 | Food menu is hardcoded | Acceptable for demo purposes |
| 13 | Offline login fallback exists | Useful for development/demo, but should be disabled in production |

---

## 15. Final Verdict

### ❌ NOT FULLY VERIFIED

**The project has a real backend (Express + PostgreSQL) with proper auth, routes, models, and transactional booking logic. However, the frontend booking flow is 100% client-side — it never calls the booking API. The admin booking page uses 100% hardcoded static data. No booking made from the public website is ever saved to the database or visible in the admin dashboard.**

**What works:**
- ✅ Login/Register → Backend API (when backend is running)
- ✅ JWT authentication middleware
- ✅ Backend booking model with transactions
- ✅ Database schema is complete and correct
- ✅ Theme consistency (public=red, admin=gold)

**What does NOT work:**
- ❌ Public booking → Backend (no API call made)
- ❌ Booking → Database (saved to localStorage only)
- ❌ Booking → Admin display (admin uses hardcoded data)
- ❌ Seat availability sync (hash-generated, not real)
- ❌ Double booking prevention (backend never reached)
- ❌ Price from database (hardcoded in frontend)

### Required to achieve FULLY VERIFIED:
1. Connect `frontend/js/booking.js` to fetch real showtimes from `/api/shows`
2. Connect `frontend/js/booking.js` to fetch real seat availability from the backend
3. Connect `frontend/js/payment.js` to call `POST /api/bookings` to save bookings
4. Add seat availability checking in `backend/controllers/bookingController.js`
5. Add unique constraint on (show_id, seat_id) combination to prevent double booking
6. Replace hardcoded bookings in `admin/js/bookings.js` with `GET /api/bookings` API call
7. Connect admin dashboard stats to real database queries

---

*Report generated: 2026-05-28*  
*Report file: `BOOKING_RESERVATION_AUDIT_REPORT.md`*  
*Format: Markdown (.md)*  
*PDF/DOCX: Not created — environment does not support native PDF/DOCX generation tools. The Markdown format is fully professional and can be converted to PDF using any Markdown-to-PDF tool (e.g., `pandoc`, VS Code Markdown PDF extension, or online converters).*
