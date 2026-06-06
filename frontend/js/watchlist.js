/**
 * watchlist.js — THE HALL CINEMAS
 * Manages user's movie watchlist with localStorage persistence.
 * Each user (by email) has their own separate watchlist.
 */
(function () {
    'use strict';

    // TMDB config (reuse same keys as movies.js)
    const WL_TMDB = {
        API_KEY: '8b17a4f6956553f204d913b742122c1e',
        BASE_URL: 'https://api.themoviedb.org/3',
        IMAGE_BASE: 'https://image.tmdb.org/t/p',
        POSTER_SIZE: '/w500',
    };

    const GENRE_MAP = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
        9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
        53: 'Thriller', 10752: 'War', 37: 'Western'
    };

    /* =========================================================
       STORAGE HELPERS
       ========================================================= */

    function getCurrentUserKey() {
        try {
            const userData = localStorage.getItem('userData');
            if (!userData) return null;
            const user = JSON.parse(userData);
            return 'vx_watchlist_' + (user.email || user.id || 'guest');
        } catch (e) {
            return null;
        }
    }

    function isLoggedIn() {
        const token = localStorage.getItem('userToken');
        const user = localStorage.getItem('userData');
        return !!(token && user);
    }

    function getWatchlist() {
        const key = getCurrentUserKey();
        if (!key) return [];
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveWatchlist(list) {
        const key = getCurrentUserKey();
        if (!key) return;
        localStorage.setItem(key, JSON.stringify(list));
    }

    /* =========================================================
       PUBLIC API (attached to window)
       ========================================================= */

    window.VXWatchlist = {
        /** Check if a movie ID is in the watchlist */
        isInWatchlist: function (movieId) {
            const list = getWatchlist();
            return list.some(function (item) {
                return String(item.id) === String(movieId);
            });
        },

        /** Add a movie to watchlist */
        add: function (movieData) {
            if (!isLoggedIn()) {
                VXWatchlist.showLoginPrompt();
                return false;
            }
            const list = getWatchlist();
            if (list.some(function (item) { return String(item.id) === String(movieData.id); })) {
                return false; // Already exists
            }
            list.push({
                id: movieData.id,
                title: movieData.title,
                poster_path: movieData.poster_path || null,
                genre_ids: movieData.genre_ids || (movieData.genres ? movieData.genres.map(function (g) { return g.id; }) : []),
                vote_average: movieData.vote_average || 0,
                release_date: movieData.release_date || '',
                added_at: new Date().toISOString()
            });
            saveWatchlist(list);
            VXWatchlist.showToast(movieData.title + ' added to watchlist');
            document.dispatchEvent(new CustomEvent('watchlist-changed', { detail: { movieId: movieData.id, action: 'add' } }));
            return true;
        },

        /** Remove a movie from watchlist */
        remove: function (movieId) {
            const list = getWatchlist();
            const filtered = list.filter(function (item) { return String(item.id) !== String(movieId); });
            if (filtered.length === list.length) return false;
            saveWatchlist(filtered);
            VXWatchlist.showToast('Removed from watchlist');
            document.dispatchEvent(new CustomEvent('watchlist-changed', { detail: { movieId: movieId, action: 'remove' } }));
            return true;
        },

        /** Toggle watchlist state */
        toggle: function (movieData) {
            if (VXWatchlist.isInWatchlist(movieData.id)) {
                VXWatchlist.remove(movieData.id);
                return false;
            } else {
                return VXWatchlist.add(movieData);
            }
        },

        /** Get full watchlist */
        getAll: function () {
            return getWatchlist();
        },

        /** Get watchlist count */
        count: function () {
            return getWatchlist().length;
        },

        /** Show toast notification */
        showToast: function (message) {
            // Remove existing toast
            var existing = document.getElementById('vx-wl-toast');
            if (existing) existing.remove();

            var toast = document.createElement('div');
            toast.id = 'vx-wl-toast';
            toast.className = 'vx-wl-toast';
            toast.innerHTML = '<i class="fas fa-heart"></i> ' + message;
            document.body.appendChild(toast);

            // Trigger animation
            requestAnimationFrame(function () {
                toast.classList.add('show');
            });

            setTimeout(function () {
                toast.classList.remove('show');
                setTimeout(function () { toast.remove(); }, 400);
            }, 2500);
        },

        /** Show login prompt */
        showLoginPrompt: function () {
            var existing = document.getElementById('vx-wl-toast');
            if (existing) existing.remove();

            var toast = document.createElement('div');
            toast.id = 'vx-wl-toast';
            toast.className = 'vx-wl-toast vx-wl-toast--login';
            toast.innerHTML = '<i class="fas fa-user-lock"></i> <span>Please <a href="login.html" style="color:#e53935;text-decoration:underline;">sign in</a> to use your watchlist</span>';
            document.body.appendChild(toast);

            requestAnimationFrame(function () {
                toast.classList.add('show');
            });

            setTimeout(function () {
                toast.classList.remove('show');
                setTimeout(function () { toast.remove(); }, 400);
            }, 3500);
        },

        /** Create a heart button element for a movie card */
        createHeartBtn: function (movieData) {
            var btn = document.createElement('button');
            btn.className = 'wl-heart-btn';
            btn.setAttribute('data-movie-id', movieData.id);
            btn.setAttribute('aria-label', 'Add to watchlist');
            btn.setAttribute('title', 'Add to watchlist');

            var inList = VXWatchlist.isInWatchlist(movieData.id);
            btn.innerHTML = '<i class="' + (inList ? 'fas' : 'far') + ' fa-heart"></i>';
            if (inList) btn.classList.add('active');

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var nowIn = VXWatchlist.toggle(movieData);
                btn.innerHTML = '<i class="' + (nowIn ? 'fas' : 'far') + ' fa-heart"></i>';
                btn.classList.toggle('active', nowIn);

                // Animate
                btn.classList.add('wl-heart-pop');
                setTimeout(function () { btn.classList.remove('wl-heart-pop'); }, 400);
            });

            return btn;
        },

        /** Update all heart buttons on the page to reflect current state */
        refreshHearts: function () {
            document.querySelectorAll('.wl-heart-btn').forEach(function (btn) {
                var movieId = btn.getAttribute('data-movie-id');
                var inList = VXWatchlist.isInWatchlist(movieId);
                btn.innerHTML = '<i class="' + (inList ? 'fas' : 'far') + ' fa-heart"></i>';
                btn.classList.toggle('active', inList);
            });
        }
    };

    /* =========================================================
       WATCHLIST PAGE RENDERER
       ========================================================= */

    document.addEventListener('DOMContentLoaded', function () {
        var watchlistGrid = document.getElementById('watchlist-grid');
        var watchlistEmpty = document.getElementById('watchlist-empty');
        var watchlistCount = document.getElementById('watchlist-count');

        if (!watchlistGrid) return; // Not on watchlist page

        renderWatchlistPage();

        // Listen for changes
        document.addEventListener('watchlist-changed', function () {
            renderWatchlistPage();
        });
    });

    function renderWatchlistPage() {
        var grid = document.getElementById('watchlist-grid');
        var emptyState = document.getElementById('watchlist-empty');
        var countEl = document.getElementById('watchlist-count');
        if (!grid) return;

        var list = getWatchlist();

        if (countEl) {
            countEl.textContent = list.length + ' movie' + (list.length !== 1 ? 's' : '');
        }

        if (list.length === 0) {
            grid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        grid.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = '';

        list.forEach(function (movie) {
            var poster = movie.poster_path
                ? WL_TMDB.IMAGE_BASE + WL_TMDB.POSTER_SIZE + movie.poster_path
                : 'https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster';

            var genres = (movie.genre_ids || []).map(function (id) { return GENRE_MAP[id] || ''; }).filter(Boolean).join(', ') || 'N/A';

            var rating = movie.vote_average ? parseFloat(movie.vote_average).toFixed(1) : 'N/A';

            var addedDate = movie.added_at
                ? new Date(movie.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';

            var card = document.createElement('div');
            card.className = 'wl-card';
            card.setAttribute('data-movie-id', movie.id);
            card.innerHTML =
                '<a href="movie-detail.html?id=' + movie.id + '" class="wl-card-link">' +
                    '<div class="wl-card-poster">' +
                        '<img src="' + poster + '" alt="' + escapeWlHtml(movie.title) + '" loading="lazy" onerror="this.src=\'https://placehold.co/300x450/1a1a1a/b71c1c?text=No+Poster\'">' +
                        '<div class="wl-card-overlay">' +
                            '<span class="wl-card-view-btn"><i class="fas fa-play"></i> VIEW DETAILS</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="wl-card-info">' +
                        '<h3 class="wl-card-title">' + escapeWlHtml(movie.title) + '</h3>' +
                        '<p class="wl-card-genre">' + escapeWlHtml(genres) + '</p>' +
                        '<div class="wl-card-meta">' +
                            '<span class="wl-card-rating"><i class="fas fa-star"></i> ' + rating + '</span>' +
                            (addedDate ? '<span class="wl-card-added">Added ' + addedDate + '</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</a>' +
                '<button class="wl-card-remove" data-remove-id="' + movie.id + '" title="Remove from watchlist">' +
                    '<i class="fas fa-times"></i>' +
                '</button>';

            // Remove button handler
            card.querySelector('.wl-card-remove').addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                card.classList.add('wl-card-removing');
                setTimeout(function () {
                    VXWatchlist.remove(movie.id);
                }, 350);
            });

            grid.appendChild(card);
        });
    }

    function escapeWlHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* =========================================================
       TOAST STYLES (injected once)
       ========================================================= */
    var toastStyle = document.createElement('style');
    toastStyle.textContent = [
        '.vx-wl-toast {',
        '  position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);',
        '  background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(12px);',
        '  border: 1px solid rgba(183, 28, 28, 0.3); border-radius: 12px;',
        '  padding: 14px 24px; font-family: "Oswald", sans-serif;',
        '  font-size: 14px; letter-spacing: 1px; color: #fff;',
        '  display: flex; align-items: center; gap: 10px;',
        '  box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(183,28,28,0.15);',
        '  opacity: 0; transition: all 0.4s cubic-bezier(0.16,1,0.3,1);',
        '  z-index: 99998; pointer-events: none;',
        '}',
        '.vx-wl-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }',
        '.vx-wl-toast i { color: #e53935; font-size: 16px; }',
        '.vx-wl-toast--login { border-color: rgba(255,255,255,0.1); }',
        '.vx-wl-toast--login i { color: #ff9800; }',
    ].join('\n');
    document.head.appendChild(toastStyle);

})();
