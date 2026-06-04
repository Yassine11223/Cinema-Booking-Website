/**
 * Main.js - Cinema Booking System (Frontend)
 * Homepage: Navbar scroll effect + utility functions
 * Hero slideshow is managed by tmdb-api.js
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    updateNavbarAuth();
});

const NAVBAR_AVATAR_OPTIONS = [
    'images/avatars/avatar-director.png',
    'images/avatars/avatar-popcorn.png',
    'images/avatars/avatar-scifi.png',
    'images/avatars/avatar-red-carpet.png',
    'images/avatars/avatar-film-reel.png',
    'images/avatars/avatar-ticket-fan.png',
];

function normalizeNavbarAvatarSrc(src) {
    if (!src) return '';
    if (/^(https?:|data:)/.test(src)) return src;
    const clean = src.replace(/^(\.\/|\/)+/, '');
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pages/')) {
        return `../${clean}`;
    }
    if (path.includes('/admin/')) {
        return `../frontend/${clean}`;
    }
    return clean;
}

function getNavbarUser() {
    const userData = localStorage.getItem('userData') || localStorage.getItem('thehall_user') || localStorage.getItem('scene_user');
    if (!userData) return null;
    try {
        return JSON.parse(userData);
    } catch {
        return null;
    }
}

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
    const user = getNavbarUser();

    if (token && user) {
        try {
            const firstName = user.name ? user.name.split(' ')[0] : 'Profile';
            const avatarSrc = user.profile_photo
                ? normalizeNavbarAvatarSrc(user.profile_photo)
                : '';

            // Replace LOGIN link with profile link
            authNavLink.href = 'profile.html';
            authNavLink.innerHTML = avatarSrc
                ? `<img class="nav-user-avatar" src="${avatarSrc}" alt="${firstName} avatar" style="width:30px;height:30px;border-radius:50%;object-fit:cover;margin-right:8px;border:1.5px solid var(--primary-light, #e50914);vertical-align:middle;"> <span>${firstName.toUpperCase()}</span>`
                : `<i class="fa-solid fa-user"></i> <span>${firstName.toUpperCase()}</span>`;
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
    window.open(url, '_blank');
}
