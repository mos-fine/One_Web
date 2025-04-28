/**
 * 富文本编辑器组件
 * 基于开源的AiEditor实现富文本编辑体验
 * 替代原有的Microsoft Word编辑器
 * 增强功能：支持预加载资源，网站加载时就初始化
 * 增强功能：支持全屏编辑和自动实时保存
 */

// 全局变量：跟踪自动保存状态
let autoSaveInterval = null;
let lastSavedContent = '';
let isFullscreen = false;

// 检查并使用预加载的资源
function checkAndUsePreloadedResources() {
  // 检查是否存在预加载的资源
  if (window.editorResources && window.editorResources.loaded) {
    console.log('检测到预加载的AiEditor资源，直接使用');
    return Promise.resolve();
  } else if (window.editorResources && window.editorResources.loading) {
    console.log('检测到AiEditor资源正在加载中，等待加载完成');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.editorResources && window.editorResources.loaded) {
          clearInterval(checkInterval);
          console.log('预加载的AiEditor资源加载完成');
          resolve();
        }
      }, 300);
    });
  } else {
    console.log('未检测到预加载的AiEditor资源，需要重新加载');
    return loadAiEditorScript();
  }
}

// 初始化富文本编辑器
export function initializeWordEditor(containerId, content = '', options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // 检查预加载资源并继续初始化
      const checkResourcesAndInit = () => {
        // 检查AiEditor是否可用
        if (typeof AiEditor === 'undefined') {
          console.error('AiEditor未加载');
          loadAiEditorScript().then(() => {
            // 重试初始化
            initializeWordEditor(containerId, content, options)
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

        // 创建编辑器DOM结构 - 添加自定义全屏按钮和自动保存状态指示器
        container.innerHTML = `
          <div class="ai-editor-container" style="height: 800px; overflow-y: auto;">
            <div id="ai-editor-area"></div>
          </div>
          <div class="word-editor-toolbar">
            <button id="custom-fullscreen-btn" class="editor-btn" title="进入全屏编辑模式">
              <i class="fas fa-expand-arrows-alt"></i> 全屏编辑
            </button>
          </div>
          <div class="word-editor-status">
            <span id="word-editor-status">准备就绪</span>
            <span id="auto-save-status" class="auto-save-indicator"></span>
          </div>
        `;

        // 初始化AiEditor
        try {
          console.log('正在初始化AiEditor...');
          
          const editor = new AiEditor({
            element: '#ai-editor-area',
            minHeight: '600px',
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
            lastSavedContent = content; // 记录初始内容以便后续比较
          }

          // 监听内容变更事件 - 使用options.onChange代替on方法
          // 保存原始编辑器对象引用
          const editorObj = editor;
          
          // 添加内容变更回调
          editor.options.onChange = () => {
            const currentContent = editorObj.getHtml();
            
            // 触发自定义保存事件（与原有Word编辑器兼容）
            const saveEvent = new CustomEvent('word-editor-save', {
              detail: {
                text: editorObj.getText(),
                html: currentContent
              }
            });
            container.dispatchEvent(saveEvent);

            // 更新状态
            const statusElement = document.getElementById('word-editor-status');
            if (statusElement) {
              statusElement.textContent = '已修改';
            }
            
            // 自动保存状态指示
            if (autoSaveInterval) {
              const autoSaveStatus = document.getElementById('auto-save-status');
              if (autoSaveStatus) {
                if (currentContent !== lastSavedContent) {
                  autoSaveStatus.textContent = '编辑中...';
                  autoSaveStatus.className = 'auto-save-indicator editing';
                }
              }
            }
          };
          
          // 构建编辑器接口对象
          const editorInterface = {
            aiEditor: editor,
            container,
            // 兼容原有接口
            wordApp: null,
            editor: null,
            isAiEditor: true,
            // 添加全屏和自动保存相关方法
            toggleFullscreen: () => toggleFullscreenMode(editorInterface),
            enableAutoSave: (callback, interval = 5000) => enableAutoSave(editorInterface, callback, interval),
            disableAutoSave: () => disableAutoSave(),
            isFullscreen: () => isFullscreen
          };
          
          // 绑定自定义全屏按钮事件
          const fullscreenBtn = document.getElementById('custom-fullscreen-btn');
          if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
              editorInterface.toggleFullscreen();
            });
          }

          console.log('AiEditor初始化成功');
          
          // 标记全局状态为已初始化
          if (window.editorResources) {
            window.editorResources.initialized = true;
          }
          
          // 尝试从后台管理加载AI配置并应用到编辑器
          try {
            import('/js/api/aiEditorApi.js').then(({ getAiEditorConfig }) => {
              getAiEditorConfig().then(aiConfig => {
                if (aiConfig) {
                  console.log('从后台管理加载AI配置成功');
                  
                  // 将AI配置应用到编辑器
                  editor.setAiConfig(aiConfig);
                  
                  // 显示AI状态指示
                  const statusElement = document.getElementById('word-editor-status');
                  if (statusElement) {
                    statusElement.innerHTML += ' <span style="color: #28a745;"><i class="fas fa-robot"></i> AI 已启用</span>';
                  }
                  
                  // 如果有工具栏容器，添加AI状态指示
                  const toolbarContainer = document.querySelector('.word-editor-toolbar');
                  if (toolbarContainer) {
                    const aiIndicator = document.createElement('div');
                    aiIndicator.className = 'ai-status-indicator';
                    aiIndicator.innerHTML = '<i class="fas fa-robot"></i> AI 已就绪';
                    toolbarContainer.appendChild(aiIndicator);
                  }
                } else {
                  console.log('AI功能已在后台管理中禁用');
                  
                  // 显示AI已禁用状态
                  const statusElement = document.getElementById('word-editor-status');
                  if (statusElement) {
                    statusElement.innerHTML += ' <span style="color: #dc3545;"><i class="fas fa-robot"></i> AI 已禁用</span>';
                  }
                }
              }).catch(err => {
                console.error('应用AI配置出错:', err);
              });
            }).catch(err => {
              console.error('加载AI配置模块出错:', err);
            });
          } catch (err) {
            console.error('初始化AI配置出错:', err);
          }
          
          // 如果选项中启用了自动保存，则激活自动保存功能
          if (options.autoSave && typeof options.onAutoSave === 'function') {
            enableAutoSave(editorInterface, options.onAutoSave, options.autoSaveInterval || 5000);
          }
          
          resolve(editorInterface);

        } catch (error) {
          console.error('初始化AiEditor失败:', error);
          reject(error);
        }
      };

      // 先检查预加载资源，再继续初始化
      checkAndUsePreloadedResources()
        .then(checkResourcesAndInit)
        .catch(error => {
          console.error('预加载资源检查失败，尝试直接初始化:', error);
          checkResourcesAndInit();
        });
    } catch (error) {
      console.error('初始化AiEditor出现错误:', error);
      reject(error);
    }
  });
}

/**
 * 切换全屏编辑模式
 */
function toggleFullscreenMode(editorInterface) {
  if (!editorInterface || !editorInterface.container) return;
  
  const container = editorInterface.container;
  const editorContainer = container.querySelector('.ai-editor-container');
  const fullscreenBtn = document.getElementById('custom-fullscreen-btn');
  
  if (isFullscreen) {
    // 退出全屏模式
    document.body.classList.remove('editor-fullscreen-mode');
    if (editorContainer) {
      editorContainer.style.height = '800px';
      editorContainer.style.maxHeight = '';
      editorContainer.classList.remove('fullscreen-editor');
    }
    
    // 更新按钮文本
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> 全屏编辑';
      fullscreenBtn.title = '进入全屏编辑模式';
    }
    
    // 恢复原来的滚动行为
    document.body.style.overflow = '';
    
    // 触发窗口大小变化事件，确保编辑器正确重绘
    window.dispatchEvent(new Event('resize'));
    
    isFullscreen = false;
  } else {
    // 进入全屏模式
    document.body.classList.add('editor-fullscreen-mode');
    if (editorContainer) {
      editorContainer.style.height = 'calc(100vh - 120px)';
      editorContainer.style.maxHeight = 'none';
      editorContainer.classList.add('fullscreen-editor');
    }
    
    // 更新按钮文本
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> 退出全屏';
      fullscreenBtn.title = '退出全屏编辑模式';
    }
    
    // 防止页面滚动
    document.body.style.overflow = 'hidden';
    
    // 触发窗口大小变化事件，确保编辑器正确重绘
    window.dispatchEvent(new Event('resize'));
    
    isFullscreen = true;
  }
  
  // 触发自定义事件
  const fullscreenEvent = new CustomEvent('editor-fullscreen-change', {
    detail: { isFullscreen }
  });
  container.dispatchEvent(fullscreenEvent);
  
  return isFullscreen;
}

/**
 * 启用自动保存功能
 * @param {Object} editorInterface 编辑器接口
 * @param {Function} saveCallback 保存回调函数
 * @param {Number} interval 保存间隔（毫秒）
 */
function enableAutoSave(editorInterface, saveCallback, interval = 5000) {
  // 先禁用现有的自动保存
  disableAutoSave();
  
  if (!editorInterface || !editorInterface.aiEditor || typeof saveCallback !== 'function') {
    console.error('无法启用自动保存：编辑器未初始化或回调函数无效');
    return false;
  }
  
  // 记录初始内容
  lastSavedContent = editorInterface.aiEditor.getHtml();
  
  // 更新自动保存状态指示器
  const autoSaveStatus = document.getElementById('auto-save-status');
  if (autoSaveStatus) {
    autoSaveStatus.textContent = '自动保存已启用';
    autoSaveStatus.className = 'auto-save-indicator active';
  }
  
  // 设置自动保存计时器
  autoSaveInterval = setInterval(() => {
    const currentContent = editorInterface.aiEditor.getHtml();
    
    // 只在内容变化时保存
    if (currentContent !== lastSavedContent) {
      // 更新状态
      if (autoSaveStatus) {
        autoSaveStatus.textContent = '正在保存...';
        autoSaveStatus.className = 'auto-save-indicator saving';
      }
      
      // 执行保存回调
      const savePromise = saveCallback({
        html: currentContent,
        text: editorInterface.aiEditor.getText()
      });
      
      // 处理保存结果
      if (savePromise instanceof Promise) {
        savePromise.then(() => {
          // 保存成功
          lastSavedContent = currentContent;
          if (autoSaveStatus) {
            autoSaveStatus.textContent = '已自动保存';
            autoSaveStatus.className = 'auto-save-indicator saved';
            
            // 3秒后恢复为默认状态
            setTimeout(() => {
              if (autoSaveStatus) {
                autoSaveStatus.textContent = '自动保存已启用';
                autoSaveStatus.className = 'auto-save-indicator active';
              }
            }, 3000);
          }
        }).catch(error => {
          // 保存失败
          console.error('自动保存失败:', error);
          if (autoSaveStatus) {
            autoSaveStatus.textContent = '保存失败！';
            autoSaveStatus.className = 'auto-save-indicator error';
            
            // 5秒后恢复为默认状态
            setTimeout(() => {
              if (autoSaveStatus) {
                autoSaveStatus.textContent = '自动保存已启用';
                autoSaveStatus.className = 'auto-save-indicator active';
              }
            }, 5000);
          }
        });
      } else {
        // 如果回调不返回Promise，假设保存成功
        lastSavedContent = currentContent;
        if (autoSaveStatus) {
          autoSaveStatus.textContent = '已自动保存';
          autoSaveStatus.className = 'auto-save-indicator saved';
          
          // 3秒后恢复为默认状态
          setTimeout(() => {
            if (autoSaveStatus) {
              autoSaveStatus.textContent = '自动保存已启用';
              autoSaveStatus.className = 'auto-save-indicator active';
            }
          }, 3000);
        }
      }
    }
  }, interval);
  
  return true;
}

/**
 * 禁用自动保存功能
 */
function disableAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    
    // 更新状态指示器
    const autoSaveStatus = document.getElementById('auto-save-status');
    if (autoSaveStatus) {
      autoSaveStatus.textContent = '';
      autoSaveStatus.className = 'auto-save-indicator';
    }
    
    return true;
  }
  return false;
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
      console.log('AiEditor已加载，无需重新加载');
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
