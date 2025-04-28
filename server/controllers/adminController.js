const Admin = require('../models/admin');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 配置存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

// 设置文件过滤器
const fileFilter = (req, file, cb) => {
  // 只接受图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只支持图片文件！'), false);
  }
};

// 创建multer实例
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
  },
  fileFilter: fileFilter
});

const adminController = {
  // 获取管理员个人资料
  getProfile: (req, res) => {
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    Admin.findById(req.session.admin.id, (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取个人资料失败', error: err });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: '管理员不存在' });
      }
      
      const admin = results[0];
      
      // 不返回密码
      const { password, ...safeData } = admin;
      
      res.json({
        success: true,
        admin: safeData
      });
    });
  },
  
  // 更新管理员个人资料
  updateProfile: (req, res) => {
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const adminId = req.session.admin.id;
    const { name, email, phone, bio } = req.body;
    
    // 准备更新数据
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;
    
    // 如果有头像文件，处理头像上传
    if (req.file) {
      // 构建头像URL
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
      
      // 如果有旧头像，删除它
      if (req.session.admin.avatar && !req.session.admin.avatar.includes('avatar.png')) {
        try {
          const oldAvatarPath = path.join(process.cwd(), 'public', req.session.admin.avatar);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        } catch (err) {
          console.error('删除旧头像失败:', err);
        }
      }
    }
    
    Admin.update(adminId, updateData, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: '更新个人资料失败', error: err });
      }
      
      // 更新session中的管理员信息
      Admin.findById(adminId, (err, results) => {
        if (!err && results.length > 0) {
          const updatedAdmin = results[0];
          req.session.admin = {
            id: updatedAdmin.id,
            username: updatedAdmin.username,
            name: updatedAdmin.name,
            avatar: updatedAdmin.avatar,
            email: updatedAdmin.email,
            phone: updatedAdmin.phone,
            bio: updatedAdmin.bio
          };
        }
        
        res.json({ 
          success: true, 
          message: '个人资料更新成功',
          admin: req.session.admin
        });
      });
    });
  },
  
  // 修改密码
  changePassword: async (req, res) => {
    if (!req.session.admin) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const adminId = req.session.admin.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '当前密码和新密码都是必须的' });
    }
    
    // 验证当前密码
    Admin.findById(adminId, async (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: '管理员不存在' });
      }
      
      const admin = results[0];
      const isPasswordValid = await Admin.validatePassword(currentPassword, admin.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ success: false, message: '当前密码不正确' });
      }
      
      // 更新密码
      try {
        const hashedPassword = await Admin.hashPassword(newPassword);
        Admin.update(adminId, { password: hashedPassword }, (err, result) => {
          if (err) {
            return res.status(500).json({ success: false, message: '更新密码失败', error: err });
          }
          
          res.json({ success: true, message: '密码修改成功' });
        });
      } catch (error) {
        res.status(500).json({ success: false, message: '加密密码失败', error });
      }
    });
  }
};

// 导出控制器及上传中间件
module.exports = {
  adminController,
  upload
};
