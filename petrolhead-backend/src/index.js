const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRouter = require('./routes/auth');
const postsRouter = require('./routes/posts');
const topicsRouter = require('./routes/topics');
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');
const storiesRouter = require('./routes/stories');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    // Allow localhost on any port and any 192.168.x.x address
    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    const isLAN = /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
    const isExpo = origin.startsWith('http://10.') || origin.startsWith('http://172.');
    if (isLocalhost || isLAN || isExpo) {
      return callback(null, true);
    }
    return callback(new Error('CORS: Origin not allowed: ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB bağlandı"))
  .catch((err) => console.log("MongoDB hatası:", err));

app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);
app.use('/api/stories', storiesRouter);

const PORT = 3000;
app.listen(PORT, '0.0.0.0');
