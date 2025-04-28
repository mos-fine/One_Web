/**
 * 修复AiEditor响应和事件处理
 * 此脚本用于修复test-aieditor.html中的编辑器初始化和事件处理
 */

// 编辑器初始化配置
async function initEditor() {
    try {
        updateStatus('info', '正在获取AI配置...');
        
        // 从后台配置中获取AI设置
        const aiConfig = await getAiEditorConfig();
        
        // 显示配置内容
        configDisplay.textContent = JSON.stringify(aiConfig, null, 2);
        
        updateStatus('info', '正在初始化编辑器...');
        
        // 创建编辑器 - 使用try-catch包装编辑器初始化
        try {
            // 确保元素存在
            const editorElement = document.getElementById('test-editor');
            if (!editorElement) {
                throw new Error('找不到编辑器容器元素 #test-editor');
            }
            
            // 定义编辑器选项
            const editorOptions = {
                element: "#test-editor",
                minHeight: '400px',
                placeholder: '输入一些文本，然后测试AI功能...',
                ai: aiConfig,
                toolbar: [
                    'bold', 'italic', 'underline', '|',
                    'bulletedList', 'numberedList', '|',
                    'insertLink', 'insertImage', '|',
                    'undo', 'redo'
                ],
                content: `<h2>AI编辑器测试</h2><p>这是一个测试页面，用于验证AiEditor的AI配置是否正常工作。</p><p>尝试选择这段文字，然后使用AI功能进行优化或翻译。</p><p>如果配置正确，AI功能应该能够正常工作。</p>`,
                // 直接在初始化选项中添加事件处理函数
                onAiStart: () => {
                    console.log('AI开始处理');
                    updateStatus('info', 'AI正在处理请求...');
                },
                onAiEnd: () => {
                    console.log('AI处理完成');
                    updateStatus('success', 'AI处理完成');
                },
                onAiError: (error) => {
                    console.error('AI处理出错:', error);
                    updateStatus('error', `AI处理出错: ${error.message || '未知错误'}`);
                }
            };
            
            // 初始化编辑器
            editor = new AiEditor(editorOptions);
            
            // 检查编辑器是否成功初始化
            if (!editor) {
                throw new Error('编辑器初始化失败，返回值为空');
            }
            
            // 编辑器初始化后，检查可用的方法
            console.log("编辑器实例:", editor);
            const methods = Object.keys(editor).filter(key => typeof editor[key] === "function");
            console.log("编辑器可用方法:", methods);
            
            // 如果编辑器有setContent或setValue方法但没有初始内容，尝试设置内容
            if (methods.includes('setContent') && (!editor.content || editor.content === '')) {
                editor.setContent(`<h2>AI编辑器测试</h2><p>这是一个测试页面，用于验证AiEditor的AI配置是否正常工作。</p>`);
            } else if (methods.includes('setValue') && (!editor.content || editor.content === '')) {
                editor.setValue(`<h2>AI编辑器测试</h2><p>这是一个测试页面，用于验证AiEditor的AI配置是否正常工作。</p>`);
            }
            
            // 将常见方法名添加到控制台方便调试
            window.editor = editor;
            window.aiConfig = aiConfig;
        } catch (editorError) {
            throw new Error(`编辑器初始化错误: ${editorError.message}`);
        }
        
        // 更新状态
        if (aiConfig) {
            updateStatus('success', '编辑器已成功加载，AI功能已启用');
        } else {
            updateStatus('info', '编辑器已加载，但AI功能已在后台禁用');
        }
        
    } catch (error) {
        console.error('初始化编辑器失败:', error);
        updateStatus('error', `初始化编辑器失败: ${error.message}`);
        configDisplay.textContent = '无法加载配置';
    }
}
