// FormatX · 后端地址配置
// 本地开发默认为 localhost:8890
// 部署后改成 Render 给你的 URL
window.BACKEND_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8890'
  : 'https://formatx-backend.onrender.com';
