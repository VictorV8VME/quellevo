#!/usr/bin/env python3
"""Regenerate QuéLlevo static files. Preserves monetization code in app.js / index.html;
only injects Supabase URL/key from /tmp/sb_url.txt and /tmp/sb_key.txt when present."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def load_creds():
    url_p, key_p = Path("/tmp/sb_url.txt"), Path("/tmp/sb_key.txt")
    if url_p.exists() and key_p.exists():
        return url_p.read_text().strip(), key_p.read_text().strip()
    return None, None

def inject_site(js: str, url: str, key: str) -> str:
    site = "const SITE = { supabaseUrl: %s, supabaseKey: %s };" % (
        json.dumps(url), json.dumps(key)
    )
    return re.sub(r"const SITE = \{[^;]*\};", site, js, count=1)

def inject_config(cfg: str, url: str, key: str) -> str:
    cfg = re.sub(
        r'supabaseUrl:\s*"[^"]*"',
        'supabaseUrl: ' + json.dumps(url),
        cfg,
        count=1,
    )
    cfg = re.sub(
        r'supabaseAnonKey:\s*"[^"]*"',
        'supabaseAnonKey: ' + json.dumps(key),
        cfg,
        count=1,
    )
    return cfg

def main():
    url, key = load_creds()
    # Ensure monetization sources exist (do not wipe them)
    html_path = ROOT / "index.html"
    js_path = ROOT / "app.js"
    cfg_path = ROOT / "config.js"
    if not html_path.exists() or "sponsorsCard" not in html_path.read_text(encoding="utf-8"):
        raise SystemExit("index.html missing sponsors section — restore from repo before build")
    if not js_path.exists() or "DEMO_SPONSORS" not in js_path.read_text(encoding="utf-8"):
        raise SystemExit("app.js missing DEMO_SPONSORS — restore from repo before build")

    if url and key:
        js = inject_site(js_path.read_text(encoding="utf-8"), url, key)
        js_path.write_text(js, encoding="utf-8")
        if cfg_path.exists():
            cfg_path.write_text(inject_config(cfg_path.read_text(encoding="utf-8"), url, key), encoding="utf-8")

    (ROOT / "manifest.webmanifest").write_text("""{
  "name": "QuéLlevo",
  "short_name": "QuéLlevo",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#FFFBEA",
  "theme_color": "#25D366",
  "lang": "es"
}
""", encoding="utf-8")
    (ROOT / "vercel.json").write_text("""{
  "headers": [{"source": "/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=0, must-revalidate"}]}]
}
""", encoding="utf-8")
    print("ok", html_path.stat().st_size, js_path.stat().st_size)

if __name__ == "__main__":
    main()
