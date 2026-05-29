/**
 * experience.js — Enhanced Experience Pages
 * Scroll animations, number counters, parallax, video handling
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initCounters();
    initParallax();
    initVideoPlayback();
    initNavbarTransparency();
});

// IntersectionObserver for scroll-triggered animations on .feature-row
function initScrollAnimations() {
    const rows = document.querySelectorAll('.feature-row');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    rows.forEach(row => observer.observe(row));
}

// Animated number counters for stats
function initCounters() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => observer.observe(el));
}

function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const isFloat = target % 1 !== 0;
    let start = null;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
        const current = eased * target;
        
        if (isFloat) {
            el.textContent = current.toFixed(current >= target ? (target.toString().split('.')[1]?.length || 0) : 1) + suffix;
        } else if (target >= 1000) {
            el.textContent = Math.floor(current).toLocaleString() + suffix;
        } else {
            el.textContent = Math.floor(current) + suffix;
        }
        
        if (progress < 1) requestAnimationFrame(step);
        else {
            if (isFloat) el.textContent = target + suffix;
            else if (target >= 1000) el.textContent = target.toLocaleString() + suffix;
            else el.textContent = target + suffix;
        }
    }
    requestAnimationFrame(step);
}

// Parallax on feature images
function initParallax() {
    const images = document.querySelectorAll('.feature-image img');
    window.addEventListener('scroll', () => {
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            const viewH = window.innerHeight;
            if (rect.top < viewH && rect.bottom > 0) {
                const progress = (viewH - rect.top) / (viewH + rect.height);
                const translate = (progress - 0.5) * 35;
                img.style.transform = `translateY(${translate}px)`;
            }
        });
    }, { passive: true });
}

// Ensure video autoplay
function initVideoPlayback() {
    const video = document.querySelector('.experience-hero video');
    if (video) {
        video.play().catch(() => {
            // Autoplay blocked, add click-to-play fallback
            video.muted = true;
            video.play();
        });
    }
}

// Navbar starts transparent, becomes solid on scroll
function initNavbarTransparency() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    // Start transparent
    navbar.style.background = 'transparent';
    navbar.style.borderBottom = 'none';
    navbar.style.transition = 'background 0.4s ease, border-bottom 0.4s ease, box-shadow 0.4s ease';
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            navbar.style.background = 'rgba(10,10,10,0.95)';
            navbar.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
            navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'transparent';
            navbar.style.borderBottom = 'none';
            navbar.style.boxShadow = 'none';
        }
    }, { passive: true });
}
