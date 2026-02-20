// ─────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ipt_demo_v1';

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            window.db = JSON.parse(raw);
            return;
        }
    } catch (e) {
        console.warn('Storage corrupt, reseeding...', e);
    }

    window.db = {
        accounts: [
            {
                id:        1,
                firstName: 'Admin',
                lastName:  'User',
                email:     'admin@example.com',
                password:  'Password123!',
                role:      'admin',
                verified:  true,
                createdAt: new Date().toISOString()
            }
        ],
        departments: [
             { id: 1, name: 'Engineering', description: 'Software team', createdAt: new Date().toISOString() },
             { id: 2, name: 'HR',          description: 'Human Resources', createdAt: new Date().toISOString() }
        ],
        employees: [],
        requests:  []
    };

    saveToStorage();
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
    } catch (e) {
        console.error('Failed to save to storage:', e);
    }
}

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
    '/profile':      'page-profile',
    '/employees':    'page-employees',
    '/accounts':     'page-accounts',
    '/departments':  'page-departments',
    '/my-requests':  'page-my-requests',
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

    // Guard: protected pages require login
    const protectedRoutes = ['/profile', '/employees', '/accounts', '/departments', '/my-requests'];
    if (protectedRoutes.includes(hash) && !currentUser) {
        navigate('#/login');
        return;
    }

    if (hash === '/verify-email') {
        const email = localStorage.getItem('unverified_email') || '';
        document.getElementById('verify-email-display').textContent = email;
    }

    if (hash === '/login') {
        const old = document.querySelector('#page-login .alert-success');
        if (old) old.remove();
    }

    if (hash === '/profile')     renderProfile();
    if (hash === '/employees')   renderEmployees();
    if (hash === '/accounts')    renderAccounts();
    if (hash === '/departments') renderDepartments();
    if (hash === '/my-requests') renderRequests();

    showPage(pageId);
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    loadFromStorage();
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
        id:        Date.now(),
        firstName,
        lastName,
        email,
        password,
        role:      'user',
        verified:  false,
        createdAt: new Date().toISOString()
    });

    saveToStorage();
    localStorage.setItem('unverified_email', email);
    navigate('#/verify-email');
}

// ─────────────────────────────────────────────────────────────
// EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────
function generateVerifyCode() {}
function resendCode() {}

function handleVerify() {
    const email   = localStorage.getItem('unverified_email');
    const account = window.db.accounts.find(acc => acc.email === email);

    if (!account) {
        alert('No pending account found. Please register again.');
        navigate('#/register');
        return;
    }

    account.verified = true;
    saveToStorage();
    localStorage.removeItem('unverified_email');
    navigate('#/login');

    const loginError = document.getElementById('login-error');
    const successMsg = document.createElement('div');
    successMsg.className   = 'alert alert-success';
    successMsg.textContent = '✅ Email verified! You may now log in.';
    loginError.parentNode.insertBefore(successMsg, loginError);
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
// PROFILE
// ─────────────────────────────────────────────────────────────
function renderProfile() {
    if (!currentUser) return;
    document.getElementById('profile-name').textContent  = currentUser.firstName + ' ' + currentUser.lastName;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role').textContent  =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
}

function toggleEditProfile() {
    const form = document.getElementById('profile-edit-form');
    form.classList.toggle('d-none');
    if (!form.classList.contains('d-none')) {
        document.getElementById('edit-firstname').value = currentUser.firstName;
        document.getElementById('edit-lastname').value  = currentUser.lastName;
        document.getElementById('edit-password').value  = '';
        document.getElementById('profile-error').classList.add('d-none');
        document.getElementById('profile-success').classList.add('d-none');
    }
}

function handleSaveProfile() {
    const firstName  = document.getElementById('edit-firstname').value.trim();
    const lastName   = document.getElementById('edit-lastname').value.trim();
    const password   = document.getElementById('edit-password').value;
    const errorBox   = document.getElementById('profile-error');
    const successBox = document.getElementById('profile-success');

    errorBox.classList.add('d-none');
    successBox.classList.add('d-none');

    if (!firstName || !lastName) {
        showError(errorBox, 'First and last name are required.');
        return;
    }
    if (password && password.length < 6) {
        showError(errorBox, 'Password must be at least 6 characters.');
        return;
    }

    const account = window.db.accounts.find(acc => acc.email === currentUser.email);
    account.firstName = firstName;
    account.lastName  = lastName;
    if (password) account.password = password;

    saveToStorage();
    setAuthState(account);
    renderProfile();
    showSuccess(successBox, 'Profile updated successfully.');
    document.getElementById('profile-edit-form').classList.add('d-none');
}

// ─────────────────────────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────────────────────────
function renderEmployees() {
    const tbody     = document.getElementById('employees-tbody');
    const employees = window.db.employees || [];

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees.</td></tr>';
        return;
    }

    tbody.innerHTML = employees.map(emp => {
        const dept = (window.db.departments || []).find(d => d.id == emp.departmentId);
        return `
        <tr>
            <td>${emp.empId}</td>
            <td>${emp.email}</td>
            <td>${emp.position}</td>
            <td>${dept ? dept.name : '—'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee(${emp.id})">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

function populateDepartmentDropdown() {
    const select = document.getElementById('emp-department');
    select.innerHTML = (window.db.departments || []).map(d =>
        `<option value="${d.id}">${d.name}</option>`
    ).join('');
}

function showEmployeeForm() {
    document.getElementById('emp-editing-id').value = '';
    document.getElementById('emp-id').value         = '';
    document.getElementById('emp-email').value      = '';
    document.getElementById('emp-position').value   = '';
    document.getElementById('emp-hiredate').value   = '';
    document.getElementById('employee-error').classList.add('d-none');
    populateDepartmentDropdown();
    document.getElementById('employee-form').classList.remove('d-none');
}

function hideEmployeeForm() {
    document.getElementById('employee-form').classList.add('d-none');
}

function editEmployee(id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (!emp) return;
    populateDepartmentDropdown();
    document.getElementById('emp-editing-id').value = emp.id;
    document.getElementById('emp-id').value         = emp.empId;
    document.getElementById('emp-email').value      = emp.email;
    document.getElementById('emp-position').value   = emp.position;
    document.getElementById('emp-hiredate').value   = emp.hireDate;
    document.getElementById('emp-department').value = emp.departmentId;
    document.getElementById('employee-form').classList.remove('d-none');
}

function deleteEmployee(id) {
    if (!confirm('Delete this employee?')) return;
    window.db.employees = window.db.employees.filter(e => e.id !== id);
    saveToStorage();
    renderEmployees();
}

function handleSaveEmployee() {
    const editingId = document.getElementById('emp-editing-id').value;
    const empId     = document.getElementById('emp-id').value.trim();
    const email     = document.getElementById('emp-email').value.trim().toLowerCase();
    const position  = document.getElementById('emp-position').value.trim();
    const deptId    = document.getElementById('emp-department').value;
    const hireDate  = document.getElementById('emp-hiredate').value;
    const errorBox  = document.getElementById('employee-error');

    errorBox.classList.add('d-none');

    if (!empId || !email || !position || !deptId || !hireDate) {
        showError(errorBox, 'All fields are required.');
        return;
    }

    if (editingId) {
        const emp        = window.db.employees.find(e => e.id == editingId);
        emp.empId        = empId;
        emp.email        = email;
        emp.position     = position;
        emp.departmentId = deptId;
        emp.hireDate     = hireDate;
    } else {
        window.db.employees.push({
            id:           Date.now(),
            empId,
            email,
            position,
            departmentId: deptId,
            hireDate,
            createdAt:    new Date().toISOString()
        });
    }

    saveToStorage();
    hideEmployeeForm();
    renderEmployees();
}

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────
function renderDepartments() {
    const tbody = document.getElementById('departments-tbody');
    const depts = window.db.departments || [];

    if (depts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments.</td></tr>';
        return;
    }

    tbody.innerHTML = depts.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.description || '—'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editDepartment(${d.id})">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDepartment(${d.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showDepartmentForm() {
    document.getElementById('dept-editing-id').value  = '';
    document.getElementById('dept-name').value        = '';
    document.getElementById('dept-description').value = '';
    document.getElementById('department-error').classList.add('d-none');
    document.getElementById('department-form').classList.remove('d-none');
}

function hideDepartmentForm() {
    document.getElementById('department-form').classList.add('d-none');
}

function editDepartment(id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (!dept) return;
    document.getElementById('dept-editing-id').value  = dept.id;
    document.getElementById('dept-name').value        = dept.name;
    document.getElementById('dept-description').value = dept.description || '';
    document.getElementById('department-form').classList.remove('d-none');
}

function deleteDepartment(id) {
    if (!confirm('Delete this department?')) return;
    window.db.departments = window.db.departments.filter(d => d.id !== id);
    saveToStorage();
    renderDepartments();
}

function handleSaveDepartment() {
    const editingId   = document.getElementById('dept-editing-id').value;
    const name        = document.getElementById('dept-name').value.trim();
    const description = document.getElementById('dept-description').value.trim();
    const errorBox    = document.getElementById('department-error');

    errorBox.classList.add('d-none');

    if (!name) {
        showError(errorBox, 'Department name is required.');
        return;
    }

    if (editingId) {
        const dept       = window.db.departments.find(d => d.id == editingId);
        dept.name        = name;
        dept.description = description;
    } else {
        window.db.departments.push({
            id:          Date.now(),
            name,
            description,
            createdAt:   new Date().toISOString()
        });
    }

    saveToStorage();
    hideDepartmentForm();
    renderDepartments();
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────────────────────
function renderAccounts() {
    const tbody    = document.getElementById('accounts-tbody');
    const accounts = window.db.accounts || [];

    tbody.innerHTML = accounts.map(acc => `
        <tr>
            <td>${acc.firstName} ${acc.lastName}</td>
            <td>${acc.email}</td>
            <td>${acc.role.charAt(0).toUpperCase() + acc.role.slice(1)}</td>
            <td>${acc.verified ? '✅' : '❌'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editAccount(${acc.id})">Edit</button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="resetPassword(${acc.id})">Reset Password</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount(${acc.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showAccountForm() {
    document.getElementById('acc-editing-id').value = '';
    document.getElementById('acc-firstname').value  = '';
    document.getElementById('acc-lastname').value   = '';
    document.getElementById('acc-email').value      = '';
    document.getElementById('acc-password').value   = '';
    document.getElementById('acc-role').value       = 'user';
    document.getElementById('acc-verified').checked = false;
    document.getElementById('account-error').classList.add('d-none');
    document.getElementById('account-form').classList.remove('d-none');
}

function hideAccountForm() {
    document.getElementById('account-form').classList.add('d-none');
}

function editAccount(id) {
    const acc = window.db.accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('acc-editing-id').value = acc.id;
    document.getElementById('acc-firstname').value  = acc.firstName;
    document.getElementById('acc-lastname').value   = acc.lastName;
    document.getElementById('acc-email').value      = acc.email;
    document.getElementById('acc-password').value   = '';
    document.getElementById('acc-role').value       = acc.role;
    document.getElementById('acc-verified').checked = acc.verified;
    document.getElementById('account-form').classList.remove('d-none');
}

function resetPassword(id) {
    const acc = window.db.accounts.find(a => a.id === id);
    if (!acc) return;
    const newPass = prompt(`Enter new password for ${acc.email}:`);
    if (!newPass || newPass.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }
    acc.password = newPass;
    saveToStorage();
    alert('Password reset successfully.');
}

function deleteAccount(id) {
    if (!confirm('Delete this account?')) return;
    window.db.accounts = window.db.accounts.filter(a => a.id !== id);
    saveToStorage();
    renderAccounts();
}

function handleSaveAccount() {
    const editingId = document.getElementById('acc-editing-id').value;
    const firstName = document.getElementById('acc-firstname').value.trim();
    const lastName  = document.getElementById('acc-lastname').value.trim();
    const email     = document.getElementById('acc-email').value.trim().toLowerCase();
    const password  = document.getElementById('acc-password').value;
    const role      = document.getElementById('acc-role').value;
    const verified  = document.getElementById('acc-verified').checked;
    const errorBox  = document.getElementById('account-error');

    errorBox.classList.add('d-none');

    if (!firstName || !lastName || !email) {
        showError(errorBox, 'First name, last name, and email are required.');
        return;
    }

    if (editingId) {
        const acc     = window.db.accounts.find(a => a.id == editingId);
        acc.firstName = firstName;
        acc.lastName  = lastName;
        acc.email     = email;
        acc.role      = role;
        acc.verified  = verified;
        if (password) acc.password = password;
    } else {
        if (!password || password.length < 6) {
            showError(errorBox, 'Password must be at least 6 characters.');
            return;
        }
        const exists = window.db.accounts.find(a => a.email === email);
        if (exists) {
            showError(errorBox, 'An account with that email already exists.');
            return;
        }
        window.db.accounts.push({
            id: Date.now(),
            firstName,
            lastName,
            email,
            password,
            role,
            verified,
            createdAt: new Date().toISOString()
        });
    }

    saveToStorage();
    hideAccountForm();
    renderAccounts();
}

// ─────────────────────────────────────────────────────────────
// REQUESTS
// ─────────────────────────────────────────────────────────────
function renderRequests() {
    const tbody    = document.getElementById('requests-tbody');
    const requests = (window.db.requests || []).filter(r => r.email === currentUser?.email);

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No requests.</td></tr>';
        return;
    }

    tbody.innerHTML = requests.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.type}</td>
            <td>${r.details}</td>
            <td><span class="badge bg-${r.status === 'Pending' ? 'warning text-dark' : r.status === 'Approved' ? 'success' : 'danger'}">${r.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteRequest(${r.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function showRequestForm() {
    document.getElementById('req-editing-id').value = '';
    document.getElementById('req-details').value    = '';
    document.getElementById('request-error').classList.add('d-none');
    document.getElementById('request-form').classList.remove('d-none');
}

function hideRequestForm() {
    document.getElementById('request-form').classList.add('d-none');
}

function handleSaveRequest() {
    const type     = document.getElementById('req-type').value;
    const details  = document.getElementById('req-details').value.trim();
    const errorBox = document.getElementById('request-error');

    errorBox.classList.add('d-none');

    if (!details) {
        showError(errorBox, 'Please provide details for your request.');
        return;
    }

    window.db.requests.push({
        id:        Date.now(),
        email:     currentUser.email,
        type,
        details,
        status:    'Pending',
        createdAt: new Date().toISOString()
    });

    saveToStorage();
    hideRequestForm();
    renderRequests();
}

function deleteRequest(id) {
    if (!confirm('Delete this request?')) return;
    window.db.requests = window.db.requests.filter(r => r.id !== id);
    saveToStorage();
    renderRequests();
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