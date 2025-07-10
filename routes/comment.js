const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { sendMail } = require('../utils/mailer');
const User = require('../models/User');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).send('Unauthorized');
  next();
}

// Fetch comments for a task (AJAX)
router.get('/tasks/:taskId/comments', requireAuth, async (req, res) => {
  const comments = await Comment.find({ task: req.params.taskId }).populate('author').sort({ createdAt: 1 });
  res.render('comments/list', { comments }, (err, html) => {
    res.send(html);
  });
});

// Add a comment to a task (AJAX)
router.post('/tasks/:taskId/comments', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).send('Comment required');
  const comment = new Comment({
    text,
    author: req.session.userId,
    task: req.params.taskId,
  });
  await comment.save();
  await Task.findByIdAndUpdate(req.params.taskId, { $push: { comments: comment._id } });
  // Emit real-time update
  req.app.get('io').to(req.params.taskId).emit('newComment', { taskId: req.params.taskId });
  // Notify assigned user if not the commenter
  const task = await Task.findById(req.params.taskId);
  if (task.assignedTo && task.assignedTo.toString() !== req.session.userId) {
    const Notification = require('../models/Notification');
    const notif = new Notification({
      user: task.assignedTo,
      type: 'comment',
      message: 'You have a new comment on a task.',
      link: `/tasks/${task._id}`,
    });
    await notif.save();
    const io = req.app.get('io');
    const userSocketMap = req.app.get('userSocketMap');
    if (userSocketMap[task.assignedTo]) {
      io.to(userSocketMap[task.assignedTo]).emit('notify');
    }
    // Send email
    const assignedUser = await User.findById(task.assignedTo);
    if (assignedUser && assignedUser.email) {
      sendMail({
        to: assignedUser.email,
        subject: 'New comment on your assigned task',
        html: `<p>Hello ${assignedUser.username},</p><p>You have a new comment on the task: <b>${task.title}</b>.</p><p><a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks/${task._id}">View Task</a></p>`
      });
    }
  }
  res.status(201).send('OK');
});

module.exports = router; 