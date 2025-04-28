export default {
  data() {
    return {
      admin: null
    };
  },
  methods: {
    logout() {
      if (confirm('确定要退出登录吗？')) {
        axios.post('/api/auth/logout')
          .then(() => {
            this.$root.admin = null;
            this.$router.push('/');
          })
          .catch(error => {
            console.error('退出登录错误:', error);
            alert('退出登录失败，请稍后重试');
          });
      }
    }
  },
  created() {
    this.admin = this.$root.admin;
    
    // 如果没有admin数据，重新获取
    if (!this.admin) {
      axios.get('/api/auth/check')
        .then(response => {
          if (response.data.success) {
            this.admin = response.data.admin;
            this.$root.admin = response.data.admin;
          } else {
            // 未登录，重定向到登录页
            this.$router.push('/login');
          }
        })
        .catch(() => {
          this.$router.push('/login');
        });
    }
  },
  template: `
    <div class="admin-container">
      <!-- 侧边栏导航 -->
      <div class="admin-sidebar">
        <div class="admin-sidebar-header">
          <img :src="admin && admin.avatar ? admin.avatar : '/images/avatar.png'" alt="管理员头像">
          <div>
            <h3>{{ admin ? admin.name || admin.username : '管理员' }}</h3>
            <small>后台管理</small>
          </div>
        </div>
        
        <ul class="admin-menu">
          <li class="admin-menu-item">
            <router-link to="/admin/articles" class="admin-menu-link">
              <i class="fas fa-file-alt admin-menu-icon"></i> 文章管理
            </router-link>
          </li>
          <li class="admin-menu-item">
            <router-link to="/admin/articles/create" class="admin-menu-link">
              <i class="fas fa-plus admin-menu-icon"></i> 写文章
            </router-link>
          </li>
          <li class="admin-menu-item">
            <router-link to="/admin/social" class="admin-menu-link">
              <i class="fas fa-share-alt admin-menu-icon"></i> 社交媒体
            </router-link>
          </li>
          <li class="admin-menu-item">
            <router-link to="/admin/profile" class="admin-menu-link">
              <i class="fas fa-user-circle admin-menu-icon"></i> 个人资料
            </router-link>
          </li>
          <li class="admin-menu-item">
            <router-link to="/admin/ai-settings" class="admin-menu-link">
              <i class="fas fa-robot admin-menu-icon"></i> AI设置
            </router-link>
          </li>
          <li class="admin-menu-item">
            <a href="#" class="admin-menu-link" @click.prevent="logout">
              <i class="fas fa-sign-out-alt admin-menu-icon"></i> 退出登录
            </a>
          </li>
        </ul>
      </div>
      
      <!-- 主内容区 -->
      <div class="admin-content">
        <router-view></router-view>
      </div>
    </div>
  `
};
