/**
 * Real MongoDB-backed user management.
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const $ = id => document.getElementById(id);

    let allUsers = [];
    let filteredUsers = [];
    let currentRole = 'all';
    let deleteTargetId = null;

    function token() {
        return localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    }

    function headers() {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` };
    }

    function normalizeRole(role) {
        return role === 'superadmin' ? 'super_admin' : role;
    }

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        bindEvents();
        loadUsers();
    }

    function bindEvents() {
        $('btn-refresh-users')?.addEventListener('click', loadUsers);
        $('user-search')?.addEventListener('input', applyFilters);
        $('sort-users')?.addEventListener('change', applyFilters);
        document.querySelectorAll('[data-role]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('ftab-active'));
                btn.classList.add('ftab-active');
                currentRole = btn.dataset.role === 'superadmin' ? 'super_admin' : btn.dataset.role;
                applyFilters();
            });
        });
        $('btn-export-csv')?.addEventListener('click', exportCsv);
        $('modal-del-user-close')?.addEventListener('click', closeDeleteModal);
        $('del-user-cancel')?.addEventListener('click', closeDeleteModal);
        $('btn-confirm-del-user')?.addEventListener('click', confirmDeleteUser);
        $('modal-user-detail-close')?.addEventListener('click', () => $('modal-user-detail')?.classList.remove('open'));
    }

    async function loadUsers() {
        showLoading(true);
        try {
            const res = await fetch(`${API_BASE}/users`, { headers: headers() });
            const data = await res.json().catch(() => []);
            if (!res.ok) throw new Error(data.message || `Users API failed (${res.status})`);
            allUsers = data.map(user => ({ ...user, role: normalizeRole(user.role) }));
        } catch (err) {
            allUsers = [];
            toast(err.message || 'Could not load users from MongoDB.', 'error');
        }
        showLoading(false);
        applyFilters();
        updateKpis();
    }

    function applyFilters() {
        const q = ($('user-search')?.value || '').toLowerCase();
        const sort = $('sort-users')?.value || 'newest';

        filteredUsers = allUsers.filter(user => {
            const roleOk = currentRole === 'all' || normalizeRole(user.role) === currentRole;
            const searchOk = !q || `${user.name || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase().includes(q);
            return roleOk && searchOk;
        });

        filteredUsers.sort((a, b) => {
            if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sort === 'logins') return Number(b.login_count || 0) - Number(a.login_count || 0);
            return new Date(b.created_at) - new Date(a.created_at);
        });

        renderUsers();
    }

    function updateKpis() {
        setText('kpi-total', allUsers.length);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        setText('kpi-new', allUsers.filter(u => u.created_at && new Date(u.created_at) >= monthStart).length);
        setText('kpi-admins', allUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length);
        const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const active = allUsers.filter(u => u.last_login && new Date(u.last_login).getTime() >= weekStart).length;
        setText('kpi-active', active);
    }

    function renderUsers() {
        const tbody = $('users-tbody');
        const wrap = $('users-table-wrap');
        const empty = $('users-empty');
        const badge = $('users-count-badge');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (badge) badge.textContent = `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'}`;

        if (!filteredUsers.length) {
            if (wrap) wrap.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (wrap) wrap.style.display = '';

        filteredUsers.forEach(user => {
            const role = normalizeRole(user.role || 'customer');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${esc(user.id)}</td>
                <td><strong>${esc(user.name || 'Unknown')}</strong></td>
                <td>${esc(user.email || '')}</td>
                <td>${esc(user.phone || '-')}</td>
                <td><span class="role-badge role-${esc(role)}"><i class="fas ${role === 'super_admin' ? 'fa-crown' : role === 'admin' ? 'fa-shield-alt' : 'fa-user'}"></i> ${roleLabel(role)}</span></td>
                <td>${formatDate(user.created_at)}</td>
                <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                <td>${Number(user.login_count || 0)}</td>
                <td>
                    <button class="table-action-btn" data-action="view" data-id="${user.id}" title="View"><i class="fas fa-eye"></i></button>
                    ${role === 'customer' ? `<button class="table-action-btn danger" data-action="delete" data-id="${user.id}" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            `;
            tr.querySelector('[data-action="view"]')?.addEventListener('click', () => openDetail(user));
            tr.querySelector('[data-action="delete"]')?.addEventListener('click', () => openDeleteModal(user));
            tbody.appendChild(tr);
        });
    }

    function openDetail(user) {
        const body = $('user-detail-body');
        if (!body) return;
        const role = normalizeRole(user.role || 'customer');
        body.innerHTML = `
            <table class="udetail-table">
                <tr><td>User ID</td><td>${esc(user.id)}</td></tr>
                <tr><td>Name</td><td>${esc(user.name || '')}</td></tr>
                <tr><td>Email</td><td>${esc(user.email || '')}</td></tr>
                <tr><td>Phone</td><td>${esc(user.phone || '')}</td></tr>
                <tr><td>Role</td><td>${roleLabel(role)}</td></tr>
                <tr><td>Status</td><td>${esc(user.status || 'active')}</td></tr>
                <tr><td>Created</td><td>${formatDate(user.created_at)}</td></tr>
                <tr><td>Last Login</td><td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td></tr>
                <tr><td>Login Count</td><td>${Number(user.login_count || 0)}</td></tr>
            </table>
        `;
        $('modal-user-detail')?.classList.add('open');
    }

    function openDeleteModal(user) {
        deleteTargetId = user.id;
        const nameEl = $('del-user-name');
        if (nameEl) nameEl.textContent = user.name || user.email || 'this user';
        $('modal-del-user')?.classList.add('open');
    }

    function closeDeleteModal() {
        deleteTargetId = null;
        $('modal-del-user')?.classList.remove('open');
    }

    async function confirmDeleteUser() {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`${API_BASE}/users/${deleteTargetId}`, { method: 'DELETE', headers: headers() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Failed to delete user.');
            toast('User deleted.', 'success');
            closeDeleteModal();
            await loadUsers();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    function exportCsv() {
        if (!filteredUsers.length) {
            toast('No users found to export.', 'error');
            return;
        }
        const rows = [
            ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Created', 'Last Login', 'Login Count'],
            ...filteredUsers.map(u => [u.id, u.name || '', u.email || '', u.phone || '', u.role || '', u.status || 'active', u.created_at || '', u.last_login || '', u.login_count || 0]),
        ];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function showLoading(on) {
        if ($('users-loading')) $('users-loading').style.display = on ? 'flex' : 'none';
        if ($('users-table-wrap')) $('users-table-wrap').style.display = on ? 'none' : '';
        if ($('users-empty')) $('users-empty').style.display = 'none';
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function roleLabel(role) {
        return role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1);
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    }

    function toast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.textContent = msg;
        $('toast-container')?.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    function esc(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
