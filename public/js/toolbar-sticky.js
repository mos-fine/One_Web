/**
 * 编辑器工具栏固定功能增强脚本
 * 此脚本确保富文本编辑器的工具栏在滚动时固定在视口顶部
 */

(function() {
  // 等待DOM完全加载
  document.addEventListener('DOMContentLoaded', function() {
    initToolbarSticky();
    
    // 监听路由变化，在编辑页面初始化固定工具栏功能
    window.addEventListener('hashchange', initToolbarSticky);
    window.addEventListener('popstate', initToolbarSticky);
  });
  
  // 初始化工具栏固定功能
  function initToolbarSticky() {
    // 检查是否在文章编辑页面
    if (isEditArticlePage()) {
      console.log('检测到文章编辑页面，初始化工具栏固定功能');
      setTimeout(setupToolbarSticky, 1000); // 延迟执行，确保编辑器已加载
    }
  }
  
  // 判断当前是否在文章编辑页面
  function isEditArticlePage() {
    return window.location.pathname.includes('/admin/articles/create') ||
           window.location.pathname.includes('/admin/articles/edit');
  }
  
  // 设置工具栏固定功能
  function setupToolbarSticky() {
    const toolbar = document.querySelector('.ai-editor .ql-toolbar');
    const editor = document.querySelector('.ai-editor');
    const editorContainer = document.querySelector('.ai-editor-container');
    
    if (!toolbar || !editor || !editorContainer) {
      console.log('编辑器元素未找到，500ms后重试');
      setTimeout(setupToolbarSticky, 500);
      return;
    }
    
    // 确保编辑器容器有正确的定位，使sticky属性生效
    editorContainer.style.position = 'relative';
    
    // 计算工具栏的原始顶部位置
    const toolbarRect = toolbar.getBoundingClientRect();
    const toolbarOriginalTop = toolbarRect.top + window.pageYOffset;
    
    // 设置工具栏样式
    toolbar.style.position = 'sticky';
    toolbar.style.top = '0';
    toolbar.style.zIndex = '1000';
    toolbar.style.background = getComputedStyle(toolbar).backgroundColor || '#fff';
    toolbar.style.borderBottom = '1px solid #ccc';
    toolbar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    toolbar.style.width = '100%';
    
    // 添加过渡效果
    toolbar.style.transition = 'box-shadow 0.3s ease, transform 0.2s ease';
    
    // 添加工具栏的父容器样式，确保sticky定位工作正常
    if (toolbar.parentElement) {
      toolbar.parentElement.style.overflow = 'visible';
    }
    
    // 添加滚动方向检测
    let lastScrollTop = 0;
    let scrollDirectionDown = true;
    let scrollTimer = null;
    
    // 监听滚动事件，增强工具栏显示
    window.addEventListener('scroll', function() {
      // 清除之前的定时器
      if (scrollTimer) clearTimeout(scrollTimer);
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // 判断滚动方向
      scrollDirectionDown = scrollTop > lastScrollTop;
      lastScrollTop = scrollTop;
      
      if (scrollTop > toolbarOriginalTop) {
        // 滚动超过工具栏原始位置，增强阴影效果
        toolbar.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
        
        // 向下滚动时略微缩小工具栏，提供更多内容空间
        if (scrollDirectionDown) {
          toolbar.style.transform = 'translateY(0)';
        } else {
          // 向上滚动时确保工具栏完全可见
          toolbar.style.transform = 'translateY(0)';
          toolbar.style.opacity = '1';
        }
      } else {
        // 恢复默认阴影
        toolbar.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        toolbar.style.transform = 'translateY(0)';
      }
      
      // 在滚动停止后执行额外的样式调整
      scrollTimer = setTimeout(function() {
        // 滚动停止后确保工具栏完全可见
        toolbar.style.opacity = '1';
      }, 150);
    });
    
    console.log('工具栏固定功能设置完成');
    
    // 监听窗口大小变化，重新调整工具栏宽度
    window.addEventListener('resize', function() {
      toolbar.style.width = editorContainer.clientWidth + 'px';
    });
    
    // 修复夜间模式下的工具栏样式
    if (document.body.classList.contains('dark-mode')) {
      toolbar.style.background = '#333';
      toolbar.style.borderColor = '#555';
    }
    
    // 监听夜间模式切换
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function() {
        setTimeout(() => {
          if (document.body.classList.contains('dark-mode')) {
            toolbar.style.background = '#333';
            toolbar.style.borderColor = '#555';
          } else {
            toolbar.style.background = '#fff';
            toolbar.style.borderColor = '#ccc';
          }
        }, 50);
      });
    }
    
    // 监听编辑器焦点事件，确保工具栏在编辑时可见
    const editorArea = document.querySelector('.ql-editor');
    if (editorArea) {
      editorArea.addEventListener('focus', function() {
        // 编辑器获得焦点时，确保工具栏可见
        toolbar.style.transform = 'translateY(0)';
        toolbar.style.opacity = '1';
        toolbar.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
      });
      
      // 也可以选择监听点击事件
      editorArea.addEventListener('click', function() {
        toolbar.style.transform = 'translateY(0)';
        toolbar.style.opacity = '1';
        toolbar.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
      });
    }
  }
})();
