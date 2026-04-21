/**
 * auth.js — Login & Registration logic
 * Connects to real backend API at http://localhost:5000
 */

const API_BASE = 'http://localhost:5000/api';

// ============================================
// REGEX PATTERNS
// ============================================
const REGEX_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/,
    strongPassword: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    fullName: /^[a-zA-Z\s]{2,}$/,
    phone: /^[+]?[\d\s\-()]{7,}$/,
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================
function validateEmail(email) {
    if (!email) return { valid: false, message: 'Email address is required' };
    if (!REGEX_PATTERNS.email.test(email)) return { valid: false, message: 'Please enter a valid email (e.g. user@example.com)' };
    return { valid: true, message: '' };
}

function validatePassword(password) {
    if (!password) return { valid: false, message: 'Password is required' };
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Add at least one uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'Add at least one lowercase letter' };
    if (!/\d/.test(password)) return { valid: false, message: 'Add at least one number' };
    return { valid: true, message: '' };
}

function validateFullName(fullName) {
    if (!fullName) return { valid: false, message: 'Full name is required' };
    if (!REGEX_PATTERNS.fullName.test(fullName.trim())) return { valid: false, message: 'Name must be letters only (2+ characters)' };
    return { valid: true, message: '' };
}

function validatePhone(phone) {
    if (!phone || phone.trim() === '') return { valid: true, message: '' }; // optional
    if (!REGEX_PATTERNS.phone.test(phone.trim())) return { valid: false, message: 'Please enter a valid phone number' };
    return { valid: true, message: '' };
}

function validateConfirmPassword(confirm, password) {
    if (!confirm) return { valid: false, message: 'Please confirm your password' };
    if (confirm !== password) return { valid: false, message: 'Passwords do not match' };
    return { valid: true, message: '' };
}

function calculatePasswordStrength(password) {
    let s = 0;
    if (/[a-z]/.test(password)) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[@$!%*?&]/.test(password)) s++;
    if (password.length >= 12) s++;
    if (s < 2) return { level: 'weak', label: 'Weak' };
    if (s < 4) return { level: 'medium', label: 'Medium' };
    return { level: 'strong', label: 'Strong' };
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
        // Support both plain text and icon+span structure
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
    let box = document.getElementById('global-error');
    if (!box) {
        box = document.createElement('div');
        box.id = 'global-error';
        box.style.cssText = `
            background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.4);border-radius:8px;
            padding:12px 16px;font-size:13px;color:#ef9a9a;margin-bottom:16px;
            display:flex;align-items:center;gap:10px;`;
        box.innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef5350;"></i><span id="global-error-text"></span>`;
        const form = document.querySelector('form');
        if (form) form.prepend(box);
    }
    document.getElementById('global-error-text').textContent = msg;
    box.style.display = 'flex';
}

function hideGlobalError() {
    const box = document.getElementById('global-error');
    if (box) box.style.display = 'none';
}

// ============================================
// LOCAL STORAGE TRACKING (For Offline Admin)
// ============================================
function trackLocalUser(user, isRegistration = false) {
    try {
        let localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
        let uIdx = localUsers.findIndex(u => String(u.email) === String(user.email));
        if (uIdx !== -1) {
            localUsers[uIdx].name = user.name || localUsers[uIdx].name;
            localUsers[uIdx].role = user.role || localUsers[uIdx].role;
            if (!isRegistration) {
                localUsers[uIdx].last_login = new Date().toISOString();
                localUsers[uIdx].login_count = (localUsers[uIdx].login_count || 1) + 1;
            }
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

// ============================================
// SEED DEMO USERS (pre-populated for demo)
// These users can be logged in with during presentation
// Password for all: Password1
// ============================================
function seedDemoUsers() {
    try {
        const localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
        // Only seed if we have fewer than 3 users (avoid re-seeding)
        if (localUsers.length >= 3) return;

        const demoUsers = [
            { id: 1001, name: 'Ahmed Hassan', email: 'ahmed@scene.com', phone: '+20 100 123 4567', role: 'customer', password: 'Password1', created_at: '2026-01-15T09:30:00Z', last_login: '2026-04-20T14:22:00Z', login_count: 34 },
            { id: 1002, name: 'Sara Mohamed', email: 'sara@scene.com', phone: '+20 101 234 5678', role: 'customer', password: 'Password1', created_at: '2026-02-03T11:45:00Z', last_login: '2026-04-19T18:10:00Z', login_count: 21 },
            { id: 1003, name: 'Omar Ali', email: 'omar@scene.com', phone: '+20 102 345 6789', role: 'customer', password: 'Password1', created_at: '2026-02-20T16:00:00Z', last_login: '2026-04-21T10:05:00Z', login_count: 47 },
            { id: 1004, name: 'Nour Ibrahim', email: 'nour@scene.com', phone: '+20 103 456 7890', role: 'customer', password: 'Password1', created_at: '2026-03-10T08:20:00Z', last_login: '2026-04-18T22:30:00Z', login_count: 12 },
            { id: 1005, name: 'Admin User', email: 'admin@scene.com', phone: '+20 100 000 0000', role: 'admin', password: 'admin112', created_at: '2026-01-01T00:00:00Z', last_login: '2026-04-21T15:00:00Z', login_count: 156 },
        ];

        const emailSet = new Set(localUsers.map(u => u.email));
        demoUsers.forEach(du => {
            if (!emailSet.has(du.email)) {
                localUsers.push(du);
            }
        });
        localStorage.setItem('scene_users_local', JSON.stringify(localUsers));
        console.log('[Auth] Demo users seeded:', demoUsers.length);
    } catch (e) { }
}

// Seed demo users on page load
seedDemoUsers();

// ============================================
// LOGIN FORM
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // If already logged in and on the login page, redirect to home
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('scene_user') || localStorage.getItem('userData');
    const isLoginPage = !!document.getElementById('loginForm');
    const isRegisterPage = !!document.getElementById('registerForm');
    const urlParams = new URLSearchParams(window.location.search);

    if (token && user && isLoginPage && !urlParams.has('registered')) {
        const redirect = urlParams.get('redirect') || 'index.html';
        window.location.href = redirect;
        return;
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) initLoginForm(loginForm);

    const registerForm = document.getElementById('registerForm');
    if (registerForm) initRegisterForm(registerForm);
});

function initLoginForm(form) {
    const emailEl = form.querySelector('#email');
    const passEl = form.querySelector('#password');
    const loginBtn = form.querySelector('#loginBtn');
    const toggler = form.querySelector('#togglePassword');

    // Show/hide password
    toggler?.addEventListener('click', () => {
        const isText = passEl.type === 'text';
        passEl.type = isText ? 'password' : 'text';
        toggler.innerHTML = `<i class="fas fa-eye${isText ? '' : '-slash'}"></i>`;
    });

    // Blur validation
    emailEl?.addEventListener('blur', e => setFieldStatus('email', validateEmail(e.target.value).valid, validateEmail(e.target.value).message));
    passEl?.addEventListener('blur', e => setFieldStatus('password', validatePassword(e.target.value).valid, validatePassword(e.target.value).message));
    emailEl?.addEventListener('focus', () => clearFieldStatus('email'));
    passEl?.addEventListener('focus', () => clearFieldStatus('password'));

    // Pre-fill remembered email
    const remembered = localStorage.getItem('scene_remember_email');
    if (remembered && emailEl) {
        emailEl.value = remembered;
        const rem = form.querySelector('#rememberMe');
        if (rem) rem.checked = true;
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        hideGlobalError();

        const email = emailEl.value.trim();
        const password = passEl.value;

        // For LOGIN: only validate email format and non-empty password
        // (the server will verify the actual credentials)
        const ev = validateEmail(email);
        const loginPasswordOk = password.length > 0;

        setFieldStatus('email', ev.valid, ev.message);
        setFieldStatus('password', loginPasswordOk, loginPasswordOk ? '' : 'Password is required');
        if (!ev.valid || !loginPasswordOk) return;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SIGNING IN…';

        try {
            const res = await fetch(`${API_BASE}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (res.ok) {
                // Store auth data
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('scene_user', JSON.stringify(data.user));
                localStorage.setItem('userData', JSON.stringify(data.user));

                // Also store as admin_token if user is admin
                if (data.user?.role === 'admin') {
                    localStorage.setItem('admin_token', data.token);
                }

                const rem = form.querySelector('#rememberMe');
                if (rem?.checked) {
                    localStorage.setItem('scene_remember_email', email);
                } else {
                    localStorage.removeItem('scene_remember_email');
                }

                // Redirect — admins go to admin dashboard
                trackLocalUser(data.user, false);
                const urlRedirect = new URLSearchParams(window.location.search).get('redirect');
                let redirect = urlRedirect || 'index.html';
                if (data.user?.role === 'admin') redirect = '../admin/index.html';
                window.location.href = redirect;
            } else {
                showGlobalError(data.message || 'Invalid email or password.');
                setFieldStatus('email', false, '');
            }
        } catch (err) {
            // Offline fallback
            console.log('Backend offline, trying local storage...', err.message);
            const localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
            const user = localUsers.find(u => String(u.email) === String(email));

            if (user && user.password === password) {
                trackLocalUser(user, false);
                localStorage.setItem('authToken', 'offline_token_' + Date.now());
                localStorage.setItem('scene_user', JSON.stringify(user));
                localStorage.setItem('userData', JSON.stringify(user));
                if (user.role === 'admin') localStorage.setItem('admin_token', 'offline_admin_token');

                const rem = form.querySelector('#rememberMe');
                if (rem?.checked) localStorage.setItem('scene_remember_email', email);
                else localStorage.removeItem('scene_remember_email');

                const urlRedirect = new URLSearchParams(window.location.search).get('redirect');
                let redirect = urlRedirect || 'index.html';
                if (user.role === 'admin') redirect = '../admin/index.html';
                window.location.href = redirect;
            } else if (email === 'admin@scene.com' && password === 'admin112') {
                // Hardcoded fallback admin for offline debugging
                const adminUser = { id: 1, name: 'Super Admin', email: 'admin@scene.com', role: 'admin', password: 'admin112' };
                trackLocalUser(adminUser, false);
                localStorage.setItem('authToken', 'offline_token_admin');
                localStorage.setItem('scene_user', JSON.stringify(adminUser));
                localStorage.setItem('userData', JSON.stringify(adminUser));
                localStorage.setItem('admin_token', 'offline_admin_token');
                window.location.href = '../admin/index.html';
            } else {
                showGlobalError('Invalid email or password (or backend is offline).');
                setFieldStatus('email', false, '');
            }
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> SIGN IN';
        }
    });
}

// ============================================
// REGISTER FORM
// ============================================
function initRegisterForm(form) {
    const nameEl = form.querySelector('#fullName');
    const emailEl = form.querySelector('#email');
    const phoneEl = form.querySelector('#phone');
    const passEl = form.querySelector('#password');
    const confEl = form.querySelector('#confirmPassword');
    const regBtn = form.querySelector('#registerBtn');
    const toggler = form.querySelector('#togglePassword');
    const toggler2 = form.querySelector('#toggleConfirmPassword');
    const termsChk = form.querySelector('#termsAgree');

    // Show/hide passwords
    toggler?.addEventListener('click', () => {
        const t = passEl.type === 'text' ? 'password' : 'text';
        passEl.type = t;
        toggler.innerHTML = `<i class="fas fa-eye${t === 'password' ? '-slash' : ''}"></i>`;
    });
    toggler2?.addEventListener('click', () => {
        const t = confEl.type === 'text' ? 'password' : 'text';
        confEl.type = t;
        toggler2.innerHTML = `<i class="fas fa-eye${t === 'password' ? '-slash' : ''}"></i>`;
    });

    // Live password strength
    passEl?.addEventListener('input', e => {
        updateStrengthBar(e.target.value);
    });

    // Blur validations
    nameEl?.addEventListener('blur', e => setFieldStatus('fullName', validateFullName(e.target.value).valid, validateFullName(e.target.value).message));
    emailEl?.addEventListener('blur', e => setFieldStatus('email', validateEmail(e.target.value).valid, validateEmail(e.target.value).message));
    phoneEl?.addEventListener('blur', e => setFieldStatus('phone', validatePhone(e.target.value).valid, validatePhone(e.target.value).message));
    passEl?.addEventListener('blur', e => setFieldStatus('password', validatePassword(e.target.value).valid, validatePassword(e.target.value).message));
    confEl?.addEventListener('blur', e => setFieldStatus('confirmPassword', validateConfirmPassword(e.target.value, passEl.value).valid, validateConfirmPassword(e.target.value, passEl.value).message));

    // Clear on focus
    [['fullName', nameEl], ['email', emailEl], ['phone', phoneEl], ['password', passEl], ['confirmPassword', confEl]].forEach(([id, el]) => {
        el?.addEventListener('focus', () => clearFieldStatus(id));
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        hideGlobalError();

        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        const phone = phoneEl?.value.trim() || '';
        const password = passEl.value;
        const confirm = confEl.value;

        // Validate
        const nv = validateFullName(name);
        const ev = validateEmail(email);
        const phv = validatePhone(phone);
        const pv = validatePassword(password);
        const cv = validateConfirmPassword(confirm, password);

        setFieldStatus('fullName', nv.valid, nv.message);
        setFieldStatus('email', ev.valid, ev.message);
        setFieldStatus('phone', phv.valid, phv.message);
        setFieldStatus('password', pv.valid, pv.message);
        setFieldStatus('confirmPassword', cv.valid, cv.message);

        if (!nv.valid || !ev.valid || !phv.valid || !pv.valid || !cv.valid) return;

        if (termsChk && !termsChk.checked) {
            showGlobalError('Please accept the Terms of Service to continue.');
            return;
        }

        regBtn.disabled = true;
        regBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREATING ACCOUNT…';

        try {
            const res = await fetch(`${API_BASE}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone: phone || null, password }),
            });
            const data = await res.json();

            if (res.ok) {
                // Store token and redirect to login with success message
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('scene_user', JSON.stringify(data.user));
                localStorage.setItem('userData', JSON.stringify(data.user));
                localStorage.setItem('scene_register_success', name);

                // Admin token if applicable
                if (data.user?.role === 'admin') {
                    localStorage.setItem('admin_token', data.token);
                }

                trackLocalUser(data.user, true);
                window.location.href = 'login.html?registered=1';
            } else {
                showGlobalError(data.message || 'Registration failed. Please try again.');
                if (data.message?.toLowerCase().includes('email')) {
                    setFieldStatus('email', false, data.message);
                }
            }
        } catch (_) {
            // Offline fallback registration
            console.log('Backend offline, registering to local storage...');
            const localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
            if (localUsers.some(u => String(u.email) === String(email))) {
                showGlobalError('Email already registered.');
                setFieldStatus('email', false, 'Email already in use');
            } else {
                const newUser = { id: Date.now(), name, email, phone, role: 'customer', password };
                trackLocalUser(newUser, true);
                localStorage.setItem('authToken', 'offline_token_' + Date.now());
                localStorage.setItem('scene_user', JSON.stringify(newUser));
                localStorage.setItem('userData', JSON.stringify(newUser));
                localStorage.setItem('scene_register_success', name);
                window.location.href = 'login.html?registered=1';
            }
        } finally {
            regBtn.disabled = false;
            regBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREATE ACCOUNT';
        }
    });
}

// ============================================
// PASSWORD STRENGTH BAR
// ============================================
function updateStrengthBar(password) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    if (!fill || !text) return;
    if (!password) { fill.className = 'strength-fill'; text.textContent = ''; return; }
    const s = calculatePasswordStrength(password);
    fill.className = `strength-fill ${s.level}`;
    text.textContent = `Strength: ${s.label}`;
}

// Show success banner on login page after registration
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.search.includes('registered=1')) {
        const name = localStorage.getItem('scene_register_success') || 'there';
        const banner = document.createElement('div');
        banner.style.cssText = `
            background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.35);border-radius:8px;
            padding:12px 16px;font-size:13px;color:#a5d6a7;margin-bottom:18px;
            display:flex;align-items:center;gap:10px;`;
        banner.innerHTML = `<i class="fas fa-check-circle" style="color:#4caf50;"></i> Welcome, ${name}! Account created. Please sign in.`;
        const card = document.querySelector('.login-card, .register-card');
        const firstChild = card?.firstElementChild;
        if (firstChild) card.insertBefore(banner, firstChild.nextSibling);
        localStorage.removeItem('scene_register_success');
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { REGEX_PATTERNS, validateEmail, validatePassword };
}
