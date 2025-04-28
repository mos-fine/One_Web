/**
 * 后台AI设置管理组件
 * 提供友好的界面配置编辑器AI功能
 */
export default {
  template: `
  <div class="ai-settings-container">
    <h2 class="page-title">编辑器AI设置</h2>
    
    <!-- AI状态卡片 -->
    <div class="status-card" :class="aiEnabled ? 'status-enabled' : 'status-disabled'">
      <div class="status-header">
        <h3>AI功能状态</h3>
        <div class="toggle-button">
          <label class="switch">
            <input type="checkbox" v-model="aiEnabled" @change="toggleAiFeature">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
      <div class="status-body">
        <div class="status-info">
          <i :class="aiEnabled ? 'fas fa-check-circle text-success' : 'fas fa-times-circle text-danger'"></i>
          <span>AI功能当前{{ aiEnabled ? '已启用' : '已禁用' }}</span>
        </div>
        <div class="status-description">
          {{ aiEnabled ? 'AI功能已启用，编辑器中可以使用AI辅助写作功能' : '当前AI功能已禁用，编辑器中无法使用AI辅助写作功能' }}
        </div>
      </div>
    </div>
    
    <!-- 主配置区域 -->
    <div class="config-section" :class="{ disabled: !aiEnabled }">
      <!-- AI模型选择 -->
      <div class="form-group">
        <label for="ai-model">选择AI模型：</label>
        <select id="ai-model" v-model="aiConfig.modelType" :disabled="!aiEnabled" @change="updateModelFields">
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="spark">讯飞星火大模型</option>
          <option value="wenxin">百度文心一言</option>
          <option value="custom">自定义AI接口</option>
          <option value="secure">安全模式 (服务端签名)</option>
        </select>
        <div class="field-description">
          {{ getModelDescription(aiConfig.modelType) }}
        </div>
      </div>
      
      <!-- 动态表单字段 -->
      <div class="model-config">
        <h3>模型配置</h3>
        
        <!-- OpenAI配置字段 -->
        <template v-if="aiConfig.modelType === 'openai'">
          <div class="form-group">
            <label for="openai-api-key">API Key：</label>
            <input type="password" id="openai-api-key" v-model="aiConfig.openai.apiKey" :disabled="!aiEnabled" placeholder="sk-..." />
            <div class="field-hint">请输入您的OpenAI API Key</div>
          </div>
          <div class="form-group">
            <label for="openai-model">模型：</label>
            <div class="model-selection-container">
              <select id="openai-model" v-model="aiConfig.openai.model" :disabled="!aiEnabled" @change="handleModelChange">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="custom">自定义模型...</option>
              </select>
              <input 
                type="text" 
                v-if="useCustomModel"
                v-model="customModelName" 
                :disabled="!aiEnabled" 
                placeholder="输入自定义模型名称，如 gpt-4" 
                @input="updateCustomModel"
                class="custom-model-input"
              />
            </div>
            <div class="field-hint">选择或输入要使用的OpenAI模型名称</div>
          </div>
          <div class="form-group">
            <label for="openai-endpoint">自定义端点 (可选)：</label>
            <input type="text" id="openai-endpoint" v-model="aiConfig.openai.endpoint" :disabled="!aiEnabled" placeholder="https://api.openai.com" />
            <div class="field-hint">如果使用第三方API代理，可以设置自定义端点</div>
          </div>
        </template>
        
        <!-- 星火配置字段 -->
        <template v-if="aiConfig.modelType === 'spark'">
          <div class="form-group">
            <label for="spark-app-id">App ID：</label>
            <input type="text" id="spark-app-id" v-model="aiConfig.spark.appId" :disabled="!aiEnabled" />
          </div>
          <div class="form-group">
            <label for="spark-api-key">API Key：</label>
            <input type="password" id="spark-api-key" v-model="aiConfig.spark.apiKey" :disabled="!aiEnabled" />
          </div>
          <div class="form-group">
            <label for="spark-api-secret">API Secret：</label>
            <input type="password" id="spark-api-secret" v-model="aiConfig.spark.apiSecret" :disabled="!aiEnabled" />
          </div>
          <div class="form-group">
            <label for="spark-version">版本：</label>
            <select id="spark-version" v-model="aiConfig.spark.version" :disabled="!aiEnabled">
              <option value="v2.1">Spark V2.0</option>
              <option value="v3.1">Spark Pro</option>
              <option value="v3.5">Spark Max</option>
              <option value="v4.0">Spark4.0 Ultra</option>
            </select>
          </div>
        </template>
        
        <!-- 文心一言配置字段 -->
        <template v-if="aiConfig.modelType === 'wenxin'">
          <div class="form-group">
            <label for="wenxin-access-token">Access Token：</label>
            <input type="password" id="wenxin-access-token" v-model="aiConfig.wenxin.accessToken" :disabled="!aiEnabled" />
          </div>
        </template>
        
        <!-- 自定义AI配置字段 -->
        <template v-if="aiConfig.modelType === 'custom'">
          <div class="form-group">
            <label for="custom-url">API URL：</label>
            <input type="text" id="custom-url" v-model="aiConfig.custom.url" :disabled="!aiEnabled" placeholder="https://your-ai-api.com/generate" />
          </div>
          <div class="form-group">
            <label for="custom-protocol">协议类型：</label>
            <select id="custom-protocol" v-model="aiConfig.custom.protocol" :disabled="!aiEnabled">
              <option value="sse">SSE (Server-Sent Events)</option>
              <option value="websocket">WebSocket</option>
              <option value="http">普通HTTP</option>
            </select>
          </div>
        </template>
        
        <!-- 安全模式配置字段 -->
        <template v-if="aiConfig.modelType === 'secure'">
          <div class="form-group">
            <label for="secure-app-id">应用ID：</label>
            <input type="text" id="secure-app-id" v-model="aiConfig.secure.appId" :disabled="!aiEnabled" />
            <div class="field-hint">将使用此ID通过后端API获取安全的签名URL</div>
          </div>
          <div class="form-group secure-mode-info">
            <i class="fas fa-shield-alt"></i>
            <div>
              <strong>安全模式已启用</strong>
              <p>在此模式下，敏感的API密钥将存储在服务器端，不会暴露在前端代码中。所有AI请求都会经过服务器进行安全签名。</p>
            </div>
          </div>
        </template>
      </div>
      
      <!-- AI功能配置 -->
      <div class="ai-features">
        <h3>AI功能设置</h3>
        
        <!-- 泡泡菜单配置 -->
        <div class="form-group">
          <div class="feature-toggle">
            <label>启用AI泡泡菜单：</label>
            <label class="switch">
              <input type="checkbox" v-model="aiConfig.features.bubblePanelEnable" :disabled="!aiEnabled">
              <span class="slider round"></span>
            </label>
          </div>
          <div class="field-hint">选中文本时显示AI辅助菜单</div>
        </div>
        
        <!-- 工具栏AI菜单选择 -->
        <div class="form-group">
          <label>启用的AI工具栏菜单：</label>
          <div class="checkbox-group" :class="{ disabled: !aiEnabled }">
            <label class="checkbox-item" v-for="menu in availableMenus" :key="menu.id">
              <input type="checkbox" :value="menu.id" v-model="aiConfig.features.enabledMenus" :disabled="!aiEnabled">
              <span>{{ menu.name }}</span>
            </label>
          </div>
        </div>
        
        <!-- Token统计 -->
        <div class="form-group">
          <div class="feature-toggle">
            <label>记录Token使用情况：</label>
            <label class="switch">
              <input type="checkbox" v-model="aiConfig.features.trackTokenUsage" :disabled="!aiEnabled">
              <span class="slider round"></span>
            </label>
          </div>
          <div class="field-hint">统计AI功能使用的token数量，有助于成本控制</div>
        </div>
      </div>
      
      <!-- 使用限制 -->
      <div class="usage-limits">
        <h3>使用限制设置</h3>
        
        <div class="form-group">
          <label for="daily-token-limit">每日Token使用限制：</label>
          <input type="number" id="daily-token-limit" v-model.number="aiConfig.limits.dailyTokenLimit" :disabled="!aiEnabled" min="0" step="1000" />
          <div class="field-hint">设置为0表示不限制</div>
        </div>
        
        <div class="form-group">
          <label for="max-query-length">最大查询长度(字符数)：</label>
          <input type="number" id="max-query-length" v-model.number="aiConfig.limits.maxQueryLength" :disabled="!aiEnabled" min="100" max="100000" step="100" />
        </div>
      </div>
    </div>
    
    <!-- 保存按钮 -->
    <div class="action-buttons">
      <button class="btn btn-secondary" @click="resetForm">重置</button>
      <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
        <i class="fas fa-spinner fa-spin" v-if="saving"></i>
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
      <a href="/test-aieditor.html" target="_blank" class="btn btn-test">
        <i class="fas fa-vial"></i> 测试编辑器
      </a>
    </div>
    
    <!-- AI使用统计 -->
    <div class="usage-stats" v-if="aiEnabled">
      <h3>AI使用统计</h3>
      <div class="stats-loading" v-if="loadingStats">
        <i class="fas fa-spinner fa-spin"></i> 加载统计数据...
      </div>
      <div class="stats-content" v-else>
        <div class="stats-card">
          <div class="stats-card-title">
            <i class="fas fa-calendar-alt"></i> 本月使用
          </div>
          <div class="stats-card-value">{{ formatNumber(usageStats.monthlyTokens) }}</div>
          <div class="stats-card-label">tokens</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-title">
            <i class="fas fa-calendar-day"></i> 今日使用
          </div>
          <div class="stats-card-value">{{ formatNumber(usageStats.dailyTokens) }}</div>
          <div class="stats-card-label">tokens</div>
        </div>
        
        <div class="stats-card">
          <div class="stats-card-title">
            <i class="fas fa-mouse-pointer"></i> 总调用次数
          </div>
          <div class="stats-card-value">{{ formatNumber(usageStats.totalCalls) }}</div>
          <div class="stats-card-label">次</div>
        </div>
      </div>
    </div>
    
    <!-- 测试区域 -->
    <div class="test-area" v-if="aiEnabled">
      <h3>测试AI功能</h3>
      <div class="test-prompt">
        <label for="test-prompt">输入测试提示：</label>
        <textarea id="test-prompt" v-model="testPrompt" placeholder="输入一段文字，测试AI的响应..." rows="3"></textarea>
      </div>
      
      <div class="test-action">
        <button @click="testAiResponse" :disabled="testing || !testPrompt.trim()">
          <i class="fas fa-vial"></i>
          <i class="fas fa-spinner fa-spin" v-if="testing"></i>
          {{ testing ? '测试中...' : '测试AI' }}
        </button>
      </div>
      
      <div class="test-result" v-if="testResult">
        <h4>AI响应结果：</h4>
        <div class="test-response" v-html="formattedTestResult"></div>
      </div>
    </div>
  </div>
  `,
  
  data() {
    return {
      aiEnabled: true,
      saving: false,
      testing: false,
      loadingStats: false,
      useCustomModel: false,
      customModelName: '',
      aiConfig: {
        modelType: 'secure', // 默认使用安全模式
        openai: {
          apiKey: '',
          model: 'gpt-3.5-turbo',
          endpoint: ''
        },
        spark: {
          appId: '',
          apiKey: '',
          apiSecret: '',
          version: 'v3.5'
        },
        wenxin: {
          accessToken: ''
        },
        custom: {
          url: '',
          protocol: 'sse'
        },
        secure: {
          appId: 'default_app_id'
        },
        features: {
          bubblePanelEnable: true,
          enabledMenus: ['ai_continue', 'ai_improve', 'ai_summarize', 'ai_translate'],
          trackTokenUsage: true
        },
        limits: {
          dailyTokenLimit: 100000,
          maxQueryLength: 5000
        }
      },
      availableMenus: [
        { id: 'ai_continue', name: 'AI续写' },
        { id: 'ai_improve', name: 'AI优化' },
        { id: 'ai_summarize', name: 'AI摘要' },
        { id: 'ai_translate', name: 'AI翻译' },
        { id: 'ai_rewrite', name: 'AI重写' },
        { id: 'ai_checkgrammar', name: 'AI语法检查' }
      ],
      usageStats: {
        monthlyTokens: 0,
        dailyTokens: 0,
        totalCalls: 0
      },
      testPrompt: '',
      testResult: ''
    };
  },
  
  computed: {
    formattedTestResult() {
      // 简单格式化测试结果，处理换行符
      if (!this.testResult) return '';
      return this.testResult.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
    }
  },
  
  created() {
    // 加载保存的设置
    this.loadSettings();
  },
  
  methods: {
    loadSettings() {
      // 从服务器加载设置
      axios.get('/api/admin/ai-settings')
        .then(response => {
          if (response.data.success) {
            // 更新设置
            const settings = response.data.settings;
            if (settings) {
              this.aiEnabled = settings.enabled !== false; // 默认为true
              
              // 更新配置，如果有保存的值
              if (settings.modelType) this.aiConfig.modelType = settings.modelType;
              
              // 更新各模型的配置
              if (settings.openai) {
                this.aiConfig.openai = { ...this.aiConfig.openai, ...settings.openai };
                
                // 检查是否使用标准模型还是自定义模型
                const standardModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
                if (settings.openai.model && !standardModels.includes(settings.openai.model)) {
                  this.useCustomModel = true;
                  this.customModelName = settings.openai.model;
                }
              }
              
              if (settings.spark) this.aiConfig.spark = { ...this.aiConfig.spark, ...settings.spark };
              if (settings.wenxin) this.aiConfig.wenxin = { ...this.aiConfig.wenxin, ...settings.wenxin };
              if (settings.custom) this.aiConfig.custom = { ...this.aiConfig.custom, ...settings.custom };
              if (settings.secure) this.aiConfig.secure = { ...this.aiConfig.secure, ...settings.secure };
              
              // 更新功能设置
              if (settings.features) {
                this.aiConfig.features = { ...this.aiConfig.features, ...settings.features };
              }
              
              // 更新限制设置
              if (settings.limits) {
                this.aiConfig.limits = { ...this.aiConfig.limits, ...settings.limits };
              }
            }
            
            // 加载使用统计
            this.loadUsageStats();
          } else {
            console.error('加载AI设置失败:', response.data.message);
          }
        })
        .catch(error => {
          console.error('获取AI设置时出错:', error);
        });
    },
    
    saveSettings() {
      this.saving = true;
      
      // 构建要保存的设置对象
      const settingsToSave = {
        enabled: this.aiEnabled,
        modelType: this.aiConfig.modelType,
        openai: { ...this.aiConfig.openai },
        spark: { ...this.aiConfig.spark },
        wenxin: { ...this.aiConfig.wenxin },
        custom: { ...this.aiConfig.custom },
        secure: { ...this.aiConfig.secure },
        features: { ...this.aiConfig.features },
        limits: { ...this.aiConfig.limits }
      };
      
      // 发送到服务器
      axios.post('/api/admin/ai-settings', settingsToSave)
        .then(async response => {
          if (response.data.success) {
            // 清除AI配置缓存，确保下次获取最新配置
            try {
              const { clearAiConfigCache } = await import('/js/api/aiEditorApi.js');
              clearAiConfigCache();
              console.log('AI配置缓存已清除，将使用最新设置');
            } catch (err) {
              console.error('清除AI配置缓存失败:', err);
            }
            
            this.$emit('success', '已成功保存AI设置');
            // 保存到本地存储，供编辑器使用
            localStorage.setItem('preferred_ai_model', this.aiConfig.modelType);
          } else {
            this.$emit('error', '保存设置失败: ' + response.data.message);
          }
          this.saving = false;
        })
        .catch(error => {
          console.error('保存AI设置时出错:', error);
          this.$emit('error', '保存出错: ' + (error.response?.data?.message || error.message));
          this.saving = false;
        });
    },
    
    loadUsageStats() {
      if (!this.aiEnabled) return;
      
      this.loadingStats = true;
      
      axios.get('/api/admin/ai-usage-stats')
        .then(response => {
          if (response.data.success) {
            this.usageStats = response.data.stats;
          } else {
            console.error('加载AI使用统计失败:', response.data.message);
          }
          this.loadingStats = false;
        })
        .catch(error => {
          console.error('获取AI使用统计时出错:', error);
          this.loadingStats = false;
        });
    },
    
    resetForm() {
      // 重置为原始加载的值
      this.useCustomModel = false; // 重置自定义模型标志
      this.customModelName = ''; // 清空自定义模型名称
      this.loadSettings();
    },
    
    toggleAiFeature() {
      // 当AI启用状态改变时，可以进行一些额外操作
      if (!this.aiEnabled) {
        // 禁用AI时的提示
        this.$emit('info', 'AI功能已禁用，编辑器中将不会显示AI相关功能');
      } else {
        // 启用AI时的提示
        this.$emit('info', 'AI功能已启用，编辑器中可以使用AI辅助写作功能');
        // 加载使用统计
        this.loadUsageStats();
      }
    },
    
    handleModelChange() {
      // 处理模型选择变化
      if (this.aiConfig.openai.model === 'custom') {
        this.useCustomModel = true;
        this.customModelName = ''; // 清空自定义模型名称
      } else {
        this.useCustomModel = false;
      }
    },
    
    updateCustomModel() {
      // 更新自定义模型名称到配置
      if (this.customModelName && this.customModelName.trim()) {
        this.aiConfig.openai.model = this.customModelName.trim();
      }
    },
    
    updateModelFields() {
      // 在模型类型改变时，可能需要进行一些初始化或清理操作
      console.log('已切换AI模型类型为:', this.aiConfig.modelType);
      // 这里可以添加特定的初始化逻辑
      this.useCustomModel = false; // 重置自定义模型标志
    },
    
    getModelDescription(modelType) {
      const descriptions = {
        openai: '使用OpenAI的ChatGPT模型，需要OpenAI账号和API密钥',
        spark: '使用讯飞星火大模型，需要讯飞开放平台账号和相应的密钥',
        wenxin: '使用百度文心一言大模型，需要百度智能云账号和Access Token',
        custom: '使用自定义AI接口，需要提供兼容的API端点',
        secure: '通过服务器安全代理访问AI模型，API密钥存储在服务器端'
      };
      
      return descriptions[modelType] || '请选择AI模型';
    },
    
    testAiResponse() {
      if (!this.testPrompt.trim() || this.testing) return;
      
      this.testing = true;
      this.testResult = '正在测试中，请稍候...\n\n这可能需要5-10秒，取决于API响应速度。';
      
      // 准备模型类型显示名称
      const modelTypeName = {
        'openai': 'OpenAI (ChatGPT)',
        'spark': '讯飞星火大模型',
        'wenxin': '百度文心一言',
        'custom': '自定义API',
        'secure': '安全代理模式'
      }[this.aiConfig.modelType] || this.aiConfig.modelType;
      
      // 发送测试请求
      axios.post('/api/admin/test-ai', {
        modelType: this.aiConfig.modelType,
        prompt: this.testPrompt
      })
        .then(response => {
          if (response.data.success) {
            this.testResult = `测试成功！\n模型类型: ${modelTypeName}\n\n响应结果:\n${response.data.result}`;
          } else {
            this.testResult = `测试失败: ${response.data.message}\n\n请检查以下可能的原因:\n1. API密钥是否正确\n2. 模型名称是否正确\n3. 网络连接是否正常`;
          }
          this.testing = false;
        })
        .catch(error => {
          console.error('测试AI功能时出错:', error);
          
          let errorMessage = error.message || '未知错误';
          let errorDetails = '';
          
          // 添加详细的错误信息
          if (error.response) {
            // 服务器返回了错误状态码
            errorDetails = `服务器状态码: ${error.response.status}\n`;
            
            if (error.response.data) {
              if (error.response.data.message) {
                errorDetails += `错误信息: ${error.response.data.message}\n`;
              }
              if (error.response.data.error) {
                errorDetails += `详细错误: ${error.response.data.error}\n`;
              }
            }
          } else if (error.request) {
            // 请求已发送但没有收到响应
            errorDetails = '服务器没有响应，可能是网络问题或服务器超时。';
          }
          
          this.testResult = `测试AI功能失败\n\n错误: ${errorMessage}\n\n${errorDetails}\n\n请检查:\n1. API密钥是否正确\n2. 模型名称是否正确 (${this.aiConfig.openai?.model || '未设置'})\n3. 网络连接是否正常\n4. 服务器日志以获取更多信息`;
          this.testing = false;
        });
    },
    
    formatNumber(number) {
      if (number === undefined || number === null) return '0';
      return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  }
};
