"""
Static file server for agoncombat.com on Railway.
Serves public/ and proxies /api/* to agon-fighter Railway service.
"""
import http.server
import os
import urllib.request
import urllib.error
import ssl

PORT = int(os.environ.get("PORT", 3000))
PUBLIC = os.path.join(os.path.dirname(__file__), "public")
API_BACKEND = "https://agon-fighter-production.up.railway.app"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy()
        elif self.path.startswith("/post/"):
            # SPA deep link: app.js reads the id from the URL and opens that post's modal
            self.path = "/index.html"
            super().do_GET()
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _proxy(self):
        url = API_BACKEND + self.path
        ctx = ssl.create_default_context()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "agoncombat-proxy/1.0"})
            with urllib.request.urlopen(req, timeout=10, context=ctx) as r:
                data = r.read()
                ct = r.headers.get("Content-Type", "application/json")
                self.send_response(200)
                self.send_header("Content-Type", ct)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            # Fallback: return 502
            self.send_response(502)
            self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silent


if __name__ == "__main__":
    print(f"agoncombat.com server: http://0.0.0.0:{PORT}")
    with http.server.HTTPServer(("", PORT), Handler) as s:
        s.serve_forever()
