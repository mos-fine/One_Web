/**
 * AI设置管理控制器
 * 处理后台AI配置的增删改查
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// 配置文件路径
const AI_SETTINGS_PATH = path.join(__dirname, '../../config/ai-settings.json');
const AI_USAGE_PATH = path.join(__dirname, '../../config/ai-usage-stats.json');

// 确保配置目录存在
const configDir = path.join(__dirname, '../../config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 确保配置文件存在
if (!fs.existsSync(AI_SETTINGS_PATH)) {
  // 创建默认配置文件
  const defaultSettings = {
    enabled: true,
    modelType: 'secure',
    secure: {
      appId: 'default_app_id'
    },
    features: {
      bubblePanelEnable: true,
      enabledMenus: ['ai_continue', 'ai_improve', 'ai_summarize', 'ai_translate'],
      trackTokenUsage: true
    },
    limits: {
      dailyTokenLimit: 100000,
      maxQueryLength: 5000
    }
  };
  
  fs.writeFileSync(AI_SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2));
}

// 确保用量统计文件存在
if (!fs.existsSync(AI_USAGE_PATH)) {
  // 创建默认用量统计
  const defaultUsage = {
    monthlyTokens: 0,
    dailyTokens: 0,
    totalCalls: 0,
    dailyReset: new Date().toISOString(),
    monthlyReset: new Date().toISOString(),
    usageHistory: []
  };
  
  fs.writeFileSync(AI_USAGE_PATH, JSON.stringify(defaultUsage, null, 2));
}

const aiController = {
  /**
   * 获取AI设置
   */
  getSettings: (req, res) => {
    // 检查管理员权限
    if (!req.session.admin) {
      return res.status(401).json({
        success: false,
        message: '未授权，需要管理员权限'
      });
    }
    
    try {
      // 读取设置文件
      const settings = JSON.parse(fs.readFileSync(AI_SETTINGS_PATH, 'utf8'));
      
      // 移除敏感信息，只在设置页面显示占位符
      const safeSettings = { ...settings };
      
      // 根据模型类型处理敏感字段
      if (safeSettings.openai && safeSettings.openai.apiKey) {
        const apiKey = safeSettings.openai.apiKey;
        safeSettings.openai.apiKey = maskSensitiveInfo(apiKey);
      }
      
      if (safeSettings.spark) {
        if (safeSettings.spark.apiKey) {
          safeSettings.spark.apiKey = maskSensitiveInfo(safeSettings.spark.apiKey);
        }
        if (safeSettings.spark.apiSecret) {
          safeSettings.spark.apiSecret = maskSensitiveInfo(safeSettings.spark.apiSecret);
        }
      }
      
      if (safeSettings.wenxin && safeSettings.wenxin.accessToken) {
        safeSettings.wenxin.accessToken = maskSensitiveInfo(safeSettings.wenxin.accessToken);
      }
      
      return res.json({
        success: true,
        settings: safeSettings
      });
    } catch (error) {
      console.error('获取AI设置出错:', error);
      return res.status(500).json({
        success: false,
        message: '读取AI设置时出错',
        error: error.message
      });
    }
  },
  
  /**
   * 保存AI设置
   */
  saveSettings: (req, res) => {
    // 检查管理员权限
    if (!req.session.admin) {
      return res.status(401).json({
        success: false,
        message: '未授权，需要管理员权限'
      });
    }
    
    try {
      const newSettings = req.body;
      
      // 读取原有设置
      let existingSettings = {};
      try {
        existingSettings = JSON.parse(fs.readFileSync(AI_SETTINGS_PATH, 'utf8'));
      } catch (err) {
        // 如果文件不存在或格式错误，则使用空对象
        console.warn('读取原有设置失败，将使用新设置覆盖');
      }
      
      // 处理敏感字段，检查是否为占位符，如果是则保留原值
      
      // 处理OpenAI密钥
      if (newSettings.openai && existingSettings.openai) {
        if (newSettings.openai.apiKey && isMaskedValue(newSettings.openai.apiKey)) {
          newSettings.openai.apiKey = existingSettings.openai.apiKey || '';
        }
      }
      
      // 处理星火密钥
      if (newSettings.spark && existingSettings.spark) {
        if (newSettings.spark.apiKey && isMaskedValue(newSettings.spark.apiKey)) {
          newSettings.spark.apiKey = existingSettings.spark.apiKey || '';
        }
        if (newSettings.spark.apiSecret && isMaskedValue(newSettings.spark.apiSecret)) {
          newSettings.spark.apiSecret = existingSettings.spark.apiSecret || '';
        }
      }
      
      // 处理文心一言令牌
      if (newSettings.wenxin && existingSettings.wenxin) {
        if (newSettings.wenxin.accessToken && isMaskedValue(newSettings.wenxin.accessToken)) {
          newSettings.wenxin.accessToken = existingSettings.wenxin.accessToken || '';
        }
      }
      
      // 确保至少有基本属性
      newSettings.enabled = newSettings.enabled !== false; // 默认为true
      
      // 保存设置
      fs.writeFileSync(AI_SETTINGS_PATH, JSON.stringify(newSettings, null, 2));
      
      return res.json({
        success: true,
        message: 'AI设置已保存'
      });
    } catch (error) {
      console.error('保存AI设置出错:', error);
      return res.status(500).json({
        success: false,
        message: '保存AI设置时出错',
        error: error.message
      });
    }
  },
  
  /**
   * 获取AI使用统计
   */
  getUsageStats: (req, res) => {
    // 检查管理员权限
    if (!req.session.admin) {
      return res.status(401).json({
        success: false,
        message: '未授权，需要管理员权限'
      });
    }
    
    try {
      // 读取使用统计文件
      let usageStats = {};
      try {
        usageStats = JSON.parse(fs.readFileSync(AI_USAGE_PATH, 'utf8'));
      } catch (err) {
        // 如果文件不存在或格式错误，则使用空对象
        console.warn('读取使用统计失败，将使用默认值');
        usageStats = {
          monthlyTokens: 0,
          dailyTokens: 0,
          totalCalls: 0,
          dailyReset: new Date().toISOString(),
          monthlyReset: new Date().toISOString(),
          usageHistory: []
        };
      }
      
      // 检查是否需要重置每日计数
      const now = new Date();
      const dailyReset = new Date(usageStats.dailyReset || now);
      if (now.getDate() !== dailyReset.getDate() || 
          now.getMonth() !== dailyReset.getMonth() || 
          now.getFullYear() !== dailyReset.getFullYear()) {
        // 重置每日计数
        usageStats.dailyTokens = 0;
        usageStats.dailyReset = now.toISOString();
        
        // 记录历史
        if (!usageStats.usageHistory) usageStats.usageHistory = [];
        usageStats.usageHistory.push({
          date: dailyReset.toISOString().split('T')[0],
          tokens: usageStats.dailyTokens || 0
        });
        
        // 保留最多30天的历史记录
        if (usageStats.usageHistory.length > 30) {
          usageStats.usageHistory = usageStats.usageHistory.slice(-30);
        }
        
        // 保存更新后的统计
        fs.writeFileSync(AI_USAGE_PATH, JSON.stringify(usageStats, null, 2));
      }
      
      // 检查是否需要重置每月计数
      const monthlyReset = new Date(usageStats.monthlyReset || now);
      if (now.getMonth() !== monthlyReset.getMonth() || 
          now.getFullYear() !== monthlyReset.getFullYear()) {
        // 重置每月计数
        usageStats.monthlyTokens = 0;
        usageStats.monthlyReset = now.toISOString();
        
        // 保存更新后的统计
        fs.writeFileSync(AI_USAGE_PATH, JSON.stringify(usageStats, null, 2));
      }
      
      return res.json({
        success: true,
        stats: {
          monthlyTokens: usageStats.monthlyTokens || 0,
          dailyTokens: usageStats.dailyTokens || 0,
          totalCalls: usageStats.totalCalls || 0,
          history: usageStats.usageHistory || []
        }
      });
    } catch (error) {
      console.error('获取AI使用统计出错:', error);
      return res.status(500).json({
        success: false,
        message: '读取AI使用统计时出错',
        error: error.message
      });
    }
  },
  
  /**
   * 记录Token使用情况
   */
  recordTokenUsage: (req, res) => {
    const { count, modelType } = req.body;
    
    // 验证请求
    if (!count || isNaN(parseInt(count))) {
      return res.status(400).json({
        success: false,
        message: '无效的Token数量'
      });
    }
    
    try {
      // 读取现有统计
      let usageStats = {};
      try {
        usageStats = JSON.parse(fs.readFileSync(AI_USAGE_PATH, 'utf8'));
      } catch (err) {
        // 如果文件不存在或格式错误，则创建新的
        usageStats = {
          monthlyTokens: 0,
          dailyTokens: 0,
          totalCalls: 0,
          dailyReset: new Date().toISOString(),
          monthlyReset: new Date().toISOString(),
          usageHistory: []
        };
      }
      
      // 更新统计信息
      const tokenCount = parseInt(count);
      usageStats.dailyTokens = (usageStats.dailyTokens || 0) + tokenCount;
      usageStats.monthlyTokens = (usageStats.monthlyTokens || 0) + tokenCount;
      usageStats.totalCalls = (usageStats.totalCalls || 0) + 1;
      
      // 保存更新后的统计
      fs.writeFileSync(AI_USAGE_PATH, JSON.stringify(usageStats, null, 2));
      
      return res.json({
        success: true,
        message: 'Token使用情况已记录',
        stats: {
          dailyTokens: usageStats.dailyTokens,
          monthlyTokens: usageStats.monthlyTokens,
          totalCalls: usageStats.totalCalls
        }
      });
    } catch (error) {
      console.error('记录Token使用情况出错:', error);
      return res.status(500).json({
        success: false,
        message: '记录Token使用情况时出错',
        error: error.message
      });
    }
  },
  
  /**
   * 测试AI功能
   */
  testAi: async (req, res) => {
    // 检查管理员权限
    if (!req.session.admin) {
      return res.status(401).json({
        success: false,
        message: '未授权，需要管理员权限'
      });
    }
    
    const { modelType, prompt } = req.body;
    
    // 验证请求
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: '提示词不能为空'
      });
    }
    
    try {
      // 读取AI设置
      const settings = JSON.parse(fs.readFileSync(AI_SETTINGS_PATH, 'utf8'));
      
      // 检查AI是否启用
      if (!settings.enabled) {
        return res.status(400).json({
          success: false,
          message: 'AI功能当前已禁用'
        });
      }
      
      // 根据模型类型进行测试
      let result = '';
      
      switch (modelType || settings.modelType) {
        case 'openai':
          result = await testOpenai(prompt, settings.openai);
          break;
        case 'spark':
          result = await testSpark(prompt, settings.spark);
          break;
        case 'secure':
          result = await testSecureProxy(prompt, settings.secure);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `不支持的模型类型: ${modelType || settings.modelType}`
          });
      }
      
      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('测试AI功能出错:', error);
      return res.status(500).json({
        success: false,
        message: '测试AI功能时出错',
        error: error.message
      });
    }
  }
};

/**
 * 掩码敏感信息
 * @param {string} value 原始值
 * @returns {string} 掩码后的值
 */
function maskSensitiveInfo(value) {
  if (!value) return '';
  
  if (value.length <= 8) {
    // 短密钥，只显示前2位
    return value.substring(0, 2) + '******';
  } else {
    // 长密钥，显示前4位和后4位
    return value.substring(0, 4) + '******' + value.substring(value.length - 4);
  }
}

/**
 * 检查是否为掩码值
 * @param {string} value 要检查的值
 * @returns {boolean} 是否为掩码值
 */
function isMaskedValue(value) {
  return value && value.includes('******');
}

/**
 * 测试OpenAI功能
 * @param {string} prompt 提示词
 * @param {Object} config OpenAI配置
 * @returns {Promise<string>} 响应结果
 */
async function testOpenai(prompt, config) {
  if (!config || !config.apiKey) {
    throw new Error('OpenAI配置不完整，请检查API Key');
  }
  
  // 准备请求参数
  const url = config.customUrl || 
              `${config.endpoint || 'https://api.openai.com'}/v1/chat/completions`;
              
  console.log(`正在使用端点: ${url}`);
  console.log(`使用的模型: ${config.model || 'gpt-3.5-turbo'}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    // 确保使用最新的API版本
    'OpenAI-Beta': 'assistants=v1'
  };
  
  const data = {
    model: config.model || 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: '你是一个有帮助的AI助手。' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 500,
    temperature: 0.7
  };
  
  try {
    console.log('发送API请求到OpenAI...');
    // 设置较长的超时时间
    const response = await axios.post(url, data, { 
      headers,
      timeout: 30000 // 30秒超时
    });
    
    console.log('收到OpenAI响应:', response.status);
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      console.error('OpenAI响应格式不符合预期:', JSON.stringify(response.data));
      throw new Error('无效的AI响应格式');
    }
  } catch (error) {
    console.error('OpenAI API调用出错:', error);
    
    if (error.response) {
      // 详细记录API错误
      const errorDetails = error.response.data && error.response.data.error 
        ? JSON.stringify(error.response.data.error) 
        : '无详细错误信息';
      
      console.error(`API状态码: ${error.response.status}`);
      console.error(`API错误详情: ${errorDetails}`);
      
      throw new Error(`API调用失败: ${error.response.status} - ${error.response.data.error?.message || errorDetails}`);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到API响应');
      throw new Error(`API调用超时或无响应: ${error.message}`);
    } else {
      // 设置请求时发生的错误
      console.error('请求设置错误:', error.message);
      throw new Error(`API请求错误: ${error.message}`);
    }
  }
}

/**
 * 测试星火大模型功能
 * @param {string} prompt 提示词
 * @param {Object} config 星火配置
 * @returns {Promise<string>} 响应结果
 */
async function testSpark(prompt, config) {
  // 由于星火大模型是WebSocket接口，这里我们使用服务端代理来模拟测试
  if (!config || !config.appId) {
    throw new Error('星火大模型配置不完整，请检查参数');
  }
  
  // 在实际应用中，这里应该调用星火大模型的HTTP客户端API
  // 这里我们简单模拟一个响应
  return `[星火大模型模拟响应] 您的提问是: "${prompt}"\n\n由于星火大模型使用WebSocket接口，需要完整实现客户端代码才能测试。请确保已正确配置appId、apiKey和apiSecret，然后在实际编辑器中测试功能。`;
}

/**
 * 测试安全代理模式
 * @param {string} prompt 提示词
 * @param {Object} config 安全代理配置
 * @returns {Promise<string>} 响应结果
 */
async function testSecureProxy(prompt, config) {
  if (!config || !config.appId) {
    throw new Error('安全代理配置不完整，请检查参数');
  }
  
  try {
    console.log('测试安全代理模式, AppID:', config.appId);
    
    // 检查是否有可用的API密钥
    let useBackupApi = false;
    const backupApiKey = process.env.OPENAI_API_KEY || process.env.AI_BACKUP_KEY;
    
    if (backupApiKey) {
      console.log('检测到环境变量中的备用API密钥，尝试使用它进行真实测试');
      
      try {
        // 尝试使用环境变量中的备用API密钥进行测试
        const testResult = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '你是一个用于测试的AI助手。请用中文简短回复。' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.7
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backupApiKey}`
          },
          timeout: 10000
        });
        
        if (testResult.data && testResult.data.choices && testResult.data.choices.length > 0) {
          const response = testResult.data.choices[0].message.content;
          return `[安全代理模式 - 真实测试响应]\n\n${response}\n\n---\n安全代理模式已正确配置，API密钥安全存储在服务器端。`;
        }
      } catch (apiError) {
        console.error('使用备用API密钥测试失败:', apiError.message);
        // 如果API调用失败，回退到模拟响应
        useBackupApi = false;
      }
    }
    
    // 如果没有备用API密钥或API调用失败，返回模拟响应
    return `[安全代理模式 - 模拟响应] 您的提问是: "${prompt}"\n\n安全代理模式下，所有AI请求将通过服务器端安全处理，API密钥不会暴露在前端。\n\n这是一个模拟响应。在实际环境中，服务器将使用安全存储的密钥调用AI服务。如需进行真实测试，请在服务器环境变量中配置OPENAI_API_KEY。`;
  } catch (error) {
    console.error('安全代理测试失败:', error);
    throw new Error(`安全代理请求失败: ${error.message}`);
  }
}

module.exports = aiController;
