export default {
  data() {
    return {
      admin: null,
      loading: false,
      saving: false,
      message: null,
      messageType: 'success',
      editMode: false,
      profileForm: {
        name: '',
        email: '',
        phone: '',
        bio: '',
        avatar: null
      },
      avatarFile: null,
      avatarPreview: null,
      
      // 密码修改表单
      showPasswordModal: false,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordError: null
    };
  },
  methods: {
    fetchAdminProfile() {
      this.loading = true;
      
      axios.get('/api/admin/profile')
        .then(response => {
          if (response.data.success) {
            this.admin = response.data.admin;
            this.initProfileForm();
          } else {
            this.showError('获取个人资料失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('获取个人资料出错:', error);
          this.showError('获取个人资料失败: ' + (error.response?.data?.message || error.message));
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    initProfileForm() {
      if (this.admin) {
        this.profileForm.name = this.admin.name || '';
        this.profileForm.email = this.admin.email || '';
        this.profileForm.phone = this.admin.phone || '';
        this.profileForm.bio = this.admin.bio || '';
        this.avatarPreview = this.admin.avatar || '/images/avatar.png';
      }
    },
    
    handleAvatarChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        this.showError('请选择有效的图片文件');
        return;
      }
      
      // 检查文件大小
      if (file.size > 5 * 1024 * 1024) {
        this.showError('图片大小不能超过 5MB');
        return;
      }
      
      this.avatarFile = file;
      
      // 预览图片
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    removeAvatar() {
      this.avatarFile = null;
      this.avatarPreview = this.admin ? (this.admin.avatar || '/images/avatar.png') : '/images/avatar.png';
      
      // 重置文件输入框
      const fileInput = this.$refs.avatarInput;
      if (fileInput) {
        fileInput.value = '';
      }
    },
    
    toggleEditMode() {
      if (this.editMode) {
        // 取消编辑，恢复原始数据
        this.initProfileForm();
      }
      
      this.editMode = !this.editMode;
    },
    
    saveProfile() {
      if (!this.profileForm.name) {
        this.showError('请输入姓名');
        return;
      }
      
      this.saving = true;
      
      // 准备表单数据
      const formData = new FormData();
      formData.append('name', this.profileForm.name);
      formData.append('email', this.profileForm.email || '');
      formData.append('phone', this.profileForm.phone || '');
      formData.append('bio', this.profileForm.bio || '');
      
      // 如果有新上传的头像，添加到表单
      if (this.avatarFile) {
        formData.append('avatar', this.avatarFile);
      }
      
      axios.put('/api/admin/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
        .then(response => {
          if (response.data.success) {
            this.admin = response.data.admin;
            this.showMessage('个人资料更新成功！');
            this.editMode = false;
            
            // 更新全局状态和父组件
            this.$root.admin = this.admin; // 更新全局状态
            
            // 强制刷新以确保所有组件使用更新后的头像
            if (this.$parent && this.$parent.admin) {
              this.$parent.admin = this.admin;
            }
          } else {
            this.showError('保存失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('保存个人资料出错:', error);
          this.showError('保存个人资料失败: ' + (error.response?.data?.message || error.message));
        })
        .finally(() => {
          this.saving = false;
        });
    },
    
    openPasswordModal() {
      this.passwordForm.currentPassword = '';
      this.passwordForm.newPassword = '';
      this.passwordForm.confirmPassword = '';
      this.passwordError = null;
      this.showPasswordModal = true;
    },
    
    closePasswordModal() {
      this.showPasswordModal = false;
    },
    
    changePassword() {
      // 验证表单
      if (!this.passwordForm.currentPassword) {
        this.passwordError = '请输入当前密码';
        return;
      }
      
      if (!this.passwordForm.newPassword) {
        this.passwordError = '请输入新密码';
        return;
      }
      
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.passwordError = '两次输入的新密码不一致';
        return;
      }
      
      if (this.passwordForm.newPassword.length < 6) {
        this.passwordError = '新密码长度不能少于6个字符';
        return;
      }
      
      this.saving = true;
      this.passwordError = null;
      
      axios.put('/api/admin/change-password', {
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword
      })
        .then(response => {
          if (response.data.success) {
            this.showMessage('密码修改成功！');
            this.closePasswordModal();
          } else {
            this.passwordError = response.data.message;
          }
        })
        .catch(error => {
          console.error('修改密码出错:', error);
          this.passwordError = error.response?.data?.message || '修改密码失败';
        })
        .finally(() => {
          this.saving = false;
        });
    },
    
    showMessage(message) {
      this.message = message;
      this.messageType = 'success';
      
      setTimeout(() => {
        this.message = null;
      }, 3000);
    },
    
    showError(message) {
      this.message = message;
      this.messageType = 'error';
      
      setTimeout(() => {
        this.message = null;
      }, 3000);
    }
  },
  
  created() {
    this.fetchAdminProfile();
  },
  
  template: `
    <div class="admin-page user-profile">
      <div class="admin-header">
        <h1 class="admin-title">个人资料</h1>
        <div class="admin-actions">
          <button @click="toggleEditMode" class="btn" :class="editMode ? 'btn-outline' : ''">
            <i class="fas" :class="editMode ? 'fa-times' : 'fa-edit'"></i>
            {{ editMode ? '取消编辑' : '编辑资料' }}
          </button>
        </div>
      </div>
      
      <div v-if="message" :class="['message', messageType === 'success' ? 'success-message' : 'error-message']">
        {{ message }}
      </div>
      
      <div v-if="loading" class="loading">
        <p>加载个人资料中...</p>
      </div>
      
      <div v-else-if="admin" class="profile-container">
        <div class="profile-section">
          <div class="profile-avatar">
            <img :src="editMode ? avatarPreview : (admin.avatar || '/images/avatar.png')" alt="管理员头像">
            <div v-if="editMode" class="avatar-actions">
              <label for="avatar-upload" class="btn btn-small">
                <i class="fas fa-upload"></i> 上传头像
              </label>
              <input 
                id="avatar-upload" 
                ref="avatarInput"
                type="file" 
                @change="handleAvatarChange" 
                accept="image/*" 
                style="display: none;"
              >
              <button @click="removeAvatar" class="btn btn-small">
                <i class="fas fa-undo"></i> 恢复默认
              </button>
            </div>
          </div>
          
          <div class="profile-info">
            <!-- 编辑模式 -->
            <div v-if="editMode" class="profile-edit-form">
              <div class="form-group">
                <label for="name" class="form-label">姓名</label>
                <input 
                  type="text" 
                  id="name" 
                  v-model="profileForm.name" 
                  class="form-input" 
                  placeholder="您的姓名"
                >
              </div>
              
              <div class="form-group">
                <label for="email" class="form-label">电子邮箱</label>
                <input 
                  type="email" 
                  id="email" 
                  v-model="profileForm.email" 
                  class="form-input" 
                  placeholder="您的电子邮箱"
                >
              </div>
              
              <div class="form-group">
                <label for="phone" class="form-label">联系电话</label>
                <input 
                  type="text" 
                  id="phone" 
                  v-model="profileForm.phone" 
                  class="form-input" 
                  placeholder="您的联系电话"
                >
              </div>
              
              <div class="form-group">
                <label for="bio" class="form-label">个人简介</label>
                <textarea 
                  id="bio" 
                  v-model="profileForm.bio" 
                  class="form-textarea" 
                  rows="4" 
                  placeholder="简短的个人介绍"
                ></textarea>
              </div>
              
              <div class="form-actions">
                <button @click="saveProfile" class="btn" :disabled="saving">
                  {{ saving ? '保存中...' : '保存资料' }}
                </button>
                <button @click="toggleEditMode" class="btn btn-outline" :disabled="saving">
                  取消
                </button>
              </div>
            </div>
            
            <!-- 查看模式 -->
            <div v-else class="profile-view">
              <h2 class="profile-name">{{ admin.name || admin.username }}</h2>
              <div class="profile-username">用户名: {{ admin.username }}</div>
              
              <div v-if="admin.email" class="profile-detail">
                <i class="fas fa-envelope"></i> {{ admin.email }}
              </div>
              
              <div v-if="admin.phone" class="profile-detail">
                <i class="fas fa-phone"></i> {{ admin.phone }}
              </div>
              
              <div v-if="admin.bio" class="profile-bio">
                {{ admin.bio }}
              </div>
              
              <div v-else class="profile-bio-empty">
                <em>未设置个人简介</em>
              </div>
              
              <div class="profile-actions">
                <button @click="toggleEditMode" class="btn">
                  <i class="fas fa-edit"></i> 编辑资料
                </button>
                <button @click="openPasswordModal" class="btn btn-outline">
                  <i class="fas fa-key"></i> 修改密码
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 密码修改弹窗 -->
      <div v-if="showPasswordModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">修改密码</h3>
            <button @click="closePasswordModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="passwordError" class="error-message">
              {{ passwordError }}
            </div>
            
            <div class="form-group">
              <label for="current-password" class="form-label">当前密码</label>
              <input 
                type="password" 
                id="current-password" 
                v-model="passwordForm.currentPassword" 
                class="form-input" 
                placeholder="请输入当前密码"
              >
            </div>
            
            <div class="form-group">
              <label for="new-password" class="form-label">新密码</label>
              <input 
                type="password" 
                id="new-password" 
                v-model="passwordForm.newPassword" 
                class="form-input" 
                placeholder="请输入新密码"
              >
              <small>密码长度至少6个字符</small>
            </div>
            
            <div class="form-group">
              <label for="confirm-password" class="form-label">确认新密码</label>
              <input 
                type="password" 
                id="confirm-password" 
                v-model="passwordForm.confirmPassword" 
                class="form-input" 
                placeholder="请再次输入新密码"
              >
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closePasswordModal" class="btn btn-outline" :disabled="saving">取消</button>
            <button @click="changePassword" class="btn" :disabled="saving">
              {{ saving ? '保存中...' : '修改密码' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};
