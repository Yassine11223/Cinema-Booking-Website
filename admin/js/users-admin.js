/**
 * Admin users.
 * Source of truth: MongoDB backend API only.
 */
(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = (id) => document.getElementById(id);

    let users = [];
    let filteredUsers = [];
    let currentRole = 'all';
    let currentSort = 'created_desc';
    let deleteTargetId = null;

    function esc(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function token() {
        return localStorage.getItem('admin_token') || localStorage.getItem('authToken') || '';
    }

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
                ...(options.headers || {}),
            },
        });
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
        return response.json();
    }

    function initials(name) {
        return (name || '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    }

    function avatarColor(id) {
        const colors = ['#b71c1c', '#4a148c', '#0d47a1', '#006064', '#1b5e20', '#e65100'];
        const text = String(id || '');
        const total = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return colors[total % colors.length];
    }

    async function loadUsers() {
        showLoading(true);
        try {
            users = await api('/users');
        } catch (error) {
            users = [];
            toast(`Unable to load backend users: ${error.message}`, 'error');
        }
        showLoading(false);
        applyFilters();
        updateKpis();
        renderLoginChart();
    }

    function updateKpis() {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const activeThisWeek = users.filter((user) => user.last_login && Date.now() - new Date(user.last_login).getTime() <= 7 * 86400000).length;
        const newThisMonth = users.filter((user) => {
            if (!user.created_at) return false;
            const date = new Date(user.created_at);
            return date.getMonth() === month && date.getFullYear() === year;
        }).length;
        const admins = users.filter((user) => user.role === 'admin' || user.role === 'superadmin').length;
        setText('kpi-total', users.length);
        setText('kpi-active', activeThisWeek);
        setText('kpi-new', newThisMonth);
        setText('kpi-admins', admins);
    }

    function applyFilters() {
        const search = ($('user-search')?.value || '').toLowerCase().trim();
        currentSort = $('sort-users')?.value || currentSort;
        filteredUsers = users.filter((user) => {
            if (currentRole !== 'all' && user.role !== currentRole) return false;
            if (search && !`${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(search)) return false;
            return true;
        });
        filteredUsers.sort((a, b) => {
            if (currentSort === 'created_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            if (currentSort === 'logins_desc') return Number(b.login_count || 0) - Number(a.login_count || 0);
            if (currentSort === 'last_login_desc') return new Date(b.last_login || 0) - new Date(a.last_login || 0);
            if (currentSort === 'name_asc') return (a.name || '').localeCompare(b.name || '');
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
        const badge = $('users-count-badge');
        if (badge) badge.textContent = `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'}`;
        renderTable();
    }

    function renderTable() {
        const tbody = $('users-tbody');
        const wrap = $('users-table-wrap');
        const empty = $('users-empty');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!filteredUsers.length) {
            if (wrap) wrap.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (wrap) wrap.style.display = 'block';
        filteredUsers.forEach((user) => {
            const id = user.id || user._id;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div class="user-cell"><div class="user-avatar" style="background:${avatarColor(id)};">${initials(user.name)}</div><div><div class="user-name">${esc(user.name || '-')}</div><div class="user-id">#${esc(id)}</div></div></div></td>
                <td style="color:var(--text-secondary);font-size:13px;">${esc(user.email || '-')}</td>
                <td style="color:var(--text-muted);font-size:12.5px;">${esc(user.phone || '-')}</td>
                <td><span class="role-badge role-${esc(user.role || 'customer')}">${esc(user.role || 'customer')}</span></td>
                <td style="font-size:12.5px;color:var(--text-muted);">${formatDate(user.created_at)}</td>
                <td><span class="last-login-cell">${formatLastLogin(user.last_login)}</span></td>
                <td style="text-align:center;">${Number(user.login_count || 0).toLocaleString()}</td>
                <td><div class="activity-bar-wrap"><div class="activity-bar-bg"><div class="activity-bar-fill" style="width:${Math.min(100, Number(user.login_count || 0) * 10)}%;"></div></div><span class="activity-count">${Number(user.login_count || 0)}</span></div></td>
                <td style="text-align:center;"><div style="display:flex;gap:6px;justify-content:center;"><button class="tbl-action-btn tbl-view" data-view="${esc(id)}" title="View profile"><i class="fas fa-eye"></i></button><button class="tbl-action-btn tbl-danger" data-delete="${esc(id)}" data-name="${esc(user.name)}" title="Delete user"><i class="fas fa-user-times"></i></button></div></td>`;
            tbody.appendChild(row);
        });
    }

    function renderLoginChart() {
        const chart = $('lfreq-chart');
        const labels = $('lfreq-labels');
        if (!chart || !labels) return;
        chart.innerHTML = '';
        labels.innerHTML = '';
        const days = [];
        for (let i = 13; i >= 0; i -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            days.push({ key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), count: 0 });
        }
        users.forEach((user) => {
            if (!user.last_login) return;
            const key = new Date(user.last_login).toISOString().slice(0, 10);
            const bucket = days.find((day) => day.key === key);
            if (bucket) bucket.count += 1;
        });
        const max = Math.max(1, ...days.map((day) => day.count));
        days.forEach((day, index) => {
            const col = document.createElement('div');
            col.className = 'lfreq-bar-col';
            col.innerHTML = `<div class="lfreq-bar-fill" style="height:${Math.round((day.count / max) * 100)}%;" title="${esc(day.label)}: ${day.count} logins"></div>`;
            chart.appendChild(col);
            const label = document.createElement('div');
            label.className = 'lfreq-day-label';
            label.textContent = index % 2 === 0 ? day.label : '';
            labels.appendChild(label);
        });
    }

    function openUserDetail(user) {
        const body = $('user-detail-body');
        if (!body) return;
        body.innerHTML = `
            <div class="udetail-top"><div class="udetail-avatar" style="background:${avatarColor(user.id || user._id)};">${initials(user.name)}</div><div><div class="udetail-name">${esc(user.name || '-')}</div><div class="udetail-email">${esc(user.email || '-')}</div></div></div>
            <table class="udetail-table">
                <tr><td>User ID</td><td>#${esc(user.id || user._id)}</td></tr>
                <tr><td>Name</td><td>${esc(user.name || '-')}</td></tr>
                <tr><td>Email</td><td>${esc(user.email || '-')}</td></tr>
                <tr><td>Phone</td><td>${esc(user.phone || '-')}</td></tr>
                <tr><td>Role</td><td>${esc(user.role || 'customer')}</td></tr>
                <tr><td>Registered</td><td>${formatDate(user.created_at)}</td></tr>
                <tr><td>Last Login</td><td>${formatLastLogin(user.last_login)}</td></tr>
                <tr><td>Login Count</td><td>${Number(user.login_count || 0)}</td></tr>
            </table>`;
        $('modal-user-detail')?.classList.add('open');
    }

    function openDeleteModal(id, name) {
        deleteTargetId = id;
        setText('del-user-name', name || 'this user');
        $('modal-del-user')?.classList.add('open');
    }

    function closeDeleteModal() {
        $('modal-del-user')?.classList.remove('open');
        deleteTargetId = null;
    }

    async function confirmDeleteUser() {
        if (!deleteTargetId) return;
        try {
            await api(`/users/${encodeURIComponent(deleteTargetId)}`, { method: 'DELETE' });
            closeDeleteModal();
            await loadUsers();
            toast('User deleted from MongoDB.', 'success');
        } catch (error) {
            toast(`Delete failed: ${error.message}`, 'error');
        }
    }

    function exportCsv() {
        const rows = [['ID', 'Name', 'Email', 'Phone', 'Role', 'Registered', 'Last Login', 'Login Count']];
        filteredUsers.forEach((user) => rows.push([user.id || user._id, user.name || '', user.email || '', user.phone || '', user.role || '', user.created_at || '', user.last_login || '', user.login_count || 0]));
        const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thehall-users-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function bind() {
        $('btn-refresh-users')?.addEventListener('click', loadUsers);
        $('user-search')?.addEventListener('input', applyFilters);
        $('sort-users')?.addEventListener('change', applyFilters);
        document.querySelectorAll('[data-role]').forEach((btn) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-role]').forEach((item) => item.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentRole = btn.dataset.role;
                applyFilters();
            });
        });
        $('users-tbody')?.addEventListener('click', (event) => {
            const viewId = event.target.closest('[data-view]')?.dataset.view;
            const deleteId = event.target.closest('[data-delete]')?.dataset.delete;
            if (viewId) openUserDetail(users.find((user) => String(user.id || user._id) === String(viewId)));
            if (deleteId) openDeleteModal(deleteId, event.target.closest('[data-delete]')?.dataset.name);
        });
        $('modal-del-user-close')?.addEventListener('click', closeDeleteModal);
        $('del-user-cancel')?.addEventListener('click', closeDeleteModal);
        $('btn-confirm-del-user')?.addEventListener('click', confirmDeleteUser);
        $('modal-detail-close')?.addEventListener('click', () => $('modal-user-detail')?.classList.remove('open'));
        $('btn-export-csv')?.addEventListener('click', exportCsv);
    }

    function showLoading(on) {
        const loading = $('users-loading');
        const wrap = $('users-table-wrap');
        const empty = $('users-empty');
        if (loading) loading.style.display = on ? 'flex' : 'none';
        if (wrap) wrap.style.display = on ? 'none' : 'block';
        if (empty) empty.style.display = 'none';
    }

    function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
    function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }
    function formatLastLogin(value) { return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'; }

    function toast(message, type = 'info') {
        const cont = $('toast-container');
        if (!cont) return;
        const item = document.createElement('div');
        item.className = `toast toast-${type}`;
        item.textContent = message;
        cont.appendChild(item);
        setTimeout(() => item.remove(), 3200);
    }

    async function init() {
        bind();
        await loadUsers();
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
