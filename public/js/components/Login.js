export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: null,
      isInitializing: false
    };
  },
  methods: {
    login() {
      if (!this.username || !this.password) {
        this.error = '请输入用户名和密码';
        return;
      }
      
      this.loading = true;
      this.error = null;
      
      axios.post('/api/auth/login', {
        username: this.username,
        password: this.password
      })
        .then(response => {
          if (response.data.success) {
            // 登录成功，跳转到后台
            this.$root.admin = response.data.admin;
            this.$router.push('/admin');
          } else {
            this.error = '登录失败: ' + response.data.message;
          }
        })
        .catch(error => {
          console.error('登录错误:', error);
          this.error = error.response?.data?.message || '登录时发生错误';
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    initializeAdmin() {
      if (confirm('确定要初始化管理员账户吗？这将创建一个新的管理员账户。')) {
        this.isInitializing = true;
        
        axios.post('/api/auth/init')
          .then(response => {
            if (response.data.success) {
              alert(`管理员账户创建成功!\n用户名: ${response.data.username}\n密码: ${response.data.password}\n请登录后立即修改默认密码。`);
              this.username = response.data.username;
              this.password = '';
            } else {
              alert('初始化失败: ' + response.data.message);
            }
          })
          .catch(error => {
            console.error('初始化错误:', error);
            alert('初始化失败: ' + (error.response?.data?.message || '未知错误'));
          })
          .finally(() => {
            this.isInitializing = false;
          });
      }
    }
  },
  template: `
    <div class="login-container">
      <h2 class="login-title">后台管理登录</h2>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <form @submit.prevent="login" class="login-form">
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            class="form-input" 
            placeholder="请输入用户名"
            :disabled="loading || isInitializing"
            autocomplete="username"
          >
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            class="form-input" 
            placeholder="请输入密码"
            :disabled="loading || isInitializing"
            autocomplete="current-password"
          >
        </div>
        
        <button 
          type="submit" 
          class="form-btn" 
          :disabled="loading || isInitializing"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="login-footer">
        <button 
          @click="initializeAdmin" 
          class="btn btn-outline" 
          style="margin-top: 20px; font-size: 0.9rem;"
          :disabled="loading || isInitializing"
        >
          {{ isInitializing ? '初始化中...' : '初始化管理员账户' }}
        </button>
      </div>
    </div>
  `
};
