// DOM 元素
const pasteInput = document.getElementById('pasteInput');
const syncButton = document.getElementById('syncButton');
const historyList = document.getElementById('historyList');
const selectAllButton = document.getElementById('selectAllButton');
const deleteButton = document.getElementById('deleteButton');
const toast = document.getElementById('toast');

// 状态管理
let pastes = [];
let selectedIds = new Set();

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
  syncButton.addEventListener('click', syncPaste);
  selectAllButton.addEventListener('click', toggleSelectAll);
  deleteButton.addEventListener('click', deleteSelected);

  // 支持 Enter 键快捷同步 (Ctrl/Cmd + Enter)
  pasteInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      syncPaste();
    }
  });
}

// 加载历史记录
async function loadHistory() {
  try {
    const response = await fetch('/api/pastes');
    if (!response.ok) throw new Error('加载失败');

    pastes = await response.json();
    renderHistory();
  } catch (error) {
    showToast('加载历史记录失败', 'error');
    console.error('加载历史记录失败:', error);
  }
}

// 同步粘贴内容
async function syncPaste() {
  const content = pasteInput.value.trim();

  if (!content) {
    showToast('请输入内容', 'warning');
    return;
  }

  // 禁用按钮防止重复点击
  syncButton.disabled = true;
  syncButton.textContent = '同步中...';

  try {
    const response = await fetch('/api/pastes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) throw new Error('同步失败');

    const newPaste = await response.json();
    pastes.unshift(newPaste);

    // 复制到剪贴板
    await copyToClipboard(content);

    // 清空输入框
    pasteInput.value = '';

    renderHistory();
    showToast('同步成功！已复制到剪贴板');
  } catch (error) {
    showToast('同步失败，请重试', 'error');
    console.error('同步失败:', error);
  } finally {
    syncButton.disabled = false;
    syncButton.innerHTML = '<span class="btn-icon">⬆️</span><span>同步到云端</span>';
  }
}

// 渲染历史记录
function renderHistory() {
  if (pastes.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <p>暂无历史记录</p>
        <p class="empty-hint">同步你的第一条内容吧！</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = pastes.map(paste => {
    const isSelected = selectedIds.has(paste.id);
    const timeStr = formatTime(paste.timestamp);

    return `
      <div class="history-item ${isSelected ? 'selected' : ''}" data-id="${paste.id}">
        <input
          type="checkbox"
          class="history-checkbox"
          ${isSelected ? 'checked' : ''}
          data-id="${paste.id}"
          onclick="event.stopPropagation()"
        >
        <div class="history-content">
          <div class="history-text">${escapeHtml(paste.content)}</div>
          <div class="history-time">${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');

  // 绑定点击事件
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', handleItemClick);
  });

  document.querySelectorAll('.history-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });

  updateDeleteButton();
}

// 处理历史记录项点击
async function handleItemClick(e) {
  const id = parseInt(e.currentTarget.dataset.id);
  const paste = pastes.find(p => p.id === id);

  if (paste) {
    pasteInput.value = paste.content;
    pasteInput.focus();

    // 复制到剪贴板
    await copyToClipboard(paste.content);

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast('已加载到输入框并复制到剪贴板');
  }
}

// 处理复选框变化
function handleCheckboxChange(e) {
  const id = parseInt(e.target.dataset.id);

  if (e.target.checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }

  updateDeleteButton();
  renderHistory();
}

// 全选/取消全选
function toggleSelectAll() {
  if (selectedIds.size === pastes.length) {
    // 全部取消
    selectedIds.clear();
    selectAllButton.textContent = '全选';
  } else {
    // 全选
    pastes.forEach(paste => selectedIds.add(paste.id));
    selectAllButton.textContent = '取消全选';
  }

  updateDeleteButton();
  renderHistory();
}

// 删除选中项
async function deleteSelected() {
  if (selectedIds.size === 0) return;

  const count = selectedIds.size;
  const confirmMsg = `确定要删除 ${count} 条记录吗？`;

  if (!confirm(confirmMsg)) return;

  try {
    const idsToDelete = Array.from(selectedIds);

    const response = await fetch('/api/pastes', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: idsToDelete }),
    });

    if (!response.ok) throw new Error('删除失败');

    // 更新本地数据
    pastes = pastes.filter(paste => !selectedIds.has(paste.id));
    selectedIds.clear();

    renderHistory();
    showToast(`成功删除 ${count} 条记录`);
  } catch (error) {
    showToast('删除失败，请重试', 'error');
    console.error('删除失败:', error);
  }
}

// 更新删除按钮状态
function updateDeleteButton() {
  const count = selectedIds.size;
  deleteButton.disabled = count === 0;
  deleteButton.textContent = count > 0 ? `删除选中 (${count})` : '删除选中';

  selectAllButton.textContent = selectedIds.size === pastes.length && pastes.length > 0
    ? '取消全选'
    : '全选';
}

// 显示提示消息
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast show';

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // 少于1分钟
  if (diff < 60000) {
    return '刚刚';
  }

  // 少于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  }

  // 少于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  }

  // 同一年
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
  }

  // 不同年份
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 补零
function padZero(num) {
  return num.toString().padStart(2, '0');
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // 降级方案：使用传统方法
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error('复制失败');
    }

    return true;
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    // 静默失败，不影响主要功能
    return false;
  }
}
