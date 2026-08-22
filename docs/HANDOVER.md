# Handover — Read This First

**XRayVision AI — FYP documentation package**
Muhammad Ali Raza (2022F-MUL-BSSWE-017) · Hamza Afzal (2022F-MUL-BSSWE-027)
Supervisor: Maam Misbah · School of Software Engineering, Minhaj University Lahore

---

## 1. What you have

| Folder / file | What it is |
|---|---|
| **`XRayVision_AI_Thesis.docx`** | **The submission copy.** Formatted for binding. |
| `pdf/` | All 8 documents pre-printed to A4 PDF, page-numbered |
| `01-SRS.md` … `06-Simple-Guide.md` | The source documents — **edit these** |
| `*.html` | Same documents for reading in a browser, diagrams already rendered |
| `diagrams/` | 25 diagrams as SVG (vector) and PNG (print) — paste into slides or a poster |
| `screenshots/` | 19 screenshots from the live app |
| `tools/` | Scripts that regenerate everything |
| **`06-Simple-Guide.md`** | **Plain-language explanation** of the whole project and every technology in it, plus likely viva questions. Read this if any of the stack is unfamiliar. |
| `README.md` | Full index — read it after this page |

---

## 2. Do these five things

1. **Open `XRayVision_AI_Thesis.docx` in Word. Click the Table of Contents and press F9** →
   *Update entire table*. The contents page is intentionally empty until you do this — Word fills in
   the page numbers.
2. **Sign the Certificate of Approval and the Declaration of Originality.** The signature blocks are
   blank and waiting.
3. **Compare against your department's thesis template.** Certificate wording, logo placement and
   font rules differ between departments. Everything here is plain Word formatting, so adjust freely.
4. **Read Chapter 6 before your viva.** It reports that 17 of 93 test cases were executed and that
   three defects were found. Two are now fixed; one (DEF-03) is not. Know what it says — an examiner
   who reads it will ask.
5. **Fix DEF-03 if you can.** Root cause is identified in Chapter 6: the deployed backend was loading
   the generic COCO checkpoint `yolov8n.pt` (which has a `vase` class) instead of
   `models/fracture_yolov8.pt`. Correct `YOLO_WEIGHTS_PATH` on the deployed Space.

---

## 3. Do not do these

- **Do not edit the `.docx` and the `.md` both.** The `.md` files are the source; the `.docx`, `.html`
  and PDFs are generated from them. If you edit the Word file directly, stop rebuilding — or your
  edits get overwritten. Pick one and stick to it.
- **Do not panic if the diagrams look blank in VS Code.** VS Code cannot render Mermaid on its own.
  Open the `.html` file instead, or install the free extension `bierner.markdown-mermaid`.
- **Do not submit `pdf/05-Thesis-browser-edition.pdf` as the thesis.** It is the browser version — no
  binding margin, no paginated contents. Export the real PDF from the `.docx` after step 2.1 above.

---

## 4. If you change the documents

```bash
cd tools
pip install playwright && python -m playwright install chromium
npm install

python build_html.py              # Markdown -> HTML + diagrams/*.svg
python render_diagrams_png.py     # SVG -> print-quality PNG
node build_thesis_docx.js         # Thesis Markdown -> Word
python build_pdf.py               # HTML -> A4 PDFs
```

Then repeat step 2.1 (F9 in Word). Full details in [`tools/README.md`](tools/README.md).

---

## 5. Honest status

The documents describe the system accurately, and where something is unverified or broken they say
so rather than glossing over it:

- **93 test cases are specified; 17 were executed** against the live deployment, with screenshot
  evidence. The other 76 are written up and ready to run, but they have **not** been run. Do not
  present them as passing.
- **Three defects were found.** DEF-01 (`.env` tracked in git) and DEF-02 (backend README
  contradicting the code) are fixed. **DEF-03 is open** — see item 5 above.
- **Diagnostic accuracy was never validated.** The AI models are third-party pretrained artefacts
  used as supplied. The thesis makes no clinical accuracy claim, and you should not make one either.

If you run the remaining tests or fix DEF-03, update Chapter 6 and §16.1 of the test document, then
rebuild.

---

*Educational use only. XRayVision AI is not a certified medical device.*
