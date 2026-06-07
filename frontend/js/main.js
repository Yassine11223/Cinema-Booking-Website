/**
 * Main.js - Cinema Booking System (Frontend)
 * Homepage: Navbar scroll effect + utility functions
 * Hero slideshow is managed by tmdb-api.js
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    updateNavbarAuth();
    initAvatarSetup();
});

const AVATAR_API_BASE = 'http://localhost:5000';
const CINEMA_AVATARS = {
    popcorn: { label: 'Popcorn', icon: 'fa-solid fa-box-open' },
    ticket: { label: 'Movie Ticket', icon: 'fa-solid fa-ticket' },
    'film-reel': { label: 'Film Reel', icon: 'fa-solid fa-film' },
    clapperboard: { label: 'Clapperboard', icon: 'fa-solid fa-clapperboard' },
    glasses: { label: '3D Glasses', icon: 'fa-solid fa-glasses' },
    camera: { label: 'Camera', icon: 'fa-solid fa-video' },
    'cinema-seat': { label: 'Cinema Seat', icon: 'fa-solid fa-couch' },
    star: { label: 'Star', icon: 'fa-solid fa-star' },
};

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

    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            const firstName = user.name ? user.name.split(' ')[0] : 'Profile';

            // Replace LOGIN link with profile link
            authNavLink.href = 'profile.html';
            authNavLink.innerHTML = '<span class="nav-avatar" aria-hidden="true"></span><span></span>';
            renderAvatar(authNavLink.querySelector('.nav-avatar'), user);
            authNavLink.querySelector('span:last-child').textContent = firstName.toUpperCase();
            authNavLink.classList.add('logged-in');
        } catch (e) {
            // Invalid userData, keep login link
        }
    }
}

function renderAvatar(container, user) {
    if (!container) return;
    container.replaceChildren();

    const avatar = user?.avatar;
    if (avatar?.startsWith('predefined:')) {
        const option = CINEMA_AVATARS[avatar.slice('predefined:'.length)];
        if (option) {
            const icon = document.createElement('i');
            icon.className = option.icon;
            container.appendChild(icon);
            return;
        }
    }

    if (avatar?.startsWith('/uploads/avatars/')) {
        const image = document.createElement('img');
        image.src = AVATAR_API_BASE + avatar;
        image.alt = '';
        container.appendChild(image);
        return;
    }

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-user';
    container.appendChild(icon);
}

function initAvatarSetup() {
    const token = localStorage.getItem('userToken');
    const storedUser = parseStoredUser();
    if (!token || !storedUser || storedUser.role !== 'customer') return;

    loadAvatarStyles();
    fetch(`${AVATAR_API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
    })
        .then(async response => {
            if (!response.ok) throw new Error('Could not load profile');
            return response.json();
        })
        .then(user => {
            localStorage.setItem('userData', JSON.stringify(user));
            updateNavbarAuth();
            if (user.profileSetupCompleted === false) openAvatarModal(true);
        })
        .catch(() => {
            if (storedUser.profileSetupCompleted === false) openAvatarModal(true);
        });
}

function parseStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('userData') || 'null');
    } catch {
        return null;
    }
}

function loadAvatarStyles() {
    if (document.getElementById('avatar-styles')) return;
    const link = document.createElement('link');
    link.id = 'avatar-styles';
    link.rel = 'stylesheet';
    link.href = window.location.pathname.includes('/pages/') ? '../css/avatar.css' : 'css/avatar.css';
    document.head.appendChild(link);
}

function openAvatarModal(required = false) {
    loadAvatarStyles();
    document.getElementById('avatar-setup-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'avatar-setup-modal';
    modal.className = 'avatar-modal-overlay';
    modal.innerHTML = `
        <section class="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title">
            ${required ? '' : '<button class="avatar-modal-close" type="button" aria-label="Close">&times;</button>'}
            <h2 id="avatar-modal-title">Choose Your Avatar</h2>
            <p>Pick a cinema favorite or upload your own photo.</p>
            <div class="avatar-preview" id="avatar-preview"><i class="fa-solid fa-user"></i></div>
            <div class="avatar-grid" id="avatar-grid"></div>
            <label class="avatar-upload-btn">
                <i class="fa-solid fa-camera"></i> Upload Photo
                <input type="file" id="avatar-file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
            </label>
            <div class="avatar-modal-message" id="avatar-modal-message"></div>
            <button class="avatar-save-btn" id="avatar-save-btn" type="button">Save Avatar</button>
        </section>`;
    document.body.appendChild(modal);

    let selectedAvatar = null;
    let selectedFile = null;
    const grid = modal.querySelector('#avatar-grid');
    const preview = modal.querySelector('#avatar-preview');
    const message = modal.querySelector('#avatar-modal-message');

    Object.entries(CINEMA_AVATARS).forEach(([key, option]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'avatar-option';
        button.title = option.label;
        button.innerHTML = `<i class="${option.icon}"></i><span>${option.label}</span>`;
        button.addEventListener('click', () => {
            modal.querySelectorAll('.avatar-option').forEach(item => item.classList.remove('selected'));
            button.classList.add('selected');
            selectedAvatar = key;
            selectedFile = null;
            preview.innerHTML = `<i class="${option.icon}"></i>`;
            message.textContent = '';
        });
        grid.appendChild(button);
    });

    modal.querySelector('#avatar-file').addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            message.textContent = 'Photo must be 2MB or smaller.';
            message.className = 'avatar-modal-message error';
            event.target.value = '';
            return;
        }
        selectedFile = file;
        selectedAvatar = null;
        modal.querySelectorAll('.avatar-option').forEach(item => item.classList.remove('selected'));
        const image = document.createElement('img');
        image.src = URL.createObjectURL(file);
        image.alt = 'Avatar preview';
        preview.replaceChildren(image);
        message.textContent = '';
    });

    modal.querySelector('.avatar-modal-close')?.addEventListener('click', () => modal.remove());
    const saveButton = modal.querySelector('#avatar-save-btn');
    saveButton?.addEventListener('click', async () => {
        if (!selectedAvatar && !selectedFile) {
            message.textContent = 'Choose an avatar or upload a photo first.';
            message.className = 'avatar-modal-message error';
            return;
        }

        const formData = new FormData();
        if (selectedFile) formData.append('avatar', selectedFile);
        else formData.append('predefinedAvatar', selectedAvatar);

        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        try {
            const response = await fetch(`${AVATAR_API_BASE}/api/users/profile/avatar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` },
                body: formData,
            });
            const responseText = await response.text();
            let user;
            try {
                user = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(`Avatar server returned an invalid response (${response.status}).`);
            }

            if (!response.ok) throw new Error(user.message || 'Could not save avatar.');

            localStorage.setItem('userData', JSON.stringify(user));
            updateNavbarAuth();
            if (typeof populateProfile === 'function') populateProfile(user);
            message.textContent = 'Avatar saved successfully.';
            message.className = 'avatar-modal-message success';
            setTimeout(() => modal.remove(), 700);
        } catch (error) {
            message.textContent = error.message;
            message.className = 'avatar-modal-message error';
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Avatar';
            }
        }
    });
}

window.openAvatarModal = openAvatarModal;
window.renderAvatar = renderAvatar;

/* ============================================
   PLAY TRAILER (opens in modal or new tab)
   ============================================ */
function playTrailer(url) {
    // Open trailer in a new tab for now
    window.open(url, '_blank');
}
