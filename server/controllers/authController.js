const Admin = require('../models/admin');

const authController = {
  // 登录处理
  login: (req, res) => {
    const { username, password } = req.body;

    Admin.findByUsername(username, async (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器错误' });
      }

      if (results.length === 0) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const admin = results[0];
      const isPasswordValid = await Admin.validatePassword(password, admin.password);

      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      // 存储用户会话
      req.session.admin = {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        avatar: admin.avatar
      };

      res.json({
        success: true,
        message: '登录成功',
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          avatar: admin.avatar
        }
      });
    });
  },

  // 登出处理
  logout: (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: '已成功退出登录' });
  },

  // 检查登录状态
  checkAuth: (req, res) => {
    if (req.session.admin) {
      res.json({
        success: true,
        admin: req.session.admin
      });
    } else {
      res.status(401).json({
        success: false,
        message: '未登录'
      });
    }
  },

  // 初始化管理员账户
  initAdmin: (req, res) => {
    Admin.checkEmpty((err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器错误' });
      }

      if (results[0].count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: '管理员账户已存在，不能初始化' 
        });
      }

      const adminData = {
        username: 'admin',  // 默认管理员用户名
        password: 'admin123', // 默认密码
        name: '网站管理员'
      };

      Admin.create(adminData, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: '创建管理员失败' });
        }
        
        res.json({ 
          success: true, 
          message: '管理员账户初始化成功，请登录后立即修改默认密码',
          username: adminData.username,
          password: 'admin123' // 显示初始密码
        });
      });
    });
  }
};

module.exports = authController;
