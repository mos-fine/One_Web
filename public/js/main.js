// 导入组件
import Home from './components/Home.js';
import ArticleDetail from './components/ArticleDetail.js';
import Login from './components/Login.js';
import AdminDashboard from './components/admin/Dashboard.js';
import AdminArticles from './components/admin/Articles.js';
import AdminEditArticle from './components/admin/EditArticle.js';
import AdminSocialMedia from './components/admin/SocialMedia.js';

// 配置API基础URL
const API_BASE_URL = '/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 设置路由
const routes = [
  { path: '/', component: Home },
  { path: '/article/:id', component: ArticleDetail },
  { path: '/login', component: Login },
  { 
    path: '/admin', 
    component: AdminDashboard,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/articles' },
      { path: 'articles', component: AdminArticles },
      { path: 'articles/create', component: AdminEditArticle },
      { path: 'articles/edit/:id', component: AdminEditArticle },
      { path: 'social', component: AdminSocialMedia }
    ]
  },
  { path: '*', redirect: '/' }
];

const router = new VueRouter({
  routes,
  mode: 'history'
});

// 路由守卫，检查是否登录
router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 检查是否已登录
    api.get('/auth/check')
      .then(response => {
        if (response.data.success) {
          next();
        } else {
          next('/login');
        }
      })
      .catch(() => {
        next('/login');
      });
  } else {
    next();
  }
});

// Markdown配置
marked.setOptions({
  highlight: function(code, lang) {
    return hljs.highlightAuto(code, [lang]).value;
  },
  breaks: true,
  gfm: true
});

// 创建Vue实例
new Vue({
  el: '#app',
  router,
  data: {
    admin: null,
    clickCount: 0,
    clickTimer: null
  },
  methods: {
    // 检查管理员登录状态
    checkAuth() {
      api.get('/auth/check')
        .then(response => {
          if (response.data.success) {
            this.admin = response.data.admin;
          }
        })
        .catch(() => {
          this.admin = null;
        });
    },
    
    // 处理头像点击，5次快速点击跳转到登录页
    handleAvatarClick() {
      this.clickCount++;
      
      // 清除之前的定时器
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
      }
      
      // 设置新的定时器，2秒后重置点击计数
      this.clickTimer = setTimeout(() => {
        this.clickCount = 0;
      }, 2000);
      
      // 如果点击了5次，跳转到登录页
      if (this.clickCount >= 5) {
        this.clickCount = 0;
        clearTimeout(this.clickTimer);
        this.$router.push('/login');
      }
    }
  },
  created() {
    // 检查登录状态
    this.checkAuth();
  },
  template: `
    <div>
      <!-- 导航栏 -->
      <nav class="navbar">
        <div class="navbar-container container">
          <div class="logo">
            <img src="/images/avatar.png" alt="头像" @click="handleAvatarClick">
            <span class="logo-text">我的个人网站</span>
          </div>
          <ul class="nav-links">
            <li><router-link to="/">首页</router-link></li>
            <li v-if="admin"><router-link to="/admin">后台管理</router-link></li>
          </ul>
        </div>
      </nav>
      
      <!-- 主要内容 -->
      <div class="main container">
        <router-view></router-view>
      </div>
      
      <!-- 页脚 -->
      <footer class="footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-section">
              <h3 class="footer-title">关于我</h3>
              <p>这是我的个人网站，分享我的想法和经验。</p>
              <div class="social-links">
                <a href="#"><i class="fab fa-weibo"></i></a>
                <a href="#"><i class="fab fa-weixin"></i></a>
                <a href="#"><i class="fab fa-github"></i></a>
              </div>
            </div>
            <div class="footer-section">
              <h3 class="footer-title">联系我</h3>
              <p><i class="far fa-envelope"></i> email@example.com</p>
              <p><i class="fas fa-map-marker-alt"></i> 中国</p>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2025 我的个人网站 - 保留所有权利</p>
          </div>
        </div>
      </footer>
    </div>
  `
});
