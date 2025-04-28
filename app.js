require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// 初始化应用
const app = express();
const PORT = process.env.PORT || 3333;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 确保上传目录存在
const uploadsAvatarDir = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadsAvatarDir)) {
  fs.mkdirSync(uploadsAvatarDir, { recursive: true });
}

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'server/views'));

// 引入路由
const articleRoutes = require('./server/routes/articleRoutes');
const adminRoutes = require('./server/routes/adminRoutes');
const authRoutes = require('./server/routes/authRoutes');
const socialMediaRoutes = require('./server/routes/socialMediaRoutes');
const aiRoutes = require('./server/routes/aiRoutes');

// 使用路由
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/social', socialMediaRoutes);
app.use('/api/ai', aiRoutes);

// 前端路由 - 所有不匹配API的请求都返回主页
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`您可以通过服务器IP地址访问此网站`);
});

module.exports = app;
