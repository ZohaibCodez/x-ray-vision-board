"""Render the FYP docs to self-contained HTML with every Mermaid diagram baked in as SVG.

Output: docs/*.html (open in any browser, no extension, no internet)
        docs/diagrams/*.svg (individual diagrams, for pasting into a thesis)
"""
import io, os, re, json
from playwright.sync_api import sync_playwright

DOCS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIAG = os.path.join(DOCS, "diagrams")
# Set CHROME_PATH only if Playwright cannot find its bundled Chromium.
CHROME = os.environ.get("CHROME_PATH") or None
FILES = ["HANDOVER.md", "README.md", "01-SRS.md", "02-SDD.md", "03-Test-Cases.md", "04-User-Manual.md", "05-Thesis.md"]

os.makedirs(DIAG, exist_ok=True)

CSS = """
:root{--fg:#1a2028;--muted:#5b6672;--bg:#ffffff;--line:#e2e8f0;--accent:#0E7490;
      --code-bg:#f6f8fa;--th:#f1f5f9;--note:#f0f9ff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
     font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:48px 32px 96px}
h1{font-size:2.1rem;line-height:1.2;margin:0 0 .6em;padding-bottom:.35em;border-bottom:3px solid var(--accent)}
h2{font-size:1.55rem;margin:2.2em 0 .7em;padding-bottom:.3em;border-bottom:1px solid var(--line)}
h3{font-size:1.2rem;margin:1.8em 0 .5em;color:var(--accent)}
h4{font-size:1.02rem;margin:1.4em 0 .4em}
p{margin:.7em 0}
a{color:var(--accent)}
hr{border:0;border-top:1px solid var(--line);margin:2.4em 0}
table{border-collapse:collapse;width:100%;margin:1.1em 0;font-size:.9rem;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:8px 11px;text-align:left;vertical-align:top}
th{background:var(--th);font-weight:600}
tr:nth-child(even) td{background:#fafbfc}
code{background:var(--code-bg);padding:.15em .4em;border-radius:4px;font-size:.86em;
     font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
pre{background:var(--code-bg);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow-x:auto}
pre code{background:none;padding:0;font-size:.84rem;line-height:1.5}
blockquote{margin:1.2em 0;padding:.9em 1.2em;background:var(--note);
           border-left:4px solid var(--accent);border-radius:0 8px 8px 0}
blockquote > :first-child{margin-top:0} blockquote > :last-child{margin-bottom:0}
ul,ol{padding-left:1.5em}
img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:8px;margin:.8em 0;display:block}
.mermaid-figure{margin:1.6em 0;padding:20px;border:1px solid var(--line);border-radius:10px;
                background:#fcfdfe;overflow-x:auto;text-align:center}
.mermaid-figure svg{max-width:100%;height:auto}
.docnav{background:var(--th);border:1px solid var(--line);border-radius:10px;
        padding:12px 18px;margin-bottom:32px;font-size:.9rem}
.docnav a{margin-right:18px;font-weight:600;text-decoration:none}
.center{text-align:center}
.center h1,.center h2,.center h3{border:0;text-align:center}
.pagebreak{border-top:1px dashed var(--line);margin:44px 0}
.toc-note{background:var(--note);border:1px solid var(--line);border-radius:8px;padding:14px 18px;font-size:.92rem}
@media print{
  .pagebreak{page-break-after:always;border:0;margin:0}
  .docnav{display:none}
  body{font-size:11pt}
  .wrap{max-width:none;padding:0}
  h1,h2,h3{page-break-after:avoid}
  pre,.mermaid-figure,img{page-break-inside:avoid}
  /* A figure taller than the page cannot break, so cap it and let the
     browser scale proportionally instead of slicing it in half. */
  img{max-height:210mm;width:auto}
  .mermaid-figure{padding:8px}
  .mermaid-figure svg{max-height:205mm}
  /* On screen the tables scroll sideways (display:block). For print that stops
     Chromium paginating them, so a long table gets pushed whole onto the next
     page and leaves a blank one behind. Restore real table layout, let rows
     flow across pages, and repeat the header row on each page it spans. */
  table{display:table;width:100%;overflow:visible;font-size:8.5pt}
  thead{display:table-header-group}
  tr{page-break-inside:avoid}
  th,td{padding:5px 7px}
}
"""

NAV = ('<div class="docnav"><strong>XRayVision AI docs:</strong> '
       '<a href="HANDOVER.html">Start here</a><a href="README.html">Index</a><a href="01-SRS.html">SRS</a>'
       '<a href="02-SDD.html">SDD</a><a href="03-Test-Cases.html">Tests</a>'
       '<a href="04-User-Manual.html">User Manual</a><a href="05-Thesis.html">Thesis</a></div>')

SHELL = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({startOnLoad:false, theme:'default', securityLevel:'loose',
                    flowchart:{useMaxWidth:true}, sequence:{useMaxWidth:true},
                    er:{useMaxWidth:true}, class:{useMaxWidth:true}});
window.__mermaid = mermaid;
window.__ready = true;
</script></head><body><div id="out"></div></body></html>"""

RENDER_JS = """
async ([md, navHtml]) => {
    marked.setOptions({gfm:true, breaks:false});
    let html = marked.parse(md);
    const out = document.getElementById('out');
    out.innerHTML = navHtml + '<div class="wrap">' + html + '</div>';

    // Rewrite cross-document links .md -> .html
    out.querySelectorAll('a[href]').forEach(a => {
        const h = a.getAttribute('href');
        if (h && /^(README|0[1-4]-[\\w-]+)\\.md(#.*)?$/.test(h)) {
            a.setAttribute('href', h.replace('.md', '.html'));
        }
    });

    // Render every mermaid code block into an inline SVG
    const svgs = [];
    const blocks = [...out.querySelectorAll('pre > code.language-mermaid')];
    for (let i = 0; i < blocks.length; i++) {
        const code = blocks[i];
        const src = code.textContent;
        const fig = document.createElement('div');
        fig.className = 'mermaid-figure';
        try {
            const {svg} = await window.__mermaid.render('mmd' + i + '_' + Date.now(), src);
            fig.innerHTML = svg;
            svgs.push({index: i + 1, svg: svg, ok: true});
        } catch (e) {
            fig.innerHTML = '<pre style="color:#b91c1c">Diagram failed to render:\\n' +
                            String(e.message || e) + '</pre>';
            svgs.push({index: i + 1, svg: null, ok: false, error: String(e.message || e)});
        }
        code.parentElement.replaceWith(fig);
    }
    return {count: blocks.length, svgs: svgs};
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, **({"executable_path": CHROME} if CHROME else {}))
    page = browser.new_page(viewport={"width": 1400, "height": 1000})
    page.set_default_timeout(120000)
    page.set_content(SHELL)
    page.wait_for_function("window.__ready === true && typeof marked !== 'undefined'", timeout=60000)
    print("marked + mermaid loaded\n")

    total_ok = total_fail = 0
    for fn in FILES:
        md = io.open(os.path.join(DOCS, fn), encoding="utf-8").read()
        # Thesis authoring markers -> HTML that marked passes through untouched.
        md = md.replace("<!-- center -->", '<div class="center">\n')
        md = md.replace("<!-- endcenter -->", '\n</div>')
        md = md.replace("<!-- pagebreak -->", '<div class="pagebreak"></div>')
        md = md.replace("<!-- toc -->",
                        '<div class="toc-note"><strong>Table of Contents</strong><br>'
                        'The paginated contents table is generated in the Word edition '
                        '(<code>XRayVision_AI_Thesis.docx</code>). In this HTML edition, use the '
                        'chapter headings below to navigate.</div>')
        page.set_content(SHELL)
        page.wait_for_function("window.__ready === true && typeof marked !== 'undefined'", timeout=60000)
        res = page.evaluate(RENDER_JS, [md, NAV])

        ok = sum(1 for s in res["svgs"] if s["ok"])
        bad = res["count"] - ok
        total_ok += ok; total_fail += bad

        # Save individual SVGs
        stem = fn.replace(".md", "")
        for s in res["svgs"]:
            if s["ok"]:
                sp = os.path.join(DIAG, f"{stem}-diagram-{s['index']:02d}.svg")
                io.open(sp, "w", encoding="utf-8").write(s["svg"])
            else:
                print(f"    !! {fn} diagram {s['index']}: {s['error'][:110]}")

        body = page.evaluate("() => document.getElementById('out').innerHTML")
        title = re.search(r"^#\s+(.+)$", md, re.M)
        title = title.group(1).strip() if title else stem
        html = (f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
                f'<meta name="viewport" content="width=device-width,initial-scale=1">\n'
                f'<title>{title} — XRayVision AI</title>\n<style>{CSS}</style>\n</head>\n'
                f'<body>\n{body}\n</body></html>\n')
        outp = os.path.join(DOCS, stem + ".html")
        io.open(outp, "w", encoding="utf-8").write(html)
        print(f"  {stem}.html  ({len(html)//1024} KB, {ok} diagrams rendered"
              + (f", {bad} FAILED" if bad else "") + ")")

    browser.close()

print(f"\n{total_ok} diagrams rendered, {total_fail} failed")
print(f"SVGs in {DIAG}")
