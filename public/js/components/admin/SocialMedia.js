export default {
  data() {
    return {
      platforms: [],
      loading: true,
      error: null,
      showAddModal: false,
      showEditModal: false,
      newPlatform: {
        platform: '',
        username: '',
        token: ''
      },
      editingPlatform: null
    };
  },
  methods: {
    fetchPlatforms() {
      this.loading = true;
      axios.get('/api/social/platforms')
        .then(response => {
          if (response.data.success) {
            this.platforms = response.data.platforms;
          } else {
            this.error = '获取平台列表失败: ' + response.data.message;
          }
        })
        .catch(error => {
          console.error('获取社交媒体平台出错:', error);
          this.error = '获取社交媒体平台时发生错误: ' + (error.response?.data?.message || error.message);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    
    openAddModal() {
      this.newPlatform = {
        platform: '',
        username: '',
        token: ''
      };
      this.showAddModal = true;
    },
    
    closeAddModal() {
      this.showAddModal = false;
    },
    
    openEditModal(platform) {
      this.editingPlatform = {
        id: platform.id,
        platform: platform.platform,
        username: platform.username,
        token: '',  // 不回显token
        active: platform.active
      };
      this.showEditModal = true;
    },
    
    closeEditModal() {
      this.showEditModal = false;
      this.editingPlatform = null;
    },
    
    addPlatform() {
      if (!this.newPlatform.platform) {
        alert('请输入平台名称');
        return;
      }
      
      axios.post('/api/social/platforms', this.newPlatform)
        .then(response => {
          if (response.data.success) {
            alert('平台添加成功');
            this.closeAddModal();
            this.fetchPlatforms();
          } else {
            alert('添加平台失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('添加平台出错:', error);
          alert('添加平台时发生错误: ' + (error.response?.data?.message || error.message));
        });
    },
    
    updatePlatform() {
      if (!this.editingPlatform) return;
      
      axios.put(`/api/social/platforms/${this.editingPlatform.id}`, this.editingPlatform)
        .then(response => {
          if (response.data.success) {
            alert('平台更新成功');
            this.closeEditModal();
            this.fetchPlatforms();
          } else {
            alert('更新平台失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('更新平台出错:', error);
          alert('更新平台时发生错误: ' + (error.response?.data?.message || error.message));
        });
    },
    
    togglePlatformStatus(platform) {
      const newStatus = !platform.active;
      
      axios.patch(`/api/social/platforms/${platform.id}/toggle`, { active: newStatus })
        .then(response => {
          if (response.data.success) {
            platform.active = newStatus;
            alert(`平台已${newStatus ? '启用' : '禁用'}`);
          } else {
            alert('操作失败: ' + response.data.message);
          }
        })
        .catch(error => {
          console.error('切换平台状态出错:', error);
          alert('切换平台状态时发生错误: ' + (error.response?.data?.message || error.message));
        });
    },
    
    deletePlatform(platformId) {
      if (confirm('确定要删除此社交媒体平台吗？这将移除所有相关配置。')) {
        axios.delete(`/api/social/platforms/${platformId}`)
          .then(response => {
            if (response.data.success) {
              alert('平台删除成功');
              this.fetchPlatforms();
            } else {
              alert('删除平台失败: ' + response.data.message);
            }
          })
          .catch(error => {
            console.error('删除平台出错:', error);
            alert('删除平台时发生错误: ' + (error.response?.data?.message || error.message));
          });
      }
    }
  },
  created() {
    this.fetchPlatforms();
  },
  template: `
    <div>
      <div class="admin-header">
        <h1 class="admin-title">社交媒体管理</h1>
        <button @click="openAddModal" class="btn">
          <i class="fas fa-plus"></i> 添加平台
        </button>
      </div>
      
      <div v-if="loading" class="loading">
        <p>加载平台列表中...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
        <button @click="fetchPlatforms" class="btn">重试</button>
      </div>
      
      <div v-else-if="platforms.length === 0" class="empty-state">
        <h3>暂无社交媒体平台</h3>
        <p>添加平台后，您可以将文章一键分享到各个社交媒体</p>
        <button @click="openAddModal" class="btn">
          <i class="fas fa-plus"></i> 添加平台
        </button>
      </div>
      
      <div v-else class="admin-platform-list">
        <div class="admin-platform-card" v-for="platform in platforms" :key="platform.id">
          <div class="platform-header">
            <h3>{{ platform.platform }}</h3>
            <div class="platform-status" :class="platform.active ? 'status-active' : 'status-inactive'">
              {{ platform.active ? '已启用' : '已禁用' }}
            </div>
          </div>
          
          <div class="platform-content">
            <p><strong>用户名:</strong> {{ platform.username || '未设置' }}</p>
            <p><strong>Token状态:</strong> {{ platform.hasToken ? '已配置' : '未配置' }}</p>
          </div>
          
          <div class="platform-actions">
            <button @click="openEditModal(platform)" class="btn admin-action-edit">
              <i class="fas fa-edit"></i> 编辑
            </button>
            <button @click="togglePlatformStatus(platform)" class="btn" :class="platform.active ? 'admin-action-disable' : 'admin-action-enable'">
              <i :class="platform.active ? 'fas fa-toggle-off' : 'fas fa-toggle-on'"></i>
              {{ platform.active ? '禁用' : '启用' }}
            </button>
            <button @click="deletePlatform(platform.id)" class="btn admin-action-delete">
              <i class="fas fa-trash"></i> 删除
            </button>
          </div>
        </div>
      </div>
      
      <!-- 添加平台弹窗 -->
      <div v-if="showAddModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">添加社交媒体平台</h3>
            <button @click="closeAddModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="platform-name" class="form-label">平台名称</label>
              <input 
                type="text" 
                id="platform-name" 
                v-model="newPlatform.platform" 
                class="form-input" 
                placeholder="如：微博、微信公众号"
              >
            </div>
            
            <div class="form-group">
              <label for="platform-username" class="form-label">用户名/账号</label>
              <input 
                type="text" 
                id="platform-username" 
                v-model="newPlatform.username" 
                class="form-input" 
                placeholder="平台账号"
              >
            </div>
            
            <div class="form-group">
              <label for="platform-token" class="form-label">访问令牌/Token</label>
              <input 
                type="password" 
                id="platform-token" 
                v-model="newPlatform.token" 
                class="form-input" 
                placeholder="API访问令牌"
              >
              <small>用于自动分享内容的API访问令牌</small>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeAddModal" class="btn btn-outline">取消</button>
            <button @click="addPlatform" class="btn">添加</button>
          </div>
        </div>
      </div>
      
      <!-- 编辑平台弹窗 -->
      <div v-if="showEditModal && editingPlatform" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">编辑社交媒体平台</h3>
            <button @click="closeEditModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="edit-platform-name" class="form-label">平台名称</label>
              <input 
                type="text" 
                id="edit-platform-name" 
                v-model="editingPlatform.platform" 
                class="form-input" 
                placeholder="如：微博、微信公众号"
              >
            </div>
            
            <div class="form-group">
              <label for="edit-platform-username" class="form-label">用户名/账号</label>
              <input 
                type="text" 
                id="edit-platform-username" 
                v-model="editingPlatform.username" 
                class="form-input" 
                placeholder="平台账号"
              >
            </div>
            
            <div class="form-group">
              <label for="edit-platform-token" class="form-label">访问令牌/Token</label>
              <input 
                type="password" 
                id="edit-platform-token" 
                v-model="editingPlatform.token" 
                class="form-input" 
                placeholder="留空表示不修改现有Token"
              >
              <small>留空将保留之前的Token不变</small>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeEditModal" class="btn btn-outline">取消</button>
            <button @click="updatePlatform" class="btn">保存</button>
          </div>
        </div>
      </div>
    </div>
  `
};
