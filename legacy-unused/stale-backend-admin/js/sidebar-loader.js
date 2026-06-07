/**
 * sidebar-loader.js
 * Loads the sidebar component and highlights the active nav link
 * based on the current page filename.
 * Also handles the logout button and superadmin-only visibility.
 */

(function () {
    'use strict';

    // ============================================
    // AUTH GUARD — Redirect to login if not admin/superadmin
    // ============================================
    (function enforceAdminAuth() {
        const token = localStorage.getItem('admin_token');
        const userData = localStorage.getItem('scene_user') || localStorage.getItem('userData');

        let isAdmin = false;
        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                if (user && (user.role === 'admin' || user.role === 'superadmin')) isAdmin = true;
            } catch (_) { }
        }

        if (!isAdmin) {
            // Not authenticated as admin/superadmin — redirect to login page
            window.location.href = 'login.html';
            return;
        }
    })();

    // Map page filenames → nav link IDs
    const PAGE_NAV_MAP = {
        'index.html': 'nav-dashboard',
        'movies-manage.html': 'nav-movies',
        'shows-manage.html': 'nav-shows',
        'theaters-manage.html': 'nav-theaters',
        'bookings-list.html': 'nav-bookings',
        'users-list.html': 'nav-users',
        'admins-manage.html': 'nav-admins',
    };

    /**
     * Fetch the sidebar HTML and inject it into #sidebar-container,
     * then activate the correct nav link.
     */
    async function loadSidebar() {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        try {
            const response = await fetch('components/sidebar.html');
            if (!response.ok) throw new Error('Sidebar fetch failed');
            const html = await response.text();
            container.innerHTML = html;

            activateCurrentLink();
            initMobileToggle();
            initLogout();
            applySuperadminVisibility();
            updateSidebarUserInfo();

        } catch (err) {
            console.warn('[Sidebar] Could not load sidebar component:', err);
        }
    }

    /**
     * Add .active class to the nav link matching the current page.
     */
    function activateCurrentLink() {
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        const activeLinkId = PAGE_NAV_MAP[currentFile];

        if (activeLinkId) {
            const link = document.getElementById(activeLinkId);
            if (link) link.classList.add('active');
        }
    }

    /**
     * Show/hide elements with data-superadmin-only based on user role.
     * Also enforce page-level access: if current page is admins-manage.html
     * and user is not superadmin, redirect to dashboard.
     */
    function applySuperadminVisibility() {
        let isSuperadmin = false;
        try {
            const userData = localStorage.getItem('scene_user') || localStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                isSuperadmin = user && user.role === 'superadmin';
            }
        } catch (_) { }

        // Show/hide superadmin-only nav items
        document.querySelectorAll('[data-superadmin-only]').forEach(el => {
            el.style.display = isSuperadmin ? '' : 'none';
        });

        // Page-level access control: redirect non-superadmin from superadmin pages
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        if (currentFile === 'admins-manage.html' && !isSuperadmin) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Update sidebar user info (name and role badge) from stored user data.
     */
    function updateSidebarUserInfo() {
        try {
            const userData = localStorage.getItem('scene_user') || localStorage.getItem('userData');
            if (!userData) return;
            const user = JSON.parse(userData);
            if (!user) return;

            // Update admin name
            const nameEl = document.getElementById('sidebar-admin-name');
            if (nameEl && user.name) nameEl.textContent = user.name;

            // Update role label
            const roleEl = document.getElementById('sidebar-admin-role');
            if (roleEl) {
                if (user.role === 'superadmin') {
                    roleEl.textContent = 'Super Admin';
                    roleEl.style.color = '#e040fb';
                } else {
                    roleEl.textContent = 'Admin';
                }
            }

            // Update brand sub label
            const brandSub = document.getElementById('sidebar-role-label');
            if (brandSub) {
                brandSub.textContent = user.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN';
            }

            // Update avatar icon
            const avatarEl = document.getElementById('sidebar-avatar-icon');
            if (avatarEl && user.role === 'superadmin') {
                avatarEl.innerHTML = '<i class="fas fa-crown"></i>';
                avatarEl.style.background = 'linear-gradient(135deg, rgba(224,64,251,0.2), rgba(156,39,176,0.1))';
                avatarEl.style.borderColor = 'rgba(224,64,251,0.3)';
            }
        } catch (_) { }
    }

    /**
     * Mobile hamburger toggle.
     */
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

        // Close on nav link click (mobile UX)
        sidebar.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });
    }

    /**
     * Logout button handler.
     * Clears all admin auth tokens and redirects to the admin login page.
     */
    function initLogout() {
        const logoutBtn = document.getElementById('nav-logout');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Clear all auth data set during login
            localStorage.removeItem('admin_token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('scene_user');
            localStorage.removeItem('userData');

            // Redirect to admin login page
            window.location.href = 'login.html';
        });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }

})();
