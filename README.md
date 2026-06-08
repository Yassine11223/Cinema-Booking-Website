# 🎬 The Hall Cinemas — Cinema Booking Website

A full-stack cinema booking web application built with Node.js, Express, MongoDB, and vanilla JavaScript.

---

## 🚀 Features

### Customer Features
- Browse now showing & coming soon movies
- Movie detail pages with trailers
- Interactive seat selection
- Food & drinks add-on during booking
- Visa/Credit Card & Fawry payment options
- QR code tickets (one per seat) sent via email
- Google OAuth login
- User profile & booking history
- AI-powered chatbot assistant
- Watchlist functionality

### Admin Features
- Full movie management (add, edit, delete)
- Import movies directly from TMDB
- Show/screening management
- Theater & seat management
- Booking management
- User management
- Admin & Super Admin roles
- Dashboard with live stats

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT, Google OAuth 2.0 |
| Email | Nodemailer (Gmail SMTP) |
| QR Codes | qrcode npm package |
| Movie Data | TMDB API |
| Payment | Stripe, Fawry |
| AI Chatbot | OpenAI API |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB 6.0+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Yassine11223/Cinema-Booking-Website.git
cd Cinema-Booking-Website
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file inside the `backend` folder:
```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/cinema_db

CLIENT_URL=http://localhost:5500
FRONTEND_URL=http://localhost:5500

SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/users/google/callback

TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password

STRIPE_SECRET_KEY=your_stripe_secret_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. Start MongoDB
```bash
# Windows
net start MongoDB

# Or run directly
mongod --dbpath "C:\data\db"
```

### 5. Seed the Database
```bash
cd backend
node seeds/seed.js
node seeds/createSuperAdmin.js
```

### 6. Start the Backend Server
```bash
cd backend
nodemon server.js
```

### 7. Open the Frontend
Use VS Code **Live Server** extension:
- Right-click `frontend/index.html` → **Open with Live Server**
- Frontend runs at: `http://127.0.0.1:5500/frontend/index.html`

---

## 🔑 Default Credentials

### Super Admin
- **Email:** `superadmin@cinema.com`
- **Password:** `ChangeMe123!`
- **Admin Panel:** `http://127.0.0.1:5500/admin/login.html`

---

## 📁 Project Structure

```
Cinema-Booking-Website/
├── backend/
│   ├── config/          # Database & environment config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── seeds/           # Database seeders
│   ├── utils/           # Email, QR, TMDB helpers
│   └── server.js        # Entry point
├── frontend/
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JavaScript
│   ├── index.html       # Homepage
│   ├── movies.html      # Movies listing
│   ├── booking.html     # Seat selection
│   └── payment.html     # Payment & confirmation
├── admin/
│   ├── css/             # Admin stylesheets
│   ├── js/              # Admin JavaScript
│   └── *.html           # Admin pages
└── shared/              # Shared assets
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movies` | Get all movies |
| GET | `/api/movies/:id` | Get movie by ID |
| POST | `/api/movies` | Create movie (admin) |
| PUT | `/api/movies/:id` | Update movie (admin) |
| DELETE | `/api/movies/:id` | Delete movie (admin) |
| GET | `/api/shows` | Get all shows |
| POST | `/api/bookings` | Create booking |
| PUT | `/api/bookings/:id/confirm` | Confirm booking & send QR tickets |
| POST | `/api/users/login` | User login |
| POST | `/api/users/register` | User registration |
| GET | `/api/users/google` | Google OAuth login |

---

## 🎟️ QR Ticket Flow

1. User selects movie → date → showtime → seats
2. Completes payment (Visa or Fawry)
3. Backend generates one unique QR code per seat
4. QR codes displayed on confirmation page
5. Email sent with QR tickets attached
6. User presents QR code at cinema entrance

---

## 🔒 Security Features

- JWT-based authentication
- Google OAuth 2.0
- Password hashing (bcrypt)
- Role-based access control (customer, admin, super_admin)
- Protected admin routes
- Input validation (frontend + backend)
- Global error handling middleware

---

## 👥 Team

Built as part of SWE230 — Web Application Development  
Faculty of Computer Science

---

## 📄 License

This project is for educational purposes only.
