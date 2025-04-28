/**
 * AiEditor AI功能配置文件
 * 基于AiEditor官方文档(https://aieditor.dev/docs/zh/ai/base.html)实现
 * 此文件提供多种AI模型配置方案，可根据需要选择使用
 */

/**
 * 编辑器AI配置对象
 * 根据不同的AI提供商提供不同的配置选项
 * 使用时只需导入此对象并传递给AiEditor的ai参数
 */
export const editorAiConfig = {
    /**
     * OpenAI配置
     * 使用ChatGPT或兼容OpenAI API的其他模型
     * @param {string} apiKey - API密钥
     * @param {string} model - 模型名称，如gpt-4o-mini, gpt-3.5-turbo等
     * @returns {Object} OpenAI配置对象
     */
    openai: (apiKey, model = 'gpt-3.5-turbo') => ({
        models: {
            openai: {
                apiKey: apiKey,
                model: model,
                // 可选参数
                // endpoint: "https://api.openai.com", // 自定义端点URL
                // customUrl: "", // 完全自定义的URL路径
            }
        },
        bubblePanelEnable: true, // 启用AI弹窗功能
        bubblePanelModel: "auto", // 自动选择第一个可用模型
        // 记录Token消耗
        onTokenConsume: (modelName, modelConfig, count) => {
            console.log(`${modelName} 消耗了 ${count} 个token`);
            // 可以发送到后端记录
            // axios.post('/api/token/record', { modelName, count });
        }
    }),

    /**
     * 星火大模型配置
     * @param {string} appId - 应用ID
     * @param {string} apiKey - API Key
     * @param {string} apiSecret - API Secret
     * @param {string} version - 版本，默认v3.5，支持v2.1, v3.1, v3.5, v4.0
     * @returns {Object} 星火大模型配置对象
     */
    spark: (appId, apiKey, apiSecret, version = 'v3.5') => ({
        models: {
            spark: {
                appId: appId,
                apiKey: apiKey,
                apiSecret: apiSecret,
                version: version, // v2.1=Spark V2.0, v3.1=Spark Pro, v3.5=Spark Max, v4.0=Spark4.0 Ultra
                protocol: "wss", // 通信协议，支持ws和wss
            }
        },
        bubblePanelEnable: true,
        bubblePanelModel: "auto",
    }),

    /**
     * 文心一言配置
     * @param {string} accessToken - 访问令牌
     * @returns {Object} 文心一言配置对象
     */
    wenxin: (accessToken) => ({
        models: {
            wenxin: {
                access_token: accessToken,
            }
        },
        bubblePanelEnable: true,
        bubblePanelModel: "auto",
    }),
    
    /**
     * Gitee AI配置
     * @param {string} endpoint - 端点URL
     * @param {string} apiKey - API Key
     * @returns {Object} Gitee AI配置对象
     */
    gitee: (endpoint, apiKey) => ({
        models: {
            gitee: {
                endpoint: endpoint,
                apiKey: apiKey,
                // 可选参数
                max_tokens: 512,
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
            }
        },
        bubblePanelEnable: true,
        bubblePanelModel: "auto",
    }),

    /**
     * 自定义后端配置
     * 适用于自己搭建的模型服务器或其他AI接口
     * @param {string} url - 接口URL
     * @returns {Object} 自定义AI配置对象
     */
    custom: (url) => ({
        models: {
            custom: {
                url: url,
                headers: () => {
                    return {
                        // 可以添加认证头或其他需要的头信息
                        "Authorization": "Bearer " + localStorage.getItem('authToken'),
                        "Content-Type": "application/json"
                    }
                },
                wrapPayload: (message) => {
                    return JSON.stringify({
                        prompt: message,
                        // 可根据需要添加其他参数
                        max_tokens: 1000,
                        temperature: 0.7,
                    })
                },
                parseMessage: (message) => {
                    // 解析后端返回的消息，转化为编辑器能理解的格式
                    return {
                        role: "assistant",
                        content: message,
                        index: 0,
                        status: 2 // 0=首个文本，1=中间文本，2=最后文本
                    }
                },
                // protocol: "sse" // 或 "websocket"
            }
        },
        bubblePanelEnable: true,
        bubblePanelModel: "auto",
    }),

    /**
     * 安全模式配置 - 使用服务端签名
     * 适用于公开场景，避免API密钥等敏感信息暴露在前端
     * @param {string} appId - 应用ID，用于服务端识别
     * @returns {Object} 服务端安全配置对象
     */
    secureServer: (appId) => ({
        models: {
            spark: {
                appId: appId,
                // 不在前端设置apiKey和apiSecret
            }
        },
        // 通过后端签名生成安全URL
        onCreateClientUrl: (modelName, modelConfig, startFn) => {
            // 通过后端获取签名URL
            fetch(`/api/ai/getSignedUrl?appId=${modelConfig.appId}&model=${modelName}`)
                .then(resp => resp.json())
                .then(json => {
                    // 获取签名URL后启动AI
                    startFn(json.url);
                })
                .catch(err => {
                    console.error('获取AI签名URL失败:', err);
                });
        },
        // 记录Token消耗
        onTokenConsume: (modelName, modelConfig, count) => {
            // 向后端报告token使用情况
            fetch('/api/ai/recordToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelName,
                    appId: modelConfig.appId,
                    count: count
                })
            }).catch(err => {
                console.error('记录Token消耗失败:', err);
            });
        },
        bubblePanelEnable: true,
        bubblePanelModel: "auto",
    })
};

/**
 * AI菜单配置
 * 提供常用的AI菜单功能
 */
export const aiMenuConfig = {
    // 工具栏AI菜单
    toolbarMenus: [
        // AI续写功能
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M4 18.9997H20V13.9997H22V19.9997C22 20.552 21.5523 20.9997 21 20.9997H3C2.44772 20.9997 2 20.552 2 19.9997V13.9997H4V18.9997ZM16.1716 6.9997L12.2218 3.04996L13.636 1.63574L20 7.9997L13.636 14.3637L12.2218 12.9495L16.1716 8.9997H2V6.9997H16.1716Z" fill="currentColor"></path></svg>`,
            name: "AI 续写",
            prompt: "请帮我继续扩展一些这段话的内容",
            text: "focusBefore", // 获取焦点前的文字内容
            model: "auto" // 自动选择配置的第一个模型
        },
        // AI优化功能
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M15 5.25C16.7949 5.25 18.25 3.79493 18.25 2H19.75C19.75 3.79493 21.2051 5.25 23 5.25V6.75C21.2051 6.75 19.75 8.20507 19.75 10H18.25C18.25 8.20507 16.7949 6.75 15 6.75V5.25ZM4 7C4 5.89543 4.89543 5 6 5H14C15.1046 5 16 5.89543 16 7V11C16 12.1046 15.1046 13 14 13H6C4.89543 13 4 12.1046 4 11V7ZM6 7V11H14V7H6ZM4 15C4 13.8954 4.89543 13 6 13H14C15.1046 13 16 13.8954 16 15V19C16 20.1046 15.1046 21 14 21H6C4.89543 21 4 20.1046 4 19V15ZM6 15V19H14V15H6ZM9 9H11V9.01H9V9ZM9 17H11V17.01H9V17Z" fill="currentColor"></path></svg>`,
            name: "AI 优化",
            prompt: "请帮我优化一下这段文字的内容，使其更加流畅、专业，并返回优化结果",
            text: "selected", // 获取选中的文本内容
            model: "auto"
        },
        // AI摘要功能
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9H15C13.6941 9 12.5831 8.16562 12.171 7.0009L11 7C9.9 7 9 7.9 9 9L9.0009 9.17102C10.1656 9.58312 11 10.6941 11 12C11 13.3059 10.1656 14.4169 9.0009 14.829L9 15C9 16.1 9.9 17 11 17L12.171 16.9991C12.5831 15.8344 13.6941 15 15 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21H15C13.6941 21 12.5831 20.1656 12.171 19.0009L11 19C8.79086 19 7 17.2091 7 15L6.98998 14.8287C5.83656 14.4169 5 13.3059 5 12C5 10.6941 5.83656 9.58312 6.98998 9.17134L7 9C7 6.79086 8.79086 5 11 5L12.171 4.99909C12.5831 3.83438 13.6941 3 15 3H18ZM18 5H15C14.4477 5 14 5.44772 14 6C14 6.55228 14.4477 7 15 7H18C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5ZM18 17H15C14.4477 17 14 17.4477 14 18C14 18.5523 14.4477 19 15 19H18C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17Z" fill="currentColor"></path></svg>`,
            name: "AI 摘要",
            prompt: "请帮我总结以下内容的要点，并返回总结结果",
            text: "selected",
            model: "auto"
        },
        // AI翻译功能
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z" fill="currentColor"></path></svg>`,
            name: "AI 翻译",
            prompt: "请帮我翻译以下文本，如果是中文则翻译成英文，如果是英文则翻译成中文，只返回翻译结果，不需要任何说明",
            text: "selected",
            model: "auto"
        }
    ],
    
    // 泡泡菜单配置（选择文本时显示的浮动菜单）
    bubbleMenus: [
        // 优化写作
        {
            prompt: `<content>{content}</content>\n请帮我优化这段内容，并直接返回优化后的结果。\n注意：判断语言类型，中文返回中文，英文返回英文，只需要返回优化结果，不需要额外解释。`,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.1986 9.94447C14.7649 9.5337 14.4859 8.98613 14.4085 8.39384L14.0056 5.31138L11.275 6.79724C10.7503 7.08274 10.1433 7.17888 9.55608 7.06948L6.49998 6.50015L7.06931 9.55625C7.17871 10.1435 7.08257 10.7505 6.79707 11.2751L5.31121 14.0057L8.39367 14.4087C8.98596 14.486 9.53353 14.765 9.9443 15.1988L12 17.0981L14.0557 15.1988C14.4665 14.765 15.014 14.486 15.6063 14.4087L18.6888 14.0057L17.2029 11.2751C16.9174 10.7505 16.8213 10.1435 16.9307 9.55625L17.5 6.50015L14.4439 7.06948C13.8567 7.17888 13.2497 7.08274 12.725 6.79724L10 5.31472L9.59741 8.39384C9.51997 8.98613 9.24092 9.5337 8.80723 9.94447L7 11.7981L8.80723 13.6518C9.24092 14.0626 9.51997 14.6102 9.59741 15.2025L10 18.2849L12.725 16.7991C13.2497 16.5136 13.8567 16.4174 14.4439 16.5268L17.5 17.0981L16.9307 14.04C16.8213 13.4528 16.9174 12.8458 17.2029 12.3211L18.6888 9.59057L15.6063 9.18798C15.014 9.11054 14.4665 8.8315 14.0557 8.39781L12.2525 6.50015L15.1986 9.94447Z"></path></svg>`,
            title: '优化内容',
        },
        // 语法检查
        {
            prompt: `<content>{content}</content>\n请帮我检查这段内容的拼写和语法错误，并直接返回修正后的内容。\n注意：判断语言类型，中文返回中文，英文返回英文，只返回修正结果，不需要解释错误原因。`,
            icon: ` <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19C12.8284 19 13.5 19.6716 13.5 20.5C13.5 21.3284 12.8284 22 12 22C11.1716 22 10.5 21.3284 10.5 20.5C10.5 19.6716 11.1716 19 12 19ZM6.5 19C7.32843 19 8 19.6716 8 20.5C8 21.3284 7.32843 22 6.5 22C5.67157 22 5 21.3284 5 20.5C5 19.6716 5.67157 19 6.5 19ZM17.5 19C18.3284 19 19 19.6716 19 20.5C19 21.3284 18.3284 22 17.5 22C16.6716 22 16 21.3284 16 20.5C16 19.6716 16.6716 19 17.5 19ZM16.2032 2.59282C17.3317 1.43156 19.2288 1.41265 20.3813 2.5499C21.5339 3.68715 21.5339 5.57229 20.3813 6.70954L8.97099 18.2447C8.84655 18.3716 8.74243 18.5144 8.6558 18.6693L6.60579 22.2539C6.41769 22.5871 5.96681 22.6513 5.6904 22.3793C5.41398 22.1073 5.35678 21.6174 5.55968 21.294L7.48384 17.9216C7.56161 17.7834 7.65591 17.6548 7.76463 17.541L16.2032 9.02308C16.5834 8.63725 16.5834 8.01261 16.2032 7.62678C15.823 7.24096 15.2068 7.24096 14.8266 7.62678L6.38801 16.1446C6.27534 16.2592 6.14367 16.3581 5.99909 16.4394L2.58255 18.3807C2.27333 18.5599 1.86944 18.4943 1.62745 18.1945C1.38546 17.8948 1.32947 17.4486 1.52621 17.0919L3.42812 13.6754C3.50636 13.5376 3.6005 13.4111 3.71001 13.301L15.1203 1.79584C16.2489 0.634575 18.146 0.615672 19.2984 1.75292C20.451 2.89017 20.451 4.77532 19.2984 5.91257L8.2793 17.0531C7.89911 17.4389 7.28297 17.4389 6.90277 17.0531C6.52258 16.6673 6.52258 16.0427 6.90277 15.6569L16.2032 6.24993C16.5834 5.8641 16.5834 5.23946 16.2032 4.85364C15.823 4.46781 15.2068 4.46781 14.8266 4.85363L5.52616 14.2606C4.38435 15.4181 4.38435 17.2919 5.52616 18.4494C6.66798 19.6069 8.51409 19.6069 9.65591 18.4494L20.675 7.30887C21.8168 6.1516 21.8168 4.26646 20.675 3.10921C19.5331 1.95196 17.6744 1.95196 16.5326 3.10921L5.12234 14.6144C5.01282 14.7245 4.91869 14.851 4.84045 14.9889L2.93854 18.4054C2.7418 18.762 2.79779 19.2082 3.03978 19.508C3.28176 19.8078 3.68566 19.8734 3.99488 19.6941L7.41142 17.7529C7.556 17.6716 7.68766 17.5727 7.80034 17.4581L19.2016 5.91431C20.3434 4.75705 20.3434 2.8719 19.2016 1.71465C18.0598 0.557394 16.2011 0.557395 15.0593 1.71465L16.2032 2.59282Z"></path></svg>`,
            title: '修正语法',
        },
        '<hr/>', // 分隔线
        // 翻译功能
        {
            prompt: `<content>{content}</content>\n请翻译以上内容，判断语言类型，中文翻译为英文，其他语言翻译为中文，只返回翻译结果，不需要任何解释。`,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z"></path></svg>`,
            title: '翻译',
        },
        // 摘要功能
        {
            prompt: `<content>{content}</content>\n请总结以上内容，并直接返回总结结果。\n注意：判断语言类型，中文返回中文，英文返回英文，只返回总结内容，不需要解释。`,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9H15C13.6941 9 12.5831 8.16562 12.171 7.0009L11 7C9.9 7 9 7.9 9 9L9.0009 9.17102C10.1656 9.58312 11 10.6941 11 12C11 13.3059 10.1656 14.4169 9.0009 14.829L9 15C9 16.1 9.9 17 11 17L12.171 16.9991C12.5831 15.8344 13.6941 15 15 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21H15C13.6941 21 12.5831 20.1656 12.171 19.0009L11 19C8.79086 19 7 17.2091 7 15L6.98998 14.8287C5.83656 14.4169 5 13.3059 5 12C5 10.6941 5.83656 9.58312 6.98998 9.17134L7 9C7 6.79086 8.79086 5 11 5L12.171 4.99909C12.5831 3.83438 13.6941 3 15 3H18ZM18 5H15C14.4477 5 14 5.44772 14 6C14 6.55228 14.4477 7 15 7H18C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5ZM18 17H15C14.4477 17 14 17.4477 14 18C14 18.5523 14.4477 19 15 19H18C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17Z"></path></svg>`,
            title: '总结',
        }
    ]
};

/**
 * 编辑器AI配置应用方法
 * @param {Object} editor - AiEditor实例
 * @param {Object} config - AI配置对象
 */
export function applyAiConfiguration(editor, config) {
    if (!editor || !config) {
        console.error('AiEditor实例或配置对象不存在');
        return;
    }

    // 应用配置
    editor.setAiConfig(config);
    console.log('已应用AI配置到编辑器');
}

/**
 * 使用示例:
 * 
 * // 导入配置
 * import { editorAiConfig, aiMenuConfig, applyAiConfiguration } from './ai-editor-config.js';
 * 
 * // 创建编辑器
 * const editor = new AiEditor({
 *    element: "#editor",
 *    // 基础配置...
 * });
 * 
 * // 使用OpenAI配置
 * const aiConfig = {
 *    ...editorAiConfig.openai("your-api-key", "gpt-3.5-turbo"),
 *    menus: aiMenuConfig.toolbarMenus,
 *    bubblePanelMenus: aiMenuConfig.bubbleMenus
 * };
 * 
 * // 应用配置
 * applyAiConfiguration(editor, aiConfig);
 */
