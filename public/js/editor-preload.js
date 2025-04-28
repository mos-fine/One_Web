/**
 * 编辑器资源预加载脚本
 * 在网站加载时预先加载编辑器所需的资源，减少用户等待时间
 * 当用户进入编辑页面时，编辑器已经准备就绪
 */

(function() {
  // 全局编辑器状态对象
  window.editorResources = window.editorResources || {
    loaded: false,
    loading: false,
    initialized: false
  };
  
  /**
   * 预加载AiEditor所需的资源
   */
  function preloadEditorResources() {
    // 如果已经加载或正在加载，则不重复
    if (window.editorResources.loaded || window.editorResources.loading) {
      console.log('编辑器资源已经加载或正在加载中，跳过预加载');
      return;
    }

    console.log('开始预加载编辑器资源...');
    window.editorResources.loading = true;

    // 加载CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = '/js/libs/aieditor/style.css';
    document.head.appendChild(linkElement);
    
    // 加载JS
    const scriptElement = document.createElement('script');
    scriptElement.src = '/js/libs/aieditor/aieditor.js';
    
    scriptElement.onload = () => {
      console.log('AiEditor脚本预加载完成，等待全局对象初始化');
      
      // 检查全局对象是否可用
      let checkCount = 0;
      const maxChecks = 20; // 最多检查10秒
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        if (window.AiEditor) {
          clearInterval(checkInterval);
          console.log('AiEditor全局对象已加载，预加载完成');
          window.editorResources.loaded = true;
          window.editorResources.loading = false;
          
          // 触发自定义事件，通知其他组件编辑器资源已加载
          const preloadEvent = new CustomEvent('editor-resources-loaded');
          document.dispatchEvent(preloadEvent);
          
          return;
        }
        
        // 如果超过最大检查次数，则认为加载超时
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          console.warn('AiEditor全局对象加载超时，将在需要时再次尝试加载');
          window.editorResources.loading = false;
          
          // 触发自定义事件，通知其他组件编辑器资源加载失败
          const failEvent = new CustomEvent('editor-resources-load-failed');
          document.dispatchEvent(failEvent);
        }
      }, 500);
    };
    
    scriptElement.onerror = (error) => {
      console.error('预加载AiEditor脚本失败:', error);
      window.editorResources.loading = false;
      
      // 触发自定义事件，通知其他组件编辑器资源加载失败
      const failEvent = new CustomEvent('editor-resources-load-failed');
      document.dispatchEvent(failEvent);
    };
    
    document.head.appendChild(scriptElement);
  }
  
  /**
   * 初始化预加载流程
   * - 在DOMContentLoaded时开始预加载资源
   * - 对于需要立即使用编辑器的页面，可以更早加载
   */
  function initPreload() {
    // 检查当前页面是否为编辑器页面
    const isEditorPage = 
      window.location.pathname.includes('/admin/articles/edit/') || 
      window.location.pathname.includes('/admin/articles/create');
    
    if (isEditorPage) {
      console.log('检测到编辑器页面，立即开始预加载');
      preloadEditorResources();
    } else {
      console.log('非编辑器页面，在DOMContentLoaded后进行预加载');
      // 在DOMContentLoaded事件触发时预加载资源
      document.addEventListener('DOMContentLoaded', () => {
        // 延迟一点时间预加载，让页面先渲染完毕
        setTimeout(preloadEditorResources, 1000);
      });
    }
    
    // 监听路由变化，当进入编辑页面时确保资源已加载
    window.addEventListener('popstate', () => {
      const isEditorPage = 
        window.location.pathname.includes('/admin/articles/edit/') || 
        window.location.pathname.includes('/admin/articles/create');
        
      if (isEditorPage && !window.editorResources.loaded && !window.editorResources.loading) {
        console.log('路由变化：进入编辑页面，开始预加载');
        preloadEditorResources();
      }
    });
  }

  // 开始预加载流程
  initPreload();
})();
