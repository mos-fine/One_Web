// 使用全局方式引用quill-image-resize-module
// 注意：此模块应通过<script>标签在HTML中先行加载

// 导入WordEditor.js中的功能
import { initializeWordEditor, createCompatibilityLayer } from './WordEditor.js';
// 导入Word内容修复工具
import { fixWordEditorContent, loadContentWithDelay, rebuildEditor } from './WordContentFixer.js';

export default {
  data() {
    return {
      article: {
        title: '',
        content: '',
        category: '',
        tags: '',
        published: false,
        cover_image: null
      },
      isEditing: false,
      articleId: null,
      loading: false,
      saving: false,
      previewMode: false,
      error: null,
      imageFile: null,
      socialPlatforms: [],
      shareOptions: {
        platforms: []
      },
      showShareModal: false,
      wordEditor: null, // 保存Word编辑器实例
      wordEditorConfig: {
        autoSave: true, // 启用自动保存功能
      }
    };
  },
  computed: {
    pageTitle() {
      return this.isEditing ? '编辑文章' : '写新文章';
    }
  },
  methods: {
    // 获取文章详情（编辑模式）
    fetchArticle() {
      if (!this.articleId) {
        console.warn('没有文章ID，无法获取文章');
        return;
      }
      
      this.loading = true;
      console.log('【开始获取文章数据】，文章ID:', this.articleId);
      
      axios.get(`/api/articles/${this.articleId}`)
        .then(response => {
          console.log('【服务器响应成功】');
          if (response.data.success) {
            // 先检查响应中是否有内容
            if (!response.data.article || !response.data.article.content) {
              console.warn('【警告】服务器返回的文章内容为空');
            }
            
            // 保存文章数据
            this.article = response.data.article;
            console.log('【文章数据获取成功】，文章内容长度:', this.article.content ? this.article.content.length : 0);
            
            // 检查编辑器是否已经预加载并准备就绪
            const isEditorPreloaded = window.editorResources && window.editorResources.loaded;
            const setContentDelay = isEditorPreloaded ? 100 : 300; // 如果已预加载，使用更短的延迟
            
            console.log(`【延迟执行】准备设置内容到Word编辑器 (延迟: ${setContentDelay}ms, 预加载状态: ${isEditorPreloaded ? '已预加载' : '未预加载'})`);
            
            // 使用更智能的延迟机制设置内容
            setTimeout(() => {
              // 文章加载完成后，设置编辑器内容
              if (this.wordEditor && this.article.content) {
                console.log('【Word编辑器已初始化】，设置内容到编辑器，长度:', this.article.content.length);
                
                try {
                  // 修复可能的内容问题
                  const fixedContent = fixWordEditorContent(this.article.content);
                  
                  // 使用兼容层设置内容
                  const compatEditor = createCompatibilityLayer(this.wordEditor);
                  compatEditor.setContents(fixedContent)
                    .then(() => {
                      console.log('【Word内容设置成功】内容已加载到编辑器');
                      // 标记内容已加载成功
                      window.editorContentLoaded = true;
                    })
                    .catch(error => {
                      console.error('【错误】设置Word编辑器内容失败:', error);
                      
                      // 失败时尝试延迟加载
                      console.log('【备选方案】使用延迟加载方式尝试');
                      loadContentWithDelay(compatEditor, fixedContent, 500)
                        .then(success => {
                          if (success) {
                            console.log('【延迟加载成功】内容已成功设置到Word编辑器');
                            window.editorContentLoaded = true;
                          } else {
                            console.warn('【警告】延迟加载内容失败，尝试重建编辑器');
                            this.reinitializeWordEditor();
                          }
                        });
                    });
                } catch (error) {
                  console.error('【错误】设置Word编辑器内容时出错:', error);
                  
                  // 出错时尝试最后的备选方案
                  try {
                    console.log('【备选方案】重置Word编辑器并设置内容');
                    // 重新创建一个编辑器实例
                    this.reinitializeWordEditor();
                  } catch (fallbackError) {
                    console.error('【严重错误】所有尝试都失败:', fallbackError);
                  }
                }
              } else {
                console.log('【编辑器未初始化或内容为空】编辑器状态:', !!this.quill, '内容状态:', !!(this.article && this.article.content));
                // 如果编辑器尚未初始化，设置标记并稍后尝试
                this._contentReadyForEditor = true;
                
                if (!this.quill) {
                  console.log('【尝试初始化编辑器】');
                  this.initEditorWithRetry(0);
                }
              }
            }, 300); // 增加延迟时间到300ms
          } else {
            console.error('【失败】获取文章失败:', response.data.message);
            this.error = '获取文章失败: ' + response.data.message;
          }
        })
        .catch(error => {
          console.error('【错误】获取文章出错:', error);
          this.error = '获取文章时发生错误: ' + (error.response?.data?.message || error.message);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    // 获取社交媒体平台列表
    fetchSocialPlatforms() {
      axios.get('/api/social/platforms')
        .then(response => {
          if (response.data.success) {
            this.socialPlatforms = response.data.platforms.filter(p => p.active);
          }
        })
        .catch(error => {
          console.error('获取社交平台出错:', error);
        });
    },
    
    // 处理图片上传
    handleImageChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择有效的图片文件');
        return;
      }
      
      // 检查文件大小
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过 5MB');
        return;
      }
      
      this.imageFile = file;
      
      // 预览图片
      const reader = new FileReader();
      reader.onload = (e) => {
        this.article.cover_image = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    // 移除封面图片
    removeCoverImage() {
      this.article.cover_image = null;
      this.imageFile = null;
      
      // 重置文件输入框
      const fileInput = this.$refs.imageInput;
      if (fileInput) {
        fileInput.value = '';
      }
    },
    
    // 保存文章
    saveArticle() {
      if (!this.article.title.trim()) {
        alert('请输入文章标题');
        return;
      }
      
      if (!this.article.content.trim()) {
        alert('请输入文章内容');
        return;
      }
      
      this.saving = true;
      
      // 准备表单数据
      const formData = new FormData();
      formData.append('title', this.article.title);
      formData.append('content', this.article.content);
      formData.append('category', this.article.category || '未分类');
      formData.append('tags', this.article.tags || '');
      formData.append('published', this.article.published);
      
      // 如果有新上传的图片，添加到表单
      if (this.imageFile) {
        formData.append('cover_image', this.imageFile);
      }
      
      // 决定是创建新文章还是更新现有文章
      const savePromise = this.isEditing
        ? axios.put(`/api/articles/${this.articleId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        : axios.post('/api/articles', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
      
      savePromise
        .then(response => {
          if (response.data.success) {
            alert(this.isEditing ? '文章更新成功！' : '文章创建成功！');
            
            // 如果是新文章，保存文章ID，并更新URL
            if (!this.isEditing && response.data.articleId) {
              this.articleId = response.data.articleId;
              this.isEditing = true;
              history.replaceState(null, '', `/admin/articles/edit/${this.articleId}`);
              
              // 如果文章已发布，询问是否分享到社交媒体
              if (this.article.published && this.socialPlatforms.length > 0) {
                this.showShareModal = true;
              }
            } else if (this.isEditing && this.article.published) {
              // 编辑模式下，如果文章已发布，也询问是否分享
              if (this.socialPlatforms.length > 0) {
                this.showShareModal = true;
              }
            }
            
            // 如果不需要显示分享弹窗，则返回文章列表
            if (!this.showShareModal) {
              this.$router.push('/admin/articles');
            }
          } else {
            alert('保存失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('保存文章出错:', error);
          alert('保存文章时发生错误: ' + (error.response?.data?.message || error.message));
        })
        .finally(() => {
          this.saving = false;
        });
    },
    
    // 切换预览模式
    togglePreview() {
      this.previewMode = !this.previewMode;
    },
    
    // 初始化Word编辑器
    initWordEditor() {
      console.log('initWordEditor开始执行');
      if (this.$refs.wordEditorContainer) {
        console.log('找到wordEditorContainer引用，开始初始化Word编辑器');
        
        try {
          // 使用我们封装好的方法创建Word编辑器实例
          console.log('创建Word编辑器实例');
          
          // 初始化容器元素
          const containerId = this.$refs.wordEditorContainer.id || 'word-editor-container';
          this.$refs.wordEditorContainer.id = containerId;
          
          // 检查是否已经预加载了编辑器
          const isPreloaded = window.editorResources && window.editorResources.loaded;
          console.log('编辑器资源预加载状态:', isPreloaded ? '已预加载' : '未预加载');
          
          // 初始化Word编辑器
          // 添加自定义样式以确保编辑器正确显示
          const editorStyle = document.createElement('style');
          editorStyle.textContent = `
            #${containerId} .ai-editor-container {
              min-height: 800px !important;
              height: auto !important;
              overflow-y: visible !important;
            }
            #${containerId} .ql-editor {
              min-height: 750px !important;
              height: auto !important;
              overflow-y: auto !important;
              padding: 20px;
            }
          `;
          document.head.appendChild(editorStyle);
          
          // 准备自动保存配置
          const autoSaveConfig = {
            autoSave: this.wordEditorConfig.autoSave || true,
            autoSaveInterval: 5000, // 每5秒保存一次
            onAutoSave: (content) => this.handleAutoSave(content)
          };
          
          // 初始化编辑器，传入自动保存配置
          initializeWordEditor(containerId, '', autoSaveConfig)
            .then(editorInstance => {
              console.log('Word编辑器创建成功');
              this.wordEditor = editorInstance;
              
              // 确保编辑器容器高度正确
              if (this.$refs.wordEditorContainer) {
                const container = this.$refs.wordEditorContainer;
                container.style.minHeight = '800px';
                
                // 获取编辑器实际元素
                const aiEditorContainer = container.querySelector('.ai-editor-container');
                const qlEditor = container.querySelector('.ql-editor');
                
                if (aiEditorContainer) aiEditorContainer.style.height = 'auto';
                if (qlEditor) qlEditor.style.minHeight = '750px';
              }
              
              // 添加全屏状态变化监听
              this.$refs.wordEditorContainer.addEventListener('editor-fullscreen-change', (event) => {
                console.log('编辑器全屏状态改变:', event.detail.isFullscreen);
                this.handleFullscreenChange(event.detail.isFullscreen);
              });
              
              // 如果处于编辑模式，则设置编辑器内容
              if (this.isEditing && this.article && this.article.content) {
                console.log('initWordEditor中：检测到编辑模式，并且有文章内容，设置内容到Word编辑器');
                console.log('文章内容长度:', this.article.content.length);
                
                // 修复内容并设置到编辑器中
                const fixedContent = fixWordEditorContent(this.article.content);
                const compatEditor = createCompatibilityLayer(this.wordEditor);
                
                // 延迟设置内容，确保编辑器完全初始化
                setTimeout(() => {
                  compatEditor.setContents(fixedContent)
                    .then(() => {
                      console.log('Word编辑器内容设置成功');
                    })
                    .catch(error => {
                      console.error('设置Word编辑器内容时出错:', error);
                    });
                }, 500);
              } else {
                console.log('不满足在initWordEditor中设置内容的条件:',
                  'isEditing:', this.isEditing,
                  'article存在:', !!this.article, 
                  'content存在:', !!(this.article && this.article.content));
              }
              
              // 添加编辑器内容变化监听，确保滚动正常
              setTimeout(() => {
                const qlEditor = document.querySelector('.ql-editor');
                if (qlEditor) {
                  // 创建MutationObserver监听内容变化
                  const observer = new MutationObserver(() => {
                    // 确保编辑器容器高度适应内容
                    if (qlEditor.scrollHeight > 750) {
                      qlEditor.style.height = 'auto';
                      qlEditor.style.minHeight = qlEditor.scrollHeight + 'px';
                    }
                  });
                  
                  // 开始监听
                  observer.observe(qlEditor, {
                    childList: true,
                    subtree: true,
                    characterData: true
                  });
                }
              }, 1000);
              
              // 监听编辑器内容保存事件
              this.$refs.wordEditorContainer.addEventListener('word-editor-save', (event) => {
                this.article.content = event.detail.html;
                console.log('Word编辑器内容已更新，新内容长度:', this.article.content.length);
              });
            })
            .catch(error => {
              console.error('Word编辑器初始化失败:', error);
            });
        } catch (error) {
          console.error('Word编辑器初始化出错:', error);
        }
      } else {
        console.warn('未找到wordEditorContainer引用，无法初始化编辑器');
      }
    },
    
    // 分享到社交媒体
    shareToSocial() {
      if (!this.articleId) {
        alert('文章ID无效，无法分享');
        return;
      }
      
      if (this.shareOptions.platforms.length === 0) {
        alert('请选择至少一个分享平台');
        return;
      }
      
      const shareData = {
        articleId: this.articleId,
        platforms: this.shareOptions.platforms
      };
      
      axios.post('/api/social/share', shareData)
        .then(response => {
          if (response.data.success) {
            let successCount = 0;
            let message = '分享结果:\n';
            
            response.data.results.forEach(result => {
              message += `${result.platform}: ${result.success ? '成功' : '失败'} - ${result.message}\n`;
              if (result.success) successCount++;
            });
            
            if (successCount > 0) {
              message += `\n成功分享到 ${successCount} 个平台`;
            } else {
              message += '\n分享失败，请检查社交媒体配置';
            }
            
            alert(message);
          } else {
            alert('分享失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('分享出错:', error);
          alert('分享时发生错误: ' + (error.response?.data?.message || error.message));
        })
        .finally(() => {
          this.showShareModal = false;
          this.$router.push('/admin/articles');
        });
    },
    
    // 取消分享，直接返回文章列表
    cancelShare() {
      this.showShareModal = false;
      this.$router.push('/admin/articles');
    },
    
    // 带重试机制的编辑器初始化，返回Promise
    initEditorWithRetry(attemptCount) {
      console.log(`尝试初始化Word编辑器，第${attemptCount + 1}次尝试`);
      
      return new Promise((resolve) => {
        // 最多尝试5次，每次间隔300ms
        if (attemptCount >= 5) {
          console.error('多次尝试后仍未找到wordEditorContainer引用，放弃初始化');
          resolve(false); // 虽然失败但仍然resolve以避免阻塞后续操作
          return;
        }
        
        // 检查DOM元素是否已渲染
        if (this.$refs.wordEditorContainer) {
          console.log('找到wordEditorContainer引用，开始初始化');
          
          // 初始化容器元素
          const containerId = this.$refs.wordEditorContainer.id || 'word-editor-container';
          this.$refs.wordEditorContainer.id = containerId;
          
          // 初始化编辑器并处理内容设置
          initializeWordEditor(containerId)
            .then(editorInstance => {
              console.log('Word编辑器创建成功');
              this.wordEditor = editorInstance;
              
              // 处理内容加载
              this.handleEditorContentLoading();
              
              // 初始化成功
              resolve(true);
            })
            .catch(error => {
              console.error('Word编辑器初始化失败:', error);
              resolve(false);
            });
        } else {
          console.log(`未找到wordEditorContainer引用，300ms后将进行第${attemptCount + 2}次尝试`);
          setTimeout(() => {
            this.initEditorWithRetry(attemptCount + 1)
              .then(resolve);
          }, 300);
        }
      });
    },
    
    // 处理编辑器内容加载
    handleEditorContentLoading() {
      // 初始化后检查是否有内容需要设置
      if (this.isEditing && this.article && this.article.content && this.wordEditor) {
        console.log('检测到文章内容已加载，设置到Word编辑器中');
        // 使用小延迟确保编辑器已完全初始化
        setTimeout(() => {
          try {
            console.log(`设置内容到Word编辑器，内容长度: ${this.article.content.length}`);
            // 使用兼容层设置内容
            const compatEditor = createCompatibilityLayer(this.wordEditor);
            const fixedContent = fixWordEditorContent(this.article.content);
            
            compatEditor.setContents(fixedContent)
              .then(() => {
                console.log('Word编辑器内容设置成功');
                // 标记加载状态以便跟踪
                window.editorContentLoaded = true;
              })
              .catch(error => {
                console.error('设置Word编辑器内容时出错:', error);
              });
          } catch (error) {
            console.error('设置Word编辑器内容时出错:', error);
          }
        }, 200); // 减少延迟时间，因为我们已经优化了加载流程
      } else if (this.isEditing && this.article && this._contentReadyForEditor && this.wordEditor) {
        // 处理文章内容先于编辑器准备好的情况
        console.log('检测到内容已准备好，Word编辑器刚刚初始化完成，现在设置内容');
        setTimeout(() => {
          try {
            if (this.article.content) {
              console.log(`设置内容到Word编辑器，内容长度: ${this.article.content.length}`);
              // 使用兼容层设置内容
              const compatEditor = createCompatibilityLayer(this.wordEditor);
              const fixedContent = fixWordEditorContent(this.article.content);
              
              compatEditor.setContents(fixedContent)
                .then(() => {
                  console.log('Word编辑器内容设置成功');
                  window.editorContentLoaded = true;
                })
                .catch(error => {
                  console.error('设置Word编辑器内容时出错:', error);
                });
            }
          } catch (error) {
            console.error('设置Word编辑器内容时出错:', error);
          }
        }, 200);
      } else {
        console.log('暂不满足设置内容条件，将在fetchArticle中再次尝试');
      }
    },
    
    // 重新初始化Word编辑器
    reinitializeWordEditor() {
      console.log('开始重新初始化Word编辑器');
      
      // 清空编辑器容器
      if (this.$refs.wordEditorContainer) {
        const containerId = this.$refs.wordEditorContainer.id || 'word-editor-container';
        
        // 导入重建编辑器函数
        rebuildEditor(containerId, this.article.content, (newEditor) => {
          console.log('Word编辑器重建成功');
          this.wordEditor = newEditor;
          
          // 监听编辑器内容保存事件
          this.$refs.wordEditorContainer.addEventListener('word-editor-save', (event) => {
            this.article.content = event.detail.html;
            console.log('重建的Word编辑器内容已更新，新内容长度:', this.article.content.length);
          });
        });
      } else {
        console.error('未找到Word编辑器容器，无法重新初始化');
      }
    },
    
    /**
     * 处理自动保存
     * @param {Object} content 编辑器内容对象，包含html和text属性
     * @returns {Promise} 保存操作的Promise
     */
    handleAutoSave(content) {
      console.log('触发自动保存，内容长度:', content.html.length);
      
      // 只有在内容变化时才自动保存
      if (this.article.content !== content.html) {
        // 更新本地内容
        this.article.content = content.html;
        
        // 创建自动保存请求
        return new Promise((resolve, reject) => {
          // 如果正在进行主动保存，则不执行自动保存
          if (this.saving) {
            console.log('检测到正在主动保存，跳过自动保存');
            resolve();
            return;
          }
          
          // 准备表单数据，但只包含必要的内容
          const formData = new FormData();
          formData.append('content', content.html);
          formData.append('_method', 'PUT'); // 使用PUT方法
          formData.append('autosave', 'true'); // 标记为自动保存
          
          // 只有在编辑模式下且有文章ID时才进行保存
          if (this.isEditing && this.articleId) {
            axios.post(`/api/articles/${this.articleId}/autosave`, formData)
              .then(response => {
                if (response.data.success) {
                  console.log('自动保存成功:', response.data.message);
                  resolve();
                } else {
                  console.error('自动保存失败:', response.data.message);
                  reject(new Error(response.data.message));
                }
              })
              .catch(error => {
                console.error('自动保存出错:', error);
                reject(error);
              });
          } else if (!this.isEditing && this.articleId) {
            // 如果是新建文章并且已经有临时ID，则使用此ID保存
            axios.post(`/api/articles/${this.articleId}/autosave`, formData)
              .then(response => {
                if (response.data.success) {
                  console.log('新文章自动保存成功:', response.data.message);
                  resolve();
                } else {
                  console.error('新文章自动保存失败:', response.data.message);
                  reject(new Error(response.data.message));
                }
              })
              .catch(error => {
                console.error('新文章自动保存出错:', error);
                reject(error);
              });
          } else if (!this.isEditing && !this.articleId && this.article.title) {
            // 如果是新建文章且有标题，创建一个草稿
            formData.append('title', this.article.title);
            formData.append('draft', 'true');
            
            axios.post('/api/articles/draft', formData)
              .then(response => {
                if (response.data.success) {
                  console.log('草稿创建成功:', response.data.message);
                  // 保存文章ID，更新URL，但不改变编辑状态
                  if (response.data.articleId) {
                    this.articleId = response.data.articleId;
                    history.replaceState(null, '', `/admin/articles/create/${this.articleId}`);
                  }
                  resolve();
                } else {
                  console.error('草稿创建失败:', response.data.message);
                  reject(new Error(response.data.message));
                }
              })
              .catch(error => {
                console.error('草稿创建出错:', error);
                reject(error);
              });
          } else {
            // 没有标题或其他条件不满足，跳过自动保存
            console.log('条件不满足，跳过自动保存（没有文章ID或标题）');
            resolve();
          }
        });
      } else {
        // 内容没有变化，不需要保存
        console.log('内容未变化，无需自动保存');
        return Promise.resolve();
      }
    },
    
    /**
     * 处理编辑器全屏状态改变
     * @param {Boolean} isFullscreen 是否为全屏状态
     */
    handleFullscreenChange(isFullscreen) {
      // 更新编辑器配置
      this.wordEditorConfig.isFullscreen = isFullscreen;
      
      if (isFullscreen) {
        // 进入全屏模式时的处理
        // 可以根据需要调整UI元素，例如隐藏不需要的元素
        document.querySelector('.app-header')?.classList.add('hidden-in-fullscreen');
        document.querySelector('.app-footer')?.classList.add('hidden-in-fullscreen');
        
        // 通知其他组件
        this.$emit('editor-fullscreen', true);
      } else {
        // 退出全屏模式时的处理
        document.querySelector('.app-header')?.classList.remove('hidden-in-fullscreen');
        document.querySelector('.app-footer')?.classList.remove('hidden-in-fullscreen');
        
        // 通知其他组件
        this.$emit('editor-fullscreen', false);
      }
    },
  },
  
  // 在组件创建时，从路由参数中获取文章ID
  created() {
    console.log('EditArticle组件created钩子执行');
    // 检查路由参数中是否有文章ID
    const articleId = this.$route.params.id;
    if (articleId) {
      console.log('检测到路由参数中的文章ID:', articleId);
      this.articleId = articleId;
      this.isEditing = true;
    } else {
      console.log('未检测到文章ID，处于新建文章模式');
    }
    
    // 获取社交媒体平台列表
    this.fetchSocialPlatforms();
  },
  
  // 在组件挂载到DOM后，初始化编辑器并加载文章内容
  mounted() {
    console.log('EditArticle组件mounted钩子执行');
    
    // 先检查是否有预加载的编辑器资源
    const isPreloaded = window.editorResources && window.editorResources.loaded;
    if (isPreloaded) {
      console.log('检测到预加载的编辑器资源，可以快速初始化');
    } else {
      console.log('未检测到预加载资源，将使用标准初始化流程');
    }
    
    // 并行处理：同时初始化编辑器和加载文章内容
    // 这样可以更高效地利用时间，减少用户等待
    const editorPromise = this.initEditorWithRetry(0);
    
    // 如果是编辑模式，加载文章内容
    if (this.isEditing) {
      console.log('编辑模式，开始加载文章内容');
      this.fetchArticle();
    } else {
      console.log('新建文章模式，无需加载文章内容');
    }
    
    // 标记编辑器是否使用了预加载的资源，用于性能统计
    if (window.performance && window.performance.mark) {
      window.performance.mark('editor-init-start');
      editorPromise.then(() => {
        window.performance.mark('editor-init-end');
        window.performance.measure('editor-initialization', 'editor-init-start', 'editor-init-end');
        console.log('编辑器初始化完成，使用了预加载资源:', isPreloaded);
      });
    }
  },
  
  beforeDestroy() {
    // 组件销毁前，移除编辑器实例
    if (this.quill) {
      this.quill = null;
    }
  },
  template: `
    <div>
      <div class="admin-header">
        <h1 class="admin-title">{{ pageTitle }}</h1>
        <div class="admin-actions">
          <button @click="togglePreview" class="btn btn-outline">
            <i class="fas" :class="previewMode ? 'fa-edit' : 'fa-eye'"></i>
            {{ previewMode ? '编辑模式' : '预览模式' }}
          </button>
          <button @click="$router.push('/admin/articles')" class="btn btn-outline">
            <i class="fas fa-arrow-left"></i> 返回列表
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <p>加载文章中...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="fetchArticle" class="btn">重试</button>
          <button @click="$router.push('/admin/articles')" class="btn btn-outline">返回列表</button>
        </div>
      </div>
      
      <div v-else>
        <!-- 预览模式 -->
        <div v-if="previewMode" class="article-preview">
          <div class="article-detail">
            <div class="article-detail-header">
              <h1 class="article-detail-title">{{ article.title || '无标题' }}</h1>
              <div class="article-detail-meta">
                <span><i class="far fa-calendar-alt"></i> 预览</span>
                <span v-if="article.category"><i class="fas fa-folder"></i> {{ article.category }}</span>
              </div>
            </div>
            
            <div class="article-detail-image" v-if="article.cover_image">
              <img :src="article.cover_image" alt="封面图片">
            </div>
            
            <div class="article-detail-content" v-html="article.content"></div>
            
            <div class="article-detail-footer" v-if="article.tags">
              <div class="article-tags">
                <span><i class="fas fa-tags"></i> 标签:</span>
                <span v-for="tag in article.tags.split(',')" :key="tag.trim()" class="article-tag">{{ tag.trim() }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 编辑模式 -->
        <div v-else class="admin-form">
          <div class="form-group">
            <label for="title" class="form-label">文章标题</label>
            <input 
              type="text" 
              id="title" 
              v-model="article.title" 
              class="form-input" 
              placeholder="请输入文章标题"
              :disabled="saving"
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">封面图片</label>
            <div class="cover-image-container">
              <div v-if="article.cover_image" class="cover-image-preview">
                <img :src="article.cover_image" alt="封面预览">
                <button @click="removeCoverImage" class="btn btn-small">
                  <i class="fas fa-times"></i> 移除图片
                </button>
              </div>
              <input 
                type="file" 
                ref="imageInput"
                @change="handleImageChange" 
                accept="image/*" 
                :disabled="saving"
              >
              <small>支持JPG, PNG格式，最大5MB</small>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group form-col">
              <label for="category" class="form-label">分类</label>
              <input 
                type="text" 
                id="category" 
                v-model="article.category" 
                class="form-input" 
                placeholder="文章分类"
                :disabled="saving"
              >
            </div>
            
            <div class="form-group form-col">
              <label for="tags" class="form-label">标签</label>
              <input 
                type="text" 
                id="tags" 
                v-model="article.tags" 
                class="form-input" 
                placeholder="使用逗号分隔多个标签"
                :disabled="saving"
              >
            </div>
          </div>
          
          <div class="form-group editor-wrapper sticky-toolbar-wrapper">
            <label for="content" class="form-label">文章内容 (富文本编辑器)</label>
            <div class="word-editor-container">
              <!-- 富文本编辑器容器 -->
              <div ref="wordEditorContainer" id="word-editor-container" class="editor-scrollable-content"></div>
            </div>
            <div class="editor-spacer"></div>
          </div>
          
          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" v-model="article.published" :disabled="saving">
              <span>发布文章</span>
            </label>
            <small>未发布的文章只有管理员可见</small>
          </div>
          
          <div class="form-actions">
            <button @click="saveArticle" class="btn" :disabled="saving">
              {{ saving ? '保存中...' : '保存文章' }}
            </button>
            <button @click="$router.push('/admin/articles')" class="btn btn-outline" :disabled="saving">
              取消
            </button>
          </div>
        </div>
      </div>
      
      <!-- 社交媒体分享弹窗 -->
      <div v-if="showShareModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">分享到社交媒体</h3>
            <button @click="cancelShare" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>您的文章已成功保存，是否同时分享到社交媒体?</p>
            
            <div v-if="socialPlatforms.length === 0" class="empty-state">
              <p>没有配置可用的社交媒体平台</p>
              <p>请先在社交媒体设置中添加平台</p>
            </div>
            
            <div v-else class="form-group">
              <label class="form-label">选择分享平台：</label>
              <div class="platform-options">
                <label v-for="platform in socialPlatforms" :key="platform.id" class="form-checkbox">
                  <input 
                    type="checkbox" 
                    :value="platform.id" 
                    v-model="shareOptions.platforms"
                  >
                  <span>{{ platform.platform }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="cancelShare" class="btn btn-outline">不分享</button>
            <button 
              @click="shareToSocial" 
              class="btn" 
              :disabled="shareOptions.platforms.length === 0"
            >
              分享
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
