/**
 * admin-auth.js — Admin/SuperAdmin Login logic
 * Connects to POST /api/users/login/admin (role-restricted)
 * Uses backend admin authentication only
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
// AUTH GUARD — Redirect if already logged in as admin/superadmin
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');

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
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUser', JSON.stringify(data.user));
                localStorage.setItem('isAdminLoggedIn', 'true');
                localStorage.removeItem('admin_token');

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
            console.error('Admin login failed:', err.message);
            showGlobalError('Admin login failed. Please make sure the backend is running and the account has an admin role.');
            setFieldStatus('admin-email', false, '');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ACCESS DASHBOARD';
        }
    });
}

