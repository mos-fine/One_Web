const Article = require('../models/article');
const path = require('path');
const fs = require('fs');

const articleController = {
  // 获取所有已发布文章
  getPublishedArticles: (req, res) => {
    Article.getAllPublished((err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取文章失败', error: err });
      }
      res.json({ success: true, articles: results });
    });
  },

  // 获取所有文章(已发布和未发布)，仅管理员可用
  getAllArticles: (req, res) => {
    // 检查用户是否已登录
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    Article.getAll((err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取文章失败', error: err });
      }
      res.json({ success: true, articles: results });
    });
  },

  // 获取单篇文章
  getArticle: (req, res) => {
    const id = req.params.id;
    
    Article.getById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取文章失败', error: err });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }
      
      const article = results[0];
      // 未发布文章仅管理员可见
      if (!article.published && !req.session.admin) {
        return res.status(403).json({ success: false, message: '没有权限查看此文章' });
      }
      
      res.json({ success: true, article });
    });
  },

  // 创建文章
  createArticle: (req, res) => {
    // 检查用户是否已登录
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    // 获取表单数据
    const { title, content, category, tags, published } = req.body;
    
    // 检查必填字段
    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容为必填项' });
    }
    
    // 准备文章数据
    const articleData = {
      title,
      content: content, // 富文本HTML内容直接存储
      category: category || '未分类',
      tags: tags || '',
      published: published === true
    };
    
    // 如果有上传的封面图片
    if (req.file) {
      articleData.cover_image = `/uploads/${req.file.filename}`;
    }
    
    // 保存文章
    Article.create(articleData, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: '创建文章失败', error: err });
      }
      
      // 获取新创建的文章ID
      const newArticleId = result.insertId;
      
      res.status(201).json({ 
        success: true, 
        message: '文章创建成功', 
        articleId: newArticleId 
      });
    });
  },

  // 更新文章
  updateArticle: (req, res) => {
    // 检查用户是否已登录
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const id = req.params.id;
    const { title, content, category, tags, published } = req.body;
    
    // 检查必填字段
    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容为必填项' });
    }
    
    // 准备更新数据
    const updateData = {
      title,
      content,
      category: category || '未分类',
      tags: tags || '',
      published: published === true
    };
    
    // 如果有新上传的封面图片
    if (req.file) {
      // 先查询获取旧图片
      Article.getById(id, (err, results) => {
        if (err || results.length === 0) {
          // 如果出错或文章不存在，只更新文章，不处理旧图片
          updateData.cover_image = `/uploads/${req.file.filename}`;
          
          Article.update(id, updateData, (err, result) => {
            if (err) {
              return res.status(500).json({ success: false, message: '更新文章失败', error: err });
            }
            res.json({ success: true, message: '文章更新成功' });
          });
          return;
        }
        
        const oldArticle = results[0];
        
        // 如果存在旧图片，则删除
        if (oldArticle.cover_image) {
          const oldImagePath = path.join(__dirname, '../../public', oldArticle.cover_image);
          
          try {
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          } catch (error) {
            console.error('删除旧图片失败:', error);
          }
        }
        
        // 设置新图片路径
        updateData.cover_image = `/uploads/${req.file.filename}`;
        
        Article.update(id, updateData, (err, result) => {
          if (err) {
            return res.status(500).json({ success: false, message: '更新文章失败', error: err });
          }
          res.json({ success: true, message: '文章更新成功' });
        });
      });
    } else {
      // 没有新图片，直接更新文章
      Article.update(id, updateData, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: '更新文章失败', error: err });
        }
        res.json({ success: true, message: '文章更新成功' });
      });
    }
  },

  // 删除文章
  deleteArticle: (req, res) => {
    // 检查用户是否已登录
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const id = req.params.id;
    
    // 先查询获取文章信息
    Article.getById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '删除文章失败', error: err });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }
      
      const article = results[0];
      
      // 删除关联的封面图片
      if (article.cover_image) {
        const imagePath = path.join(__dirname, '../../public', article.cover_image);
        
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (error) {
          console.error('删除文章图片失败:', error);
        }
      }
      
      // 删除文章记录
      Article.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: '删除文章失败', error: err });
        }
        res.json({ success: true, message: '文章删除成功' });
      });
    });
  },

  // 按分类获取文章
  getArticlesByCategory: (req, res) => {
    const category = req.params.category;
    
    Article.getByCategory(category, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取文章失败', error: err });
      }
      
      res.json({ success: true, articles: results });
    });
  },

  // 搜索文章
  searchArticles: (req, res) => {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ success: false, message: '请提供搜索关键词' });
    }
    
    Article.search(keyword, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '搜索文章失败', error: err });
      }
      
      res.json({ success: true, articles: results });
    });
  },

  // 处理文章自动保存
  autoSaveArticle: (req, res) => {
    // 检查用户是否已登录
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const id = req.params.id;
    const content = req.body.content;

    if (!content) {
      return res.status(400).json({ success: false, message: '未提供内容' });
    }

    // 只更新内容字段，不改变其他字段
    Article.updateContent(id, content, (err, result) => {
      if (err) {
        console.error('自动保存失败:', err);
        return res.status(500).json({ success: false, message: '自动保存失败', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '文章不存在' });
      }
      
      res.json({ 
        success: true, 
        message: '内容已自动保存', 
        timestamp: new Date().toISOString() 
      });
    });
  },
  
  // 创建草稿文章
  createDraft: (req, res) => {
    // 检查用户是否已登录
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const { title, content } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }
    
    // 创建草稿文章对象
    const draft = {
      title: title.trim(),
      content: content || '',
      published: false,
      category: '草稿',
      tags: '',
      created_at: new Date()
    };
    
    Article.create(draft, (err, result) => {
      if (err) {
        console.error('创建草稿失败:', err);
        return res.status(500).json({ success: false, message: '创建草稿失败', error: err });
      }
      
      const newArticleId = result.insertId;
      res.json({ 
        success: true, 
        message: '草稿已创建', 
        articleId: newArticleId 
      });
    });
  },
};

module.exports = articleController;
