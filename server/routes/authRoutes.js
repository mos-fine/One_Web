const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登录
router.post('/login', authController.login);

// 登出
router.post('/logout', authController.logout);

// 检查登录状态
router.get('/check', authController.checkAuth);

// 获取管理员信息（无论是否已登录）
router.get('/admin-info', authController.getAdminInfo);

// 初始化管理员账户
router.post('/init', authController.initAdmin);

module.exports = router;
