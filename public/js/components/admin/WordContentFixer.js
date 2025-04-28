// filepath: /root/personal_web/public/js/components/admin/WordContentFixer.js
/**
 * Word编辑器内容修复工具
 * 用于处理Word编辑器内容的加载、保存和修复
 */

// 修复Word编辑器内容中的问题
export function fixWordEditorContent(content) {
  if (!content) return '';
  
  // 处理Word特定的XML标记，使其符合HTML标准
  let fixedContent = content;
  
  // 移除Word特有的XML命名空间和标签
  fixedContent = fixedContent.replace(/<[a-z0-9]+:[^>]+>/gi, '');
  fixedContent = fixedContent.replace(/<\/[a-z0-9]+:[^>]+>/gi, '');
  
  // 确保图片路径正确
  fixedContent = fixedContent.replace(/src="file:\/\/\//g, 'src="/uploads/');
  
  return fixedContent;
}

// 延迟加载内容
export function loadContentWithDelay(editor, content, delay = 300) {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        if (editor && content) {
          editor.setContents(content);
        }
        resolve(true);
      } catch (error) {
        console.error('延迟加载Word内容失败:', error);
        resolve(false);
      }
    }, delay);
  });
}

// 重建编辑器
export function rebuildEditor(containerId, content, callback) {
  try {
    // 导入WordEditor模块
    import('./WordEditor.js').then(({ initializeWordEditor }) => {
      // 初始化新的Word编辑器
      initializeWordEditor(containerId, content)
        .then(newEditor => {
          if (callback && typeof callback === 'function') {
            callback(newEditor);
          }
        })
        .catch(error => {
          console.error('重建Word编辑器失败:', error);
        });
    });
  } catch (error) {
    console.error('导入WordEditor模块失败:', error);
  }
}
