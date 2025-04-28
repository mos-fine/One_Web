require('dotenv').config();
const mysql = require('mysql');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('数据库连接成功');
  
  // 确保需要的表存在
  setupDatabase();
});

// 检查并将content字段升级为LONGTEXT类型
function upgradeContentFieldToLongText() {
  // 检查articles表是否存在
  db.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'articles'
  `, (err, results) => {
    if (err) {
      console.error('检查文章表失败:', err);
      return;
    }
    
    if (results[0].count > 0) {
      // 表存在，检查content字段类型
      db.query(`
        SELECT COLUMN_TYPE 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'articles' 
        AND COLUMN_NAME = 'content'
      `, (err, results) => {
        if (err) {
          console.error('检查content字段类型失败:', err);
          return;
        }
        
        if (results.length > 0) {
          const columnType = results[0].COLUMN_TYPE.toUpperCase();
          
          // 如果不是LONGTEXT类型，则进行修改
          if (columnType !== 'LONGTEXT') {
            console.log('正在将content字段从', columnType, '升级为LONGTEXT类型...');
            
            db.query(`
              ALTER TABLE articles 
              MODIFY COLUMN content LONGTEXT NOT NULL
            `, (err) => {
              if (err) {
                console.error('修改content字段类型失败:', err);
                return;
              }
              
              console.log('成功将content字段类型升级为LONGTEXT，富文本编辑器现在可以正常使用了');
            });
          } else {
            console.log('content字段已经是LONGTEXT类型，无需修改');
          }
        }
      });
    }
  });
}

function setupDatabase() {
  // 创建文章表
  db.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      cover_image VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      published BOOLEAN DEFAULT FALSE,
      category VARCHAR(100),
      tags TEXT
    )
  `);
  
  // 检查并更新content字段类型为LONGTEXT
  upgradeContentFieldToLongText();

  // 创建管理员表
  db.query(`
    CREATE TABLE IF NOT EXISTS admin (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100),
      avatar VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 创建社交媒体信息表
  db.query(`
    CREATE TABLE IF NOT EXISTS social_media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      platform VARCHAR(50) NOT NULL,
      token TEXT,
      username VARCHAR(100),
      active BOOLEAN DEFAULT TRUE
    )
  `);
}

module.exports = db;
