/**
 * AiEditor API错误处理程序
 * 用于监控API错误并自动切换到离线模式
 */

// 为全局ProseMirror实例添加事件发布功能
(function() {
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', () => {
        console.log('正在初始化AiEditor API错误处理程序');
    
        // 监听API错误事件
        document.addEventListener('ai-api-error', handleApiError);
        
        // 监听全局错误，可能捕获一些未被正确处理的API错误
        window.addEventListener('error', function(event) {
            // 检查是否与API调用相关
            const errorMsg = event.message || '';
            if (
                errorMsg.includes('api') || 
                errorMsg.includes('API') || 
                errorMsg.includes('dashscope') || 
                errorMsg.includes('401')
            ) {
                console.warn('捕获到可能的API错误:', event);
                handleGlobalApiError(event);
            }
        });
    });
    
    // 处理API错误
    function handleApiError(event) {
        console.warn('捕获到AI API错误:', event.detail);
        showApiErrorNotification(event.detail.message || '未知错误');
    }
    
    // 处理全局捕获的API错误
    function handleGlobalApiError(errorEvent) {
        const errorMsg = errorEvent.message || '未知API错误';
        console.warn('可能的AI API错误:', errorMsg);
        showApiErrorNotification(errorMsg);
    }
    
    // 显示API错误通知
    function showApiErrorNotification(message) {
        // 创建通知元素
        let notificationElement = document.getElementById('ai-api-error-notification');
        
        if (!notificationElement) {
            notificationElement = document.createElement('div');
            notificationElement.id = 'ai-api-error-notification';
            notificationElement.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px;
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                color: #856404;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border-radius: 4px;
                z-index: 1000;
                max-width: 350px;
                font-size: 14px;
            `;
            document.body.appendChild(notificationElement);
        }
        
        // 设置通知内容
        notificationElement.innerHTML = `
            <div style="display:flex;align-items:center;">
                <i class="fas fa-exclamation-triangle" style="margin-right:10px;"></i>
                <div>
                    <strong>API错误</strong>
                    <p style="margin:5px 0 10px;">${message}</p>
                    <button id="switch-to-offline" style="background:#ffc107;border:none;padding:5px 10px;cursor:pointer;border-radius:3px;">
                        切换到离线模式
                    </button>
                    <button id="dismiss-notification" style="background:transparent;border:1px solid #ccc;padding:5px 10px;margin-left:5px;cursor:pointer;border-radius:3px;">
                        忽略
                    </button>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        document.getElementById('switch-to-offline').addEventListener('click', () => {
            // 触发切换离线模式的事件
            const event = new CustomEvent('switch-to-offline-mode');
            document.dispatchEvent(event);
            notificationElement.style.display = 'none';
        });
        
        document.getElementById('dismiss-notification').addEventListener('click', () => {
            notificationElement.style.display = 'none';
        });
        
        // 自动隐藏
        setTimeout(() => {
            if (notificationElement.style.display !== 'none') {
                notificationElement.style.opacity = '0';
                notificationElement.style.transition = 'opacity 0.5s';
                
                setTimeout(() => {
                    notificationElement.style.display = 'none';
                    notificationElement.style.opacity = '1';
                }, 500);
            }
        }, 10000); // 10秒后隐藏
    }
})();
