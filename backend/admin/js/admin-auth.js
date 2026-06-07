/**
 * admin-auth.js — Admin/SuperAdmin Login logic
 * Connects to POST /api/users/login/admin (role-restricted)
 * Falls back to offline local storage with role enforcement
 * Supports both admin and superadmin roles
 */

const API_BASE = 'http://localhost:5000/api';

// ============================================
// VALIDATION
// ============================================
function validateEmail(email) {
    if (!email) return { valid: false, message: 'Email address is required' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, message: 'Please enter a valid email address' };
    return { valid: true, message: '' };
}

// ============================================
// DOM HELPERS
// ============================================
function setFieldStatus(fieldId, isValid, message = '') {
    const field = document.getElementById(fieldId);
    const err = document.getElementById(`${fieldId}Error`);
    if (!field) return;
    field.classList.toggle('error', !isValid);
    field.classList.toggle('success', isValid);
    if (err) {
        const span = err.querySelector('span');
        if (span) span.textContent = message;
        else err.textContent = message;
        err.classList.toggle('show', !isValid && !!message);
    }
}

function clearFieldStatus(fieldId) {
    const field = document.getElementById(fieldId);
    const err = document.getElementById(`${fieldId}Error`);
    if (!field) return;
    field.classList.remove('error', 'success');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
}

function showGlobalError(msg) {
    let box = document.getElementById('admin-global-error');
    if (!box) {
        box = document.createElement('div');
        box.id = 'admin-global-error';
        box.style.cssText = `
            background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.4);border-radius:8px;
            padding:12px 16px;font-size:13px;color:#ef9a9a;margin-bottom:16px;
            display:flex;align-items:center;gap:10px;`;
        box.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#ef5350;"></i><span id="admin-global-error-text"></span>`;
        const form = document.querySelector('form');
        if (form) form.prepend(box);
    }
    document.getElementById('admin-global-error-text').textContent = msg;
    box.style.display = 'flex';
}

function hideGlobalError() {
    const box = document.getElementById('admin-global-error');
    if (box) box.style.display = 'none';
}

// ============================================
// SEED DEMO ADMIN & SUPERADMIN USERS (offline)
// ============================================
function seedDemoAdmins() {
    try {
        let localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
        localUsers = localUsers.filter(user => ![
            'admin@scene.com',
            'superadmin@scene.com'
        ].includes(String(user.email || '').toLowerCase()));

        // Demo admin
        const adminData = {
            id: 1005,
            name: 'Cinema Admin',
            email: 'admin@thehallcinema.com',
            phone: '+20 100 333 4444',
            role: 'admin',
            password: 'Admin2026!',
            created_at: '2026-01-01T00:00:00Z',
            last_login: new Date().toISOString(),
            login_count: 1
        };

        // Demo superadmin
        const superAdminData = {
            id: 1006,
            name: 'Cinema Super Admin',
            email: 'superadmin@thehallcinema.com',
            phone: '+20 100 555 6666',
            role: 'superadmin',
            password: 'SuperAdmin2026!',
            created_at: '2026-01-01T00:00:00Z',
            last_login: new Date().toISOString(),
            login_count: 1
        };

        // Upsert admin
        const adminIdx = localUsers.findIndex(u => u.email === adminData.email);
        if (adminIdx !== -1) {
            localUsers[adminIdx].password = adminData.password;
            localUsers[adminIdx].role = adminData.role;
        } else {
            localUsers.push(adminData);
        }

        // Upsert superadmin
        const superIdx = localUsers.findIndex(u => u.email === superAdminData.email);
        if (superIdx !== -1) {
            localUsers[superIdx].password = superAdminData.password;
            localUsers[superIdx].role = superAdminData.role;
        } else {
            localUsers.push(superAdminData);
        }

        localStorage.setItem('scene_users_local', JSON.stringify(localUsers));
    } catch (e) { }
}

seedDemoAdmins();

// ============================================
// AUTH GUARD — Redirect if already logged in as admin/superadmin
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('scene_user') || localStorage.getItem('userData');

    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            if (user && (user.role === 'admin' || user.role === 'superadmin')) {
                // Already authenticated as admin/superadmin — go to dashboard
                window.location.href = 'index.html';
                return;
            }
        } catch (_) { }
    }

    initAdminLoginForm();
});

// ============================================
// ADMIN LOGIN FORM
// ============================================
function initAdminLoginForm() {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;

    const emailEl = form.querySelector('#admin-email');
    const passEl = form.querySelector('#admin-password');
    const loginBtn = form.querySelector('#adminLoginBtn');
    const toggler = form.querySelector('#adminTogglePassword');

    // Show/hide password
    toggler?.addEventListener('click', () => {
        const isText = passEl.type === 'text';
        passEl.type = isText ? 'password' : 'text';
        toggler.innerHTML = `<i class="fas fa-eye${isText ? '' : '-slash'}"></i>`;
    });

    // Blur validation
    emailEl?.addEventListener('blur', e => {
        const v = validateEmail(e.target.value);
        setFieldStatus('admin-email', v.valid, v.message);
    });
    passEl?.addEventListener('blur', e => {
        const ok = e.target.value.length > 0;
        setFieldStatus('admin-password', ok, ok ? '' : 'Password is required');
    });
    emailEl?.addEventListener('focus', () => clearFieldStatus('admin-email'));
    passEl?.addEventListener('focus', () => clearFieldStatus('admin-password'));

    // Form submit
    form.addEventListener('submit', async e => {
        e.preventDefault();
        hideGlobalError();

        const email = emailEl.value.trim();
        const password = passEl.value;

        // Validate
        const ev = validateEmail(email);
        const passwordOk = password.length > 0;

        setFieldStatus('admin-email', ev.valid, ev.message);
        setFieldStatus('admin-password', passwordOk, passwordOk ? '' : 'Password is required');
        if (!ev.valid || !passwordOk) return;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING…';

        try {
            // Call admin-only login endpoint (accepts admin + superadmin)
            const res = await fetch(`${API_BASE}/users/login/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (res.ok) {
                // Store auth data
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('scene_user', JSON.stringify(data.user));
                localStorage.setItem('userData', JSON.stringify(data.user));

                // Track in local storage
                trackLocalAdmin(data.user);

                // Redirect to admin dashboard (same for both admin and superadmin)
                window.location.href = 'index.html';
            } else {
                // Show server error (includes role mismatch message)
                showGlobalError(data.message || 'Invalid credentials.');
                if (res.status === 403) {
                    // Role mismatch — highlight with specific styling
                    setFieldStatus('admin-email', false, '');
                }
            }
        } catch (err) {
            // Offline fallback — check local storage
            console.log('Backend offline, trying local storage...', err.message);
            const localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
            const user = localUsers.find(u => String(u.email) === String(email));

            if (user && user.password === password) {
                // Enforce admin or superadmin role
                if (user.role !== 'admin' && user.role !== 'superadmin') {
                    showGlobalError('Access denied. This portal is for administrators only.');
                    setFieldStatus('admin-email', false, '');
                } else {
                    trackLocalAdmin(user);
                    localStorage.setItem('authToken', 'offline_token_admin_' + Date.now());
                    localStorage.setItem('admin_token', 'offline_admin_token');
                    localStorage.setItem('scene_user', JSON.stringify(user));
                    localStorage.setItem('userData', JSON.stringify(user));
                    window.location.href = 'index.html';
                }
            } else {
                showGlobalError('Invalid email or password (or backend is offline).');
                setFieldStatus('admin-email', false, '');
            }
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ACCESS DASHBOARD';
        }
    });
}

// ============================================
// LOCAL STORAGE TRACKING
// ============================================
function trackLocalAdmin(user) {
    try {
        let localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
        let idx = localUsers.findIndex(u => String(u.email) === String(user.email));
        if (idx !== -1) {
            localUsers[idx].last_login = new Date().toISOString();
            localUsers[idx].login_count = (localUsers[idx].login_count || 1) + 1;
        } else {
            localUsers.push({
                ...user,
                last_login: new Date().toISOString(),
                login_count: 1,
                created_at: user.created_at || new Date().toISOString()
            });
        }
        localStorage.setItem('scene_users_local', JSON.stringify(localUsers));
    } catch (e) { }
}
