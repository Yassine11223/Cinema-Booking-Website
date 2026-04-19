/**
 * sidebar-loader.js
 * Loads the sidebar component and highlights the active nav link
 * based on the current page filename.
 */

(function () {
    'use strict';

    // Map page filenames → nav link IDs
    const PAGE_NAV_MAP = {
        'index.html':            'nav-dashboard',
        'movies-manage.html':    'nav-movies',
        'shows-manage.html':     'nav-shows',
        'theaters-manage.html':  'nav-theaters',
        'bookings-list.html':    'nav-bookings',
        'users-list.html':       'nav-users',
        'reports.html':          'nav-reports',
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
     * Mobile hamburger toggle.
     */
    function initMobileToggle() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar   = document.getElementById('sidebar');
        const backdrop  = document.getElementById('sidebar-backdrop');

        if (!toggleBtn || !sidebar) return;

        function openSidebar() {
            sidebar.classList.add('open');
            backdrop.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
            document.body.style.overflow = '';
        }

        toggleBtn.addEventListener('click', openSidebar);
        backdrop.addEventListener('click', closeSidebar);

        // Close on nav link click (mobile UX)
        sidebar.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }

})();
