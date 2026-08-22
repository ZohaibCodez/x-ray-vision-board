"""Print every generated HTML document to an A4 PDF.

Input : docs/*.html  (produced by build_html.py)
Output: docs/pdf/*.pdf

Note on the thesis: this produces the *browser edition* PDF. The official bound copy should be
exported from XRayVision_AI_Thesis.docx in Word (press F9 on the contents field first), which
carries the Times New Roman / 1.5-spacing / binding-margin formatting and real contents pagination.
"""
import os
from playwright.sync_api import sync_playwright

DOCS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(DOCS, "pdf")
# Set CHROME_PATH only if Playwright cannot find its bundled Chromium.
CHROME = os.environ.get("CHROME_PATH") or None

FILES = [
    ("HANDOVER.html", "00-START-HERE-Handover.pdf"),
    ("06-Simple-Guide.html", "01-Project-Explained-Simply.pdf"),
    ("README.html", "02-Documentation-Index.pdf"),
    ("01-SRS.html", "03-Software-Requirements-Specification.pdf"),
    ("02-SDD.html", "04-Software-Design-Document.pdf"),
    ("03-Test-Cases.html", "05-Test-Documentation.pdf"),
    ("04-User-Manual.html", "06-User-Manual.pdf"),
    ("05-Thesis.html", "07-Thesis-browser-edition.pdf"),
]

HEADER = '<div style="font-size:7pt;color:#888;width:100%;padding:0 14mm;">&nbsp;</div>'
FOOTER = (
    '<div style="font-size:8pt;color:#666;width:100%;padding:0 14mm;'
    'display:flex;justify-content:space-between;font-family:Arial,sans-serif;">'
    '<span>XRayVision AI &mdash; Minhaj University Lahore</span>'
    '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>'
    "</div>"
)

os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, **({"executable_path": CHROME} if CHROME else {}))
    page = browser.new_page()
    page.set_default_timeout(180000)

    for src, dst in FILES:
        path = os.path.join(DOCS, src)
        if not os.path.exists(path):
            print(f"  !! missing {src} — run build_html.py first")
            continue
        page.goto("file:///" + path.replace(os.sep, "/"), wait_until="load")
        page.wait_for_timeout(2500)
        # Force every lazy/async paint to settle before printing.
        page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        out = os.path.join(OUT, dst)
        page.pdf(
            path=out,
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template=HEADER,
            footer_template=FOOTER,
            margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
        )
        print(f"  {dst:<46} {os.path.getsize(out) // 1024:>6} KB")

    browser.close()

print(f"\nPDFs written to {OUT}")
