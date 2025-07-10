const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Register form
router.get('/register', (req, res) => {
  res.render('auth/register');
});

// Register POST
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.render('auth/register', { error: 'All fields are required.' });
  }
  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    return res.render('auth/register', { error: 'Username or email already exists.' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hash });
  await user.save();
  req.session.userId = user._id;
  res.redirect('/dashboard');
});

// Login form
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Login POST
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    return res.render('auth/login', { error: 'Invalid credentials.' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('auth/login', { error: 'Invalid credentials.' });
  }
  req.session.userId = user._id;
  res.redirect('/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router; 