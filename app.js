require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/project');
const taskRoutes = require('./routes/task');
const commentRoutes = require('./routes/comment');
const notificationRoutes = require('./routes/notification');
const profileRoutes = require('./routes/profile');
const activityRoutes = require('./routes/activity');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/project_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/project_management' }),
}));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes placeholder
app.get('/', (req, res) => {
  res.render('index');
});

// Socket.io basic
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('joinTask', (taskId) => {
    socket.join(taskId);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  next();
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', projectRoutes);
app.use('/', taskRoutes);
app.use('/', commentRoutes);
app.use('/', notificationRoutes);
app.use('/', profileRoutes);
app.use('/', activityRoutes);

const userSocketMap = {};
io.on('connection', (socket) => {
  socket.on('registerUser', (userId) => {
    userSocketMap[userId] = socket.id;
  });
  socket.on('disconnect', () => {
    for (const [userId, id] of Object.entries(userSocketMap)) {
      if (id === socket.id) delete userSocketMap[userId];
    }
  });
});

app.set('io', io);
app.set('userSocketMap', userSocketMap);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 