const express = require('express');
const router = express.Router();
const socialMediaController = require('../controllers/socialMediaController');

// 获取所有平台
router.get('/platforms', socialMediaController.getAllPlatforms);

// 添加平台
router.post('/platforms', socialMediaController.addPlatform);

// 更新平台
router.put('/platforms/:id', socialMediaController.updatePlatform);

// 删除平台
router.delete('/platforms/:id', socialMediaController.deletePlatform);

// 启用/禁用平台
router.patch('/platforms/:id/toggle', socialMediaController.togglePlatform);

// 分享文章到社交媒体
router.post('/share', socialMediaController.shareArticle);

module.exports = router;
