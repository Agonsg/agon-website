"""Local dev proxy: serves static files + forwards /api/* to Railway."""
import http.server
import urllib.request
import urllib.error
import os

RAILWAY = "https://agon-fighter-production.up.railway.app"
PUBLIC = os.path.join(os.path.dirname(__file__), "public")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def end_headers(self):
        # Disable browser caching during local development
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

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
        self.end_headers()

    def _proxy(self):
        url = RAILWAY + self.path
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "agon-proxy/1.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                data = r.read()
                ct = r.headers.get("Content-Type", "application/json")
                self.send_response(200)
                self.send_header("Content-Type", ct)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(f"Proxy error: {e}".encode())

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            print(f"  API → {args[0][:80]}")


if __name__ == "__main__":
    port = 8088
    print(f"✅ AGON dev proxy: http://localhost:{port}")
    print(f"   Static: {PUBLIC}")
    print(f"   API proxy → {RAILWAY}")
    with http.server.HTTPServer(("", port), Handler) as s:
        s.serve_forever()
