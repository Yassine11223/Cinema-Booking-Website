/**
 * Real MongoDB-backed theater management.
 */

(function () {
    'use strict';

    const API_BASE = 'https://cinema-booking-website-production.up.railway.app/api';
    const $ = id => document.getElementById(id);

    let theaters = [];
    let filtered = [];
    let editingId = null;

    function token() {
        return localStorage.getItem('adminToken') || '';
    }

    function headers() {
        return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
    }

    async function api(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: { ...headers(), ...(options.headers || {}) },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
        return data;
    }

    async function loadTheaters() {
        try {
            theaters = await api('/theaters');
        } catch (error) {
            theaters = [];
            toast(error.message || 'Could not load theaters from MongoDB.', 'error');
        }
        applyFilters();
        renderStats();
    }

    function renderStats() {
        setText('stat-total', theaters.length);
        setText('stat-active', theaters.filter(t => (t.status || 'active') === 'active').length);
        setText('stat-maintenance', theaters.filter(t => t.status === 'maintenance').length);
        setText('stat-capacity', theaters.reduce((sum, t) => sum + Number(t.capacity || 0), 0).toLocaleString());
    }

    function applyFilters() {
        const search = ($('filter-search')?.value || '').toLowerCase();
        const type = $('filter-type')?.value || '';
        const status = $('filter-status')?.value || '';
        const branch = $('filter-branch')?.value || '';
        const sort = $('filter-sort')?.value || '';

        filtered = theaters.filter(theater => {
            if (search && !`${theater.name || ''} ${theater.branch || ''}`.toLowerCase().includes(search)) return false;
            if (type && (theater.screen_type || theater.type) !== type) return false;
            if (status && (theater.status || 'active') !== status) return false;
            if (branch && theater.branch !== branch) return false;
            return true;
        });

        filtered.sort((a, b) => {
            if (sort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
            if (sort === 'capacity-desc') return Number(b.capacity || 0) - Number(a.capacity || 0);
            if (sort === 'capacity-asc') return Number(a.capacity || 0) - Number(b.capacity || 0);
            if (sort === 'updated-desc') return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
            if (sort === 'updated-asc') return new Date(a.updated_at || 0) - new Date(b.updated_at || 0);
            return (a.name || '').localeCompare(b.name || '');
        });

        renderTable();
    }

    function renderTable() {
        const tbody = $('theaters-tbody');
        const empty = $('empty-state');
        const table = $('table-container');
        if (!tbody) return;

        const count = $('filter-count');
        if (count) count.innerHTML = `Showing <span>${filtered.length}</span> of <span>${theaters.length}</span> theaters`;

        if (!filtered.length) {
            tbody.innerHTML = '';
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (table) table.style.display = '';
        if (empty) empty.style.display = 'none';

        tbody.innerHTML = filtered.map(theater => `
            <tr>
                <td><strong>${esc(theater.name || 'Untitled')}</strong><div class="muted">${esc(theater.notes || '')}</div></td>
                <td>${esc((theater.screen_type || 'standard').toUpperCase())}</td>
                <td>${esc(theater.branch || '-')}</td>
                <td>${Number(theater.rows || 0) || '-'}</td>
                <td>${Number(theater.seats_per_row || 0) || '-'}</td>
                <td>${Number(theater.capacity || 0).toLocaleString()}</td>
                <td><span class="status-badge status-${esc(theater.status || 'active')}">${esc(theater.status || 'active')}</span></td>
                <td>${formatDate(theater.updated_at || theater.created_at)}</td>
                <td>
                    <button class="table-action-btn" data-action="view" data-id="${theater.id}" title="View"><i class="fas fa-eye"></i></button>
                    <button class="table-action-btn" data-action="edit" data-id="${theater.id}" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="table-action-btn danger" data-action="delete" data-id="${theater.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action="view"]').forEach(btn => btn.addEventListener('click', () => openDetails(btn.dataset.id)));
        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', () => deleteTheater(btn.dataset.id)));
    }

    function openModal(id = null) {
        editingId = id;
        const theater = theaters.find(t => String(t.id) === String(id)) || {};
        setText('modal-title', editingId ? 'Edit Theater' : 'Add New Theater');
        setValue('form-name', theater.name || '');
        setValue('form-type', theater.screen_type || 'standard');
        setValue('form-branch', theater.branch || '');
        setValue('form-rows', theater.rows || '');
        setValue('form-seats-per-row', theater.seats_per_row || '');
        setValue('form-status', theater.status || 'active');
        setValue('form-notes', theater.notes || '');
        setText('btn-save', editingId ? 'Update Theater' : 'Create Theater');
        updateCapacityPreview();
        $('theater-modal-overlay')?.classList.add('active');
    }

    function closeModal() {
        editingId = null;
        $('theater-modal-overlay')?.classList.remove('active');
    }

    async function saveTheater() {
        const rows = Number($('form-rows')?.value || 0);
        const seatsPerRow = Number($('form-seats-per-row')?.value || 0);
        const payload = {
            name: $('form-name')?.value.trim(),
            screen_type: $('form-type')?.value || 'standard',
            branch: $('form-branch')?.value.trim() || '',
            rows,
            seats_per_row: seatsPerRow,
            capacity: rows && seatsPerRow ? rows * seatsPerRow : Number($('capacity-value')?.dataset.capacity || 0),
            status: $('form-status')?.value || 'active',
            notes: $('form-notes')?.value.trim() || '',
        };

        if (!payload.name || !payload.capacity || payload.capacity < 1) {
            toast('Theater name, rows, and seats per row are required.', 'error');
            return;
        }

        try {
            if (editingId) await api(`/theaters/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
            else await api('/theaters', { method: 'POST', body: JSON.stringify(payload) });
            toast(editingId ? 'Theater updated.' : 'Theater created.', 'success');
            closeModal();
            await loadTheaters();
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    async function deleteTheater(id) {
        if (!window.confirm('Delete this theater?')) return;
        try {
            await api(`/theaters/${id}`, { method: 'DELETE' });
            toast('Theater deleted.', 'success');
            await loadTheaters();
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    async function openDetails(id) {
        const theater = theaters.find(t => String(t.id) === String(id));
        if (!theater) return;
        const body = $('detail-body');
        if (!body) return;

        let seats = [];
        try {
            seats = await api(`/theaters/${id}/seats`);
        } catch (_) {
            seats = [];
        }

        body.innerHTML = `
            <div class="detail-section">
                <h3>${esc(theater.name || 'Theater')}</h3>
                <p><strong>Type:</strong> ${esc(theater.screen_type || 'standard')}</p>
                <p><strong>Branch:</strong> ${esc(theater.branch || '-')}</p>
                <p><strong>Capacity:</strong> ${Number(theater.capacity || 0).toLocaleString()}</p>
                <p><strong>Status:</strong> ${esc(theater.status || 'active')}</p>
                <p><strong>Notes:</strong> ${esc(theater.notes || '-')}</p>
            </div>
            <div class="detail-section">
                <h3>Seats</h3>
                ${seats.length ? `<p>${seats.map(seat => esc(`${seat.row_label}${seat.seat_number}`)).join(', ')}</p>` : '<p>No seats found</p>'}
            </div>
        `;
        $('detail-overlay')?.classList.add('active');
        $('detail-drawer')?.classList.add('active');
    }

    function closeDetails() {
        $('detail-overlay')?.classList.remove('active');
        $('detail-drawer')?.classList.remove('active');
    }

    function updateCapacityPreview() {
        const rows = Number($('form-rows')?.value || 0);
        const seats = Number($('form-seats-per-row')?.value || 0);
        const capacity = rows * seats;
        const value = $('capacity-value');
        if (value) {
            value.textContent = capacity ? capacity.toLocaleString() : '-';
            value.dataset.capacity = String(capacity || 0);
        }
        setText('capacity-formula', capacity ? `${rows} rows x ${seats} seats per row` : 'Enter rows and seats per row');
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function setValue(id, value) {
        const el = $(id);
        if (el) el.value = value;
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
    }

    function toast(message, type = 'info') {
        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${type}`;
        toastEl.textContent = message;
        $('toast-container')?.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 3500);
    }

    function esc(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('btn-add-theater')?.addEventListener('click', () => openModal());
        $('empty-add-btn')?.addEventListener('click', () => openModal());
        $('modal-close-btn')?.addEventListener('click', closeModal);
        $('btn-cancel')?.addEventListener('click', closeModal);
        $('btn-save')?.addEventListener('click', saveTheater);
        $('detail-close-btn')?.addEventListener('click', closeDetails);
        $('detail-overlay')?.addEventListener('click', closeDetails);
        $('form-rows')?.addEventListener('input', updateCapacityPreview);
        $('form-seats-per-row')?.addEventListener('input', updateCapacityPreview);
        ['filter-search', 'filter-type', 'filter-status', 'filter-branch', 'filter-sort']
            .forEach(id => $(id)?.addEventListener('input', applyFilters));
        loadTheaters();
    });
})();

