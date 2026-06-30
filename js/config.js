// FormatX · 后端地址配置
// 本地开发用 localhost，公网用 Cloudflare Tunnel
window.BACKEND_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8890'
  : 'https://mean-cfr-textbooks-price.trycloudflare.com';
