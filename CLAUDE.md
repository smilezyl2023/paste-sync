# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（运行在 3030 端口）
npm start

# 备用开发命令
npm dev
```

服务器在 3030 端口启动并绑定到 `0.0.0.0` 以支持本地网络访问。控制台会显示 localhost 和局域网 IP 地址用于访问。

## 架构概览

这是一个**跨设备粘贴板同步应用**，允许同一局域网内的多个设备通过 Web 界面共享文本内容。

### 后端架构 (server.js)
- **Express.js 服务器**运行在 3030 端口，绑定 `0.0.0.0` 支持局域网访问
- **内存存储**使用 `pasteHistory` 数组和 `idCounter` 管理粘贴记录
- **RESTful API** 包含三个主要端点：
  - `GET /api/pastes` - 获取所有粘贴记录
  - `POST /api/pastes` - 创建新粘贴记录（验证非空内容）
  - `DELETE /api/pastes` - 通过 ID 数组删除多个粘贴记录
- **网络发现**通过 `getLocalIP()` 函数查找主要的非内部 IPv4 地址

### 前端架构 (public/)
- **原生 JavaScript** 客户端应用（无框架依赖）
- **实时更新**通过 fetch API 调用后端
- **状态管理**使用全局变量 `pastes` 数组和 `selectedIds` Set
- **事件驱动架构**在 `setupEventListeners()` 中集中处理事件

### 数据模型
每个粘贴记录包含：
- `id`: 顺序整数标识符
- `content`: 修剪后的文本内容（验证非空）
- `timestamp`: 用于显示的 ISO 字符串
- `createdAt`: 用于排序的 Unix 时间戳

### 关键 UI 组件
- **输入区域**包含内容输入的文本框和同步按钮
- **历史记录列表**支持复选框选择进行批量操作
- **Toast 通知**用于用户反馈
- **响应式设计**采用移动优先的 CSS 方法

### 重要实现细节

1. **内存存储**：所有数据存储在内存中，服务器重启后丢失
2. **剪贴板集成**：使用现代剪贴板 API 自动复制，包含降级方案
3. **键盘快捷键**：Ctrl/Cmd + Enter 快速同步
4. **时间格式化**：相对时间显示（"刚刚"、"5分钟前"等）
5. **HTML 转义**：内容通过 DOM textContent 正确转义防止 XSS
6. **响应式断点**：移动端（`<640px`）、平板（`641px-1024px`）、桌面（`>1024px`）

### 网络配置
- 服务器绑定到所有接口（`0.0.0.0`）用于局域网发现
- 通过从同一源提供静态文件来隐式处理 CORS
- 无身份验证 - 设计用于可信的本地网络环境

## 项目结构
```
paste-sync/
├── server.js          # Express 后端和 API 端点
├── package.json       # 依赖项和脚本
├── public/            # 前端静态文件
│   ├── index.html     # 主要 HTML 结构
│   ├── style.css      # 响应式 CSS 和 CSS 变量
│   └── script.js      # 客户端 JavaScript 逻辑
└── README.md          # 用户文档
```

该应用设计简洁，专用于本地网络使用，除了 Express 外没有外部依赖。