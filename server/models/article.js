const db = require('../config/db');

const Article = {
  // 获取所有已发布的文章
  getAllPublished: (callback) => {
    db.query(
      'SELECT * FROM articles WHERE published = true ORDER BY created_at DESC',
      callback
    );
  },

  // 获取单篇文章详情
  getById: (id, callback) => {
    db.query('SELECT * FROM articles WHERE id = ?', [id], callback);
  },

  // 创建新文章
  create: (articleData, callback) => {
    db.query('INSERT INTO articles SET ?', articleData, callback);
  },

  // 更新文章
  update: (id, articleData, callback) => {
    db.query('UPDATE articles SET ? WHERE id = ?', [articleData, id], callback);
  },

  // 删除文章
  delete: (id, callback) => {
    db.query('DELETE FROM articles WHERE id = ?', [id], callback);
  },

  // 获取所有文章(包括未发布的)，仅供管理员使用
  getAll: (callback) => {
    db.query('SELECT * FROM articles ORDER BY created_at DESC', callback);
  },
  
  // 按分类获取文章
  getByCategory: (category, callback) => {
    db.query(
      'SELECT * FROM articles WHERE category = ? AND published = true ORDER BY created_at DESC',
      [category],
      callback
    );
  },
  
  // 搜索文章
  search: (keyword, callback) => {
    const searchTerm = `%${keyword}%`;
    db.query(
      'SELECT * FROM articles WHERE (title LIKE ? OR content LIKE ?) AND published = true',
      [searchTerm, searchTerm],
      callback
    );
  }
};

module.exports = Article;
