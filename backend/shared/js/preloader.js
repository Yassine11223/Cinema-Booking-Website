/**
 * preloader.js — Vision X Cinemas
 * Self-injecting cinematic preloader.
 * Include this script in <head> with defer NOT set.
 * It injects the preloader HTML immediately and fades it out
 * once the page has fully loaded (with a minimum display time).
 */
(function () {
    'use strict';

    const MIN_DISPLAY_MS = 800; // Minimum time the preloader is visible
    const startTime = Date.now();

    // --- Inject preloader HTML immediately ---
    const preloaderHTML = `
        <div class="preloader" id="vx-preloader">
            <!-- Film strips -->
            <div class="preloader-strip preloader-strip--left"></div>
            <div class="preloader-strip preloader-strip--right"></div>

            <!-- Ambient particles -->
            <div class="preloader-particles">
                <div class="preloader-dot"></div>
                <div class="preloader-dot"></div>
                <div class="preloader-dot"></div>
                <div class="preloader-dot"></div>
                <div class="preloader-dot"></div>
                <div class="preloader-dot"></div>
            </div>

            <!-- Center content -->
            <div class="preloader-content">
                <!-- Pulse rings -->
                <div class="preloader-ring"></div>
                <div class="preloader-ring"></div>
                <div class="preloader-ring"></div>

                <!-- Logo -->
                <div class="preloader-logo">
                    <span class="preloader-logo-red">VISION X</span>
                    <span class="preloader-logo-white">CINEMAS</span>
                </div>

                <!-- Loading bar -->
                <div class="preloader-bar-track">
                    <div class="preloader-bar-fill"></div>
                </div>

                <!-- Loading text -->
                <div class="preloader-text">Loading Experience</div>
            </div>
        </div>
    `;

    // Write directly into the document as early as possible
    document.write(preloaderHTML);

    // --- Fade out handler ---
    function hidePreloader() {
        const preloader = document.getElementById('vx-preloader');
        if (!preloader) return;

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

        setTimeout(function () {
            preloader.classList.add('fade-out');

            // Remove from DOM after transition completes
            preloader.addEventListener('transitionend', function handler() {
                preloader.removeEventListener('transitionend', handler);
                if (preloader.parentNode) {
                    preloader.parentNode.removeChild(preloader);
                }
            });
        }, remaining);
    }

    // Listen for full page load (all images, styles, scripts ready)
    window.addEventListener('load', hidePreloader);

    // Safety fallback — force hide after 5 seconds regardless
    setTimeout(function () {
        const preloader = document.getElementById('vx-preloader');
        if (preloader && !preloader.classList.contains('fade-out')) {
            hidePreloader();
        }
    }, 5000);

})();
