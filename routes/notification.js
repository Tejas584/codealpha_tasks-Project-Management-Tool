const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).send('Unauthorized');
  next();
}

// Fetch notifications (AJAX)
router.get('/notifications', requireAuth, async (req, res) => {
  const notifications = await Notification.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(20);
  res.json(notifications);
});

// Mark notification as read
router.post('/notifications/:id/read', requireAuth, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.send('OK');
});

module.exports = router; 