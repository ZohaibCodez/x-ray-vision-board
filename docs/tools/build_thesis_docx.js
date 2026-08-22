/* Build the bound-thesis .docx from docs/05-Thesis.md
 * A4, Times New Roman 12pt, 1.5 spacing, 1.5" binding margin,
 * roman front matter / arabic body, auto Table of Contents field.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Footer, AlignmentType, LevelFormat, TableOfContents,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber,
  PageBreak, NumberFormat, VerticalAlign,
} = require("docx");

const DOCS = path.resolve(__dirname, "..");
const SRC = path.join(DOCS, "05-Thesis.md");
const OUT = path.join(DOCS, "XRayVision_AI_Thesis.docx");

// ── Page geometry (A4, DXA) ──────────────────────────────────────────
const PAGE_W = 11906, PAGE_H = 16838;
const M_TOP = 1440, M_BOT = 1440, M_LEFT = 2160, M_RIGHT = 1440; // 1.5" binding edge
const CONTENT_DXA = PAGE_W - M_LEFT - M_RIGHT;                    // 8306
const MAX_IMG_PX = Math.floor((CONTENT_DXA / 1440) * 96);         // ≈553 px
const MAX_IMG_H = 640;

// ── PNG dimension reader (IHDR) ──────────────────────────────────────
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// ── Inline markdown → TextRun[] ──────────────────────────────────────
function inline(text, base = {}) {
  const runs = [];
  const re = /(\*\*\*.+?\*\*\*|\*\*.+?\*\*|(?<!\*)\*(?!\*).+?(?<!\*)\*(?!\*)|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m;
  const push = (t, extra) => { if (t) runs.push(new TextRun({ text: t, ...base, ...extra })); };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index), {});
    const tok = m[0];
    if (tok.startsWith("***")) push(tok.slice(3, -3), { bold: true, italics: true });
    else if (tok.startsWith("**")) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith("*")) push(tok.slice(1, -1), { italics: true });
    else if (tok.startsWith("`")) push(tok.slice(1, -1), { font: "Consolas", size: 20 });
    else { // [label](href) — keep the label only
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      push(lm ? lm[1] : tok, {});
    }
    last = m.index + tok.length;
  }
  push(text.slice(last), {});
  if (runs.length === 0) runs.push(new TextRun({ text: "", ...base }));
  return runs;
}

const clean = (s) => s.replace(/&nbsp;/g, " ").replace(/<!--.*?-->/g, "").trim();

// ── Table builder ────────────────────────────────────────────────────
const BD = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const BORDERS = { top: BD, bottom: BD, left: BD, right: BD };

function buildTable(rows) {
  const nCols = Math.max(...rows.map((r) => r.length));
  const colW = Math.floor(CONTENT_DXA / nCols);
  const widths = Array(nCols).fill(colW);
  widths[nCols - 1] = CONTENT_DXA - colW * (nCols - 1);

  return new Table({
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, ri) =>
      new TableRow({
        tableHeader: ri === 0,
        children: Array.from({ length: nCols }, (_, ci) =>
          new TableCell({
            borders: BORDERS,
            width: { size: widths[ci], type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            verticalAlign: VerticalAlign.TOP,
            shading: ri === 0 ? { fill: "E8EEF4", type: ShadingType.CLEAR } : undefined,
            children: [new Paragraph({
              spacing: { line: 240, before: 20, after: 20 },
              children: inline(clean(cells[ci] || ""), { size: 18, bold: ri === 0 }),
            })],
          })
        ),
      })
    ),
  });
}

// ── Markdown → docx children ─────────────────────────────────────────
function convert(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0, centered = false;
  // The first centred block is the title page: render it as plain text so it
  // does not appear as an entry in the generated Table of Contents.
  let onTitlePage = md.startsWith("<!-- center -->"), seenCenterEnd = false;

  const para = (children, opts = {}) => out.push(new Paragraph({
    spacing: { line: 360, before: 60, after: 120 },
    alignment: centered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    ...opts, children,
  }));

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // --- markers ---
    if (line === "<!-- pagebreak -->") { out.push(new Paragraph({ children: [new PageBreak()] })); i++; continue; }
    if (line === "<!-- center -->") { centered = true; i++; continue; }
    if (line === "<!-- endcenter -->") { centered = false; if (!seenCenterEnd) { seenCenterEnd = true; onTitlePage = false; } i++; continue; }
    if (line === "<!-- toc -->") {
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 320, after: 240 },
        children: [new TextRun({ text: "Table of Contents", bold: true, size: 32 })] }));
      out.push(new TableOfContents("Right-click and choose \u201CUpdate Field\u201D to build the contents.",
        { hyperlink: true, headingStyleRange: "1-3" }));
      i++; continue;
    }
    if (line === "" ) { i++; continue; }
    if (line === "&nbsp;") { out.push(new Paragraph({ children: [new TextRun("")] })); i++; continue; }
    if (/^---+$/.test(line)) {
      out.push(new Paragraph({ spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } },
        children: [new TextRun("")] }));
      i++; continue;
    }

    // --- image (+ optional caption on the following non-empty line) ---
    let im = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (im) {
      const rel = im[2];
      const file = path.join(DOCS, rel.split("/").join(path.sep));
      if (fs.existsSync(file)) {
        const sz = pngSize(file);
        let w = MAX_IMG_PX, h = 400;
        if (sz) {
          const scale = Math.min(MAX_IMG_PX / sz.w, MAX_IMG_H / sz.h, 1);
          w = Math.round(sz.w * scale); h = Math.round(sz.h * scale);
        }
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 },
          children: [new ImageRun({
            type: "png", data: fs.readFileSync(file),
            transformation: { width: w, height: h },
            altText: { title: im[1] || "Figure", description: im[1] || rel, name: path.basename(rel) },
          })],
        }));
      } else {
        out.push(new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `[missing image: ${rel}]`, italics: true, color: "B00020" })] }));
      }
      i++;
      // caption
      let j = i; while (j < lines.length && lines[j].trim() === "") j++;
      const cap = (lines[j] || "").trim();
      if (/^\*\*Figure/.test(cap)) {
        out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 },
          children: inline(clean(cap), { size: 20, italics: true }) }));
        i = j + 1;
      }
      continue;
    }

    // --- heading ---
    const hm = /^(#{1,4})\s+(.*)$/.exec(line);
    if (hm) {
      const lvl = hm[1].length;
      const txt = clean(hm[2]);
      if (onTitlePage) {
        out.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: lvl === 1 ? 400 : 240, after: 200, line: 320 },
          children: [new TextRun({ text: txt, bold: true, size: lvl === 1 ? 40 : 28 })],
        }));
        i++; continue;
      }
      const HL = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][lvl - 1];
      out.push(new Paragraph({
        heading: HL,
        alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: lvl === 1 ? 320 : 240, after: 160, line: 300 },
        children: [new TextRun(txt)],
      }));
      i++; continue;
    }

    // --- blockquote ---
    if (line.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, "")); i++;
      }
      const body = buf.join(" ").replace(/\s+/g, " ").trim();
      if (body) out.push(new Paragraph({
        spacing: { line: 320, before: 120, after: 160 },
        indent: { left: 480, right: 240 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: "0E7490", space: 8 } },
        children: inline(clean(body), { italics: true }),
      }));
      continue;
    }

    // --- fenced code ---
    if (line.startsWith("```")) {
      i++; const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) { buf.push(lines[i]); i++; }
      i++;
      buf.forEach((cl) => out.push(new Paragraph({
        spacing: { line: 240, before: 0, after: 0 },
        indent: { left: 360 },
        shading: { fill: "F4F6F8", type: ShadingType.CLEAR },
        children: [new TextRun({ text: cl || " ", font: "Consolas", size: 18 })],
      })));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));
      continue;
    }

    // --- table ---
    if (line.startsWith("|") && (lines[i + 1] || "").trim().startsWith("|") && /^\|[\s:\-|]+\|$/.test((lines[i + 1] || "").trim())) {
      const rows = [];
      const split = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      rows.push(split(lines[i])); i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(split(lines[i])); i++; }
      out.push(buildTable(rows));
      out.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun("")] }));
      continue;
    }

    // --- lists ---
    const bm = /^[-*]\s+(.*)$/.exec(line);
    const nm = /^(\d+)\.\s+(.*)$/.exec(line);
    if (bm || nm) {
      const ref = bm ? "bullets" : "numbers";
      while (i < lines.length) {
        const t = lines[i].trim();
        const b2 = /^[-*]\s+(.*)$/.exec(t), n2 = /^(\d+)\.\s+(.*)$/.exec(t);
        if (!b2 && !n2) {
          if (t === "" && /^([-*]|\d+\.)\s/.test((lines[i + 1] || "").trim())) { i++; continue; }
          break;
        }
        if ((b2 && ref !== "bullets") || (n2 && ref !== "numbers")) break;
        out.push(new Paragraph({
          numbering: { reference: ref, level: 0 },
          spacing: { line: 320, before: 40, after: 40 },
          children: inline(clean(b2 ? b2[1] : n2[2])),
        }));
        i++;
      }
      continue;
    }

    // --- paragraph (join wrapped lines) ---
    const buf = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (t === "" || /^(#{1,4}\s|\||>|```|!\[|<!--|---+$)/.test(t) || /^([-*]|\d+\.)\s/.test(t)) break;
      buf.push(t); i++;
    }
    const body = clean(buf.join(" ").replace(/\s+/g, " "));
    if (body) para(inline(body));
  }
  return out;
}

// ── Build ────────────────────────────────────────────────────────────
const md = fs.readFileSync(SRC, "utf8");
const SPLIT = "# Chapter 1: Introduction";
const at = md.indexOf(SPLIT);
if (at < 0) throw new Error("chapter split marker not found");

// The pagebreak marker immediately preceding Chapter 1 belongs to the front matter.
const frontMd = md.slice(0, at).replace(/<!--\s*pagebreak\s*-->\s*$/, "");
const bodyMd = md.slice(at);

const styles = {
  default: { document: { run: { font: "Times New Roman", size: 24 }, paragraph: { spacing: { line: 360 } } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 32, bold: true, font: "Times New Roman", color: "000000" },
      paragraph: { spacing: { before: 320, after: 200, line: 300 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 28, bold: true, font: "Times New Roman", color: "000000" },
      paragraph: { spacing: { before: 280, after: 160, line: 300 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 26, bold: true, font: "Times New Roman", color: "000000" },
      paragraph: { spacing: { before: 240, after: 140, line: 300 }, outlineLevel: 2 } },
    { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 24, bold: true, italics: true, font: "Times New Roman", color: "000000" },
      paragraph: { spacing: { before: 200, after: 120, line: 300 }, outlineLevel: 3 } },
  ],
};

const numbering = {
  config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ],
};

const pageProps = (fmt, start) => ({
  page: {
    size: { width: PAGE_W, height: PAGE_H },
    margin: { top: M_TOP, right: M_RIGHT, bottom: M_BOT, left: M_LEFT },
    pageNumbers: { start, formatType: fmt },
  },
});

const footer = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })],
  })],
});

const doc = new Document({
  styles, numbering,
  sections: [
    { properties: pageProps(NumberFormat.LOWER_ROMAN, 1), footers: { default: footer() },
      children: convert(frontMd) },
    { properties: pageProps(NumberFormat.DECIMAL, 1), footers: { default: footer() },
      children: convert(bodyMd) },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${OUT} (${Math.round(buf.length / 1024)} KB)`);
});
