export default {
  data() {
    return {
      articles: [],
      loading: true,
      error: null
    };
  },
  methods: {
    fetchArticles() {
      this.loading = true;
      axios.get('/api/articles/published')
        .then(response => {
          if (response.data.success) {
            this.articles = response.data.articles;
          } else {
            this.error = '获取文章失败';
          }
        })
        .catch(error => {
          console.error('获取文章出错:', error);
          this.error = '获取文章时发生错误';
        })
        .finally(() => {
          this.loading = false;
        });
    },
    navigateToArticle(id) {
      this.$router.push('/article/' + id);
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    truncateText(text, length = 150) {
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
      <div class="page-header">
        <h1>欢迎来到我的个人网站</h1>
        <p>这里记录着我的想法、感悟和经验分享</p>
      </div>
      
      <div v-if="loading" class="loading">
        <p>加载文章中...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
      </div>
      
      <div v-else-if="articles.length === 0" class="no-content">
        <p>暂无文章</p>
      </div>
      
      <div v-else class="articles">
        <div v-for="article in articles" :key="article.id" class="article-card">
          <div class="article-image" v-if="article.cover_image">
            <img :src="article.cover_image" :alt="article.title">
          </div>
          <div class="article-image" v-else>
            <img src="/images/default-cover.jpg" alt="默认封面">
          </div>
          
          <div class="article-content">
            <h2 class="article-title">
              <router-link :to="'/article/' + article.id">{{ article.title }}</router-link>
            </h2>
            
            <p class="article-excerpt" @click="navigateToArticle(article.id)">{{ truncateText(article.content) }}</p>
            
            <div class="article-meta">
              <span>{{ formatDate(article.created_at) }}</span>
              <span v-if="article.category">{{ article.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
