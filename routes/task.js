const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { sendMail } = require('../utils/mailer');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// New task form
router.get('/projects/:projectId/tasks/new', requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.projectId).populate('members');
  res.render('tasks/new', { project });
});

// Create task
router.post('/projects/:projectId/tasks', requireAuth, async (req, res) => {
  const { title, description, assignedTo } = req.body;
  if (!title) return res.render('tasks/new', { error: 'Task title is required.', project: await Project.findById(req.params.projectId) });
  const task = new Task({
    title,
    description,
    assignedTo: assignedTo || null,
    project: req.params.projectId,
    createdBy: req.session.userId,
  });
  await task.save();
  await Project.findByIdAndUpdate(req.params.projectId, { $push: { tasks: task._id } });
  // Notify assigned user
  if (assignedTo && assignedTo !== req.session.userId) {
    const Notification = require('../models/Notification');
    const notif = new Notification({
      user: assignedTo,
      type: 'assignment',
      message: `You have been assigned a new task: ${title}`,
      link: `/tasks/${task._id}`,
    });
    await notif.save();
    const io = req.app.get('io');
    const userSocketMap = req.app.get('userSocketMap');
    if (userSocketMap[assignedTo]) {
      io.to(userSocketMap[assignedTo]).emit('notify');
    }
    // Send email
    const assignedUser = await User.findById(assignedTo);
    if (assignedUser && assignedUser.email) {
      sendMail({
        to: assignedUser.email,
        subject: 'You have been assigned a new task',
        html: `<p>Hello ${assignedUser.username},</p><p>You have been assigned a new task: <b>${title}</b> in project <b>${project.name}</b>.</p><p><a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks/${task._id}">View Task</a></p>`
      });
    }
  }
  // Log activity
  await Activity.create({ project: req.params.projectId, user: req.session.userId, action: 'created a task', details: title });
  res.redirect('/projects/' + req.params.projectId);
});

// View task details
router.get('/tasks/:id', requireAuth, async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assignedTo').populate('project');
  if (!task) return res.redirect('/dashboard');
  res.render('tasks/view', { task });
});

// Edit task form
router.get('/tasks/:id/edit', requireAuth, async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project');
  const project = await Project.findById(task.project._id).populate('members');
  res.render('tasks/edit', { task, project });
});

// Update task
router.post('/tasks/:id', requireAuth, async (req, res) => {
  const { title, description, status, assignedTo } = req.body;
  await Task.findByIdAndUpdate(req.params.id, { title, description, status, assignedTo: assignedTo || null });
  const task = await Task.findById(req.params.id);
  // Log activity
  await Activity.create({ project: task.project, user: req.session.userId, action: 'updated a task', details: title + ' (' + status + ')'});
  res.redirect('/projects/' + task.project);
});

// Delete task
router.post('/tasks/:id/delete', requireAuth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  await Task.findByIdAndDelete(req.params.id);
  await Project.findByIdAndUpdate(task.project, { $pull: { tasks: task._id } });
  // Log activity
  await Activity.create({ project: task.project, user: req.session.userId, action: 'deleted a task', details: task.title });
  res.redirect('/projects/' + task.project);
});

// Update task status (AJAX)
router.post('/tasks/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).send('Task not found');
  task.status = status;
  await task.save();
  // Log activity
  const Activity = require('../models/Activity');
  await Activity.create({ project: task.project, user: req.session.userId, action: 'moved a task', details: `${task.title} to ${status}` });
  res.send('OK');
});

module.exports = router; 