// Customer Page Functions
let currentBooking = null;
let selectedRoom = null;
let pendingBookingAfterLogin = false;
let pendingSearchAfterLogin = null;
let currentUser = null;
let isSearchingRooms = false;
let forgotOtpCountdownInterval = null;

const USER_SESSION_KEY = 'hotelCurrentUser';
const CUSTOMER_PHONE_CACHE_KEY = 'hotelCurrentUserPhone';
const SIGNUP_OTP_KEY = 'hotelSignupOtpChallenge';
const FORGOT_PASSWORD_EMAIL_KEY = 'hotelForgotPasswordEmail';
const BOOKING_CANCELLATION_REASON_KEY = 'hotelBookingCancellationReasons';
const FORGOT_OTP_COOLDOWN_SECONDS = 60;
const BACKEND_HEALTH_CHECK_INTERVAL_MS = 15000;
const GOOGLE_AUTH_SETTING_KEY = 'auth.google.clientId';
const MERCHANT_UPI_ID = 'vitalhotel@upi';
const MERCHANT_NAME = 'Vital Hotel';
const ROOM_CACHE_TTL_MS = 45000;
const DEFAULT_COUNTRY_CODE = '91';
const CUSTOMER_ASSET_PREFIX = window.location.pathname.includes('/page/') ? '../' : '';
const IS_INNER_CUSTOMER_PAGE = window.location.pathname.includes('/page/');
const PROFILE_PLACEHOLDER_IMAGE = `${CUSTOMER_ASSET_PREFIX}img/profile-placeholder.svg`;
const PROFILE_CROP_SIZE = 320;
const CUSTOMER_ACTIVE_SECTION_KEY = 'hotelCustomerActiveSection';
const ROOM_SEARCH_STATE_KEY = 'hotelRoomSearchState';
const POST_LOGIN_REDIRECT_KEY = 'hotelPostLoginRedirect';
const PAGE_TRANSITION_SESSION_KEY = 'hotelPageTransitionPendingAt';
const PAGE_TRANSITION_MAX_AGE_MS = 6000;
const PAGE_TRANSITION_MIN_VISIBLE_MS = 420;
const PAGE_TRANSITION_NAV_DELAY_MS = 170;
const AUTH_FLOW_MIN_VISIBLE_MS = 360;
const MODAL_FOCUSABLE_SELECTOR = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SUPPORTED_COUNTRY_CODES = ['977', '971', '880', '861', '852', '853', '886', '65', '61', '60', '49', '47', '46', '45', '44', '41', '39', '34', '33', '31', '94', '91', '86', '82', '81', '66', '7', '1'];
const COUNTRY_PHONE_LENGTH_RULES = {
    '1': { min: 10, max: 10 },
    '7': { min: 10, max: 10 },
    '31': { min: 9, max: 9 },
    '33': { min: 9, max: 9 },
    '34': { min: 9, max: 9 },
    '39': { min: 9, max: 10 },
    '41': { min: 9, max: 9 },
    '44': { min: 10, max: 10 },
    '45': { min: 8, max: 8 },
    '46': { min: 7, max: 10 },
    '47': { min: 8, max: 8 },
    '49': { min: 10, max: 11 },
    '60': { min: 9, max: 10 },
    '61': { min: 9, max: 9 },
    '65': { min: 8, max: 8 },
    '66': { min: 9, max: 9 },
    '81': { min: 10, max: 10 },
    '82': { min: 9, max: 10 },
    '86': { min: 11, max: 11 },
    '91': { min: 10, max: 10 },
    '94': { min: 9, max: 9 },
    '852': { min: 8, max: 8 },
    '853': { min: 8, max: 8 },
    '861': { min: 11, max: 11 },
    '880': { min: 10, max: 10 },
    '886': { min: 9, max: 9 },
    '971': { min: 9, max: 9 },
    '977': { min: 10, max: 10 }
};
let countryCodePickerEventsBound = false;
let googleClientId = '';
let googleButtonsInitialized = false;
let profileImageDraft = null;
let profileCropState = null;
let pendingCustomerConfirmAction = null;
let globalModalUxBound = false;
let accountMenuUxBound = false;
let pageTransitionLoader = null;
let pageTransitionHideTimeoutId = null;
let authFlowLoader = null;
let authFlowLoaderLabel = null;
let razorpaySdkLoadPromise = null;
const modalReturnFocusMap = new WeakMap();
const ROOM_IMAGES_BY_TYPE = {
    DELUXE: ['room10.jpg', 'room11.jpg', 'room12.jpg'],
    SUITE: ['room7.jpg', 'room8.jpg', 'room9.jpg'],
    FAMILY: ['room4.jpg', 'room5.jpg', 'room6.jpg'],
    STANDARD: ['room1.jpg', 'room2.jpg', 'room3.jpg']
};
const DEFAULT_ROOM_IMAGES = ['room13.jpg', 'cover.jpg'];

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

        resetSearchRoomsState();
    });
}

function setupBrandHomeRedirect() {
    const brandElements = document.querySelectorAll('.navbar-brand');
    if (!brandElements.length) {
        return;
    }

    const homePath = IS_INNER_CUSTOMER_PAGE ? '../' : 'index.html';
    const goHomeWithTransition = () => {
        sessionStorage.setItem(PAGE_TRANSITION_SESSION_KEY, String(Date.now()));
        document.body.classList.add('page-transition-leaving');
        showPageTransitionLoader();
        window.setTimeout(() => {
            window.location.href = homePath;
        }, PAGE_TRANSITION_NAV_DELAY_MS);
    };

    brandElements.forEach((brand) => {
        if (brand.dataset.homeBound === 'true' || brand.closest('a[href]')) {
            return;
        }

        brand.dataset.homeBound = 'true';
        brand.classList.add('brand-home-link');
        brand.setAttribute('role', 'link');
        brand.setAttribute('tabindex', '0');
        brand.setAttribute('aria-label', 'Go to home');

        brand.addEventListener('click', () => {
            goHomeWithTransition();
        });

        brand.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                goHomeWithTransition();
            }
        });
    });
}

function ensureAuthFlowLoader() {
    if (authFlowLoader && authFlowLoader.isConnected) {
        return authFlowLoader;
    }

    authFlowLoader = document.createElement('div');
    authFlowLoader.className = 'auth-flow-loader';
    authFlowLoader.setAttribute('aria-hidden', 'true');
    authFlowLoader.innerHTML = '<div class="auth-flow-loader-chip"><span class="auth-flow-loader-spinner" aria-hidden="true"></span><span class="auth-flow-loader-label">Please wait...</span></div>';
    document.body.appendChild(authFlowLoader);
    authFlowLoaderLabel = authFlowLoader.querySelector('.auth-flow-loader-label');
    return authFlowLoader;
}

function showAuthFlowLoader(labelText = 'Please wait...') {
    const loader = ensureAuthFlowLoader();
    if (authFlowLoaderLabel) {
        authFlowLoaderLabel.textContent = String(labelText || 'Please wait...');
    }

    document.body.classList.add('auth-flow-pending');
    showPageTransitionLoader();
    loader.classList.add('active');
}

function hideAuthFlowLoader() {
    document.body.classList.remove('auth-flow-pending');
    if (authFlowLoader) {
        authFlowLoader.classList.remove('active');
    }
    hidePageTransitionLoader();
}

function runAuthFlowTransition(labelText = 'Please wait...') {
    showAuthFlowLoader(labelText);
    return new Promise((resolve) => {
        window.setTimeout(() => {
            hideAuthFlowLoader();
            resolve();
        }, AUTH_FLOW_MIN_VISIBLE_MS);
    });
}

function navigateWithAuthTransition(url, labelText = 'Please wait...') {
    const destination = String(url || '').trim();
    if (!destination) {
        return false;
    }

    showAuthFlowLoader(labelText);
    sessionStorage.setItem(PAGE_TRANSITION_SESSION_KEY, String(Date.now()));
    window.setTimeout(() => {
        window.location.href = destination;
    }, PAGE_TRANSITION_NAV_DELAY_MS);

    return true;
}

function getBookingCancellationReasonMap() {
    try {
        const raw = localStorage.getItem(BOOKING_CANCELLATION_REASON_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        return {};
    }
}

function saveBookingCancellationReasonMap(map) {
    localStorage.setItem(BOOKING_CANCELLATION_REASON_KEY, JSON.stringify(map || {}));
}

function setBookingCancellationReason(bookingId, reasonText) {
    if (!bookingId || !reasonText) return;

    const map = getBookingCancellationReasonMap();
    map[String(bookingId)] = String(reasonText).trim();
    saveBookingCancellationReasonMap(map);
}

function getBookingCancellationReason(booking) {
    if (!booking) return '';

    const directReason = String(booking.cancellationReason || booking.cancelReason || booking.cancellationNote || '').trim();
    if (directReason) {
        return directReason;
    }

    const map = getBookingCancellationReasonMap();
    const storedReason = map[String(booking.id)] || '';
    return String(storedReason).trim();
}

function formatCancellationReason(reasonText) {
    const normalized = String(reasonText || '').trim();
    if (!normalized) {
        return 'This booking was cancelled and the room has been released.';
    }

    return normalized;
}

function normalizeBookingStatus(status) {
    return String(status || '').trim().toUpperCase().replace(/-/g, '_');
}

function parseBookingDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed;
}

function formatBookingDateLine(value) {
    const parsed = parseBookingDate(value);
    if (!parsed) {
        return 'Date unavailable';
    }

    return parsed.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatBookingTimeLine(value) {
    const parsed = parseBookingDate(value);
    if (!parsed) {
        return '';
    }

    return parsed.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatBookingMoment(value) {
    const parsed = parseBookingDate(value);
    if (!parsed) {
        return '';
    }

    return `${formatBookingDateLine(parsed)} at ${formatBookingTimeLine(parsed)}`;
}

function isBookingCancellationAllowed(booking, now = new Date()) {
    if (!booking) return false;

    const status = normalizeBookingStatus(booking.status);
    if (status !== 'CONFIRMED') {
        return false;
    }

    const checkInDate = parseBookingDate(booking.checkIn);
    if (!checkInDate) {
        return false;
    }

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const bookingCheckIn = new Date(checkInDate);
    bookingCheckIn.setHours(0, 0, 0, 0);

    // Only allow cancellation strictly before check-in day starts.
    return bookingCheckIn > today;
}

document.addEventListener('DOMContentLoaded', () => {
    setupPageTransitionLoader();
    setupBrandHomeRedirect();
    setMinDates();
    setupUserAuthForms();
    setupProfileForms();
    setupProfileCropper();
    setupPasswordToggles();
    setupAdminLoginForm();
    setupGlobalModalUX();
    setupAccountMenuUX();
    setupCustomerFormValidation();
    initializeCountryCodeDisplays();
    setupPhoneLengthHelpers();
    loadWebsiteSettings();
    hydrateUserSession();
    initializeBackendHealthIndicator();
});

function setBackendHealthState(state, label) {
    const badgePairs = [
        {
            badge: document.getElementById('backendHealthBadge'),
            text: document.getElementById('backendHealthLabel')
        },
        {
            badge: document.getElementById('mobileBackendHealthBadge'),
            text: document.getElementById('mobileBackendHealthLabel')
        }
    ];

    badgePairs.forEach(({ badge, text }) => {
        if (!badge || !text) return;
        badge.classList.remove('online', 'offline', 'checking');
        badge.classList.add(state);
        text.textContent = label;
    });
}

async function checkBackendHealth() {
    setBackendHealthState('checking', 'Checking API');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
        const response = await fetch(`${API_BASE_URL}/rooms/available`, {
            method: 'GET',
            signal: controller.signal
        });

        if (response.ok) {
            setBackendHealthState('online', 'API Online');
            return;
        }

        setBackendHealthState('offline', `API ${response.status}`);
    } catch (error) {
        setBackendHealthState('offline', 'API Offline');
    } finally {
        clearTimeout(timeoutId);
    }
}

function initializeBackendHealthIndicator() {
    checkBackendHealth();

    window.setInterval(() => {
        checkBackendHealth();
    }, BACKEND_HEALTH_CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkBackendHealth();
        }
    });
}

async function loadWebsiteSettings() {
    try {
        const response = await apiRequest('/settings/public', 'GET', null, null, { useAuth: false });
        if (!response.success || !response.data) return;

        googleClientId = response.data[GOOGLE_AUTH_SETTING_KEY] || '';

        document.querySelectorAll('[data-setting-key]').forEach((el) => {
            const key = el.getAttribute('data-setting-key');
            const value = response.data[key];
            if (typeof value === 'string' && value.length > 0) {
                el.textContent = value;
            }
        });

        maybeRenderGoogleAuthButton();
    } catch (error) {
        // Keep defaults when settings cannot be loaded.
    }
}

function maybeRenderGoogleAuthButton() {
    const targets = [
        { wrapperId: 'googleSignupBlock', containerId: 'googleSignupButton', text: 'continue_with', theme: 'filled_black' },
        { wrapperId: 'googleLoginBlock', containerId: 'googleLoginButton', text: 'continue_with', theme: 'filled_black' }
    ];

    if (!googleClientId || !window.google || !window.google.accounts || !window.google.accounts.id) {
        if (!googleClientId) {
            targets.forEach((target) => {
                const wrapper = document.getElementById(target.wrapperId);
                if (wrapper) {
                    wrapper.style.display = 'none';
                }
            });
        }
        return;
    }

    if (!googleButtonsInitialized) {
        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            cancel_on_tap_outside: true
        });
        googleButtonsInitialized = true;
    }

    targets.forEach((target) => {
        const wrapper = document.getElementById(target.wrapperId);
        const container = document.getElementById(target.containerId);

        if (!wrapper || !container || container.dataset.googleRendered === 'true') {
            return;
        }

        wrapper.style.display = 'block';
        container.innerHTML = '';

        const buttonWidth = Math.max(260, Math.min(320, container.clientWidth || 320));

        window.google.accounts.id.renderButton(container, {
            theme: target.theme,
            size: 'large',
            text: target.text,
            shape: 'pill',
            logo_alignment: 'left',
            width: buttonWidth
        });

        container.dataset.googleRendered = 'true';
    });
}

function initializeGoogleAuth() {
    maybeRenderGoogleAuthButton();
}

function extractAuthToken(payload) {
    const candidates = [
        payload?.data?.token,
        payload?.token,
        payload?.data?.accessToken,
        payload?.accessToken,
        payload?.data?.jwt,
        payload?.jwt
    ];

    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
}

function storeAuthTokenFromResponse(payload, missingTokenMessage) {
    const token = extractAuthToken(payload);
    if (!token) {
        throw new Error(missingTokenMessage || 'Authentication token missing from server response.');
    }

    setToken(token);
    return token;
}

async function handleGoogleCredentialResponse(response) {
    const alertContainerId = isModalOpen('userLoginModal') ? 'userLoginAlert' : 'userSignupAlert';
    const credential = response && response.credential;
    if (!credential) {
        showAlert('Google sign-in did not return a credential.', 'danger', {
            containerId: alertContainerId,
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    showLoading();
    try {
        const apiResponse = await apiRequest(
            '/auth/customer/google',
            'POST',
            { credential },
            null,
            { useAuth: false }
        );

        if (!apiResponse.success || !apiResponse.data) {
            throw new Error(apiResponse.message || 'Google sign-in failed');
        }

        storeAuthTokenFromResponse(apiResponse, 'Google sign-in succeeded but no session token was returned.');

        setCurrentUser({
            name: apiResponse.data.name,
            email: apiResponse.data.email,
            phone: apiResponse.data.phone,
            profileImageUrl: apiResponse.data.profileImageUrl || ''
        });

        await runAuthFlowTransition('Signing you in...');

        const signupForm = document.getElementById('userSignupForm');
        const loginForm = document.getElementById('userLoginForm');
        if (signupForm) signupForm.reset();
        if (loginForm) loginForm.reset();
        closeUserLoginModal();
        closeUserSignupModal();

        const resumedBooking = resumePendingBookingAfterAuth();
        if (!resumedBooking) {
            redirectAfterSuccessfulAuth();
        }
        showAlert(resumedBooking
            ? 'Signed in with Google. Continue your booking.'
            : 'Signed in with Google successfully', 'success');
    } catch (error) {
        showAlert(error.message || 'Google sign-in failed', 'danger', {
            containerId: alertContainerId,
            replace: true,
            autoCloseMs: 0
        });
    } finally {
        hideLoading();
    }
}

function openModal(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement && !modal.contains(activeEl)) {
        modalReturnFocusMap.set(modal, activeEl);
    }

    modal.classList.add('active');
    setModalAccessibility(modal, true);
    syncCustomerBodyScrollLock();
    window.requestAnimationFrame(() => focusModalDialog(modal, options.focusSelector));
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    setModalAccessibility(modal, false);
    syncCustomerBodyScrollLock();

    const returnFocusEl = modalReturnFocusMap.get(modal);
    if (returnFocusEl && document.contains(returnFocusEl)) {
        returnFocusEl.focus({ preventScroll: true });
    }
    modalReturnFocusMap.delete(modal);
}

function isModalOpen(modalId) {
    const modal = document.getElementById(modalId);
    return !!(modal && modal.classList.contains('active'));
}

function getActiveCustomerModals() {
    return Array.from(document.querySelectorAll('.modal.active'));
}

function syncCustomerBodyScrollLock() {
    document.body.style.overflow = getActiveCustomerModals().length ? 'hidden' : 'auto';
}

function setModalAccessibility(modal, isOpen) {
    if (!modal) return;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    ensureModalAriaAssociations(modal);
}

function ensureModalAriaAssociations(modal) {
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

function getFocusableNodes(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)).filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        return !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null;
    });
}

function focusModalDialog(modal, focusSelector) {
    if (!modal || !modal.classList.contains('active')) return;

    const modalContent = modal.querySelector('.modal-content') || modal;
    if (!modalContent.hasAttribute('tabindex')) {
        modalContent.setAttribute('tabindex', '-1');
    }

    const explicitTarget = focusSelector ? modal.querySelector(focusSelector) : null;
    const autofocusTarget = modal.querySelector('[autofocus]');
    const focusable = getFocusableNodes(modalContent);
    const target = explicitTarget || autofocusTarget || focusable[0] || modalContent;
    if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
    }
}

function trapFocusInModal(modal, event) {
    if (!modal || event.key !== 'Tab') return;

    const modalContent = modal.querySelector('.modal-content') || modal;
    const focusable = getFocusableNodes(modalContent);
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

function setupGlobalModalUX() {
    if (globalModalUxBound) {
        return;
    }

    document.querySelectorAll('.modal').forEach((modal) => {
        setModalAccessibility(modal, modal.classList.contains('active'));
    });

    document.addEventListener('click', (event) => {
        const modalEl = event.target.closest('.modal.active');
        if (!modalEl) return;

        const clickedInsideDialog = event.target.closest('.modal-content');
        if (!clickedInsideDialog) {
            closeModal(modalEl.id);
        }
    });

    document.addEventListener('keydown', (event) => {
        const activeModals = getActiveCustomerModals();
        if (!activeModals.length) return;

        const topModal = activeModals[activeModals.length - 1];
        if (event.key === 'Escape') {
            closeModal(topModal.id);
            return;
        }

        trapFocusInModal(topModal, event);
    });

    globalModalUxBound = true;
}

function scrollToMyBookings() {
    saveCustomerSection('bookings');
    const section = document.getElementById('myBookingsSection');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToProfileSection(options = {}) {
    const behavior = options.behavior || 'smooth';
    const shouldPersist = options.persist !== false;

    if (!currentUser) {
        showAlert('Please login to view and manage your profile.', 'info');
        showUserLoginModal();
        return;
    }

    if (shouldPersist) {
        saveCustomerSection('profile');
    }

    const section = document.getElementById('profileSection');
    if (!section) return;
    section.scrollIntoView({ behavior, block: 'start' });
}

function isAccountMenuOpen() {
    const accountMenu = document.getElementById('accountMenu');
    return Boolean(accountMenu && accountMenu.classList.contains('active'));
}

function toggleAccountMenu(forceOpen) {
    if (forceOpen !== false && !currentUser) {
        showUserLoginModal();
        return;
    }

    const profileBtn = document.getElementById('userProfileBtn');
    const accountMenu = document.getElementById('accountMenu');
    if (!profileBtn || !accountMenu) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !accountMenu.classList.contains('active');
    accountMenu.classList.toggle('active', shouldOpen);
    accountMenu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    profileBtn.classList.toggle('menu-open', shouldOpen);
    profileBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function closeAccountMenu() {
    toggleAccountMenu(false);
}

function getCustomerPagePath(pageFile) {
    return IS_INNER_CUSTOMER_PAGE ? pageFile : `page/${pageFile}`;
}

function normalizePostLoginRedirectUrl(rawTarget) {
    const value = String(rawTarget || '').trim();
    if (!value) {
        return '';
    }

    try {
        const parsed = new URL(value, window.location.origin);
        if (parsed.origin !== window.location.origin) {
            return '';
        }

        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (error) {
        return '';
    }
}

function getPendingPostLoginRedirect() {
    try {
        const params = new URLSearchParams(window.location.search);
        const returnTo = normalizePostLoginRedirectUrl(params.get('returnTo'));
        if (returnTo) {
            return returnTo;
        }
    } catch (error) {
        // Ignore query parsing issues and fall back to session value.
    }

    const stored = normalizePostLoginRedirectUrl(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
    return stored || '';
}

function clearPendingPostLoginRedirect() {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
}

function redirectToLoginPageForBooking() {
    const returnTo = normalizePostLoginRedirectUrl(`${window.location.pathname}${window.location.search}`);
    if (returnTo) {
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, returnTo);
    }

    const loginPath = getCustomerPagePath('Login.html');
    const loginUrl = `${loginPath}?mode=login${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;
    navigateWithAuthTransition(loginUrl, 'Redirecting to login...');
}

function getCustomerHomePath() {
    return IS_INNER_CUSTOMER_PAGE ? '../' : './';
}

function getAdminPagePath() {
    return IS_INNER_CUSTOMER_PAGE ? '../admin.html' : 'admin.html';
}

function handleAccountMenuAction(action) {
    closeAccountMenu();

    if (action === 'profile') {
        window.location.href = getCustomerPagePath('profile.html');
        return;
    }

    if (action === 'bookings') {
        window.location.href = getCustomerPagePath('bookings.html');
        return;
    }

    if (action === 'support') {
        window.location.href = getCustomerPagePath('support-chat.html');
        return;
    }

    if (action === 'logout') {
        requestLogoutConfirmation();
    }
}

function handleMobileAccountAction(action) {
    closeMobileNav();
    handleAccountMenuAction(action);
}

function openSupportChannel() {
    const supportEmail = 'support@vitalstays.com';
    const subject = encodeURIComponent('Support Request - Vital Stays');
    const body = encodeURIComponent('Hi team,%0A%0AI need help with:%0A');
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
}

function setupAccountMenuUX() {
    if (accountMenuUxBound) {
        return;
    }

    document.addEventListener('click', (event) => {
        if (!isAccountMenuOpen()) return;

        const clickedInsideMenu = event.target.closest('#accountMenu');
        const clickedProfileButton = event.target.closest('#userProfileBtn');
        if (!clickedInsideMenu && !clickedProfileButton) {
            closeAccountMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth <= 991) {
            closeAccountMenu();
        }
    });

    accountMenuUxBound = true;
}

function toggleMobileNav() {
    const drawer = document.getElementById('mobileNavDrawer');
    const overlay = document.getElementById('mobileNavOverlay');
    if (!drawer || !overlay) return;

    const active = drawer.classList.toggle('active');
    overlay.classList.toggle('active', active);
    drawer.setAttribute('aria-hidden', active ? 'false' : 'true');
    closeAccountMenu();
    document.body.style.overflow = active ? 'hidden' : 'auto';
}

function closeMobileNav() {
    const drawer = document.getElementById('mobileNavDrawer');
    const overlay = document.getElementById('mobileNavOverlay');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('active');
    closeAccountMenu();
    document.body.style.overflow = 'auto';
}

function setCurrentUser(user) {
    if (!user) {
        currentUser = null;
        localStorage.removeItem(USER_SESSION_KEY);
        localStorage.removeItem(CUSTOMER_PHONE_CACHE_KEY);
        updateUserUi();
        loadMyBookings();
        return;
    }

    const normalizedPhone = normalizePersistedCustomerPhone(user.phone || getCachedCustomerPhone());
    currentUser = {
        ...user,
        phone: normalizedPhone
    };

    if (normalizedPhone) {
        localStorage.setItem(CUSTOMER_PHONE_CACHE_KEY, normalizedPhone);
    } else {
        localStorage.removeItem(CUSTOMER_PHONE_CACHE_KEY);
    }

    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
    window.setTimeout(() => {
        const resumedSearch = resumePendingSearchAfterAuth();
        if (!resumedSearch) {
            resumePendingBookingAfterAuth();
        }
    }, 0);
    updateUserUi();
    loadMyBookings();
}

function normalizePersistedCustomerPhone(phone) {
    const raw = String(phone || '').trim();
    if (!raw || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') {
        return '';
    }

    const digits = raw.replace(/\D/g, '');
    return digits || '';
}

function getCachedCustomerPhone() {
    return normalizePersistedCustomerPhone(localStorage.getItem(CUSTOMER_PHONE_CACHE_KEY));
}

function saveCustomerSection(sectionName) {
    const normalized = String(sectionName || '').trim().toLowerCase();
    const valid = new Set(['rooms', 'bookings', 'profile']);

    if (!valid.has(normalized)) {
        return;
    }

    localStorage.setItem(CUSTOMER_ACTIVE_SECTION_KEY, normalized);

    if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', `#${normalized}`);
    } else {
        window.location.hash = normalized;
    }
}

function getCustomerSectionFromState() {
    const hashSection = String(window.location.hash || '').replace('#', '').trim().toLowerCase();
    const savedSection = String(localStorage.getItem(CUSTOMER_ACTIVE_SECTION_KEY) || '').trim().toLowerCase();
    const valid = new Set(['rooms', 'bookings', 'profile']);

    if (valid.has(hashSection)) {
        return hashSection;
    }

    if (valid.has(savedSection)) {
        return savedSection;
    }

    return 'rooms';
}

function restoreCustomerSectionFromState() {
    const section = getCustomerSectionFromState();

    if (!IS_INNER_CUSTOMER_PAGE) {
        return;
    }

    if (!currentUser && (section === 'bookings' || section === 'profile')) {
        const roomsSection = document.getElementById('availableRoomsSection');
        if (roomsSection) {
            roomsSection.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        return;
    }

    if (section === 'bookings') {
        scrollToMyBookings();
        return;
    }

    if (section === 'profile') {
        if (currentUser) {
            scrollToProfileSection({ behavior: 'auto', persist: false });
        }
        return;
    }

    const roomsSection = document.getElementById('availableRoomsSection');
    if (roomsSection) {
        roomsSection.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
}

function getFirstName(fullName) {
    const trimmed = String(fullName || '').trim();
    if (!trimmed) return 'Guest';
    return trimmed.split(/\s+/)[0] || 'Guest';
}

function getUserInitials(fullName) {
    const firstName = getFirstName(fullName);
    const firstInitial = firstName.charAt(0).toUpperCase() || 'G';
    return firstInitial;
}

function setNavbarProfileBadge(fullName, avatarUrl) {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userProfileAvatar = document.getElementById('userProfileAvatar');
    const userProfileInitials = document.getElementById('userProfileInitials');
    const userFirstNameNav = document.getElementById('userFirstNameNav');
    const firstName = getFirstName(fullName);
    const initials = getUserInitials(fullName);
    const hasAvatar = Boolean(avatarUrl);

    if (userProfileBtn) {
        userProfileBtn.classList.toggle('has-image', hasAvatar);
        userProfileBtn.classList.toggle('no-image', !hasAvatar);
    }

    if (userProfileAvatar) {
        userProfileAvatar.src = avatarUrl || PROFILE_PLACEHOLDER_IMAGE;
        userProfileAvatar.alt = `${firstName} profile`;
        userProfileAvatar.onload = () => {
            if (userProfileBtn) {
                userProfileBtn.classList.add('has-image');
                userProfileBtn.classList.remove('no-image');
            }
        };
        userProfileAvatar.onerror = () => {
            userProfileAvatar.src = PROFILE_PLACEHOLDER_IMAGE;
            if (userProfileBtn) {
                userProfileBtn.classList.remove('has-image');
                userProfileBtn.classList.add('no-image');
            }
        };
    }

    if (userProfileInitials) {
        userProfileInitials.textContent = initials;
    }

    if (userFirstNameNav) {
        userFirstNameNav.textContent = firstName;
    }
}

function hydrateUserSession() {
    const saved = localStorage.getItem(USER_SESSION_KEY);
    let parsedUser = null;

    if (saved) {
        try {
            parsedUser = JSON.parse(saved);
        } catch (error) {
            localStorage.removeItem(USER_SESSION_KEY);
        }
    }

    if (parsedUser && !getToken()) {
        currentUser = null;
        localStorage.removeItem(USER_SESSION_KEY);
    } else {
        currentUser = parsedUser;
    }

    updateUserUi();

    if (currentUser && getToken()) {
        loadCustomerProfile(false);
    }

    loadMyBookings();
    window.setTimeout(restoreCustomerSectionFromState, 0);
}

function updateUserUi() {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userProfileAvatar = document.getElementById('userProfileAvatar');
    const userFirstNameNav = document.getElementById('userFirstNameNav');
    const loginBtn = document.getElementById('userLoginBtn');
    const signupBtn = document.getElementById('userSignupBtn');
    const logoutBtn = document.getElementById('userLogoutBtn');
    const availableRoomsSection = document.getElementById('availableRoomsSection');
    const profileSection = document.getElementById('profileSection');
    const myBookingsSection = document.getElementById('myBookingsSection');
    const desktopMyBookingsNavLink = document.getElementById('desktopMyBookingsNavLink');
    const adminPortalLink = document.querySelector('.admin-portal-link');
    const mobileGreeting = document.getElementById('mobileUserGreeting');
    const mobileLoginBtn = document.getElementById('mobileUserLoginBtn');
    const mobileSignupBtn = document.getElementById('mobileUserSignupBtn');
    const mobileLogoutBtn = document.getElementById('mobileUserLogoutBtn');
    const mobileProfileNavLink = document.getElementById('mobileProfileNavLink');
    const mobileMyBookingsNavLink = document.getElementById('mobileMyBookingsNavLink');
    const mobileAdminPortalLink = document.getElementById('mobileAdminPortalLink');

    if (!loginBtn || !signupBtn || !logoutBtn) return;

    if (currentUser) {
        document.body.classList.remove('guest-view');
        if (userProfileBtn) userProfileBtn.style.display = 'inline-flex';
        setNavbarProfileBadge(currentUser.name, currentUser.profileImageUrl);
        logoutBtn.style.display = 'none';
        if (availableRoomsSection) {
            const shouldShowRoomsSection = IS_INNER_CUSTOMER_PAGE;
            availableRoomsSection.style.display = shouldShowRoomsSection ? '' : 'none';
            availableRoomsSection.setAttribute('aria-hidden', shouldShowRoomsSection ? 'false' : 'true');
        }
        if (myBookingsSection) {
            myBookingsSection.style.display = '';
            myBookingsSection.setAttribute('aria-hidden', 'false');
        }
        if (profileSection) {
            profileSection.style.display = '';
            profileSection.setAttribute('aria-hidden', 'false');
        }
        if (desktopMyBookingsNavLink) desktopMyBookingsNavLink.style.display = '';
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        if (adminPortalLink) adminPortalLink.style.display = 'none';

        if (mobileGreeting) {
            mobileGreeting.textContent = `Hi, ${getFirstName(currentUser.name)}`;
            mobileGreeting.style.display = 'inline-flex';
        }
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'inline-flex';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
        if (mobileSignupBtn) mobileSignupBtn.style.display = 'none';
        if (mobileProfileNavLink) mobileProfileNavLink.style.display = '';
        if (mobileMyBookingsNavLink) mobileMyBookingsNavLink.style.display = '';
        if (mobileAdminPortalLink) mobileAdminPortalLink.style.display = 'none';

        prefillCustomerForm();
        populateProfileForm();
    } else {
        document.body.classList.add('guest-view');
        if (userProfileBtn) userProfileBtn.style.display = 'none';
        setNavbarProfileBadge('Guest', '');
        logoutBtn.style.display = 'none';
        closeAccountMenu();
        if (availableRoomsSection) {
            availableRoomsSection.style.display = 'none';
            availableRoomsSection.setAttribute('aria-hidden', 'true');
        }
        if (myBookingsSection) {
            myBookingsSection.style.display = 'none';
            myBookingsSection.setAttribute('aria-hidden', 'true');
        }
        if (profileSection) {
            profileSection.style.display = 'none';
            profileSection.setAttribute('aria-hidden', 'true');
        }
        if (desktopMyBookingsNavLink) desktopMyBookingsNavLink.style.display = 'none';
        loginBtn.style.display = 'inline-flex';
        signupBtn.style.display = 'inline-flex';
        if (adminPortalLink) adminPortalLink.style.display = 'inline';

        if (mobileGreeting) mobileGreeting.style.display = 'none';
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'inline-flex';
        if (mobileSignupBtn) mobileSignupBtn.style.display = 'inline-flex';
        if (mobileProfileNavLink) mobileProfileNavLink.style.display = 'none';
        if (mobileMyBookingsNavLink) mobileMyBookingsNavLink.style.display = 'none';
        if (mobileAdminPortalLink) mobileAdminPortalLink.style.display = 'inline';

        const profileForm = document.getElementById('profileForm');
        const profilePasswordForm = document.getElementById('profilePasswordForm');
        const profileImageName = document.getElementById('profileImageName');
        if (profileForm) profileForm.reset();
        if (profilePasswordForm) profilePasswordForm.reset();
        if (profileImageName) profileImageName.textContent = 'Guest';
        clearProfileAlerts();
        updateProfileImagePreview('');
        profileImageDraft = null;
    }
}

function clearProfileAlerts() {
    const profileAlert = document.getElementById('profileAlert');
    const passwordAlert = document.getElementById('profilePasswordAlert');
    if (profileAlert) profileAlert.innerHTML = '';
    if (passwordAlert) passwordAlert.innerHTML = '';
}

function setupProfileForms() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            updateCustomerProfile();
        });
    }

    const profilePasswordForm = document.getElementById('profilePasswordForm');
    if (profilePasswordForm) {
        profilePasswordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            updateCustomerPassword();
        });
    }

    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput) {
        profileImageInput.addEventListener('change', handleProfileImageSelection);
    }

    const profilePhoneInput = document.getElementById('profilePhone');
    const profileCountryCodeInput = document.getElementById('profileCountryCode');
    if (profilePhoneInput && profileCountryCodeInput) {
        const normalizeProfilePhoneField = () => {
            profilePhoneInput.value = normalizeLocalPhoneInput(profilePhoneInput.value, profileCountryCodeInput.value);
        };

        profilePhoneInput.addEventListener('input', normalizeProfilePhoneField);
        profileCountryCodeInput.addEventListener('change', normalizeProfilePhoneField);
    }
}

function setupProfileCropper() {
    const zoomInput = document.getElementById('profileCropZoom');
    const canvas = document.getElementById('profileCropCanvas');
    if (!zoomInput || !canvas) return;

    if (zoomInput.dataset.bound !== 'true') {
        zoomInput.addEventListener('input', () => {
            if (!profileCropState) return;
            const zoom = Number(zoomInput.value || '1');
            profileCropState.zoom = Number.isFinite(zoom) ? zoom : 1;
            clampProfileCropOffsets();
            renderProfileCropCanvas();
        });
        zoomInput.dataset.bound = 'true';
    }

    if (canvas.dataset.bound !== 'true') {
        canvas.addEventListener('pointerdown', handleCropPointerDown);
        canvas.addEventListener('pointermove', handleCropPointerMove);
        canvas.addEventListener('pointerup', handleCropPointerUp);
        canvas.addEventListener('pointercancel', handleCropPointerUp);
        canvas.addEventListener('pointerleave', handleCropPointerUp);
        canvas.dataset.bound = 'true';
    }
}

function populateProfileForm() {
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const countryCodeInput = document.getElementById('profileCountryCode');
    const profileImageName = document.getElementById('profileImageName');
    const firstName = currentUser && currentUser.name
        ? String(currentUser.name).trim().split(' ')[0]
        : 'Guest';
    const preferredPhone = getPreferredProfilePhone();
    if (nameInput) nameInput.value = currentUser ? (currentUser.name || '') : '';
    if (emailInput) emailInput.value = currentUser ? (currentUser.email || '') : '';
    if (phoneInput) {
        const splitPhone = splitInternationalPhone(preferredPhone);
        phoneInput.value = normalizeLocalPhoneInput(splitPhone.localNumber, splitPhone.countryCode);
        if (countryCodeInput) {
            countryCodeInput.value = splitPhone.countryCode;
            updateCountryCodeDisplay(countryCodeInput);
        }
    }
    if (profileImageName) {
        profileImageName.textContent = firstName || 'Guest';
    }
    updateProfileImagePreview(currentUser ? currentUser.profileImageUrl : '');
    profileImageDraft = null;
    setupPhoneLengthHelpers();
}

function updateProfileImagePreview(imageDataUrl) {
    const preview = document.getElementById('profileImagePreview');
    if (!preview) return;
    preview.src = imageDataUrl || PROFILE_PLACEHOLDER_IMAGE;
}

async function handleProfileImageSelection(event) {
    const input = event && event.target ? event.target : null;
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
        showAlert('Please choose a valid image file.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        input.value = '';
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showAlert('Image size must be 2 MB or less.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        input.value = '';
        return;
    }

    const sourceData = await readFileAsDataUrl(file);
    if (!sourceData) {
        showAlert('Could not read selected image. Please try another file.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        input.value = '';
        return;
    }

    if ((file.type || '').toLowerCase() === 'image/svg+xml') {
        profileImageDraft = sourceData;
        updateProfileImagePreview(sourceData);
        showAlert('SVG profile image is ready to save.', 'success', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 2200
        });
        return;
    }

    await openProfileCropModal(sourceData, file.type || 'image/jpeg');
}

function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
    });
}

async function openProfileCropModal(sourceDataUrl, preferredMimeType = 'image/jpeg') {
    const image = await loadImageFromDataUrl(sourceDataUrl);
    if (!image) {
        const fallback = await optimizeImageDataUrl(sourceDataUrl, preferredMimeType);
        if (!fallback) {
            showAlert('Could not process image for cropping.', 'danger', {
                containerId: 'profileAlert',
                replace: true,
                autoCloseMs: 0
            });
            return;
        }

        profileImageDraft = fallback;
        updateProfileImagePreview(fallback);
        showAlert('Profile image optimized and ready to save.', 'success', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 2200
        });
        return;
    }

    const baseScale = Math.max(
        PROFILE_CROP_SIZE / Math.max(1, Number(image.naturalWidth || image.width || 1)),
        PROFILE_CROP_SIZE / Math.max(1, Number(image.naturalHeight || image.height || 1))
    );

    profileCropState = {
        image,
        sourceDataUrl,
        preferredMimeType,
        zoom: 1,
        baseScale,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        pointerId: null,
        lastX: 0,
        lastY: 0
    };

    const zoomInput = document.getElementById('profileCropZoom');
    if (zoomInput) {
        zoomInput.value = '1';
    }

    const canvas = document.getElementById('profileCropCanvas');
    if (canvas) {
        canvas.width = PROFILE_CROP_SIZE;
        canvas.height = PROFILE_CROP_SIZE;
        canvas.classList.remove('dragging');
    }

    renderProfileCropCanvas();
    openModal('profileCropModal', { focusSelector: '#profileCropZoom' });
}

function closeProfileCropModal(resetInput = false) {
    closeModal('profileCropModal');

    const canvas = document.getElementById('profileCropCanvas');
    if (canvas) {
        canvas.classList.remove('dragging');
    }

    profileCropState = null;

    const input = document.getElementById('profileImageInput');
    if (input && (resetInput || input.value)) {
        input.value = '';
    }
}

function getProfileCropDimensions() {
    if (!profileCropState || !profileCropState.image) {
        return null;
    }

    const image = profileCropState.image;
    const imageWidth = Math.max(1, Number(image.naturalWidth || image.width || 1));
    const imageHeight = Math.max(1, Number(image.naturalHeight || image.height || 1));
    const drawScale = profileCropState.baseScale * profileCropState.zoom;

    return {
        drawWidth: imageWidth * drawScale,
        drawHeight: imageHeight * drawScale
    };
}

function clampProfileCropOffsets() {
    if (!profileCropState) return;

    const dimensions = getProfileCropDimensions();
    if (!dimensions) return;

    const maxX = Math.max(0, (dimensions.drawWidth - PROFILE_CROP_SIZE) / 2);
    const maxY = Math.max(0, (dimensions.drawHeight - PROFILE_CROP_SIZE) / 2);
    profileCropState.offsetX = Math.max(-maxX, Math.min(maxX, profileCropState.offsetX));
    profileCropState.offsetY = Math.max(-maxY, Math.min(maxY, profileCropState.offsetY));
}

function renderProfileCropCanvas() {
    if (!profileCropState || !profileCropState.image) return;

    const canvas = document.getElementById('profileCropCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clampProfileCropOffsets();

    const dimensions = getProfileCropDimensions();
    if (!dimensions) return;

    const drawX = (PROFILE_CROP_SIZE - dimensions.drawWidth) / 2 + profileCropState.offsetX;
    const drawY = (PROFILE_CROP_SIZE - dimensions.drawHeight) / 2 + profileCropState.offsetY;

    ctx.clearRect(0, 0, PROFILE_CROP_SIZE, PROFILE_CROP_SIZE);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, PROFILE_CROP_SIZE, PROFILE_CROP_SIZE);
    ctx.drawImage(profileCropState.image, drawX, drawY, dimensions.drawWidth, dimensions.drawHeight);
}

function handleCropPointerDown(event) {
    if (!profileCropState) return;
    const canvas = document.getElementById('profileCropCanvas');
    if (!canvas) return;

    profileCropState.dragging = true;
    profileCropState.pointerId = event.pointerId;
    profileCropState.lastX = event.clientX;
    profileCropState.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
}

function handleCropPointerMove(event) {
    if (!profileCropState || !profileCropState.dragging) return;
    if (profileCropState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - profileCropState.lastX;
    const deltaY = event.clientY - profileCropState.lastY;
    profileCropState.lastX = event.clientX;
    profileCropState.lastY = event.clientY;
    profileCropState.offsetX += deltaX;
    profileCropState.offsetY += deltaY;
    renderProfileCropCanvas();
}

function handleCropPointerUp(event) {
    if (!profileCropState) return;
    if (profileCropState.pointerId !== null && event.pointerId !== profileCropState.pointerId) return;

    const canvas = document.getElementById('profileCropCanvas');
    if (canvas && profileCropState.pointerId !== null && canvas.hasPointerCapture(profileCropState.pointerId)) {
        canvas.releasePointerCapture(profileCropState.pointerId);
    }

    profileCropState.dragging = false;
    profileCropState.pointerId = null;
    if (canvas) {
        canvas.classList.remove('dragging');
    }
}

async function applyProfileImageCrop() {
    if (!profileCropState) {
        closeProfileCropModal();
        return;
    }

    const applyBtn = document.getElementById('profileCropApplyBtn');
    await withButtonLoading(applyBtn, async () => {
        const canvas = document.getElementById('profileCropCanvas');
        if (!canvas) {
            throw new Error('Crop canvas unavailable');
        }

        const preferred = (profileCropState.preferredMimeType || '').toLowerCase() === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg';

        const croppedData = canvas.toDataURL(preferred, 0.9);
        const optimized = await optimizeImageDataUrl(croppedData, preferred, 480, 480, 300 * 1024);
        if (!optimized) {
            throw new Error('Could not optimize cropped image');
        }

        profileImageDraft = optimized;
        updateProfileImagePreview(optimized);
        closeProfileCropModal();

        showAlert('Profile image cropped and optimized. Click Save Profile to apply changes.', 'success', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 2600
        });
    }, 'Applying...').catch((error) => {
        showAlert(error.message || 'Could not apply image crop.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
    });
}

async function compressProfileImage(file) {
    if (!file || !(file.type || '').startsWith('image/')) {
        return '';
    }

    const sourceDataUrl = await readFileAsDataUrl(file);
    if (!sourceDataUrl) {
        return '';
    }

    // Keep SVG as-is because drawing it to canvas can strip vector behavior.
    if ((file.type || '').toLowerCase() === 'image/svg+xml') {
        return sourceDataUrl;
    }

    return optimizeImageDataUrl(sourceDataUrl, file.type || 'image/jpeg');
}

async function optimizeImageDataUrl(
    sourceDataUrl,
    preferredMimeType = 'image/jpeg',
    maxWidth = 720,
    maxHeight = 720,
    sizeBudgetBytes = 450 * 1024
) {
    const image = await loadImageFromDataUrl(sourceDataUrl);
    if (!image) {
        return sourceDataUrl;
    }

    const sourceWidth = Number(image.naturalWidth || image.width || 0);
    const sourceHeight = Number(image.naturalHeight || image.height || 0);
    if (!sourceWidth || !sourceHeight) {
        return sourceDataUrl;
    }

    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return sourceDataUrl;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const preferredType = String(preferredMimeType || '').toLowerCase() === 'image/webp' ? 'image/webp' : 'image/jpeg';
    let quality = 0.86;
    let output = canvas.toDataURL(preferredType, quality);

    while (dataUrlSizeBytes(output) > sizeBudgetBytes && quality > 0.54) {
        quality -= 0.08;
        output = canvas.toDataURL(preferredType, quality);
    }

    if (!output || !output.startsWith('data:image/')) {
        return sourceDataUrl;
    }

    return output;
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = dataUrl;
    });
}

function dataUrlSizeBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
        return 0;
    }

    const parts = dataUrl.split(',');
    if (parts.length < 2) {
        return dataUrl.length;
    }

    const base64 = parts[1];
    const padding = (base64.match(/=*$/) || [''])[0].length;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function removeProfileImage() {
    profileImageDraft = '';
    updateProfileImagePreview('');
    const input = document.getElementById('profileImageInput');
    if (input) input.value = '';
}

async function loadCustomerProfile(showError = true) {
    if (!currentUser) return;

    const token = getToken();
    if (!token) return;

    try {
        const response = await apiRequest('/auth/customer/me', 'GET', null, token);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Could not load profile');
        }

        setCurrentUser({
            ...currentUser,
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone || currentUser.phone || getCachedCustomerPhone() || '',
            profileImageUrl: response.data.profileImageUrl || ''
        });
    } catch (error) {
        if (showError) {
            showAlert(error.message || 'Could not load profile.', 'danger', {
                containerId: 'profileAlert',
                replace: true,
                autoCloseMs: 0
            });
        }
    }
}

async function updateCustomerProfile() {
    if (!currentUser) {
        showAlert('Please login to update profile.', 'warning', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const token = getToken();
    if (!token) {
        showAlert('Session expired. Please login again.', 'warning', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const name = String(document.getElementById('profileName')?.value || '').trim();
    const phoneRaw = String(document.getElementById('profilePhone')?.value || '').trim();
    const countryCodeRaw = String(document.getElementById('profileCountryCode')?.value || DEFAULT_COUNTRY_CODE);
    const normalizedCountryCode = countryCodeRaw.replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
    const phoneDigits = normalizeLocalPhoneInput(phoneRaw, normalizedCountryCode);
    const normalizedPhone = phoneDigits ? `${normalizedCountryCode}${phoneDigits}` : '';
    if (name.length < 2) {
        showAlert('Name must be at least 2 characters.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (phoneDigits) {
        const localPhoneValidation = validateLocalPhoneByCountry(phoneDigits, normalizedCountryCode);
        if (!localPhoneValidation.valid) {
            showAlert(localPhoneValidation.message, 'danger', {
                containerId: 'profileAlert',
                replace: true,
                autoCloseMs: 0
            });
            return;
        }
    }

    if (phoneDigits && !validatePhone(normalizedPhone)) {
        showAlert('Mobile number must be 10 to 15 digits including country code.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const saveBtn = document.getElementById('profileSaveBtn');
    const profileImageValue = profileImageDraft !== null
        ? profileImageDraft
        : String(currentUser.profileImageUrl || '');

    await withButtonLoading(saveBtn, async () => {
        const phoneToSave = phoneDigits ? normalizedPhone : '';
        const payload = {
            name,
            profileImageUrl: profileImageValue,
            phone: phoneToSave
        };

        const response = await apiRequest('/auth/customer/me', 'PUT', payload, token);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Profile update failed');
        }

        setCurrentUser({
            ...currentUser,
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone || currentUser.phone || getCachedCustomerPhone() || '',
            profileImageUrl: response.data.profileImageUrl || ''
        });
        showAlert('Profile updated successfully.', 'success', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 2500
        });
    }, 'Saving...').catch((error) => {
        showAlert(error.message || 'Could not update profile.', 'danger', {
            containerId: 'profileAlert',
            replace: true,
            autoCloseMs: 0
        });
    });
}

async function updateCustomerPassword() {
    if (!currentUser) {
        showAlert('Please login to change password.', 'warning', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const token = getToken();
    if (!token) {
        showAlert('Session expired. Please login again.', 'warning', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const currentPassword = String(document.getElementById('profileCurrentPassword')?.value || '');
    const newPassword = String(document.getElementById('profileNewPassword')?.value || '');
    const confirmPassword = String(document.getElementById('profileConfirmPassword')?.value || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert('Please fill all password fields.', 'warning', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (newPassword.length < 6) {
        showAlert('New password must be at least 6 characters.', 'danger', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('New password and confirm password do not match.', 'danger', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const updateBtn = document.getElementById('profilePasswordBtn');
    await withButtonLoading(updateBtn, async () => {
        const response = await apiRequest(
            '/auth/customer/change-password',
            'POST',
            { currentPassword, newPassword },
            token
        );

        if (!response.success) {
            throw new Error(response.message || 'Password update failed');
        }

        const form = document.getElementById('profilePasswordForm');
        if (form) form.reset();
        showAlert('Password updated successfully.', 'success', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 2500
        });
    }, 'Updating...').catch((error) => {
        showAlert(error.message || 'Could not update password.', 'danger', {
            containerId: 'profilePasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
    });
}

function prefillCustomerForm() {
    if (!currentUser) return;
    const name = document.getElementById('customerName');
    const email = document.getElementById('customerEmail');
    const phone = document.getElementById('customerPhone');
    const countryCode = document.getElementById('customerCountryCode');
    if (name) name.value = currentUser.name || '';
    if (email) email.value = currentUser.email || '';
    if (phone) {
        const preferredPhone = getPreferredCustomerPhone();
        const splitPhone = splitInternationalPhone(preferredPhone);
        phone.value = splitPhone.localNumber;
        if (countryCode) {
            countryCode.value = splitPhone.countryCode;
            updateCountryCodeDisplay(countryCode);
        }
    }
}

function getPreferredCustomerPhone() {
    const savedPhone = String(currentUser && currentUser.phone ? currentUser.phone : '').trim();
    if (savedPhone) {
        return savedPhone;
    }

    const cachedPhone = getCachedCustomerPhone();
    if (cachedPhone) {
        return cachedPhone;
    }

    const signupChallenge = getSignupOtpChallenge();
    if (
        signupChallenge &&
        signupChallenge.phone &&
        currentUser &&
        signupChallenge.email &&
        String(signupChallenge.email).toLowerCase() === String(currentUser.email || '').toLowerCase()
    ) {
        return String(signupChallenge.phone).trim();
    }

    return '';
}

function getPreferredProfilePhone() {
    const savedPhone = normalizePersistedCustomerPhone(currentUser && currentUser.phone ? currentUser.phone : '');
    if (savedPhone) {
        return savedPhone;
    }

    const cachedPhone = getCachedCustomerPhone();
    if (cachedPhone) {
        return cachedPhone;
    }

    return '';
}

function getPreferredProfilePhone() {
    const sessionPhone = normalizePersistedCustomerPhone(currentUser && currentUser.phone ? currentUser.phone : '');
    if (sessionPhone) {
        return sessionPhone;
    }

    const cachedPhone = getCachedCustomerPhone();
    if (cachedPhone) {
        return cachedPhone;
    }

    return '';
}

function updateCountryCodeDisplay(selectEl) {
    if (!selectEl) return;
    const shell = selectEl.closest('.country-code-shell');
    const display = shell ? shell.querySelector('.country-code-display') : null;
    if (!display) return;

    const code = String(selectEl.value || DEFAULT_COUNTRY_CODE).replace(/\D/g, '');
    display.textContent = `+${code || DEFAULT_COUNTRY_CODE}`;
}

function closeCountryCodeDropdown(shell) {
    if (!shell) return;
    const dropdown = shell.querySelector('.country-code-dropdown');
    const trigger = shell.querySelector('.country-code-trigger');
    const search = shell.querySelector('.country-code-search');

    if (dropdown) dropdown.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (search) search.value = '';
    shell.classList.remove('open');
}

function closeAllCountryCodeDropdowns(exceptShell = null) {
    document.querySelectorAll('.country-code-shell.open').forEach((shell) => {
        if (shell !== exceptShell) {
            closeCountryCodeDropdown(shell);
        }
    });
}

function initializeCountryCodeDisplays() {
    const selectors = document.querySelectorAll('.country-code-shell .country-code-select');
    selectors.forEach((selectEl) => {
        const shell = selectEl.closest('.country-code-shell');
        const trigger = shell ? shell.querySelector('.country-code-trigger') : null;
        const dropdown = shell ? shell.querySelector('.country-code-dropdown') : null;
        const searchInput = shell ? shell.querySelector('.country-code-search') : null;
        const optionsContainer = shell ? shell.querySelector('.country-code-options') : null;

        if (!shell || !trigger || !dropdown || !searchInput || !optionsContainer) {
            updateCountryCodeDisplay(selectEl);
            return;
        }

        const optionData = Array.from(selectEl.options).map((option) => ({
            value: option.value,
            label: option.textContent || '',
            normalized: (option.textContent || '').toLowerCase()
        }));

        let filteredOptionData = [...optionData];
        let highlightedIndex = -1;

        const applyHighlight = (nextIndex, scrollIntoView = false) => {
            const optionButtons = Array.from(optionsContainer.querySelectorAll('.country-code-option'));
            optionButtons.forEach((button, index) => {
                button.classList.toggle('active', index === nextIndex);
            });

            if (scrollIntoView && optionButtons[nextIndex]) {
                optionButtons[nextIndex].scrollIntoView({ block: 'nearest' });
            }
        };

        const selectOptionValue = (selectedValue) => {
            selectEl.value = selectedValue || DEFAULT_COUNTRY_CODE;
            updateCountryCodeDisplay(selectEl);
            closeCountryCodeDropdown(shell);
            selectEl.dispatchEvent(new Event('change'));
        };

        const renderOptions = (query = '') => {
            const term = query.trim().toLowerCase();
            const filtered = term
                ? optionData.filter((item) => item.normalized.includes(term) || (`+${item.value}`).includes(term))
                : optionData;

            filteredOptionData = filtered;

            if (!filtered.length) {
                optionsContainer.innerHTML = '<div class="country-code-empty">No matching country code</div>';
                highlightedIndex = -1;
                return;
            }

            const selectedIndex = filtered.findIndex((item) => item.value === selectEl.value);
            highlightedIndex = selectedIndex >= 0 ? selectedIndex : 0;

            optionsContainer.innerHTML = filtered.map((item, index) => {
                const activeClass = index === highlightedIndex ? ' active' : '';
                return `<button type="button" class="country-code-option${activeClass}" data-index="${index}" data-value="${item.value}" role="option">${escapeHtml(item.label)}</button>`;
            }).join('');
        };

        const openDropdown = () => {
            closeAllCountryCodeDropdowns(shell);
            shell.classList.add('open');
            dropdown.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            renderOptions(searchInput.value);
            setTimeout(() => searchInput.focus(), 0);
        };

        const toggleDropdown = () => {
            if (shell.classList.contains('open')) {
                closeCountryCodeDropdown(shell);
            } else {
                openDropdown();
            }
        };

        trigger.addEventListener('click', toggleDropdown);
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                event.preventDefault();
                openDropdown();
            }
        });

        searchInput.addEventListener('input', () => {
            renderOptions(searchInput.value);
        });

        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!filteredOptionData.length) return;
                highlightedIndex = highlightedIndex < 0
                    ? 0
                    : (highlightedIndex + 1) % filteredOptionData.length;
                applyHighlight(highlightedIndex, true);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (!filteredOptionData.length) return;
                highlightedIndex = highlightedIndex < 0
                    ? filteredOptionData.length - 1
                    : (highlightedIndex - 1 + filteredOptionData.length) % filteredOptionData.length;
                applyHighlight(highlightedIndex, true);
                return;
            }

            if (event.key === 'Enter') {
                if (highlightedIndex >= 0 && filteredOptionData[highlightedIndex]) {
                    event.preventDefault();
                    selectOptionValue(filteredOptionData[highlightedIndex].value);
                    trigger.focus();
                }
                return;
            }

            if (event.key === 'Escape') {
                closeCountryCodeDropdown(shell);
                trigger.focus();
            }
        });

        optionsContainer.addEventListener('click', (event) => {
            const optionButton = event.target.closest('.country-code-option');
            if (!optionButton) return;
            const selectedValue = optionButton.getAttribute('data-value') || DEFAULT_COUNTRY_CODE;
            selectOptionValue(selectedValue);
        });

        optionsContainer.addEventListener('mousemove', (event) => {
            const optionButton = event.target.closest('.country-code-option');
            if (!optionButton) return;
            const index = Number(optionButton.getAttribute('data-index'));
            if (Number.isNaN(index)) return;
            highlightedIndex = index;
            applyHighlight(highlightedIndex, false);
        });

        updateCountryCodeDisplay(selectEl);
        selectEl.addEventListener('change', () => updateCountryCodeDisplay(selectEl));
    });

    if (!countryCodePickerEventsBound) {
        document.addEventListener('click', (event) => {
            const clickedInsidePicker = event.target.closest('.country-code-shell');
            if (!clickedInsidePicker) {
                closeAllCountryCodeDropdowns();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeAllCountryCodeDropdowns();
            }
        });

        countryCodePickerEventsBound = true;
    }
}

function splitInternationalPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) {
        return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: '' };
    }

    for (const code of SUPPORTED_COUNTRY_CODES) {
        const rule = getCountryPhoneLengthRule(code);
        const localLengths = rule.min === rule.max
            ? [rule.min]
            : Array.from({ length: rule.max - rule.min + 1 }, (_, index) => rule.min + index);

        if (digits.startsWith(code) && localLengths.includes(digits.length - code.length)) {
            return {
                countryCode: code,
                localNumber: digits.slice(code.length)
            };
        }
    }

    return {
        countryCode: DEFAULT_COUNTRY_CODE,
        localNumber: digits
    };
}

function getCountryPhoneLengthRule(countryCode) {
    const normalizedCountryCode = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
    return COUNTRY_PHONE_LENGTH_RULES[normalizedCountryCode] || { min: 6, max: 12 };
}

function getCountryPhoneLengthMessage(countryCode) {
    const rule = getCountryPhoneLengthRule(countryCode);
    if (rule.min === rule.max) {
        return `${rule.min} digits`;
    }

    return `${rule.min}-${rule.max} digits`;
}

function validateLocalPhoneByCountry(localPhoneDigits, countryCode) {
    const digits = String(localPhoneDigits || '').replace(/\D/g, '');
    const normalizedCountryCode = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
    const rule = getCountryPhoneLengthRule(normalizedCountryCode);

    if (!digits) {
        return { valid: false, message: 'Phone number is required' };
    }

    if (digits.length < rule.min || digits.length > rule.max) {
        return {
            valid: false,
            message: `For +${normalizedCountryCode}, enter ${getCountryPhoneLengthMessage(normalizedCountryCode)}.`
        };
    }

    return { valid: true, message: '' };
}

function formatPhoneLengthHint(countryCode) {
    const normalizedCountryCode = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
    const rule = getCountryPhoneLengthRule(normalizedCountryCode);

    if (rule.min === rule.max) {
        return `For +${normalizedCountryCode}, enter exactly ${rule.min} digits.`;
    }

    return `For +${normalizedCountryCode}, enter ${rule.min}-${rule.max} digits.`;
}

function ensurePhoneLengthHintElement(phoneInput, helperId) {
    if (!phoneInput) return null;

    const existing = document.getElementById(helperId);
    if (existing) {
        return existing;
    }

    const formGroup = phoneInput.closest('.form-group');
    if (!formGroup) return null;

    const hint = document.createElement('p');
    hint.id = helperId;
    hint.className = 'text-muted mb-0 phone-length-hint';
    formGroup.appendChild(hint);
    return hint;
}

function bindPhoneLengthHelper(phoneId, countryCodeId, helperId) {
    const phoneInput = document.getElementById(phoneId);
    const countryCodeInput = document.getElementById(countryCodeId);
    if (!phoneInput || !countryCodeInput) return;

    const hint = ensurePhoneLengthHintElement(phoneInput, helperId);
    if (!hint) return;

    const refreshHint = () => {
        const normalizedCountryCode = String(countryCodeInput.value || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
        hint.textContent = formatPhoneLengthHint(normalizedCountryCode);
    };

    if (phoneInput.dataset.phoneHintBound !== 'true') {
        phoneInput.addEventListener('input', () => {
            const normalized = normalizeLocalPhoneInput(phoneInput.value, countryCodeInput.value);
            if (phoneInput.value !== normalized) {
                phoneInput.value = normalized;
            }
        });
        phoneInput.dataset.phoneHintBound = 'true';
    }

    if (countryCodeInput.dataset.phoneHintCountryBound !== 'true') {
        countryCodeInput.addEventListener('change', () => {
            const normalized = normalizeLocalPhoneInput(phoneInput.value, countryCodeInput.value);
            if (phoneInput.value !== normalized) {
                phoneInput.value = normalized;
            }
            refreshHint();
        });
        countryCodeInput.dataset.phoneHintCountryBound = 'true';
    }

    refreshHint();
}

function setupPhoneLengthHelpers() {
    bindPhoneLengthHelper('customerPhone', 'customerCountryCode', 'customerPhoneLengthHint');
    bindPhoneLengthHelper('signupPhone', 'signupCountryCode', 'signupPhoneLengthHint');
    bindPhoneLengthHelper('profilePhone', 'profileCountryCode', 'profilePhoneLengthHint');
}

function normalizeLocalPhoneInput(value, countryCode) {
    const rawValue = String(value || '').trim();
    let digits = rawValue.replace(/ /g, '').replace(/\D/g, '');
    const normalizedCountryCode = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;
    const rule = getCountryPhoneLengthRule(normalizedCountryCode);

    if (!digits) {
        return '';
    }

    const startsWithInternationalPrefix = rawValue.startsWith('+') || rawValue.startsWith('00');

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }

    if (
        normalizedCountryCode
        && digits.startsWith(normalizedCountryCode)
        && (
            startsWithInternationalPrefix
            || digits.length > rule.max
            || (rule.min === rule.max && digits.length === normalizedCountryCode.length + rule.min)
        )
    ) {
        digits = digits.slice(normalizedCountryCode.length);
    }

    return digits;
}

function logoutUser() {
    requestLogoutConfirmation();
}

function performLogout() {
    localStorage.removeItem(USER_SESSION_KEY);
    removeToken();
    pendingSearchAfterLogin = null;
    currentUser = null;
    updateUserUi();
    loadMyBookings();
    window.location.href = getCustomerHomePath();
}

function requestLogoutConfirmation(closeMobileNavAfter = false) {
    showCustomerConfirmModal({
        title: 'Logout',
        message: 'Do you want to log out from your account?',
        confirmText: 'Logout',
        confirmClass: 'btn-danger',
        onConfirm: () => {
            performLogout();
            if (closeMobileNavAfter) {
                closeMobileNav();
            }
        }
    });
}

function showCustomerConfirmModal({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    const titleEl = document.getElementById('logoutConfirmTitle');
    const messageEl = document.getElementById('logoutConfirmMessage');
    const confirmBtn = document.getElementById('confirmLogoutBtn');

    pendingCustomerConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (confirmBtn) {
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `btn ${confirmClass}`;
    }

    openModal('logoutConfirmModal', { focusSelector: '#confirmLogoutBtn' });
}

function closeCustomerConfirmModal() {
    pendingCustomerConfirmAction = null;
    closeModal('logoutConfirmModal');
}

async function runCustomerConfirmAction() {
    const action = pendingCustomerConfirmAction;
    closeCustomerConfirmModal();
    if (action) {
        await action();
    }
}

function clearAuthFormAlerts() {
    const loginAlert = document.getElementById('userLoginAlert');
    const signupAlert = document.getElementById('userSignupAlert');
    const signupOtpAlert = document.getElementById('signupOtpAlert');
    const forgotPasswordAlert = document.getElementById('forgotPasswordAlert');
    if (loginAlert) loginAlert.innerHTML = '';
    if (signupAlert) signupAlert.innerHTML = '';
    if (signupOtpAlert) signupOtpAlert.innerHTML = '';
    if (forgotPasswordAlert) forgotPasswordAlert.innerHTML = '';
}

function setupUserAuthForms() {
    const userLoginForm = document.getElementById('userLoginForm');
    if (userLoginForm && userLoginForm.dataset.bound !== 'true') {
        userLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleUserLogin();
        });
        userLoginForm.dataset.bound = 'true';
    }

    const userSignupForm = document.getElementById('userSignupForm');
    if (userSignupForm && userSignupForm.dataset.bound !== 'true') {
        userSignupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleUserSignup();
        });
        userSignupForm.dataset.bound = 'true';
    }

    const signupOtpForm = document.getElementById('signupOtpForm');
    if (signupOtpForm && signupOtpForm.dataset.bound !== 'true') {
        signupOtpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            verifySignupOtp();
        });
        signupOtpForm.dataset.bound = 'true';
    }

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm && forgotPasswordForm.dataset.bound !== 'true') {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            resetForgotPassword();
        });
        forgotPasswordForm.dataset.bound = 'true';
    }
}

function setupPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle[data-target]');
    toggles.forEach((toggleBtn) => {
        if (toggleBtn.dataset.bound === 'true') return;

        toggleBtn.addEventListener('click', () => {
            const targetId = toggleBtn.getAttribute('data-target');
            const input = targetId ? document.getElementById(targetId) : null;
            if (!input) return;

            const shouldShow = input.type === 'password';
            input.type = shouldShow ? 'text' : 'password';
            toggleBtn.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
            toggleBtn.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');

            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-eye', 'fa-eye-slash');
                icon.classList.add(shouldShow ? 'fa-eye-slash' : 'fa-eye');
            }
        });

        toggleBtn.dataset.bound = 'true';
    });
}

function renderGoogleLoginAssistActions() {
    const alertContainer = document.getElementById('userLoginAlert');
    if (!alertContainer) return;

    const existingActions = alertContainer.querySelector('.auth-hint-actions');
    if (existingActions) {
        existingActions.remove();
    }

    const actionRow = document.createElement('div');
    actionRow.className = 'auth-hint-actions';

    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.className = 'btn btn-outline';
    googleBtn.textContent = 'Continue with Google';
    googleBtn.addEventListener('click', () => {
        triggerGoogleLoginFromAssist();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-primary';
    resetBtn.textContent = 'Set Password';
    resetBtn.addEventListener('click', () => {
        showForgotPasswordModal();
    });

    actionRow.appendChild(googleBtn);
    actionRow.appendChild(resetBtn);
    alertContainer.appendChild(actionRow);
}

function triggerGoogleLoginFromAssist() {
    maybeRenderGoogleAuthButton();

    const googleBlock = document.getElementById('googleLoginBlock');
    const googleContainer = document.getElementById('googleLoginButton');
    const canUseGoogle = Boolean(
        googleBlock
        && googleContainer
        && googleBlock.style.display !== 'none'
        && window.google
        && window.google.accounts
        && window.google.accounts.id
    );

    if (!canUseGoogle) {
        showAlert('Google sign-in is not available right now.', 'warning', {
            containerId: 'userLoginAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    googleBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const renderedButton = googleContainer.querySelector('div[role="button"], button, iframe');
    if (renderedButton instanceof HTMLElement && typeof renderedButton.click === 'function') {
        renderedButton.click();
    }

    // One Tap prompt helps when the rendered button click is ignored by browser privacy settings.
    window.google.accounts.id.prompt();
}

function showUserLoginModal() {
    clearAuthFormAlerts();
    openModal('userLoginModal', { focusSelector: '#userLoginEmail' });
    const loginButton = document.getElementById('googleLoginButton');
    if (loginButton) {
        loginButton.dataset.googleRendered = 'false';
    }
    maybeRenderGoogleAuthButton();
}

function redirectAfterSuccessfulAuth() {
    if (window.customerPageMode === 'auth') {
        const pendingRedirect = getPendingPostLoginRedirect();
        if (pendingRedirect) {
            clearPendingPostLoginRedirect();
            return navigateWithAuthTransition(pendingRedirect, 'Signing you in...');
        }

        return navigateWithAuthTransition(getCustomerPagePath('bookings.html'), 'Signing you in...');
    }

    return false;
}

function closeUserLoginModal() {
    clearAuthFormAlerts();
    closeModal('userLoginModal');
}

function switchModal(fromModalId, toModalId) {
    if (fromModalId === 'userLoginModal' && toModalId === 'userSignupModal') {
        closeUserLoginModal();
        showUserSignupModal();
        return false;
    }

    if (fromModalId === 'userSignupModal' && toModalId === 'userLoginModal') {
        closeUserSignupModal();
        showUserLoginModal();
        return false;
    }

    closeModal(fromModalId);
    openModal(toModalId);
    return false;
}

function resumePendingBookingAfterAuth() {
    if (!pendingBookingAfterLogin || !selectedRoom) {
        return false;
    }

    pendingBookingAfterLogin = false;

    // Booking modal exists only on room listing pages.
    if (!document.getElementById('bookingModal')) {
        return false;
    }

    showBookingModal();
    return true;
}

function resumePendingSearchAfterAuth() {
    if (!pendingSearchAfterLogin || !currentUser) {
        return false;
    }

    const params = new URLSearchParams({
        checkIn: pendingSearchAfterLogin.checkIn,
        checkOut: pendingSearchAfterLogin.checkOut,
        location: pendingSearchAfterLogin.location,
        guests: String(pendingSearchAfterLogin.guests)
    });

    pendingSearchAfterLogin = null;
    window.location.href = `${getCustomerPagePath('available-rooms.html')}?${params.toString()}`;
    return true;
}

function showForgotPasswordModal() {
    clearAuthFormAlerts();
    closeUserLoginModal();
    const savedEmail = sessionStorage.getItem(FORGOT_PASSWORD_EMAIL_KEY);
    const emailInput = document.getElementById('forgotPasswordEmail');
    if (emailInput && savedEmail) {
        emailInput.value = savedEmail;
    }
    openModal('forgotPasswordModal', { focusSelector: '#forgotPasswordEmail' });
}

function closeForgotPasswordModal() {
    clearAuthFormAlerts();
    clearForgotOtpCooldownUi();
    closeModal('forgotPasswordModal');
}

function clearForgotOtpCooldownUi() {
    if (forgotOtpCountdownInterval) {
        clearInterval(forgotOtpCountdownInterval);
        forgotOtpCountdownInterval = null;
    }

    const sendBtn = document.getElementById('forgotSendOtpBtn');
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = 'Send OTP';
    }
}

function startForgotOtpCooldown(seconds) {
    const sendBtn = document.getElementById('forgotSendOtpBtn');
    if (!sendBtn) return;

    if (forgotOtpCountdownInterval) {
        clearInterval(forgotOtpCountdownInterval);
        forgotOtpCountdownInterval = null;
    }

    let remaining = Math.max(1, Number(seconds) || FORGOT_OTP_COOLDOWN_SECONDS);
    sendBtn.disabled = true;
    sendBtn.innerHTML = `Resend in ${remaining}s`;

    forgotOtpCountdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(forgotOtpCountdownInterval);
            forgotOtpCountdownInterval = null;
            sendBtn.disabled = false;
            sendBtn.innerHTML = 'Send OTP';
            return;
        }

        sendBtn.innerHTML = `Resend in ${remaining}s`;
    }, 1000);
}

function showUserSignupModal() {
    clearAuthFormAlerts();
    openModal('userSignupModal', { focusSelector: '#signupName' });
    updateCountryCodeDisplay(document.getElementById('signupCountryCode'));
    const signupButton = document.getElementById('googleSignupButton');
    if (signupButton) {
        signupButton.dataset.googleRendered = 'false';
    }
    maybeRenderGoogleAuthButton();
}

function closeUserSignupModal() {
    clearAuthFormAlerts();
    closeModal('userSignupModal');
}

function getSignupOtpChallenge() {
    const challenge = sessionStorage.getItem(SIGNUP_OTP_KEY);
    return challenge ? JSON.parse(challenge) : null;
}

function setSignupOtpChallenge(challenge) {
    sessionStorage.setItem(SIGNUP_OTP_KEY, JSON.stringify(challenge));
}

function clearSignupOtpChallenge() {
    sessionStorage.removeItem(SIGNUP_OTP_KEY);
}

function maskContact(value) {
    if (!value) return '';
    if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
    }
    return `${value.slice(0, 2)}******${value.slice(-2)}`;
}

function openSignupOtpModal(challenge) {
    const message = document.getElementById('signupOtpMessage');
    const codeInput = document.getElementById('signupOtpCode');
    if (message) {
        message.textContent = `OTP sent to ${maskContact(challenge.email)}. Enter the 6-digit code to verify your account.`;
    }
    if (codeInput) {
        codeInput.value = '';
        setTimeout(() => codeInput.focus(), 100);
    }
    openModal('signupOtpModal', { focusSelector: '#signupOtpCode' });
}

function closeSignupOtpModal() {
    clearSignupOtpChallenge();
    closeModal('signupOtpModal');
}

async function requestSignupOtp(email) {
    const response = await apiRequest(
        '/auth/signup/send-otp',
        'POST',
        { email },
        null,
        { useAuth: false }
    );

    if (!response.success) {
        throw new Error(response.message || 'Failed to send OTP');
    }
}

async function requestForgotPasswordOtp() {
    const email = document.getElementById('forgotPasswordEmail').value.trim().toLowerCase();
    const sendBtn = document.getElementById('forgotSendOtpBtn');

    if (!validateEmail(email)) {
        showAlert('Enter a valid email address', 'danger', {
            containerId: 'forgotPasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    await withButtonLoading(sendBtn, async () => {
        try {
            await apiRequest(
                '/auth/customer/forgot-password/send-otp',
                'POST',
                { email },
                null,
                { useAuth: false }
            );

            sessionStorage.setItem(FORGOT_PASSWORD_EMAIL_KEY, email);
            showAlert('If your email is registered, an OTP has been sent.', 'info', {
                containerId: 'forgotPasswordAlert',
                replace: true,
                autoCloseMs: 0
            });
            startForgotOtpCooldown(FORGOT_OTP_COOLDOWN_SECONDS);
        } catch (error) {
            const rateLimitMessage = getForgotPasswordRateLimitMessage(error);
            const message = rateLimitMessage || ('Could not process request: ' + error.message);
            const type = rateLimitMessage ? 'warning' : 'danger';
            showAlert(message, type, {
                containerId: 'forgotPasswordAlert',
                replace: true,
                autoCloseMs: 0
            });

            if (rateLimitMessage && String(rateLimitMessage).toLowerCase().includes('wait')) {
                startForgotOtpCooldown(FORGOT_OTP_COOLDOWN_SECONDS);
            }
        }
    }, 'Sending OTP...');
}

function getForgotPasswordRateLimitMessage(error) {
    const raw = String(error && error.message ? error.message : '').toLowerCase();
    if (!raw.includes('too many otp requests') && !raw.includes('error: 429')) {
        return null;
    }

    if (raw.includes('please wait before trying again')) {
        return 'Too many OTP attempts in a short time. Please wait about a minute and try again.';
    }

    return 'Too many OTP requests were made. Please try again later.';
}

async function resetForgotPassword() {
    const email = document.getElementById('forgotPasswordEmail').value.trim().toLowerCase();
    const otp = document.getElementById('forgotPasswordOtp').value.trim();
    const newPassword = document.getElementById('forgotPasswordNew').value;
    const confirmPassword = document.getElementById('forgotPasswordConfirm').value;
    const resetBtn = document.querySelector('#forgotPasswordForm button[type="submit"]');

    if (!validateEmail(email)) {
        showAlert('Enter a valid email address', 'danger', {
            containerId: 'forgotPasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (!/^[0-9]{6}$/.test(otp)) {
        showAlert('OTP must be a 6-digit number.', 'danger', {
            containerId: 'forgotPasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters.', 'danger', {
            containerId: 'forgotPasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match.', 'danger', {
            containerId: 'forgotPasswordAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    await withButtonLoading(resetBtn, async () => {
        try {
            const response = await apiRequest(
                '/auth/customer/forgot-password/reset',
                'POST',
                { email, otp, newPassword },
                null,
                { useAuth: false }
            );

            if (!response.success) {
                throw new Error(response.message || 'Password reset failed');
            }

            sessionStorage.removeItem(FORGOT_PASSWORD_EMAIL_KEY);
            const form = document.getElementById('forgotPasswordForm');
            if (form) form.reset();
            closeForgotPasswordModal();
            showUserLoginModal();
            showAlert('Password reset successful. Please login with your new password.', 'success');
        } catch (error) {
            showAlert('Reset failed: ' + error.message, 'danger', {
                containerId: 'forgotPasswordAlert',
                replace: true,
                autoCloseMs: 0
            });
        }
    }, 'Resetting...');
}

async function resendSignupOtp() {
    const challenge = getSignupOtpChallenge();
    if (!challenge) {
        showAlert('Please start signup again.', 'warning');
        closeSignupOtpModal();
        showUserSignupModal();
        return;
    }

    try {
        await requestSignupOtp(challenge.email);
        openSignupOtpModal(challenge);
        showAlert('A new OTP has been sent to your email.', 'info');
    } catch (error) {
        showAlert('Could not resend OTP: ' + error.message, 'danger', {
            containerId: 'signupOtpAlert',
            replace: true,
            autoCloseMs: 0
        });
    }
}

async function verifySignupOtp() {
    const challenge = getSignupOtpChallenge();
    const otpInput = document.getElementById('signupOtpCode');
    const code = String(otpInput?.value || '').trim();

    if (!challenge) {
        showAlert('OTP session expired. Please sign up again.', 'warning', {
            containerId: 'signupOtpAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (!/^[0-9]{6}$/.test(code)) {
        showAlert('OTP must be a 6-digit number.', 'danger', {
            containerId: 'signupOtpAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    try {
        await completeSignupWithOtp(challenge, code);
    } catch (error) {
        showAlert('OTP verification failed: ' + error.message, 'danger', {
            containerId: 'signupOtpAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }
}

async function completeSignupWithOtp(challenge, code) {
    const response = await apiRequest(
        '/auth/customer/signup',
        'POST',
        {
            name: challenge.name,
            email: challenge.email,
            phone: challenge.phone,
            password: challenge.password,
            otp: code
        },
        null,
        { useAuth: false }
    );

    if (!response.success || !response.data) {
        throw new Error(response.message || 'Signup failed');
    }

    await runAuthFlowTransition('Creating your account...');

    clearSignupOtpChallenge();
    const signupForm = document.getElementById('userSignupForm');
    if (signupForm) signupForm.reset();
    updateCountryCodeDisplay(document.getElementById('signupCountryCode'));
    closeSignupOtpModal();

    storeAuthTokenFromResponse(response, 'Signup succeeded but no session token was returned.');
    setCurrentUser({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        profileImageUrl: response.data.profileImageUrl || ''
    });

    const resumedBooking = resumePendingBookingAfterAuth();
    if (!resumedBooking) {
        redirectAfterSuccessfulAuth();
    }
    showAlert(resumedBooking
        ? 'Account created successfully. Continue your booking.'
        : 'Account verified and created successfully', 'success');
}

async function handleUserSignup() {
    const signupNameInput = document.getElementById('signupName');
    const signupEmailInput = document.getElementById('signupEmail');
    const signupPhoneInput = document.getElementById('signupPhone');
    const signupCountryCodeInput = document.getElementById('signupCountryCode');
    const signupPasswordInput = document.getElementById('signupPassword');

    const name = String(signupNameInput?.value || '').trim();
    const email = String(signupEmailInput?.value || '').trim().toLowerCase();
    const countryCode = String(signupCountryCodeInput?.value || DEFAULT_COUNTRY_CODE).replace(/\D/g, '');
    const localPhone = normalizeLocalPhoneInput(signupPhoneInput?.value, countryCode);
    if (signupPhoneInput && signupPhoneInput.value !== localPhone) {
        signupPhoneInput.value = localPhone;
    }
    const phone = `${countryCode}${localPhone}`;
    const password = String(signupPasswordInput?.value || '');
    const signupSubmitBtn = document.querySelector('#userSignupForm button[type="submit"]');

    if (!name || !email || !localPhone || !password) {
        showAlert('Please fill all signup fields', 'warning', {
            containerId: 'userSignupAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (!validateEmail(email)) {
        showAlert('Enter a valid email address', 'danger', {
            containerId: 'userSignupAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const signupLocalPhoneValidation = validateLocalPhoneByCountry(localPhone, countryCode);
    if (!signupLocalPhoneValidation.valid) {
        showAlert(signupLocalPhoneValidation.message, 'danger', {
            containerId: 'userSignupAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (!validatePhone(phone)) {
        showAlert('Phone must be 10 to 15 digits including country code', 'danger', {
            containerId: 'userSignupAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'danger', {
            containerId: 'userSignupAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    await withButtonLoading(signupSubmitBtn, async () => {
        try {
            await requestSignupOtp(email);

            const challenge = {
                name,
                email,
                phone,
                password
            };

            setSignupOtpChallenge(challenge);
            closeUserSignupModal();
            openSignupOtpModal(challenge);
            showAlert(`OTP sent to ${maskContact(email)}.`, 'info');
        } catch (error) {
            showAlert('Could not send OTP: ' + error.message, 'danger', {
                containerId: 'userSignupAlert',
                replace: true,
                autoCloseMs: 0
            });
        }
    }, 'Sending OTP...');
}

function handleUserLogin() {
    const email = document.getElementById('userLoginEmail').value.trim().toLowerCase();
    const password = document.getElementById('userLoginPassword').value;
    const loginBtn = document.querySelector('#userLoginForm button[type="submit"]');

    if (!email || !password) {
        showAlert('Please enter email and password', 'warning', {
            containerId: 'userLoginAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    withButtonLoading(loginBtn, async () => {
        try {
            const response = await apiRequest(
                '/auth/customer/login',
                'POST',
                { email, password },
                null,
                { useAuth: false }
            );

            if (!response.success || !response.data) {
                throw new Error(response.message || 'Login failed');
            }

            storeAuthTokenFromResponse(response, 'Login succeeded but no session token was returned.');
            setCurrentUser({
                name: response.data.name,
                email: response.data.email,
                phone: response.data.phone,
                profileImageUrl: response.data.profileImageUrl || ''
            });

            await runAuthFlowTransition('Signing you in...');
            document.getElementById('userLoginForm').reset();
            closeUserLoginModal();

            const resumedBooking = resumePendingBookingAfterAuth();
            if (!resumedBooking) {
                redirectAfterSuccessfulAuth();
            }
            showAlert(resumedBooking
                ? 'Login successful. Continue your booking.'
                : 'Login successful', 'success');
        } catch (error) {
            const message = String(error && error.message ? error.message : 'Invalid user credentials');
            const normalized = message.toLowerCase();

            if (normalized.includes('google sign-in') || normalized.includes('google login')) {
                showAlert('This account was created with Google. Use Google login or set a password first.', 'warning', {
                    containerId: 'userLoginAlert',
                    replace: true,
                    autoCloseMs: 0
                });
                renderGoogleLoginAssistActions();
                return;
            }

            showAlert(message || 'Invalid user credentials', 'danger', {
                containerId: 'userLoginAlert',
                replace: true,
                autoCloseMs: 0
            });
        }
    }, 'Logging in...');
}

function setupCustomerFormValidation() {
    const emailInput = document.getElementById('customerEmail');
    const phoneInput = document.getElementById('customerPhone');
    const countryCodeInput = document.getElementById('customerCountryCode');

    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            if (emailInput.value && !validateEmail(emailInput.value)) {
                emailInput.style.borderColor = 'var(--danger-color)';
                showAlert('Invalid email format', 'warning', { autoCloseMs: 3000 });
            } else {
                emailInput.style.borderColor = '';
            }
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('blur', () => {
            const localPhone = normalizeLocalPhoneInput(phoneInput.value, countryCodeInput?.value || DEFAULT_COUNTRY_CODE);
            const countryCode = (countryCodeInput?.value || DEFAULT_COUNTRY_CODE).replace(/\D/g, '');
            const fullPhone = `${countryCode}${localPhone}`;
            if (phoneInput.value !== localPhone) {
                phoneInput.value = localPhone;
            }

            const localPhoneValidation = validateLocalPhoneByCountry(localPhone, countryCode);
            if (localPhone && (!localPhoneValidation.valid || !validatePhone(fullPhone))) {
                phoneInput.style.borderColor = 'var(--danger-color)';
                showAlert(localPhoneValidation.valid
                    ? 'Phone must be 10 to 15 digits including country code'
                    : localPhoneValidation.message, 'warning', { autoCloseMs: 3000 });
            } else {
                phoneInput.style.borderColor = '';
            }
        });
    }
}

async function loadMyBookings() {
    const container = document.getElementById('myBookingsContainer');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<p class="text-muted">Login to see your recent bookings</p>';
        return;
    }

    const token = getToken();
    if (!token) {
        container.innerHTML = '<p class="text-muted">Login again to load your bookings securely.</p>';
        return;
    }

    try {
        const response = await apiRequest(
            '/bookings/me',
            'GET',
            null,
            token
        );

        const items = response.success && Array.isArray(response.data) ? response.data : [];
        const activeFilter = String(window.currentBookingFilter || 'all').toLowerCase();

        const normalizeStatus = (status) => normalizeBookingStatus(status);
        const isCancelledStatus = (status) => {
            const normalized = normalizeStatus(status);
            return normalized === 'CANCELLED' || normalized === 'CANCELED' || normalized === 'FAILED';
        };

        const isCheckedOutStatus = (status) => normalizeStatus(status) === 'CHECKED_OUT';

        const getCheckoutDate = (booking) => {
            const rawDate = booking && booking.checkOut ? booking.checkOut : booking.checkIn;
            const parsed = rawDate ? new Date(rawDate) : null;
            return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filteredItems = items.filter((booking) => {
            if (activeFilter === 'all') {
                return true;
            }

            const cancelled = isCancelledStatus(booking.status);
            const checkedOut = isCheckedOutStatus(booking.status);
            const checkout = getCheckoutDate(booking);

            if (activeFilter === 'cancelled') {
                return cancelled;
            }

            if (cancelled) {
                return false;
            }

            if (!checkout) {
                return activeFilter === 'upcoming' ? !checkedOut : activeFilter === 'past' ? checkedOut : true;
            }

            if (activeFilter === 'upcoming') {
                return !checkedOut && checkout >= today;
            }

            if (activeFilter === 'past') {
                return checkedOut || checkout < today;
            }

            return true;
        });

        const activeSortKey = String(window.currentBookingSortKey || 'createdAt');
        const activeSortOrder = String(window.currentBookingSortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
        const direction = activeSortOrder === 'asc' ? 1 : -1;
        const statusOrder = {
            CONFIRMED: 1,
            CHECKED_IN: 2,
            CHECKED_OUT: 3,
            CANCELLED: 4,
            CANCELED: 4,
            FAILED: 5,
            PENDING: 6
        };

        const sortedItems = [...filteredItems].sort((a, b) => {
            if (activeSortKey === 'checkIn') {
                const timeA = parseBookingDate(a.checkIn)?.getTime() || 0;
                const timeB = parseBookingDate(b.checkIn)?.getTime() || 0;
                if (timeA === timeB) return 0;
                return (timeA > timeB ? 1 : -1) * direction;
            }

            if (activeSortKey === 'amount') {
                const amountA = Number(a.totalAmount || 0);
                const amountB = Number(b.totalAmount || 0);
                if (amountA === amountB) return 0;
                return (amountA > amountB ? 1 : -1) * direction;
            }

            if (activeSortKey === 'status') {
                const rankA = statusOrder[normalizeStatus(a.status)] || 99;
                const rankB = statusOrder[normalizeStatus(b.status)] || 99;
                if (rankA === rankB) return 0;
                return (rankA > rankB ? 1 : -1) * direction;
            }

            const createdA = parseBookingDate(a.createdAt)?.getTime() || 0;
            const createdB = parseBookingDate(b.createdAt)?.getTime() || 0;
            if (createdA === createdB) return 0;
            return (createdA > createdB ? 1 : -1) * direction;
        });

        const canCancelBooking = (booking) => {
            return isBookingCancellationAllowed(booking, today);
        };

        const getCancellationSummary = (booking) => {
            const normalizedStatus = normalizeStatus(booking.status);
            const storedReason = getBookingCancellationReason(booking);

            if (storedReason) {
                return storedReason;
            }

            if (normalizedStatus === 'FAILED') {
                return 'Payment was not completed or Razorpay was not ready, so the reservation was released automatically.';
            }

            if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'CANCELED') {
                return 'Booking cancelled by guest request.';
            }

            if (normalizedStatus === 'CHECKED_OUT') {
                return 'Your stay has been completed successfully and checkout has been recorded. Thank you for choosing Vital Stays.';
            }

            return 'This reservation was cancelled and is no longer active.';
        };

        const getVerificationPanel = (booking) => {
            const normalizedStatus = normalizeStatus(booking.status);
            const guestId = String(booking.guestAccessId || '').trim();
            const checkInOtp = String(booking.checkInOtp || '').trim();
            const checkOutOtp = String(booking.checkOutOtp || '').trim();

            if (normalizedStatus === 'CONFIRMED' && guestId && checkInOtp) {
                return `
                    <div class="booking-otp-panel booking-otp-panel-checkin">
                        <span class="booking-otp-title">Hotel check-in verification</span>
                        <p class="text-muted">Show these codes at reception for check-in.</p>
                        <div class="booking-otp-grid">
                            <div><span class="booking-otp-label">Guest ID</span><strong>${escapeHtml(guestId)}</strong></div>
                            <div><span class="booking-otp-label">Check-in OTP</span><strong>${escapeHtml(checkInOtp)}</strong></div>
                        </div>
                    </div>
                `;
            }

            if (normalizedStatus === 'CHECKED_IN' && guestId && checkOutOtp) {
                return `
                    <div class="booking-otp-panel booking-otp-panel-checkout">
                        <span class="booking-otp-title">Hotel check-out verification</span>
                        <p class="text-muted">Share this code with the manager when you are ready to check out.</p>
                        <div class="booking-otp-grid">
                            <div><span class="booking-otp-label">Guest ID</span><strong>${escapeHtml(guestId)}</strong></div>
                            <div><span class="booking-otp-label">Check-out OTP</span><strong>${escapeHtml(checkOutOtp)}</strong></div>
                        </div>
                    </div>
                `;
            }

            return '';
        };

        if (!sortedItems.length) {
            container.innerHTML = '<p class="text-muted">No bookings yet. Your confirmed bookings will appear here.</p>';
            return;
        }

        container.innerHTML = sortedItems.map((booking) => {
            const bookingId = escapeHtml(booking.id);
            const rowNumber = escapeHtml(booking.roomNumber);
            const roomTypeLabel = escapeHtml(formatRoomTypeLabel(booking.type));
            const checkInLine = escapeHtml(formatBookingDateLine(booking.checkIn));
            const checkOutLine = escapeHtml(formatBookingDateLine(booking.checkOut));
            const amount = formatCurrency(booking.totalAmount);
            const statusBadge = getStatusBadge(booking.status || 'CONFIRMED');
            const bookedAt = escapeHtml(formatBookingMoment(booking.createdAt) || 'Recently');
            const period = `${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`;
            const stateText = isCheckedOutStatus(booking.status)
                ? 'This stay has been completed.'
                : isCancelledStatus(booking.status)
                    ? 'This reservation has been released.'
                    : 'Reservation remains active.';

            return `
                <article class="my-booking-card booking-history-row ${isCheckedOutStatus(booking.status) ? 'booking-state-completed' : ''} ${isCancelledStatus(booking.status) ? 'booking-state-cancelled' : ''}">
                    <div class="booking-row-main">
                        <div class="booking-row-cell booking-row-id" data-label="Booking">
                            <span class="booking-chip">#${bookingId}</span>
                        </div>
                        <div class="booking-row-cell booking-row-room" data-label="Room">
                            <span class="booking-row-room-title">Room ${rowNumber}</span>
                        </div>
                        <div class="booking-row-cell booking-row-type" data-label="Type">
                            <span class="booking-room-type-badge">${roomTypeLabel}</span>
                        </div>
                        <div class="booking-row-cell" data-label="Check-in">${checkInLine}</div>
                        <div class="booking-row-cell" data-label="Check-out">${checkOutLine}</div>
                        <div class="booking-row-cell booking-row-amount" data-label="Amount"><strong>${amount}</strong></div>
                        <div class="booking-row-cell booking-row-status" data-label="Status">${statusBadge}</div>
                        <div class="booking-row-cell booking-row-action" data-label="Action">
                            ${canCancelBooking(booking) ? `
                                <button type="button" class="btn btn-outline btn-sm booking-cancel-btn" data-cancel-booking-id="${bookingId}" onclick="requestBookingCancellation(${bookingId})">
                                    Cancel
                                </button>
                            ` : '<span class="booking-action-dash">-</span>'}
                        </div>
                    </div>

                    <div class="booking-row-meta">
                        <span class="booking-booked-meta text-muted"><i class="fas fa-clock"></i> Booked: ${bookedAt}</span>
                        <span class="text-muted">${escapeHtml(period)}</span>
                        <span class="text-muted ${isCheckedOutStatus(booking.status) ? 'booking-meta-positive' : ''}">${stateText}</span>
                    </div>

                    ${getVerificationPanel(booking)}
                    ${isCancelledStatus(booking.status) || isCheckedOutStatus(booking.status) ? `
                        <div class="booking-cancel-note ${isCheckedOutStatus(booking.status) ? 'booking-note-completed' : 'booking-note-cancelled'}">
                            <i class="fas ${isCheckedOutStatus(booking.status) ? 'fa-circle-check' : 'fa-circle-info'} booking-note-icon" aria-hidden="true"></i>
                            <div class="booking-cancel-note-content">
                                <span class="booking-cancel-note-label">${isCheckedOutStatus(booking.status) ? 'Stay summary' : 'Cancellation details'}</span>
                                <p>${escapeHtml(getCancellationSummary(booking))}</p>
                            </div>
                        </div>
                    ` : ''}
                </article>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-muted">Could not load bookings right now.</p>';
    }
}

async function refreshMyBookings(options = {}) {
    const normalizedOptions = options || {};
    const btn = document.getElementById('refreshBookingsBtn');
    const originalHtml = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner" style="animation: spin 1s linear infinite;"></i> Loading...';
    }

    try {
        await loadMyBookings();
        if (!normalizedOptions.silent) {
            showAlert('Bookings refreshed', 'success', { autoCloseMs: 2000 });
        }
    } catch (error) {
        showAlert('Error refreshing bookings: ' + error.message, 'danger');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

function setMinDates() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const minDate = today.toISOString().split('T')[0];

    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    if (!checkInInput || !checkOutInput) return;

    checkInInput.min = minDate;
    checkOutInput.min = minDate;

    const existingHandler = checkInInput._minDateHandler;
    if (existingHandler) {
        checkInInput.removeEventListener('change', existingHandler);
    }

    const handler = function() {
        const checkInDate = new Date(this.value);
        checkInDate.setDate(checkInDate.getDate() + 1);
        checkOutInput.min = checkInDate.toISOString().split('T')[0];
    };

    checkInInput._minDateHandler = handler;
    checkInInput.addEventListener('change', handler);
}

function resetSearchRoomsState() {
    isSearchingRooms = false;

    const searchBtn = document.querySelector('[onclick="searchRooms()"]');
    if (!searchBtn) {
        return;
    }

    searchBtn.disabled = false;
    searchBtn.innerHTML = '<i class="fas fa-search"></i> Search Rooms';
}

function saveRoomSearchState(searchState) {
    if (!searchState) {
        return;
    }

    sessionStorage.setItem(ROOM_SEARCH_STATE_KEY, JSON.stringify({
        checkIn: String(searchState.checkIn || ''),
        checkOut: String(searchState.checkOut || ''),
        location: String(searchState.location || ''),
        guests: String(searchState.guests || 1)
    }));
}

function getSavedRoomSearchState() {
    const savedState = sessionStorage.getItem(ROOM_SEARCH_STATE_KEY);
    if (!savedState) {
        return null;
    }

    try {
        const parsed = JSON.parse(savedState);
        if (!parsed || !parsed.checkIn || !parsed.checkOut) {
            return null;
        }

        return {
            checkIn: String(parsed.checkIn || ''),
            checkOut: String(parsed.checkOut || ''),
            location: String(parsed.location || ''),
            guests: String(parsed.guests || 1)
        };
    } catch (error) {
        sessionStorage.removeItem(ROOM_SEARCH_STATE_KEY);
        return null;
    }
}

async function searchRooms() {
    if (isSearchingRooms) {
        showAlert('Search already in progress...', 'info', { autoCloseMs: 2000 });
        return;
    }

    const location = document.getElementById('location').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = Number(document.getElementById('guests').value || 1);

    if (!checkIn || !checkOut) {
        showAlert('Please select check-in and check-out dates', 'warning');
        return;
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
        showAlert('Check-out date must be after check-in date', 'danger');
        return;
    }

    if (!currentUser || !getToken()) {
        pendingSearchAfterLogin = {
            checkIn,
            checkOut,
            location: location || 'Any',
            guests
        };

        showAlert('Please login to search and continue booking.', 'info');
        showUserLoginModal();
        showAlert('Login required to view room availability.', 'warning', {
            containerId: 'userLoginAlert',
            replace: true,
            autoCloseMs: 0
        });
        return;
    }

    const searchBtn = document.querySelector('[onclick="searchRooms()"]');
    isSearchingRooms = true;

    saveRoomSearchState({
        checkIn,
        checkOut,
        location: location || 'Any',
        guests
    });

    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner" style="animation: spin 1s linear infinite;"></i> Searching...';
    }

    try {
        // Build query string for available-rooms page
        const params = new URLSearchParams({
            checkIn: checkIn,
            checkOut: checkOut,
            location: location || 'Any',
            guests: guests
        });

        // Redirect to available rooms page with search parameters
        window.location.href = `${getCustomerPagePath('available-rooms.html')}?${params.toString()}`;
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
        resetSearchRoomsState();
    }
}

function scrollToRoomsSection() {
    saveCustomerSection('rooms');
    const section = document.getElementById('availableRoomsSection');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatRoomTypeLabel(roomType) {
    const normalized = String(roomType || '')
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .toUpperCase();

    if (!normalized || normalized === 'ROOM' || normalized === 'UNKNOWN' || normalized === 'N/A') {
        return 'Standard';
    }

    return normalized
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAmenitiesForRoomType(roomType) {
    const byType = {
        DELUXE: ['King Bed', 'Smart TV', 'Breakfast'],
        SUITE: ['Lounge Area', 'City View', 'Work Desk'],
        FAMILY: ['2 Queen Beds', 'Kids Friendly', 'Extra Storage'],
        STANDARD: ['Free Wi-Fi', 'Air Conditioning', 'Daily Housekeeping']
    };

    return byType[roomType] || byType.STANDARD;
}

function getRoomImageForCard(roomType, roomNumber) {
    const key = String(roomType || 'STANDARD').toUpperCase();
    const imagePool = ROOM_IMAGES_BY_TYPE[key] || DEFAULT_ROOM_IMAGES;
    if (!imagePool.length) {
        return `${CUSTOMER_ASSET_PREFIX}img/room-standard.svg`;
    }

    const digits = String(roomNumber || '').replace(/\D/g, '');
    const seed = digits ? Number(digits) : key.length;
    const index = Math.abs(seed) % imagePool.length;
    return `${CUSTOMER_ASSET_PREFIX}img/${imagePool[index]}`;
}

function displayRooms(rooms, checkIn, checkOut, guests) {
    const container = document.getElementById('roomsContainer');
    const meta = document.getElementById('roomsResultsMeta');
    if (!container) return;

    if (meta) {
        meta.textContent = `${rooms ? rooms.length : 0} room(s) available for ${guests} guest(s) from ${formatDate(checkIn)} to ${formatDate(checkOut)}`;
    }

    if (!rooms || rooms.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <i class="fas fa-bed"></i>
                <h3>No Rooms Match Your Search</h3>
                <p>Try different dates or reduce the guest count to find more options.</p>
            </div>
        `;
        return;
    }

    const days = calculateDays(checkIn, checkOut);

    container.innerHTML = rooms.map((room) => {
        const total = Number(room.pricePerNight || 0) * days;
        const rawRoomNumber = String(room.roomNumber || 'N/A');
        const rawRoomType = String(room.type || 'STANDARD').toUpperCase();
        const normalizedRoomType = rawRoomType === 'ROOM' ? 'STANDARD' : rawRoomType;
        const roomNumber = escapeHtml(rawRoomNumber);
        const roomType = escapeHtml(formatRoomTypeLabel(normalizedRoomType));
        const roomDescription = escapeHtml(room.description || 'Comfortable stay with essential amenities');
        const capacity = Number(room.capacity || 0);
        const imageSrc = getRoomImageForCard(normalizedRoomType, rawRoomNumber);
        const amenities = getAmenitiesForRoomType(normalizedRoomType).map((label) => `<span>${escapeHtml(label)}</span>`).join('');

        const encodedRoomNumber = encodeURIComponent(rawRoomNumber);
        const encodedRoomType = encodeURIComponent(normalizedRoomType);
        const encodedCheckIn = encodeURIComponent(checkIn);
        const encodedCheckOut = encodeURIComponent(checkOut);
        const roomId = Number(room.id);
        const pricePerNight = Number(room.pricePerNight || 0);

        return `
            <article class="room-card room-card--premium">
                <div class="room-image room-image--premium">
                    <img src="${escapeHtml(imageSrc)}" alt="${roomType} room" loading="lazy">
                    <div class="room-image-badges">
                        <span class="availability-badge"><i class="fas fa-circle"></i> Available</span>
                        <span class="room-night-chip"><i class="fas fa-moon"></i> ${days} nights</span>
                    </div>
                </div>
                <div class="room-info">
                    <div class="room-header">
                        <div>
                            <div class="room-type">${roomType}</div>
                            <div class="room-number">Room ${roomNumber}</div>
                        </div>
                        <div class="room-price-box">
                            <span class="room-price-label">Per Night</span>
                            <div class="room-price">${formatCurrency(room.pricePerNight || 0)}</div>
                        </div>
                    </div>
                    <div class="room-details">
                        <div class="room-detail-item">
                            <i class="fas fa-users"></i>
                            <span>Capacity: ${capacity}</span>
                        </div>
                        <div class="room-detail-item">
                            <i class="fas fa-location-dot"></i>
                            <span>Flexible stay</span>
                        </div>
                    </div>
                    <div class="room-total-panel">
                        <div class="room-total-label">Total for ${days} night(s)</div>
                        <div class="room-total-value">${formatCurrency(total)}</div>
                    </div>
                    <p class="room-description">${roomDescription}</p>
                    <div class="room-amenities">${amenities}</div>
                    <div class="room-footer">
                        <button class="btn btn-primary btn-block" onclick="selectRoomFromEncoded(${roomId}, '${encodedRoomNumber}', ${pricePerNight}, '${encodedCheckIn}', '${encodedCheckOut}', ${total}, '${encodedRoomType}')">
                            <i class="fas fa-check"></i> Book Now
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function selectRoomFromEncoded(roomId, encodedRoomNumber, pricePerNight, encodedCheckIn, encodedCheckOut, total, encodedType) {
    selectRoom(
        roomId,
        decodeURIComponent(encodedRoomNumber),
        pricePerNight,
        decodeURIComponent(encodedCheckIn),
        decodeURIComponent(encodedCheckOut),
        total,
        decodeURIComponent(encodedType)
    );
}

function selectRoom(roomId, roomNumber, pricePerNight, checkIn, checkOut, total, type) {
    selectedRoom = { roomId, roomNumber, pricePerNight, checkIn, checkOut, total, type };

    if (!currentUser) {
        pendingBookingAfterLogin = true;
        showAlert('Please login to continue booking. You can still browse available rooms.', 'info');
        redirectToLoginPageForBooking();
        return;
    }

    pendingBookingAfterLogin = false;
    showBookingModal();
}

function showBookingModal() {
    if (!selectedRoom) return;

    document.getElementById('summaryRoom').textContent = `Room ${selectedRoom.roomNumber}`;
    document.getElementById('summaryCheckIn').textContent = formatDate(selectedRoom.checkIn);
    document.getElementById('summaryCheckOut').textContent = formatDate(selectedRoom.checkOut);
    document.getElementById('summaryPrice').textContent = formatCurrency(selectedRoom.pricePerNight);
    document.getElementById('summaryTotal').textContent = formatCurrency(selectedRoom.total);

    prefillCustomerForm();
    openModal('bookingModal', { focusSelector: '#customerName' });
}

function closeBookingModal() {
    closeModal('bookingModal');
}

async function proceedToPayment(event) {
    if (event) {
        event.preventDefault();
    }

    if (!currentUser) {
        showAlert('Please login or sign up before booking', 'warning');
        closeBookingModal();
        return;
    }

    const token = getToken();
    if (!token) {
        showAlert('Please login again to continue booking securely.', 'warning');
        return;
    }

    const name = document.getElementById('customerName').value.trim();
    const email = document.getElementById('customerEmail').value.trim().toLowerCase();
    const countryCode = (document.getElementById('customerCountryCode')?.value || DEFAULT_COUNTRY_CODE).replace(/\D/g, '');
    const customerPhoneInput = document.getElementById('customerPhone');
    const localPhone = normalizeLocalPhoneInput(customerPhoneInput?.value, countryCode);
    if (customerPhoneInput && customerPhoneInput.value !== localPhone) {
        customerPhoneInput.value = localPhone;
    }
    const phone = `${countryCode}${localPhone}`;
    const proceedBtn = document.getElementById('proceedPaymentBtn');

    if (!name || !email || !localPhone) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }
    if (!validateEmail(email)) {
        showAlert('Invalid email address', 'danger');
        return;
    }
    const bookingLocalPhoneValidation = validateLocalPhoneByCountry(localPhone, countryCode);
    if (!bookingLocalPhoneValidation.valid || !validatePhone(phone)) {
        showAlert(bookingLocalPhoneValidation.valid
            ? 'Phone must be 10 to 15 digits including country code'
            : bookingLocalPhoneValidation.message, 'danger');
        return;
    }

    await withButtonLoading(proceedBtn, async () => {
        showLoading();
        try {
            if (currentUser && phone && currentUser.phone !== phone) {
                setCurrentUser({
                    ...currentUser,
                    phone
                });
            }

            const bookingData = {
                roomId: selectedRoom.roomId,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                checkIn: selectedRoom.checkIn,
                checkOut: selectedRoom.checkOut,
                totalAmount: selectedRoom.total
            };

            const response = await apiRequest('/bookings/create', 'POST', bookingData, token);

            if (!response.success) {
                throw new Error(response.message || 'Failed to create booking');
            }

            currentBooking = response.data;
            closeBookingModal();
            showPaymentModal();
        } catch (error) {
            showAlert('Error: ' + error.message, 'danger');
        } finally {
            hideLoading();
        }
    }, 'Preparing...');
}

function showPaymentModal() {
    const totalAmount = selectedRoom ? selectedRoom.total : 0;
    const bookingReference = currentBooking ? `Booking ${currentBooking.id}` : 'Vital Booking';
    const upiUri = `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodeURIComponent(String(totalAmount))}&cu=INR&tn=${encodeURIComponent(bookingReference)}`;
    const qrImage = document.getElementById('merchantQrCode');
    const qrNote = document.getElementById('merchantQrNote');
    const paymentModeBadge = document.getElementById('paymentModeBadge');
    const mockMode = isMockPaymentMode();

    document.getElementById('paymentAmount').textContent = formatCurrency(selectedRoom ? selectedRoom.total : 0);
    if (paymentModeBadge) {
        paymentModeBadge.textContent = mockMode ? 'Mock Verification' : 'Razorpay Test';
        paymentModeBadge.classList.remove('payment-mode-test', 'payment-mode-mock');
        paymentModeBadge.classList.add(mockMode ? 'payment-mode-mock' : 'payment-mode-test');
    }
    if (qrImage) {
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;
    }
    if (qrNote) {
        qrNote.textContent = `Scan to pay ${formatCurrency(totalAmount)} via UPI to ${MERCHANT_NAME}`;
    }
    openModal('paymentModal', { focusSelector: '#razorpayBtn' });
}

async function closePaymentModal() {
    const wasOpen = isModalOpen('paymentModal');
    closeModal('paymentModal');

    if (wasOpen && currentBooking && currentBooking.status === 'PENDING') {
        const shouldCancel = confirm('Close payment? Your booking will be cancelled automatically if you continue.\n\nDo you want to proceed?');
        if (shouldCancel) {
            await cancelPendingBooking({
                source: 'user_closed_payment',
                reason: 'Payment window closed before the transaction was completed.'
            });
        }
    }
}

function processPendingPayment(event) {
    if (event) {
        event.preventDefault();
    }

    const payBtn = document.getElementById('razorpayBtn');
    withButtonLoading(payBtn, async () => {
        await initiateRazorpayPayment();
    }, 'Opening gateway...');
}

function isMockPaymentMode() {
    const storedMode = String(localStorage.getItem('hotelPaymentMockMode') || '').trim().toLowerCase();

    // Default to mock mode for local testing unless explicitly disabled.
    if (!storedMode) {
        return true;
    }

    return storedMode === 'true';
}

function ensureRazorpaySdkLoaded() {
    if (window.Razorpay && typeof window.Razorpay === 'function') {
        return Promise.resolve(true);
    }

    if (razorpaySdkLoadPromise) {
        return razorpaySdkLoadPromise;
    }

    razorpaySdkLoadPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[src*="checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript && window.Razorpay && typeof window.Razorpay === 'function') {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
            if (window.Razorpay && typeof window.Razorpay === 'function') {
                resolve(true);
            } else {
                reject(new Error('Razorpay SDK finished loading but is still unavailable.'));
            }
        };
        script.onerror = () => reject(new Error('Razorpay SDK could not be loaded.'));
        document.head.appendChild(script);
    }).catch((error) => {
        razorpaySdkLoadPromise = null;
        throw error;
    });

    return razorpaySdkLoadPromise;
}

async function initiateRazorpayPayment() {
    if (!currentBooking) {
        showAlert('Booking session expired. Please create booking again.', 'warning');
        await closePaymentModal();
        return;
    }

    const token = getToken();
    if (!token) {
        showAlert('Please login again before payment.', 'warning');
        await closePaymentModal();
        return;
    }

    try {
        const mockModeEnabled = isMockPaymentMode();

        if (!mockModeEnabled) {
            await ensureRazorpaySdkLoaded();
        }

        const response = await apiRequest(
            `/payments/create-order?bookingId=${currentBooking.id}`,
            'POST',
            null,
            token
        );

        if (!response.success) {
            throw new Error(response.message || 'Failed to create payment order');
        }

        const order = response.data;
        const razorpayKeyId = String(order && order.keyId ? order.keyId : '').trim();

        if (mockModeEnabled) {
            const mockResponse = {
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                razorpay_order_id: order.orderId,
                razorpay_signature: `mock_sig_${Date.now()}`
            };
            await verifyPayment(mockResponse);
            return;
        }

        if (!razorpayKeyId || razorpayKeyId === 'your_key_id') {
            showAlert('Razorpay key is not configured. Switching to mock verification for local testing.', 'info');
            const fallbackMockResponse = {
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                razorpay_order_id: order.orderId,
                razorpay_signature: `mock_sig_${Date.now()}`
            };
            await verifyPayment(fallbackMockResponse);
            return;
        }

        const options = {
            key: razorpayKeyId,
            amount: order.amount,
            currency: order.currency,
            order_id: order.orderId,
            name: 'Vital',
            description: `Booking for ${currentBooking.customerName}`,
            prefill: {
                name: currentBooking.customerName,
                email: currentBooking.customerEmail,
                contact: currentBooking.customerPhone
            },
            handler: async function(responseObj) {
                await verifyPayment(responseObj);
            },
            modal: {
                ondismiss: async function() {
                    showAlert('Payment was cancelled. The temporary booking will now be released.', 'warning');
                    await cancelPendingBooking({
                        source: 'payment_gateway_dismissed',
                        reason: 'Payment gateway was closed before completion.'
                    });
                }
            },
            theme: {
                color: '#e11d48'
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
    } catch (error) {
        showAlert('Error initiating payment: ' + error.message, 'danger');
        await cancelPendingBooking({
            source: 'payment_initialization_failed',
            reason: `Payment could not be started successfully (${error.message}). Temporary booking released automatically.`
        });
    }
}

async function verifyPayment(paymentResponse) {
    showLoading();
    try {
        const token = getToken();
        if (!token) {
            throw new Error('Please login again before verifying payment');
        }

        const verificationData = {
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpaySignature: paymentResponse.razorpay_signature,
            bookingId: currentBooking.id
        };

        const response = await apiRequest('/payments/verify', 'POST', verificationData, token);

        if (!response.success) {
            throw new Error(response.message || 'Payment verification failed');
        }

        const confirmationEmailSent = response.data && response.data.confirmationEmailSent === true;

        currentBooking.status = 'CONFIRMED';
        currentBooking.type = selectedRoom ? selectedRoom.type : 'ROOM';
        currentBooking.roomNumber = selectedRoom ? selectedRoom.roomNumber : 'N/A';
        await loadMyBookings();
        closeModal('paymentModal');

        const emailStatusHtml = confirmationEmailSent
            ? '<p style="font-size: 0.9rem; color: #6b7280;">Confirmation email has been sent. Check your inbox and spam folder.</p>'
            : '<p style="font-size: 0.9rem; color: #b45309;">Booking is confirmed, but confirmation email was not sent. Please contact support if you need help.</p>';

        showSuccessModal(`
            <strong>Booking Confirmed!</strong><br><br>
            <strong>Booking ID:</strong> #${currentBooking.id}<br>
            <strong>Amount:</strong> ${formatCurrency(currentBooking.totalAmount)}<br>
            <strong>Email:</strong> ${escapeHtml(currentBooking.customerEmail)}<br><br>
            ${emailStatusHtml}
        `);
    } catch (error) {
        showAlert('Payment verification failed: ' + error.message, 'danger');
        await cancelPendingBooking({
            source: 'payment_verification_failed',
            reason: `Payment verification failed (${error.message}). Temporary booking released automatically.`
        });
    } finally {
        hideLoading();
    }
}

async function cancelPendingBooking(options = {}) {
    if (!currentBooking || !currentBooking.id) return;

    const token = getToken();
    if (!token) {
        currentBooking = null;
        return;
    }

    const cancellationReason = formatCancellationReason(options.reason || 'This booking was cancelled and the room has been released.');
    const cancellationPayload = {
        cancellationReason,
        cancellationSource: String(options.source || 'system')
    };

    try {
        await apiRequest(`/bookings/${currentBooking.id}/cancel`, 'PUT', cancellationPayload, token);
        setBookingCancellationReason(currentBooking.id, cancellationReason);
    } catch (error) {
        console.warn('Could not cancel pending booking:', error.message);
    } finally {
        currentBooking = null;
    }
}

async function cancelBookingById(bookingId) {
    const normalizedBookingId = Number(bookingId);
    if (!Number.isFinite(normalizedBookingId) || normalizedBookingId <= 0) {
        showAlert('Invalid booking reference. Please refresh and try again.', 'danger');
        return;
    }

    const token = getToken();
    if (!token) {
        showAlert('Session expired. Please login again to cancel bookings.', 'warning');
        return;
    }

    await withButtonLoading(document.querySelector(`[data-cancel-booking-id="${normalizedBookingId}"]`), async () => {
        showLoading();
        try {
            const latestBookingsResponse = await apiRequest('/bookings/me', 'GET', null, token);
            const latestBookings = latestBookingsResponse && latestBookingsResponse.success && Array.isArray(latestBookingsResponse.data)
                ? latestBookingsResponse.data
                : [];

            const targetBooking = latestBookings.find((item) => Number(item.id) === normalizedBookingId);
            if (!targetBooking) {
                throw new Error('Booking not found or no longer accessible.');
            }

            if (!isBookingCancellationAllowed(targetBooking)) {
                throw new Error('Only confirmed bookings can be cancelled before check-in.');
            }

            const response = await apiRequest(`/bookings/${normalizedBookingId}/cancel`, 'PUT', {
                cancellationReason: 'Cancelled by guest request.',
                cancellationSource: 'manual_guest_action'
            }, token);

            if (!response.success) {
                throw new Error(response.message || 'Could not cancel booking');
            }

            setBookingCancellationReason(normalizedBookingId, 'Cancelled by guest request.');
            showAlert('Booking cancelled successfully.', 'success');
            await loadMyBookings();
        } catch (error) {
            showAlert('Could not cancel booking: ' + error.message, 'danger');
        } finally {
            hideLoading();
        }
    }, 'Cancelling...');
}

function requestBookingCancellation(bookingId) {
    const normalizedBookingId = Number(bookingId);
    if (!Number.isFinite(normalizedBookingId) || normalizedBookingId <= 0) {
        showAlert('Invalid booking reference. Please refresh and try again.', 'danger');
        return;
    }

    showCustomerConfirmModal({
        title: 'Cancel Booking',
        message: 'Cancellation is available only for confirmed bookings before check-in. Do you want to continue?',
        confirmText: 'Cancel Booking',
        confirmClass: 'btn-danger',
        onConfirm: () => cancelBookingById(normalizedBookingId)
    });
}

function showSuccessModal(message) {
    const successMessage = document.getElementById('successMessage');
    const successModal = document.getElementById('successModal');

    if (!successMessage || !successModal) {
        const plainMessage = String(message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        showAlert(plainMessage || 'Booking confirmed successfully.', 'success', { autoCloseMs: 4500 });
        return;
    }

    successMessage.innerHTML = message;
    openModal('successModal', { focusSelector: '.btn.btn-primary' });
}

function resetBooking() {
    closeModal('successModal');

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) bookingForm.reset();

    const customerForm = document.getElementById('customerForm');
    if (customerForm) customerForm.reset();

    const roomsContainer = document.getElementById('roomsContainer');
    if (roomsContainer) {
        roomsContainer.innerHTML = '<p class="text-muted">Enter dates to view available rooms</p>';
    }

    setMinDates();
    currentBooking = null;
    selectedRoom = null;
    prefillCustomerForm();
}

function showAdminLoginModal() {
    if (currentUser) {
        showAlert('You are logged in as a customer. Please log out first to access admin portal.', 'warning');
        return;
    }
    openModal('adminLoginModal', { focusSelector: '#adminLoginEmail' });
}

function closeAdminLoginModal() {
    closeModal('adminLoginModal');
}

function setupAdminLoginForm() {
    const form = document.getElementById('adminLoginForm');
    if (form && form.dataset.bound !== 'true') {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            adminLogin();
        });
        form.dataset.bound = 'true';
    }
}

async function adminLogin() {
    const email = document.getElementById('adminLoginEmail').value.trim();
    const password = document.getElementById('adminLoginPassword').value;
    const adminLoginBtn = document.getElementById('adminLoginBtn');

    if (!email || !password) {
        showAlert('Please enter email and password', 'warning');
        return;
    }

    await withButtonLoading(adminLoginBtn, async () => {
        showLoading();
        try {
            const response = await apiRequest('/auth/login', 'POST', { email, password }, null, { useAuth: false });
            if (!response.success) {
                throw new Error(response.message || 'Login failed');
            }

            storeAuthTokenFromResponse(response, 'Admin login succeeded but no session token was returned.');
            document.getElementById('adminLoginForm').reset();
            showAlert('Admin login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = getAdminPagePath();
            }, 900);
        } catch (error) {
            showAlert('Error: ' + error.message, 'danger');
        } finally {
            hideLoading();
        }
    }, 'Logging in...');
}

function showLoginModal() {
    showAdminLoginModal();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAccountMenu();
        closeMobileNav();
        closeBookingModal();
        closePaymentModal();
        closeProfileCropModal();
        closeAdminLoginModal();
        closeUserLoginModal();
        closeUserSignupModal();
        closeSignupOtpModal();
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 991) {
        closeMobileNav();
    }
});
