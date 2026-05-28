/**
 * users-admin.js
 * User management — KPI cards show dummy stats,
 * Registered Accounts table shows real users from localStorage.
 * Falls back to localStorage when backend is offline.
 */

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */
    const API_BASE    = 'http://localhost:5000/api';
    const STORAGE_KEY = 'scene_admin_users';
    const API_TIMEOUT = 3000;

    /* =========================================================
       STATE
       ========================================================= */
    let allUsers      = [];
    let filteredUsers = [];
    let currentRole   = 'all';
    let currentSearch = '';
    let currentSort   = 'created_desc';
    let deleteTargetId   = null;
    let deleteTargetName = '';

    /* =========================================================
       AVATAR COLOURS
       ========================================================= */
    const AVATAR_COLORS = [
        '#b71c1c','#880e4f','#4a148c','#1a237e','#0d47a1',
        '#006064','#1b5e20','#e65100','#bf360c','#4e342e'
    ];
    function avatarColor(id) { return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length]; }
    function initials(name)   { return (name || '?').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase(); }

    /* =========================================================
       DOM REFS
       ========================================================= */
    const $ = id => document.getElementById(id);

    /* =========================================================
       INIT
       ========================================================= */
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setDate();
        bindEvents();
        await loadUsers();
    }

    function setDate() {
        const el = $('today-date-text');
        if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' });
    }

    /* =========================================================
       BIND EVENTS
       ========================================================= */
    function bindEvents() {
        const refreshBtn = $('btn-refresh-users');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('spinning');
                await loadUsers();
                refreshBtn.classList.remove('spinning');
            });
        }

        const searchEl = $('user-search');
        if (searchEl) searchEl.addEventListener('input', debounce(applyFilters, 300));
        
        const sortEl = $('sort-users');
        if (sortEl) sortEl.addEventListener('change', () => { currentSort = sortEl.value; applyFilters(); });

        document.querySelectorAll('[data-role]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentRole = btn.dataset.role;
                applyFilters();
            });
        });

        // Delete modal
        const delClose = $('modal-del-user-close');
        if (delClose) delClose.addEventListener('click', closeDelModal);
        const delCancel = $('del-user-cancel');
        if (delCancel) delCancel.addEventListener('click', closeDelModal);
        const delOverlay = $('modal-del-user');
        if (delOverlay) delOverlay.addEventListener('click', e => { if (e.target === delOverlay) closeDelModal(); });
        const delConfirm = $('btn-confirm-del-user');
        if (delConfirm) delConfirm.addEventListener('click', confirmDeleteUser);

        // Detail modal
        const detailClose = $('modal-detail-close');
        if (detailClose) detailClose.addEventListener('click', () => { const m = $('modal-user-detail'); if (m) m.classList.remove('open'); });
        const detailOverlay = $('modal-user-detail');
        if (detailOverlay) detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) detailOverlay.classList.remove('open'); });

        // Export CSV
        const exportBtn = $('btn-export-csv');
        if (exportBtn) exportBtn.addEventListener('click', exportCsv);

        // Escape closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeDelModal();
                const m = $('modal-user-detail');
                if (m) m.classList.remove('open');
            }
        });
    }

    /* =========================================================
       LOAD USERS — real registered accounts only
       ========================================================= */
    async function loadUsers() {
        showLoading(true);
        try {
            const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));
            console.log(`[Users] Loaded ${allUsers.length} users from API`);
        } catch (err) {
            console.log('[Users] Backend offline, using local data. Reason:', err.message);
            try {
                const localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
                const cachedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
                
                const emailSet = new Set();
                allUsers = [];
                localUsers.forEach(u => {
                    if (!emailSet.has(u.email)) {
                        emailSet.add(u.email);
                        allUsers.push(u);
                    }
                });
                cachedUsers.forEach(u => {
                    if (!emailSet.has(u.email)) {
                        emailSet.add(u.email);
                        allUsers.push(u);
                    }
                });
            } catch (_) { allUsers = []; }
        }
        showLoading(false);
        applyFilters();
        updateKpis();
        renderLoginChart();
    }

    /* =========================================================
       FILTERS & SORT
       ========================================================= */
    function applyFilters() {
        const searchEl = $('user-search');
        currentSearch = (searchEl ? searchEl.value : '').toLowerCase().trim();

        filteredUsers = allUsers.filter(u => {
            const roleOk   = currentRole === 'all' || u.role === currentRole;
            const searchOk = !currentSearch ||
                (u.name  || '').toLowerCase().includes(currentSearch) ||
                (u.email || '').toLowerCase().includes(currentSearch) ||
                (u.phone || '').toLowerCase().includes(currentSearch);
            return roleOk && searchOk;
        });

        filteredUsers.sort((a, b) => {
            switch (currentSort) {
                case 'created_desc':    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                case 'created_asc':     return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                case 'logins_desc':     return (b.login_count || 0) - (a.login_count || 0);
                case 'last_login_desc': return new Date(b.last_login || 0) - new Date(a.last_login || 0);
                case 'name_asc':        return (a.name || '').localeCompare(b.name || '');
                default:                return 0;
            }
        });

        const badge = $('users-count-badge');
        if (badge) badge.textContent = `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`;
        renderTable();
    }

    /* =========================================================
       KPI CARDS — Dummy aggregate data
       ========================================================= */
    function updateKpis() {
        const realCount = allUsers.length;
        animateCount($('kpi-total'),   1247 + realCount);
        animateCount($('kpi-active'),  834 + Math.min(realCount, 5));
        animateCount($('kpi-new'),     156 + realCount);
        animateCount($('kpi-admins'),  3 + allUsers.filter(u => u.role === 'admin').length);
    }

    function animateCount(el, target) {
        if (!el) return;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 30));
        const timer = setInterval(() => {
            cur = Math.min(cur + step, target);
            el.textContent = cur.toLocaleString();
            if (cur >= target) clearInterval(timer);
        }, 30);
    }

    /* =========================================================
       TABLE
       ========================================================= */
    function renderTable() {
        const tbody = $('users-tbody');
        const wrap  = $('users-table-wrap');
        const empty = $('users-empty');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (filteredUsers.length === 0) {
            if (wrap) wrap.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (wrap) wrap.style.display = 'block';

        const maxLogins = Math.max(1, ...filteredUsers.map(u => u.login_count || 0));

        filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            const loginCount = user.login_count || 0;
            const barPct     = Math.min(100, Math.round((loginCount / maxLogins) * 100));
            const loginClass = getLoginClass(user.last_login);
            const loginLabel = formatLastLogin(user.last_login);
            const regDate    = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';

            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="user-avatar" style="background:${avatarColor(user.id)};">${initials(user.name)}</div>
                        <div>
                            <div class="user-name">${esc(user.name || '—')}</div>
                            <div class="user-id">#${user.id}</div>
                        </div>
                    </div>
                </td>
                <td style="color:var(--text-secondary);font-size:13px;">${esc(user.email || '—')}</td>
                <td style="color:var(--text-muted);font-size:12.5px;">${esc(user.phone || '—')}</td>
                <td>
                    <span class="role-badge role-${user.role || 'customer'}">
                        <i class="fas ${user.role === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i>
                        ${(user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1)}
                    </span>
                </td>
                <td style="font-size:12.5px;color:var(--text-muted);">${regDate}</td>
                <td><span class="last-login-cell ${loginClass}">${loginLabel}</span></td>
                <td style="text-align:center;">
                    <span style="font-family:var(--font-display);font-size:14px;color:var(--text-primary);">${loginCount}</span>
                </td>
                <td>
                    <div class="activity-bar-wrap">
                        <div class="activity-bar-bg">
                            <div class="activity-bar-fill" style="width:${barPct}%;"></div>
                        </div>
                        <span class="activity-count">${loginCount}</span>
                    </div>
                </td>
                <td style="text-align:center;">
                    <div style="display:flex;gap:6px;justify-content:center;">
                        <button class="tbl-action-btn tbl-view" data-id="${user.id}" title="View profile"><i class="fas fa-eye"></i></button>
                        <button class="tbl-action-btn tbl-danger" data-id="${user.id}" data-name="${esc(user.name)}" title="Delete user"><i class="fas fa-user-times"></i></button>
                    </div>
                </td>`;

            tr.querySelector('.tbl-view').addEventListener('click', () => openUserDetail(user));
            tr.querySelector('.tbl-danger').addEventListener('click', () => openDelModal(user.id, user.name));
            tbody.appendChild(tr);
        });
    }

    /* =========================================================
       LAST LOGIN HELPERS
       ========================================================= */
    function getLoginClass(lastLogin) {
        if (!lastLogin) return 'last-login-never';
        const days = (Date.now() - new Date(lastLogin)) / 86400000;
        if (days < 1)  return 'last-login-fresh';
        if (days < 7)  return 'last-login-recent';
        return 'last-login-old';
    }

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
       LOGIN FREQUENCY CHART (simulated data)
       ========================================================= */
    function renderLoginChart() {
        const chartEl  = $('lfreq-chart');
        const labelsEl = $('lfreq-labels');
        if (!chartEl || !labelsEl) return;

        const days = 14;
        const buckets = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            buckets.push({ date: d, label: d.toLocaleDateString('en-US', { weekday:'short' }), count: 0 });
        }

        const simData = [42, 38, 55, 67, 49, 72, 61, 45, 58, 76, 84, 63, 71, 52];
        buckets.forEach((b, i) => { b.count = simData[i] || 40; });

        allUsers.forEach(user => {
            if (!user.last_login) return;
            const loginDate = new Date(user.last_login);
            const bucket = buckets.find(b =>
                b.date.getFullYear() === loginDate.getFullYear() &&
                b.date.getMonth() === loginDate.getMonth() &&
                b.date.getDate() === loginDate.getDate()
            );
            if (bucket) bucket.count += 1;
        });

        const maxCount = Math.max(1, ...buckets.map(b => b.count));
        chartEl.innerHTML = '';
        labelsEl.innerHTML = '';

        buckets.forEach((b, i) => {
            const pct = Math.round((b.count / maxCount) * 100);
            const col = document.createElement('div');
            col.className = 'lfreq-bar-col';
            const fill = document.createElement('div');
            fill.className = 'lfreq-bar-fill';
            fill.dataset.val = b.count;
            fill.style.height = '0%';
            fill.title = `${b.label}: ${b.count} logins`;
            col.appendChild(fill);
            chartEl.appendChild(col);

            const lbl = document.createElement('div');
            lbl.className = 'lfreq-day-label';
            lbl.textContent = i % 2 === 0 ? b.label : '';
            labelsEl.appendChild(lbl);

            setTimeout(() => { fill.style.height = pct + '%'; fill.style.transition = 'height 0.5s ease'; }, 50 + i * 30);
        });
    }

    /* =========================================================
       USER DETAIL MODAL
       ========================================================= */
    function openUserDetail(user) {
        const body = $('user-detail-body');
        if (!body) return;
        const regDate   = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—';
        const lastLogin = formatLastLogin(user.last_login);
        const loginFull = user.last_login ? new Date(user.last_login).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' }) : 'Never';

        body.innerHTML = `
            <div class="udetail-top">
                <div class="udetail-avatar" style="background:${avatarColor(user.id)};">${initials(user.name)}</div>
                <div>
                    <div class="udetail-name">${esc(user.name || '—')}</div>
                    <div class="udetail-email">${esc(user.email || '—')}</div>
                    <div style="margin-top:8px;">
                        <span class="role-badge role-${user.role || 'customer'}">
                            <i class="fas ${user.role === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i>
                            ${(user.role || 'customer').charAt(0).toUpperCase() + (user.role || 'customer').slice(1)}
                        </span>
                    </div>
                </div>
            </div>
            <div class="udetail-stats-grid">
                <div class="udetail-stat"><div class="udetail-stat-val">${user.login_count || 0}</div><div class="udetail-stat-label">Total Logins</div></div>
                <div class="udetail-stat"><div class="udetail-stat-val" style="font-size:16px;">${lastLogin}</div><div class="udetail-stat-label">Last Login</div></div>
                <div class="udetail-stat"><div class="udetail-stat-val" style="font-size:16px;">${regDate}</div><div class="udetail-stat-label">Registered</div></div>
            </div>
            <table class="udetail-table">
                <tr><td>User ID</td><td>#${user.id}</td></tr>
                <tr><td>Name</td><td>${esc(user.name || '—')}</td></tr>
                <tr><td>Email</td><td>${esc(user.email || '—')}</td></tr>
                <tr><td>Phone</td><td>${esc(user.phone || '—')}</td></tr>
                <tr><td>Role</td><td>${esc(user.role || 'customer')}</td></tr>
                <tr><td>Registered</td><td>${regDate}</td></tr>
                <tr><td>Last Login</td><td>${loginFull}</td></tr>
                <tr><td>Login Count</td><td>${user.login_count || 0} times</td></tr>
            </table>`;
        const modal = $('modal-user-detail');
        if (modal) modal.classList.add('open');
    }

    /* =========================================================
       DELETE USER
       ========================================================= */
    function openDelModal(id, name) {
        deleteTargetId = id;
        deleteTargetName = name;
        const nameEl = $('del-user-name');
        if (nameEl) nameEl.textContent = name;
        const modal = $('modal-del-user');
        if (modal) modal.classList.add('open');
    }

    function closeDelModal() {
        const modal = $('modal-del-user');
        if (modal) modal.classList.remove('open');
        deleteTargetId = null;
        deleteTargetName = '';
    }

    async function confirmDeleteUser() {
        if (!deleteTargetId) return;
        const btn = $('btn-confirm-del-user');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…'; }

        try {
            const token = localStorage.getItem('admin_token') || '';
            await fetch(`${API_BASE}/users/${deleteTargetId}`, { method: 'DELETE', headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        } catch (_) {}

        allUsers = allUsers.filter(u => String(u.id) !== String(deleteTargetId));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));
        try {
            let localUsers = JSON.parse(localStorage.getItem('scene_users_local')) || [];
            localUsers = localUsers.filter(u => String(u.id) !== String(deleteTargetId));
            localStorage.setItem('scene_users_local', JSON.stringify(localUsers));
        } catch(_) {}

        closeDelModal();
        applyFilters();
        updateKpis();
        renderLoginChart();
        toast(`User "${deleteTargetName}" deleted.`, 'success');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-times"></i> Delete'; }
    }

    /* =========================================================
       EXPORT CSV
       ========================================================= */
    function exportCsv() {
        const rows = [['ID','Name','Email','Phone','Role','Registered','Last Login','Login Count']];
        filteredUsers.forEach(u => {
            rows.push([u.id, u.name||'', u.email||'', u.phone||'', u.role||'customer',
                u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
                u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
                u.login_count || 0]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type:'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scene-users-${new Date().toISOString().substring(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('CSV exported!', 'success');
    }

    /* =========================================================
       UI HELPERS
       ========================================================= */
    function showLoading(on) {
        const loading = $('users-loading');
        const wrap = $('users-table-wrap');
        const empty = $('users-empty');
        if (loading) loading.style.display = on ? 'flex' : 'none';
        if (wrap) wrap.style.display = on ? 'none' : 'block';
        if (empty) empty.style.display = 'none';
    }

    function toast(msg, type = 'info') {
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
        const cont = $('toast-container');
        if (cont) cont.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all 0.35s ease'; setTimeout(() => t.remove(), 400); }, 3200);
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function debounce(fn, delay) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    }

})();
