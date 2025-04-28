/**
 * AI服务路由
 * 提供AI模型URL签名和令牌验证功能
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const AI_SETTINGS_PATH = path.join(__dirname, '../../config/ai-settings.json');
const AI_USAGE_PATH = path.join(__dirname, '../../config/ai-usage-stats.json');

/**
 * 获取签名URL
 * 为前端提供安全的AI模型访问URL
 */
router.get('/getSignedUrl', async (req, res) => {
  const { appId, model } = req.query;
  
  // 请求验证
  if (!appId) {
    return res.status(400).json({
      success: false,
      message: '缺少必要的应用ID参数'
    });
  }
  
  try {
    // 读取设置
    const settings = JSON.parse(fs.readFileSync(AI_SETTINGS_PATH, 'utf8'));
    
    // 检查AI功能是否启用
    if (!settings.enabled) {
      return res.status(403).json({
        success: false,
        message: 'AI功能已在后台管理中禁用'
      });
    }
    
    // 获取当前使用量
    let usageStats;
    try {
      usageStats = JSON.parse(fs.readFileSync(AI_USAGE_PATH, 'utf8'));
    } catch (err) {
      console.warn('读取使用量统计失败，将使用默认值');
      usageStats = {
        dailyTokens: 0,
        monthlyTokens: 0,
        totalCalls: 0
      };
    }
    
    // 检查是否超过每日Token限制
    if (settings.limits && settings.limits.dailyTokenLimit > 0 && 
        usageStats.dailyTokens >= settings.limits.dailyTokenLimit) {
      return res.status(403).json({
        success: false,
        message: '已达到今日AI使用量限制，请明天再试'
      });
    }
    
    // 根据配置的模型类型生成签名URL
    let signedUrl = '';
    const modelType = settings.modelType || 'secure';
    
    switch (modelType) {
      case 'openai':
        signedUrl = await generateOpenaiSignedUrl(settings.openai);
        break;
        
      case 'spark':
        signedUrl = await generateSparkSignedUrl(settings.spark);
        break;
        
      case 'wenxin':
        signedUrl = await generateWenxinSignedUrl(settings.wenxin);
        break;
        
      case 'secure':
      default:
        // 默认使用星火大模型作为安全模型
        signedUrl = await generateSparkSignedUrl(settings.secure || settings.spark);
        break;
    }
    
    if (!signedUrl) {
      return res.status(500).json({
        success: false,
        message: '获取签名URL失败，请检查AI设置'
      });
    }
    
    // 返回签名URL
    return res.json({
      success: true,
      url: signedUrl,
      model: modelType
    });
    
  } catch (error) {
    console.error('获取签名URL出错:', error);
    return res.status(500).json({
      success: false,
      message: '获取签名URL时出错',
      error: error.message
    });
  }
});

/**
 * 验证AI配置
 * 轻量级检查AI配置状态，不进行实际的AI请求
 */
router.get('/validate-config', async (req, res) => {
  try {
    // 读取设置
    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(AI_SETTINGS_PATH, 'utf8'));
    } catch (err) {
      return res.json({
        success: false,
        message: 'AI设置文件不存在或格式错误',
        error: err.message
      });
    }
    
    // 检查AI功能是否启用
    if (!settings.enabled) {
      return res.json({
        success: false,
        message: 'AI功能已在后台管理中禁用',
        modelType: null
      });
    }
    
    // 获取当前模型类型
    const modelType = settings.modelType || 'secure';
    
    // 验证模型配置
    let configValid = true;
    let configMessage = 'AI配置有效';
    
    switch (modelType) {
      case 'openai':
        if (!settings.openai || !settings.openai.apiKey) {
          configValid = false;
          configMessage = 'OpenAI API密钥缺失或无效';
        }
        break;
        
      case 'spark':
        if (!settings.spark || !settings.spark.appId || !settings.spark.apiKey || !settings.spark.apiSecret) {
          configValid = false;
          configMessage = '星火大模型配置不完整';
        }
        break;
        
      case 'wenxin':
        if (!settings.wenxin || !settings.wenxin.accessToken) {
          configValid = false;
          configMessage = '文心一言配置不完整';
        }
        break;
        
      case 'custom':
        if (!settings.custom || !settings.custom.url) {
          configValid = false;
          configMessage = '自定义AI接口URL缺失';
        }
        break;
        
      case 'secure':
        if (!settings.secure || !settings.secure.appId) {
          configValid = false;
          configMessage = '安全代理模式配置不完整';
        }
        break;
        
      default:
        configValid = false;
        configMessage = `未知的模型类型: ${modelType}`;
    }
    
    return res.json({
      success: configValid,
      message: configMessage,
      modelType: modelType
    });
    
  } catch (error) {
    console.error('验证AI配置时出错:', error);
    return res.status(500).json({
      success: false,
      message: '验证AI配置时发生内部错误',
      error: error.message
    });
  }
});

/**
 * 生成OpenAI签名URL
 */
async function generateOpenaiSignedUrl(config) {
  if (!config || !config.apiKey) {
    throw new Error('OpenAI配置不完整，请检查API Key');
  }
  
  // 对于OpenAI，我们不提供直接URL，而是加密后返回URL和认证信息
  const apiKey = config.apiKey;
  const endpoint = config.endpoint || 'https://api.openai.com';
  
  // 为了安全，我们使用一种简单的加密方式
  const encryptedKey = encryptApiKey(apiKey);
  
  // 返回加密后的模拟URL，前端会解析这个格式并使用
  return `${endpoint}/v1/chat/completions?auth=${encryptedKey}&ts=${Date.now()}&secure=true`;
}

/**
 * 生成星火大模型签名URL
 */
async function generateSparkSignedUrl(config) {
  if (!config || !config.appId) {
    throw new Error('星火大模型配置不完整，请检查参数');
  }
  
  // 星火大模型使用WebSocket，需要生成鉴权URL
  const host = 'wss://spark-api.xf-yun.com';
  const path = '/v3.5/chat';  // v3.5 是最新版本的星火大模型路径
  
  // 获取鉴权参数
  const apiKey = config.apiKey || process.env.SPARK_API_KEY;
  const apiSecret = config.apiSecret || process.env.SPARK_API_SECRET;
  const appId = config.appId;
  
  if (!apiKey || !apiSecret) {
    throw new Error('星火大模型密钥未配置');
  }
  
  // 生成RFC1123格式的时间戳
  const now = new Date();
  const date = now.toUTCString();
  
  // 拼接待签名字符串
  const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET ${path} HTTP/1.1`;
  
  // 使用HMAC-SHA256进行签名
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(signatureOrigin);
  const signature = hmac.digest('base64');
  
  // 组装鉴权字符串
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  
  // 组装鉴权URL
  const url = `${host}${path}?authorization=${authorization}&date=${encodeURI(date)}&host=${encodeURI('spark-api.xf-yun.com')}&appid=${appId}`;
  
  return url;
}

/**
 * 生成文心一言签名URL
 */
async function generateWenxinSignedUrl(config) {
  if (!config || !config.accessToken) {
    throw new Error('文心一言配置不完整，请检查Access Token');
  }
  
  // 文心一言使用REST API，需要生成包含Access Token的URL
  return `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${config.accessToken}`;
}

/**
 * 简单的API密钥加密函数
 */
function encryptApiKey(apiKey) {
  const cipher = crypto.createCipher('aes-256-ctr', process.env.ENCRYPTION_KEY || 'default-encryption-key');
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

module.exports = router;
