// 导入组件
import Home from './components/Home.js';
import ArticleDetail from './components/ArticleDetail.js';
import Login from './components/Login.js';
import AdminDashboard from './components/admin/Dashboard.js';
import AdminArticles from './components/admin/Articles.js';
import AdminEditArticle from './components/admin/EditArticle.js';
import AdminSocialMedia from './components/admin/SocialMedia.js';
import UserProfile from './components/admin/UserProfile.js';
import AiSettings from './components/admin/AiSettings.js';

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
      { path: 'social', component: AdminSocialMedia },
      { path: 'profile', component: UserProfile },
      { path: 'ai-settings', component: AiSettings }
    ]
  },
  { path: '*', redirect: '/' }
];

const router = new VueRouter({
  routes,
  mode: 'history'
});

// 路由守卫，检查是否登录以及更新用户信息
router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 检查是否已登录
    api.get('/auth/check')
      .then(response => {
        if (response.data.success) {
          // 更新全局管理员状态以确保最新数据
          if (router.app.$root) {
            router.app.$root.admin = response.data.admin;
          }
          next();
        } else {
          next('/login');
        }
      })
      .catch(() => {
        next('/login');
      });
  } else {
    // 即使不需要权限的路由，也总是获取并显示管理员信息
    api.get('/auth/admin-info')
      .then(response => {
        if (response.data.success && router.app.$root) {
          router.app.$root.admin = response.data.admin;
        }
      })
      .catch(() => {});
    
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
    clickTimer: null,
    showTooltip: false,
    tooltipMessage: '',
    isDarkMode: false
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
          // 登录失败或未登录，但仍然获取管理员信息用于显示
          this.getAdminInfo();
        });
    },
    
    // 获取管理员信息（无论是否登录）
    getAdminInfo() {
      api.get('/auth/admin-info')
        .then(response => {
          if (response.data.success) {
            this.admin = response.data.admin;
          }
        })
        .catch(err => {
          console.error('获取管理员信息失败:', err);
        });
    },
    
    // 显示提示信息
    showTooltipMessage(message) {
      this.tooltipMessage = message;
      this.showTooltip = true;
      
      // 3秒后自动隐藏
      setTimeout(() => {
        this.showTooltip = false;
      }, 3000);
    },
    
    // 切换夜间模式
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      
      if (this.isDarkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      
      // 保存用户偏好到本地存储
      localStorage.setItem('darkMode', this.isDarkMode);
    },
    
    // 处理头像点击
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
      
      // 如果已登录，连续点击2次头像直接进入后台管理
      if (this.admin) {
        if (this.clickCount >= 2) {
          this.clickCount = 0;
          clearTimeout(this.clickTimer);
          this.$router.push('/admin');
        }
      } 
      // 如果未登录，连续点击5次头像进入登录页面
      else {
        if (this.clickCount === 1) {
          this.showTooltipMessage('连续点击5次头像进入登录页面');
        } else if (this.clickCount >= 5) {
          this.clickCount = 0;
          clearTimeout(this.clickTimer);
          this.$router.push('/login');
        }
      }
    }
  },
  created() {
    // 检查登录状态并获取管理员信息
    this.checkAuth();
    
    // 确保即使未登录也能显示管理员信息
    if (!this.admin) {
      this.getAdminInfo();
    }
    
    // 从本地存储读取夜间模式偏好
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      this.isDarkMode = savedDarkMode === 'true';
      
      // 应用夜间模式
      if (this.isDarkMode) {
        document.body.classList.add('dark-mode');
      }
    }
  },
  template: `
    <div>
      <!-- 导航栏 -->
      <nav class="navbar">
        <div class="navbar-container container">
          <div class="logo">
            <img :src="admin && admin.avatar ? admin.avatar : '/images/avatar.png'" alt="头像" @click="handleAvatarClick">
            <span class="logo-text">{{ admin && admin.name ? admin.name + '的博客' : '我的个人网站' }}</span>
          </div>
          <ul class="nav-links">
            <li><router-link to="/">首页</router-link></li>
            <li>
              <div class="theme-toggle" @click="toggleDarkMode" title="切换夜间模式">
                <i class="fas fa-moon"></i>
                <i class="fas fa-sun"></i>
              </div>
            </li>
          </ul>
        </div>
      </nav>
      
      <!-- 提示框 -->
      <div v-if="showTooltip" class="avatar-tooltip">
        {{ tooltipMessage }}
      </div>
      
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
