/* ============================================
   FormatX · Converters Registry
   All supported conversion paths & engines
   ============================================ */

// --- Format categories with supported conversions ---
const CATEGORIES = [
  {
    id: 'text',
    name: '📝 文本标记',
    icon: 'doc',
    formats: {
      input:  ['md','html','txt'],
      output: ['md','html','txt'],
    },
    engine: 'marked.js + 纯 JS',
    mode: 'client',
    badge: '纯本地',
    badgeClass: 'badge-client',
    description: 'Markdown ↔ HTML ↔ 纯文本 即时互转，浏览器内完成',
  },
  {
    id: 'spreadsheet',
    name: '📊 电子表格',
    icon: 'data',
    formats: {
      input:  ['xlsx','xls','csv','ods','json','html'],
      output: ['xlsx','csv','ods','json','html'],
    },
    engine: 'SheetJS',
    mode: 'client',
    badge: '纯本地',
    badgeClass: 'badge-client',
    description: 'Excel、CSV、ODS、JSON 数据格式解析与生成',
  },
  {
    id: 'pdf-ops',
    name: '🔐 PDF 操作',
    icon: 'doc',
    formats: {
      input:  ['pdf'],
      output: ['merged-pdf','split-pdf','rotated-pdf','encrypted-pdf','decrypted-pdf'],
    },
    engine: 'pdf-lib',
    mode: 'client',
    badge: '纯本地',
    badgeClass: 'badge-client',
    description: 'PDF 合并/拆分/旋转/加密/解密/加水印/填表',
  },
  {
    id: 'image',
    name: '🖼️ 图片转换',
    icon: 'img',
    formats: {
      input:  ['png','jpg','jpeg','webp','gif','bmp','svg','ico','tiff'],
      output: ['png','jpg','webp','gif','bmp','ico'],
    },
    engine: 'Canvas API + Sharp.wasm',
    mode: 'client',
    badge: '纯本地',
    badgeClass: 'badge-client',
    description: 'PNG/JPEG/WebP/GIF/BMP/ICO 等图片格式互转及缩放',
  },
  {
    id: 'audio',
    name: '🎵 音频转换',
    icon: 'av',
    formats: {
      input:  ['mp3','wav','aac','flac','ogg','opus','m4a','wma'],
      output: ['mp3','wav','aac','flac','ogg','opus'],
    },
    engine: 'FFmpeg.wasm',
    mode: 'client',
    badge: '纯本地（<50MB）',
    badgeClass: 'badge-client',
    description: 'MP3/WAV/AAC/FLAC/OGG/OPUS 等音频格式互转（小文件）',
  },
  {
    id: 'video',
    name: '🎬 视频转换',
    icon: 'av',
    formats: {
      input:  ['mp4','avi','mov','mkv','webm','3gp','m4v'],
      output: ['mp4','mov','webm','mkv','gif'],
    },
    engine: 'FFmpeg.wasm',
    mode: 'client',
    badge: '纯本地（<50MB）',
    badgeClass: 'badge-client',
    description: 'MP4/MOV/WebM/MKV 等视频格式互转及 GIF 生成（小文件）',
  },
  {
    id: 'archive',
    name: '🗜️ 压缩归档',
    icon: 'util',
    formats: {
      input:  ['zip','tar','gz'],
      output: ['zip','tar','gz'],
    },
    engine: 'JSZip + pako',
    mode: 'client',
    badge: '纯本地',
    badgeClass: 'badge-client',
    description: 'ZIP/TAR/GZ 压缩包创建与解压',
  },
  // --- Server-backed categories ---
  {
    id: 'office-pdf',
    name: '🏢 Office → PDF',
    icon: 'doc',
    formats: {
      input:  ['docx','doc','xlsx','xls','pptx','ppt','odt','ods','odp'],
      output: ['pdf','png','jpg'],
    },
    engine: 'LibreOffice (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'Word/Excel/PPT 精确转 PDF（保留排版/图表/公式）',
  },
  {
    id: 'ebook',
    name: '📚 电子书',
    icon: 'eb',
    formats: {
      input:  ['epub','mobi','azw3','fb2','cbr','cbz'],
      output: ['epub','mobi','pdf','docx','txt'],
    },
    engine: 'Calibre (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'EPUB/MOBI/AZW3/FB2/CBR/CBZ 电子书格式互转',
  },
  {
    id: 'ofd',
    name: '🇨🇳 OFD 版式',
    icon: 'doc',
    formats: {
      input:  ['ofd'],
      output: ['pdf','png','jpg'],
    },
    engine: 'easyofd (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: '国产 OFD 版式文件（电子发票/公文）转 PDF 或图片',
  },
  {
    id: 'wps',
    name: '🇨🇳 WPS 专有',
    icon: 'doc',
    formats: {
      input:  ['wps','et','dps'],
      output: ['pdf','docx','xlsx','pptx','png'],
    },
    engine: '永中DCS / WPS API (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'WPS 专有格式 .wps/.et/.dps 转换为标准 Office 格式',
  },
  {
    id: 'cad',
    name: '🏗️ CAD 图纸',
    icon: 'cad',
    formats: {
      input:  ['dwg','dxf'],
      output: ['pdf','svg','png','jpg'],
    },
    engine: 'LibreDWG + QCAD (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'AutoCAD DWG/DXF 图纸转 PDF/SVG/图片',
  },
  {
    id: 'geospatial',
    name: '🌍 地理空间',
    icon: 'geo',
    formats: {
      input:  ['shp','geojson','kml','gpx','csv','dxf'],
      output: ['geojson','kml','gpx','csv','shp','sqlite'],
    },
    engine: 'GDAL/ogr2ogr (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'SHP/GeoJSON/KML/GPX 等 200+ 地理空间格式互转',
  },
  {
    id: 'vector',
    name: '🎨 矢量图形',
    icon: 'vec',
    formats: {
      input:  ['svg','ai','eps','ps'],
      output: ['png','jpg','svg','pdf'],
    },
    engine: 'Inkscape (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'SVG/AI/EPS 矢量图转 PNG/PDF/SVG',
  },
  {
    id: 'ocr',
    name: '👁️ OCR 识别',
    icon: 'ocr',
    formats: {
      input:  ['png','jpg','jpeg','pdf'],
      output: ['txt','docx','xlsx'],
    },
    engine: 'PaddleOCR (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: '图片/扫描件 → 文字/表格（支持中英文）',
  },
  {
    id: 'font',
    name: '🔤 字体格式',
    icon: 'util',
    formats: {
      input:  ['ttf','otf','woff','woff2'],
      output: ['ttf','otf','woff','woff2'],
    },
    engine: 'FontTools (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'TTF/OTF/WOFF/WOFF2 字体格式互转',
  },
  {
    id: 'jupyter',
    name: '📓 Jupyter',
    icon: 'data',
    formats: {
      input:  ['ipynb'],
      output: ['html','pdf','md','py','latex'],
    },
    engine: 'nbconvert (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'Jupyter Notebook 转 HTML/PDF/Markdown/Python 脚本',
  },
  {
    id: 'subtitle',
    name: '💬 字幕格式',
    icon: 'av',
    formats: {
      input:  ['srt','vtt','ass','ssa'],
      output: ['srt','vtt','ass'],
    },
    engine: 'FFmpeg (需服务端)',
    mode: 'server',
    badge: '需部署服务端',
    badgeClass: 'badge-server',
    description: 'SRT/VTT/ASS/SSA 字幕格式互转',
  },
];

// --- File extension to MIME type mapping ---
const MIME_MAP = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  txt: 'text/plain',
  html: 'text/html',
  pdf: 'application/pdf',
  md: 'text/markdown',
  tex: 'application/x-tex',
  epub: 'application/epub+zip',
  rst: 'text/x-rst',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  json: 'application/json',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  odp: 'application/vnd.oasis.opendocument.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
};

// --- Detect category by file extension ---
function detectCategory(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.formats.input.includes(ext)) return cat;
  }
  return null;
}

// --- Get all unique input formats ---
function getAllInputFormats() {
  const set = new Set();
  CATEGORIES.forEach(c => c.formats.input.forEach(f => set.add(f)));
  return [...set].sort();
}

// --- Get output formats for a given input extension ---
function getOutputFormats(inputExt) {
  const results = [];
  CATEGORIES.forEach(cat => {
    if (cat.formats.input.includes(inputExt)) {
      cat.formats.output.forEach(out => {
        if (!results.includes(out)) results.push(out);
      });
    }
  });
  return results.sort();
}

// --- Get the engine + mode for a specific conversion ---
function getConversionInfo(inputExt, outputExt) {
  for (const cat of CATEGORIES) {
    if (cat.formats.input.includes(inputExt) && cat.formats.output.includes(outputExt)) {
      return { engine: cat.engine, mode: cat.mode, category: cat.name };
    }
  }
  return null;
}
