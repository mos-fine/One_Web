const express = require('express');
const router = express.Router();

// 这个路由模块主要用于管理员特定的功能
// 例如修改管理员信息、修改密码等

// 修改管理员密码
router.put('/change-password', (req, res) => {
  // 此功能将在后续版本中实现
  res.json({
    success: false,
    message: '此功能尚未实现'
  });
});

// 获取管理员信息
router.get('/profile', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({
      success: false,
      message: '未授权'
    });
  }
  
  // 返回管理员信息（不包含密码）
  res.json({
    success: true,
    admin: req.session.admin
  });
});

// 更新管理员信息
router.put('/profile', (req, res) => {
  // 此功能将在后续版本中实现
  res.json({
    success: false,
    message: '此功能尚未实现'
  });
});

module.exports = router;
