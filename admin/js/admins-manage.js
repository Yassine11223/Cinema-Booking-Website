/**
 * admins-manage.js
 * Super Admin page — manage admin accounts.
 * Load all users, filter to admin/superadmin roles, display as cards.
 * Supports creating new admin accounts and deleting existing ones.
 * Requires backend API data for admin account management.
 */

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */
    const API_BASE    = 'http://localhost:5000/api';
    const API_TIMEOUT = 3000;

    /* =========================================================
       STATE
       ========================================================= */
    let allUsers     = [];
    let adminUsers   = [];
    let deleteTargetId   = null;
    let deleteTargetName = '';

    /* =========================================================
       AVATAR HELPERS
       ========================================================= */
    const AVATAR_COLORS = [
        '#b71c1c','#880e4f','#4a148c','#1a237e','#0d47a1',
        '#006064','#1b5e20','#e65100','#bf360c','#4e342e'
    ];
    function avatarColor(id) { return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length]; }
    function initials(name)  { return (name || '?').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase(); }

    /* =========================================================
       DOM REF
       ========================================================= */
    const $ = id => document.getElementById(id);

    /* =========================================================
       INIT
       ========================================================= */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function init() {
        setDate();
        bindEvents();
        await loadAdmins();
    }

    function setDate() {
        const el = $('today-date-text');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' });
    }

    /* =========================================================
       BIND EVENTS
       ========================================================= */
    function bindEvents() {
        // Open add admin modal
        const addBtn = $('btn-open-add-admin');
        if (addBtn) addBtn.addEventListener('click', openAddModal);

        // Close add admin modal
        const addClose = $('modal-add-admin-close');
        if (addClose) addClose.addEventListener('click', closeAddModal);
        const addOverlay = $('modal-add-admin');
        if (addOverlay) addOverlay.addEventListener('click', e => { if (e.target === addOverlay) closeAddModal(); });

        // Submit add admin form
        const addForm = $('add-admin-form');
        if (addForm) addForm.addEventListener('submit', handleCreateAdmin);

        // Delete modal
        const delClose = $('modal-del-admin-close');
        if (delClose) delClose.addEventListener('click', closeDelModal);
        const delCancel = $('del-admin-cancel');
        if (delCancel) delCancel.addEventListener('click', closeDelModal);
        const delOverlay = $('modal-del-admin');
        if (delOverlay) delOverlay.addEventListener('click', e => { if (e.target === delOverlay) closeDelModal(); });
        const delConfirm = $('btn-confirm-del-admin');
        if (delConfirm) delConfirm.addEventListener('click', confirmDeleteAdmin);

        // Detail modal
        const detailClose = $('modal-admin-detail-close');
        if (detailClose) detailClose.addEventListener('click', () => { const m = $('modal-admin-detail'); if (m) m.classList.remove('open'); });
        const detailOverlay = $('modal-admin-detail');
        if (detailOverlay) detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) detailOverlay.classList.remove('open'); });

        // Escape closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeAddModal();
                closeDelModal();
                const m = $('modal-admin-detail');
                if (m) m.classList.remove('open');
            }
        });
    }

    /* =========================================================
       LOAD ADMINS
       ========================================================= */
    async function loadAdmins() {
        showLoading(true);
        try {
            const token = localStorage.getItem('adminToken') || '';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

            const res = await fetch(`${API_BASE}/users`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) throw new Error('API error ' + res.status);
            allUsers = await res.json();
            console.log(`[Admins] Loaded ${allUsers.length} users from API`);
        } catch (err) {
            console.warn('[Admins] Backend unavailable. Admin data was not loaded:', err.message);
            allUsers = [];
            toast('Admin accounts could not be loaded from the backend. Start the API server and refresh.', 'error');
        }

        // Filter to admin and superadmin roles
        adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'superadmin');

        showLoading(false);
        renderAdminCards();
        updateKpis();
    }

    /* =========================================================
       KPIs
       ========================================================= */
    function updateKpis() {
        const totalAdmins = adminUsers.filter(u => u.role === 'admin').length;
        const totalSuper  = adminUsers.filter(u => u.role === 'superadmin').length;

        // Active this week
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activeCount = adminUsers.filter(u => u.last_login && new Date(u.last_login).getTime() > oneWeekAgo).length;

        animateCount($('kpi-total-admins'), totalAdmins);
        animateCount($('kpi-superadmins'), totalSuper);
        animateCount($('kpi-active-admins'), activeCount);
    }

    function animateCount(el, target) {
        if (!el) return;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 20));
        const timer = setInterval(() => {
            cur = Math.min(cur + step, target);
            el.textContent = cur.toLocaleString();
            if (cur >= target) clearInterval(timer);
        }, 40);
    }

    /* =========================================================
       RENDER ADMIN CARDS
       ========================================================= */
    function renderAdminCards() {
        const grid  = $('admins-grid');
        const empty = $('admins-empty');
        const badge = $('admins-count-badge');
        if (!grid) return;

        grid.innerHTML = '';

        if (badge) badge.textContent = `${adminUsers.length} admin${adminUsers.length !== 1 ? 's' : ''}`;

        if (adminUsers.length === 0) {
            grid.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }

        if (empty) empty.style.display = 'none';
        grid.style.display = 'grid';

        // Sort: superadmins first, then by name
        const sorted = [...adminUsers].sort((a, b) => {
            if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
            if (a.role !== 'superadmin' && b.role === 'superadmin') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Get current user to prevent self-deletion
        let currentUserId = null;
        try {
            const userData = localStorage.getItem('adminUser');
            if (userData) currentUserId = JSON.parse(userData).id;
        } catch (_) {}

        sorted.forEach((admin, index) => {
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.style.animationDelay = `${index * 0.05}s`;

            const regDate   = admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
            const lastLogin = formatLastLogin(admin.last_login);
            const roleLabel = admin.role === 'superadmin' ? 'Super Admin' : 'Admin';
            const roleClass = admin.role === 'superadmin' ? 'role-superadmin' : 'role-admin';
            const roleIcon  = admin.role === 'superadmin' ? 'fa-crown' : 'fa-shield-alt';
            const isSelf    = String(admin.id) === String(currentUserId);

            card.innerHTML = `
                <div class="admin-card-top">
                    <div class="admin-card-avatar" style="background:${avatarColor(admin.id)};">
                        ${initials(admin.name)}
                    </div>
                    <div class="admin-card-info">
                        <div class="admin-card-name">${esc(admin.name || '—')}</div>
                        <div class="admin-card-email">${esc(admin.email || '—')}</div>
                        <div class="admin-card-role-badge ${roleClass}">
                            <i class="fas ${roleIcon}"></i> ${roleLabel}
                        </div>
                    </div>
                </div>
                <div class="admin-card-stats">
                    <div class="admin-card-stat">
                        <span class="admin-card-stat-label">Registered</span>
                        <span class="admin-card-stat-value">${regDate}</span>
                    </div>
                    <div class="admin-card-stat">
                        <span class="admin-card-stat-label">Last Login</span>
                        <span class="admin-card-stat-value">${lastLogin}</span>
                    </div>
                    <div class="admin-card-stat">
                        <span class="admin-card-stat-label">Login Count</span>
                        <span class="admin-card-stat-value">${admin.login_count || 0}</span>
                    </div>
                    <div class="admin-card-stat">
                        <span class="admin-card-stat-label">Phone</span>
                        <span class="admin-card-stat-value">${esc(admin.phone || '—')}</span>
                    </div>
                </div>
                <div class="admin-card-actions">
                    <button class="admin-card-btn admin-card-btn-view" data-action="view" title="View profile">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${isSelf || admin.role === 'superadmin' ? '' : `
                    <button class="admin-card-btn admin-card-btn-delete" data-action="delete" title="Delete admin">
                        <i class="fas fa-user-times"></i> Delete
                    </button>`}
                </div>`;

            // Event listeners
            card.querySelector('[data-action="view"]').addEventListener('click', () => openAdminDetail(admin));
            const delBtn = card.querySelector('[data-action="delete"]');
            if (delBtn) delBtn.addEventListener('click', () => openDelModal(admin.id, admin.name));

            grid.appendChild(card);
        });
    }

    /* =========================================================
       FORMAT LAST LOGIN
       ========================================================= */
    function formatLastLogin(lastLogin) {
        if (!lastLogin) return 'Never';
        const d = new Date(lastLogin);
        const days = Math.floor((Date.now() - d) / 86400000);
        if (days === 0) {
            const hrs = Math.floor((Date.now() - d) / 3600000);
            if (hrs === 0) return 'Just now';
            return `${hrs}h ago`;
        }
        if (days === 1) return 'Yesterday';
        if (days < 7)  return `${days} days ago`;
        if (days < 30) return `${Math.floor(days/7)}w ago`;
        return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    }

    /* =========================================================
       ADD ADMIN MODAL
       ========================================================= */
    function openAddModal() {
        const modal = $('modal-add-admin');
        if (modal) modal.classList.add('open');
        // Clear form
        const form = $('add-admin-form');
        if (form) form.reset();
        document.querySelectorAll('.add-admin-field .field-error').forEach(el => el.classList.remove('show'));
    }

    function closeAddModal() {
        const modal = $('modal-add-admin');
        if (modal) modal.classList.remove('open');
    }

    async function handleCreateAdmin(e) {
        e.preventDefault();

        const name     = ($('new-admin-name') || {}).value?.trim();
        const email    = ($('new-admin-email') || {}).value?.trim();
        const password = ($('new-admin-password') || {}).value;
        const phone    = ($('new-admin-phone') || {}).value?.trim();

        // Validate
        let valid = true;

        if (!name) {
            showFieldError('new-admin-name-error', 'Name is required');
            valid = false;
        } else {
            hideFieldError('new-admin-name-error');
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('new-admin-email-error', 'Valid email is required');
            valid = false;
        } else {
            hideFieldError('new-admin-email-error');
        }

        if (!password || password.length < 6) {
            showFieldError('new-admin-password-error', 'Password must be at least 6 characters');
            valid = false;
        } else {
            hideFieldError('new-admin-password-error');
        }

        if (!valid) return;

        const btn = $('btn-submit-admin');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREATING…'; }

        try {
            const token = localStorage.getItem('adminToken') || '';
            const res = await fetch(`${API_BASE}/users/admin/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ name, email, password, phone })
            });
            const data = await res.json();

            if (res.ok) {
                toast(`Admin "${name}" created successfully!`, 'success');
                closeAddModal();
                await loadAdmins();
            } else {
                toast(data.message || 'Failed to create admin.', 'error');
            }
        } catch (err) {
            toast('Failed to create admin: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> CREATE ADMIN'; }
        }
    }

    function showFieldError(id, msg) {
        const el = $(id);
        if (el) { el.textContent = msg; el.classList.add('show'); }
    }

    function hideFieldError(id) {
        const el = $(id);
        if (el) el.classList.remove('show');
    }

    /* =========================================================
       DELETE ADMIN
       ========================================================= */
    function openDelModal(id, name) {
        deleteTargetId = id;
        deleteTargetName = name;
        const nameEl = $('del-admin-name');
        if (nameEl) nameEl.textContent = name;
        const modal = $('modal-del-admin');
        if (modal) modal.classList.add('open');
    }

    function closeDelModal() {
        const modal = $('modal-del-admin');
        if (modal) modal.classList.remove('open');
        deleteTargetId = null;
        deleteTargetName = '';
    }

    async function confirmDeleteAdmin() {
        if (!deleteTargetId) return;
        const btn = $('btn-confirm-del-admin');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…'; }

        try {
            const token = localStorage.getItem('adminToken') || '';
            const res = await fetch(`${API_BASE}/users/${deleteTargetId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('API error ' + res.status);
        } catch (err) {
            toast('Delete failed: ' + err.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-times"></i> Delete'; }
            return;
        }

        allUsers = allUsers.filter(u => String(u.id) !== String(deleteTargetId));

        adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'superadmin');

        closeDelModal();
        renderAdminCards();
        updateKpis();
        toast(`Admin "${deleteTargetName}" deleted.`, 'success');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-times"></i> Delete'; }
    }

    /* =========================================================
       ADMIN DETAIL MODAL
       ========================================================= */
    function openAdminDetail(admin) {
        const body = $('admin-detail-body');
        if (!body) return;

        const regDate   = admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—';
        const lastLogin = formatLastLogin(admin.last_login);
        const loginFull = admin.last_login ? new Date(admin.last_login).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' }) : 'Never';
        const roleLabel = admin.role === 'superadmin' ? 'Super Admin' : 'Admin';
        const roleClass = admin.role === 'superadmin' ? 'role-superadmin' : 'role-admin';
        const roleIcon  = admin.role === 'superadmin' ? 'fa-crown' : 'fa-shield-alt';

        body.innerHTML = `
            <div class="udetail-top">
                <div class="udetail-avatar" style="background:${avatarColor(admin.id)};">${initials(admin.name)}</div>
                <div>
                    <div class="udetail-name">${esc(admin.name || '—')}</div>
                    <div class="udetail-email">${esc(admin.email || '—')}</div>
                    <div style="margin-top:8px;">
                        <span class="role-badge ${roleClass}">
                            <i class="fas ${roleIcon}"></i> ${roleLabel}
                        </span>
                    </div>
                </div>
            </div>
            <div class="udetail-stats-grid">
                <div class="udetail-stat"><div class="udetail-stat-val">${admin.login_count || 0}</div><div class="udetail-stat-label">Total Logins</div></div>
                <div class="udetail-stat"><div class="udetail-stat-val" style="font-size:16px;">${lastLogin}</div><div class="udetail-stat-label">Last Login</div></div>
                <div class="udetail-stat"><div class="udetail-stat-val" style="font-size:16px;">${regDate}</div><div class="udetail-stat-label">Registered</div></div>
            </div>
            <table class="udetail-table">
                <tr><td>User ID</td><td>#${admin.id}</td></tr>
                <tr><td>Name</td><td>${esc(admin.name || '—')}</td></tr>
                <tr><td>Email</td><td>${esc(admin.email || '—')}</td></tr>
                <tr><td>Phone</td><td>${esc(admin.phone || '—')}</td></tr>
                <tr><td>Role</td><td>${roleLabel}</td></tr>
                <tr><td>Registered</td><td>${regDate}</td></tr>
                <tr><td>Last Login</td><td>${loginFull}</td></tr>
                <tr><td>Login Count</td><td>${admin.login_count || 0} times</td></tr>
            </table>`;

        const modal = $('modal-admin-detail');
        if (modal) modal.classList.add('open');
    }

    /* =========================================================
       UI HELPERS
       ========================================================= */
    function showLoading(on) {
        const loading = $('admins-loading');
        const grid    = $('admins-grid');
        const empty   = $('admins-empty');
        if (loading) loading.style.display = on ? 'flex' : 'none';
        if (grid)    grid.style.display    = on ? 'none' : 'grid';
        if (empty)   empty.style.display   = 'none';
    }

    function toast(msg, type = 'info') {
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
        const cont = $('toast-container');
        if (cont) cont.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(8px)';
            t.style.transition = 'all 0.35s ease';
            setTimeout(() => t.remove(), 400);
        }, 3200);
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

})();
