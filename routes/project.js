const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Activity = require('../models/Activity');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// New project form
router.get('/projects/new', requireAuth, (req, res) => {
  res.render('projects/new');
});

// Create project
router.post('/projects', requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.render('projects/new', { error: 'Project name is required.' });
  const project = new Project({
    name,
    description,
    members: [req.session.userId],
    createdBy: req.session.userId,
  });
  await project.save();
  await User.findByIdAndUpdate(req.session.userId, { $push: { projects: project._id } });
  // Log activity
  await Activity.create({ project: project._id, user: req.session.userId, action: 'created the project', details: project.name });
  res.redirect('/dashboard');
});

// View project details
router.get('/projects/:id', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('members')
    .populate({ path: 'tasks', populate: { path: 'assignedTo' } });
  if (!project) return res.redirect('/dashboard');
  res.render('projects/view', { project });
});

// Edit project form
router.get('/projects/:id/edit', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.redirect('/dashboard');
  res.render('projects/edit', { project });
});

// Update project
router.post('/projects/:id', requireAuth, async (req, res) => {
  const { name, description } = req.body;
  await Project.findByIdAndUpdate(req.params.id, { name, description });
  // Log activity
  await Activity.create({ project: req.params.id, user: req.session.userId, action: 'edited the project', details: name });
  res.redirect('/projects/' + req.params.id);
});

// Delete project
router.post('/projects/:id/delete', requireAuth, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  // Log activity
  await Activity.create({ project: req.params.id, user: req.session.userId, action: 'deleted the project' });
  res.redirect('/dashboard');
});

// Invite member form
router.get('/projects/:id/invite', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id).populate('members').populate('createdBy');
  if (!project || project.createdBy._id.toString() !== req.session.userId) return res.redirect('/dashboard');
  res.render('projects/invite', { project });
});

// Invite member POST
router.post('/projects/:id/invite', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id).populate('members').populate('createdBy');
  if (!project || project.createdBy._id.toString() !== req.session.userId) return res.redirect('/dashboard');
  const { usernameOrEmail } = req.body;
  const User = require('../models/User');
  const user = await User.findOne({ $or: [ { username: usernameOrEmail }, { email: usernameOrEmail } ] });
  if (!user) return res.render('projects/invite', { project, error: 'User not found.' });
  if (project.members.map(m=>m._id.toString()).includes(user._id.toString())) return res.render('projects/invite', { project, error: 'User already a member.' });
  project.members.push(user._id);
  await project.save();
  user.projects.push(project._id);
  await user.save();
  // re-populate for updated list
  await project.populate('members');
  // Log activity
  await Activity.create({ project: project._id, user: req.session.userId, action: 'invited a member', details: user.username });
  res.render('projects/invite', { project, success: 'User added!' });
});

// Remove member
router.post('/projects/:id/remove/:userId', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || project.createdBy.toString() !== req.session.userId) return res.redirect('/dashboard');
  project.members.pull(req.params.userId);
  await project.save();
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.params.userId, { $pull: { projects: project._id } });
  // Log activity
  await Activity.create({ project: project._id, user: req.session.userId, action: 'removed a member', details: req.params.userId });
  res.redirect('/projects/' + req.params.id);
});

// Archive project
router.post('/projects/:id/archive', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || project.createdBy.toString() !== req.session.userId) return res.redirect('/dashboard');
  project.archived = true;
  await project.save();
  res.redirect('/dashboard');
});

// Unarchive project
router.post('/projects/:id/unarchive', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || project.createdBy.toString() !== req.session.userId) return res.redirect('/dashboard');
  project.archived = false;
  await project.save();
  res.redirect('/dashboard');
});

// Complete project
router.post('/projects/:id/complete', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || project.createdBy.toString() !== req.session.userId) return res.redirect('/dashboard');
  project.completed = true;
  await project.save();
  res.redirect('/dashboard');
});

// Uncomplete project
router.post('/projects/:id/uncomplete', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || project.createdBy.toString() !== req.session.userId) return res.redirect('/dashboard');
  project.completed = false;
  await project.save();
  res.redirect('/dashboard');
});

module.exports = router; 