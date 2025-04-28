const db = require('../config/db');

const SocialMedia = {
  // 获取所有配置的社交媒体平台
  getAll: (callback) => {
    db.query('SELECT * FROM social_media', callback);
  },

  // 获取单个平台配置
  getById: (id, callback) => {
    db.query('SELECT * FROM social_media WHERE id = ?', [id], callback);
  },

  // 获取单个平台配置（按名称）
  getByPlatform: (platform, callback) => {
    db.query('SELECT * FROM social_media WHERE platform = ?', [platform], callback);
  },

  // 添加新的社交媒体平台配置
  add: (platformData, callback) => {
    db.query('INSERT INTO social_media SET ?', platformData, callback);
  },

  // 更新社交媒体平台配置
  update: (id, platformData, callback) => {
    db.query('UPDATE social_media SET ? WHERE id = ?', [platformData, id], callback);
  },

  // 删除社交媒体平台配置
  delete: (id, callback) => {
    db.query('DELETE FROM social_media WHERE id = ?', [id], callback);
  },

  // 启用/禁用平台
  toggleActive: (id, status, callback) => {
    db.query('UPDATE social_media SET active = ? WHERE id = ?', [status, id], callback);
  }
};

module.exports = SocialMedia;
