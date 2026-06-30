# FormatX · 全格式文件转换站

**1400+ 格式路径 · 22 引擎聚合 · 完全免费 · 文件不出设备**

---

## 🚀 本地运行

```bash
cd D:/converter-site
python3 server.py
# 浏览器打开 http://localhost:8888
```

## 🌍 分享给所有人访问（3种免费方式）

### 方式一：Vercel 一键部署（推荐）

1. 将项目文件夹推送到 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com) → 用 GitHub 登录
3. Import 你的仓库 → 直接 Deploy
4. 获得 `https://你的项目.vercel.app` 公网地址
5. **分享这个地址给任何人即可访问**

### 方式二：Cloudflare Pages

1. 推送到 GitHub
2. 打开 [pages.cloudflare.com](https://pages.cloudflare.com)
3. 连接仓库 → 部署
4. 获得 `https://你的项目.pages.dev`

### 方式三：GitHub Pages

1. 推送到 GitHub 仓库
2. Settings → Pages → Deploy from main branch
3. 获得 `https://你的用户名.github.io/仓库名`

---

## ⚙️ 转换引擎说明

| 模式 | 引擎 | 说明 |
|------|------|------|
| 🔒 纯本地 | Pandoc WASM, SheetJS, pdf-lib, FFmpeg.wasm, Canvas | 浏览器内转换，零服务器 |
| 🖥️ 需服务端 | LibreOffice, Calibre, GDAL, easyofd, Inkscape 等 | 部署Docker容器后启用 |

**纯客户端已支持：** 文档标记互转、电子表格、PDF操作、图片、音视频小文件、压缩

**完整1400+格式需：** 额外部署 ConvertX Docker (`docker run -d -p 3000:3000 ghcr.io/c4illin/convertx`)

---

## 📁 文件结构

```
converter-site/
├── index.html        # 主页面
├── css/style.css     # 样式（深色科技风）
├── js/
│   ├── converters.js # 格式注册表（全部22个引擎+1400格式路径）
│   └── app.js        # 主逻辑（拖拽/转换/下载）
├── server.py         # 本地开发服务器
└── README.md
```

## 🔒 隐私

- 纯客户端转换：文件完全不出设备
- 无用户注册，无数据收集
- MIT 开源，可审计
