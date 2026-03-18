const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = {
  accounts: [],
  departments: [
    { id: 1, name: 'Engineering', description: 'Software development team' },
    { id: 2, name: 'HR', description: 'Human resources department' },
  ],
  employees: [],
  requests: [],
};

async function initializeAdmin() {
  if (db.accounts.length === 0) {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    db.accounts.push({
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      verified: true,
    });
    console.log('✅ Default admin account created');
  }
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Register new account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = db.accounts.find((acc) => acc.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAccount = {
      id: db.accounts.length + 1,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'user',
      verified: false,
    };

    db.accounts.push(newAccount);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email.',
      user: { id: newAccount.id, email: newAccount.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
app.post('/api/auth/verify', (req, res) => {
  try {
    const { email } = req.body;

    const account = db.accounts.find((acc) => acc.email === email);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    account.verified = true;

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const account = db.accounts.find((acc) => acc.email === email);
    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!account.verified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    const validPassword = await bcrypt.compare(password, account.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: account.id,
        email: account.email,
        role: account.role,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.json({
      success: true,
      token,
      user: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        role: account.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const account = db.accounts.find((acc) => acc.id === req.user.id);
  if (!account) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    role: account.role,
    verified: account.verified,
  });
});

// ==========================================
// ADMIN ROUTES - ACCOUNTS
// ==========================================

app.get('/api/admin/accounts', authenticateToken, requireAdmin, (req, res) => {
  const accounts = db.accounts.map((acc) => ({
    id: acc.id,
    firstName: acc.firstName,
    lastName: acc.lastName,
    email: acc.email,
    role: acc.role,
    verified: acc.verified,
  }));
  res.json(accounts);
});

app.post(
  '/api/admin/accounts',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, role, verified } = req.body;

      // Check if email exists
      const existingUser = db.accounts.find((acc) => acc.email === email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newAccount = {
        id: db.accounts.length + 1,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        verified,
      };

      db.accounts.push(newAccount);

      res.status(201).json({
        id: newAccount.id,
        firstName: newAccount.firstName,
        lastName: newAccount.lastName,
        email: newAccount.email,
        role: newAccount.role,
        verified: newAccount.verified,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

app.put(
  '/api/admin/accounts/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const account = db.accounts.find((acc) => acc.id === accountId);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const { firstName, lastName, email, password, role, verified } = req.body;

      if (firstName) account.firstName = firstName;
      if (lastName) account.lastName = lastName;
      if (email) account.email = email;
      if (password) account.password = await bcrypt.hash(password, 10);
      if (role) account.role = role;
      if (typeof verified !== 'undefined') account.verified = verified;

      res.json({
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        role: account.role,
        verified: account.verified,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

app.delete(
  '/api/admin/accounts/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const accountId = parseInt(req.params.id);

    // Prevent deleting own account
    if (accountId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const index = db.accounts.findIndex((acc) => acc.id === accountId);
    if (index === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }

    db.accounts.splice(index, 1);
    res.status(204).send();
  },
);

// ==========================================
// ADMIN ROUTES - DEPARTMENTS
// ==========================================

app.get(
  '/api/admin/departments',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    res.json(db.departments);
  },
);

app.post(
  '/api/admin/departments',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { name, description } = req.body;

    const newDept = {
      id: db.departments.length + 1,
      name,
      description,
    };

    db.departments.push(newDept);
    res.status(201).json(newDept);
  },
);

app.put(
  '/api/admin/departments/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const deptId = parseInt(req.params.id);
    const dept = db.departments.find((d) => d.id === deptId);

    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const { name, description } = req.body;
    if (name) dept.name = name;
    if (description) dept.description = description;

    res.json(dept);
  },
);

app.delete(
  '/api/admin/departments/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const deptId = parseInt(req.params.id);
    const index = db.departments.findIndex((d) => d.id === deptId);

    if (index === -1) {
      return res.status(404).json({ error: 'Department not found' });
    }

    db.departments.splice(index, 1);
    res.status(204).send();
  },
);

// ==========================================
// ADMIN ROUTES - EMPLOYEES
// ==========================================

app.get('/api/admin/employees', authenticateToken, requireAdmin, (req, res) => {
  res.json(db.employees);
});

app.post(
  '/api/admin/employees',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { empId, userId, position, deptId, hireDate } = req.body;

    const newEmployee = {
      id: db.employees.length + 1,
      empId,
      userId: parseInt(userId),
      position,
      deptId: parseInt(deptId),
      hireDate,
    };

    db.employees.push(newEmployee);
    res.status(201).json(newEmployee);
  },
);

app.put(
  '/api/admin/employees/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const employeeId = parseInt(req.params.id);
    const employee = db.employees.find((e) => e.id === employeeId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { empId, userId, position, deptId, hireDate } = req.body;
    if (empId) employee.empId = empId;
    if (userId) employee.userId = parseInt(userId);
    if (position) employee.position = position;
    if (deptId) employee.deptId = parseInt(deptId);
    if (hireDate) employee.hireDate = hireDate;

    res.json(employee);
  },
);

app.delete(
  '/api/admin/employees/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const employeeId = parseInt(req.params.id);
    const index = db.employees.findIndex((e) => e.id === employeeId);

    if (index === -1) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    db.employees.splice(index, 1);
    res.status(204).send();
  },
);

// ==========================================
// USER ROUTES - REQUESTS
// ==========================================

app.get('/api/requests', authenticateToken, (req, res) => {
  let requests = db.requests;

  // Regular users only see their own requests
  if (req.user.role !== 'admin') {
    requests = requests.filter((r) => r.employeeEmail === req.user.email);
  }

  res.json(requests);
});

app.post('/api/requests', authenticateToken, (req, res) => {
  const { type, items } = req.body;

  const newRequest = {
    id: db.requests.length + 1,
    type,
    items,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    employeeEmail: req.user.email,
  };

  db.requests.push(newRequest);
  res.status(201).json(newRequest);
});

app.put(
  '/api/admin/requests/:id',
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const requestId = parseInt(req.params.id);
    const request = db.requests.find((r) => r.id === requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { status } = req.body;
    if (status) request.status = status;

    res.json(request);
  },
);

app.listen(PORT, async () => {
  await initializeAdmin();
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📧 Default admin: admin@example.com / Password123!`);
  console.log(`\n✅ Available endpoints:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/verify`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/profile`);
  console.log(`   GET  /api/admin/accounts`);
  console.log(`   GET  /api/admin/departments`);
  console.log(`   GET  /api/admin/employees`);
  console.log(`   GET  /api/requests`);
});
