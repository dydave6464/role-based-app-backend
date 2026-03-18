let currentUser = null;

const API_BASE_URL = 'http://localhost:3000/api';

async function apiCall(endpoint, options = {}) {
  const token = sessionStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  if (response.status === 204) return null;

  return response.json();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function handleRegistration(e) {
  e.preventDefault();

  const firstName = document.getElementById('reg-firstname').value;
  const lastName = document.getElementById('reg-lastname').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const result = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    localStorage.setItem('unverified_email', email);
    showToast(result.message, 'success');
    navigateTo('#/verify-email');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleEmailVerification() {
  const email = localStorage.getItem('unverified_email');

  if (!email) {
    showToast('No email to verify', 'error');
    navigateTo('#/register');
    return;
  }

  try {
    const result = await apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    localStorage.removeItem('unverified_email');
    showToast(result.message, 'success');
    navigateTo('#/login');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    sessionStorage.setItem('authToken', result.token);
    setAuthState(true, result.user);
    showToast(`Welcome back, ${result.user.firstName}!`, 'success');
    navigateTo('#/profile');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function setAuthState(isAuth, user) {
  if (isAuth && user) {
    currentUser = user;
    document.body.classList.remove('not-authenticated');
    document.body.classList.add('authenticated');

    document.getElementById('username-display').textContent = user.firstName;

    if (user.role === 'admin') {
      document.body.classList.add('is-admin');
    } else {
      document.body.classList.remove('is-admin');
    }

    document
      .querySelectorAll('.role-logged-out')
      .forEach((el) => (el.style.display = 'none'));
    document
      .querySelectorAll('.role-logged-in')
      .forEach((el) => (el.style.display = 'block'));

    if (user.role === 'admin') {
      document
        .querySelectorAll('.role-admin')
        .forEach((el) => (el.style.display = 'block'));
    } else {
      document
        .querySelectorAll('.role-admin')
        .forEach((el) => (el.style.display = 'none'));
    }
  } else {
    currentUser = null;
    document.body.classList.add('not-authenticated');
    document.body.classList.remove('authenticated', 'is-admin');

    document
      .querySelectorAll('.role-logged-out')
      .forEach((el) => (el.style.display = 'block'));
    document
      .querySelectorAll('.role-logged-in')
      .forEach((el) => (el.style.display = 'none'));
    document
      .querySelectorAll('.role-admin')
      .forEach((el) => (el.style.display = 'none'));
  }
}

function handleLogout() {
  sessionStorage.removeItem('authToken');
  currentUser = null;
  setAuthState(false, null);
  showToast('Logged out successfully', 'info');
  navigateTo('#/');
}

async function checkAuth() {
  const token = sessionStorage.getItem('authToken');

  if (!token) {
    setAuthState(false, null);
    return;
  }

  try {
    const user = await apiCall('/auth/profile');
    setAuthState(true, user);
    console.log('✅ Auto-login successful');
  } catch (error) {
    sessionStorage.removeItem('authToken');
    setAuthState(false, null);
  }
}

function renderProfile() {
  if (!currentUser) {
    navigateTo('#/login');
    return;
  }

  const profileContent = document.getElementById('profile-content');
  profileContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Name:</strong> ${currentUser.firstName} ${currentUser.lastName}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Role:</strong> <span class="badge bg-${currentUser.role === 'admin' ? 'danger' : 'primary'}">${currentUser.role}</span></p>
                <p><strong>Status:</strong> <span class="badge bg-success">Verified</span></p>
            </div>
        </div>
    `;
}

async function renderAccountsList() {
  try {
    const accounts = await apiCall('/admin/accounts');

    const accountsContent = document.getElementById('accounts-content');
    accountsContent.innerHTML = `
            <button class="btn btn-success mb-3" onclick="showAddAccountForm()">+ Add Account</button>
            
            <div id="account-form-container"></div>
            
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Verified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${accounts
                      .map(
                        (acc) => `
                        <tr>
                            <td>${acc.firstName} ${acc.lastName}</td>
                            <td>${acc.email}</td>
                            <td><span class="badge bg-${acc.role === 'admin' ? 'danger' : 'primary'}">${acc.role}</span></td>
                            <td>${acc.verified ? '✓' : '✗'}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="editAccount(${acc.id})">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteAccount(${acc.id})">Delete</button>
                            </td>
                        </tr>
                    `,
                      )
                      .join('')}
                </tbody>
            </table>
        `;
  } catch (error) {
    showToast('Error loading accounts: ' + error.message, 'error');
  }
}

function showAddAccountForm() {
  const container = document.getElementById('account-form-container');
  container.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <h5>Add New Account</h5>
                <form id="account-form" onsubmit="handleAccountSubmit(event)">
                    <div class="row">
                        <div class="col-md-6 mb-2">
                            <input type="text" class="form-control" id="account-firstname" placeholder="First Name" required>
                        </div>
                        <div class="col-md-6 mb-2">
                            <input type="text" class="form-control" id="account-lastname" placeholder="Last Name" required>
                        </div>
                    </div>
                    <div class="mb-2">
                        <input type="email" class="form-control" id="account-email" placeholder="Email" required>
                    </div>
                    <div class="mb-2">
                        <input type="password" class="form-control" id="account-password" placeholder="Password" required>
                    </div>
                    <div class="mb-2">
                        <select class="form-control" id="account-role" required>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label><input type="checkbox" id="account-verified"> Verified</label>
                    </div>
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelAccountForm()">Cancel</button>
                </form>
            </div>
        </div>
    `;
}

async function editAccount(id) {
  try {
    const accounts = await apiCall('/admin/accounts');
    const account = accounts.find((a) => a.id === id);

    if (!account) {
      showToast('Account not found', 'error');
      return;
    }

    const container = document.getElementById('account-form-container');
    container.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>Edit Account</h5>
                    <form id="account-form" onsubmit="handleAccountSubmit(event)" data-edit-id="${id}">
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <input type="text" class="form-control" id="account-firstname" value="${account.firstName}" required>
                            </div>
                            <div class="col-md-6 mb-2">
                                <input type="text" class="form-control" id="account-lastname" value="${account.lastName}" required>
                            </div>
                        </div>
                        <div class="mb-2">
                            <input type="email" class="form-control" id="account-email" value="${account.email}" required>
                        </div>
                        <div class="mb-2">
                            <input type="password" class="form-control" id="account-password" placeholder="New Password (leave blank to keep current)">
                        </div>
                        <div class="mb-2">
                            <select class="form-control" id="account-role" required>
                                <option value="user" ${account.role === 'user' ? 'selected' : ''}>User</option>
                                <option value="admin" ${account.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div class="mb-2">
                            <label><input type="checkbox" id="account-verified" ${account.verified ? 'checked' : ''}> Verified</label>
                        </div>
                        <button type="submit" class="btn btn-primary">Update</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelAccountForm()">Cancel</button>
                    </form>
                </div>
            </div>
        `;
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function handleAccountSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('account-form');
  const id = form.dataset.editId;
  const accountData = {
    firstName: document.getElementById('account-firstname').value,
    lastName: document.getElementById('account-lastname').value,
    email: document.getElementById('account-email').value,
    role: document.getElementById('account-role').value,
    verified: document.getElementById('account-verified').checked,
  };

  const password = document.getElementById('account-password').value;
  if (password) {
    accountData.password = password;
  }

  try {
    if (id) {
      await apiCall(`/admin/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(accountData),
      });
      showToast('Account updated successfully', 'success');
    } else {
      await apiCall('/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
      });
      showToast('Account created successfully', 'success');
    }

    cancelAccountForm();
    renderAccountsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function cancelAccountForm() {
  document.getElementById('account-form-container').innerHTML = '';
}

async function deleteAccount(id) {
  if (!confirm('Are you sure you want to delete this account?')) return;

  try {
    await apiCall(`/admin/accounts/${id}`, { method: 'DELETE' });
    showToast('Account deleted successfully', 'success');
    renderAccountsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function renderDepartmentsList() {
  try {
    const departments = await apiCall('/admin/departments');

    const deptsContent = document.getElementById('departments-content');
    deptsContent.innerHTML = `
            <button class="btn btn-success mb-3" onclick="showAddDeptForm()">+ Add Department</button>
            
            <div id="dept-form-container"></div>
            
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${departments
                      .map(
                        (dept) => `
                        <tr>
                            <td>${dept.name}</td>
                            <td>${dept.description}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="editDepartment(${dept.id})">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})">Delete</button>
                            </td>
                        </tr>
                    `,
                      )
                      .join('')}
                </tbody>
            </table>
        `;
  } catch (error) {
    showToast('Error loading departments: ' + error.message, 'error');
  }
}

function showAddDeptForm() {
  const container = document.getElementById('dept-form-container');
  container.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <h5>Add New Department</h5>
                <form id="dept-form" onsubmit="handleDeptSubmit(event)">
                    <div class="mb-2">
                        <input type="text" class="form-control" id="dept-name" placeholder="Department Name" required>
                    </div>
                    <div class="mb-2">
                        <textarea class="form-control" id="dept-description" placeholder="Description" rows="2" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelDeptForm()">Cancel</button>
                </form>
            </div>
        </div>
    `;
}

async function editDepartment(id) {
  try {
    const departments = await apiCall('/admin/departments');
    const dept = departments.find((d) => d.id === id);

    if (!dept) {
      showToast('Department not found', 'error');
      return;
    }

    const container = document.getElementById('dept-form-container');
    container.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>Edit Department</h5>
                    <form id="dept-form" onsubmit="handleDeptSubmit(event)" data-edit-id="${id}">
                        <div class="mb-2">
                            <input type="text" class="form-control" id="dept-name" value="${dept.name}" required>
                        </div>
                        <div class="mb-2">
                            <textarea class="form-control" id="dept-description" rows="2" required>${dept.description}</textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Update</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelDeptForm()">Cancel</button>
                    </form>
                </div>
            </div>
        `;
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function handleDeptSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('dept-form');
  const id = form.dataset.editId;
  const deptData = {
    name: document.getElementById('dept-name').value,
    description: document.getElementById('dept-description').value,
  };

  try {
    if (id) {
      await apiCall(`/admin/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(deptData),
      });
      showToast('Department updated successfully', 'success');
    } else {
      await apiCall('/admin/departments', {
        method: 'POST',
        body: JSON.stringify(deptData),
      });
      showToast('Department created successfully', 'success');
    }

    cancelDeptForm();
    renderDepartmentsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function cancelDeptForm() {
  document.getElementById('dept-form-container').innerHTML = '';
}

async function deleteDepartment(id) {
  if (!confirm('Are you sure you want to delete this department?')) return;

  try {
    await apiCall(`/admin/departments/${id}`, { method: 'DELETE' });
    showToast('Department deleted successfully', 'success');
    renderDepartmentsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function renderEmployeesList() {
  try {
    const employees = await apiCall('/admin/employees');
    const accounts = await apiCall('/admin/accounts');
    const departments = await apiCall('/admin/departments');

    const employeesContent = document.getElementById('employees-content');
    employeesContent.innerHTML = `
            <button class="btn btn-success mb-3" onclick="showAddEmployeeForm()">+ Add Employee</button>
            
            <div id="employee-form-container"></div>
            
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Employee ID</th>
                        <th>User</th>
                        <th>Position</th>
                        <th>Department</th>
                        <th>Hire Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${employees
                      .map((emp) => {
                        const user = accounts.find((a) => a.id === emp.userId);
                        const dept = departments.find(
                          (d) => d.id === emp.deptId,
                        );
                        return `
                            <tr>
                                <td>${emp.empId}</td>
                                <td>${user ? `${user.firstName} ${user.lastName}` : 'N/A'}</td>
                                <td>${emp.position}</td>
                                <td>${dept ? dept.name : 'N/A'}</td>
                                <td>${emp.hireDate}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning" onclick="editEmployee(${emp.id})">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                                </td>
                            </tr>
                        `;
                      })
                      .join('')}
                </tbody>
            </table>
        `;
  } catch (error) {
    showToast('Error loading employees: ' + error.message, 'error');
  }
}

async function showAddEmployeeForm() {
  try {
    const accounts = await apiCall('/admin/accounts');
    const departments = await apiCall('/admin/departments');

    const container = document.getElementById('employee-form-container');
    container.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>Add New Employee</h5>
                    <form id="employee-form" onsubmit="handleEmployeeSubmit(event)">
                        <div class="mb-2">
                            <input type="text" class="form-control" id="emp-id" placeholder="Employee ID" required>
                        </div>
                        <div class="mb-2">
                            <select class="form-control" id="emp-user" required>
                                <option value="">Select User</option>
                                ${accounts.map((acc) => `<option value="${acc.id}">${acc.firstName} ${acc.lastName}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <input type="text" class="form-control" id="emp-position" placeholder="Position" required>
                        </div>
                        <div class="mb-2">
                            <select class="form-control" id="emp-dept" required>
                                <option value="">Select Department</option>
                                ${departments.map((dept) => `<option value="${dept.id}">${dept.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <input type="date" class="form-control" id="emp-hire-date" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelEmployeeForm()">Cancel</button>
                    </form>
                </div>
            </div>
        `;
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function editEmployee(id) {
  try {
    const employees = await apiCall('/admin/employees');
    const accounts = await apiCall('/admin/accounts');
    const departments = await apiCall('/admin/departments');
    const emp = employees.find((e) => e.id === id);

    if (!emp) {
      showToast('Employee not found', 'error');
      return;
    }

    const container = document.getElementById('employee-form-container');
    container.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>Edit Employee</h5>
                    <form id="employee-form" onsubmit="handleEmployeeSubmit(event)" data-edit-id="${id}">
                        <div class="mb-2">
                            <input type="text" class="form-control" id="emp-id" value="${emp.empId}" required>
                        </div>
                        <div class="mb-2">
                            <select class="form-control" id="emp-user" required>
                                ${accounts.map((acc) => `<option value="${acc.id}" ${acc.id === emp.userId ? 'selected' : ''}>${acc.firstName} ${acc.lastName}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <input type="text" class="form-control" id="emp-position" value="${emp.position}" required>
                        </div>
                        <div class="mb-2">
                            <select class="form-control" id="emp-dept" required>
                                ${departments.map((dept) => `<option value="${dept.id}" ${dept.id === emp.deptId ? 'selected' : ''}>${dept.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <input type="date" class="form-control" id="emp-hire-date" value="${emp.hireDate}" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Update</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelEmployeeForm()">Cancel</button>
                    </form>
                </div>
            </div>
        `;
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function handleEmployeeSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('employee-form');
  const id = form.dataset.editId;
  const empData = {
    empId: document.getElementById('emp-id').value,
    userId: document.getElementById('emp-user').value,
    position: document.getElementById('emp-position').value,
    deptId: document.getElementById('emp-dept').value,
    hireDate: document.getElementById('emp-hire-date').value,
  };

  try {
    if (id) {
      await apiCall(`/admin/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(empData),
      });
      showToast('Employee updated successfully', 'success');
    } else {
      await apiCall('/admin/employees', {
        method: 'POST',
        body: JSON.stringify(empData),
      });
      showToast('Employee created successfully', 'success');
    }

    cancelEmployeeForm();
    renderEmployeesList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function cancelEmployeeForm() {
  document.getElementById('employee-form-container').innerHTML = '';
}

async function deleteEmployee(id) {
  if (!confirm('Are you sure you want to delete this employee?')) return;

  try {
    await apiCall(`/admin/employees/${id}`, { method: 'DELETE' });
    showToast('Employee deleted successfully', 'success');
    renderEmployeesList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function renderRequestsList() {
  try {
    const requests = await apiCall('/requests');

    const requestsContent = document.getElementById('requests-content');
    requestsContent.innerHTML = `
            <button class="btn btn-success mb-3" onclick="showAddRequestForm()">+ New Request</button>
            
            <div id="request-form-container"></div>
            
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Date</th>
                        <th>Status</th>
                        ${currentUser.role === 'admin' ? '<th>Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${requests
                      .map(
                        (req) => `
                        <tr>
                            <td>${req.type}</td>
                            <td>${req.items.map((i) => `${i.item} (${i.quantity})`).join(', ')}</td>
                            <td>${req.date}</td>
                            <td><span class="badge bg-${req.status === 'Pending' ? 'warning' : req.status === 'Approved' ? 'success' : 'danger'}">${req.status}</span></td>
                            ${
                              currentUser.role === 'admin'
                                ? `
                                <td>
                                    ${
                                      req.status === 'Pending'
                                        ? `
                                        <button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})">Approve</button>
                                        <button class="btn btn-sm btn-danger" onclick="rejectRequest(${req.id})">Reject</button>
                                    `
                                        : ''
                                    }
                                </td>
                            `
                                : ''
                            }
                        </tr>
                    `,
                      )
                      .join('')}
                </tbody>
            </table>
        `;
  } catch (error) {
    showToast('Error loading requests: ' + error.message, 'error');
  }
}

function showAddRequestForm() {
  const container = document.getElementById('request-form-container');
  container.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <h5>Submit New Request</h5>
                <form id="request-form" onsubmit="handleRequestSubmit(event)">
                    <div class="mb-2">
                        <select class="form-control" id="request-type" required>
                            <option value="">Select Type</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Supplies">Supplies</option>
                            <option value="Leave">Leave</option>
                        </select>
                    </div>
                    <div id="request-items-container">
                        <div class="request-item mb-2">
                            <input type="text" class="form-control mb-1 item-name" placeholder="Item name" required>
                            <input type="number" class="form-control item-quantity" placeholder="Quantity" required>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary mb-2" onclick="addRequestItem()">+ Add Item</button>
                    <br>
                    <button type="submit" class="btn btn-primary">Submit Request</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelRequestForm()">Cancel</button>
                </form>
            </div>
        </div>
    `;
}

function addRequestItem() {
  const container = document.getElementById('request-items-container');
  const newItem = document.createElement('div');
  newItem.className = 'request-item mb-2';
  newItem.innerHTML = `
        <input type="text" class="form-control mb-1 item-name" placeholder="Item name" required>
        <input type="number" class="form-control item-quantity" placeholder="Quantity" required>
    `;
  container.appendChild(newItem);
}

async function handleRequestSubmit(e) {
  e.preventDefault();

  const type = document.getElementById('request-type').value;
  const items = [];

  document.querySelectorAll('.request-item').forEach((item) => {
    const itemName = item.querySelector('.item-name').value;
    const quantity = item.querySelector('.item-quantity').value;
    if (itemName && quantity) {
      items.push({ item: itemName, quantity: parseInt(quantity) });
    }
  });

  if (items.length === 0) {
    showToast('Please add at least one item', 'warning');
    return;
  }

  try {
    await apiCall('/requests', {
      method: 'POST',
      body: JSON.stringify({ type, items }),
    });

    showToast('Request submitted successfully', 'success');
    cancelRequestForm();
    renderRequestsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function cancelRequestForm() {
  document.getElementById('request-form-container').innerHTML = '';
}

async function approveRequest(id) {
  try {
    await apiCall(`/admin/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Approved' }),
    });
    showToast('Request approved', 'success');
    renderRequestsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function rejectRequest(id) {
  try {
    await apiCall(`/admin/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Rejected' }),
    });
    showToast('Request rejected', 'success');
    renderRequestsList();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash || '#/';
  const route = hash.replace('#/', '');

  console.log('📍 Navigating to:', route || 'home');

  const allPages = document.querySelectorAll('.page');
  allPages.forEach((page) => page.classList.remove('active'));

  const isAuthenticated = document.body.classList.contains('authenticated');
  const isAdmin = document.body.classList.contains('is-admin');

  let pageToShow = null;

  switch (route) {
    case '':
    case 'home':
      pageToShow = 'home-page';
      break;

    case 'login':
      if (isAuthenticated) {
        navigateTo('#/profile');
        return;
      }
      pageToShow = 'login-page';
      break;

    case 'register':
      if (isAuthenticated) {
        navigateTo('#/profile');
        return;
      }
      pageToShow = 'register-page';
      break;

    case 'verify-email':
      const unverifiedEmail = localStorage.getItem('unverified_email');
      if (unverifiedEmail) {
        document.getElementById('verification-email').textContent =
          unverifiedEmail;
      }
      pageToShow = 'verify-email-page';
      break;

    case 'profile':
      if (!isAuthenticated) {
        showToast('Please login first', 'warning');
        navigateTo('#/login');
        return;
      }
      renderProfile();
      pageToShow = 'profile-page';
      break;

    case 'requests':
      if (!isAuthenticated) {
        showToast('Please login first', 'warning');
        navigateTo('#/login');
        return;
      }
      renderRequestsList();
      pageToShow = 'requests-page';
      break;

    case 'employees':
      if (!isAuthenticated) {
        showToast('Please login first', 'warning');
        navigateTo('#/login');
        return;
      }
      if (!isAdmin) {
        showToast('Access Denied: Admin only', 'error');
        navigateTo('#/profile');
        return;
      }
      renderEmployeesList();
      pageToShow = 'employees-page';
      break;

    case 'accounts':
      if (!isAuthenticated) {
        showToast('Please login first', 'warning');
        navigateTo('#/login');
        return;
      }
      if (!isAdmin) {
        showToast('Access Denied: Admin only', 'error');
        navigateTo('#/profile');
        return;
      }
      renderAccountsList();
      pageToShow = 'accounts-page';
      break;

    case 'departments':
      if (!isAuthenticated) {
        showToast('Please login first', 'warning');
        navigateTo('#/login');
        return;
      }
      if (!isAdmin) {
        showToast('Access Denied: Admin only', 'error');
        navigateTo('#/profile');
        return;
      }
      renderDepartmentsList();
      pageToShow = 'departments-page';
      break;

    default:
      navigateTo('#/');
      return;
  }

  if (pageToShow) {
    const page = document.getElementById(pageToShow);
    if (page) {
      page.classList.add('active');
    }
  }
}

window.addEventListener('hashchange', handleRouting);

document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 App initialized with backend integration!');

  checkAuth();

  if (!window.location.hash) {
    window.location.hash = '#/';
  }

  handleRouting();
  setupEventListeners();
});

function setupEventListeners() {
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const verifyBtn = document.getElementById('verify-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', handleEmailVerification);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}
