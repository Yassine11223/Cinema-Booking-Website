/* ============================================
   THEATER MANAGEMENT — Admin JavaScript
   Full CRUD, filtering, sorting, seat preview
   ============================================ */

(function () {
    'use strict';

    // =========================================
    //  SAMPLE DATA
    // =========================================
    const THEATERS_DATA = [
        {
            id: 1,
            name: 'IMAX Hall 1',
            type: 'imax',
            branch: 'Nasr City',
            rows: 12,
            seatsPerRow: 14,
            status: 'active',
            notes: 'Premium large-format auditorium with laser projection and immersive 12-channel sound system.',
            createdAt: '2024-06-15',
            updatedAt: '2026-04-18',
            showtimesCount: 8,
            disabledSeats: [[3, 5], [3, 6], [10, 1], [10, 14]]
        },
        {
            id: 2,
            name: 'Dolby Hall 2',
            type: 'dolby',
            branch: 'New Cairo',
            rows: 10,
            seatsPerRow: 12,
            status: 'active',
            notes: 'Dolby Atmos certified hall with Dolby Vision HDR projection and reclining seats.',
            createdAt: '2024-08-22',
            updatedAt: '2026-04-17',
            showtimesCount: 6,
            disabledSeats: [[5, 6], [5, 7]]
        },
        {
            id: 3,
            name: 'Standard Hall 3',
            type: 'standard',
            branch: 'Nasr City',
            rows: 8,
            seatsPerRow: 10,
            status: 'maintenance',
            notes: 'Standard digital projection. Currently undergoing seat replacement and carpet refurbish.',
            createdAt: '2024-03-10',
            updatedAt: '2026-04-15',
            showtimesCount: 0,
            disabledSeats: [[2, 3], [7, 8], [7, 9], [7, 10]]
        },
        {
            id: 4,
            name: 'Deluxe Hall 4',
            type: 'deluxe',
            branch: 'Sheikh Zayed',
            rows: 6,
            seatsPerRow: 8,
            status: 'inactive',
            notes: 'VIP boutique screening room with leather recliners and in-seat service. Temporarily closed.',
            createdAt: '2025-01-05',
            updatedAt: '2026-04-10',
            showtimesCount: 0,
            disabledSeats: []
        },
        {
            id: 5,
            name: 'IMAX Hall 5',
            type: 'imax',
            branch: 'Sheikh Zayed',
            rows: 14,
            seatsPerRow: 16,
            status: 'active',
            notes: 'Flagship IMAX auditorium with the largest screen in the region.',
            createdAt: '2025-03-20',
            updatedAt: '2026-04-19',
            showtimesCount: 12,
            disabledSeats: [[1, 1], [1, 16], [14, 1], [14, 16]]
        },
        {
            id: 6,
            name: 'Standard Hall 6',
            type: 'standard',
            branch: 'New Cairo',
            rows: 9,
            seatsPerRow: 11,
            status: 'active',
            notes: 'Standard auditorium with digital 4K projection and stadium seating.',
            createdAt: '2025-05-12',
            updatedAt: '2026-04-16',
            showtimesCount: 5,
            disabledSeats: [[4, 6]]
        },
        {
            id: 7,
            name: 'Dolby Hall 7',
            type: 'dolby',
            branch: 'Nasr City',
            rows: 11,
            seatsPerRow: 13,
            status: 'active',
            notes: 'Full Dolby Cinema experience with object-based audio and HDR.',
            createdAt: '2025-07-01',
            updatedAt: '2026-04-14',
            showtimesCount: 7,
            disabledSeats: [[6, 7]]
        }
    ];

    let theaters = JSON.parse(JSON.stringify(THEATERS_DATA));
    let nextId = 8;

    // Current state
    let currentSort = { col: null, dir: 'asc' };
    let editingTheaterId = null;

    // =========================================
    //  DOM REFERENCES
    // =========================================
    const DOM = {
        // Stats
        statTotal: document.getElementById('stat-total'),
        statActive: document.getElementById('stat-active'),
        statMaintenance: document.getElementById('stat-maintenance'),
        statCapacity: document.getElementById('stat-capacity'),
        // Filters
        searchInput: document.getElementById('filter-search'),
        typeFilter: document.getElementById('filter-type'),
        statusFilter: document.getElementById('filter-status'),
        branchFilter: document.getElementById('filter-branch'),
        sortFilter: document.getElementById('filter-sort'),
        filterCount: document.getElementById('filter-count'),
        // Table
        tableBody: document.getElementById('theaters-tbody'),
        emptyState: document.getElementById('empty-state'),
        tableContainer: document.getElementById('table-container'),
        // Modals
        modalOverlay: document.getElementById('theater-modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        formName: document.getElementById('form-name'),
        formType: document.getElementById('form-type'),
        formBranch: document.getElementById('form-branch'),
        formRows: document.getElementById('form-rows'),
        formSeatsPerRow: document.getElementById('form-seats-per-row'),
        formStatus: document.getElementById('form-status'),
        formNotes: document.getElementById('form-notes'),
        capacityValue: document.getElementById('capacity-value'),
        capacityFormula: document.getElementById('capacity-formula'),
        btnSave: document.getElementById('btn-save'),
        // Detail drawer
        detailOverlay: document.getElementById('detail-overlay'),
        detailDrawer: document.getElementById('detail-drawer'),
        detailBody: document.getElementById('detail-body'),
        // Toast
        toastContainer: document.getElementById('toast-container')
    };

    // =========================================
    //  UTILITIES
    // =========================================
    function getCapacity(rows, seatsPerRow) {
        return (parseInt(rows) || 0) * (parseInt(seatsPerRow) || 0);
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function relativeTime(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff} days ago`;
        if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
        return formatDate(dateStr);
    }

    function getTypeLabel(type) {
        const map = { imax: 'IMAX', dolby: 'Dolby', standard: 'Standard', deluxe: 'Deluxe' };
        return map[type] || type;
    }

    function getTypeIcon(type) {
        const map = {
            imax: 'fa-expand',
            dolby: 'fa-volume-high',
            standard: 'fa-tv',
            deluxe: 'fa-gem'
        };
        return map[type] || 'fa-tv';
    }

    function getStatusIcon(status) {
        const map = {
            active: 'fa-circle-check',
            maintenance: 'fa-wrench',
            inactive: 'fa-circle-xmark'
        };
        return map[status] || 'fa-circle';
    }

    // =========================================
    //  RENDER STATISTICS
    // =========================================
    function renderStats() {
        const total = theaters.length;
        const active = theaters.filter(t => t.status === 'active').length;
        const maint = theaters.filter(t => t.status === 'maintenance').length;
        const capacity = theaters.reduce((sum, t) => sum + getCapacity(t.rows, t.seatsPerRow), 0);

        DOM.statTotal.textContent = total;
        DOM.statActive.textContent = active;
        DOM.statMaintenance.textContent = maint;
        DOM.statCapacity.textContent = capacity.toLocaleString();
    }

    // =========================================
    //  RENDER TABLE
    // =========================================
    function getFilteredTheaters() {
        let list = [...theaters];

        // Search
        const search = (DOM.searchInput.value || '').toLowerCase().trim();
        if (search) {
            list = list.filter(t =>
                t.name.toLowerCase().includes(search) ||
                t.branch.toLowerCase().includes(search)
            );
        }

        // Type filter
        const typeVal = DOM.typeFilter.value;
        if (typeVal) {
            list = list.filter(t => t.type === typeVal);
        }

        // Status filter
        const statusVal = DOM.statusFilter.value;
        if (statusVal) {
            list = list.filter(t => t.status === statusVal);
        }

        // Branch filter
        const branchVal = DOM.branchFilter.value;
        if (branchVal) {
            list = list.filter(t => t.branch === branchVal);
        }

        // Sort
        const sortVal = DOM.sortFilter.value;
        if (sortVal === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortVal === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name));
        else if (sortVal === 'capacity-asc') list.sort((a, b) => getCapacity(a.rows, a.seatsPerRow) - getCapacity(b.rows, b.seatsPerRow));
        else if (sortVal === 'capacity-desc') list.sort((a, b) => getCapacity(b.rows, b.seatsPerRow) - getCapacity(a.rows, a.seatsPerRow));
        else if (sortVal === 'updated-desc') list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        else if (sortVal === 'updated-asc') list.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

        // Column sort (if header clicked)
        if (currentSort.col) {
            const dir = currentSort.dir === 'asc' ? 1 : -1;
            list.sort((a, b) => {
                let va, vb;
                switch (currentSort.col) {
                    case 'name': va = a.name; vb = b.name; return dir * va.localeCompare(vb);
                    case 'type': va = a.type; vb = b.type; return dir * va.localeCompare(vb);
                    case 'branch': va = a.branch; vb = b.branch; return dir * va.localeCompare(vb);
                    case 'capacity':
                        va = getCapacity(a.rows, a.seatsPerRow);
                        vb = getCapacity(b.rows, b.seatsPerRow);
                        return dir * (va - vb);
                    case 'status': va = a.status; vb = b.status; return dir * va.localeCompare(vb);
                    case 'updated': return dir * (new Date(a.updatedAt) - new Date(b.updatedAt));
                    default: return 0;
                }
            });
        }

        return list;
    }

    function renderTable() {
        const filtered = getFilteredTheaters();
        DOM.filterCount.innerHTML = `Showing <span>${filtered.length}</span> of <span>${theaters.length}</span> theaters`;

        if (filtered.length === 0) {
            DOM.tableContainer.style.display = 'none';
            DOM.emptyState.style.display = 'flex';
            return;
        }

        DOM.tableContainer.style.display = '';
        DOM.emptyState.style.display = 'none';

        DOM.tableBody.innerHTML = filtered.map(t => {
            const cap = getCapacity(t.rows, t.seatsPerRow);
            const isInactive = t.status === 'inactive';
            const isMaintenance = t.status === 'maintenance';

            return `
            <tr data-id="${t.id}">
                <td>
                    <div class="theater-name-cell">
                        <div class="theater-icon theater-icon--${t.type}">
                            <i class="fas ${getTypeIcon(t.type)}"></i>
                        </div>
                        <div>
                            <div class="theater-name-text">${t.name}</div>
                            <div class="theater-branch"><i class="fas fa-location-dot"></i> ${t.branch}</div>
                        </div>
                    </div>
                </td>
                <td><span class="type-badge type-badge--${t.type}">${getTypeLabel(t.type)}</span></td>
                <td>${t.branch}</td>
                <td>${t.rows}</td>
                <td>${t.seatsPerRow}</td>
                <td><strong>${cap}</strong></td>
                <td>
                    <span class="status-badge status-badge--${t.status}">
                        <span class="dot"></span>
                        ${t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                </td>
                <td>${relativeTime(t.updatedAt)}</td>
                <td>
                    <div class="row-actions">
                        <button class="action-btn action-btn--view" title="View" onclick="TheaterAdmin.viewTheater(${t.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-btn--edit" title="Edit" onclick="TheaterAdmin.editTheater(${t.id})">
                            <i class="fas fa-pen"></i>
                        </button>
                        ${isInactive || isMaintenance
                    ? `<button class="action-btn action-btn--enable" title="Enable" onclick="TheaterAdmin.toggleStatus(${t.id}, 'active')">
                                <i class="fas fa-toggle-on"></i>
                            </button>`
                    : `<button class="action-btn action-btn--disable" title="Disable" onclick="TheaterAdmin.toggleStatus(${t.id}, 'inactive')">
                                <i class="fas fa-toggle-off"></i>
                            </button>`
                }
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // =========================================
    //  SEAT LAYOUT PREVIEW RENDERER
    // =========================================
    function renderSeatLayout(theater, containerId) {
        const container = document.getElementById(containerId) || document.querySelector(containerId);
        if (!container) return;

        const rows = theater.rows;
        const cols = theater.seatsPerRow;
        const disabled = theater.disabledSeats || [];
        const disableSet = new Set(disabled.map(d => `${d[0]}-${d[1]}`));

        let html = `
        <div class="seat-layout-card">
            <div class="layout-screen">
                <div class="layout-screen-bar"></div>
                <span class="layout-screen-label">Screen</span>
            </div>
            <div class="layout-grid">`;

        for (let r = 1; r <= rows; r++) {
            const rowLetter = String.fromCharCode(64 + r);
            html += `<div class="layout-row">
                <span class="layout-row-label">${rowLetter}</span>
                <div class="layout-seats">`;

            for (let c = 1; c <= cols; c++) {
                const key = `${r}-${c}`;
                const cls = disableSet.has(key) ? 'layout-seat--disabled' : 'layout-seat--active';
                html += `<div class="layout-seat ${cls}" title="${rowLetter}${c}"></div>`;
            }

            html += `</div>
                <span class="layout-row-label">${rowLetter}</span>
            </div>`;
        }

        html += `</div>
            <div class="layout-legend">
                <div class="layout-legend-item">
                    <div class="layout-legend-dot layout-legend-dot--normal"></div>
                    Normal Seat
                </div>
                <div class="layout-legend-item">
                    <div class="layout-legend-dot layout-legend-dot--disabled"></div>
                    Disabled Seat
                </div>
            </div>
        </div>`;

        container.innerHTML = html;
    }

    // =========================================
    //  MODAL — Add / Edit Theater
    // =========================================
    function openModal(theater) {
        editingTheaterId = theater ? theater.id : null;
        DOM.modalTitle.textContent = theater ? 'Edit Theater' : 'Add New Theater';
        DOM.btnSave.textContent = theater ? 'Update Theater' : 'Create Theater';

        if (theater) {
            DOM.formName.value = theater.name;
            DOM.formType.value = theater.type;
            DOM.formBranch.value = theater.branch;
            DOM.formRows.value = theater.rows;
            DOM.formSeatsPerRow.value = theater.seatsPerRow;
            DOM.formStatus.value = theater.status;
            DOM.formNotes.value = theater.notes || '';
        } else {
            DOM.formName.value = '';
            DOM.formType.value = 'standard';
            DOM.formBranch.value = '';
            DOM.formRows.value = '';
            DOM.formSeatsPerRow.value = '';
            DOM.formStatus.value = 'active';
            DOM.formNotes.value = '';
        }

        updateCapacityPreview();
        DOM.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus first field
        setTimeout(() => DOM.formName.focus(), 300);
    }

    function closeModal() {
        DOM.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        editingTheaterId = null;
    }

    function updateCapacityPreview() {
        const rows = parseInt(DOM.formRows.value) || 0;
        const spr = parseInt(DOM.formSeatsPerRow.value) || 0;
        const cap = rows * spr;
        DOM.capacityValue.textContent = cap > 0 ? cap : '—';
        DOM.capacityFormula.textContent = rows > 0 && spr > 0 ? `${rows} rows × ${spr} seats` : 'Enter rows and seats per row';
    }

    function saveTheater() {
        const name = DOM.formName.value.trim();
        const type = DOM.formType.value;
        const branch = DOM.formBranch.value.trim();
        const rows = parseInt(DOM.formRows.value);
        const seatsPerRow = parseInt(DOM.formSeatsPerRow.value);
        const status = DOM.formStatus.value;
        const notes = DOM.formNotes.value.trim();

        // Validation
        if (!name) { showToast('Please enter a theater name', 'error'); DOM.formName.focus(); return; }
        if (!branch) { showToast('Please enter a branch / location', 'error'); DOM.formBranch.focus(); return; }
        if (!rows || rows < 1) { showToast('Please enter valid number of rows', 'error'); DOM.formRows.focus(); return; }
        if (!seatsPerRow || seatsPerRow < 1) { showToast('Please enter valid seats per row', 'error'); DOM.formSeatsPerRow.focus(); return; }
        if (rows > 30) { showToast('Maximum 30 rows allowed', 'error'); DOM.formRows.focus(); return; }
        if (seatsPerRow > 30) { showToast('Maximum 30 seats per row allowed', 'error'); DOM.formSeatsPerRow.focus(); return; }

        const today = new Date().toISOString().split('T')[0];

        if (editingTheaterId) {
            // Edit existing
            const idx = theaters.findIndex(t => t.id === editingTheaterId);
            if (idx !== -1) {
                theaters[idx].name = name;
                theaters[idx].type = type;
                theaters[idx].branch = branch;
                theaters[idx].rows = rows;
                theaters[idx].seatsPerRow = seatsPerRow;
                theaters[idx].status = status;
                theaters[idx].notes = notes;
                theaters[idx].updatedAt = today;
            }
            showToast(`${name} updated successfully`, 'success');
        } else {
            // Add new
            theaters.push({
                id: nextId++,
                name,
                type,
                branch,
                rows,
                seatsPerRow,
                status,
                notes,
                createdAt: today,
                updatedAt: today,
                showtimesCount: 0,
                disabledSeats: []
            });
            showToast(`${name} created successfully`, 'success');
        }

        closeModal();
        renderStats();
        renderTable();
    }

    // =========================================
    //  DETAIL DRAWER — View Theater
    // =========================================
    function openDetail(theater) {
        const cap = getCapacity(theater.rows, theater.seatsPerRow);
        const disabledCount = (theater.disabledSeats || []).length;
        const activeSeats = cap - disabledCount;

        DOM.detailBody.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">General Information</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="dl">Theater Name</span>
                        <span class="dv">${theater.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Type</span>
                        <span class="dv"><span class="type-badge type-badge--${theater.type}">${getTypeLabel(theater.type)}</span></span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Branch / Location</span>
                        <span class="dv"><i class="fas fa-location-dot" style="color:var(--text-muted);margin-right:4px;font-size:12px;"></i>${theater.branch}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Status</span>
                        <span class="dv">
                            <span class="status-badge status-badge--${theater.status}">
                                <span class="dot"></span>
                                ${theater.status.charAt(0).toUpperCase() + theater.status.slice(1)}
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Seating Configuration</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="dl">Rows</span>
                        <span class="dv">${theater.rows}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Seats Per Row</span>
                        <span class="dv">${theater.seatsPerRow}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Total Capacity</span>
                        <span class="dv" style="color:var(--gold);font-weight:600;font-size:18px;">${cap}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Active Seats</span>
                        <span class="dv">${activeSeats} <span style="color:var(--text-muted);font-size:12px;">(${disabledCount} disabled)</span></span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Dates & Linked Data</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="dl">Created</span>
                        <span class="dv">${formatDate(theater.createdAt)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Last Updated</span>
                        <span class="dv">${formatDate(theater.updatedAt)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="dl">Linked Showtimes</span>
                        <span class="dv">${theater.showtimesCount} showtime${theater.showtimesCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>

            ${theater.notes ? `
            <div class="detail-section">
                <div class="detail-section-title">Notes</div>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.7;">${theater.notes}</p>
            </div>
            ` : ''}

            <div class="detail-section">
                <div class="detail-section-title">Seat Layout Preview</div>
                <div id="detail-seat-layout"></div>
            </div>
        `;

        // Show drawer
        DOM.detailOverlay.classList.add('active');
        DOM.detailDrawer.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Render seat layout
        setTimeout(() => renderSeatLayout(theater, 'detail-seat-layout'), 100);
    }

    function closeDetail() {
        DOM.detailOverlay.classList.remove('active');
        DOM.detailDrawer.classList.remove('active');
        document.body.style.overflow = '';
    }

    // =========================================
    //  STATUS TOGGLE
    // =========================================
    function toggleStatus(id, newStatus) {
        const theater = theaters.find(t => t.id === id);
        if (!theater) return;

        const oldStatus = theater.status;

        // If disabling and it has showtimes, warn
        if (newStatus === 'inactive' && theater.showtimesCount > 0) {
            const confirmed = confirm(
                `${theater.name} has ${theater.showtimesCount} linked showtime(s).\n\nDisabling will not delete it, but it won't be available for new showtimes.\n\nContinue?`
            );
            if (!confirmed) return;
        }

        theater.status = newStatus;
        theater.updatedAt = new Date().toISOString().split('T')[0];

        const action = newStatus === 'active' ? 'enabled' : newStatus === 'maintenance' ? 'set to maintenance' : 'disabled';
        showToast(`${theater.name} ${action}`, newStatus === 'active' ? 'success' : 'warning');

        renderStats();
        renderTable();
    }

    // =========================================
    //  TOAST NOTIFICATIONS
    // =========================================
    function showToast(message, type = 'success') {
        const icons = {
            success: 'fa-circle-check',
            warning: 'fa-triangle-exclamation',
            error: 'fa-circle-xmark'
        };

        const toast = document.createElement('div');
        toast.className = `toast-item toast-item--${type}`;
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        DOM.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // =========================================
    //  EVENT BINDINGS
    // =========================================
    function bindEvents() {
        // Add Theater button
        document.getElementById('btn-add-theater').addEventListener('click', () => openModal(null));

        // Empty state add button
        document.getElementById('empty-add-btn').addEventListener('click', () => openModal(null));

        // Modal close handlers
        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
        document.getElementById('btn-cancel').addEventListener('click', closeModal);
        DOM.modalOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.modalOverlay) closeModal();
        });

        // Modal save
        DOM.btnSave.addEventListener('click', saveTheater);

        // Capacity live update
        DOM.formRows.addEventListener('input', updateCapacityPreview);
        DOM.formSeatsPerRow.addEventListener('input', updateCapacityPreview);

        // Detail drawer close
        document.getElementById('detail-close-btn').addEventListener('click', closeDetail);
        DOM.detailOverlay.addEventListener('click', closeDetail);

        // Filters
        DOM.searchInput.addEventListener('input', debounce(renderTable, 200));
        DOM.typeFilter.addEventListener('change', renderTable);
        DOM.statusFilter.addEventListener('change', renderTable);
        DOM.branchFilter.addEventListener('change', renderTable);
        DOM.sortFilter.addEventListener('change', renderTable);

        // Column sort
        document.querySelectorAll('.theaters-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (currentSort.col === col) {
                    currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.col = col;
                    currentSort.dir = 'asc';
                }
                // Update visual indicators
                document.querySelectorAll('.theaters-table th.sortable').forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
                renderTable();
            });
        });

        // Keyboard: Escape closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (DOM.modalOverlay.classList.contains('active')) closeModal();
                if (DOM.detailDrawer.classList.contains('active')) closeDetail();
            }
        });

        // Enter in modal submits
        DOM.modalOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                saveTheater();
            }
        });
    }

    // Debounce helper
    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // =========================================
    //  PUBLIC API (for inline onclick handlers)
    // =========================================
    window.TheaterAdmin = {
        viewTheater(id) {
            const t = theaters.find(th => th.id === id);
            if (t) openDetail(t);
        },
        editTheater(id) {
            const t = theaters.find(th => th.id === id);
            if (t) openModal(t);
        },
        toggleStatus(id, newStatus) {
            toggleStatus(id, newStatus);
        }
    };

    // =========================================
    //  INIT
    // =========================================
    function init() {
        renderStats();
        renderTable();
        bindEvents();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
