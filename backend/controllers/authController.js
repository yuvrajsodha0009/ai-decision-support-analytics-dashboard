const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Trim inputs
    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    // Validation
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user exists
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hash = await bcrypt.hash(trimmedPassword, 10);

    // Create user
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hash
    });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trim inputs
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    // Validation
    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Default admin bootstrap: ensure admin exists and allow login with predefined credentials
    const defaultAdmin = {
      name: 'Admin',
      email: 'admin@gmail.com',
      password: 'admin123'
    };

    if (trimmedEmail === defaultAdmin.email && trimmedPassword === defaultAdmin.password) {
      let adminUser = await User.findOne({ email: trimmedEmail });

      if (!adminUser) {
        const hash = await bcrypt.hash(defaultAdmin.password, 10);
        adminUser = await User.create({
          name: defaultAdmin.name,
          email: trimmedEmail,
          password: hash
        });
      } else {
        const matches = await bcrypt.compare(trimmedPassword, adminUser.password);
        if (!matches) {
          adminUser.password = await bcrypt.hash(defaultAdmin.password, 10);
          await adminUser.save();
        }
      }

      const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        token,
        user: { id: adminUser._id, name: adminUser.name, email: adminUser.email }
      });
    }

    // Find user
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(trimmedPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Failed to get user' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Failed to get users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) {
      if (!emailRegex.test(email.trim().toLowerCase())) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      updateData.email = email.trim().toLowerCase();
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
};
