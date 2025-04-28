/**
 * AI设置管理路由
 * 处理后台AI配置相关的API路由
 */

const express = require('express');
const router = express.Router();
const aiSettingsController = require('../controllers/aiSettingsController');

// 获取AI设置
router.get('/ai-settings', aiSettingsController.getSettings);

// 保存AI设置
router.post('/ai-settings', aiSettingsController.saveSettings);

// 获取AI使用统计
router.get('/ai-usage-stats', aiSettingsController.getUsageStats);

// 记录Token使用情况
router.post('/ai-token-usage', aiSettingsController.recordTokenUsage);

// 测试AI功能
router.post('/test-ai', aiSettingsController.testAi);

module.exports = router;
