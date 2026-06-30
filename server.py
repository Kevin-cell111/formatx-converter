"""
FormatX · 本地开发服务器
用法: python3 server.py
访问: http://localhost:8888
"""
import http.server
import socketserver
import os

PORT = 8888
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    def end_headers(self):
        # WASM needs correct MIME types and COOP/COEP for SharedArrayBuffer
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

print(f"""
╔══════════════════════════════════════════════╗
║           FormatX · 本地开发服务器             ║
║                                              ║
║  地址: http://localhost:{PORT}                    ║
║  目录: {DIR}
║                                              ║
║  按 Ctrl+C 停止                                ║
╚══════════════════════════════════════════════╝
""")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
