/**
 * staff.js — Staff Dashboard Logic
 * Fetches dashboard data from backend or uses local offline mock data
 */

const API_BASE = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    checkStaffAccess();
    initStaffDashboard();
    
    document.getElementById('staffLogoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('scene_user');
        localStorage.removeItem('userData');
        localStorage.removeItem('admin_token');
        window.location.href = '../login.html';
    });
});

function checkStaffAccess() {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('scene_user') || localStorage.getItem('userData');
    
    if (!token || !userStr) {
        window.location.href = '../login.html?redirect=pages/staff.html';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'staff' && user.role !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
        
        // Update header
        const nameEl = document.getElementById('staffName');
        const avatarEl = document.getElementById('staffAvatar');
        if (nameEl && user.name) nameEl.textContent = user.name;
        if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();
        
    } catch (e) {
        window.location.href = '../login.html';
    }
}

async function initStaffDashboard() {
    const token = localStorage.getItem('authToken');
    const loadingEl = document.getElementById('loadingState');
    const dataEl = document.getElementById('dashboardData');
    
    try {
        const res = await fetch(`${API_BASE}/users/staff/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            renderDashboard(data);
        } else {
            throw new Error('Failed to fetch from backend');
        }
    } catch (err) {
        console.log('Backend unavailable, loading offline mock data for staff dashboard');
        renderDashboard(getOfflineMockData());
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (dataEl) dataEl.style.display = 'block';
    }
}

function renderDashboard(data) {
    // 1. Update Stats
    document.getElementById('statTotalBookings').textContent = data.todayStats?.total_bookings || 0;
    document.getElementById('statConfirmed').textContent = data.todayStats?.confirmed || 0;
    document.getElementById('statPending').textContent = data.todayStats?.pending || 0;
    
    // 2. Render Shows
    const showsContainer = document.getElementById('showsContainer');
    if (showsContainer) {
        if (!data.todayShows || data.todayShows.length === 0) {
            showsContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-video-slash"></i>
                    <p>No screenings scheduled for today.</p>
                </div>
            `;
        } else {
            showsContainer.innerHTML = data.todayShows.map(show => `
                <div class="show-card">
                    <h4 class="show-card-title">${show.movie_title || 'Unknown Movie'}</h4>
                    <div class="show-card-details">
                        <span><i class="fas fa-clock"></i> ${formatTime(show.show_time)}</span>
                        <span><i class="fas fa-desktop"></i> ${show.theater_name || 'Standard Screen'} (${(show.screen_type || 'standard').toUpperCase()})</span>
                        <span><i class="fas fa-chair"></i> Available Seats: ${show.available_seats || 0}</span>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // 3. Render Bookings
    const tableBody = document.getElementById('bookingsTableBody');
    if (tableBody) {
        if (!data.recentBookings || data.recentBookings.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem 1rem; color: #666;">
                        No recent bookings found.
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = data.recentBookings.map(booking => `
                <tr>
                    <td><strong style="color: #fff;">#${String(booking.id).padStart(5, '0')}</strong></td>
                    <td>
                        <div style="font-weight: 500;">${booking.customer_name || 'Walk-in'}</div>
                        <div style="font-size: 0.8rem; color: #888;">${booking.customer_email || ''}</div>
                    </td>
                    <td>${booking.movie_title || '-'}</td>
                    <td>${formatTime(booking.show_time)}</td>
                    <td style="font-family: monospace; font-size: 0.95rem;">${booking.seats || '-'}</td>
                    <td>${getStatusBadge(booking.status)}</td>
                </tr>
            `).join('');
        }
    }
}

function formatTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dateStr;
    }
}

function getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    if (s === 'confirmed') return '<span class="status-badge confirmed"><i class="fas fa-check"></i> Confirmed</span>';
    if (s === 'cancelled') return '<span class="status-badge cancelled"><i class="fas fa-times"></i> Cancelled</span>';
    return '<span class="status-badge pending"><i class="fas fa-clock"></i> Pending</span>';
}

// Mock data for offline presentation
function getOfflineMockData() {
    const now = new Date();
    
    return {
        todayStats: {
            total_bookings: 42,
            confirmed: 38,
            pending: 4
        },
        todayShows: [
            { id: 1, movie_title: "Dune: Part Two", show_time: new Date(now.setHours(14, 30)).toISOString(), theater_name: "IMAX Screen 1", screen_type: "imax", available_seats: 45 },
            { id: 2, movie_title: "Kung Fu Panda 4", show_time: new Date(now.setHours(16, 0)).toISOString(), theater_name: "Screen 3", screen_type: "standard", available_seats: 120 },
            { id: 3, movie_title: "Civil War", show_time: new Date(now.setHours(19, 15)).toISOString(), theater_name: "Dolby Screen", screen_type: "dolby", available_seats: 12 },
            { id: 4, movie_title: "Godzilla x Kong", show_time: new Date(now.setHours(21, 45)).toISOString(), theater_name: "IMAX Screen 1", screen_type: "imax", available_seats: 8 }
        ],
        recentBookings: [
            { id: 1042, customer_name: "Ahmed Hassan", customer_email: "ahmed@example.com", movie_title: "Dune: Part Two", show_time: new Date(now.setHours(14, 30)).toISOString(), seats: "H12, H13", status: "confirmed" },
            { id: 1043, customer_name: "Sara Mohamed", customer_email: "sara@example.com", movie_title: "Kung Fu Panda 4", show_time: new Date(now.setHours(16, 0)).toISOString(), seats: "F04, F05, F06", status: "confirmed" },
            { id: 1044, customer_name: "Omar Ali", customer_email: "omar@example.com", movie_title: "Civil War", show_time: new Date(now.setHours(19, 15)).toISOString(), seats: "J22", status: "pending" },
            { id: 1045, customer_name: "Nour Ibrahim", customer_email: "nour@example.com", movie_title: "Dune: Part Two", show_time: new Date(now.setHours(14, 30)).toISOString(), seats: "G10, G11", status: "cancelled" },
            { id: 1046, customer_name: "Walk-in Customer", customer_email: "-", movie_title: "Civil War", show_time: new Date(now.setHours(19, 15)).toISOString(), seats: "E01, E02", status: "confirmed" }
        ]
    };
}
