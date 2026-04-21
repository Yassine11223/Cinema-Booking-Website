/**
 * users-admin.js
 * Real user management — loads registered accounts from API.
 * Provides delete, role management, and activity data.
 * Shows "no users" state when backend is offline instead of fake data.
 */

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */
    const API_BASE = 'http://localhost:5000/api';

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
    let backendOnline    = false;

    /* =========================================================
       AVATAR COLOURS (deterministic by user id)
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
       AUTH
       ========================================================= */
    function getToken() {
        return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
    }

    function apiHeaders() {
        const token = getToken();
        const h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    }

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
        $('btn-refresh-users').addEventListener('click', async () => {
            const btn = $('btn-refresh-users');
            btn.classList.add('spinning');
            await loadUsers();
            btn.classList.remove('spinning');
        });

        $('user-search').addEventListener('input', debounce(applyFilters, 300));
        $('sort-users') .addEventListener('change', () => { currentSort = $('sort-users').value; applyFilters(); });

        document.querySelectorAll('[data-role]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentRole = btn.dataset.role;
                applyFilters();
            });
        });

        // Delete modal
        $('modal-del-user-close').addEventListener('click', closeDelModal);
        $('del-user-cancel')     .addEventListener('click', closeDelModal);
        $('modal-del-user')      .addEventListener('click', e => { if (e.target === $('modal-del-user')) closeDelModal(); });
        $('btn-confirm-del-user').addEventListener('click', confirmDeleteUser);

        // Detail modal
        $('modal-detail-close').addEventListener('click', () => $('modal-user-detail').classList.remove('open'));
        $('modal-user-detail') .addEventListener('click', e => { if (e.target === $('modal-user-detail')) $('modal-user-detail').classList.remove('open'); });

        // Export CSV
        $('btn-export-csv').addEventListener('click', exportCsv);

        // Escape closes modals
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeDelModal();
                $('modal-user-detail').classList.remove('open');
            }
        });
    }

    /* =========================================================
       LOAD USERS
       ========================================================= */
    async function loadUsers() {
        showLoading(true);
        try {
            const res = await fetch(`${API_BASE}/users`, {
                headers: apiHeaders()
            });
            if (!res.ok) throw new Error('API error ' + res.status);
            allUsers = await res.json();
            backendOnline = true;
        } catch (err) {
            console.warn('Backend offline or error:', err.message);
            backendOnline = false;
            allUsers = [];
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
        currentSearch = ($('user-search').value || '').toLowerCase().trim();

        filteredUsers = allUsers.filter(u => {
            const roleOk   = currentRole === 'all' || u.role === currentRole;
            const searchOk = !currentSearch ||
                (u.name  || '').toLowerCase().includes(currentSearch) ||
                (u.email || '').toLowerCase().includes(currentSearch) ||
                (u.phone || '').toLowerCase().includes(currentSearch);
            return roleOk && searchOk;
        });

        // Sort
        filteredUsers.sort((a, b) => {
            switch (currentSort) {
                case 'created_desc':    return new Date(b.created_at) - new Date(a.created_at);
                case 'created_asc':     return new Date(a.created_at) - new Date(b.created_at);
                case 'logins_desc':     return (b.login_count || 0) - (a.login_count || 0);
                case 'last_login_desc': return new Date(b.last_login || 0) - new Date(a.last_login || 0);
                case 'name_asc':        return (a.name || '').localeCompare(b.name || '');
                default:                return 0;
            }
        });

        $('users-count-badge').textContent = `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`;
        renderTable();
    }

    /* =========================================================
       KPI CARDS
       ========================================================= */
    function updateKpis() {
        const now      = new Date();
        const weekAgo  = new Date(now - 7 * 86400000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const total    = allUsers.length;
        const active   = allUsers.filter(u => u.last_login && new Date(u.last_login) >= weekAgo).length;
        const newMonth = allUsers.filter(u => u.created_at && new Date(u.created_at) >= monthStart).length;
        const admins   = allUsers.filter(u => u.role === 'admin').length;

        animateCount($('kpi-total'),   total);
        animateCount($('kpi-active'),  active);
        animateCount($('kpi-new'),     newMonth);
        animateCount($('kpi-admins'),  admins);
    }

    function animateCount(el, target) {
        if (!el) return;
        let cur = 0;
        const step = Math.max(1, Math.ceil(target / 30));
        const timer = setInterval(() => {
            cur = Math.min(cur + step, target);
            el.textContent = cur;
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

        tbody.innerHTML = '';

        if (filteredUsers.length === 0) {
            wrap .style.display = 'none';
            empty.style.display = 'flex';
            if (!backendOnline && allUsers.length === 0) {
                empty.innerHTML = '<i class="fas fa-plug"></i><p>Backend offline</p><span style="color:var(--text-muted);font-size:12px;">Start the server to see registered users</span>';
            } else {
                empty.innerHTML = '<i class="fas fa-user-slash"></i><p>No users found</p>';
            }
            return;
        }

        empty.style.display = 'none';
        wrap .style.display = 'block';

        // Max login count for bar scaling
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
                    <span class="role-badge role-${user.role || 'customer'}" style="cursor:pointer;" title="Click to toggle role">
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
                        <button class="tbl-action-btn tbl-view"   data-id="${user.id}" title="View profile"><i class="fas fa-eye"></i></button>
                        <button class="tbl-action-btn tbl-role"   data-id="${user.id}" title="Toggle role"><i class="fas fa-user-cog"></i></button>
                        <button class="tbl-action-btn tbl-danger" data-id="${user.id}" data-name="${esc(user.name)}" title="Delete user"><i class="fas fa-user-times"></i></button>
                    </div>
                </td>`;

            tr.querySelector('.tbl-view')  .addEventListener('click', () => openUserDetail(user));
            tr.querySelector('.tbl-role')  .addEventListener('click', () => toggleUserRole(user));
            tr.querySelector('.tbl-danger').addEventListener('click', () => openDelModal(user.id, user.name));

            // Also allow clicking role badge to toggle
            tr.querySelector('.role-badge').addEventListener('click', () => toggleUserRole(user));

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
       LOGIN FREQUENCY CHART (14 days)
       ========================================================= */
    function renderLoginChart() {
        const chartEl  = $('lfreq-chart');
        const labelsEl = $('lfreq-labels');
        if (!chartEl) return;

        if (allUsers.length === 0) {
            chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--text-muted);font-size:13px;">No login data available</div>';
            if (labelsEl) labelsEl.innerHTML = '';
            return;
        }

        // Build day buckets based on last_login dates
        const days = 14;
        const buckets = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            buckets.push({ date: d, label: d.toLocaleDateString('en-US', { weekday:'short' }), count: 0 });
        }

        // Count users who logged in on each day
        allUsers.forEach(user => {
            if (!user.last_login) return;
            const loginDate = new Date(user.last_login);
            const bucket = buckets.find(b => sameDay(b.date, loginDate));
            if (bucket) {
                bucket.count += 1;
            }
        });

        const maxCount = Math.max(1, ...buckets.map(b => b.count));

        chartEl .innerHTML = '';
        if (labelsEl) labelsEl.innerHTML = '';

        buckets.forEach((b, i) => {
            const pct = Math.round((b.count / maxCount) * 100);
            const col = document.createElement('div');
            col.className = 'lfreq-bar-col';

            const fill = document.createElement('div');
            fill.className   = 'lfreq-bar-fill';
            fill.dataset.val = b.count;
            fill.style.height = '0%';
            fill.title = `${b.label}: ${b.count} login${b.count !== 1 ? 's' : ''}`;

            col.appendChild(fill);
            chartEl.appendChild(col);

            // Label
            if (labelsEl) {
                const lbl = document.createElement('div');
                lbl.className   = 'lfreq-day-label';
                lbl.textContent = i % 2 === 0 ? b.label : '';
                labelsEl.appendChild(lbl);
            }

            // Animate bar
            setTimeout(() => { fill.style.height = pct + '%'; fill.style.transition = 'height 0.5s ease'; }, 50 + i * 30);
        });
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
               a.getMonth()   === b.getMonth()    &&
               a.getDate()    === b.getDate();
    }

    /* =========================================================
       USER DETAIL MODAL
       ========================================================= */
    function openUserDetail(user) {
        const body      = $('user-detail-body');
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
                <div class="udetail-stat">
                    <div class="udetail-stat-val">${user.login_count || 0}</div>
                    <div class="udetail-stat-label">Total Logins</div>
                </div>
                <div class="udetail-stat">
                    <div class="udetail-stat-val" style="font-size:16px;">${lastLogin}</div>
                    <div class="udetail-stat-label">Last Login</div>
                </div>
                <div class="udetail-stat">
                    <div class="udetail-stat-val" style="font-size:16px;">${regDate}</div>
                    <div class="udetail-stat-label">Registered</div>
                </div>
            </div>

            <table class="udetail-table">
                <tr><td>User ID</td>      <td>#${user.id}</td></tr>
                <tr><td>Name</td>         <td>${esc(user.name  || '—')}</td></tr>
                <tr><td>Email</td>        <td>${esc(user.email || '—')}</td></tr>
                <tr><td>Phone</td>        <td>${esc(user.phone || '—')}</td></tr>
                <tr><td>Role</td>         <td>${esc(user.role  || 'customer')}</td></tr>
                <tr><td>Registered</td>   <td>${regDate}</td></tr>
                <tr><td>Last Login</td>   <td>${loginFull}</td></tr>
                <tr><td>Login Count</td>  <td>${user.login_count || 0} times</td></tr>
            </table>`;

        $('modal-user-detail').classList.add('open');
    }

    /* =========================================================
       TOGGLE USER ROLE
       ========================================================= */
    async function toggleUserRole(user) {
        const newRole = user.role === 'admin' ? 'customer' : 'admin';
        const confirmMsg = `Change ${user.name}'s role from "${user.role}" to "${newRole}"?`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${API_BASE}/users/${user.id}/role`, {
                method: 'PUT',
                headers: apiHeaders(),
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Role update failed: ' + res.status);

            // Update local state
            user.role = newRole;
            applyFilters();
            updateKpis();
            toast(`${user.name} is now ${newRole}.`, 'success');
        } catch (err) {
            console.error('Role update error:', err);
            toast('Failed to update role. Backend may be offline.', 'error');
        }
    }

    /* =========================================================
       DELETE USER
       ========================================================= */
    function openDelModal(id, name) {
        deleteTargetId   = id;
        deleteTargetName = name;
        $('del-user-name').textContent = name;
        $('modal-del-user').classList.add('open');
    }

    function closeDelModal() {
        $('modal-del-user').classList.remove('open');
        deleteTargetId   = null;
        deleteTargetName = '';
    }

    async function confirmDeleteUser() {
        if (!deleteTargetId) return;

        const btn = $('btn-confirm-del-user');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…';

        try {
            const res = await fetch(`${API_BASE}/users/${deleteTargetId}`, {
                method: 'DELETE',
                headers: apiHeaders()
            });
            if (!res.ok) throw new Error('Delete failed: ' + res.status);

            allUsers = allUsers.filter(u => String(u.id) !== String(deleteTargetId));
            closeDelModal();
            applyFilters();
            updateKpis();
            renderLoginChart();
            toast(`User "${deleteTargetName}" deleted.`, 'success');
        } catch (err) {
            console.error('Delete error:', err);
            closeDelModal();
            toast('Failed to delete user. Backend may be offline.', 'error');
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-times"></i> Delete';
    }

    /* =========================================================
       EXPORT CSV
       ========================================================= */
    function exportCsv() {
        if (filteredUsers.length === 0) {
            toast('No users to export.', 'info');
            return;
        }
        const rows = [['ID','Name','Email','Phone','Role','Registered','Last Login','Login Count']];
        filteredUsers.forEach(u => {
            rows.push([
                u.id,
                u.name  || '',
                u.email || '',
                u.phone || '',
                u.role  || 'customer',
                u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
                u.last_login ? new Date(u.last_login).toLocaleString()     : 'Never',
                u.login_count || 0
            ]);
        });

        const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type:'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `scene-users-${new Date().toISOString().substring(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('CSV exported!', 'success');
    }

    /* =========================================================
       UI HELPERS
       ========================================================= */
    function showLoading(on) {
        $('users-loading')    .style.display = on ? 'flex'  : 'none';
        $('users-table-wrap') .style.display = on ? 'none'  : 'block';
        $('users-empty')      .style.display = 'none';
    }

    function toast(msg, type = 'info') {
        const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
        $('toast-container').appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(8px)';
            t.style.transition = 'all 0.35s ease';
            setTimeout(() => t.remove(), 400);
        }, 3200);
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function debounce(fn, delay) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    }

})();
