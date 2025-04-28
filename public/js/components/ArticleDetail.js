export default {
  data() {
    return {
      article: null,
      loading: true,
      error: null,
      isReaderMode: false, // 默认为正常模式
      fontSize: 16, // 默认字体大小
      tocItems: [], // 文章目录项
      showTOC: true, // 是否显示目录
      currentSection: null, // 当前阅读的段落ID
      scrollY: 0, // 页面滚动位置
      admin: null // 存储管理员信息
    };
  },
  methods: {
    fetchArticle() {
      this.loading = true;
      const articleId = this.$route.params.id;
      
      axios.get(`/api/articles/${articleId}`)
        .then(response => {
          if (response.data.success) {
            this.article = response.data.article;
            // 文章加载完成后，生成目录
            this.$nextTick(() => {
              this.generateTableOfContents();
              this.setupScrollListener();
            });
          } else {
            this.error = '获取文章失败';
          }
        })
        .catch(error => {
          console.error('获取文章出错:', error);
          this.error = error.response?.status === 404 
            ? '文章不存在或已被删除' 
            : '获取文章时发生错误';
        })
        .finally(() => {
          this.loading = false;
        });
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    renderContent(content) {
      // 直接返回富文本内容，并确保应用quill-preview样式类
      return `<div class="article-detail-content">${content || ''}</div>`;
    },
    toggleReaderMode() {
      this.isReaderMode = !this.isReaderMode;
    },
    increaseFontSize() {
      if (this.fontSize < 24) {
        this.fontSize += 2;
      }
    },
    decreaseFontSize() {
      if (this.fontSize > 12) {
        this.fontSize -= 2;
      }
    },
    generateTableOfContents() {
      this.tocItems = [];
      
      // 获取所有标题元素
      setTimeout(() => {
        const contentElement = this.$el.querySelector('.article-detail-content');
        if (!contentElement) return;
        
        const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach((heading, index) => {
          // 为每个标题添加ID
          if (!heading.id) {
            heading.id = `heading-${index}`;
          }
          
          const level = parseInt(heading.tagName.substr(1)); // 获取标题级别（1-6）
          
          this.tocItems.push({
            id: heading.id,
            text: heading.textContent,
            level: level
          });
        });
      }, 500); // 延迟执行，确保内容已渲染
    },
    setupScrollListener() {
      // 监听滚动事件以高亮当前阅读的目录项
      window.addEventListener('scroll', this.handleScroll);
    },
    handleScroll() {
      this.scrollY = window.scrollY;
      
      // 查找当前视图中最靠近顶部的标题
      const headings = this.tocItems.map(item => document.getElementById(item.id));
      
      // 筛选掉找不到的元素
      const visibleHeadings = headings.filter(Boolean);
      
      // 如果没有可见的标题，返回
      if (visibleHeadings.length === 0) return;
      
      for (const heading of visibleHeadings) {
        const rect = heading.getBoundingClientRect();
        
        // 如果标题在视口顶部附近，将其设为当前选中标题
        if (rect.top > -50 && rect.top < 100) {
          this.currentSection = heading.id;
          return;
        }
      }
    },
    scrollToHeading(id) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        this.currentSection = id;
      }
    },
    getKeywords() {
      // 从文章内容中提取关键词，这里简单使用标签或分类
      const keywords = [];
      if (this.article.category) {
        keywords.push(this.article.category);
      }
      if (this.article.tags) {
        const tags = this.article.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        keywords.push(...tags);
      }
      // 添加一些假的关键词以符合设计
      keywords.push('梳理', '创作方式');
      return keywords;
    },
    
    // 获取管理员信息（无论是否登录）
    getAdminInfo() {
      axios.get('/api/auth/admin-info')
        .then(response => {
          if (response.data.success) {
            this.admin = response.data.admin;
          }
        })
        .catch(err => {
          console.error('获取管理员信息失败:', err);
        });
    }
  },
  created() {
    this.fetchArticle();
    this.getAdminInfo(); // 组件创建时获取管理员信息
  },
  watch: {
    '$route.params.id'() {
      this.fetchArticle();
      this.getAdminInfo(); // 路由参数变化时也更新管理员信息
    }
  },
  template: `
    <div>
      <div v-if="loading" class="loading">
        <p>加载文章中...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <router-link to="/" class="btn btn-outline">返回首页</router-link>
      </div>
      
      <div v-else-if="article" :class="['article-modern-layout', {'reader-mode': isReaderMode}]">
        <!-- 顶部操作栏 -->
        <div class="article-toolbar">
          <div class="left-actions">
            <router-link to="/" class="btn-action">
              <i class="fas fa-arrow-left"></i> 返回首页
            </router-link>
          </div>
          <div class="right-actions">
            <button @click="toggleReaderMode" class="btn-action" :title="isReaderMode ? '退出阅读模式' : '进入阅读模式'">
              <i :class="['fas', isReaderMode ? 'fa-sun' : 'fa-moon']"></i>
              {{ isReaderMode ? '正常模式' : '阅读模式' }}
            </button>
            <button @click="decreaseFontSize" class="btn-action" title="减小字体">
              <i class="fas fa-font"></i><i class="fas fa-minus"></i>
            </button>
            <button @click="increaseFontSize" class="btn-action" title="增大字体">
              <i class="fas fa-font"></i><i class="fas fa-plus"></i>
            </button>
          </div>
        </div>

        <!-- 主内容区与目录区布局 -->
        <div class="article-layout">
          <!-- 内容主体部分 -->
          <main class="article-main-content">
            <!-- 1. 顶部标题区 -->
            <div class="article-title-section">
              <div class="article-episode">EP.{{ article.id }}</div>
              <h1 class="article-main-title">{{ article.title }}</h1>
              <div class="article-subtitle">{{ formatDate(article.created_at) }} · 创作于{{ article.created_at ? new Date(article.created_at).getHours() : '00' }}:{{ article.created_at ? new Date(article.created_at).getMinutes() : '00' }}</div>
              
              <!-- 关键词/标签区 -->
              <div class="article-keywords">
                <span v-for="keyword in getKeywords()" :key="keyword" class="keyword-tag">
                  {{ keyword }}
                </span>
              </div>
            </div>
            
            <!-- 2. 引言摘要区 -->
            <div class="article-summary" v-if="article.content">
              <div class="summary-content">
                <p><strong>{{ article.category || '分享' }}</strong> - {{ article.content.replace(/<[^>]*>/g, '').substring(0, 120) }}...</p>
              </div>
            </div>
            
            <!-- 3. 核心配图区 -->
            <div class="article-featured-image" v-if="article.cover_image">
              <div class="image-container">
                <img :src="article.cover_image" :alt="article.title">
              </div>
              <div class="image-caption">
                <i class="fas fa-camera"></i> {{ article.title }} - 配图
              </div>
            </div>
            
            <!-- 4. 主体内容区 -->
            <div class="article-detail-content" :style="{fontSize: fontSize + 'px'}" v-html="renderContent(article.content)"></div>
            
            <!-- 文章底部信息 -->
            <div class="article-detail-footer">
              <div class="article-author">
                <div class="author-avatar">
                  <img :src="admin && admin.avatar ? admin.avatar : '/images/avatar.png'" alt="作者头像">
                </div>
                <div class="author-info">
                  <div class="author-name">{{ admin ? (admin.name || admin.username) : '作者' }}</div>
                  <div class="publish-info">发表于 {{ formatDate(article.created_at) }}</div>
                </div>
              </div>
              
              <div class="article-tags" v-if="article.tags">
                <div class="tags-title"><i class="fas fa-tags"></i> 文章标签:</div>
                <div class="tags-list">
                  <span v-for="tag in article.tags.split(',')" :key="tag" class="article-tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </main>
          
          <!-- 5. 侧边浮窗目录 -->
          <aside class="article-toc" v-if="tocItems.length > 0">
            <div class="toc-container">
              <div class="toc-header">
                <h3>文章目录</h3>
              </div>
              <ul class="toc-list">
                <li v-for="item in tocItems" :key="item.id"
                    :class="['toc-item', 'level-' + item.level, { active: currentSection === item.id }]"
                    @click="scrollToHeading(item.id)">
                  <span class="toc-bullet"></span>
                  <span class="toc-text">{{ item.text }}</span>
                </li>
                <li v-if="tocItems.length === 0" class="toc-empty">无目录内容</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `
};
