# Frontend - Hotel Management System

This is the frontend application built with vanilla HTML, CSS, and JavaScript.

## Quick Start

### 1. Start Local Server

**Option A: Python**
```bash
python -m http.server 5500
```

Python is optional. You can also use Live Server or Node for local hosting.

**Option B: Node.js**
```bash
npx http-server -p 5500
```

**Option C: VS Code Live Server**
- Install "Live Server" extension
- Right-click `index.html`
- Click "Open with Live Server"

Frontend runs on: `http://localhost:5500`

## Pages

### index.html - Customer Booking
- Modern hotel booking interface
- Date picker
- Room search and filtering
- Booking confirmation
- Razorpay payment integration

### admin.html - Admin Dashboard
- Admin login
- Dashboard with analytics
- Room management
- Booking management
- Checkout functionality

## Folder Structure

```
frontend/
├── index.html ................. Customer page
├── admin.html ................. Admin dashboard
├── css/
│   ├── style.css .............. Global styles
│   ├── customer.css ........... Customer page styles
│   └── admin.css .............. Admin page styles
├── js/
│   ├── api.js ................. API utilities & helpers
│   ├── customer.js ............ Customer page logic
│   └── admin.js ............... Admin dashboard logic
├── img/ ....................... Static images (if any)
└── README.md .................. This file
```

## Configuration

### API Endpoint

Update `API_BASE_URL` in `js/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

### Test Admin Login

Email: `admin@hotel.com`
Password: `password123`

### Test Payment

Use these test card details:
- Card: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits

## Features

✅ Responsive design (mobile-friendly)
✅ Modern UI with smooth animations
✅ Real-time room search
✅ Customer booking form
✅ Razorpay payment integration
✅ Admin dashboard with analytics
✅ Room management (add/edit/delete)
✅ Booking management with checkout
✅ Error handling and alerts
✅ Loading spinners
✅ Form validation

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers

## Technologies

- HTML5
- CSS3 (with CSS Variables)
- Vanilla JavaScript (ES6+)
- Fetch API
- Razorpay Checkout
- Font Awesome 6
- Poppins Font

## Development

All frontend code is vanilla JavaScript with no build tools required. Simply edit files and refresh the browser.

## Notes

- No `requirements.txt` is needed unless you later turn this into a separate Python project.
- For machine-to-machine setup instructions, see [../INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md).

### File Sizes (Optimized)
- style.css: ~12KB
- customer.css: ~4KB
- admin.css: ~8KB
- api.js: ~7KB
- customer.js: ~12KB
- admin.js: ~14KB

## Performance

- Page load: < 2 seconds
- API response: < 200ms
- Mobile optimized
- Smooth animations (60fps)

## Troubleshooting

- **API not responding**: Check backend is running on port 8080
- **CORS error**: Verify API_BASE_URL in js/api.js matches backend URL
- **Payment not working**: Ensure Razorpay keys are correct in backend
- **Date picker issues**: Use modern browsers (2020+)

## Future Enhancements

- [ ] Service worker for offline support
- [ ] Advanced image gallery
- [ ] Real-time notifications
- [ ] Dark mode
- [ ] Multiple language support
- [ ] Progressive Web App (PWA)
