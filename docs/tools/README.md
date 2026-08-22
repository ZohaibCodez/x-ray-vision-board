# Documentation Build Tools

These three scripts regenerate the published documentation from the Markdown sources. The Markdown
files in [`docs/`](..) are the **single source of truth** — edit those, then rebuild. Do not edit the
generated `.html` or `.docx` by hand, or your changes will be overwritten on the next build.

## What each script does

| Script | Input | Output |
|---|---|---|
| `build_html.py` | `docs/*.md` | `docs/*.html` (self-contained, diagrams inlined as SVG) and `docs/diagrams/*.svg` |
| `render_diagrams_png.py` | `docs/diagrams/*.svg` | `docs/diagrams/*.png` (3× scale, for print and Word) |
| `build_thesis_docx.js` | `docs/05-Thesis.md` | `docs/XRayVision_AI_Thesis.docx` |

## Prerequisites

```bash
# Python side — HTML rendering and diagram rasterisation
pip install playwright
python -m playwright install chromium

# Node side — Word document generation
cd docs/tools
npm install
```

`build_html.py` and `render_diagrams_png.py` drive a headless Chromium through Playwright.
`build_html.py` additionally loads `marked` and `mermaid` from a CDN, so it **needs an internet
connection** on the machine that runs it. The documents it produces do not — every diagram is baked
into the output as inline SVG.

If Playwright cannot find its bundled Chromium, point it at any Chromium or Chrome binary:

```bash
# Windows
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# macOS / Linux
export CHROME_PATH=/usr/bin/chromium
```

## Rebuilding

Run in this order — the PNG step depends on the SVGs the HTML step writes, and the Word step depends
on those PNGs.

```bash
cd docs/tools

python build_html.py              # 1. Markdown -> HTML, and writes diagrams/*.svg
python render_diagrams_png.py     # 2. SVG -> PNG for print
node build_thesis_docx.js         # 3. Thesis Markdown -> Word
```

If you only changed prose in `05-Thesis.md` and touched no diagrams, step 3 alone is enough.

## After rebuilding the thesis

Open `XRayVision_AI_Thesis.docx` in Word, click the Table of Contents, and press **F9** →
*Update entire table*. The contents field is generated empty by design; Word fills in the entries and
their page numbers. This has to be done in Word — no build script can compute page numbers.

## Authoring markers

`05-Thesis.md` uses three HTML-comment markers that both builders understand. They are invisible in
any plain Markdown viewer.

| Marker | Effect in Word | Effect in HTML |
|---|---|---|
| `<!-- pagebreak -->` | Hard page break | Page break when printed; a dashed rule on screen |
| `<!-- center -->` … `<!-- endcenter -->` | Centres the enclosed block | Centres the enclosed block |
| `<!-- toc -->` | Inserts the Table of Contents field | Inserts a note pointing to the Word edition |

The Word builder additionally treats the **first** centred block as the title page and renders its
headings as plain centred text, so the title does not appear as an entry in the Table of Contents.

## Formatting produced by the Word builder

A4 · 1.5 in left margin (binding edge), 1 in elsewhere · Times New Roman 12 pt · 1.5 line spacing ·
lower-case roman front matter pagination · arabic body pagination restarting at Chapter 1 · tables at
full content width with shaded, repeating header rows · figures centred with italic captions.

To change any of these, edit the constants at the top of `build_thesis_docx.js` (`PAGE_W`, `M_LEFT`,
the `styles` object) and rebuild. Departments differ on thesis formatting — check your template.
