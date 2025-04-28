/**
 * AI编辑器客户端API
 * 封装了与服务器端AI配置交互的方法
 */

/**
 * 获取AI配置
 * 根据管理员在后台设置的配置，返回适合编辑器使用的配置对象
 * 
 * @returns {Promise<Object>} 编辑器AI配置
 */
export async function getAiEditorConfig() {
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
      return null; // 返回null表示AI功能被禁用
    }
    
    // 根据设置构建编辑器配置
    return buildEditorConfig(settings);
  } catch (error) {
    console.error('获取AI设置时出错:', error);
    
    // 出错时使用本地存储的配置类型创建默认配置
    return createDefaultAiConfig(preferredModelType);
  }
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
              alert('AI功能暂时不可用，请稍后再试');
            }
          })
          .catch(err => {
            console.error('获取AI签名URL失败:', err);
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
  
  // 根据模型类型设置
  if (modelType === 'secure' || !modelType) {
    // 安全模式
    config.models.spark = {
      appId: 'default_app_id'
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
 * @param {Array} enabledMenuIds 启用的菜单ID
 * @returns {Array} 菜单配置
 */
function buildMenuConfig(enabledMenuIds = []) {
  const allMenus = {
    ai_continue: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M4 18.9997H20V13.9997H22V19.9997C22 20.552 21.5523 20.9997 21 20.9997H3C2.44772 20.9997 2 20.552 2 19.9997V13.9997H4V18.9997ZM16.1716 6.9997L12.2218 3.04996L13.636 1.63574L20 7.9997L13.636 14.3637L12.2218 12.9495L16.1716 8.9997H2V6.9997H16.1716Z" fill="currentColor"></path></svg>`,
      name: "AI 续写",
      prompt: "请帮我继续扩展一些这段话的内容",
      text: "focusBefore",
      model: "auto"
    },
    ai_improve: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M15 5.25C16.7949 5.25 18.25 3.79493 18.25 2H19.75C19.75 3.79493 21.2051 5.25 23 5.25V6.75C21.2051 6.75 19.75 8.20507 19.75 10H18.25C18.25 8.20507 16.7949 6.75 15 6.75V5.25ZM4 7C4 5.89543 4.89543 5 6 5H14C15.1046 5 16 5.89543 16 7V11C16 12.1046 15.1046 13 14 13H6C4.89543 13 4 12.1046 4 11V7ZM6 7V11H14V7H6ZM4 15C4 13.8954 4.89543 13 6 13H14C15.1046 13 16 13.8954 16 15V19C16 20.1046 15.1046 21 14 21H6C4.89543 21 4 20.1046 4 19V15ZM6 15V19H14V15H6ZM9 9H11V9.01H9V9ZM9 17H11V17.01H9V17Z" fill="currentColor"></path></svg>`,
      name: "AI 优化",
      prompt: "请帮我优化一下这段文字的内容，并返回结果",
      text: "selected",
      model: "auto"
    },
    ai_summarize: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9H15C13.6941 9 12.5831 8.16562 12.171 7.0009L11 7C9.9 7 9 7.9 9 9L9.0009 9.17102C10.1656 9.58312 11 10.6941 11 12C11 13.3059 10.1656 14.4169 9.0009 14.829L9 15C9 16.1 9.9 17 11 17L12.171 16.9991C12.5831 15.8344 13.6941 15 15 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21H15C13.6941 21 12.5831 20.1656 12.171 19.0009L11 19C8.79086 19 7 17.2091 7 15L6.98998 14.8287C5.83656 14.4169 5 13.3059 5 12C5 10.6941 5.83656 9.58312 6.98998 9.17134L7 9C7 6.79086 8.79086 5 11 5L12.171 4.99909C12.5831 3.83438 13.6941 3 15 3H18ZM18 5H15C14.4477 5 14 5.44772 14 6C14 6.55228 14.4477 7 15 7H18C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5ZM18 17H15C14.4477 17 14 17.4477 14 18C14 18.5523 14.4477 19 15 19H18C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17Z" fill="currentColor"></path></svg>`,
      name: "AI 摘要",
      prompt: "请帮我总结以下内容的要点，并返回总结结果",
      text: "selected",
      model: "auto"
    },
    ai_translate: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z" fill="currentColor"></path></svg>`,
      name: "AI 翻译",
      prompt: "请帮我翻译以下文本，如果是中文则翻译成英文，如果是英文则翻译成中文，只返回翻译结果",
      text: "selected",
      model: "auto"
    },
    ai_rewrite: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M6.41421 15.89L16.5563 5.74786L18.2634 7.45497L8.12132 17.5971L6.41421 15.89ZM3 20.5V18L4.88559 16.1144L6.59271 17.8215L4.70711 19.7071L7 22H3V20.5ZM15.8787 6.42532L17.5858 4.71821L19.299 6.42532L17.5919 8.13244L15.8787 6.42532ZM13 4H3V2H13V4Z" fill="currentColor"></path></svg>`,
      name: "AI 重写",
      prompt: "请用不同的表达方式重写以下内容，保持原意但使用不同的词汇和句式",
      text: "selected",
      model: "auto"
    },
    ai_checkgrammar: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M4 2H14V4H4V14H2V4C2 2.89543 2.89543 2 4 2ZM8 6H18V8H8V18H6V8C6 6.89543 6.89543 6 8 6ZM12 10H20C21.1046 10 22 10.8954 22 12V20C22 21.1046 21.1046 22 20 22H12C10.8954 22 10 21.1046 10 20V12C10 10.8954 10.8954 10 12 10ZM12 12V20H20V12H12Z" fill="currentColor"></path></svg>`,
      name: "AI 语法检查",
      prompt: "请检查以下文本中的语法和拼写错误，并返回修正后的文本",
      text: "selected",
      model: "auto"
    }
  };
  
  // 根据启用的菜单ID过滤菜单
  return enabledMenuIds
    .filter(id => allMenus[id])
    .map(id => allMenus[id]);
}

/**
 * 构建泡泡菜单
 * 
 * @returns {Array} 泡泡菜单配置
 */
function buildBubbleMenus() {
  return [
    {
      prompt: `<content>{content}</content>\n请帮我优化这段内容，并直接返回优化后的结果。\n注意：判断语言类型，中文返回中文，英文返回英文，只需要返回优化结果，不需要额外解释。`,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.1986 9.94447C14.7649 9.5337 14.4859 8.98613 14.4085 8.39384L14.0056 5.31138L11.275 6.79724C10.7503 7.08274 10.1433 7.17888 9.55608 7.06948L6.49998 6.50015L7.06931 9.55625C7.17871 10.1435 7.08257 10.7505 6.79707 11.2751L5.31121 14.0057L8.39367 14.4087C8.98596 14.486 9.53353 14.765 9.9443 15.1988L12 17.0981L14.0557 15.1988C14.4665 14.765 15.014 14.486 15.6063 14.4087L18.6888 14.0057L17.2029 11.2751C16.9174 10.7505 16.8213 10.1435 16.9307 9.55625L17.5 6.50015L14.4439 7.06948C13.8567 7.17888 13.2497 7.08274 12.725 6.79724L10 5.31472L9.59741 8.39384C9.51997 8.98613 9.24092 9.5337 8.80723 9.94447L7 11.7981L8.80723 13.6518C9.24092 14.0626 9.51997 14.6102 9.59741 15.2025L10 18.2849L12.725 16.7991C13.2497 16.5136 13.8567 16.4174 14.4439 16.5268L17.5 17.0981L16.9307 14.04C16.8213 13.4528 16.9174 12.8458 17.2029 12.3211L18.6888 9.59057L15.6063 9.18798C15.014 9.11054 14.4665 8.8315 14.0557 8.39781L12.2525 6.50015L15.1986 9.94447Z"></path></svg>`,
      title: '优化内容',
    },
    {
      prompt: `<content>{content}</content>\n请帮我检查这段内容的拼写和语法错误，并直接返回修正后的内容。\n注意：判断语言类型，中文返回中文，英文返回英文，只返回修正结果，不需要解释错误原因。`,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19C12.8284 19 13.5 19.6716 13.5 20.5C13.5 21.3284 12.8284 22 12 22C11.1716 22 10.5 21.3284 10.5 20.5C10.5 19.6716 11.1716 19 12 19ZM6.5 19C7.32843 19 8 19.6716 8 20.5C8 21.3284 7.32843 22 6.5 22C5.67157 22 5 21.3284 5 20.5C5 19.6716 5.67157 19 6.5 19ZM17.5 19C18.3284 19 19 19.6716 19 20.5C19 21.3284 18.3284 22 17.5 22C16.6716 22 16 21.3284 16 20.5C16 19.6716 16.6716 19 17.5 19ZM16.2032 2.59282C17.3317 1.43156 19.2288 1.41265 20.3813 2.5499C21.5339 3.68715 21.5339 5.57229 20.3813 6.70954L8.97099 18.2447C8.84655 18.3716 8.74243 18.5144 8.6558 18.6693L6.60579 22.2539C6.41769 22.5871 5.96681 22.6513 5.6904 22.3793C5.41398 22.1073 5.35678 21.6174 5.55968 21.294L7.48384 17.9216C7.56161 17.7834 7.65591 17.6548 7.76463 17.541L16.2032 9.02308C16.5834 8.63725 16.5834 8.01261 16.2032 7.62678C15.823 7.24096 15.2068 7.24096 14.8266 7.62678L6.38801 16.1446C6.27534 16.2592 6.14367 16.3581 5.99909 16.4394L2.58255 18.3807C2.27333 18.5599 1.86944 18.4943 1.62745 18.1945C1.38546 17.8948 1.32947 17.4486 1.52621 17.0919L3.42812 13.6754C3.50636 13.5376 3.6005 13.4111 3.71001 13.301L15.1203 1.79584C16.2489 0.634575 18.146 0.615672 19.2984 1.75292C20.451 2.89017 20.451 4.77532 19.2984 5.91257L8.2793 17.0531C7.89911 17.4389 7.28297 17.4389 6.90277 17.0531C6.52258 16.6673 6.52258 16.0427 6.90277 15.6569L16.2032 6.24993C16.5834 5.8641 16.5834 5.23946 16.2032 4.85364C15.823 4.46781 15.2068 4.46781 14.8266 4.85363L5.52616 14.2606C4.38435 15.4181 4.38435 17.2919 5.52616 18.4494C6.66798 19.6069 8.51409 19.6069 9.65591 18.4494L20.675 7.30887C21.8168 6.1516 21.8168 4.26646 20.675 3.10921C19.5331 1.95196 17.6744 1.95196 16.5326 3.10921L5.12234 14.6144C5.01282 14.7245 4.91869 14.851 4.84045 14.9889L2.93854 18.4054C2.7418 18.762 2.79779 19.2082 3.03978 19.508C3.28176 19.8078 3.68566 19.8734 3.99488 19.6941L7.41142 17.7529C7.556 17.6716 7.68766 17.5727 7.80034 17.4581L19.2016 5.91431C20.3434 4.75705 20.3434 2.8719 19.2016 1.71465C18.0598 0.557394 16.2011 0.557395 15.0593 1.71465L16.2032 2.59282Z"></path></svg>`,
      title: '修正语法',
    },
    '<hr/>',
    {
      prompt: `<content>{content}</content>\n请翻译以上内容，判断语言类型，中文翻译为英文，其他语言翻译为中文，只返回翻译结果，不需要任何解释。`,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z"></path></svg>`,
      title: '翻译',
    },
    {
      prompt: `<content>{content}</content>\n请总结以上内容，并直接返回总结结果。\n注意：判断语言类型，中文返回中文，英文返回英文，只返回总结内容，不需要解释。`,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9H15C13.6941 9 12.5831 8.16562 12.171 7.0009L11 7C9.9 7 9 7.9 9 9L9.0009 9.17102C10.1656 9.58312 11 10.6941 11 12C11 13.3059 10.1656 14.4169 9.0009 14.829L9 15C9 16.1 9.9 17 11 17L12.171 16.9991C12.5831 15.8344 13.6941 15 15 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21H15C13.6941 21 12.5831 20.1656 12.171 19.0009L11 19C8.79086 19 7 17.2091 7 15L6.98998 14.8287C5.83656 14.4169 5 13.3059 5 12C5 10.6941 5.83656 9.58312 6.98998 9.17134L7 9C7 6.79086 8.79086 5 11 5L12.171 4.99909C12.5831 3.83438 13.6941 3 15 3H18ZM18 5H15C14.4477 5 14 5.44772 14 6C14 6.55228 14.4477 7 15 7H18C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5ZM18 17H15C14.4477 17 14 17.4477 14 18C14 18.5523 14.4477 19 15 19H18C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17Z"></path></svg>`,
      title: '总结',
    }
  ];
}
