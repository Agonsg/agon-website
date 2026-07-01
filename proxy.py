"""Local dev proxy: serves static files + forwards /api/* to Railway."""
import http.server
import json
import re
import urllib.request
import urllib.error
import os

RAILWAY = "https://agon-fighter-production.up.railway.app"
PUBLIC = os.path.join(os.path.dirname(__file__), "public")


def _load_local_env():
    """Read BOT_TOKEN/ADMIN_ID from .env for local /api/contact testing —
    same values Vercel will use in production once configured there."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    env = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k] = v
    return env


_LOCAL_ENV = _load_local_env()
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/contact":
            self._contact()
        else:
            self.send_response(404)
            self.end_headers()

    def _json_response(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _contact(self):
        """Mirrors api/contact.js — lets the contact form be tested locally
        before deploying, sending straight to the real @Agon_combatbot."""
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._json_response(400, {"ok": False, "error": "bad_request"})
            return

        name = str(body.get("name") or "").strip()
        email = str(body.get("email") or "").strip()
        message = str(body.get("message") or "").strip()

        if not name or not email or not message:
            self._json_response(400, {"ok": False, "error": "missing_fields"})
            return
        if not _EMAIL_RE.match(email):
            self._json_response(400, {"ok": False, "error": "invalid_email"})
            return
        if len(name) > 120 or len(email) > 200 or len(message) > 2000:
            self._json_response(400, {"ok": False, "error": "field_too_long"})
            return

        token = _LOCAL_ENV.get("BOT_TOKEN")
        admin_id = _LOCAL_ENV.get("ADMIN_ID")
        if not token or not admin_id:
            self._json_response(500, {"ok": False, "error": "server_not_configured"})
            return

        text = "\n".join([
            "[LOCAL TEST] New message from agoncombat.com",
            "",
            f"Name: {name}",
            f"Email: {email}",
            "",
            message,
        ])
        try:
            tg_url = f"https://api.telegram.org/bot{token}/sendMessage"
            req = urllib.request.Request(
                tg_url,
                data=json.dumps({"chat_id": admin_id, "text": text}).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                tg_data = json.loads(r.read())
            if not tg_data.get("ok"):
                self._json_response(502, {"ok": False, "error": "telegram_send_failed"})
                return
            self._json_response(200, {"ok": True})
        except Exception:
            self._json_response(502, {"ok": False, "error": "telegram_unreachable"})

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
