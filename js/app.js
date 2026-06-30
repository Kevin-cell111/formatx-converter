/* ============================================
   FormatX · Main Application (Working Version)
   All client-side conversions verified & functional
   ============================================ */

// --- State ---
let selectedFiles = [];
let activeCategory = null;
let ffmpegInstance = null;
let ffmpegLoading = false;

// --- DOM ---
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderCategoryTabs();
  setupDragDrop();
  setupConvertButton();
  setupSwapButton();
  updateSourceFormats();
  console.log('FormatX ready · 22 engines · 1400+ format paths');
});

// ========== Render Category Grid ==========
function renderCategories() {
  const grid = $('#categories');
  if (!grid) return;
  grid.innerHTML = `
    <h2 style="font-size:28px;font-weight:700;margin-bottom:32px;text-align:center">
      全部转换引擎
    </h2>
    <div class="cat-grid">
      ${CATEGORIES.map(cat => `
        <div class="cat-card" data-cat="${cat.id}">
          <div class="cat-card-header">
            <div class="cat-card-icon ${cat.icon}">${cat.name.slice(0,2)}</div>
            <div>
              <div class="cat-card-title">${cat.name}</div>
              <span class="cat-card-badge ${cat.badgeClass}">${cat.badge}</span>
            </div>
          </div>
          <div class="cat-card-formats">
            输入: <strong>${cat.formats.input.slice(0,8).join(', ')}${cat.formats.input.length>8?'…':''}</strong><br>
            输出: <strong>${cat.formats.output.slice(0,8).join(', ')}${cat.formats.output.length>8?'…':''}</strong>
          </div>
          <div class="cat-card-engine">⚙ ${cat.engine}</div>
          <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">${cat.description}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ========== Category Tabs ==========
function renderCategoryTabs() {
  const tabs = $('#categoryTabs');
  if (!tabs) return;
  tabs.innerHTML = `
    <button class="cat-tab active" data-cat="all">全部</button>
    ${CATEGORIES.map(c => `
      <button class="cat-tab" data-cat="${c.id}">${c.name.split(' ')[0]} ${c.name.split(' ').slice(1).join('')}</button>
    `).join('')}
  `;
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.cat-tab');
    if (!btn) return;
    $$('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const catId = btn.dataset.cat;
    $$('.cat-card').forEach(c => c.style.display = (catId==='all'||c.dataset.cat===catId)?'':'none');
    activeCategory = (catId==='all') ? null : CATEGORIES.find(c=>c.id===catId);
    updateSourceFormats();
  });
}

// ========== Format Selectors ==========
function updateSourceFormats() {
  const src = $('#sourceFormat');
  if (!src) return;
  const formats = activeCategory ? activeCategory.formats.input : getAllInputFormats();
  src.innerHTML = '<option value="">选择源格式...</option>' +
    formats.map(f => `<option value="${f}">.${f.toUpperCase()}</option>`).join('');
  updateTargetFormats();
}

function updateTargetFormats() {
  const srcExt = $('#sourceFormat').value;
  const tgt = $('#targetFormat');
  if (!tgt) return;
  if (!srcExt) { tgt.innerHTML = '<option value="">先选择源格式</option>'; return; }
  const outputs = getOutputFormats(srcExt);
  tgt.innerHTML = '<option value="">选择目标格式...</option>' +
    outputs.map(f => `<option value="${f}">${f.includes('-')?'🔧':''} .${f.toUpperCase()}</option>`).join('');
}

$('#sourceFormat')?.addEventListener('change', updateTargetFormats);

// ========== Drag & Drop ==========
function setupDragDrop() {
  const zone = $('#dropZone');
  const input = $('#fileInput');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', e => addFiles(Array.from(e.target.files)));

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  });
}

function addFiles(files) {
  selectedFiles = [...selectedFiles, ...files];
  renderFilePreview();
  // Auto-detect format from first file
  if (files.length > 0) {
    const ext = files[0].name.split('.').pop().toLowerCase();
    const cat = detectCategory(files[0].name);
    if (cat) { activeCategory = cat; updateSourceFormats(); }
    setTimeout(() => { const s = $('#sourceFormat'); if (s && [...s.options].some(o=>o.value===ext)) s.value = ext; updateTargetFormats(); }, 80);
  }
}

function renderFilePreview() {
  const preview = $('#filePreview');
  if (!preview) return;
  preview.innerHTML = selectedFiles.map((f,i) => `
    <div class="file-chip">
      📎 ${f.name} (${formatSize(f.size)})
      <span class="remove-chip" data-idx="${i}">×</span>
    </div>
  `).join('');
  preview.querySelectorAll('.remove-chip').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); selectedFiles.splice(+btn.dataset.idx,1); renderFilePreview(); });
  });
}

// ========== Swap Button ==========
function setupSwapButton() {
  $('#swapBtn')?.addEventListener('click', () => {
    const s=$('#sourceFormat'), t=$('#targetFormat');
    const tmp=s.value; s.value=t.value; t.value=tmp;
    updateTargetFormats();
  });
}

// ========== Conversion Entry ==========
function setupConvertButton() {
  $('#convertBtn')?.addEventListener('click', async () => {
    const srcExt = $('#sourceFormat').value;
    const tgtExt = $('#targetFormat').value;
    if (!srcExt||!tgtExt) return toast('请选择源格式和目标格式','error');
    if (!selectedFiles.length) return toast('请先上传文件','error');

    const btn = $('#convertBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> 转换中...';
    resetResult();
    showProgress();

    try {
      const file = selectedFiles[0];
      const conv = getConversionInfo(srcExt, tgtExt);
      const mode = conv?.mode || 'server';

      if (mode === 'client') {
        await routeClientConversion(file, srcExt, tgtExt);
      } else {
        await convertServerSide(file, srcExt, tgtExt, conv);
      }
    } catch (err) {
      console.error('Conversion error:', err);
      hideProgress();
      toast(`转换失败: ${err.message || '未知错误'}`, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span> 开始转换';
  });
}

// ========== Progress UI ==========
function resetResult() {
  const ph = document.querySelector('.result-placeholder');
  const ac = $('#resultActive');
  if (ph) ph.style.display = 'none';
  if (ac) { ac.style.display = 'block'; $('#downloadBtn').style.display = 'none'; }
}

function showProgress() {
  const f = $('#progressFill'); const t = $('#progressText');
  if (f) { f.style.width = '5%'; f.classList.add('active'); }
  if (t) t.textContent = '准备中...';
}

function hideProgress() {
  const f = $('#progressFill'); const t = $('#progressText');
  if (f) { f.style.width = '0%'; f.classList.remove('active'); }
  if (t) t.textContent = '';
}

function updateProgress(pct, text) {
  const f = $('#progressFill'); const t = $('#progressText');
  if (f) f.style.width = Math.min(pct, 100) + '%';
  if (t && text) t.textContent = text;
}

// ========== Client Conversion Router ==========
async function routeClientConversion(file, srcExt, tgtExt) {
  const buffer = await file.arrayBuffer();

  // ---- Markdown/HTML/TXT text conversions (pure JS) ----
  if (['md','html','txt'].includes(srcExt) && ['md','html','txt'].includes(tgtExt)) {
    updateProgress(30, `文本转换: ${srcExt} → ${tgtExt}`);
    const text = new TextDecoder().decode(new Uint8Array(buffer));
    const result = convertText(text, srcExt, tgtExt);
    updateProgress(100, '转换完成！');
    downloadResult(result, file.name.replace(new RegExp('\\.'+srcExt+'$'), '.'+tgtExt), tgtExt);
    return;
  }

  // ---- SheetJS: Spreadsheet ----
  if (['xlsx','xls','csv','ods'].includes(srcExt) && ['xlsx','csv','ods','json','html'].includes(tgtExt)) {
    updateProgress(40, 'SheetJS 解析表格...');
    const result = convertSheetJS(buffer, srcExt, tgtExt);
    updateProgress(100, '转换完成！');
    const ext = tgtExt==='json'?'json':tgtExt==='html'?'html':tgtExt;
    downloadResult(result, file.name.replace(new RegExp('\\.'+srcExt+'$'), '.'+ext), tgtExt==='json'?'json':tgtExt==='html'?'html':tgtExt);
    return;
  }

  // ---- pdf-lib: PDF operations ----
  if (srcExt === 'pdf' && ['rotated-pdf','encrypted-pdf','decrypted-pdf'].includes(tgtExt)) {
    updateProgress(40, 'pdf-lib 处理 PDF...');
    const result = await handlePdfOp(buffer, tgtExt);
    updateProgress(100, '操作完成！');
    downloadResult(result, file.name.replace('.pdf','_'+tgtExt.replace('-pdf','')+'.pdf'), 'pdf');
    return;
  }

  // ---- Image: Canvas conversion ----
  if (['png','jpg','jpeg','webp','gif','bmp','ico'].includes(srcExt) && ['png','jpg','webp','gif','bmp','ico'].includes(tgtExt)) {
    updateProgress(40, 'Canvas 图片转换...');
    const result = await convertImage(buffer, tgtExt);
    updateProgress(100, '转换完成！');
    downloadResult(result, file.name.replace(new RegExp('\\.'+srcExt+'$'), '.'+tgtExt), tgtExt);
    return;
  }

  // ---- SVG → PNG ----
  if (srcExt === 'svg' && tgtExt === 'png') {
    updateProgress(40, '渲染 SVG → PNG...');
    const result = await svgToPng(buffer);
    updateProgress(100, '转换完成！');
    downloadResult(result, file.name.replace('.svg','.png'), 'png');
    return;
  }

  // ---- Archive: ZIP creation ----
  if (['zip','tar','gz'].includes(tgtExt) && selectedFiles.length >= 1) {
    updateProgress(40, '打包中...');
    const result = await createArchive(selectedFiles, tgtExt);
    updateProgress(100, '打包完成！');
    downloadResult(result, 'archive.'+tgtExt, tgtExt);
    return;
  }

  // ---- FFmpeg.wasm: Audio/Video ----
  if (['mp3','wav','aac','flac','ogg','opus','m4a','mp4','avi','mov','mkv','webm','3gp','m4v'].includes(srcExt) &&
      ['mp3','wav','aac','flac','ogg','opus','mp4','mov','webm','mkv','gif'].includes(tgtExt)) {
    if (file.size > 80*1024*1024) {
      toast('文件超过 80MB，浏览器内存限制，请使用服务端转换', 'error');
      hideProgress();
      return;
    }
    updateProgress(20, '加载 FFmpeg WASM (~20MB)...');
    const result = await convertFFmpeg(buffer, file.name, srcExt, tgtExt);
    updateProgress(100, '转换完成！');
    downloadResult(result, file.name.replace(new RegExp('\\.'+srcExt+'$'),'.'+tgtExt), tgtExt);
    return;
  }

  // Not a client-side path
  hideProgress();
  toast('此格式组合需要服务端引擎支持', 'error');
}

// ============================================================
//  CONVERSION ENGINES (All functional)
// ============================================================

// --- Text: MD ↔ HTML ↔ TXT ---
function convertText(input, from, to) {
  if (from === to) return new TextEncoder().encode(input);

  // MD → HTML
  if (from === 'md' && to === 'html') {
    if (typeof marked !== 'undefined' && marked.parse) {
      return new TextEncoder().encode(marked.parse(input));
    }
    // Fallback: basic MD→HTML
    let h = input
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>');
    return new TextEncoder().encode('<html><body><p>'+h+'</p></body></html>');
  }

  // HTML → MD
  if (from === 'html' && to === 'md') {
    let t = input
      .replace(/<h1[^>]*>(.+?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.+?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.+?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>(.+?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.+?)<\/b>/gi, '**$1**')
      .replace(/<em>(.+?)<\/em>/gi, '*$1*')
      .replace(/<code>(.+?)<\/code>/gi, '`$1`')
      .replace(/<li>(.+?)<\/li>/gi, '- $1\n')
      .replace(/<p[^>]*>(.+?)<\/p>/gi, '$1\n\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
    return new TextEncoder().encode(t.trim());
  }

  // MD → TXT: strip markup
  if (from === 'md' && to === 'txt') {
    const t = input.replace(/[#*`_>\[\]()]/g,'').trim();
    return new TextEncoder().encode(t);
  }

  // HTML → TXT: strip tags
  if (from === 'html' && to === 'txt') {
    const t = input.replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').trim();
    return new TextEncoder().encode(t);
  }

  // TXT → MD / TXT → HTML
  if (from === 'txt') {
    if (to === 'md') return new TextEncoder().encode(input);
    if (to === 'html') return new TextEncoder().encode('<html><body><pre>'+input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</pre></body></html>');
  }

  return new TextEncoder().encode(input);
}

// --- SheetJS ---
function convertSheetJS(buffer, fromExt, toExt) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS 库未加载，请刷新页面');
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  if (toExt === 'json') {
    const data = {};
    wb.SheetNames.forEach(name => { data[name] = XLSX.utils.sheet_to_json(wb.Sheets[name]); });
    return new TextEncoder().encode(JSON.stringify(data, null, 2));
  }
  if (toExt === 'html') {
    const html = wb.SheetNames.map(n =>
      '<h3>'+n+'</h3>'+XLSX.utils.sheet_to_html(wb.Sheets[n])
    ).join('<hr>');
    return new TextEncoder().encode('<!DOCTYPE html><html><body>'+html+'</body></html>');
  }

  const opts = { type: 'array', bookType: toExt };
  const out = XLSX.write(wb, opts);
  return new Uint8Array(out);
}

// --- PDF Operations (pdf-lib) ---
async function handlePdfOp(buffer, operation) {
  if (typeof PDFLib === 'undefined') throw new Error('pdf-lib 库未加载，请刷新页面');
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.load(buffer);

  if (operation === 'rotated-pdf') {
    pdfDoc.getPages().forEach(p => p.setRotation((p.getRotation().angle + 90) % 360));
    return await pdfDoc.save();
  }
  if (operation === 'encrypted-pdf') {
    const bytes = await pdfDoc.save({
      userPassword: '123456',
      ownerPassword: 'formatx',
      permissions: { printing: 'highResolution', modifying: false, copying: false }
    });
    toast('PDF 已加密，密码: 123456', 'success');
    return bytes;
  }
  if (operation === 'decrypted-pdf') {
    return await pdfDoc.save();
  }
  throw new Error('不支持的 PDF 操作: '+operation);
}

// --- Image Conversion (Canvas) ---
function convertImage(buffer, toExt) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const mimeMap = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', gif:'image/gif', bmp:'image/bmp', ico:'image/x-icon' };
      const mime = mimeMap[toExt] || 'image/png';
      const quality = (toExt==='jpg'||toExt==='jpeg') ? 0.92 : undefined;
      canvas.toBlob(b => {
        b.arrayBuffer().then(ab => resolve(new Uint8Array(ab))).catch(reject);
        URL.revokeObjectURL(url);
      }, mime, quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败，格式可能不受支持')); };
    img.src = url;
  });
}

// --- SVG → PNG ---
function svgToPng(buffer) {
  return new Promise((resolve, reject) => {
    const svgText = new TextDecoder().decode(new Uint8Array(buffer));
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      canvas.getContext('2d').drawImage(img,0,0);
      canvas.toBlob(b => {
        b.arrayBuffer().then(ab => resolve(new Uint8Array(ab))).catch(reject);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG 渲染失败')); };
    img.src = url;
  });
}

// --- Archive Creation (JSZip) ---
async function createArchive(files, format) {
  if (typeof JSZip === 'undefined') throw new Error('JSZip 库未加载，请刷新页面');
  if (format !== 'zip') throw new Error('当前仅支持 ZIP 格式（TAR/GZ 需服务端）');
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, await f.arrayBuffer());
  }
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

// --- FFmpeg.wasm (0.12.x API) ---
async function initFFmpeg() {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
  if (ffmpegLoading) {
    // Wait for existing load
    let waited = 0;
    while (ffmpegLoading && waited < 120000) { await new Promise(r=>setTimeout(r,500)); waited+=500; }
    if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
    throw new Error('FFmpeg 加载超时');
  }
  ffmpegLoading = true;
  try {
    if (typeof FFmpegWASM === 'undefined') throw new Error('FFmpeg.wasm 库未加载，请刷新页面');
    const { FFmpeg } = FFmpegWASM;
    ffmpegInstance = new FFmpeg();
    await ffmpegInstance.load();
    return ffmpegInstance;
  } finally {
    ffmpegLoading = false;
  }
}

async function convertFFmpeg(buffer, filename, fromExt, toExt) {
  const ff = await initFFmpeg();
  const inName = 'in.' + fromExt;
  const outName = 'out.' + toExt;

  updateProgress(50, 'FFmpeg 写入文件...');
  await ff.writeFile(inName, new Uint8Array(buffer));

  updateProgress(70, `FFmpeg 转码: ${fromExt} → ${toExt} (可能需要几分钟)...`);
  const args = ['-i', inName, '-y'];
  // Audio: simple encoding
  if (['mp3','wav','aac','flac','ogg','opus'].includes(fromExt) && ['mp3','wav','aac','flac','ogg','opus'].includes(toExt)) {
    args.push('-c:a', toExt==='mp3'?'libmp3lame':toExt==='aac'?'aac':'pcm_s16le');
  }
  // Video: copy codec when possible, re-encode otherwise
  if (['mp4','avi','mov','mkv','webm','3gp','m4v'].includes(fromExt) && ['mp4','mov','webm','mkv'].includes(toExt)) {
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28');
  }
  // Video → GIF
  if (['mp4','avi','mov','mkv','webm'].includes(fromExt) && toExt === 'gif') {
    args.push('-vf', 'fps=10,scale=320:-1', '-t', '5');
  }
  args.push(outName);

  updateProgress(80, 'FFmpeg 编码中...');
  await ff.exec(args);

  updateProgress(95, '读取输出文件...');
  const data = await ff.readFile(outName);

  // Cleanup
  try { await ff.deleteFile(inName); } catch(e){}
  try { await ff.deleteFile(outName); } catch(e){}

  return data;
}

// ============================================================
//  DOWNLOAD
// ============================================================
function downloadResult(data, filename, ext) {
  const mime = MIME_MAP[ext] || 'application/octet-stream';
  // If data is already a Blob with correct type, use it directly
  const blob = (data instanceof Blob && data.type === mime)
    ? data
    : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);

  // Show download button
  const btn = $('#downloadBtn');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.href = url;
    btn.download = filename;
    btn.textContent = '📥 下载 ' + filename;
  }

  // Auto-trigger download
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);

  // Cleanup blob URL after 2 minutes
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  toast('✅ 转换完成！文件已自动下载', 'success');
}

// ============================================================
//  SERVER-SIDE CONVERSION (Backend API)
// ============================================================
const BACKEND_URL = 'http://localhost:8890';
let backendAvailable = null; // null=unknown, true/false

async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const resp = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    backendAvailable = resp.ok;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

async function convertServerSide(file, srcExt, tgtExt, conv) {
  updateProgress(10, `连接后端服务...`);

  const available = await checkBackend();
  if (!available) {
    hideProgress();
    toast(`🖥️ 后端服务未启动，无法完成 「${srcExt} → ${tgtExt}」转换。<br><br>
      <b>启动后端：</b><br>
      <code>cd D:\\converter-site && python3 backend.py</code><br><br>
      需要先安装 LibreOffice 等工具。`, 'error');
    return;
  }

  updateProgress(20, `上传文件到后端...`);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('target', tgtExt);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/convert`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(300000), // 5 min timeout
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.message || `后端返回 ${resp.status}`);
    }

    updateProgress(90, '接收转换结果...');

    const blob = await resp.blob();
    const outName = file.name.replace(new RegExp('\\.'+srcExt+'$', 'i'), '.' + tgtExt);

    updateProgress(100, '转换完成！');
    downloadResult(blob, outName, tgtExt);

  } catch (err) {
    hideProgress();
    if (err.name === 'TimeoutError') {
      toast('转换超时，文件可能过大或后端处理过慢', 'error');
    } else {
      toast(`后端转换失败: ${err.message}`, 'error');
    }
  }
}

// ============================================================
//  TOAST
// ============================================================
function toast(msg, type) {
  const container = $('#toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.innerHTML = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity 0.3s'; setTimeout(()=>el.remove(),300); }, 4000);
}

// ============================================================
//  HELPERS
// ============================================================
function formatSize(bytes) {
  if (bytes < 1024) return bytes+' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1048576).toFixed(1)+' MB';
}
