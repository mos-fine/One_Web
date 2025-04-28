const express = require('express');
const router = express.Router();
const { adminController, upload } = require('../controllers/adminController');
const aiSettingsRoutes = require('./aiSettingsRoutes');

// 这个路由模块主要用于管理员特定的功能
// 例如修改管理员信息、修改密码等、AI设置管理等

// 使用AI设置路由
router.use('/', aiSettingsRoutes);

// 获取管理员信息
router.get('/profile', adminController.getProfile);

// 更新管理员信息（支持头像上传）
router.put('/profile', upload.single('avatar'), adminController.updateProfile);

// 修改管理员密码
router.put('/change-password', adminController.changePassword);

module.exports = router;
