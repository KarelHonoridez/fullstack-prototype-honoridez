// ─────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────
window.db = {
    accounts: []
};

// Seed one admin account for testing
window.db.accounts.push({
    firstName: 'Admin',
    lastName:  'User',
    email:     'admin@app.com',
    password:  'admin123',
    role:      'admin',
    verified:  true,
    createdAt: new Date().toISOString()
});

// ─────────────────────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────────────────────
let currentUser = null;

function setAuthState(user) {
    currentUser = user;
    if (!user) {
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
        document.getElementById('nav-username').textContent = 'Username';
    } else {
        document.body.classList.remove('not-authenticated');
        document.body.classList.add('authenticated');
        document.getElementById('nav-username').textContent =
            user.firstName + ' ' + user.lastName;
        if (user.role === 'admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }
    }
}

// ─────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────
const routes = {
    '':              'page-home',
    '/':             'page-home',
    '/register':     'page-register',
    '/verify-email': 'page-verify-email',
    '/login':        'page-login',
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(pageId);
    if (el) el.classList.add('active');
}

function navigate(hash) {
    window.location.hash = hash;
}

function router() {
    const hash   = window.location.hash.replace('#', '') || '/';
    const pageId = routes[hash] || 'page-home';

    // Guard: verify-email requires a pending email
    if (hash === '/verify-email' && !localStorage.getItem('unverified_email')) {
        navigate('#/register');
        return;
    }

    // Guard: if logged in, redirect away from login/register
    if (currentUser && (hash === '/login' || hash === '/register')) {
        navigate('#/');
        return;
    }

    // Show verify email address on that page
    if (hash === '/verify-email') {
        const email = localStorage.getItem('unverified_email') || '';
        document.getElementById('verify-email-display').textContent = email;
        generateVerifyCode();
    }

    showPage(pageId);
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    setAuthState(null);
    router();
});

// ─────────────────────────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────────────────────────
function handleRegister() {
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName  = document.getElementById('reg-lastname').value.trim();
    const email     = document.getElementById('reg-email').value.trim().toLowerCase();
    const password  = document.getElementById('reg-password').value;
    const errorBox  = document.getElementById('register-error');

    errorBox.classList.add('d-none');
    errorBox.textContent = '';

    if (!firstName || !lastName || !email || !password) {
        showError(errorBox, 'All fields are required.');
        return;
    }
    if (password.length < 6) {
        showError(errorBox, 'Password must be at least 6 characters.');
        return;
    }
    const exists = window.db.accounts.find(acc => acc.email === email);
    if (exists) {
        showError(errorBox, 'An account with that email already exists.');
        return;
    }

    window.db.accounts.push({
        firstName,
        lastName,
        email,
        password,
        role:      'user',
        verified:  false,
        createdAt: new Date().toISOString()
    });

    localStorage.setItem('unverified_email', email);
    navigate('#/verify-email');
}

// ─────────────────────────────────────────────────────────────
// EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────
let activeVerifyCode = null;

function generateVerifyCode() {
    activeVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('dev-code-value').textContent = activeVerifyCode;
    document.getElementById('verify-code-input').value = '';
    console.log('%c[Dev] Verification code: ' + activeVerifyCode, 'color: #2563eb; font-weight: bold;');
}

function resendCode() {
    generateVerifyCode();
    const successBox = document.getElementById('verify-success');
    showSuccess(successBox, 'A new code has been generated (check the dev hint below).');
}

function handleVerify() {
    const input      = document.getElementById('verify-code-input').value.trim();
    const errorBox   = document.getElementById('verify-error');
    const successBox = document.getElementById('verify-success');

    errorBox.classList.add('d-none');
    successBox.classList.add('d-none');

    if (!input) {
        showError(errorBox, 'Please enter the verification code.');
        return;
    }
    if (input !== activeVerifyCode) {
        showError(errorBox, 'Incorrect code. Please try again.');
        return;
    }

    // Mark account as verified
    const email   = localStorage.getItem('unverified_email');
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) account.verified = true;

    localStorage.removeItem('unverified_email');

    showSuccess(successBox, 'Email verified! Redirecting to login...');
    setTimeout(() => navigate('#/login'), 1500);
}

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
function handleLogin() {
    const email    = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error');

    errorBox.classList.add('d-none');
    errorBox.textContent = '';

    if (!email || !password) {
        showError(errorBox, 'Email and password are required.');
        return;
    }

    const account = window.db.accounts.find(acc => acc.email === email);

    if (!account) {
        showError(errorBox, 'No account found with that email.');
        return;
    }
    if (account.password !== password) {
        showError(errorBox, 'Incorrect password.');
        return;
    }
    if (!account.verified) {
        localStorage.setItem('unverified_email', email);
        navigate('#/verify-email');
        return;
    }

    // Simulate JWT token
    const fakeToken = btoa(JSON.stringify({ email: account.email, role: account.role, iat: Date.now() }));
    localStorage.setItem('token', fakeToken);

    setAuthState(account);
    navigate('#/');
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────
function handleLogout() {
    localStorage.removeItem('token');
    setAuthState(null);
    navigate('#/');
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('d-none');
}

function showSuccess(el, msg) {
    el.textContent = msg;
    el.classList.remove('d-none');
}

