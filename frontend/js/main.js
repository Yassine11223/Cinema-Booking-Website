/**
 * Main.js - Cinema Booking System (Frontend)
 * Homepage: Navbar scroll effect + utility functions
 * Hero slideshow is managed by tmdb-api.js
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
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
   PLAY TRAILER (opens in modal or new tab)
   ============================================ */
function playTrailer(url) {
    // Open trailer in a new tab for now
    window.open(url, '_blank');
}
