/**
 * 富文本编辑器优化脚本
 * 解决编辑器高度和滚动问题
 * 增强功能：预加载编辑器资源，在网站加载时就初始化编辑器环境
 */

// 全局变量，用于存储编辑器状态
window.editorInitialized = false;
window.editorResources = {
  loaded: false,
  loading: false
};

// 预加载AiEditor资源
function preloadAiEditorResources() {
  if (window.editorResources.loaded || window.editorResources.loading) {
    return Promise.resolve();
  }

  console.log('预加载AiEditor资源...');
  window.editorResources.loading = true;
  
  return new Promise((resolve, reject) => {
    // 加载CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = '/js/libs/aieditor/style.css';
    document.head.appendChild(linkElement);
    
    // 加载JS
    const scriptElement = document.createElement('script');
    scriptElement.src = '/js/libs/aieditor/aieditor.js';
    
    scriptElement.onload = () => {
      console.log('AiEditor脚本预加载完成');
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // 检查全局对象
        if (window.AiEditor) {
          clearInterval(checkInterval);
          console.log('AiEditor全局对象已加载');
          window.editorResources.loaded = true;
          window.editorResources.loading = false;
          resolve();
          return;
        }
        
        // 如果超过10次检查（5秒）仍未加载，则认为失败但不影响正常流程
        if (checkCount > 10) {
          clearInterval(checkInterval);
          console.warn('AiEditor全局对象加载超时，将在需要时再次尝试加载');
          window.editorResources.loading = false;
          resolve();
        }
      }, 500);
    };
    
    scriptElement.onerror = (error) => {
      console.error('预加载AiEditor脚本失败:', error);
      window.editorResources.loading = false;
      // 即使加载失败也resolve，避免阻塞其他功能
      resolve();
    };
    
    document.head.appendChild(scriptElement);
  });
}

// 在页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 开始预加载编辑器资源
  preloadAiEditorResources();

  // 监听路由变化，当进入编辑页面时应用优化
  const checkAndOptimizeEditor = () => {
    // 检查是否在文章编辑页面
    if (window.location.pathname.includes('/admin/articles/') || 
        window.location.pathname.includes('/admin/articles/create')) {
      
      console.log('检测到编辑器页面，应用编辑器优化...');
      setTimeout(optimizeEditor, 500);
    }
  };
  
  // 初始检查
  checkAndOptimizeEditor();
  
  // 监听 hashchange 和 popstate 事件来处理 SPA 路由变化
  window.addEventListener('hashchange', checkAndOptimizeEditor);
  window.addEventListener('popstate', checkAndOptimizeEditor);
  
  // 优化编辑器函数
  function optimizeEditor() {
    // 确保AiEditor资源已加载
    if (!window.editorResources.loaded && !window.editorResources.loading) {
      console.log('AiEditor资源尚未加载，开始加载...');
      preloadAiEditorResources().then(() => {
        console.log('AiEditor资源加载完成，继续优化编辑器');
        setTimeout(optimizeEditor, 100);
      });
      return;
    } else if (window.editorResources.loading) {
      console.log('AiEditor资源正在加载中，等待加载完成...');
      setTimeout(optimizeEditor, 300);
      return;
    }

    // 查找编辑器元素
    const editorContainer = document.querySelector('.ai-editor-container');
    const editorArea = document.querySelector('.ql-editor');
    const editorWrapper = document.querySelector('.editor-wrapper');
    
    if (!editorContainer || !editorArea) {
      console.log('编辑器元素未找到，将在500ms后重试');
      setTimeout(optimizeEditor, 500);
      return;
    }
    
    console.log('应用编辑器优化...');
    
    // 设置编辑器容器样式
    editorContainer.style.height = '800px';
    editorContainer.style.maxHeight = '800px';
    editorContainer.style.overflowY = 'auto';
    
    // 设置编辑器内容区域样式
    editorArea.style.minHeight = '700px';
    editorArea.style.overflowY = 'visible';
    
    // 确保编辑区域足够大，不会被截断
    if (editorWrapper) {
      editorWrapper.style.marginBottom = '50px';
    }
    
    // 添加内容变化监听器
    const observer = new MutationObserver(function(mutations) {
      // 当内容变化时，确保高度适应内容
      editorArea.style.height = 'auto';
      
      // 如果内容高度超过容器，增加容器高度
      if (editorArea.scrollHeight > editorContainer.clientHeight) {
        editorContainer.style.height = editorArea.scrollHeight + 50 + 'px';
      }
    });
    
    // 观察编辑器内容变化
    observer.observe(editorArea, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // 处理从数据库加载的内容，确保内容正确渲染
    processLoadedContent();
    
    // 标记编辑器已初始化
    window.editorInitialized = true;
    
    console.log('编辑器优化应用完成');
  }
  
  // 处理从数据库加载的内容
  function processLoadedContent() {
    // 检查是否有数据库内容已加载
    const editorArea = document.querySelector('.ql-editor');
    if (!editorArea) return;
    
    // 如果内容已加载但样式不正确，尝试修复
    if (editorArea.innerHTML.trim()) {
      console.log('检测到编辑器已有内容，确保内容正确渲染...');
      
      // 触发内容重排以确保样式正确应用
      editorArea.style.height = 'auto';
      
      // 确保图片和媒体元素正确加载
      const images = editorArea.querySelectorAll('img');
      const videos = editorArea.querySelectorAll('video');
      const iframes = editorArea.querySelectorAll('iframe');
      
      // 处理图片
      if (images.length > 0) {
        console.log(`检测到${images.length}个图片，确保正确加载`);
        images.forEach(img => {
          if (img.complete) return;
          
          img.onload = function() {
            // 图片加载完成后重新计算高度
            recalculateEditorHeight();
          };
          
          img.onerror = function() {
            console.warn('图片加载失败:', img.src);
          };
        });
      }
      
      // 处理视频和iframe
      if (videos.length > 0 || iframes.length > 0) {
        console.log(`检测到${videos.length}个视频和${iframes.length}个iframe，确保正确加载`);
        // 延迟重新计算高度，以适应可能的媒体加载
        setTimeout(recalculateEditorHeight, 1000);
      }
    }
  }
  
  // 重新计算编辑器高度
  function recalculateEditorHeight() {
    const editorContainer = document.querySelector('.ai-editor-container');
    const editorArea = document.querySelector('.ql-editor');
    
    if (!editorContainer || !editorArea) return;
    
    // 确保编辑器高度适应内容
    editorArea.style.height = 'auto';
    
    // 如果内容高度超过容器，增加容器高度
    if (editorArea.scrollHeight > editorContainer.clientHeight) {
      editorContainer.style.height = editorArea.scrollHeight + 50 + 'px';
    }
  }
});
