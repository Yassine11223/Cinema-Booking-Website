/**
 * Profile.js - User profile page logic
 * Fetches user data, handles profile editing, and logout
 * Supports demo mode when backend is unavailable
 */

const PROFILE_API_BASE = 'http://localhost:5000';

const PROFILE_AVATAR_OPTIONS = [
    { label: 'Director', src: 'images/avatars/avatar-director.png' },
    { label: 'Popcorn Fan', src: 'images/avatars/avatar-popcorn.png' },
    { label: 'Sci-Fi Fan', src: 'images/avatars/avatar-scifi.png' },
    { label: 'Red Carpet', src: 'images/avatars/avatar-red-carpet.png' },
    { label: 'Film Reel', src: 'images/avatars/avatar-film-reel.png' },
    { label: 'Ticket Fan', src: 'images/avatars/avatar-ticket-fan.png' },
];

function isProfileCinemaAvatar(src) {
    if (!src) return false;
    return src.includes('avatar-director.png') ||
           src.includes('avatar-popcorn.png') ||
           src.includes('avatar-scifi.png') ||
           src.includes('avatar-red-carpet.png') ||
           src.includes('avatar-film-reel.png') ||
           src.includes('avatar-ticket-fan.png');
}

function normalizeProfileAvatarSrc(src) {
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

function getDisplayProfilePhoto(user) {
    if (isProfileCinemaAvatar(user?.profile_photo)) {
        return normalizeProfileAvatarSrc(user.profile_photo);
    }

    const storedUser = getStoredProfileUser();
    if (isProfileCinemaAvatar(storedUser?.profile_photo)) {
        return normalizeProfileAvatarSrc(storedUser.profile_photo);
    }

    return user?.profile_photo ? normalizeProfileAvatarSrc(user.profile_photo) : '';
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfile();
    initProfileForm();
    initLogout();
});

/* ============================================
   CHECK IF DEMO MODE (token starts with demo_token_)
   ============================================ */
function isDemoMode() {
    const token = localStorage.getItem('authToken');
    return token && (token.startsWith('demo_token_') || token.startsWith('offline_token_'));
}

/* ============================================
   AUTH CHECK — redirect if not logged in
   ============================================ */
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html?redirect=profile.html';
        return;
    }
    // Ensure userData is available from thehall_user if missing
    if (!localStorage.getItem('userData') && localStorage.getItem('thehall_user')) {
        localStorage.setItem('userData', localStorage.getItem('thehall_user'));
    }
}

/* ============================================
   POPULATE UI from user object
   ============================================ */
function populateProfile(user) {
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profilePhone = document.getElementById('profile-phone');
    const profileRole = document.getElementById('profile-role');
    const profileSince = document.getElementById('profile-since');
    const profileAvatar = document.getElementById('profile-avatar-letter');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const editName = document.getElementById('edit-name');
    const editPhone = document.getElementById('edit-phone');
    const editProfilePhoto = document.getElementById('edit-profile-photo');
    const profileLoading = document.getElementById('profile-loading');
    const profileContent = document.getElementById('profile-content');

    if (profileName) profileName.textContent = user.name || 'N/A';
    if (profileEmail) profileEmail.textContent = user.email || 'N/A';
    if (profilePhone) profilePhone.textContent = user.phone || 'Not provided';
    if (profileRole) profileRole.textContent = (user.role || 'customer').toUpperCase();
    if (profileSince) {
        const date = new Date(user.created_at);
        profileSince.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    const displayProfilePhoto = getDisplayProfilePhoto(user);
    if (displayProfilePhoto && profileAvatarImg) {
        profileAvatarImg.src = displayProfilePhoto;
        profileAvatarImg.alt = `${user.name || 'User'} avatar`;
        profileAvatarImg.style.display = 'block';
        if (profileAvatar) profileAvatar.style.display = 'none';
    } else if (profileAvatar) {
        profileAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';
        profileAvatar.style.display = 'block';
        if (profileAvatarImg) profileAvatarImg.style.display = 'none';
    }

    // Pre-fill edit form
    if (editName) editName.value = user.name || '';
    if (editPhone) editPhone.value = user.phone || '';
    const selectedAvatar = isProfileCinemaAvatar(displayProfilePhoto)
        ? displayProfilePhoto.replace(/^\//, '')
        : PROFILE_AVATAR_OPTIONS[0].src;
    if (editProfilePhoto) editProfilePhoto.value = selectedAvatar;
    renderProfileAvatarPicker(selectedAvatar);

    // Show content, hide loading
    if (profileLoading) profileLoading.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';
    if (typeof updateNavbarAuth === 'function') updateNavbarAuth();
}

function renderProfileAvatarPicker(selectedValue = PROFILE_AVATAR_OPTIONS[0].src) {
    const container = document.getElementById('edit-avatar-grid');
    const input = document.getElementById('edit-profile-photo');
    if (!container || !input) return;

    input.value = selectedValue;
    container.innerHTML = PROFILE_AVATAR_OPTIONS.map(avatar => `
        <button type="button"
                class="avatar-option${avatar.src === input.value ? ' selected' : ''}"
                data-avatar="${avatar.src}"
                aria-label="Choose ${avatar.label} avatar">
            <img src="${avatar.src}" alt="${avatar.label}">
        </button>
    `).join('');
}

function getStoredProfileUser() {
    try {
        return JSON.parse(localStorage.getItem('userData') || localStorage.getItem('thehall_user') || '{}');
    } catch {
        return {};
    }
}

/* ============================================
   LOAD PROFILE DATA
   ============================================ */
async function loadProfile() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Demo/offline mode: load from localStorage directly
    if (isDemoMode()) {
        const userData = localStorage.getItem('userData') || localStorage.getItem('thehall_user');
        if (userData) {
            try {
                populateProfile(JSON.parse(userData));
            } catch {
                showProfileError('Failed to load profile data.');
            }
        } else {
            showProfileError('No profile data found. Please login again.');
        }
        return;
    }

    // Real API mode
    try {
        const response = await fetch(PROFILE_API_BASE + '/api/users/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'login.html?redirect=profile.html';
            return;
        }

        const user = await response.json();

        if (response.ok) {
            const storedUser = getStoredProfileUser();
            const mergedUser = {
                ...user,
                profile_photo: isProfileCinemaAvatar(user.profile_photo)
                    ? user.profile_photo
                    : (isProfileCinemaAvatar(storedUser.profile_photo) ? storedUser.profile_photo : user.profile_photo),
            };
            localStorage.setItem('userData', JSON.stringify(mergedUser));
            localStorage.setItem('thehall_user', JSON.stringify(mergedUser));
            populateProfile(mergedUser);
        } else {
            showProfileError(user.message || 'Failed to load profile.');
        }
    } catch (error) {
        console.warn('Backend unavailable, trying localStorage:', error.message);
        // Fallback: try to load from localStorage
        const userData = localStorage.getItem('userData') || localStorage.getItem('thehall_user');
        if (userData) {
            try {
                populateProfile(JSON.parse(userData));
            } catch {
                showProfileError('Failed to load profile data.');
            }
        } else {
            showProfileError('Server unavailable. Please try again later.');
        }
    }
}

/* ============================================
   EDIT PROFILE FORM
   ============================================ */
function initProfileForm() {
    const editForm = document.getElementById('edit-profile-form');
    const editToggle = document.getElementById('edit-toggle-btn');
    const editSection = document.getElementById('edit-section');
    const editCancel = document.getElementById('edit-cancel-btn');
    const editAvatarGrid = document.getElementById('edit-avatar-grid');

    editAvatarGrid?.addEventListener('click', event => {
        const option = event.target.closest('.avatar-option');
        const input = document.getElementById('edit-profile-photo');
        if (!option || !input) return;
        input.value = option.dataset.avatar;
        editAvatarGrid.querySelectorAll('.avatar-option').forEach(btn => {
            btn.classList.toggle('selected', btn === option);
        });
    });

    // Toggle edit section visibility
    editToggle?.addEventListener('click', () => {
        if (editSection) {
            const isVisible = editSection.style.display === 'block';
            editSection.style.display = isVisible ? 'none' : 'block';
            editToggle.innerHTML = isVisible
                ? '<i class="fas fa-pen"></i> EDIT PROFILE'
                : '<i class="fas fa-times"></i> CANCEL';
        }
    });

    editCancel?.addEventListener('click', () => {
        if (editSection) editSection.style.display = 'none';
        if (editToggle) editToggle.innerHTML = '<i class="fas fa-pen"></i> EDIT PROFILE';
    });

    // Form submission
    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('authToken');
        if (!token) return;

        const name = document.getElementById('edit-name')?.value.trim();
        const phone = document.getElementById('edit-phone')?.value.trim();
        const profile_photo = document.getElementById('edit-profile-photo')?.value || PROFILE_AVATAR_OPTIONS[0].src;
        const saveBtn = document.getElementById('edit-save-btn');
        const editMsg = document.getElementById('edit-message');

        if (!name || name.length < 2) {
            if (editMsg) {
                editMsg.textContent = 'Name must be at least 2 characters.';
                editMsg.className = 'profile-msg error';
            }
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'SAVING...';
        }

        // Demo mode: update localStorage directly
        if (isDemoMode()) {
            const userData = getStoredProfileUser();
            userData.name = name;
            userData.phone = phone || null;
            userData.profile_photo = profile_photo;
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('thehall_user', JSON.stringify(userData));

            // Also update offline users list
            try {
                const demoUsers = JSON.parse(localStorage.getItem('thehall_users_local') || '[]');
                const idx = demoUsers.findIndex(u => u.email === userData.email);
                if (idx !== -1) {
                    demoUsers[idx].name = name;
                    demoUsers[idx].phone = phone || null;
                    demoUsers[idx].profile_photo = profile_photo;
                    localStorage.setItem('thehall_users_local', JSON.stringify(demoUsers));
                }
            } catch {}

            populateProfile(userData);

            if (editMsg) {
                editMsg.textContent = 'Profile updated successfully!';
                editMsg.className = 'profile-msg success';
            }
            setTimeout(() => {
                if (editSection) editSection.style.display = 'none';
                if (editToggle) editToggle.innerHTML = '<i class="fas fa-pen"></i> EDIT PROFILE';
                if (editMsg) editMsg.className = 'profile-msg';
            }, 1500);

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'SAVE CHANGES';
            }
            return;
        }

        // Real API mode
        try {
            const response = await fetch(PROFILE_API_BASE + '/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, phone: phone || null, profile_photo }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userData', JSON.stringify(data));
                localStorage.setItem('thehall_user', JSON.stringify(data));
                populateProfile(data);

                if (editMsg) {
                    editMsg.textContent = 'Profile updated successfully!';
                    editMsg.className = 'profile-msg success';
                }

                setTimeout(() => {
                    if (editSection) editSection.style.display = 'none';
                    if (editToggle) editToggle.innerHTML = '<i class="fas fa-pen"></i> EDIT PROFILE';
                    if (editMsg) editMsg.className = 'profile-msg';
                }, 1500);
            } else {
                if (editMsg) {
                    editMsg.textContent = data.message || 'Failed to update profile.';
                    editMsg.className = 'profile-msg error';
                }
            }
        } catch (error) {
            console.error('Profile update error:', error);
            if (editMsg) {
                editMsg.textContent = 'Connection error. Please try again.';
                editMsg.className = 'profile-msg error';
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'SAVE CHANGES';
            }
        }
    });
}

/* ============================================
   LOGOUT
   ============================================ */
function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('thehall_user');
        localStorage.removeItem('admin_token');
        window.location.href = 'index.html';
    });
}

/* ============================================
   ERROR DISPLAY
   ============================================ */
function showProfileError(message) {
    const profileLoading = document.getElementById('profile-loading');
    if (profileLoading) {
        profileLoading.innerHTML = `
            <div style="text-align: center; color: var(--text-muted);">
                <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: var(--primary-light); margin-bottom: 16px;"></i>
                <p>${message}</p>
                <a href="login.html" class="btn btn-primary" style="margin-top: 16px;">GO TO LOGIN</a>
            </div>
        `;
    }
}
