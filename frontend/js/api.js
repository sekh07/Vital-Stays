// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';
const API_CACHE = new Map();

// Show/Hide Loading Overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Alert Functions
function showAlert(message, type = 'info', options = {}) {
    const containerId = options.containerId || 'alertContainer';
    const replace = options.replace || false;
    const autoCloseMs = Number.isFinite(options.autoCloseMs) ? options.autoCloseMs : 5000;

    const alertContainer = document.getElementById(containerId);
    if (!alertContainer) return;

    if (replace) {
        alertContainer.innerHTML = '';
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        danger: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    alert.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    alertContainer.appendChild(alert);

    if (autoCloseMs > 0) {
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }, autoCloseMs);
    }
}

// API Requests
async function apiRequest(endpoint, method = 'GET', data = null, token = null, options = {}) {
    try {
        const shouldUseAuth = options.useAuth !== false;
        const authToken = token || (shouldUseAuth ? getToken() : null);

        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            signal: options.signal
        };

        if (authToken) {
            requestOptions.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) {
            requestOptions.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const result = isJson
            ? await response.json()
            : { message: await response.text() };

            if (response.status === 401 && shouldUseAuth) {
                clearStoredAuthState();
                throw new Error('Session expired. Please login again.');
            }

            if (!response.ok) {
                // Provide specific error messages based on status code
                const errorMap = {
                    400: 'Invalid request. Please check your input.',
                    403: 'Access denied. You don\'t have permission.',
                    404: 'This resource was not found.',
                    409: 'This booking conflicts with an existing reservation.',
                    500: 'Server error. Please try again later.'
                };
            
                const errorMsg = result.message ||
                                 errorMap[response.status] || 
                                 `Error: ${response.status}`;
                throw new Error(errorMsg);
        }

        if (options.includeMeta === true) {
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[String(key || '').toLowerCase()] = value;
            });

            return {
                ...result,
                _meta: {
                    status: response.status,
                    headers
                }
            };
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        if (error && error.name === 'AbortError') {
            throw error;
        }
        if (String(error && error.message).toLowerCase().includes('failed to fetch')) {
            throw new Error('Cannot connect to server. Please ensure backend is running on http://localhost:8080.');
        }
        throw error;
    }
}

function getCachedValue(cacheKey, ttlMs = 30000) {
    const entry = API_CACHE.get(cacheKey);
    if (!entry) return null;

    if (Date.now() - entry.ts > ttlMs) {
        API_CACHE.delete(cacheKey);
        return null;
    }

    return entry.value;
}

function setCachedValue(cacheKey, value) {
    API_CACHE.set(cacheKey, {
        value,
        ts: Date.now()
    });
}

function clearApiCache(prefix = '') {
    if (!prefix) {
        API_CACHE.clear();
        return;
    }

    for (const key of API_CACHE.keys()) {
        if (key.startsWith(prefix)) {
            API_CACHE.delete(key);
        }
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function withButtonLoading(buttonElement, action, loadingText = 'Processing...') {
    if (!buttonElement) {
        return action();
    }

    const originalHtml = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> ${loadingText}`;

    try {
        return await action();
    } finally {
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalHtml;
    }
}

// Auth Functions
function clearStoredAuthState() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('hotelCurrentUser');
}

function setToken(token) {
    localStorage.setItem('authToken', token);
}

function getToken() {
    return localStorage.getItem('authToken');
}

function removeToken() {
    localStorage.removeItem('authToken');
}

function isAuthenticated() {
    return !!getToken();
}

// Local Storage for Booking Info
function setBookingData(data) {
    sessionStorage.setItem('currentBooking', JSON.stringify(data));
}

function getBookingData() {
    const data = sessionStorage.getItem('currentBooking');
    return data ? JSON.parse(data) : null;
}

function clearBookingData() {
    sessionStorage.removeItem('currentBooking');
}

// Date Utilities
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function getMinDate() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
}

// Calculate days between dates
function calculateDays(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Format booking status
function getStatusBadge(status) {
    const statusMap = {
        'PENDING': { class: 'badge-info', label: 'Pending' },
        'CONFIRMED': { class: 'badge-success', label: 'Confirmed' },
        'CHECKED_IN': { class: 'badge-success', label: 'Checked-in' },
        'CHECKED_OUT': { class: 'badge-warning', label: 'Checked-out' },
        'CANCELLED': { class: 'badge-danger', label: 'Cancelled' },
        'PAID': { class: 'badge-success', label: 'Paid' },
        'FAILED': { class: 'badge-danger', label: 'Failed' }
    };
    const info = statusMap[status] || { class: 'badge-info', label: status };
    return `<span class="badge ${info.class}">${info.label}</span>`;
}

// Debounce function
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Validate email
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validate phone
function validatePhone(phone) {
    const regex = /^[0-9]{10,15}$/;
    return regex.test(phone);
}
