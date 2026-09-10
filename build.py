#!/usr/bin/env python3
"""Regenerate QuéLlevo static helpers. Preserves app sources; injects Supabase creds if present."""
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
    cfg = re.sub(r'supabaseUrl:\s*"[^"]*"', 'supabaseUrl: ' + json.dumps(url), cfg, count=1)
    cfg = re.sub(r'supabaseAnonKey:\s*"[^"]*"', 'supabaseAnonKey: ' + json.dumps(key), cfg, count=1)
    return cfg

def main():
    url, key = load_creds()
    html_path = ROOT / "index.html"
    js_path = ROOT / "app.js"
    cfg_path = ROOT / "config.js"
    if not html_path.exists() or "sponsorsCard" not in html_path.read_text(encoding="utf-8"):
        raise SystemExit("index.html missing sponsors section — restore before build")
    if not js_path.exists() or "DEMO_SPONSORS" not in js_path.read_text(encoding="utf-8"):
        raise SystemExit("app.js missing DEMO_SPONSORS — restore before build")
    if url and key:
        js_path.write_text(inject_site(js_path.read_text(encoding="utf-8"), url, key), encoding="utf-8")
        if cfg_path.exists():
            cfg_path.write_text(inject_config(cfg_path.read_text(encoding="utf-8"), url, key), encoding="utf-8")
    print("ok", html_path.stat().st_size, js_path.stat().st_size)
    for name in ("og.png", "favicon.png", "404.html"):
        p = ROOT / name
        print("asset", name, "OK" if p.exists() else "MISSING")

if __name__ == "__main__":
    main()
