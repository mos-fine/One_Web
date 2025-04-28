const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'article-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只接受图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，只能上传图片'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 公开API - 获取已发布的文章
router.get('/published', articleController.getPublishedArticles);

// 按分类获取文章
router.get('/category/:category', articleController.getArticlesByCategory);

// 搜索文章
router.get('/search', articleController.searchArticles);

// 获取所有文章(包括未发布的) - 需要管理员权限
router.get('/', articleController.getAllArticles);

// 获取单篇文章
router.get('/:id', articleController.getArticle);

// 创建文章 - 需要管理员权限
router.post('/', upload.single('cover_image'), articleController.createArticle);

// 更新文章 - 需要管理员权限
router.put('/:id', upload.single('cover_image'), articleController.updateArticle);

// 删除文章 - 需要管理员权限
router.delete('/:id', articleController.deleteArticle);

// 自动保存文章内容 - 需要管理员权限
router.post('/:id/autosave', articleController.autoSaveArticle);

// 创建草稿 - 需要管理员权限
router.post('/draft', articleController.createDraft);

module.exports = router;
