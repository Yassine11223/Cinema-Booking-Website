/**
 * preloader.js — THE HALL Cinemas
 * Animated curtain opening and zoom-through cinematic intro.
 */
(function () {
    'use strict';

    // Only show the preloader once per session
    if (sessionStorage.getItem('th_preloader_shown')) {
        return;
    }
    sessionStorage.setItem('th_preloader_shown', 'true');

    // Remove old preloader if it exists (for hot reloading)
    const existing = document.getElementById('th-preloader');
    if (existing) existing.remove();

    const preloaderHTML = `
        <div class="th-preloader" id="th-preloader">
            <div class="th-zoom-wrapper" id="th-zoom-wrapper">
                
                <div class="th-arch-container">
                    <svg viewBox="0 0 200 300" class="th-svg">
                        <defs>
                            <clipPath id="arch-clip">
                                <path d="M 50 300 L 150 300 L 150 120 A 50 50 0 0 0 50 120 Z" />
                            </clipPath>
                        </defs>
                        
                        <!-- Massive black mask with an arch hole -->
                        <path class="th-black-mask" d="M -5000 -5000 L 5000 -5000 L 5000 5000 L -5000 5000 Z M 50 300 L 150 300 L 150 120 A 50 50 0 0 0 50 120 Z" fill="#000000" fill-rule="evenodd" />
                        
                        <!-- Arch Lines (Red) -->
                        <path d="M 50 300 L 50 120 A 50 50 0 0 1 150 120 L 150 300" fill="none" stroke="#e60000" stroke-width="3.5" />
                        <path d="M 40 300 L 40 120 A 60 60 0 0 1 160 120 L 160 300" fill="none" stroke="#e60000" stroke-width="3.5" />
                        <path d="M 30 300 L 30 120 A 70 70 0 0 1 170 120 L 170 300" fill="none" stroke="#e60000" stroke-width="3.5" />
                        <rect x="25" y="295" width="30" height="5" fill="#e60000" />
                        <rect x="145" y="295" width="30" height="5" fill="#e60000" />
                        
                        <!-- Curtains inside the arch -->
                        <g class="th-curtains-group" clip-path="url(#arch-clip)">
                            <!-- Left Curtain -->
                            <g>
                                <!-- Base shape -->
                                <path fill="#e60000" d="M 50 120 A 50 50 0 0 1 100 70 C 100 140 100 200 100 300 L 50 300 Z">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 50 120 A 50 50 0 0 1 70 80 C 65 140 50 200 65 300 L 50 300 Z" />
                                </path>
                                <!-- Fold 1 -->
                                <path fill="none" stroke="#900000" stroke-width="2" d="M 60 110 C 60 170 60 230 60 300">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 55 110 C 55 150 50 200 55 300" />
                                </path>
                                <!-- Fold 2 -->
                                <path fill="none" stroke="#900000" stroke-width="2" d="M 75 95 C 75 160 75 230 75 300">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 60 95 C 58 145 52 200 60 300" />
                                </path>
                                <!-- Fold 3 -->
                                <path fill="none" stroke="#900000" stroke-width="2" d="M 90 80 C 90 150 90 230 90 300">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 65 80 C 60 140 54 200 63 300" />
                                </path>
                            </g>
                            
                            <!-- Right Curtain -->
                            <g>
                                <!-- Base shape -->
                                <path fill="#e60000" d="M 150 120 A 50 50 0 0 0 100 70 C 100 140 100 200 100 300 L 150 300 Z">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 150 120 A 50 50 0 0 0 130 80 C 135 140 150 200 135 300 L 150 300 Z" />
                                </path>
                                <!-- Fold 1 -->
                                <path fill="none" stroke="#900000" stroke-width="2" d="M 140 110 C 140 170 140 230 140 300">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 145 110 C 145 150 150 200 145 300" />
                                </path>
                                <!-- Fold 2 -->
                                <path fill="none" stroke="#900000" stroke-width="2" d="M 125 95 C 125 160 125 230 125 300">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 140 95 C 142 145 148 200 140 300" />
                                </path>
                                <!-- Fold 3 -->
                                <path fill="none" stroke="#900000" stroke-width="2" d="M 110 80 C 110 150 110 230 110 300">
                                    <animate attributeName="d" begin="0.6s" dur="1.2s" calcMode="spline" keyTimes="0; 1" keySplines="0.4 0 0.2 1" fill="freeze"
                                             to="M 135 80 C 140 140 146 200 137 300" />
                                </path>
                            </g>
                        </g>
                    </svg>
                </div>
                
                <div class="th-logo-container" id="th-logo">
                    <div class="th-logo-subtitle">
                        <span class="th-line"></span> THE <span class="th-line"></span>
                    </div>
                    <div class="th-logo-title">HALL</div>
                </div>
                
            </div>
        </div>
    `;

    document.write(preloaderHTML);

    function triggerAnimation() {
        const preloader = document.getElementById('th-preloader');
        const wrapper = document.getElementById('th-zoom-wrapper');
        const logo = document.getElementById('th-logo');
        
        if (!preloader) return;

        // Note: The curtain opening animation is handled by SVG SMIL <animate> tags which begin at 0.6s and end at 1.8s.

        // 1. Zoom through the arch (starts right after curtains finish opening at 1.8s)
        setTimeout(() => {
            wrapper.classList.add('th-zoom-in');
            logo.classList.add('th-fade-out');
        }, 1800);

        // 2. Fade out and remove preloader
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
            }, 800);
        }, 2800);
    }

    // Wait for the window load event to ensure the background page is ready before zooming through
    let started = false;
    function start() {
        if(started) return;
        started = true;
        triggerAnimation();
    }
    
    if (document.readyState === 'complete') {
        start();
    } else {
        window.addEventListener('load', start);
        // Fallback start after 2 seconds
        setTimeout(start, 2000); 
    }

})();
