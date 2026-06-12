/**
 * Super Admin admin-account management.
 * Real backend data only.
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';

    let adminUsers = [];
    let deleteTargetId = null;
    let deleteTargetName = '';

    const $ = id => document.getElementById(id);

    function token() {
        return localStorage.getItem('adminToken') || '';
    }

    function currentUser() {
        const raw = localStorage.getItem('adminUser');
        if (!raw) return null;
        try {
            const user = JSON.parse(raw);
            return { ...user, role: user.role === 'superadmin' ? 'super_admin' : user.role };
        } catch (_) {
            return null;
        }
    }

    function isSuperAdmin() {
        return currentUser()?.role === 'super_admin';
    }

    function requestHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token()}`,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function init() {
        if (!isSuperAdmin()) {
            window.location.href = 'index.html';
            return;
        }
        setDate();
        bindEvents();
        await loadAdmins();
    }

    function setDate() {
        const el = $('today-date-text');
        if (el) {
            el.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
        }
    }

    function bindEvents() {
        $('btn-open-add-admin')?.addEventListener('click', openAddModal);
        $('modal-add-admin-close')?.addEventListener('click', closeAddModal);
        $('modal-add-admin')?.addEventListener('click', e => { if (e.target === $('modal-add-admin')) closeAddModal(); });
        $('add-admin-form')?.addEventListener('submit', handleCreateAdmin);

        $('modal-del-admin-close')?.addEventListener('click', closeDelModal);
        $('del-admin-cancel')?.addEventListener('click', closeDelModal);
        $('modal-del-admin')?.addEventListener('click', e => { if (e.target === $('modal-del-admin')) closeDelModal(); });
        $('btn-confirm-del-admin')?.addEventListener('click', confirmDeleteAdmin);

        $('modal-admin-detail-close')?.addEventListener('click', () => $('modal-admin-detail')?.classList.remove('open'));
        $('modal-admin-detail')?.addEventListener('click', e => {
            if (e.target === $('modal-admin-detail')) $('modal-admin-detail')?.classList.remove('open');
        });
    }

    async function loadAdmins() {
        showLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admins`, { headers: requestHeaders() });
            const data = await res.json().catch(() => []);
            if (!res.ok) throw new Error(data.message || `API error ${res.status}`);
            adminUsers = data.map(user => ({ ...user, role: user.role === 'superadmin' ? 'super_admin' : user.role }));
        } catch (err) {
            toast(err.message || 'Could not load admins from MongoDB.', 'error');
            adminUsers = [];
        }
        showLoading(false);
        renderAdminCards();
        updateKpis();
    }

    function updateKpis() {
        setText('kpi-total-admins', adminUsers.filter(u => u.role === 'admin').length);
        setText('kpi-superadmins', adminUsers.filter(u => u.role === 'super_admin').length);
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setText('kpi-active-admins', adminUsers.filter(u => u.last_login && new Date(u.last_login).getTime() > oneWeekAgo).length);
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = Number(value || 0).toLocaleString();
    }

    function renderAdminCards() {
        const grid = $('admins-grid');
        const empty = $('admins-empty');
        const badge = $('admins-count-badge');
        if (!grid) return;

        grid.innerHTML = '';
        if (badge) badge.textContent = `${adminUsers.length} admin${adminUsers.length === 1 ? '' : 's'}`;

        if (adminUsers.length === 0) {
            grid.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }

        if (empty) empty.style.display = 'none';
        grid.style.display = 'grid';

        const me = currentUser();
        const sorted = [...adminUsers].sort((a, b) => {
            if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
            if (a.role !== 'super_admin' && b.role === 'super_admin') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        sorted.forEach(admin => {
            const isSelf = String(admin.id) === String(me?.id);
            const isSuper = admin.role === 'super_admin';
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.innerHTML = `
                <div class="admin-card-top">
                    <div class="admin-card-avatar">${initials(admin.name)}</div>
                    <div class="admin-card-info">
                        <div class="admin-card-name">${esc(admin.name || 'Unknown')}</div>
                        <div class="admin-card-email">${esc(admin.email || '')}</div>
                        <div class="admin-card-role-badge ${isSuper ? 'role-superadmin' : 'role-admin'}">
                            <i class="fas ${isSuper ? 'fa-crown' : 'fa-shield-alt'}"></i> ${isSuper ? 'Super Admin' : 'Admin'}
                        </div>
                    </div>
                </div>
                <div class="admin-card-stats">
                    <div class="admin-card-stat"><span class="admin-card-stat-label">Registered</span><span class="admin-card-stat-value">${formatDate(admin.created_at)}</span></div>
                    <div class="admin-card-stat"><span class="admin-card-stat-label">Last Login</span><span class="admin-card-stat-value">${formatLastLogin(admin.last_login)}</span></div>
                    <div class="admin-card-stat"><span class="admin-card-stat-label">Login Count</span><span class="admin-card-stat-value">${admin.login_count || 0}</span></div>
                    <div class="admin-card-stat"><span class="admin-card-stat-label">Status</span><span class="admin-card-stat-value">${esc(admin.status || 'active')}</span></div>
                </div>
                <div class="admin-card-actions">
                    <button class="admin-card-btn admin-card-btn-view" data-action="view"><i class="fas fa-eye"></i> View</button>
                    ${isSelf || isSuper ? '' : '<button class="admin-card-btn admin-card-btn-delete" data-action="delete"><i class="fas fa-user-times"></i> Delete</button>'}
                </div>
            `;
            card.querySelector('[data-action="view"]')?.addEventListener('click', () => openAdminDetail(admin));
            card.querySelector('[data-action="delete"]')?.addEventListener('click', () => openDelModal(admin.id, admin.name));
            grid.appendChild(card);
        });
    }

    function openAddModal() {
        $('modal-add-admin')?.classList.add('open');
        $('add-admin-form')?.reset();
    }

    function closeAddModal() {
        $('modal-add-admin')?.classList.remove('open');
    }

    async function handleCreateAdmin(e) {
        e.preventDefault();
        const name = $('new-admin-name')?.value.trim();
        const email = $('new-admin-email')?.value.trim();
        const password = $('new-admin-password')?.value;
        const phone = $('new-admin-phone')?.value.trim();

        if (!name || !email || !password || password.length < 6) {
            toast('Name, valid email, and a 6+ character password are required.', 'error');
            return;
        }

        const btn = $('btn-submit-admin');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREATING...';
        }

        try {
            const res = await fetch(`${API_BASE}/admins`, {
                method: 'POST',
                headers: requestHeaders(),
                body: JSON.stringify({ name, email, password, phone }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Failed to create admin.');

            toast(`Admin "${name}" created successfully.`, 'success');
            closeAddModal();
            await loadAdmins();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> CREATE ADMIN';
            }
        }
    }

    function openDelModal(id, name) {
        deleteTargetId = id;
        deleteTargetName = name || 'this admin';
        const nameEl = $('del-admin-name');
        if (nameEl) nameEl.textContent = deleteTargetName;
        $('modal-del-admin')?.classList.add('open');
    }

    function closeDelModal() {
        $('modal-del-admin')?.classList.remove('open');
        deleteTargetId = null;
        deleteTargetName = '';
    }

    async function confirmDeleteAdmin() {
        if (!deleteTargetId) return;
        const btn = $('btn-confirm-del-admin');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        }

        try {
            const res = await fetch(`${API_BASE}/admins/${deleteTargetId}`, {
                method: 'DELETE',
                headers: requestHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Failed to delete admin.');

            toast(`Admin "${deleteTargetName}" deleted.`, 'success');
            closeDelModal();
            await loadAdmins();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-times"></i> Delete';
            }
        }
    }

    function openAdminDetail(admin) {
        const body = $('admin-detail-body');
        if (!body) return;
        const isSuper = admin.role === 'super_admin';
        body.innerHTML = `
            <div class="udetail-top">
                <div class="udetail-avatar">${initials(admin.name)}</div>
                <div>
                    <div class="udetail-name">${esc(admin.name || 'Unknown')}</div>
                    <div class="udetail-email">${esc(admin.email || '')}</div>
                    <div style="margin-top:8px;"><span class="role-badge ${isSuper ? 'role-superadmin' : 'role-admin'}"><i class="fas ${isSuper ? 'fa-crown' : 'fa-shield-alt'}"></i> ${isSuper ? 'Super Admin' : 'Admin'}</span></div>
                </div>
            </div>
            <table class="udetail-table">
                <tr><td>User ID</td><td>${esc(admin.id)}</td></tr>
                <tr><td>Name</td><td>${esc(admin.name || '')}</td></tr>
                <tr><td>Email</td><td>${esc(admin.email || '')}</td></tr>
                <tr><td>Phone</td><td>${esc(admin.phone || '')}</td></tr>
                <tr><td>Role</td><td>${isSuper ? 'Super Admin' : 'Admin'}</td></tr>
                <tr><td>Status</td><td>${esc(admin.status || 'active')}</td></tr>
                <tr><td>Registered</td><td>${formatDate(admin.created_at)}</td></tr>
                <tr><td>Last Login</td><td>${admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}</td></tr>
                <tr><td>Login Count</td><td>${admin.login_count || 0}</td></tr>
            </table>
        `;
        $('modal-admin-detail')?.classList.add('open');
    }

    function showLoading(on) {
        const loading = $('admins-loading');
        const grid = $('admins-grid');
        const empty = $('admins-empty');
        if (loading) loading.style.display = on ? 'flex' : 'none';
        if (grid) grid.style.display = on ? 'none' : 'grid';
        if (empty) empty.style.display = 'none';
    }

    function toast(msg, type = 'info') {
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${esc(msg)}`;
        $('toast-container')?.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    function initials(name) {
        return (name || '?').split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
    }

    function formatLastLogin(value) {
        if (!value) return 'Never';
        const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
        if (days <= 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return formatDate(value);
    }

    function esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
})();

