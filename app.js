const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const exphbs = require('express-handlebars');
const mongoose = require('./config/db');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const messageRoutes = require('./routes/message.route');


const setupChatSocket = require('./sockets/chat.socket');

const setupSocketAuth = require('./sockets/socket-auth');
const { verifyTokenMiddleware } = require('./middlewares/auth.middleware');

const app = express();
const server = http.createServer(app);
const io = socketio(server);


app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Handlebars
app.engine('hbs', exphbs.engine({ extname: '.hbs', defaultLayout: 'main', layoutsDir: path.join(__dirname, 'views/layouts') }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/messages', messageRoutes);

app.get('/chat', verifyTokenMiddleware, (req, res) => {
  res.render('chat', { title: 'Chat', user: req.user, userJSON: JSON.stringify(req.user), script: 'chat.js' });
});

app.get('/find-friends', verifyTokenMiddleware, (req, res) => {
  res.render('find-friends', {
    title: 'Tìm bạn bè',
    user: req.user,
    userJSON: JSON.stringify(req.user),
    script: 'friend.js'
  });
});

// Root route redirect
app.get('/', (req, res) => res.redirect('/login'));

// Socket
setupSocketAuth(io);  
setupChatSocket(io);


server.listen(3000, () => console.log("Server running on port 3000"));