/**
 * Profile.js - User profile page logic
 * Fetches user data, handles profile editing, and logout
 * Supports demo mode when backend is unavailable
 */

const PROFILE_API_BASE = 'http://localhost:5000';

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
    // Ensure userData is available from scene_user if missing
    if (!localStorage.getItem('userData') && localStorage.getItem('scene_user')) {
        localStorage.setItem('userData', localStorage.getItem('scene_user'));
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
    const editName = document.getElementById('edit-name');
    const editPhone = document.getElementById('edit-phone');
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
    if (profileAvatar) {
        profileAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';
    }

    // Pre-fill edit form
    if (editName) editName.value = user.name || '';
    if (editPhone) editPhone.value = user.phone || '';

    // Show content, hide loading
    if (profileLoading) profileLoading.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';
}

/* ============================================
   LOAD PROFILE DATA
   ============================================ */
async function loadProfile() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Demo/offline mode: load from localStorage directly
    if (isDemoMode()) {
        const userData = localStorage.getItem('userData') || localStorage.getItem('scene_user');
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
            localStorage.setItem('userData', JSON.stringify(user));
            populateProfile(user);
        } else {
            showProfileError(user.message || 'Failed to load profile.');
        }
    } catch (error) {
        console.warn('Backend unavailable, trying localStorage:', error.message);
        // Fallback: try to load from localStorage
        const userData = localStorage.getItem('userData') || localStorage.getItem('scene_user');
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
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData.name = name;
            userData.phone = phone || null;
            localStorage.setItem('userData', JSON.stringify(userData));

            // Also update demoUsers list
            try {
                const demoUsers = JSON.parse(localStorage.getItem('demoUsers') || '[]');
                const idx = demoUsers.findIndex(u => u.email === userData.email);
                if (idx !== -1) {
                    demoUsers[idx].name = name;
                    demoUsers[idx].phone = phone || null;
                    localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
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
                body: JSON.stringify({ name, phone: phone || null }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userData', JSON.stringify(data));
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
        localStorage.removeItem('scene_user');
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
