// Admin Dashboard Functions
let currentUser = null;
let currentBookingDetail = null;
let currentWebsiteSettings = {};
let pendingConfirmAction = null;
const ADMIN_ACTIVE_SECTION_KEY = 'hotelAdminActiveSection';
const ADMIN_BOOKINGS_FILTER_KEY = 'hotelAdminBookingsFilter';
const PAGE_TRANSITION_SESSION_KEY = 'hotelPageTransitionPendingAt';
const PAGE_TRANSITION_MAX_AGE_MS = 6000;
const PAGE_TRANSITION_MIN_VISIBLE_MS = 420;
const PAGE_TRANSITION_NAV_DELAY_MS = 170;
const ADMIN_SECTION_TITLES = {
    dashboard: 'Dashboard',
    rooms: 'Room Management',
    bookings: 'Booking Management',
    customers: 'Customer Management',
    settings: 'Website Settings'
};
const ADMIN_MODAL_FOCUSABLE_SELECTOR = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
let isSyncingAdminHash = false;
const adminModalReturnFocusMap = new WeakMap();
let pageTransitionLoader = null;
let pageTransitionHideTimeoutId = null;

function ensurePageTransitionLoader() {
    if (pageTransitionLoader && pageTransitionLoader.isConnected) {
        return pageTransitionLoader;
    }

    pageTransitionLoader = document.createElement('div');
    pageTransitionLoader.className = 'page-transition-loader';
    pageTransitionLoader.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pageTransitionLoader);
    return pageTransitionLoader;
}

function showPageTransitionLoader() {
    const loader = ensurePageTransitionLoader();
    loader.classList.add('active');
}

function hidePageTransitionLoader() {
    if (pageTransitionHideTimeoutId) {
        clearTimeout(pageTransitionHideTimeoutId);
        pageTransitionHideTimeoutId = null;
    }

    if (pageTransitionLoader) {
        pageTransitionLoader.classList.remove('active');
    }

    document.body.classList.remove('page-transition-leaving');
}

function shouldHandlePageTransitionLink(link, event) {
    if (!link || event.defaultPrevented || event.button !== 0) {
        return false;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return false;
    }

    if (link.dataset.noPageTransition === 'true') {
        return false;
    }

    const href = String(link.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return false;
    }

    if (link.hasAttribute('download')) {
        return false;
    }

    if (link.target && link.target !== '_self') {
        return false;
    }

    let destinationUrl;
    try {
        destinationUrl = new URL(link.href, window.location.href);
    } catch (error) {
        return false;
    }

    if (destinationUrl.origin !== window.location.origin) {
        return false;
    }

    if (destinationUrl.pathname === window.location.pathname
        && destinationUrl.search === window.location.search
        && destinationUrl.hash === window.location.hash) {
        return false;
    }

    return true;
}

function setupPageTransitionLoader() {
    if (!document.body) {
        return;
    }

    document.body.classList.add('page-transition-ready');

    const startedAt = Number(sessionStorage.getItem(PAGE_TRANSITION_SESSION_KEY) || 0);
    const now = Date.now();
    sessionStorage.removeItem(PAGE_TRANSITION_SESSION_KEY);

    if (startedAt > 0 && (now - startedAt) <= PAGE_TRANSITION_MAX_AGE_MS) {
        showPageTransitionLoader();
        pageTransitionHideTimeoutId = window.setTimeout(() => {
            hidePageTransitionLoader();
        }, PAGE_TRANSITION_MIN_VISIBLE_MS);
    }

    document.addEventListener('click', (event) => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!shouldHandlePageTransitionLink(link, event)) {
            return;
        }

        event.preventDefault();
        sessionStorage.setItem(PAGE_TRANSITION_SESSION_KEY, String(Date.now()));
        document.body.classList.add('page-transition-leaving');
        showPageTransitionLoader();

        const destination = link.href;
        window.setTimeout(() => {
            window.location.href = destination;
        }, PAGE_TRANSITION_NAV_DELAY_MS);
    });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            hidePageTransitionLoader();
        }
    });
}

function setupAdminBrandHomeRedirect() {
    const brandElement = document.querySelector('.sidebar-header');
    if (!brandElement || brandElement.dataset.homeBound === 'true' || brandElement.closest('a[href]')) {
        return;
    }

    brandElement.dataset.homeBound = 'true';
    brandElement.classList.add('brand-home-link');
    brandElement.setAttribute('role', 'link');
    brandElement.setAttribute('tabindex', '0');
    brandElement.setAttribute('aria-label', 'Go to home');

    const goHome = () => {
        const isOnAdminPage = /\/admin\.html$/i.test(window.location.pathname);
        if (isOnAdminPage) {
            saveActiveSection('dashboard');
            if (window.location.hash !== '#dashboard') {
                window.location.hash = 'dashboard';
            }
            showDashboard();
            return;
        }

        window.location.href = 'admin.html#dashboard';
    };

    brandElement.addEventListener('click', goHome);
    brandElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goHome();
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupPageTransitionLoader();
    setupAdminBrandHomeRedirect();
    if (!checkAuthentication()) {
        return;
    }
    setupEventListeners();
    setupGlobalAdminModalUX();
    primeActiveSectionFromState();
    restoreActiveSection();
});

window.addEventListener('hashchange', () => {
    if (isSyncingAdminHash) {
        return;
    }
    restoreActiveSection();
});

// Check Authentication
function checkAuthentication() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }

    // Decode token to get user info (simple parsing)
    const token = getToken();
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        currentUser = { email: payload.sub };
        document.getElementById('adminName').textContent = payload.sub;
    } catch (e) {
        // console.warn('Could not parse token');
    }

    return true;
}

// Setup Event Listeners
function setupEventListeners() {
    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        // Remove existing listener to prevent duplicates
        const newForm = roomForm.cloneNode(true);
        roomForm.parentNode.replaceChild(newForm, roomForm);
        
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveRoom();
        });
    }
}

function showConfirmActionModal({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    const titleEl = document.getElementById('confirmActionTitle');
    const messageEl = document.getElementById('confirmActionMessage');
    const confirmBtn = document.getElementById('confirmActionBtn');

    pendingConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) {
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `btn ${confirmClass}`;
    }

    openAdminModal('confirmActionModal');
}

function closeConfirmActionModal() {
    pendingConfirmAction = null;
    closeAdminModal('confirmActionModal');
}

async function runConfirmAction() {
    const action = pendingConfirmAction;
    closeConfirmActionModal();
    if (action) {
        await action();
    }
}

let pendingInputAction = null;

function showInputActionModal({ title, message, label, placeholder = '', confirmText = 'Submit', onConfirm }) {
    const titleEl = document.getElementById('inputActionTitle');
    const messageEl = document.getElementById('inputActionMessage');
    const labelEl = document.getElementById('inputActionLabel');
    const fieldEl = document.getElementById('inputActionField');
    const alertEl = document.getElementById('inputActionAlert');
    const confirmBtn = document.getElementById('inputActionBtn');

    pendingInputAction = typeof onConfirm === 'function' ? onConfirm : null;

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (labelEl) labelEl.textContent = label;
    if (fieldEl) {
        fieldEl.value = '';
        fieldEl.placeholder = placeholder;
    }
    if (alertEl) alertEl.innerHTML = '';
    if (confirmBtn) confirmBtn.textContent = confirmText;

    openAdminModal('inputActionModal', { focusSelector: '#inputActionField' });
}

function closeInputActionModal() {
    pendingInputAction = null;
    closeAdminModal('inputActionModal');
}

async function runInputAction() {
    const fieldEl = document.getElementById('inputActionField');
    const alertEl = document.getElementById('inputActionAlert');
    const value = fieldEl ? fieldEl.value.trim() : '';

    if (!value) {
        if (alertEl) {
            alertEl.innerHTML = '<div class="alert alert-warning"><i class="fas fa-triangle-exclamation"></i><span>Please enter a value.</span></div>';
        }
        return;
    }

    const action = pendingInputAction;
    closeInputActionModal();
    if (action) {
        await action(value);
    }
}

// Navigation
function showDashboard() {
    saveActiveSection('dashboard');
    switchSection('dashboardSection');
    loadDashboard();
}

function showRooms() {
    saveActiveSection('rooms');
    switchSection('roomsSection');
    loadRooms();
}

function showBookings() {
    saveActiveSection('bookings');
    switchSection('bookingsSection');
    loadBookings(getSavedBookingsFilter());
    loadBookingOtpAuditEvents();
}

function showCustomers() {
    saveActiveSection('customers');
    switchSection('customersSection');
    loadCustomers();
}

function showWebsiteSettings() {
    saveActiveSection('settings');
    switchSection('settingsSection');
    loadWebsiteSettingsAdmin();
}

function saveActiveSection(sectionName) {
    if (!sectionName) return;
    localStorage.setItem(ADMIN_ACTIVE_SECTION_KEY, sectionName);
}

function getActiveSectionFromState() {
    const hashSection = String(window.location.hash || '').replace('#', '').trim().toLowerCase();
    const savedSection = String(localStorage.getItem(ADMIN_ACTIVE_SECTION_KEY) || '').trim().toLowerCase();
    const validSections = new Set(['dashboard', 'rooms', 'bookings', 'customers', 'settings']);

    if (validSections.has(hashSection)) {
        return hashSection;
    }

    if (validSections.has(savedSection)) {
        return savedSection;
    }

    return 'dashboard';
}

function getSectionIdFromName(sectionName) {
    const key = String(sectionName || '').trim().toLowerCase();
    const map = {
        dashboard: 'dashboardSection',
        rooms: 'roomsSection',
        bookings: 'bookingsSection',
        customers: 'customersSection',
        settings: 'settingsSection'
    };

    return map[key] || 'dashboardSection';
}

function primeActiveSectionFromState() {
    const sectionName = getActiveSectionFromState();
    const sectionId = getSectionIdFromName(sectionName);

    document.querySelectorAll('.content-section').forEach((section) => {
        section.classList.remove('active');
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    document.querySelectorAll('.menu-item').forEach((item) => {
        item.classList.remove('active');
    });

    const activeMenu = document.querySelector(`[data-menu="${sectionName}"]`);
    if (activeMenu) {
        activeMenu.classList.add('active');
    }

    updateAdminPageTitle(sectionName);
}

function restoreActiveSection() {
    const section = getActiveSectionFromState();

    if (section === 'rooms') {
        showRooms();
    } else if (section === 'bookings') {
        showBookings();
    } else if (section === 'customers') {
        showCustomers();
    } else if (section === 'settings') {
        showWebsiteSettings();
    } else {
        showDashboard();
    }
}

function saveBookingsFilter(filter) {
    const normalized = normalizeBookingsFilter(filter);
    localStorage.setItem(ADMIN_BOOKINGS_FILTER_KEY, normalized);
}

function getSavedBookingsFilter() {
    const stored = localStorage.getItem(ADMIN_BOOKINGS_FILTER_KEY);
    return normalizeBookingsFilter(stored);
}

function normalizeBookingsFilter(filter) {
    const value = String(filter || '').trim().toUpperCase();
    const valid = new Set(['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']);
    return valid.has(value) ? value : 'ALL';
}

function updateAdminPageTitle(sectionName) {
    const title = ADMIN_SECTION_TITLES[sectionName] || ADMIN_SECTION_TITLES.dashboard;
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = title;
    }
    document.title = `Admin Dashboard - Vital Stays - ${title}`;
}

function switchSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuItem = document.querySelector(`[data-menu="${sectionId.replace('Section', '')}"]`);
    if (menuItem) menuItem.classList.add('active');

    const sectionName = sectionId.replace('Section', '');
    if (sectionName) {
        saveActiveSection(sectionName);
        updateAdminPageTitle(sectionName);
        isSyncingAdminHash = true;
        if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, '', `#${sectionName}`);
        } else {
            window.location.hash = sectionName;
        }
        window.setTimeout(() => {
            isSyncingAdminHash = false;
        }, 0);
    }

    // Collapse sidebar after navigation on small screens.
    closeSidebar();
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isActive = sidebar && sidebar.classList.toggle('active');

    if (overlay) {
        overlay.classList.toggle('active', Boolean(isActive));
    }

    if (window.innerWidth <= 768) {
        document.body.style.overflow = isActive ? 'hidden' : '';
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    if (window.innerWidth <= 768) {
        syncAdminBodyScrollLock();
    }
}

function getActiveAdminModals() {
    return Array.from(document.querySelectorAll('.modal.active'));
}

function syncAdminBodyScrollLock() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOpenOnMobile = window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active');
    const hasOpenModal = getActiveAdminModals().length > 0;
    document.body.style.overflow = hasOpenModal || sidebarOpenOnMobile ? 'hidden' : '';
}

function setAdminModalAccessibility(modal, isOpen) {
    if (!modal) return;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    ensureAdminModalAriaAssociations(modal);
}

function ensureAdminModalAriaAssociations(modal) {
    if (!modal) return;

    const modalId = modal.id || `modal-${Date.now()}`;
    const heading = modal.querySelector('.modal-header h1, .modal-header h2, .modal-header h3, .modal-header h4, .modal-header h5, .modal-header h6')
        || modal.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading instanceof HTMLElement) {
        if (!heading.id) {
            heading.id = `${modalId}-title`;
        }
        modal.setAttribute('aria-labelledby', heading.id);
    } else {
        modal.removeAttribute('aria-labelledby');
    }

    const description = modal.querySelector('.modal-body') || modal.querySelector('p, form, .card');
    if (description instanceof HTMLElement) {
        if (!description.id) {
            description.id = `${modalId}-desc`;
        }
        modal.setAttribute('aria-describedby', description.id);
    } else {
        modal.removeAttribute('aria-describedby');
    }
}

function getAdminFocusableNodes(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(ADMIN_MODAL_FOCUSABLE_SELECTOR)).filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        return !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null;
    });
}

function focusAdminModalDialog(modal, focusSelector) {
    if (!modal || !modal.classList.contains('active')) return;

    const modalContent = modal.querySelector('.modal-content') || modal;
    if (!modalContent.hasAttribute('tabindex')) {
        modalContent.setAttribute('tabindex', '-1');
    }

    const explicitTarget = focusSelector ? modal.querySelector(focusSelector) : null;
    const autofocusTarget = modal.querySelector('[autofocus]');
    const focusable = getAdminFocusableNodes(modalContent);
    const target = explicitTarget || autofocusTarget || focusable[0] || modalContent;

    if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
    }
}

function trapFocusInAdminModal(modal, event) {
    if (!modal || event.key !== 'Tab') return;

    const modalContent = modal.querySelector('.modal-content') || modal;
    const focusable = getAdminFocusableNodes(modalContent);
    if (!focusable.length) {
        event.preventDefault();
        if (modalContent instanceof HTMLElement) {
            modalContent.focus({ preventScroll: true });
        }
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
        return;
    }

    if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
    }
}

function openAdminModal(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement && !modal.contains(activeEl)) {
        adminModalReturnFocusMap.set(modal, activeEl);
    }

    modal.classList.add('active');
    setAdminModalAccessibility(modal, true);
    syncAdminBodyScrollLock();
    window.requestAnimationFrame(() => focusAdminModalDialog(modal, options.focusSelector));
}

function closeAdminModal(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    setAdminModalAccessibility(modal, false);
    syncAdminBodyScrollLock();

    if (options.restoreFocus === false) {
        adminModalReturnFocusMap.delete(modal);
        return;
    }

    const returnFocusEl = adminModalReturnFocusMap.get(modal);
    if (returnFocusEl && document.contains(returnFocusEl)) {
        returnFocusEl.focus({ preventScroll: true });
    }
    adminModalReturnFocusMap.delete(modal);
}

function setupGlobalAdminModalUX() {
    document.querySelectorAll('.modal').forEach((modal) => {
        setAdminModalAccessibility(modal, modal.classList.contains('active'));
    });

    document.addEventListener('click', (event) => {
        const activeModal = event.target.closest('.modal.active');
        if (!activeModal) return;
        if (event.target.closest('.modal-content')) return;

        closeAdminModal(activeModal.id);
    });

    document.addEventListener('keydown', (event) => {
        const activeModals = getActiveAdminModals();
        if (!activeModals.length) return;

        const topModal = activeModals[activeModals.length - 1];
        if (event.key === 'Escape') {
            closeAdminModal(topModal.id);
            return;
        }

        trapFocusInAdminModal(topModal, event);
    });
}

// Load Dashboard
async function loadDashboard() {
    showLoading();
    try {
        const response = await apiRequest('/analytics/dashboard-stats', 'GET', null, getToken());

        if (response.success) {
            const stats = response.data;
            document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
            document.getElementById('totalBookings').textContent = stats.totalBookings;
            document.getElementById('occupiedRooms').textContent = stats.occupiedRooms;
            document.getElementById('availableRooms').textContent = stats.availableRooms;
            document.getElementById('occupancyRate').textContent = stats.occupancyRate.toFixed(1) + '%';

            const bookingsResponse = await apiRequest('/bookings', 'GET', null, getToken());
            if (bookingsResponse.success && Array.isArray(bookingsResponse.data)) {
                const all = bookingsResponse.data;
                document.getElementById('checkedInToday').textContent = all.filter(b => b.status === 'CHECKED_IN').length;
                document.getElementById('pendingBookings').textContent = all.filter(b => b.status === 'PENDING').length;
                document.getElementById('confirmedBookings').textContent = all.filter(b => b.status === 'CONFIRMED').length;
            }

            // Update occupancy circle
            const circumference = 2 * Math.PI * 50;
            const offset = circumference - (stats.occupancyRate / 100) * circumference;
            document.getElementById('occupancyCircle').style.strokeDashoffset = offset;
        }
    } catch (error) {
        showAlert('Error loading dashboard: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Load Rooms
async function loadRooms() {
    showLoading();
    try {
        const response = await apiRequest('/rooms', 'GET', null, getToken());

        if (response.success) {
            const rooms = Array.isArray(response.data) ? response.data : [];
            displayRooms(rooms);
        } else {
            showAlert('Failed to load rooms', 'danger');
        }
    } catch (error) {
        showAlert('Error loading rooms: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Display Rooms
function displayRooms(rooms) {
    const tbody = document.getElementById('roomsTable');
    
    if (!rooms || rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No rooms found</td></tr>';
        return;
    }

    tbody.innerHTML = rooms.map(room => {
        const encodedRoomNumber = encodeURIComponent(room.roomNumber || '');
        const encodedType = encodeURIComponent(room.type || '');
        const encodedDescription = encodeURIComponent(room.description || '');

        return `
        <tr>
            <td><strong>${escapeHtml(room.roomNumber || 'N/A')}</strong></td>
            <td>${escapeHtml(room.type || 'N/A')}</td>
            <td>${formatCurrency(room.pricePerNight)}</td>
            <td>${room.capacity} ${room.capacity > 1 ? 'guests' : 'guest'}</td>
            <td>${room.active ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-warning">Not Available</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editRoom(${room.id}, '${encodedRoomNumber}', '${encodedType}', ${room.pricePerNight}, ${room.capacity}, '${encodedDescription}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm ${room.active ? 'btn-warning' : 'btn-success'}" onclick="toggleRoomAvailability(${room.id}, ${room.active}, '${encodedRoomNumber}')" style="margin-left: 0.5rem;">
                    <i class="fas ${room.active ? 'fa-eye-slash' : 'fa-check'}"></i> ${room.active ? 'Set Not Available' : 'Set Available'}
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

// Show Add Room Modal
function showAddRoomModal() {
    document.getElementById('roomId').value = '';
    document.getElementById('roomForm').reset();
    document.getElementById('roomModalTitle').textContent = 'Add New Room';
    openAdminModal('roomModal', { focusSelector: '#roomNumber' });
    document.body.style.paddingRight = '0';
}

// Edit Room
function editRoom(id, roomNumber, type, price, capacity, description) {
    document.getElementById('roomId').value = id;
    document.getElementById('roomNumber').value = decodeURIComponent(roomNumber || '');
    document.getElementById('roomType').value = decodeURIComponent(type || '');
    document.getElementById('roomPrice').value = price;
    document.getElementById('roomCapacity').value = capacity;
    document.getElementById('roomDescription').value = decodeURIComponent(description || '');
    document.getElementById('roomModalTitle').textContent = 'Edit Room';
    openAdminModal('roomModal', { focusSelector: '#roomNumber' });
}

// Close Room Modal
function closeRoomModal() {
    closeAdminModal('roomModal');
    document.body.style.paddingRight = '0';
}

// Save Room
async function saveRoom() {
    const id = document.getElementById('roomId').value;
    const roomNumber = document.getElementById('roomNumber').value.trim();
    const type = document.getElementById('roomType').value;
    const price = parseFloat(document.getElementById('roomPrice').value);
    const capacity = parseInt(document.getElementById('roomCapacity').value);
    const description = document.getElementById('roomDescription').value.trim();

    if (!roomNumber || !type || !price || !capacity) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }

    if (price <= 0 || capacity <= 0) {
        showAlert('Price and capacity must be greater than 0', 'danger');
        return;
    }

    const saveButton = document.querySelector('#roomModal .btn.btn-primary');
    await withButtonLoading(saveButton, async () => {
        showLoading();
        try {
            const roomData = {
                roomNumber,
                type,
                pricePerNight: price,
                capacity,
                description
            };

            let response;
            if (id) {
                response = await apiRequest(`/rooms/${id}`, 'PUT', roomData, getToken());
            } else {
                response = await apiRequest('/rooms', 'POST', roomData, getToken());
            }

            if (response.success) {
                clearApiCache('rooms:');
                showAlert(id ? 'Room updated successfully' : 'Room created successfully', 'success');
                closeRoomModal();
                loadRooms();
            } else {
                if (String(response.message || '').toLowerCase().includes('already exists')) {
                    clearApiCache('rooms:');
                    closeRoomModal();
                    loadRooms();
                }
                showAlert('Failed: ' + response.message, 'danger');
            }
        } catch (error) {
            if (String(error.message || '').toLowerCase().includes('already exists')) {
                clearApiCache('rooms:');
                closeRoomModal();
                loadRooms();
            }
            showAlert('Error: ' + error.message, 'danger');
        } finally {
            hideLoading();
        }
    }, id ? 'Updating...' : 'Creating...');
}

// Delete Room
async function deleteRoom(id, encodedRoomNumber = '') {
    const roomNumber = decodeURIComponent(encodedRoomNumber || '');

    showConfirmActionModal({
        title: 'Delete Room',
        message: roomNumber
            ? `Are you sure you want to delete Room ${roomNumber}? This will archive the room and remove it from active listings.`
            : 'Are you sure you want to delete this room? This will archive the room and remove it from active listings.',
        confirmText: 'Delete Room',
        confirmClass: 'btn-destructive',
        onConfirm: async () => {
            const deleteButton = document.querySelector(`button[onclick="deleteRoom(${id}, '${encodedRoomNumber}')"]`);
            await withButtonLoading(deleteButton, async () => {
                showLoading();
                try {
                    const response = await apiRequest(`/rooms/${id}`, 'DELETE', null, getToken());

                    if (response.success) {
                        clearApiCache('rooms:');
                        showAlert('Room deleted successfully', 'success');
                        loadRooms();
                    } else {
                        showAlert('Failed to delete room', 'danger');
                    }
                } catch (error) {
                    showAlert('Error: ' + error.message, 'danger');
                } finally {
                    hideLoading();
                }
            }, 'Deleting...');
        }
    });
}

async function toggleRoomAvailability(id, isCurrentlyActive, encodedRoomNumber = '') {
    const roomNumber = decodeURIComponent(encodedRoomNumber || '');
    const nextActive = !isCurrentlyActive;

    showConfirmActionModal({
        title: nextActive ? 'Set Room Available' : 'Set Room Not Available',
        message: roomNumber
            ? `Are you sure you want to mark Room ${roomNumber} as ${nextActive ? 'available' : 'not available'}?`
            : `Are you sure you want to mark this room as ${nextActive ? 'available' : 'not available'}?`,
        confirmText: nextActive ? 'Set Available' : 'Set Not Available',
        confirmClass: nextActive ? 'btn-success' : 'btn-warning',
        onConfirm: async () => {
            showLoading();
            try {
                const response = await apiRequest(
                    `/rooms/${id}/status?active=${nextActive}`,
                    'PUT',
                    null,
                    getToken()
                );

                if (response.success) {
                    clearApiCache('rooms:');
                    showAlert(`Room marked as ${nextActive ? 'available' : 'not available'}`, 'success');
                    loadRooms();
                } else {
                    showAlert('Failed to update room availability', 'danger');
                }
            } catch (error) {
                showAlert('Error: ' + error.message, 'danger');
            } finally {
                hideLoading();
            }
        }
    });
}

// Load Bookings
async function loadBookings(filter) {
    const activeFilter = normalizeBookingsFilter(filter);
    saveBookingsFilter(activeFilter);

    showLoading();
    try {
        let endpoint = '/bookings';
        if (activeFilter === 'CONFIRMED') {
            endpoint = '/bookings/status/confirmed';
        }

        const response = await apiRequest(endpoint, 'GET', null, getToken());

        if (response.success) {
            let bookings = response.data;

            // Filter bookings
            if (activeFilter === 'PENDING') {
                bookings = bookings.filter(b => b.status === 'PENDING');
            } else if (activeFilter === 'CHECKED_IN') {
                bookings = bookings.filter(b => b.status === 'CHECKED_IN');
            } else if (activeFilter === 'CHECKED_OUT') {
                bookings = bookings.filter(b => b.status === 'CHECKED_OUT');
            } else if (activeFilter === 'CANCELLED') {
                bookings = bookings.filter(b => b.status === 'CANCELLED');
            }

            displayBookings(bookings);
            updateFilterButtons(activeFilter);
        } else {
            showAlert('Failed to load bookings', 'danger');
        }
    } catch (error) {
        showAlert('Error loading bookings: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Update Filter Buttons
function updateFilterButtons(filter) {
    document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });

    const filterMap = {
        'ALL': 'filterAll',
        'PENDING': 'filterPending',
        'CONFIRMED': 'filterConfirmed',
        'CHECKED_IN': 'filterCheckedIn',
        'CHECKED_OUT': 'filterCheckedOut',
        'CANCELLED': 'filterCancelled'
    };

    const activeBtn = document.getElementById(filterMap[filter]);
    if (activeBtn) {
        activeBtn.classList.remove('btn-outline');
        activeBtn.classList.add('btn-primary');
    }
}

function getManagerVerificationInputs() {
    const operationEl = document.getElementById('bookingOtpOperation');
    const guestIdEl = document.getElementById('bookingGuestId');
    const otpEl = document.getElementById('bookingGuestOtp');

    const operation = String(operationEl?.value || 'CHECKIN').trim().toUpperCase();
    const guestAccessId = String(guestIdEl?.value || '').trim();
    const otp = String(otpEl?.value || '').trim();

    return {
        operation,
        guestAccessId,
        otp
    };
}

function validateManagerVerificationInputs({ guestAccessId, otp }) {
    if (!/^\d{7}$/.test(guestAccessId)) {
        showAlert('Guest ID must be exactly 7 digits.', 'warning');
        return false;
    }

    if (!/^\d{6}$/.test(otp)) {
        showAlert('OTP must be exactly 6 digits.', 'warning');
        return false;
    }

    return true;
}

function syncOperationInputForStatus(status) {
    const operationEl = document.getElementById('bookingOtpOperation');
    if (!operationEl) return;

    if (status === 'CONFIRMED') {
        operationEl.value = 'CHECKIN';
    } else if (status === 'CHECKED_IN') {
        operationEl.value = 'CHECKOUT';
    }
}

async function verifyBookingForManager() {
    const verifyBtn = document.querySelector('.booking-verify-actions .btn');
    const payload = getManagerVerificationInputs();

    if (!validateManagerVerificationInputs(payload)) {
        return;
    }

    await withButtonLoading(verifyBtn, async () => {
        showLoading();
        try {
            const response = await apiRequest('/bookings/verify-otp', 'POST', payload, getToken());
            if (!response.success || !response.data) {
                throw new Error(response.message || 'Booking verification failed');
            }

            currentBookingDetail = response.data;
            displayBookingModal(response.data);
            showAlert('Booking verified successfully. You can proceed with manager action.', 'success');
            loadBookingOtpAuditEvents();
        } catch (error) {
            showAlert('Verification failed: ' + error.message, 'danger');
            loadBookingOtpAuditEvents();
        } finally {
            hideLoading();
        }
    }, 'Verifying...');
}

function formatAuditTimestamp(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function getAuditResultBadge(success) {
    return success
        ? '<span class="badge badge-success">Success</span>'
        : '<span class="badge badge-danger">Failed</span>';
}

async function loadBookingOtpAuditEvents() {
    const tbody = document.getElementById('bookingOtpAuditTable');
    if (!tbody) return;

    try {
        const response = await apiRequest('/bookings/otp-audit?limit=25', 'GET', null, getToken());
        const events = response.success && Array.isArray(response.data) ? response.data : [];

        if (!events.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No audit events yet</td></tr>';
            return;
        }

        tbody.innerHTML = events.map((event) => `
            <tr>
                <td>${escapeHtml(formatAuditTimestamp(event.timestamp))}</td>
                <td>${escapeHtml(event.operation || 'N/A')}</td>
                <td>${escapeHtml(event.actor || 'N/A')}</td>
                <td>${escapeHtml(event.bookingId || 'N/A')}</td>
                <td>${escapeHtml(event.guestIdMask || 'N/A')}</td>
                <td>${getAuditResultBadge(Boolean(event.success))}</td>
                <td>${escapeHtml(event.detail || 'N/A')}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Could not load audit events: ${escapeHtml(error.message || 'Unknown error')}</td></tr>`;
    }
}

// Display Bookings
function displayBookings(bookings) {
    const tbody = document.getElementById('bookingsTable');

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No bookings found</td></tr>';
        return;
    }

    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td>#${booking.id}</td>
            <td>${booking.customerName}</td>
            <td>Room ${booking.roomNumber}</td>
            <td>${formatDate(booking.checkIn)}</td>
            <td>${formatDate(booking.checkOut)}</td>
            <td>${formatCurrency(booking.totalAmount)}</td>
            <td>${getStatusBadge(booking.status)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewBookingDetails(${booking.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

// View Booking Details
async function viewBookingDetails(bookingId) {
    showLoading();
    try {
        const response = await apiRequest(`/bookings/${bookingId}`, 'GET', null, getToken());

        if (response.success) {
            currentBookingDetail = response.data;
            displayBookingModal(response.data);
        } else {
            showAlert('Failed to load booking details', 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Display Booking Modal
function displayBookingModal(booking) {
    const details = document.getElementById('bookingDetails');
    details.innerHTML = `
        <div class="flex-between mb-3">
            <span><strong>Booking ID:</strong></span>
            <span>#${booking.id}</span>
        </div>
        <div class="flex-between mb-3">
            <span><strong>Status:</strong></span>
            <span>${getStatusBadge(booking.status)}</span>
        </div>
        <hr>
        <div class="mb-3">
            <h4>Customer Information</h4>
            <div class="flex-between mb-2">
                <span>Name:</span>
                <span>${booking.customerName}</span>
            </div>
            <div class="flex-between mb-2">
                <span>Email:</span>
                <span>${booking.customerEmail}</span>
            </div>
            <div class="flex-between mb-2">
                <span>Phone:</span>
                <span>${booking.customerPhone}</span>
            </div>
            <div class="flex-between mb-2">
                <span>Guest ID:</span>
                <span>${escapeHtml(booking.guestAccessId || 'Not generated')}</span>
            </div>
        </div>
        <hr>
        <div class="mb-3">
            <h4>Room & Dates</h4>
            <div class="flex-between mb-2">
                <span>Room:</span>
                <span>Room ${booking.roomNumber}</span>
            </div>
            <div class="flex-between mb-2">
                <span>Check-in:</span>
                <span>${formatDate(booking.checkIn)}</span>
            </div>
            <div class="flex-between mb-2">
                <span>Check-out:</span>
                <span>${formatDate(booking.checkOut)}</span>
            </div>
        </div>
        <hr>
        <div class="mb-3">
            <h4>Payment Information</h4>
            <div class="flex-between mb-2">
                <span>Total Amount:</span>
                <span><strong>${formatCurrency(booking.totalAmount)}</strong></span>
            </div>
            <div class="flex-between mb-2">
                <span>Payment Status:</span>
                <span>${getStatusBadge(booking.paymentStatus)}</span>
            </div>
            ${booking.paymentId ? `
            <div class="flex-between">
                <span>Payment ID:</span>
                <span>${booking.paymentId}</span>
            </div>
            ` : ''}
        </div>
    `;

    updateBookingActionButtons(booking.status);
    syncOperationInputForStatus(booking.status);

    openAdminModal('bookingModal', { focusSelector: '#confirmBookingBtn' });
}

function updateBookingActionButtons(status) {
    const confirmBtn = document.getElementById('confirmBookingBtn');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cancelBtn = document.getElementById('cancelBookingBtn');

    [confirmBtn, checkInBtn, checkoutBtn, cancelBtn].forEach(btn => {
        if (btn) btn.style.display = 'none';
    });

    if (status === 'PENDING') {
        if (confirmBtn) confirmBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
    } else if (status === 'CONFIRMED') {
        if (checkInBtn) checkInBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
    } else if (status === 'CHECKED_IN') {
        if (checkoutBtn) checkoutBtn.style.display = 'inline-block';
    }
}

// Close Booking Modal
function closeBookingModal() {
    closeAdminModal('bookingModal');
}

async function loadCustomers() {
    showLoading();
    try {
        const response = await apiRequest('/customers', 'GET', null, getToken());
        if (!response.success || !Array.isArray(response.data)) {
            showAlert('Failed to load customers', 'danger');
            return;
        }

        const tbody = document.getElementById('customersTable');
        if (!tbody) return;

        if (response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No customers found</td></tr>';
            return;
        }

        tbody.innerHTML = response.data.map(c => `
            <tr>
                <td>#${c.id}</td>
                <td>${escapeHtml(c.name || 'N/A')}</td>
                <td>${escapeHtml(c.email || 'N/A')}</td>
                <td>${escapeHtml(c.phone || 'N/A')}</td>
                <td>${c.verified ? getStatusBadge('CONFIRMED') : '<span class="badge badge-warning">No</span>'}</td>
                <td>${c.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
                <td>
                    <button class="btn btn-sm ${c.active ? 'btn-warning' : 'btn-success'}" onclick="toggleCustomerStatus(${c.id}, ${!c.active})">
                        <i class="fas ${c.active ? 'fa-user-slash' : 'fa-user-check'}"></i> ${c.active ? 'Disable' : 'Enable'}
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showAlert('Error loading customers: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

async function toggleCustomerStatus(customerId, active) {
    const actionLabel = active ? 'enable' : 'disable';
    showConfirmActionModal({
        title: `${active ? 'Enable' : 'Disable'} Customer`,
        message: `Are you sure you want to ${actionLabel} this customer?`,
        confirmText: active ? 'Enable Customer' : 'Disable Customer',
        confirmClass: active ? 'btn-success' : 'btn-destructive',
        onConfirm: async () => {
            showLoading();
            try {
                const response = await apiRequest(
                    `/customers/${customerId}/status?active=${active}`,
                    'PUT',
                    null,
                    getToken()
                );

                if (response.success) {
                    showAlert(`Customer ${active ? 'enabled' : 'disabled'} successfully`, 'success');
                    loadCustomers();
                } else {
                    showAlert('Failed to update customer status', 'danger');
                }
            } catch (error) {
                showAlert('Error updating customer status: ' + error.message, 'danger');
            } finally {
                hideLoading();
            }
        }
    });
}

async function loadWebsiteSettingsAdmin() {
    showLoading();
    try {
        const response = await apiRequest('/settings', 'GET', null, getToken());
        if (!response.success || !response.data) {
            showAlert('Failed to load website settings', 'danger');
            return;
        }

        currentWebsiteSettings = response.data;
        setInputValue('settingBrandName', currentWebsiteSettings['site.brandName']);
        setInputValue('settingHeroTitle', currentWebsiteSettings['hero.title']);
        setInputValue('settingHeroSubtitle', currentWebsiteSettings['hero.subtitle']);
        setInputValue('settingMetricHotels', currentWebsiteSettings['hero.metric.hotels']);
        setInputValue('settingMetricSupport', currentWebsiteSettings['hero.metric.support']);
        setInputValue('settingMetricHappy', currentWebsiteSettings['hero.metric.happy']);
        setInputValue('settingOffer1Title', currentWebsiteSettings['offer.1.title']);
        setInputValue('settingOffer1Desc', currentWebsiteSettings['offer.1.desc']);
        setInputValue('settingOffer2Title', currentWebsiteSettings['offer.2.title']);
        setInputValue('settingOffer2Desc', currentWebsiteSettings['offer.2.desc']);
        setInputValue('settingOffer3Title', currentWebsiteSettings['offer.3.title']);
        setInputValue('settingOffer3Desc', currentWebsiteSettings['offer.3.desc']);
    } catch (error) {
        showAlert('Error loading website settings: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) {
        input.value = value || '';
    }
}

async function saveWebsiteSettings() {
    const saveBtn = document.getElementById('saveWebsiteSettingsBtn');
    const settings = {
        'site.brandName': document.getElementById('settingBrandName')?.value?.trim() || 'Vital Stays',
        'hero.title': document.getElementById('settingHeroTitle')?.value?.trim() || 'Book Your Perfect Stay',
        'hero.subtitle': document.getElementById('settingHeroSubtitle')?.value?.trim() || '',
        'hero.metric.hotels': document.getElementById('settingMetricHotels')?.value?.trim() || '',
        'hero.metric.support': document.getElementById('settingMetricSupport')?.value?.trim() || '',
        'hero.metric.happy': document.getElementById('settingMetricHappy')?.value?.trim() || '',
        'offer.1.title': document.getElementById('settingOffer1Title')?.value?.trim() || '',
        'offer.1.desc': document.getElementById('settingOffer1Desc')?.value?.trim() || '',
        'offer.2.title': document.getElementById('settingOffer2Title')?.value?.trim() || '',
        'offer.2.desc': document.getElementById('settingOffer2Desc')?.value?.trim() || '',
        'offer.3.title': document.getElementById('settingOffer3Title')?.value?.trim() || '',
        'offer.3.desc': document.getElementById('settingOffer3Desc')?.value?.trim() || ''
    };

    await withButtonLoading(saveBtn, async () => {
        showLoading();
        try {
            const response = await apiRequest('/settings', 'PUT', { settings }, getToken());
            if (response.success) {
                currentWebsiteSettings = response.data || settings;
                showAlert('Website settings saved successfully', 'success');
            } else {
                showAlert('Failed to save website settings', 'danger');
            }
        } catch (error) {
            showAlert('Error saving website settings: ' + error.message, 'danger');
        } finally {
            hideLoading();
        }
    }, 'Saving...');
}

// Checkout Booking
async function checkoutBooking() {
    if (!currentBookingDetail) return;

    const credentials = getManagerVerificationInputs();
    if (!validateManagerVerificationInputs(credentials)) {
        return;
    }

    showConfirmActionModal({
        title: 'Checkout Customer',
        message: 'Are you sure you want to checkout this customer?',
        confirmText: 'Checkout',
        confirmClass: 'btn-success',
        onConfirm: async () => {
            const checkoutBtn = document.getElementById('checkoutBtn');
            await withButtonLoading(checkoutBtn, async () => {
                showLoading();
                try {
                    const response = await apiRequest(
                        `/bookings/${currentBookingDetail.id}/checkout?guestAccessId=${encodeURIComponent(credentials.guestAccessId)}&otp=${encodeURIComponent(credentials.otp)}`,
                        'PUT',
                        null,
                        getToken()
                    );

                    if (response.success) {
                        showAlert('Customer checked out successfully', 'success');
                        closeBookingModal();
                        loadBookings('ALL');
                        loadBookingOtpAuditEvents();
                    } else {
                        showAlert('Failed to checkout: ' + response.message, 'danger');
                        loadBookingOtpAuditEvents();
                    }
                } catch (error) {
                    showAlert('Error: ' + error.message, 'danger');
                    loadBookingOtpAuditEvents();
                } finally {
                    hideLoading();
                }
            }, 'Checking out...');
        }
    });
}

async function checkInBooking() {
    if (!currentBookingDetail) return;

    const credentials = getManagerVerificationInputs();
    if (!validateManagerVerificationInputs(credentials)) {
        return;
    }

    showConfirmActionModal({
        title: 'Check In Customer',
        message: 'Mark this booking as checked in?',
        confirmText: 'Check In',
        confirmClass: 'btn-info',
        onConfirm: async () => {
            const checkInBtn = document.getElementById('checkInBtn');
            await withButtonLoading(checkInBtn, async () => {
                showLoading();
                try {
                    const response = await apiRequest(
                        `/bookings/${currentBookingDetail.id}/checkin?guestAccessId=${encodeURIComponent(credentials.guestAccessId)}&otp=${encodeURIComponent(credentials.otp)}`,
                        'PUT',
                        null,
                        getToken()
                    );

                    if (response.success) {
                        showAlert('Customer checked in successfully', 'success');
                        closeBookingModal();
                        loadBookings('ALL');
                        loadBookingOtpAuditEvents();
                    } else {
                        showAlert('Failed to check in: ' + response.message, 'danger');
                        loadBookingOtpAuditEvents();
                    }
                } catch (error) {
                    showAlert('Error: ' + error.message, 'danger');
                    loadBookingOtpAuditEvents();
                } finally {
                    hideLoading();
                }
            }, 'Checking in...');
        }
    });
}

async function confirmBookingAction() {
    if (!currentBookingDetail) return;

    showInputActionModal({
        title: 'Confirm Booking',
        message: 'Enter the payment ID or transaction reference to confirm this booking.',
        label: 'Payment ID / Transaction Reference',
        placeholder: 'e.g. pay_1234567890',
        confirmText: 'Confirm Booking',
        onConfirm: async (paymentId) => {
            const confirmBtn = document.getElementById('confirmBookingBtn');
            await withButtonLoading(confirmBtn, async () => {
                showLoading();
                try {
                    const response = await apiRequest(
                        `/bookings/${currentBookingDetail.id}/confirm?paymentId=${encodeURIComponent(paymentId)}`,
                        'PUT',
                        null,
                        getToken()
                    );

                    if (response.success) {
                        showAlert('Booking confirmed successfully', 'success');
                        closeBookingModal();
                        loadBookings('ALL');
                    } else {
                        showAlert('Failed to confirm booking: ' + response.message, 'danger');
                    }
                } catch (error) {
                    showAlert('Error: ' + error.message, 'danger');
                } finally {
                    hideLoading();
                }
            }, 'Confirming...');
        }
    });
}

async function cancelBookingAction() {
    if (!currentBookingDetail) return;

    showConfirmActionModal({
        title: 'Cancel Booking',
        message: 'Are you sure you want to cancel this booking?',
        confirmText: 'Cancel Booking',
        confirmClass: 'btn-destructive',
        onConfirm: async () => {
            const cancelBtn = document.getElementById('cancelBookingBtn');
            await withButtonLoading(cancelBtn, async () => {
                showLoading();
                try {
                    const response = await apiRequest(
                        `/bookings/${currentBookingDetail.id}/cancel`,
                        'PUT',
                        null,
                        getToken()
                    );

                    if (response.success) {
                        showAlert('Booking cancelled successfully', 'success');
                        closeBookingModal();
                        loadBookings('ALL');
                    } else {
                        showAlert('Failed to cancel booking: ' + response.message, 'danger');
                    }
                } catch (error) {
                    showAlert('Error: ' + error.message, 'danger');
                } finally {
                    hideLoading();
                }
            }, 'Cancelling...');
        }
    });
}

// Logout
function logout() {
    showConfirmActionModal({
        title: 'Logout',
        message: 'Are you sure you want to logout from the admin panel?',
        confirmText: 'Logout',
        confirmClass: 'btn-destructive',
        onConfirm: async () => {
            removeToken();
            window.location.href = 'index.html';
        }
    });
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSidebar();
        closeRoomModal();
        closeBookingModal();
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'roomModal') {
        closeRoomModal();
    }
    if (e.target.id === 'bookingModal') {
        closeBookingModal();
    }
});
