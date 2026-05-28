/**
 * experience.js — Enhanced Experience Pages
 * Scroll animations, animated number counters, parallax, video handling
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initCounters();
    initVideoPlayback();
    initNavbarTransparency();
});

/* ============================================
   SCROLL-TRIGGERED ANIMATIONS
   ============================================ */
function initScrollAnimations() {
    const rows = document.querySelectorAll('.feature-row');
    if (!rows.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger animation for multiple cards
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 150);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px'
    });

    rows.forEach(row => observer.observe(row));
}

/* ============================================
   ANIMATED NUMBER COUNTERS
   ============================================ */
function initCounters() {
    const statItems = document.querySelectorAll('.stat-item');
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    if (!statNumbers.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Make all stat items visible with stagger
                statItems.forEach((item, i) => {
                    setTimeout(() => {
                        item.classList.add('visible');
                    }, i * 120);
                });

                // Animate all counters
                statNumbers.forEach(el => animateCounter(el));
                observer.disconnect();
            }
        });
    }, { threshold: 0.4 });

    // Observe the stats bar container
    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) observer.observe(statsBar);
}

function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 2200;
    const isFloat = !Number.isInteger(target);
    let start = null;

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        // easeOutQuart for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = eased * target;

        if (isFloat) {
            const decimals = (target.toString().split('.')[1] || '').length;
            el.textContent = current.toFixed(progress >= 1 ? decimals : 1) + suffix;
        } else if (target >= 1000) {
            el.textContent = Math.floor(current).toLocaleString() + suffix;
        } else {
            el.textContent = Math.floor(current) + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            // Final value
            if (isFloat) {
                const decimals = (target.toString().split('.')[1] || '').length;
                el.textContent = target.toFixed(decimals) + suffix;
            } else if (target >= 1000) {
                el.textContent = target.toLocaleString() + suffix;
            } else {
                el.textContent = target + suffix;
            }
        }
    }

    requestAnimationFrame(step);
}

/* ============================================
   VIDEO PLAYBACK
   ============================================ */
function initVideoPlayback() {
    const video = document.querySelector('.experience-hero video');
    if (!video) return;

    // Ensure autoplay works
    const tryPlay = () => {
        video.muted = true;
        video.play().catch(() => {
            // If autoplay still blocked, try on user interaction
            document.addEventListener('click', () => {
                video.play();
            }, { once: true });
        });
    };

    if (video.readyState >= 2) {
        tryPlay();
    } else {
        video.addEventListener('loadeddata', tryPlay, { once: true });
    }
}

/* ============================================
   NAVBAR TRANSPARENCY
   Starts transparent over hero, becomes solid on scroll
   ============================================ */
function initNavbarTransparency() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    // Force transparent start
    navbar.style.background = 'transparent';
    navbar.style.borderBottom = 'none';
    navbar.style.transition = 'background 0.4s ease, border-bottom 0.4s ease, box-shadow 0.4s ease';
    navbar.style.position = 'fixed';
    navbar.style.top = '0';
    navbar.style.left = '0';
    navbar.style.right = '0';
    navbar.style.zIndex = '1000';

    function updateNavbar() {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(10,10,10,0.97)';
            navbar.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
            navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'transparent';
            navbar.style.borderBottom = 'none';
            navbar.style.boxShadow = 'none';
        }
    }

    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();
}
