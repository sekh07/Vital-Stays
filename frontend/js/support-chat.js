// Support Chat Functions
function loadChatHistory() {
    const rawHistory = localStorage.getItem('vitalChatHistory');
    if (!rawHistory) {
        return [];
    }

    try {
        const parsedHistory = JSON.parse(rawHistory);
        return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch (error) {
        localStorage.removeItem('vitalChatHistory');
        return [];
    }
}

let chatHistory = loadChatHistory();

// AI Responses - Simple pattern matching
const aiResponses = {
    booking: [
        "To book a room: 1) Search available rooms with your dates. 2) Select a room. 3) Review and confirm booking. 4) Make payment. 5) Get confirmation email!",
        "You can book directly from our website by selecting your check-in and check-out dates. Available rooms will be displayed with rates."
    ],
    payment: [
        "We accept: Credit/Debit Cards, UPI, Net Banking, Digital Wallets (Google Pay, Apple Pay), and more through Razorpay. All transactions are secure.",
        "Our payment gateway uses 256-bit SSL encryption. Your card details are never stored on our servers."
    ],
    cancel: [
        "To cancel: Go to 'My Bookings' → Select booking → Click 'Cancel' → Confirm. You'll receive a refund within 3-5 business days.",
        "Cancellations made 24+ hours before check-in get a full refund. Same-day cancellations may have a deduction."
    ],
    refund: [
        "Standard refunds: Full refund for cancellations 24+ hours before check-in. Refunds processed within 3-5 business days.",
        "Non-refundable bookings don't allow refunds. Check 'Booking Terms' before confirming your reservation."
    ],
    password: [
        "Click 'Forgot Password' on login → Enter email → Check your inbox for reset link → Create new password.",
        "Password reset links expire in 24 hours. If link expired, request a new one."
    ],
    rooms: [
        "We offer Standard, Deluxe, Suite, and Family rooms. Each has unique amenities and pricing. Filter by your preferences on our search page.",
        "Room features vary: Standard has basics, Deluxe adds premium amenities, Suite offers luxury, Family is spacious for groups."
    ],
    default: [
        "I'm here to help! You can ask about bookings, payments, cancellations, rooms, or contact our support team.",
        "For more specific information, please check our FAQ or contact our human support team."
    ]
};

// Get AI response based on message
function getAIResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('book') || message.includes('booking')) {
        return aiResponses.booking[Math.floor(Math.random() * aiResponses.booking.length)];
    } else if (message.includes('payment') || message.includes('pay')) {
        return aiResponses.payment[Math.floor(Math.random() * aiResponses.payment.length)];
    } else if (message.includes('cancel') || message.includes('cancellation')) {
        return aiResponses.cancel[Math.floor(Math.random() * aiResponses.cancel.length)];
    } else if (message.includes('refund')) {
        return aiResponses.refund[Math.floor(Math.random() * aiResponses.refund.length)];
    } else if (message.includes('password') || message.includes('forgot')) {
        return aiResponses.password[Math.floor(Math.random() * aiResponses.password.length)];
    } else if (message.includes('room')) {
        return aiResponses.rooms[Math.floor(Math.random() * aiResponses.rooms.length)];
    } else {
        return aiResponses.default[Math.floor(Math.random() * aiResponses.default.length)];
    }
}

function notifySupportUser(message, type = 'info', options = {}) {
    if (typeof showAlert === 'function') {
        showAlert(message, type, {
            replace: true,
            autoCloseMs: 2800,
            ...options
        });
        return;
    }

    window.alert(message);
}

function escapeSupportHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildSupportMailtoUri(name, email, subject, message) {
    const supportEmail = 'support@vitalstays.com';
    const mailSubject = encodeURIComponent(`[Support] ${subject}`);
    const mailBody = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    );

    return `mailto:${supportEmail}?subject=${mailSubject}&body=${mailBody}`;
}

function addBotTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot-message chat-typing-indicator';
    typingDiv.innerHTML = `
        <div class="chat-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="chat-bubble">
            <p class="typing-bubble" aria-label="Assistant is typing">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </p>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingDiv;
}

function removeBotTypingIndicator(indicatorEl) {
    if (indicatorEl && indicatorEl.parentNode) {
        indicatorEl.parentNode.removeChild(indicatorEl);
    }
}

function getBotResponseDelay(minMs = 600, maxMs = 1200) {
    const min = Math.max(200, Number(minMs) || 600);
    const max = Math.max(min, Number(maxMs) || 1200);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Send chat message
function sendChatMessage(event) {
    event.preventDefault();
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    
    // Clear input
    input.value = '';
    input.focus();
    
    // Simulate AI typing and response
    const typingIndicator = addBotTypingIndicator();
    setTimeout(() => {
        removeBotTypingIndicator(typingIndicator);
        const response = getAIResponse(message);
        addChatMessage(response, 'bot');
        
        // Save to history
        chatHistory.push({ user: message, bot: response, timestamp: new Date() });
        localStorage.setItem('vitalChatHistory', JSON.stringify(chatHistory.slice(-50))); // Keep last 50
    }, getBotResponseDelay());
}

// Send quick reply
function sendQuickReply(message) {
    document.getElementById('chatInput').value = message;
    sendChatMessage({ preventDefault: () => {} });
    
    // Remove quick replies after first interaction
    const quickReplies = document.querySelector('.quick-replies');
    if (quickReplies) {
        quickReplies.style.display = 'none';
    }
}

// Add message to chat UI
function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const safeText = escapeSupportHtml(text);

    messageDiv.innerHTML = `
        <div class="chat-avatar">
            ${sender === 'user' ? 
                `<img src="${document.getElementById('userProfileAvatar')?.src || '../img/profile-placeholder.svg'}" alt="You">` : 
                `<i class="fas fa-robot"></i>`
            }
        </div>
        <div class="chat-bubble">
            <p>${safeText}</p>
            <small class="chat-time">${time}</small>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function startLiveChatSupport() {
    switchSupportTab('aiChat');

    addChatMessage('Hi! I need help from live support regarding my booking.', 'user');
    const typingIndicator = addBotTypingIndicator();
    setTimeout(() => {
        removeBotTypingIndicator(typingIndicator);
        addChatMessage('Our support team has been notified. While they connect, I can help with bookings, refunds, payment, or account issues.', 'bot');
    }, getBotResponseDelay(500, 950));

    notifySupportUser('Live support request sent. We are connecting you now.', 'success');
}

// Switch support tab
function switchSupportTab(tab, clickEvent) {
    // Hide all tabs
    document.querySelectorAll('.support-tab-content').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    
    // Remove active class from buttons
    document.querySelectorAll('.support-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabEl = document.getElementById(tab + 'Tab');
    if (tabEl) {
        tabEl.style.display = 'block';
        tabEl.classList.add('active');
    }
    
    // Mark button as active
    const activeButton = clickEvent?.target?.closest('.support-tab')
        || document.querySelector(`.support-tab[onclick*="'${tab}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Focus on first input if contact tab
    if (tab === 'contact') {
        setTimeout(() => document.getElementById('contactName')?.focus(), 100);
    }
}

// Toggle FAQ
function toggleFAQ(button) {
    const answer = button.nextElementSibling;
    const icon = button.querySelector('i');
    
    // Close other FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== button.parentElement) {
            item.querySelector('.faq-answer').style.display = 'none';
            item.querySelector('i').style.transform = 'rotate(0)';
        }
    });
    
    // Toggle current FAQ
    const isOpen = answer.style.display !== 'none';
    answer.style.display = isOpen ? 'none' : 'block';
    icon.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
}

// Submit contact form
function submitContactForm(event) {
    event.preventDefault();
    
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !subject || !message) {
        notifySupportUser('Please complete all contact fields before sending.', 'warning');
        return;
    }

    const payload = { name, email, subject, message };
    const mailtoUri = buildSupportMailtoUri(name, email, subject, message);

    (async () => {
        try {
            await apiRequest('/support/contact', 'POST', payload, null, { useAuth: false });
            notifySupportUser('Your message was sent to support successfully.', 'success');
            document.getElementById('contactForm').reset();
        } catch (error) {
            const errorMessage = String(error && error.message ? error.message : '');
            const shouldFallbackToEmail = errorMessage.includes('Cannot connect to server')
                || errorMessage.includes('not configured')
                || errorMessage.includes('Failed to send support message');

            if (!shouldFallbackToEmail) {
                notifySupportUser(errorMessage || 'Unable to send your message right now.', 'danger');
                return;
            }

            window.location.href = mailtoUri;
            notifySupportUser('The backend could not send your message, so your email app is opening instead.', 'warning');
            document.getElementById('contactForm').reset();
        }
    })();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load chat history if exists
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            addChatMessage(msg.user, 'user');
            addChatMessage(msg.bot, 'bot');
        });
    }
    
    // Set up keyboard shortcut for chat input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('chatForm').dispatchEvent(new Event('submit'));
            }
        });
    }
});
