"""Rasterise every diagram SVG to a print-quality PNG for the bound thesis."""
import os, io, re, glob, json
from playwright.sync_api import sync_playwright

DIAG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "diagrams")
# Set CHROME_PATH only if Playwright cannot find its bundled Chromium.
CHROME = os.environ.get("CHROME_PATH") or None
SCALE = 3  # ~300 dpi equivalent for print

svgs = sorted(glob.glob(os.path.join(DIAG, "*.svg")))
print(f"{len(svgs)} SVGs to rasterise at {SCALE}x")

meta = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, **({"executable_path": CHROME} if CHROME else {}))
    ctx = b.new_context(device_scale_factor=SCALE)
    page = ctx.new_page()

    for sp in svgs:
        svg = io.open(sp, encoding="utf-8").read()
        # Mermaid emits width="100%" + a max-width style; pin the real size from the viewBox
        # so the diagram rasterises at its natural dimensions instead of collapsing.
        vb = re.search(r'viewBox="\s*(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"', svg)
        if not vb:
            raise SystemExit(f"no viewBox in {sp}")
        vw, vh = float(vb.group(3)), float(vb.group(4))
        svg = re.sub(r'\swidth="100%"', f' width="{vw:.0f}"', svg, count=1)
        svg = re.sub(r'style="max-width:[^"]*"', f'style="max-width:none"', svg, count=1)
        if ' height="' not in svg.split('>')[0]:
            svg = svg.replace('<svg ', f'<svg height="{vh:.0f}" ', 1)
        html = f"""<!doctype html><html><head><style>
        html,body{{margin:0;padding:0;background:#fff}}
        #box{{display:inline-block;padding:16px;background:#fff}}
        #box svg{{max-width:none !important;display:block}}
        </style></head><body><div id="box">{svg}</div></body></html>"""
        page.set_content(html)
        page.wait_for_timeout(350)
        box = page.locator("#box")
        bb = box.bounding_box()
        out = sp.replace(".svg", ".png")
        box.screenshot(path=out)
        w, h = int(bb["width"]), int(bb["height"])
        meta.append({"png": os.path.basename(out), "css_w": w, "css_h": h,
                     "kb": os.path.getsize(out) // 1024})
        print(f"  {os.path.basename(out):<32} {w}x{h} css  {os.path.getsize(out)//1024:>4} KB")

    b.close()

io.open(os.path.join(DIAG, "_diagram-sizes.json"), "w", encoding="utf-8").write(
    json.dumps(meta, indent=1))
print(f"\nwrote {len(meta)} PNGs + _diagram-sizes.json")
