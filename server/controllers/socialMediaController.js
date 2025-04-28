const SocialMedia = require('../models/socialMedia');
const axios = require('axios');

const socialMediaController = {
  // 获取所有配置的社交媒体平台
  getAllPlatforms: (req, res) => {
    // 检查用户是否已登录管理员账户
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    SocialMedia.getAll((err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取社交媒体平台失败', error: err });
      }
      
      // 处理结果，隐藏敏感信息
      const platforms = results.map(platform => {
        const { token, ...safeData } = platform;
        return {
          ...safeData,
          hasToken: !!token
        };
      });
      
      res.json({ success: true, platforms });
    });
  },

  // 添加新的社交媒体平台配置
  addPlatform: (req, res) => {
    // 检查用户是否已登录管理员账户
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const { platform, username, token } = req.body;
    
    if (!platform) {
      return res.status(400).json({ success: false, message: '平台名称是必须的' });
    }
    
    // 检查平台是否已存在
    SocialMedia.getByPlatform(platform, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '添加平台失败', error: err });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ success: false, message: '此平台已配置' });
      }
      
      const platformData = {
        platform,
        username: username || '',
        token: token || '',
        active: true
      };
      
      SocialMedia.add(platformData, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: '添加平台失败', error: err });
        }
        
        res.status(201).json({ 
          success: true, 
          message: '平台添加成功',
          platformId: result.insertId
        });
      });
    });
  },

  // 更新社交媒体平台配置
  updatePlatform: (req, res) => {
    // 检查用户是否已登录管理员账户
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const id = req.params.id;
    const { platform, username, token, active } = req.body;
    
    // 准备更新数据
    const updateData = {};
    if (platform !== undefined) updateData.platform = platform;
    if (username !== undefined) updateData.username = username;
    if (token !== undefined) updateData.token = token;
    if (active !== undefined) updateData.active = active;
    
    SocialMedia.update(id, updateData, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: '更新平台失败', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '平台不存在' });
      }
      
      res.json({ success: true, message: '平台更新成功' });
    });
  },

  // 删除社交媒体平台配置
  deletePlatform: (req, res) => {
    // 检查用户是否已登录管理员账户
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const id = req.params.id;
    
    SocialMedia.delete(id, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: '删除平台失败', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '平台不存在' });
      }
      
      res.json({ success: true, message: '平台删除成功' });
    });
  },

  // 启用/禁用平台
  togglePlatform: (req, res) => {
    // 检查用户是否已登录管理员账户
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const id = req.params.id;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ success: false, message: '请提供状态参数' });
    }
    
    SocialMedia.toggleActive(id, active, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: '更新平台状态失败', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '平台不存在' });
      }
      
      res.json({ 
        success: true, 
        message: active ? '平台已启用' : '平台已禁用'
      });
    });
  },

  // 分享文章到社交媒体
  shareArticle: async (req, res) => {
    // 检查用户是否已登录管理员账户
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const { articleId, platforms } = req.body;
    
    if (!articleId || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    // 获取文章详情
    const getArticle = new Promise((resolve, reject) => {
      const db = require('../config/db'); // 直接使用数据库连接
      db.query('SELECT * FROM articles WHERE id = ?', [articleId], (err, results) => {
        if (err) reject(err);
        else if (results.length === 0) reject(new Error('文章不存在'));
        else resolve(results[0]);
      });
    });
    
    try {
      const article = await getArticle;
      
      // 存储各平台分享结果
      const results = [];
      
      // 依次处理各平台
      for (const platformId of platforms) {
        try {
          // 获取平台配置
          const getPlatform = new Promise((resolve, reject) => {
            SocialMedia.getById(platformId, (err, results) => {
              if (err) reject(err);
              else if (results.length === 0) reject(new Error(`ID为${platformId}的平台不存在`));
              else resolve(results[0]);
            });
          });
          
          const platform = await getPlatform;
          
          // 判断平台是否启用
          if (!platform.active) {
            results.push({
              platform: platform.platform,
              success: false,
              message: '此平台已禁用'
            });
            continue;
          }
          
          // 根据不同平台执行分享逻辑
          let shareResult = false;
          let message = '';
          
          switch (platform.platform.toLowerCase()) {
            case 'weibo':
              // 示例：调用微博API
              try {
                // 这里是模拟，实际应用中需要使用真实的微博API
                // const response = await axios.post('https://api.weibo.com/2/statuses/share.json', {
                //   access_token: platform.token,
                //   status: `${article.title}\n${article.content.substring(0, 100)}...`,
                //   pic: article.cover_image ? `${req.protocol}://${req.get('host')}${article.cover_image}` : ''
                // });
                
                // 模拟成功响应
                shareResult = true;
                message = '文章已成功分享到微博';
              } catch (error) {
                message = '分享到微博失败: ' + (error.response?.data?.error || error.message);
              }
              break;
              
            case 'wechat':
              // 示例：调用微信公众号API
              try {
                // 这里是模拟，实际应用中需要使用真实的微信公众号API
                // const response = await axios.post('https://api.weixin.qq.com/cgi-bin/message/custom/send', {
                //   access_token: platform.token,
                //   touser: 'your_followers',
                //   msgtype: 'news',
                //   news: {
                //     articles: [{
                //       title: article.title,
                //       description: article.content.substring(0, 120),
                //       url: `${req.protocol}://${req.get('host')}/articles/${article.id}`,
                //       picurl: article.cover_image ? `${req.protocol}://${req.get('host')}${article.cover_image}` : ''
                //     }]
                //   }
                // });
                
                // 模拟成功响应
                shareResult = true;
                message = '文章已成功分享到微信公众号';
              } catch (error) {
                message = '分享到微信公众号失败: ' + (error.response?.data?.errcode || error.message);
              }
              break;
              
            // 可以添加更多平台的处理逻辑
            default:
              message = `不支持分享到平台: ${platform.platform}`;
          }
          
          results.push({
            platform: platform.platform,
            success: shareResult,
            message
          });
          
        } catch (error) {
          results.push({
            platformId,
            success: false,
            message: error.message
          });
        }
      }
      
      res.json({
        success: true,
        results
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '分享文章失败',
        error: error.message
      });
    }
  }
};

module.exports = socialMediaController;
