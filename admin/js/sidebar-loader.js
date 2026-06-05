/**
 * Loads the admin sidebar, guards admin pages, and applies role visibility.
 */

(function () {
    'use strict';

    function normalizeRole(role) {
        return role === 'superadmin' ? 'super_admin' : role;
    }

    function getAdminToken() {
        return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
    }

    function getAdminUser() {
        const raw = localStorage.getItem('adminUser') || localStorage.getItem('thehall_user');
        if (!raw) return null;
        try {
            const user = JSON.parse(raw);
            return { ...user, role: normalizeRole(user.role) };
        } catch (_) {
            return null;
        }
    }

    function isAdmin(user) {
        return user?.role === 'admin' || user?.role === 'super_admin';
    }

    (function enforceAdminAuth() {
        const token = getAdminToken();
        const user = getAdminUser();

        if (!token || !isAdmin(user)) {
            window.location.href = 'login.html';
        }
    })();

    const PAGE_NAV_MAP = {
        'index.html': 'nav-dashboard',
        'movies-manage.html': 'nav-movies',
        'shows-manage.html': 'nav-shows',
        'theaters-manage.html': 'nav-theaters',
        'bookings-list.html': 'nav-bookings',
        'users-list.html': 'nav-users',
        'admins-manage.html': 'nav-admins',
    };

    async function loadSidebar() {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        try {
            const response = await fetch('components/sidebar.html');
            if (!response.ok) throw new Error('Sidebar fetch failed');
            container.innerHTML = await response.text();

            activateCurrentLink();
            initMobileToggle();
            initLogout();
            applySuperadminVisibility();
            updateSidebarUserInfo();
        } catch (err) {
            console.warn('[Sidebar] Could not load sidebar component:', err);
        }
    }

    function activateCurrentLink() {
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        const link = document.getElementById(PAGE_NAV_MAP[currentFile]);
        if (link) link.classList.add('active');
    }

    function applySuperadminVisibility() {
        const user = getAdminUser();
        const isSuperadmin = user?.role === 'super_admin';

        document.querySelectorAll('[data-superadmin-only]').forEach(el => {
            el.style.display = isSuperadmin ? '' : 'none';
        });

        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        if (currentFile === 'admins-manage.html' && !isSuperadmin) {
            window.location.href = 'index.html';
        }
    }

    function updateSidebarUserInfo() {
        const user = getAdminUser();
        if (!user) return;

        const nameEl = document.getElementById('sidebar-admin-name');
        if (nameEl && user.name) nameEl.textContent = user.name;

        const isSuperadmin = user.role === 'super_admin';

        const roleEl = document.getElementById('sidebar-admin-role');
        if (roleEl) {
            roleEl.textContent = isSuperadmin ? 'Super Admin' : 'Admin';
            roleEl.style.color = isSuperadmin ? '#f5c451' : '';
        }

        const brandSub = document.getElementById('sidebar-role-label');
        if (brandSub) brandSub.textContent = isSuperadmin ? 'SUPER ADMIN' : 'ADMIN';

        const avatarEl = document.getElementById('sidebar-avatar-icon');
        if (avatarEl && isSuperadmin) {
            avatarEl.innerHTML = '<i class="fas fa-crown"></i>';
        }
    }

    function initMobileToggle() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (!toggleBtn || !sidebar) return;

        function openSidebar() {
            sidebar.classList.add('open');
            if (backdrop) backdrop.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('open');
            document.body.style.overflow = '';
        }

        toggleBtn.addEventListener('click', openSidebar);
        if (backdrop) backdrop.addEventListener('click', closeSidebar);
        sidebar.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });
    }

    function initLogout() {
        const logoutBtn = document.getElementById('nav-logout');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            [
                'adminToken', 'adminUser', 'isAdminLoggedIn',
                'admin_token', 'authToken', 'thehall_user',
            ].forEach(key => localStorage.removeItem(key));
            window.location.href = 'login.html';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }
})();
