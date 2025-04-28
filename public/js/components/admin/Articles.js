export default {
  data() {
    return {
      articles: [],
      loading: true,
      error: null,
      showDeleteModal: false,
      articleToDelete: null
    };
  },
  methods: {
    fetchArticles() {
      this.loading = true;
      axios.get('/api/articles')
        .then(response => {
          if (response.data.success) {
            this.articles = response.data.articles;
          } else {
            this.error = '获取文章失败: ' + response.data.message;
          }
        })
        .catch(error => {
          console.error('获取文章出错:', error);
          this.error = '获取文章时发生错误: ' + (error.response?.data?.message || error.message);
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
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    confirmDelete(article) {
      this.articleToDelete = article;
      this.showDeleteModal = true;
    },
    
    cancelDelete() {
      this.showDeleteModal = false;
      this.articleToDelete = null;
    },
    
    deleteArticle() {
      if (!this.articleToDelete) return;
      
      const articleId = this.articleToDelete.id;
      
      axios.delete(`/api/articles/${articleId}`)
        .then(response => {
          if (response.data.success) {
            // 删除成功，从列表中移除
            this.articles = this.articles.filter(article => article.id !== articleId);
            alert('文章删除成功');
          } else {
            alert('删除失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('删除文章出错:', error);
          alert('删除文章时发生错误: ' + (error.response?.data?.message || error.message));
        })
        .finally(() => {
          this.showDeleteModal = false;
          this.articleToDelete = null;
        });
    },
    
    togglePublish(article) {
      const newStatus = !article.published;
      
      axios.put(`/api/articles/${article.id}`, {
        title: article.title,
        content: article.content,
        category: article.category,
        tags: article.tags,
        published: newStatus
      })
        .then(response => {
          if (response.data.success) {
            article.published = newStatus;
            alert(`文章${newStatus ? '已发布' : '已取消发布'}`);
          } else {
            alert('操作失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('更新文章出错:', error);
          alert('更新文章时发生错误: ' + (error.response?.data?.message || error.message));
        });
    },
    
    truncateText(text, length = 50) {
      if (!text) return '';
      // 移除HTML标签
      const plainText = text.replace(/<[^>]*>/g, '');
      if (plainText.length <= length) return plainText;
      return plainText.substring(0, length) + '...';
    }
  },
  created() {
    this.fetchArticles();
  },
  template: `
    <div>
      <div class="admin-header">
        <h1 class="admin-title">文章管理</h1>
        <router-link to="/admin/articles/create" class="btn">
          <i class="fas fa-plus"></i> 写新文章
        </router-link>
      </div>
      
      <div v-if="loading" class="loading">
        <p>加载文章中...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <button @click="fetchArticles" class="btn">重试</button>
      </div>
      
      <div v-else-if="articles.length === 0" class="empty-state">
        <h3>暂无文章</h3>
        <p>点击"写新文章"按钮创建您的第一篇文章</p>
      </div>
      
      <div v-else class="admin-article-list">
        <table class="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>摘要</th>
              <th>分类</th>
              <th>创建时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="article in articles" :key="article.id">
              <td>{{ article.title }}</td>
              <td>{{ truncateText(article.content) }}</td>
              <td>{{ article.category || '未分类' }}</td>
              <td>{{ formatDate(article.created_at) }}</td>
              <td>
                <span :class="article.published ? 'status-published' : 'status-draft'">
                  {{ article.published ? '已发布' : '草稿' }}
                </span>
              </td>
              <td class="admin-actions">
                <a :href="'/#/article/' + article.id" target="_blank" class="btn admin-action-view">
                  <i class="fas fa-eye"></i>
                </a>
                <router-link :to="'/admin/articles/edit/' + article.id" class="btn admin-action-edit">
                  <i class="fas fa-edit"></i>
                </router-link>
                <button @click="togglePublish(article)" class="btn" :class="article.published ? 'admin-action-unpublish' : 'admin-action-publish'">
                  <i :class="article.published ? 'fas fa-eye-slash' : 'fas fa-globe'"></i>
                </button>
                <button @click="confirmDelete(article)" class="btn admin-action-delete">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">确认删除</h3>
            <button @click="cancelDelete" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>确定要删除文章 "{{ articleToDelete ? articleToDelete.title : '' }}" 吗？</p>
            <p class="warning">此操作不可撤销！</p>
          </div>
          <div class="modal-footer">
            <button @click="cancelDelete" class="btn btn-outline">取消</button>
            <button @click="deleteArticle" class="btn admin-action-delete">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  `
};
