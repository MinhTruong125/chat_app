  const express = require('express');
  const http = require('http');
  const socketio = require('socket.io');
  const path = require('path');
  const exphbs = require('express-handlebars');
  const mongoose = require('./config/db');
  const cookieParser = require('cookie-parser');

  const session = require('express-session');
  const passport = require('passport');
  require('./config/passport');
  require('dotenv').config();   

  const authRoutes = require('./routes/auth.route');
  const userRoutes = require('./routes/user.route');
  const messageRoutes = require('./routes/message.route');
  const postRoutes = require('./routes/post.route');
  const socketHandler = require('./sockets/socketHandler');

  const setupChatSockets = require('./sockets/chat.socket');
  const setupSocketAuth = require('./sockets/socket-auth');
  const { verifyTokenMiddleware } = require('./middlewares/auth.middleware');
  const attachUser = require('./middlewares/attachUser'); 

  const app = express();
  const server = http.createServer(app);
  const io = socketio(server);

  const dayjs = require('dayjs');
  const relativeTime = require('dayjs/plugin/relativeTime');

  dayjs.extend(relativeTime);
  require('dayjs/locale/vi'); // nếu muốn tiếng Việt

  dayjs.locale('vi'); // sử dụng ngôn ngữ Vietnamese

  app.set("io", io);

  // Middleware
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachUser); 


  // Static files
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Handlebars setup
  app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),

    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true
    },
    helpers: {
      ifCond: function (a, b, c, options) {
        // Nếu chỉ có 2 tham số (cho thông báo: this.type và "like")
        if (!options && typeof c === 'object') {
          options = c;
          return a === b ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
        }
        // Trường hợp 3 tham số (cho quyền xóa bình luận)
        const postOwnerStr = a?.toString?.();
        const userIdStr = b?.toString?.();
        const commentAuthorStr = c?.toString?.();
        if (userIdStr === postOwnerStr || userIdStr === commentAuthorStr) {
          return options.fn(this);
        }
        return options.inverse ? options.inverse(this) : '';
      },
      includes: function (array, value) {
        if (!Array.isArray(array)) return false;
        return array
          .filter(id => id != null)
          .map(id => id?.toString?.())
          .includes(value?.toString?.());
      },
      eq: function (a, b) {
        return a === b;
      },
      formatTimeAgo: function (timestamp) {
        return dayjs(timestamp).fromNow();
      }
    }

  }));
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(session({
    secret: process.env.SESSION_SECRET, // Đặt secret thật an toàn
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());



  // Routes
  app.use('/', authRoutes);
  app.use('/users', userRoutes);
  app.use('/messages', messageRoutes);
  app.use('/posts', postRoutes);
  

  app.get('/', (req, res) => {
    if (req.user) {
      console.log("[DEBUG] Logged in user:", req.user);
      return res.redirect('/posts/feeds');
    }
    return res.redirect('/login');
  });

  // Socket.IO
  setupSocketAuth(io);
  setupChatSockets(io);
  socketHandler(io);

  server.listen(3000, () => console.log("Server running on http://localhost:3000"));
