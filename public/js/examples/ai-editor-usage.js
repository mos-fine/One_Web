/**
 * AiEditor AI功能配置示例
 * 展示如何在项目中使用ai-editor-config.js进行AI功能配置
 */

import { editorAiConfig, aiMenuConfig } from './config/ai-editor-config.js';

/**
 * 配置编辑器的AI功能
 * 可以根据不同的场景选择适合的配置方案
 */
export function configureEditorAI(editorInstance, configType = 'openai') {
    // 检查编辑器实例
    if (!editorInstance) {
        console.error('编辑器实例不存在');
        return;
    }
    
    // 根据配置类型选择不同的AI配置
    let aiConfig = null;
    
    switch (configType) {
        case 'openai':
            // 使用OpenAI配置
            aiConfig = {
                ...editorAiConfig.openai(
                    process.env.OPENAI_API_KEY || localStorage.getItem('openai_api_key'),
                    'gpt-4o-mini'  // 使用较小的模型控制费用
                ),
                menus: aiMenuConfig.toolbarMenus,
                bubblePanelMenus: aiMenuConfig.bubbleMenus
            };
            break;
            
        case 'spark':
            // 使用星火大模型配置
            aiConfig = {
                ...editorAiConfig.spark(
                    process.env.SPARK_APP_ID,
                    process.env.SPARK_API_KEY,
                    process.env.SPARK_API_SECRET,
                    'v3.5'  // 使用Spark Max模型
                ),
                menus: aiMenuConfig.toolbarMenus,
                bubblePanelMenus: aiMenuConfig.bubbleMenus
            };
            break;
            
        case 'secure':
            // 使用安全模式，通过后端签名
            aiConfig = {
                ...editorAiConfig.secureServer(
                    process.env.AI_APP_ID || 'default_app_id'
                ),
                menus: [
                    // 只使用部分AI功能避免过度消耗
                    aiMenuConfig.toolbarMenus[0],  // AI续写
                    aiMenuConfig.toolbarMenus[1]   // AI优化
                ],
                bubblePanelMenus: aiMenuConfig.bubbleMenus
            };
            break;
            
        case 'custom':
            // 使用自定义后端
            aiConfig = {
                ...editorAiConfig.custom('/api/ai/generate'),
                menus: aiMenuConfig.toolbarMenus,
                bubblePanelMenus: aiMenuConfig.bubbleMenus
            };
            break;
            
        case 'disabled':
            // 禁用AI功能
            aiConfig = null;
            break;
            
        default:
            console.warn(`未知的AI配置类型: ${configType}，将使用默认配置`);
            // 使用最简单的自定义配置
            aiConfig = {
                ...editorAiConfig.custom('/api/ai/generate'),
                menus: [aiMenuConfig.toolbarMenus[0]],  // 只启用AI续写功能
                bubblePanelEnable: false  // 禁用泡泡菜单
            };
    }
    
    if (aiConfig) {
        // 应用AI配置到编辑器
        try {
            // 针对初始化前的配置
            if (editorInstance instanceof AiEditor) {
                editorInstance.setAiConfig(aiConfig);
                console.log(`成功应用${configType}类型的AI配置到编辑器`);
            } else {
                // 针对编辑器配置对象
                editorInstance.ai = aiConfig;
                console.log(`成功添加${configType}类型的AI配置到编辑器初始化参数`);
            }
        } catch (error) {
            console.error('应用AI配置失败:', error);
        }
    } else {
        console.log('AI功能已禁用');
    }
    
    return editorInstance;
}

/**
 * 创建配置了AI功能的编辑器实例
 * @param {string} elementSelector - 编辑器容器选择器
 * @param {string} aiConfigType - AI配置类型
 * @param {Object} additionalOptions - 其他编辑器选项
 * @returns {Object} - 编辑器实例
 */
export function createAiEditor(elementSelector, aiConfigType = 'openai', additionalOptions = {}) {
    // 准备编辑器基础配置
    const editorConfig = {
        element: elementSelector,
        minHeight: '600px',
        placeholder: '请输入内容，可以使用AI辅助功能...',
        upload: {
            url: '/api/upload/image',
            formName: 'file',
            maxSize: 5 * 1024 * 1024,
            compress: true,
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            }
        },
        toolbar: [
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'heading', 'fontSize', 'fontFamily', '|',
            'bulletedList', 'numberedList', 'todoList', '|',
            'indent', 'outdent', 'alignment', '|',
            'insertLink', 'insertImage', 'insertTable', 'insertVideo', '|',
            'code', 'codeBlock', 'blockquote', '|',
            'undo', 'redo', 'fullscreen',
            // 如果启用了AI功能，会自动添加AI菜单
        ],
        ...additionalOptions
    };
    
    // 添加AI配置
    configureEditorAI(editorConfig, aiConfigType);
    
    // 创建编辑器实例
    try {
        const editor = new AiEditor(editorConfig);
        console.log('编辑器创建成功');
        return editor;
    } catch (error) {
        console.error('创建编辑器失败:', error);
        return null;
    }
}

/**
 * 实际使用示例
 */
document.addEventListener('DOMContentLoaded', () => {
    // 获取用户偏好的AI配置类型
    const userAiPreference = localStorage.getItem('preferred_ai_model') || 'secure';
    
    // 创建编辑器示例
    const editor = createAiEditor('#aiEditor', userAiPreference, {
        // 可以添加其他编辑器选项
        onCreated: () => {
            console.log('编辑器已创建并初始化完成');
        },
        onChange: () => {
            console.log('编辑器内容已变更');
            // 可以在这里添加自动保存逻辑
        }
    });
    
    // 监听编辑器AI相关事件
    if (editor) {
        // 监听AI响应开始
        editor.on('ai:start', () => {
            console.log('AI开始生成内容');
            showAiLoadingIndicator(true);
        });
        
        // 监听AI响应结束
        editor.on('ai:end', () => {
            console.log('AI完成内容生成');
            showAiLoadingIndicator(false);
        });
        
        // 监听AI错误
        editor.on('ai:error', (error) => {
            console.error('AI生成内容时发生错误:', error);
            showAiLoadingIndicator(false);
            showErrorMessage('AI助手遇到问题，请稍后再试');
        });
    }
});

/**
 * 显示AI加载指示器
 * @param {boolean} isLoading - 是否正在加载
 */
function showAiLoadingIndicator(isLoading) {
    const indicator = document.getElementById('ai-loading-indicator');
    if (indicator) {
        indicator.style.display = isLoading ? 'block' : 'none';
    }
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showErrorMessage(message) {
    const errorContainer = document.getElementById('editor-error-container');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}
