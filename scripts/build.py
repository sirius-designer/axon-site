"""
發佈前自動執行（GitHub Actions）：把網站複製到 _site/，並
1. 替每件作品產生獨立頁面 work/<代稱>.html（網址 /work/<代稱>），
   頁面裡直接寫好標題、簡介摘要、封面圖，讓 Google 和 LINE／Facebook 分享預覽讀得到
2. 產生 work/index.html（舊網址轉址用）
3. 產生 sitemap.xml 與 robots.txt
不需要手動執行；本機測試可用：python3 scripts/build.py
"""
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
SKIP = {".git", ".github", "_site", "scripts", ".pages.yml", "README.md"}
SLUG_OK = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def domain():
    cname = ROOT / "CNAME"
    host = cname.read_text(encoding="utf-8").strip() if cname.exists() else "design.axon-tw.com"
    return f"https://{host}"


def plain(text, limit=100):
    """專案簡介轉成純文字摘要：去掉 **粗體** 記號與換行，限制字數。"""
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", text or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= limit else s[:limit].rstrip() + "…"


def abs_url(base, path):
    return f"{base}/{quote(path.lstrip('/'))}" if path else ""


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT, OUT, ignore=lambda d, names: [n for n in names if Path(d) == ROOT and n in SKIP])

    base = domain()
    site = json.loads(read("content/site.json"))
    works = json.loads(read("content/works.json")).get("works", [])
    brand = f"{site['name']} {re.sub('有限公司$', '', site['company'])}" if site.get("company") else site.get("name", "")
    template = read("work.html")

    # 轉址腳本只給舊的 work.html 用，獨立作品頁不需要
    redirect = re.compile(r"<script>\s*// 舊網址.*?</script>\n", re.S)
    page_tpl = redirect.sub("", template)

    (OUT / "work").mkdir(exist_ok=True)
    shutil.copy(OUT / "work.html", OUT / "work" / "index.html")
    # work/index.html 在 /work/ 底下，相對路徑要從網站根目錄算
    idx = OUT / "work" / "index.html"
    idx.write_text(idx.read_text(encoding="utf-8").replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">', 1), encoding="utf-8")

    urls, seen = [], set()
    for w in works:
        slug = str(w.get("slug", "")).strip()
        if not SLUG_OK.match(slug) or slug in seen:
            print(f"略過（網址代稱需為英文小寫＋連字號且不可重複）：{w.get('title')!r} → {slug!r}")
            continue
        seen.add(slug)
        title = f"{w.get('title', '')}｜{brand}"
        desc = plain(w.get("description")) or re.search(r'<meta name="description" content="([^"]*)">', page_tpl).group(1)
        url = f"{base}/work/{slug}"
        img = abs_url(base, w.get("cover", ""))
        e = lambda s: html.escape(s, quote=True)
        head = "\n".join(filter(None, [
            '<base href="/">',
            f'<link rel="canonical" href="{e(url)}">',
            '<meta property="og:type" content="article">',
            f'<meta property="og:site_name" content="{e(brand)}">',
            f'<meta property="og:title" content="{e(title)}">',
            f'<meta property="og:description" content="{e(desc)}">',
            f'<meta property="og:url" content="{e(url)}">',
            img and f'<meta property="og:image" content="{e(img)}">',
            '<meta name="twitter:card" content="summary_large_image">',
        ]))
        page = page_tpl.replace("<title>作品</title>", f"<title>{e(title)}</title>", 1)
        page = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">', page, count=1)
        page = page.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n{head}', 1)
        page = page.replace('<body data-page="work">', f'<body data-page="work" data-slug="{e(slug)}">', 1)
        (OUT / "work" / f"{slug}.html").write_text(page, encoding="utf-8")
        urls.append(url)

    pages = [f"{base}/"] + [f"{base}/{p}" for p in ("works", "services", "about", "contact")] + urls
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{html.escape(u)}</loc></url>\n" for u in pages) + "</urlset>\n", encoding="utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n", encoding="utf-8")
    print(f"完成：{len(urls)} 件作品頁、sitemap.xml（共 {len(pages)} 個網址）")


if __name__ == "__main__":
    main()
