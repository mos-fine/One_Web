const db = require('../config/db');
const bcrypt = require('bcrypt');

const Admin = {
  // 通过用户名查找管理员
  findByUsername: (username, callback) => {
    db.query('SELECT * FROM admin WHERE username = ?', [username], callback);
  },
  
  // 通过ID查找管理员
  findById: (id, callback) => {
    db.query('SELECT * FROM admin WHERE id = ?', [id], callback);
  },

  // 创建新管理员
  create: async (adminData, callback) => {
    try {
      // 加密密码
      const salt = await bcrypt.genSalt(10);
      adminData.password = await bcrypt.hash(adminData.password, salt);
      
      db.query('INSERT INTO admin SET ?', adminData, callback);
    } catch (error) {
      callback(error);
    }
  },

  // 更新管理员信息
  update: (id, adminData, callback) => {
    db.query('UPDATE admin SET ? WHERE id = ?', [adminData, id], callback);
  },

  // 验证密码
  validatePassword: async (plainPassword, hashedPassword) => {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      return false;
    }
  },
  
  // 密码加密
  hashPassword: async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(plainPassword, salt);
  },
  
  // 获取第一个管理员账户（用于个人网站）
  getFirst: (callback) => {
    db.query('SELECT * FROM admin ORDER BY id LIMIT 1', callback);
  },
  
  // 检查管理员表是否为空，用于初始化设置
  checkEmpty: (callback) => {
    db.query('SELECT COUNT(*) as count FROM admin', callback);
  }
};

module.exports = Admin;
