/**
 * Admin login.
 * Real backend auth only; no demo/offline admin accounts.
 */

const API_BASE = 'http://localhost:5000/api';

function validateEmail(email) {
    if (!email) return { valid: false, message: 'Email address is required' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { valid: false, message: 'Please enter a valid email address' };
    }
    return { valid: true, message: '' };
}

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
    if (err) {
        err.textContent = '';
        err.classList.remove('show');
    }
}

function showGlobalError(msg) {
    let box = document.getElementById('admin-global-error');
    if (!box) {
        box = document.createElement('div');
        box.id = 'admin-global-error';
        box.style.cssText = 'background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.4);border-radius:8px;padding:12px 16px;font-size:13px;color:#ef9a9a;margin-bottom:16px;display:flex;align-items:center;gap:10px;';
        box.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef5350;"></i><span id="admin-global-error-text"></span>';
        document.querySelector('form')?.prepend(box);
    }
    document.getElementById('admin-global-error-text').textContent = msg;
    box.style.display = 'flex';
}

function hideGlobalError() {
    const box = document.getElementById('admin-global-error');
    if (box) box.style.display = 'none';
}

function normalizeRole(role) {
    return role === 'superadmin' ? 'super_admin' : role;
}

function isAdmin(user) {
    const role = normalizeRole(user?.role);
    return role === 'admin' || role === 'super_admin';
}

function storeAdminSession(token, user) {
    const adminUser = { ...user, role: normalizeRole(user.role) };
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(adminUser));
    localStorage.setItem('isAdminLoggedIn', 'true');

    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isUserLoggedIn');

    localStorage.setItem('admin_token', token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('thehall_user', JSON.stringify(adminUser));
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
    const userData = localStorage.getItem('adminUser') || localStorage.getItem('thehall_user');

    if (token && userData) {
        try {
            const user = JSON.parse(userData);
            if (isAdmin(user)) {
                window.location.href = 'index.html';
                return;
            }
        } catch (_) {}
    }

    initAdminLoginForm();
});

function initAdminLoginForm() {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;

    const emailEl = form.querySelector('#admin-email');
    const passEl = form.querySelector('#admin-password');
    const loginBtn = form.querySelector('#adminLoginBtn');
    const toggler = form.querySelector('#adminTogglePassword');

    toggler?.addEventListener('click', () => {
        const isText = passEl.type === 'text';
        passEl.type = isText ? 'password' : 'text';
        toggler.innerHTML = `<i class="fas fa-eye${isText ? '' : '-slash'}"></i>`;
    });

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

    form.addEventListener('submit', async e => {
        e.preventDefault();
        hideGlobalError();

        const email = emailEl.value.trim();
        const password = passEl.value;
        const ev = validateEmail(email);
        const passwordOk = password.length > 0;

        setFieldStatus('admin-email', ev.valid, ev.message);
        setFieldStatus('admin-password', passwordOk, passwordOk ? '' : 'Password is required');
        if (!ev.valid || !passwordOk) return;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING...';

        try {
            const res = await fetch(`${API_BASE}/users/login/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.token || !isAdmin(data.user)) {
                showGlobalError(data.message || 'Invalid administrator credentials.');
                return;
            }

            storeAdminSession(data.token, data.user);
            window.location.href = 'index.html';
        } catch (err) {
            showGlobalError('Admin login requires the backend and MongoDB to be running.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ACCESS DASHBOARD';
        }
    });
}
