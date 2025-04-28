/**
 * AI编辑器客户端API
 * 封装了与服务器端AI配置交互的方法
 */

// 缓存配置和时间戳
let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 缓存有效期1分钟
let configValidationPromise = null;

/**
 * 验证AI配置是否可用
 * 发送一个轻量级请求到服务器以验证配置是否有效
 *
 * @param {Object} config AI配置对象
 * @returns {Promise<Object>} 验证结果
 */
export async function validateAiConfig(config) {
  // 如果已有验证进行中，返回该Promise
  if (configValidationPromise) {
    return configValidationPromise;
  }

  configValidationPromise = new Promise(async (resolve) => {
    if (!config) {
      resolve({ valid: false, message: 'AI配置不存在' });
      configValidationPromise = null;
      return;
    }

    try {
      // 发起轻量级验证请求
      const response = await fetch('/api/ai/validate-config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      resolve({ 
        valid: result.success, 
        message: result.message,
        modelType: result.modelType
      });
    } catch (error) {
      console.warn('验证AI配置时出错:', error);
      // 错误不意味着配置无效，可能只是网络问题
      resolve({ 
        valid: true, 
        message: '配置有效，但验证请求失败',
        warning: error.message 
      });
    } finally {
      // 清除验证Promise
      configValidationPromise = null;
    }
  });

  return configValidationPromise;
}

/**
 * 获取AI配置
 * 根据管理员在后台设置的配置，返回适合编辑器使用的配置对象
 * 
 * @param {boolean} forceRefresh 是否强制刷新配置
 * @param {boolean} validate 是否验证配置有效性
 * @returns {Promise<Object>} 编辑器AI配置
 */
export async function getAiEditorConfig(forceRefresh = false, validate = false) {
  // 检查是否可以使用缓存
  const now = Date.now();
  if (!forceRefresh && cachedConfig && (now - cacheTime < CACHE_TTL)) {
    console.log('使用缓存的AI配置');
    
    // 如果需要验证，可以在后台验证缓存的配置
    if (validate && cachedConfig) {
      validateAiConfig(cachedConfig).then(result => {
        if (!result.valid) {
          console.warn('缓存的AI配置无效，将在下次请求时重新获取', result.message);
          clearAiConfigCache();
        }
      });
    }
    
    return cachedConfig;
  }
  
  // 首先尝试从localStorage读取配置类型
  const preferredModelType = localStorage.getItem('preferred_ai_model');
  
  try {
    // 从服务器获取完整配置
    const response = await fetch('/api/admin/ai-settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!data.success || !data.settings) {
      console.warn('无法获取AI设置，将使用默认安全模式');
      return createDefaultAiConfig();
    }
    
    const settings = data.settings;
    
    // 检查AI是否启用
    if (!settings.enabled) {
      console.log('AI功能已在管理后台禁用');
      cachedConfig = null;
      cacheTime = now;
      return null; // 返回null表示AI功能被禁用
    }
    
    // 根据设置构建编辑器配置
    const config = buildEditorConfig(settings);
    
    // 更新缓存
    cachedConfig = config;
    cacheTime = now;
    
    return config;
  } catch (error) {
    console.error('获取AI设置时出错:', error);
    
    // 出错时使用本地存储的配置类型创建默认配置
    return createDefaultAiConfig(preferredModelType);
  }
}

/**
 * 清除AI配置缓存
 * 在设置更改后调用此方法强制刷新配置
 */
export function clearAiConfigCache() {
  console.log('清除AI配置缓存');
  cachedConfig = null;
  cacheTime = 0;
}

/**
 * 记录Token使用情况
 * 
 * @param {string} modelName 模型名称
 * @param {Object} modelConfig 模型配置
 * @param {number} count Token数量
 * @returns {Promise<Object>} 响应结果
 */
export async function recordTokenUsage(modelName, modelConfig, count) {
  try {
    const response = await fetch('/api/admin/ai-token-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelType: modelName,
        count: count
      }),
      credentials: 'include',
    });
    
    return await response.json();
  } catch (error) {
    console.error('记录Token使用情况时出错:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 构建编辑器配置
 * 
 * @param {Object} settings 服务器端AI设置
 * @returns {Object} 编辑器AI配置
 */
function buildEditorConfig(settings) {
  // 如果没有modelType，使用默认安全模式
  const modelType = settings.modelType || 'secure';
  
  // 基础配置
  const config = {
    models: {},
    bubblePanelEnable: settings.features?.bubblePanelEnable !== false,
    bubblePanelModel: "auto",
    menus: buildMenuConfig(settings.features?.enabledMenus || ['ai_continue', 'ai_improve']),
    bubblePanelMenus: buildBubbleMenus()
  };
  
  // 如果设置了记录Token使用
  if (settings.features?.trackTokenUsage) {
    config.onTokenConsume = (modelName, modelConfig, count) => {
      recordTokenUsage(modelName, modelConfig, count);
    };
  }
  
  // 根据模型类型添加对应配置
  switch (modelType) {
    case 'openai':
      if (settings.openai) {
        config.models.openai = {
          apiKey: settings.openai.apiKey || '',
          model: settings.openai.model || 'gpt-3.5-turbo',
        };
        
        // 如果设置了自定义端点
        if (settings.openai.endpoint) {
          config.models.openai.endpoint = settings.openai.endpoint;
        }
        
        // 确保模型值有效，即使是自定义模型
        if (config.models.openai.model === 'custom' && settings.openai.customModelName) {
          config.models.openai.model = settings.openai.customModelName;
        }
      }
      break;
      
    case 'spark':
      if (settings.spark) {
        config.models.spark = {
          appId: settings.spark.appId || '',
          apiKey: settings.spark.apiKey || '',
          apiSecret: settings.spark.apiSecret || '',
          version: settings.spark.version || 'v3.5',
          protocol: settings.spark.protocol || 'wss'
        };
      }
      break;
      
    case 'wenxin':
      if (settings.wenxin) {
        config.models.wenxin = {
          access_token: settings.wenxin.accessToken || ''
        };
      }
      break;
      
    case 'custom':
      if (settings.custom) {
        config.models.custom = {
          url: settings.custom.url || '',
          protocol: settings.custom.protocol || 'sse'
        };
      }
      break;
      
    case 'secure':
    default:
      // 安全模式
      config.models.spark = {
        appId: settings.secure?.appId || 'default_app_id'
      };
      
      // 添加URL签名处理
      config.onCreateClientUrl = (modelName, modelConfig, startFn) => {
        // 通过后端获取签名URL
        fetch(`/api/ai/getSignedUrl?appId=${modelConfig.appId}&model=${modelName}`)
          .then(resp => resp.json())
          .then(json => {
            if (json.success && json.url) {
              startFn(json.url);
            } else {
              console.error('获取签名URL失败:', json.message);
              // 避免直接弹出alert，而是显示友好错误提示
              const errorEvent = new CustomEvent('ai-api-error', { 
                detail: { message: json.message || '获取API签名失败' } 
              });
              document.dispatchEvent(errorEvent);
            }
          })
          .catch(err => {
            console.error('获取AI签名URL失败:', err);
            // 触发自定义错误事件，便于UI捕获和处理
            const errorEvent = new CustomEvent('ai-api-error', { 
              detail: { message: '网络请求失败，请检查网络连接' } 
            });
            document.dispatchEvent(errorEvent);
          });
      };
      break;
  }
  
  return config;
}

/**
 * 创建默认AI配置
 * 
 * @param {string} modelType 模型类型
 * @returns {Object} 默认AI配置
 */
function createDefaultAiConfig(modelType = 'secure') {
  // 基础配置
  const config = {
    models: {},
    bubblePanelEnable: true,
    bubblePanelModel: "auto",
    menus: buildMenuConfig(['ai_continue', 'ai_improve']),
    bubblePanelMenus: buildBubbleMenus()
  };
  
  // 根据模型类型处理
  if (modelType === 'secure' || !modelType) {
    config.models.spark = {
      appId: 'default_app_id'
    };
    
    // 添加URL签名处理
    config.onCreateClientUrl = (modelName, modelConfig, startFn) => {
      fetch(`/api/ai/getSignedUrl?appId=${modelConfig.appId}&model=${modelName}`)
        .then(resp => resp.json())
        .then(json => {
          if (json.success && json.url) {
            startFn(json.url);
          } else {
            console.error('获取签名URL失败:', json.message);
            alert('AI功能暂时不可用，请稍后再试');
          }
        })
        .catch(err => {
          console.error('获取AI签名URL失败:', err);
        });
    };
  }
  
  return config;
}

/**
 * 构建菜单配置
 * 
 * @param {Array} enabledMenus 启用的菜单数组
 * @returns {Array} 菜单配置
 */
function buildMenuConfig(enabledMenus) {
  // 默认菜单配置
  const allMenus = [
    { id: 'ai_continue', title: 'AI 续写', prompt: '请继续编写后续内容，保持相同的风格和主题。' },
    { id: 'ai_improve', title: 'AI 优化', prompt: '请优化这段文字，使其更加流畅、专业。' },
    { id: 'ai_summarize', title: 'AI 摘要', prompt: '请总结这段内容的要点。' },
    { id: 'ai_translate', title: 'AI 翻译', prompt: '请将这段文字翻译成英文，保持原意。' },
    { id: 'ai_rewrite', title: 'AI 重写', prompt: '请用不同的表达方式重写这段内容，但保持相同的意思。' },
    { id: 'ai_checkgrammar', title: '语法检查', prompt: '请检查这段文字中的语法错误并修正。' }
  ];
  
  // 根据启用的菜单ID过滤
  return allMenus.filter(menu => enabledMenus.includes(menu.id));
}

/**
 * 构建气泡菜单配置
 * 
 * @returns {Array} 气泡菜单配置
 */
function buildBubbleMenus() {
  return [
    { title: '继续编写', prompt: '请继续编写后续内容，保持相同的风格和主题。' },
    { title: '优化表达', prompt: '请优化这段文字，使其更加流畅、专业。' },
    { title: '生成摘要', prompt: '请总结这段内容的要点。' }
  ];
}
