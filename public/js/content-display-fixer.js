/**
 * 强制修复Word编辑器内容显示问题
 * 这个脚本会在页面加载后直接插入到文章编辑页面，用于解决编辑模式下内容不显示的问题
 */
(function() {
  console.log('WordContentFixer: 脚本已加载');
  
  // 等待页面完全加载
  window.addEventListener('load', function() {
    console.log('WordContentFixer: 页面已完全加载，开始修复');
    setTimeout(tryFixContent, 1000);
  });
  
  // 尝试修复编辑器内容显示问题
  function tryFixContent() {
    console.log('WordContentFixer: 开始尝试修复');
    
    // 判断是否在编辑页面
    const pathRegex = /\/admin\/articles\/edit\/\d+/;
    if (!pathRegex.test(window.location.pathname)) {
      console.log('WordContentFixer: 当前不在编辑页面，无需修复');
      return;
    }
    
    console.log('WordContentFixer: 检测到编辑页面，准备修复');
    
    // 查找Vue实例和Word编辑器实例
    let vueApp = null;
    const appElement = document.getElementById('app');
    if (appElement && appElement.__vue__) {
      vueApp = appElement.__vue__;
      console.log('WordContentFixer: 找到Vue根实例');
    }
    
    // 如果直接在#app上没找到，尝试在其子组件中查找
    if (!vueApp || !vueApp.$children) {
      console.log('WordContentFixer: 根实例没有子组件，修复失败');
      setTimeout(tryFixContent, 1000); // 再次尝试
      return;
    }
    
    // 查找编辑器元素和文章内容
    const wordEditor = document.querySelector('.word-editor-frame');
    if (!wordEditor) {
      console.log('WordContentFixer: 未找到编辑器DOM元素，1秒后重试');
      setTimeout(tryFixContent, 1000);
      return;
    }
    
    // 在Vue组件树中查找EditArticle组件
    let editArticleComponent = findEditArticleComponent(vueApp);
    if (!editArticleComponent) {
      console.log('WordContentFixer: 未找到EditArticle组件，1秒后重试');
      setTimeout(tryFixContent, 1000);
      return;
    }
    
    console.log('WordContentFixer: 找到EditArticle组件');
    
    // 检查组件状态
    if (!editArticleComponent.isEditing || !editArticleComponent.article) {
      console.log('WordContentFixer: 组件不在编辑状态或文章数据未加载，1秒后重试');
      setTimeout(tryFixContent, 1000);
      return;
    }
    
    // 在这里实际执行修复操作
    fixWordContent(editArticleComponent, wordEditor);
  }
  
  // 查找EditArticle组件
  function findEditArticleComponent(vueInstance) {
    if (!vueInstance) return null;
    
    // 检查当前实例
    if (vueInstance.$options && 
        (vueInstance.$options.name === 'EditArticle' || 
         (vueInstance.$options.components && vueInstance.$options.components.EditArticle))) {
      return vueInstance;
    }
    
    // 递归检查子组件
    if (vueInstance.$children && vueInstance.$children.length > 0) {
      for (const child of vueInstance.$children) {
        const found = findEditArticleComponent(child);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  // 修复Word编辑器内容
  function fixWordContent(component, editorElement) {
    if (!component.article.content) {
      console.log('WordContentFixer: 文章内容为空，无法修复');
      return false;
    }
    
    console.log('WordContentFixer: 文章内容存在，长度:', component.article.content.length);
    
    // 方法1：如果有quill实例，使用API
    if (component.quill) {
      try {
        console.log('QuillContentFixer: 使用方法1 - Quill API');
        component.quill.root.innerHTML = component.article.content;
        component.quill.update();
        
        // 检查是否成功设置
        setTimeout(() => {
          console.log('QuillContentFixer: 检查方法1结果:', component.quill.root.innerHTML.length > 0);
          
          // 如果方法1失败，尝试方法2
          if (component.quill.root.innerHTML.length === 0) {
            console.log('QuillContentFixer: 方法1失败，尝试方法2');
            component.quill.clipboard.dangerouslyPasteHTML(component.article.content);
          }
        }, 100);
        
        return true;
      } catch (e) {
        console.error('QuillContentFixer: 方法1失败:', e);
      }
    }
    
    // 方法2：直接操作DOM
    try {
      console.log('QuillContentFixer: 使用方法2 - 直接操作DOM');
      editorElement.innerHTML = component.article.content;
      
      // 触发变更事件，让Quill感知到内容变化
      const event = new Event('input', { bubbles: true });
      editorElement.dispatchEvent(event);
      
      return editorElement.innerHTML.length > 0;
    } catch (e) {
      console.error('QuillContentFixer: 方法2失败:', e);
      return false;
    }
  }
})();
