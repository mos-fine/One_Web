// filepath: /root/personal_web/public/js/components/admin/WordEditor.js
/**
 * 富文本编辑器组件
 * 基于开源的AiEditor实现富文本编辑体验
 * 替代原有的Microsoft Word编辑器
 */

// 初始化富文本编辑器
export function initializeWordEditor(containerId, content = '') {
  return new Promise((resolve, reject) => {
    try {
      // 检查AiEditor是否可用
      if (typeof AiEditor === 'undefined') {
        console.error('AiEditor未加载');
        loadAiEditorScript().then(() => {
          // 重试初始化
          initializeWordEditor(containerId, content)
            .then(resolve)
            .catch(reject);
        }).catch(err => {
          console.error('加载AiEditor失败:', err);
          reject(new Error('AiEditor加载失败'));
        });
        return;
      }

      // 创建编辑器容器结构
      const container = document.getElementById(containerId);
      
      if (!container) {
        console.error(`找不到ID为${containerId}的容器元素`);
        reject(new Error(`找不到ID为${containerId}的容器元素`));
        return;
      }

      // 创建编辑器DOM结构
      container.innerHTML = `
        <div class="ai-editor-container" style="height: 600px;">
          <div id="ai-editor-area"></div>
        </div>
        <div class="word-editor-status">
          <span id="word-editor-status">准备就绪</span>
        </div>
      `;

      // 初始化AiEditor
      try {
        console.log('正在初始化AiEditor...');
        
        const editor = new AiEditor({
          element: '#ai-editor-area',
          minHeight: '550px',
          placeholder: '请输入内容...',
          upload: {
            url: '/api/upload/image', // 图片上传接口
            formName: 'file',
            maxSize: 5 * 1024 * 1024, // 5MB
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
            'undo', 'redo', 'fullscreen'
          ]
        });

        // 设置初始内容
        if (content) {
          editor.setHtml(content);
        }

        // 监听内容变更事件 - 使用options.onChange代替on方法
        // 保存原始编辑器对象引用
        const editorObj = editor;
        
        // 添加内容变更回调
        editor.options.onChange = () => {
          // 触发自定义保存事件（与原有Word编辑器兼容）
          const saveEvent = new CustomEvent('word-editor-save', {
            detail: {
              text: editorObj.getText(),
              html: editorObj.getHtml()
            }
          });
          container.dispatchEvent(saveEvent);

          // 更新状态
          const statusElement = document.getElementById('word-editor-status');
          if (statusElement) {
            statusElement.textContent = '已修改';
          }
        };

        // 构建编辑器接口对象
        const editorInterface = {
          aiEditor: editor,
          container,
          // 兼容原有接口
          wordApp: null,
          editor: null,
          isAiEditor: true
        };

        console.log('AiEditor初始化成功');
        resolve(editorInterface);

      } catch (error) {
        console.error('初始化AiEditor失败:', error);
        reject(error);
      }
    } catch (error) {
      console.error('初始化AiEditor出现错误:', error);
      reject(error);
    }
  });
}

// 获取编辑器内容
export function getWordEditorContent(editor) {
  return new Promise((resolve, reject) => {
    try {
      if (editor.isAiEditor && editor.aiEditor) {
        // 使用AiEditor API
        const html = editor.aiEditor.getHtml();
        const text = editor.aiEditor.getText();
        
        resolve({
          html,
          text
        });
      } else {
        // 兼容旧版编辑器
        reject(new Error('无效的编辑器实例'));
      }
    } catch (error) {
      console.error('获取编辑器内容失败:', error);
      reject(error);
    }
  });
}

// 设置编辑器内容
export function setWordEditorContent(editor, content) {
  return new Promise((resolve, reject) => {
    try {
      if (editor.isAiEditor && editor.aiEditor) {
        // 使用AiEditor API
        editor.aiEditor.setHtml(content || '');
        resolve(true);
      } else {
        // 兼容旧版编辑器
        reject(new Error('无效的编辑器实例'));
      }
    } catch (error) {
      console.error('设置编辑器内容失败:', error);
      reject(error);
    }
  });
}

// 添加兼容层，保持与原来接口一致
export function createCompatibilityLayer(editor) {
  return {
    getText: () => {
      if (editor.isAiEditor && editor.aiEditor) {
        return Promise.resolve(editor.aiEditor.getText());
      }
      return getWordEditorContent(editor).then(content => content.text);
    },
    getHTML: () => {
      if (editor.isAiEditor && editor.aiEditor) {
        return Promise.resolve(editor.aiEditor.getHtml());
      }
      return getWordEditorContent(editor).then(content => content.html);
    },
    setContents: (content) => {
      if (editor.isAiEditor && editor.aiEditor) {
        // 检查并使用可用的方法设置内容
        if (typeof editor.aiEditor.setHTML === 'function') {
          editor.aiEditor.setHTML(content || '');
        } else if (typeof editor.aiEditor.setContent === 'function') {
          editor.aiEditor.setContent(content || '');
        } else if (typeof editor.aiEditor.setHtml === 'function') {
          editor.aiEditor.setHtml(content || '');
        } else if (typeof editor.aiEditor.setValue === 'function') {
          editor.aiEditor.setValue(content || '');
        } else {
          console.error('AiEditor没有找到设置内容的方法，尝试使用默认API');
          // 尝试直接设置value或innerHTML属性
          const editorElement = editor.aiEditor.element || editor.aiEditor.el || editor.container.querySelector('.ai-editor-container');
          if (editorElement && editorElement.innerHTML !== undefined) {
            editorElement.innerHTML = content || '';
          }
        }
        return Promise.resolve(true);
      }
      return setWordEditorContent(editor, content);
    }
  };
}  // 动态加载AiEditor脚本
function loadAiEditorScript() {
  return new Promise((resolve, reject) => {
    // 检查是否已加载
    if (typeof AiEditor !== 'undefined') {
      resolve();
      return;
    }

    console.log('动态加载AiEditor JS和CSS');
    
    // 加载CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = '/js/libs/aieditor/style.css';
    document.head.appendChild(linkElement);
    
    // 加载JS
    const scriptElement = document.createElement('script');
    scriptElement.src = '/js/libs/aieditor/aieditor.js';
    
    scriptElement.onload = () => {
      console.log('AiEditor脚本加载完成');
      // 给window添加一个等待对象加载完成的计时器
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // 检查全局对象
        if (window.AiEditor) {
          clearInterval(checkInterval);
          console.log('AiEditor全局对象已加载');
          resolve();
          return;
        }
        
        // 如果超过10次检查（5秒）仍未加载，则认为失败
        if (checkCount > 10) {
          clearInterval(checkInterval);
          const error = new Error('AiEditor全局对象加载超时');
          console.error(error);
          reject(error);
        }
      }, 500);
    };
    
    scriptElement.onerror = (error) => {
      console.error('加载AiEditor脚本失败:', error);
      reject(error);
    };
    
    document.head.appendChild(scriptElement);
  });
}
