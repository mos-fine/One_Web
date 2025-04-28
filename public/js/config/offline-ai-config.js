/**
 * AiEditor 离线模式配置
 * 用于在API认证失败或网络不可用时提供基本编辑功能
 */

// 导出离线模式配置函数
export function getOfflineAiConfig() {
    return {
        // 提供模拟模型
        models: {
            // 使用自定义模式，直接在本地构建响应
            custom: {
                url: '/api/ai/mock-response',
                protocol: 'custom'
            }
        },
        // 启用基本的AI菜单但禁用气泡面板
        bubblePanelEnable: false,
        menus: [
            {
                // AI续写功能-离线模式
                name: 'ai_continue_offline',
                title: '续写(离线模式)',
                icon: '<i class="fas fa-pen"></i>',
                prompt: '请继续编写以下内容：',
            },
            {
                // AI优化功能-离线模式
                name: 'ai_improve_offline',
                title: '优化(离线模式)',
                icon: '<i class="fas fa-magic"></i>',
                prompt: '请优化以下文本：',
            }
        ],
        // 自定义处理函数，不实际调用API
        onAiGenerating: (modelName, modelConfig, prompt, callback) => {
            console.log('离线模式AI生成请求:', prompt);
            // 模拟AI处理延迟
            setTimeout(() => {
                // 返回离线模式的提示消息
                callback(`[离线模式] 您的请求已收到，但当前处于离线模式。\n\n您的提示词是：\n${prompt}\n\n要使用在线AI功能，请确保：\n1. 您已正确配置API密钥\n2. 网络连接正常\n3. 服务器端已正确配置\n\n您可以点击"验证配置"按钮检查配置状态。`);
            }, 1000);
            // 告知编辑器已处理此请求
            return true;
        }
    };
}
