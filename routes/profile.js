const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// View profile
router.get('/profile', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('profile/view', { user });
});

// Edit profile form
router.get('/profile/edit', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('profile/edit', { user });
});

// Update profile
router.post('/profile/edit', requireAuth, async (req, res) => {
  const { username, email } = req.body;
  await User.findByIdAndUpdate(req.session.userId, { username, email });
  res.redirect('/profile');
});

// Change password form
router.get('/profile/password', requireAuth, (req, res) => {
  res.render('profile/password');
});

// Change password POST
router.post('/profile/password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.session.userId);
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) return res.render('profile/password', { error: 'Old password incorrect.' });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.render('profile/password', { success: 'Password updated.' });
});

module.exports = router; 