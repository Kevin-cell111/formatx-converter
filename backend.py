"""
FormatX · Backend Conversion Service
Port 8890 · All engines via subprocess (CLI tools + F:Python worker)
"""
import http.server
import json
import os
import subprocess
import sys
import urllib.parse
import shutil
import uuid
import io
from pathlib import Path

PORT = int(os.environ.get("PORT", 8890))
BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
IS_WINDOWS = sys.platform == "win32"
F_PYTHON = "F:/python3.13.0/python.exe" if IS_WINDOWS else sys.executable
WORKER = str(BASE_DIR / "engine_worker.py")
F_PY_OK_OS = os.path.exists(F_PYTHON) or not IS_WINDOWS

# Fix Windows encoding (safe)
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, 'buffer') and sys.stdout.buffer:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except: pass
    try:
        if hasattr(sys.stderr, 'buffer') and sys.stderr.buffer:
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    except: pass

# ============================================================
# ENGINE DETECTION
# ============================================================
def find(*paths):
    for p in paths:
        if os.path.exists(p): return p
    return None

SOFFICE = find("C:/Program Files/LibreOffice/program/soffice.com") or shutil.which("soffice")
EBOOK = find("C:/Program Files/Calibre2/ebook-convert.exe") or shutil.which("ebook-convert")
INKSCAPE = find("F:/Bin/inkscape.com", "C:/Program Files/Inkscape/bin/inkscape.com") or shutil.which("inkscape")
FFMPEG = find("/c/msys64/mingw64/bin/ffmpeg.exe", "C:/msys64/mingw64/bin/ffmpeg.exe") or shutil.which("ffmpeg")
def has_worker_engine(name):
    if IS_WINDOWS:
        if not os.path.exists(F_PYTHON): return False
        try:
            r = subprocess.run([F_PYTHON, "-c", f"__import__('{name}')"],
                              capture_output=True, timeout=10)
            return r.returncode == 0
        except: return False
    else:
        # Linux: try direct import
        try:
            __import__(name)
            return True
        except:
            return False

def get_engines():
    return {
        "libreoffice": SOFFICE is not None,
        "calibre": EBOOK is not None,
        "inkscape": INKSCAPE is not None,
        "ffmpeg": FFMPEG is not None,
        "pillow": has_worker_engine("PIL"),
        "pymupdf": has_worker_engine("fitz"),
        "fonttools": has_worker_engine("fontTools"),
        "fiona": has_worker_engine("fiona"),
        "paddleocr": has_worker_engine("paddleocr"),
    }

# ============================================================
# CONVERSION ROUTING
# ============================================================
OFFICE_IN  = {"docx","doc","xlsx","xls","pptx","ppt","odt","ods","odp"}
IMAGE_EXTS = {"png","jpg","jpeg","webp","gif","bmp","ico","tiff"}
EBOOK_IN   = {"epub","mobi","azw3","fb2","cbr","cbz"}
EBOOK_OUT  = {"epub","mobi","pdf","docx","txt","html"}
VECTOR_IN  = {"svg","ai","eps","ps"}
FONT_EXTS  = {"ttf","otf","woff","woff2"}
GEO_IN     = {"shp","geojson","kml","gpx"}
GEO_OUT    = {"geojson","kml","gpx","csv","shp"}
SUB_EXTS   = {"srt","vtt","ass","ssa"}

MIME_MAP = {
    "pdf":"application/pdf","png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg",
    "webp":"image/webp","gif":"image/gif","bmp":"image/bmp","svg":"image/svg+xml",
    "ico":"image/x-icon","tiff":"image/tiff","txt":"text/plain","html":"text/html",
    "md":"text/markdown","csv":"text/csv","json":"application/json",
    "mp3":"audio/mpeg","wav":"audio/wav","aac":"audio/aac","flac":"audio/flac",
    "ogg":"audio/ogg","opus":"audio/opus","m4a":"audio/mp4",
    "mp4":"video/mp4","avi":"video/x-msvideo","mov":"video/quicktime",
    "mkv":"video/x-matroska","webm":"video/webm",
    "zip":"application/zip","epub":"application/epub+zip",
    "ttf":"font/ttf","otf":"font/otf","woff":"font/woff","woff2":"font/woff2",
    "geojson":"application/geo+json","kml":"application/vnd.google-earth.kml+xml",
    "gpx":"application/gpx+xml","shp":"application/octet-stream",
}

def call_worker(engine, input_path, output_path):
    """Call engine worker (subprocess on Windows, direct import on Linux)"""
    if IS_WINDOWS:
        r = subprocess.run([F_PYTHON, WORKER, engine, input_path, output_path],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            raise Exception(r.stderr or r.stdout or f"{engine} failed")
    else:
        # Linux: use the same python process for worker
        r = subprocess.run([sys.executable, WORKER, engine, input_path, output_path],
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            raise Exception(r.stderr or r.stdout or f"{engine} failed")
    return output_path

def call_soffice(input_path, output_dir, fmt="pdf"):
    subprocess.run([SOFFICE, "--headless", "--convert-to", fmt, "--outdir", output_dir, input_path],
                   timeout=120, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    base = os.path.splitext(os.path.basename(input_path))[0]
    return os.path.join(output_dir, base + "." + fmt)

def call_ffmpeg(input_path, output_path, extra_args=None):
    cmd = [FFMPEG, "-y", "-i", input_path] + (extra_args or []) + [output_path]
    subprocess.run(cmd, timeout=300, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def call_calibre(input_path, output_path):
    subprocess.run([EBOOK, input_path, output_path],
                   timeout=300, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def call_inkscape(input_path, output_path):
    subprocess.run([INKSCAPE, "--export-filename=" + output_path, input_path],
                   timeout=120, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def route_conversion(input_path, output_path, input_ext, output_ext):
    """Route to correct engine. Returns output path or raises."""
    output_dir = os.path.dirname(output_path)

    # 1. Office -> PDF/Image (LibreOffice)
    if input_ext in OFFICE_IN and output_ext in {"pdf","png","jpg","jpeg"}:
        if not SOFFICE: raise Exception("LibreOffice not installed")
        result = call_soffice(input_path, output_dir, output_ext)
        if result != output_path and os.path.exists(result):
            shutil.move(result, output_path)
        return output_path

    # 2. PDF -> Image (PyMuPDF via worker)
    if input_ext == "pdf" and output_ext in IMAGE_EXTS:
        return call_worker("pymupdf", input_path, output_path)

    # 3. Image -> Image (Pillow via worker)
    if input_ext in IMAGE_EXTS and output_ext in IMAGE_EXTS:
        return call_worker("pillow", input_path, output_path)

    # 4. Ebook (Calibre)
    if input_ext in EBOOK_IN or output_ext in EBOOK_OUT:
        if not EBOOK: raise Exception("Calibre not installed")
        call_calibre(input_path, output_path)
        return output_path

    # 5. Vector -> Image/PDF (Inkscape)
    if input_ext in VECTOR_IN:
        if not INKSCAPE: raise Exception("Inkscape not installed")
        call_inkscape(input_path, output_path)
        return output_path

    # 6. Font (FontTools via worker)
    if input_ext in FONT_EXTS and output_ext in FONT_EXTS:
        return call_worker("fonttools", input_path, output_path)

    # 7. Geospatial (Fiona via worker)
    if input_ext in GEO_IN and output_ext in GEO_OUT:
        return call_worker("fiona", input_path, output_path)

    # 8. Subtitles (FFmpeg)
    if input_ext in SUB_EXTS and output_ext in SUB_EXTS:
        if not FFMPEG: raise Exception("FFmpeg not installed")
        call_ffmpeg(input_path, output_path)
        return output_path

    # 9. Audio (FFmpeg)
    AUDIO_EXTS = {"mp3","wav","aac","flac","ogg","opus","m4a","wma"}
    if input_ext in AUDIO_EXTS and output_ext in AUDIO_EXTS:
        if not FFMPEG: raise Exception("FFmpeg not installed")
        codec = {"mp3":"libmp3lame","aac":"aac","flac":"flac","wav":"pcm_s16le",
                 "ogg":"libvorbis","opus":"libopus"}.get(output_ext, "copy")
        call_ffmpeg(input_path, output_path, ["-c:a", codec])
        return output_path

    # 10. Video (FFmpeg)
    VIDEO_EXTS = {"mp4","avi","mov","mkv","webm","3gp","m4v"}
    if input_ext in VIDEO_EXTS and output_ext in VIDEO_EXTS:
        if not FFMPEG: raise Exception("FFmpeg not installed")
        call_ffmpeg(input_path, output_path, ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-c:a", "aac"])
        return output_path

    # 11. OCR (PaddleOCR via worker)
    if input_ext in {"png","jpg","jpeg","pdf"} and output_ext == "txt":
        return call_worker("paddleocr", input_path, output_path)

    raise Exception(f"No engine for {input_ext} -> {output_ext}")

# ============================================================
# HTTP HANDLER
# ============================================================
class BackendHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename, X-Target")

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_cors()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def send_file(self, filepath, mime_type):
        raw = os.path.basename(str(filepath))
        safe = ''.join(c if ord(c) < 128 else '_' for c in raw) or 'download'
        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Disposition", "attachment; filename=\"" + safe + "\"")
        self.send_header("Content-Length", str(os.path.getsize(filepath)))
        self.send_cors()
        self.end_headers()
        with open(filepath, "rb") as f:
            self.wfile.write(f.read())

    def send_error(self, msg, status=400):
        self.send_json({"error": True, "message": msg}, status)

    def do_OPTIONS(self):
        self.send_response(204); self.send_cors(); self.end_headers()

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if p == "/api/health":
            self.send_json({"status": "ok", "engines": get_engines()})
        elif p == "/api/engines":
            self.send_json(get_engines())
        else:
            self.send_error("Not found", 404)

    def parse_multipart(self, body, content_type):
        from email.parser import BytesParser
        from email.policy import HTTP
        f, name, target = None, "uploaded", "pdf"
        try:
            msg = BytesParser(policy=HTTP).parsebytes(
                b"Content-Type: " + content_type.encode('ascii', errors='replace') + b"\r\n\r\n" + body)
            if msg.is_multipart():
                for part in msg.iter_parts():
                    if part.get_content_disposition() == 'form-data':
                        n = part.get_param('name', '', 'content-disposition')
                        if n == 'file':
                            name = part.get_filename() or "uploaded"
                            f = part.get_payload(decode=True)
                        elif n == 'target':
                            t = part.get_payload(decode=True)
                            if isinstance(t, bytes): target = t.decode('utf-8', errors='ignore').strip().lower()
            return f, name, target
        except: pass
        # Fallback
        try:
            boundary = content_type.encode('ascii', errors='replace').split(b"boundary=")[1]
            if boundary.startswith(b'"'): boundary = boundary[1:]
            if boundary.endswith(b'"'): boundary = boundary[:-1]
            for part in body.split(b"--" + boundary):
                if b"Content-Disposition" not in part: continue
                hdrs, _, ct = part.partition(b"\r\n\r\n")
                if ct.endswith(b"\r\n"): ct = ct[:-2]
                elif b"\r\n--" in ct[-10:]: ct = ct[:ct.rfind(b"\r\n--")]
                hs = hdrs.decode('utf-8', errors='replace')
                if 'name="file"' in hs:
                    if 'filename="' in hs:
                        try:
                            s = hs.index('filename="') + 10
                            e = hs.index('"', s)
                            name = hs[s:e]
                        except: pass
                    f = ct
                elif 'name="target"' in hs:
                    target = ct.decode('utf-8', errors='replace').strip().lower()
        except: pass
        return f, name, target

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path != "/api/convert":
            self.send_error("Not found", 404); return
        self.handle_convert()

    def handle_convert(self):
        ct = self.headers.get("Content-Type", "")
        cl = int(self.headers.get("Content-Length", 0))
        if not cl: self.send_error("No file"); return
        body = self.rfile.read(cl)

        # Parse
        if "multipart/form-data" in ct:
            f, name, target = self.parse_multipart(body, ct)
        elif "application/json" in ct:
            try:
                d = json.loads(body.decode('utf-8'))
                f = __import__('base64').b64decode(d['file'])
                name, target = d.get('filename', 'uploaded'), d.get('target', 'pdf')
            except: self.send_error("Invalid JSON"); return
        else:
            f, name, target = body, self.headers.get("X-Filename", "uploaded.bin"), self.headers.get("X-Target", "pdf")

        if not f or len(f) == 0: self.send_error("Empty file"); return

        # Save
        ext = name.split(".")[-1].lower() if "." in name else "bin"
        safe = uuid.uuid4().hex + "." + ext
        inp = UPLOAD_DIR / safe
        with open(inp, "wb") as fh: fh.write(f)

        out_name = safe.rsplit(".", 1)[0] + "." + target
        out = UPLOAD_DIR / out_name

        try:
            route_conversion(str(inp), str(out), ext, target)
            if os.path.exists(str(out)):
                mime = MIME_MAP.get(target, "application/octet-stream")
                self.send_file(str(out), mime)
                # Async cleanup
                import threading
                threading.Thread(target=lambda: (__import__('time').sleep(1),
                    [os.remove(str(x)) for x in [inp, out] if os.path.exists(str(x))]), daemon=True).start()
            else:
                self.send_error("No output file", 500)
        except subprocess.TimeoutExpired:
            self.send_error("Timeout", 504)
        except Exception as e:
            self.send_error(str(e), 500)

# --- Main ---
if __name__ == "__main__":
    eng = get_engines()
    print(f"FormatX Backend :{PORT}")
    for k, v in eng.items():
        print(f"  {k:15s}: {'OK' if v else 'MISSING'}")
    http.server.HTTPServer(("0.0.0.0", PORT), BackendHandler).serve_forever()
