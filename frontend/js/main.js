/**
 * Main.js - Cinema Booking System (Frontend)
 * Homepage: Navbar scroll effect + utility functions
 * Hero slideshow is managed by tmdb-api.js
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    updateNavbarAuth();
});

/* ============================================
   NAVBAR
   ============================================ */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/* ============================================
   NAVBAR AUTH AWARENESS
   Updates the LOGIN link to show user profile
   icon when the user is logged in.
   ============================================ */
function updateNavbarAuth() {
    const authNavLink = document.getElementById('auth-nav-link');
    if (!authNavLink) return;

    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData') || localStorage.getItem('scene_user');

    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            const firstName = user.name ? user.name.split(' ')[0] : 'Profile';

            // Replace LOGIN link with profile link
            authNavLink.href = 'profile.html';
            authNavLink.innerHTML = `<i class="fa-solid fa-user"></i> ${firstName.toUpperCase()}`;
            authNavLink.classList.add('logged-in');
        } catch (e) {
            // Invalid userData, keep login link
        }
    }
}

/* ============================================
   PLAY TRAILER (opens in modal or new tab)
   ============================================ */
function playTrailer(url) {
    // Open trailer in a new tab for now
    window.open(url, '_blank');
}
