# Phase 2.1 - HTML Structure Specification

## Overview
Build semantic HTML5 structure for all customer-facing pages. Focus on:
- Semantic HTML5 tags
- Accessibility (ARIA labels, semantic structure)
- Form elements and inputs
- Responsive layout containers
- Component structure for reusability

**Duration:** 1 week  
**Files to create:** 9 main pages + 3 supporting pages

---

## 📋 HTML Pages Checklist

- [ ] **homepage** - `index.html`
- [ ] **movies listing** - `movies.html`
- [ ] **movie details** - `movie-detail.html`
- [ ] **seat booking** - `booking.html`
- [ ] **shopping cart** - `cart.html`
- [ ] **user login** - `login.html`
- [ ] **user registration** - `register.html`
- [ ] **user profile** - `profile.html`
- [ ] **payment** - `payment.html`
- [ ] **about** - `pages/about.html`
- [ ] **contact** - `pages/contact.html`
- [ ] **FAQ** - `pages/faq.html`

---

## 🎨 Common Layout Components

### Header/Navigation
```html
Structure:
├── Header
│   ├── Logo/Brand
│   ├── Search Bar
│   ├── Navigation Menu (Home, Movies, Booking, Login)
│   └── User Account Button
```

**Features:**
- Sticky navigation
- Search input field
- Responsive hamburger menu for mobile
- User profile dropdown (if logged in)
- Logout button

---

### Footer
```html
Structure:
├── Footer
│   ├── About Section
│   ├── Quick Links
│   ├── Contact Info
│   ├── Social Media Links
│   └── Copyright Info
```

---

### Generic Container
```html
<div class="container">
  <main class="main-content">
    <!-- Page content -->
  </main>
</div>
```

---

## 📄 Detailed Page Specifications

### **1. Homepage (`index.html`)**

#### Page Structure:
```
Header/Navigation
├── Hero Section
│   ├── Large Heading ("Book Your Movie Tickets")
│   ├── Search Bar (Search movies by title)
│   ├── Call-to-Action Button ("Explore Movies")
│   └── Background Image/Gradient
│
├── Featured Movies Section
│   ├── Section Title ("Now Showing")
│   ├── Movie Cards (Grid)
│   │   ├── Poster Image
│   │   ├── Movie Title
│   │   ├── Rating
│   │   └── "View Details" Button
│   └── "View All" Link
│
├── Why Us Section
│   ├── Feature Cards
│   │   ├── Easy Booking
│   │   ├── Secure Payment
│   │   └── Best Prices
│   └── Each with icon + description
│
└── Call-to-Action Section
    └── "Start Booking Now" Button

Footer
```

#### Form Elements:
- Search input (`<input type="search">`)
- Search button

#### Interactive Elements:
- Movie cards as links to details
- View All button

---

### **2. Movies Listing (`movies.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Page Title Section
│   └── "Now Showing Movies"
│
├── Filters Sidebar
│   ├── Genre Filter (Checkboxes or Dropdown)
│   │   ├── Action
│   │   ├── Drama
│   │   ├── Sci-Fi
│   │   ├── Comedy
│   │   ├── Horror
│   │   └── Family
│   │
│   ├── Rating Filter (Slider or Stars)
│   │   └── 5.0 - 10.0
│   │
│   ├── Language Filter (Checkboxes)
│   │   ├── English
│   │   ├── Hindi
│   │   ├── Spanish
│   │   └── Other
│   │
│   ├── Release Date Range
│   │   ├── From Date
│   │   └── To Date
│   │
│   └── "Apply Filters" Button
│
├── Search & Sort Bar
│   ├── Search Input ("Search movies...")
│   ├── Sort Dropdown
│   │   ├── Latest
│   │   ├── Highest Rated
│   │   ├── Most Popular
│   │   └── Price: Low to High
│   │
│   └── View Options (Grid/List toggle)
│
├── Movie Cards Grid
│   ├── Each Card:
│   │   ├── Poster Image
│   │   ├── Title
│   │   ├── Genre Tag
│   │   ├── Duration
│   │   ├── Rating (5 stars)
│   │   ├── Language
│   │   ├── Release Date
│   │   ├── Short Description
│   │   ├── "View Details" Button
│   │   └── "Book Now" Button
│   │
│   └── (3-4 cards per row responsive)
│
├── Pagination
│   ├── Previous Button
│   ├── Page Numbers (1, 2, 3...)
│   └── Next Button
│
└── No Results Message (if filtered results empty)

Footer
```

#### Form Elements:
- Genre checkboxes/select
- Rating slider
- Language checkboxes
- Date range inputs
- Search input
- Sort dropdown
- Pagination buttons

#### Important Attributes:
- `aria-label` for filters
- `id` and `name` for form elements
- Data attributes for filtering: `data-genre`, `data-rating`

---

### **3. Movie Details (`movie-detail.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Breadcrumb Navigation
│   └── Home > Movies > [Movie Title]
│
├── Movie Header Section
│   ├── Poster Image (Large)
│   ├── Movie Info Box
│   │   ├── Title
│   │   ├── Genre(s)
│   │   ├── Duration
│   │   ├── Language(s)
│   │   ├── Release Date
│   │   ├── Rating (5 stars, e.g., 8.5/10)
│   │   ├── Director
│   │   ├── Cast Members
│   │   ├── Budget/Box Office (optional)
│   │   └── "Book Tickets" CTA Button
│   └── Trailer Video Player (Embedded YouTube)
│
├── Description Section
│   ├── "About Movie" Heading
│   ├── Full movie synopsis/description
│   └── "Read More" toggle (if long)
│
├── Reviews Section
│   ├── Section Title ("User Reviews")
│   ├── Average Rating Display
│   ├── Review Cards
│   │   ├── User Name
│   │   ├── Rating (5 stars)
│   │   ├── Review Date
│   │   ├── Review Text
│   │   └── Helpful/Not Helpful buttons
│   └── "Add Review" Button (if logged in)
│
├── Recommended Movies Section
│   ├── "Similar Movies" / "You Might Like"
│   ├── Movie Card Carousel (3-4 cards)
│   └── Each card links to movie details
│
└── Show Times Section
    ├── "Available Shows"
    ├── Date Selector
    ├── Show Cards
    │   ├── Theater Name
    │   ├── Show Time
    │   ├── Format (2D/3D)
    │   ├── Price
    │   └── "Select Seats" Button
    └── Theater Location

Footer
```

#### Form Elements:
- Date picker for show times
- Review form (textarea for review text, star rating)
- Rating input

#### Special Elements:
- Video embed (trailer)
- Star rating display
- Review cards

---

### **4. Booking/Seat Selection (`booking.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Booking Stepper/Progress
│   ├── Step 1: Select Show (✓ Completed)
│   ├── Step 2: Select Seats (● Active - Current)
│   ├── Step 3: Confirm Details
│   └── Step 4: Payment
│
├── Selected Show Information
│   ├── Movie Title
│   ├── Date & Time
│   ├── Theater Name
│   ├── Screen Number
│   └── "Change Show" Button
│
├── Movie Screen Display
│   ├── "SCREEN" Label (centered at top)
│   └── SVG/Canvas showing screen
│
├── Seat Selection Grid
│   ├── Rows: A, B, C, D, E, F, G, H
│   ├── Columns: 1-12 (or variable)
│   │
│   ├── Seat Types (Colors):
│   │   ├── Available Seats (Gray/Light)
│   │   ├── Selected Seats (Gold/Yellow - on click)
│   │   └── Booked Seats (Red/Dark - disabled)
│   │
│   └── Premium Seats (center rows, slightly larger)
│
├── Seat Legend
│   ├── Available: Gray box
│   ├── Selected: Gold box
│   └── Booked: Red box
│
├── Selected Seats Summary
│   ├── "Selected Seats:"
│   ├── Display: "A1, A2, B1" etc
│   ├── Quantity: 3 seats
│   ├── Price per seat: ₹300
│   ├── Total Price: ₹900
│   └── Remove individual seats (X button)
│
├── Booking Details Form
│   ├── Number of Seats (readonly, auto-filled)
│   ├── Seat Category Summary
│   ├── Estimated Price Summary
│   └── Tax/Processing Fee breakdown
│
├── Action Buttons
│   ├── "Clear Selection" Button
│   ├── "Back" Button
│   └── "Continue to Confirmation" Button (Primary)
│
└── Seat Availability Info
    ├── "Only X seats available in this show"
    └── Countdown timer (optional, for premium seats)

Footer
```

#### Form Elements:
- Seat buttons (clickable, with selected state)
- Quantity display
- Price breakdown form (readonly)

#### Special Elements:
- SVG or Canvas seat map
- Interactive grid
- State management (selected, booked, available)
- Real-time price calculation

#### Data Attributes:
- `data-seat-id` on each seat
- `data-row` and `data-column`
- `data-is-booked` (true/false)
- `data-is-premium` (true/false)
- `data-price`

---

### **5. Shopping Cart (`cart.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Breadcrumb
│   └── Home > Booking > Cart
│
├── Cart Items Section
│   ├── "Your Bookings" Heading
│   ├── Booking Cards (for each booking)
│   │   ├── Movie Poster (small)
│   │   ├── Movie Title
│   │   ├── Show Date & Time
│   │   ├── Theater Name
│   │   ├── Seats: "A1, A2, B1"
│   │   ├── Quantity: 3 seats
│   │   ├── Price Breakdown
│   │   │   ├── Per Seat Price: ₹300
│   │   │   ├── Subtotal: ₹900
│   │   │   ├── Tax (10%): ₹90
│   │   │   └── Total: ₹990
│   │   ├── "Edit" Button (go back to seat selection)
│   │   ├── "Remove" Button (delete from cart)
│   │   └── "Save for Later" Button
│   │
│   └── (Multiple bookings if user selected multiple shows)
│
├── Promo Code Section
│   ├── Promo Code Input Field
│   ├── "Apply" Button
│   ├── Discount Display (if applied)
│   └── "Remove Promo" option
│
├── Price Summary Box (Sticky/Fixed)
│   ├── Subtotal: ₹900
│   ├── Tax: ₹90
│   ├── Discount (if promo): -₹50
│   ├── Processing Fee: ₹20
│   ├── Total Price: ₹990 (Large/Bold)
│   ├── "Proceed to Payment" Button (Primary, Large)
│   └── "Continue Shopping" Button (Secondary)
│
├── Save for Later Section (Optional)
│   ├── Saved Bookings List
│   ├── "Move to Cart" Button for each
│   └── "Remove" Button for each
│
├── Empty Cart Message
│   ├── "Your cart is empty"
│   ├── "Browse Movies" Link
│   └── "Recommended Movies" Carousel
│
└── Cart Terms
    ├── Booking terms checkbox
    ├── Refund policy link
    └── I agree to terms (must check to proceed)

Footer
```

#### Form Elements:
- Promo code input
- "Apply Promo" button
- Terms checkbox
- Edit/Remove buttons for items
- Quantity can be adjusted
- "Save for Later" button

#### Important Info:
- Real-time price calculation
- Tax calculation
- Discount application
- Cart persistence needed

---

### **6. User Login (`login.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Centered Auth Container
│   ├── Logo/Branding
│   ├── "Sign In" Heading
│   ├── "Sign into your account" Subheading
│   │
│   ├── Login Form
│   │   ├── Email Input Field
│   │   │   ├── Label: "Email Address"
│   │   │   ├── Placeholder: "your.email@example.com"
│   │   │   ├── Type: "email"
│   │   │   └── Required: true
│   │   │
│   │   ├── Password Input Field
│   │   │   ├── Label: "Password"
│   │   │   ├── Placeholder: "Enter your password"
│   │   │   ├── Type: "password"
│   │   │   ├── "Show/Hide Password" Toggle
│   │   │   └── Required: true
│   │   │
│   │   ├── "Remember Me" Checkbox
│   │   ├── "Forgot Password?" Link
│   │   │
│   │   ├── "Sign In" Submit Button (Primary, Full Width)
│   │   └── Error Message Area (for failed login)
│   │
│   ├── Divider ("OR")
│   │
│   ├── Social Login Options
│   │   ├── "Sign in with Google" Button
│   │   ├── "Sign in with Facebook" Button
│   │   └── (Optional) "Sign in with Apple"
│   │
│   ├── Sign Up Link
│   │   └── "Don't have an account? Sign Up Here"
│   │
│   └── Help Center Link
│       └── "Need help? Contact Support"

Footer (Minimal)
```

#### Form Elements:
- Email input (`<input type="email">`)
- Password input (`<input type="password">`)
- Show/Hide password checkbox
- Remember me checkbox
- Sign In submit button
- Social login buttons
- Links to forgot password, signup, help

#### Attributes:
- `required` on email/password
- `aria-label` for inputs
- Error message div (hidden initially)

---

### **7. User Registration (`register.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Centered Auth Container
│   ├── Logo/Branding
│   ├── "Create Account" Heading
│   ├── "Join millions of movie lovers" Subheading
│   │
│   ├── Registration Form
│   │   ├── First Name Input
│   │   │   ├── Placeholder: "John"
│   │   │   └── Required: true
│   │   │
│   │   ├── Last Name Input
│   │   │   ├── Placeholder: "Doe"
│   │   │   └── Required: true
│   │   │
│   │   ├── Email Input
│   │   │   ├── Type: "email"
│   │   │   ├── Placeholder: "your.email@example.com"
│   │   │   └── Required: true
│   │   │
│   │   ├── Phone Number Input
│   │   │   ├── Type: "tel"
│   │   │   ├── Placeholder: "+1 (555) 000-0000"
│   │   │   └── Required: true
│   │   │
│   │   ├── Password Input
│   │   │   ├── Type: "password"
│   │   │   ├── Placeholder: "Min 8 characters"
│   │   │   ├── Show/Hide Toggle
│   │   │   ├── Password Strength Indicator
│   │   │   └── Required: true
│   │   │
│   │   ├── Confirm Password Input
│   │   │   ├── Type: "password"
│   │   │   └── Required: true
│   │   │
│   │   ├── Date of Birth Input
│   │   │   ├── Type: "date"
│   │   │   └── Required: true
│   │   │
│   │   ├── Address (Optional)
│   │   │   ├── Street Address
│   │   │   ├── City
│   │   │   └── Postal Code
│   │   │
│   │   ├── Terms & Conditions Checkbox
│   │   │   ├── "I agree to Terms of Service"
│   │   │   ├── "I agree to Privacy Policy"
│   │   │   └── Required: true
│   │   │
│   │   ├── Newsletter Checkbox (Optional)
│   │   │   └── "Send me special offers and updates"
│   │   │
│   │   ├── "Create Account" Submit Button (Primary, Full Width)
│   │   └── Error/Success Message Area
│   │
│   ├── Already have account?
│   │   └── "Sign In Here" Link
│   │
│   └── Social Sign Up
│       ├── "OR sign up with"
│       ├── Google Button
│       └── Facebook Button

Footer (Minimal)
```

#### Form Elements:
- First Name, Last Name inputs
- Email input (with validation)
- Phone number input
- Password input (with strength meter)
- Confirm password input
- Date of birth input
- Address inputs (optional)
- Terms checkbox
- Newsletter checkbox
- Submit button

#### Special Features:
- Password strength meter
- Real-time validation
- Confirm password comparison
- Age verification (18+)

---

### **8. User Profile (`profile.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── User Dashboard Heading
│   └── "Welcome, [User Name]"
│
├── Sidebar Navigation
│   ├── Profile
│   ├── My Bookings
│   ├── Saved Shows
│   ├── Payment Methods
│   ├── Reviews & Ratings
│   ├── Settings
│   ├── Contact Support
│   └── Logout
│
├── Main Content Area (Changes based on sidebar selection)
│
│   A. PROFILE TAB
│   ├── Profile Picture
│   │   ├── Display Current Photo
│   │   └── "Change Photo" Button
│   │
│   ├── Personal Information Form
│   │   ├── First Name (editable)
│   │   ├── Last Name (editable)
│   │   ├── Email (display only)
│   │   ├── Phone (editable)
│   │   ├── Date of Birth (readonly)
│   │   ├── Address (editable)
│   │   ├── City (editable)
│   │   ├── Postal Code (editable)
│   │   └── "Save Changes" Button
│   │
│   ├── Password Section
│   │   ├── "Change Password" Button
│   │   └── Password Modal (overlay)
│   │       ├── Current Password Input
│   │       ├── New Password Input
│   │       ├── Confirm Password Input
│   │       └── "Update Password" Button
│   │
│   ├── Account Preferences
│   │   ├── Language Preference Dropdown
│   │   ├── Currency Preference Dropdown
│   │   ├── Email Notifications Checkbox
│   │   ├── SMS Notifications Checkbox
│   │   └── Newsletter Checkbox
│   │
│   └── Delete Account
│       └── "Delete my account permanently" Button
│
│   B. MY BOOKINGS TAB
│   ├── "My Bookings" Heading
│   ├── Filter Options
│   │   ├── Status Dropdown (All, Confirmed, Cancelled)
│   │   ├── Date Range Picker
│   │   └── "Apply Filters" Button
│   │
│   ├── Booking Cards
│   │   ├── Movie Title
│   │   ├── Show Date & Time
│   │   ├── Theater Name
│   │   ├── Seats
│   │   ├── Booking Date
│   │   ├── Status Badge (Confirmed/Cancelled)
│   │   ├── Total Amount
│   │   ├── "View Details" Button
│   │   ├── "Download Ticket" Button
│   │   ├── "Rate Movie" Button (if movie released)
│   │   └── "Cancel Booking" Button (if eligible)
│   │
│   ├── Pagination
│   └── Empty State (if no bookings)
│
│   C. SAVED SHOWS TAB
│   ├── "Wishlist / Saved Shows" Heading
│   ├── Movie Cards
│   │   ├── Poster
│   │   ├── Title
│   │   ├── Release Date
│   │   ├── "Book Now" Button
│   │   └── "Remove from Wishlist" Button
│   │
│   └── Empty State (if no saved shows)
│
│   D. PAYMENT METHODS TAB
│   ├── "Saved Payment Methods" Heading
│   ├── Credit/Debit Cards
│   │   ├── Card display (masked number)
│   │   ├── Cardholder name
│   │   ├── Expiry date
│   │   ├── Set as Default (radio)
│   │   ├── "Edit" Button
│   │   └── "Delete" Button
│   │
│   ├── Digital Wallets (Apple Pay, Google Pay)
│   │
│   ├── "Add New Payment Method" Button
│   └── Payment Method Modal
│
│   E. REVIEWS & RATINGS TAB
│   ├── "My Reviews" Heading
│   ├── Review Cards
│   │   ├── Movie Title
│   │   ├── Your Rating (5 stars)
│   │   ├── Your Review Text
│   │   ├── Review Date
│   │   ├── Number of Helpful Marks
│   │   ├── "Edit Review" Button
│   │   └── "Delete Review" Button
│   │
│   └── Empty State
│
│   F. SETTINGS TAB
│   ├── Privacy Settings
│   │   ├── Profile Visibility (Public/Private)
│   │   ├── Show Ratings Publicly (Yes/No)
│   │   └── Allow Others to Follow (Yes/No)
│   │
│   ├── Security Settings
│   │   ├── Two-Factor Authentication (Enable/Disable)
│   │   ├── Active Sessions List
│   │   ├── "Logout All Other Sessions" Button
│   │   └── "Login Activity" Log
│   │
│   ├── Notification Settings
│   │   ├── Booking Confirmation Emails
│   │   ├── Special Offers Emails
│   │   ├── SMS Notifications
│   │   └── Push Notifications (if app)
│   │
│   └── Data Management
│       ├── "Download My Data" Button
│       └── "Delete Account" Button

Footer
```

#### Form Elements:
- Text inputs (name, phone, address, etc.)
- File upload (profile photo)
- Dropdown selects (language, currency, status)
- Checkboxes (preferences, notifications)
- Date inputs
- Modals for sensitive operations (change password, delete account)
- Radio buttons (set default payment method)

---

### **9. Payment (`payment.html`)**

#### Page Structure:
```
Header/Navigation

Main Content:
├── Payment Page Heading
│   └── "Complete Your Payment"
│
├── Two-Column Layout
│   │
│   ├── LEFT COLUMN: Payment Form
│   │   ├── Booking Summary Section
│   │   │   ├── Movie Info Summary
│   │   │   ├── Show Details
│   │   │   ├── Seats
│   │   │   └── Final Amount: ₹990
│   │   │
│   │   ├── Payment Method Selection
│   │   │   ├── Credit/Debit Card (Default)
│   │   │   │   ├── Radio Button
│   │   │   │   ├── Card Icon
│   │   │   │   └── "Visa ending in 4242"
│   │   │   │
│   │   │   ├── Debit Card
│   │   │   │   ├── Radio Button
│   │   │   │   └── Card Selection
│   │   │   │
│   │   │   ├── NetBanking
│   │   │   │   ├── Radio Button
│   │   │   │   └── Bank Dropdown
│   │   │   │
│   │   │   ├── UPI (India)
│   │   │   │   ├── Radio Button
│   │   │   │   └── UPI ID Input
│   │   │   │
│   │   │   ├── Digital Wallet
│   │   │   │   ├── Google Pay
│   │   │   │   ├── Apple Pay
│   │   │   │   └── PayPal
│   │   │   │
│   │   │   └── Saved Payment Methods
│   │   │       ├── Existing Cards (checkboxes)
│   │   │       └── "Use a new card" Option
│   │   │
│   │   ├── Card Details Form (if card selected)
│   │   │   ├── Cardholder Name
│   │   │   ├── Card Number (16 digits)
│   │   │   ├── Expiry Date (MM/YY)
│   │   │   ├── CVV (3 digits)
│   │   │   ├── Save this card checkbox
│   │   │   └── Billing Address (Auto-filled)
│   │   │
│   │   ├── Promo Code Section
│   │   │   ├── Promo Code Applied (display)
│   │   │   └── "Change" Button
│   │   │
│   │   ├── Terms & Conditions
│   │   │   ├── Checkbox
│   │   │   ├── "I agree to refund policy"
│   │   │   └── Link to policy
│   │   │
│   │   └── Payment Buttons
│   │       ├── "Back" Button (Secondary)
│   │       └── "Pay ₹990" Button (Primary, Large)
│   │
│   └── RIGHT COLUMN: Order Summary (Sticky)
│       ├── Order Summary Box
│       │   ├── Movie Title
│       │   ├── Show Date & Time
│       │   ├── Theater Name
│       │   ├── Seats
│       │   │
│       │   ├── Price Breakdown
│       │   │   ├── Ticket Price: ₹900
│       │   │   ├── Convenience Fee: ₹20
│       │   │   ├── GST (12%): ₹70
│       │   │   ├── Discount: -₹0 (or applied promo)
│       │   │   └── Total: ₹990
│       │   │
│       │   ├── Secure Payment Badge
│       │   └── 100% Safe & Secure Message
│
├── Payment Processing State
│   ├── "Processing Payment..." message
│   ├── Loading spinner
│   └── Prevent user interaction
│
├── Payment Success Modal (shown after success)
│   ├── Success Icon/Message
│   ├── "Payment Successful!"
│   ├── Booking Confirmation Details
│   ├── "Download Ticket" Button
│   ├── "Send Ticket to Email" Button
│   └── "View My Bookings" Link
│
└── Payment Failed Modal (shown on error)
    ├── Error Icon
    ├── Error Message
    ├── Error Code
    ├── Reason for failure
    ├── "Retry Payment" Button
    └── "Contact Support" Link

Footer
```

#### Form Elements:
- Payment method radio buttons
- Bank dropdown (for NetBanking)
- Card input fields (name, number, expiry, CVV)
- UPI ID input
- Promo code display
- Terms checkbox
- Submit button

#### Special Features:
- Real-time card validation
- Expiry date formatting (MM/YY)
- CVV masking
- Card type detection (Visa, Mastercard, etc.)
- Secure payment indicator
- Success/failure modals
- Loading state during processing

---

### **10-12. Supporting Pages**

#### **10. About Page (`pages/about.html`)**
```
Header/Navigation

├── Hero Section with title
├── Company Story Section
├── Mission & Vision Section
├── Why Choose Us Section
├── Team Section (optional)
├── Company Stats/Milestones
└── Call-to-Action ("Book Now")

Footer
```

---

#### **11. Contact Page (`pages/contact.html`)**
```
Header/Navigation

├── Contact Information Box
│   ├── Email
│   ├── Phone
│   ├── Address
│   └── Business Hours
│
├── Contact Form
│   ├── Name Input
│   ├── Email Input
│   ├── Phone Input
│   ├── Subject Dropdown
│   ├── Message Textarea
│   ├── Attachment Upload (optional)
│   └── "Send Message" Button
│
├── Map Section (Embedded Google Map)
├── FAQ Link
└── Social Media Links

Footer
```

---

#### **12. FAQ Page (`pages/faq.html`)**
```
Header/Navigation

├── Search FAQ Input
├── FAQ Categories (Accordion)
│   ├── General Questions
│   ├── Booking Questions
│   ├── Payment Questions
│   ├── Cancellation & Refund
│   ├── Account & Profile
│   └── Technical Support
│
├── Each Category has:
│   ├── Multiple Q&A pairs
│   ├── Expandable/Collapsible
│   └── Related questions
│
├── Contact Support CTA
└── Feedback Form

Footer
```

---

## 🎯 HTML Implementation Guidelines

### 1. **Semantic HTML5**
```html
<!-- Use semantic tags -->
<header>, <nav>, <main>, <article>, <section>, <aside>, <footer>
<!-- NOT -->
<div class="header">, <div class="wrapper">, etc.
```

### 2. **Accessibility (WCAG)**
```html
<!-- Add ARIA labels -->
<input aria-label="Search movies" type="search">

<!-- Form labels -->
<label for="email">Email:</label>
<input id="email" type="email">

<!-- Alt text for images -->
<img src="poster.jpg" alt="Neon Chase movie poster">

<!-- Semantic buttons -->
<button type="submit">Submit</button>
<a href="/">Home</a>
```

### 3. **Form Validation Attributes**
```html
<input type="email" required>
<input type="password" minlength="8">
<input type="number" min="1" max="10">
```

### 4. **Data Attributes for JavaScript**
```html
<!-- For filtering, searching, state management -->
<div data-movie-id="123" data-genre="action">
<button data-seat-id="A1" data-is-booked="false">
```

### 5. **Accessible Navigation**
```html
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/movies">Movies</a></li>
  </ul>
</nav>
```

### 6. **Form Structure**
```html
<form id="loginForm" method="POST" action="/api/login">
  <fieldset>
    <legend>Login Credentials</legend>
    <!-- form fields -->
  </fieldset>
</form>
```

---

## 📏 Container & Layout Planning

### Responsive Breakpoints:
- **Mobile:** 320px - 480px
- **Tablet:** 481px - 768px
- **Desktop:** 769px - 1024px
- **Wide:** 1025px+

### Container Widths:
- Mobile: Full width - 16px padding
- Tablet: 720px
- Desktop: 960px
- Wide: 1120px (max-width)

### Grid System:
- 12-column grid
- Gap: 16px (mobile), 24px (desktop)
- Responsive columns: 1 (mobile), 2 (tablet), 3-4 (desktop)

---

## ✅ Implementation Checklist

### Phase 2.1 Completion Criteria:

- [ ] All 12 HTML files created with semantic structure
- [ ] All pages have header & footer
- [ ] All forms have proper labels and ARIA attributes
- [ ] All links use proper `<a>` tags
- [ ] All images have alt text
- [ ] Data attributes for JS functionality
- [ ] Responsive container structure (no styling yet)
- [ ] Breadcrumb navigation where applicable
- [ ] Error message placeholder divs
- [ ] Success/Modal structure in place
- [ ] Button types properly defined (submit, button, reset)
- [ ] Form validation attributes added
- [ ] All 12 files committed to Git

---

## 🚀 Next Steps (After HTML is Complete):

1. **Phase 2.2** - CSS Styling (colors, layout, typography)
2. **Phase 2.3** - JavaScript functionality (search, filters, seat selection)
3. **Phase 3** - Backend API integration

---

**Document Version:** 1.0  
**Created:** April 6, 2026  
**Files to Create:** 12 HTML pages
