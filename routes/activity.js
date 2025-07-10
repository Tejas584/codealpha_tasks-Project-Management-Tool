const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const Project = require('../models/Project');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// Project activity feed
router.get('/projects/:id/activity', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.redirect('/dashboard');
  const activities = await Activity.find({ project: project._id }).populate('user').sort({ createdAt: -1 }).limit(50);
  res.render('projects/activity', { project, activities });
});

module.exports = router; 