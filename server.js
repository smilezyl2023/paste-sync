const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// 内存存储粘贴记录
let pasteHistory = [];
let idCounter = 1;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 获取本机局域网 IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// API 路由

// 获取所有粘贴记录
app.get('/api/pastes', (req, res) => {
  res.json(pasteHistory);
});

// 添加新的粘贴记录
app.post('/api/pastes', (req, res) => {
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: '内容不能为空' });
  }

  const newPaste = {
    id: idCounter++,
    content: content.trim(),
    timestamp: new Date().toISOString(),
    createdAt: Date.now()
  };

  pasteHistory.unshift(newPaste);
  res.json(newPaste);
});

// 删除粘贴记录
app.delete('/api/pastes', (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: '需要提供 ID 数组' });
  }

  pasteHistory = pasteHistory.filter(paste => !ids.includes(paste.id));
  res.json({ success: true, deleted: ids.length });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n=================================');
  console.log('📋 粘贴板同步服务已启动！');
  console.log('=================================');
  console.log(`本机访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
  console.log('=================================\n');
});
