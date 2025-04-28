/**
 * 预加载AiEditor的AI配置和资源
 * 用于提高编辑器初始化速度和用户体验
 */

// 在页面加载时预先获取AI配置
document.addEventListener('DOMContentLoaded', async function() {
    console.log('开始预加载 AiEditor AI 配置...');
    
    // 标记全局资源状态
    if (!window.editorResources) {
        window.editorResources = {
            loading: true,
            loaded: false,
            initialized: false,
            aiConfigLoaded: false,
            aiConfig: null
        };
    }
    
    try {
        // 预加载 AiEditor CSS
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = '/js/libs/aieditor/style.css';
        document.head.appendChild(linkElement);
        
        // 预加载 AiEditor JS
        const scriptElement = document.createElement('script');
        scriptElement.src = '/js/libs/aieditor/aieditor.js';
        document.head.appendChild(scriptElement);
        
        // 监听脚本加载完成
        scriptElement.onload = async function() {
            console.log('AiEditor 脚本预加载成功');
            
            try {
                // 动态导入 AI 配置 API 模块
                const { getAiEditorConfig, validateAiConfig } = await import('/js/api/aiEditorApi.js');
                
                // 获取 AI 配置并验证
                const aiConfig = await getAiEditorConfig(false, true);
                
                // 保存 AI 配置到全局对象
                window.editorResources.aiConfig = aiConfig;
                window.editorResources.aiConfigLoaded = !!aiConfig;
                
                // 如果配置有效，进行额外验证
                if (aiConfig) {
                    console.log('AiEditor AI 配置预加载成功（AI功能已启用）');
                    
                    // 后台验证配置，但不阻塞预加载流程
                    validateAiConfig(aiConfig).then(result => {
                        window.editorResources.aiConfigValid = result.valid;
                        window.editorResources.aiConfigValidMessage = result.message;
                        
                        if (!result.valid) {
                            console.warn('AI配置验证警告:', result.message);
                        }
                    });
                } else {
                    console.log('AiEditor AI 配置预加载成功（AI功能已禁用）');
                    window.editorResources.aiConfigValid = false;
                }
                
                // 更新全局资源状态
                window.editorResources.loaded = true;
                window.editorResources.loading = false;
                
                // 触发自定义事件
                window.dispatchEvent(new CustomEvent('aieditor-resources-loaded', {
                    detail: { 
                        loaded: true,
                        aiEnabled: !!aiConfig
                    }
                }));
                
            } catch (error) {
                console.error('预加载 AiEditor AI 配置失败:', error);
                
                // 即使 AI 配置加载失败，也标记为基本加载完成
                window.editorResources.loaded = true;
                window.editorResources.loading = false;
                window.editorResources.aiConfigLoaded = false;
                
                // 触发自定义事件
                window.dispatchEvent(new CustomEvent('aieditor-resources-loaded', {
                    detail: { 
                        loaded: true,
                        aiEnabled: false,
                        error: error.message
                    }
                }));
            }
        };
        
        scriptElement.onerror = function(error) {
            console.error('预加载 AiEditor 脚本失败:', error);
            
            // 更新全局资源状态
            window.editorResources.loaded = false;
            window.editorResources.loading = false;
            window.editorResources.error = '脚本加载失败';
            
            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('aieditor-resources-loaded', {
                detail: { 
                    loaded: false,
                    error: '脚本加载失败'
                }
            }));
        };
        
    } catch (error) {
        console.error('预加载 AiEditor 资源失败:', error);
        
        // 更新全局资源状态
        if (window.editorResources) {
            window.editorResources.loaded = false;
            window.editorResources.loading = false;
            window.editorResources.error = error.message;
        }
    }
});
