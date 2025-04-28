// 测试 AiEditor 实例的可用方法
console.log('测试 AiEditor 实例方法...');

// 创建一个简单的 AiEditor 实例
const editor = new AiEditor({
  element: '#test-editor',
  minHeight: '200px'
});

// 打印可用方法
console.log('AiEditor 实例方法:');
for (const key in editor) {
  if (typeof editor[key] === 'function') {
    console.log(`- ${key}`);
  }
}

// 测试常用方法
const methods = ['setHtml', 'setHTML', 'setContent', 'setContents', 'setData', 'setValue'];
for (const method of methods) {
  console.log(`测试 ${method}: ${typeof editor[method] === 'function' ? '存在' : '不存在'}`);
}
