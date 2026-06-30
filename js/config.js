// FormatX · 后端地址配置
// 本地开发默认为 localhost:8890
// 部署后改成 Render 给你的 URL
// 后端地址 - 本地用 localhost，公网用 Cloudflare Tunnel
window.BACKEND_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8890'
  : 'https://mean-cfr-textbooks-price.trycloudflare.com';
