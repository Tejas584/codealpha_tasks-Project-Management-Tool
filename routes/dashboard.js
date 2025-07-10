const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

router.get('/dashboard', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const showArchived = req.query.archived === '1';
  const projects = await Project.find({ members: user._id, archived: showArchived ? true : false });
  const tasks = await Task.find({ assignedTo: user._id }).populate('project');
  res.render('dashboard', { user, projects, tasks, showArchived });
});

module.exports = router; 