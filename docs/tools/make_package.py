"""Bundle the documentation folder into a single handover ZIP.

Output: <repo>/XRayVision_AI_FYP_Documentation.zip

Excludes build caches (node_modules, __pycache__) and the ZIP itself. Everything a student,
supervisor or examiner needs is inside: the Word submission copy, the PDFs, the Markdown
sources, the rendered HTML, the diagrams, the screenshots and the build scripts.
"""
import os
import zipfile

DOCS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(DOCS)
OUT = os.path.join(REPO, "XRayVision_AI_FYP_Documentation.zip")

SKIP_DIRS = {"node_modules", "__pycache__", ".pytest_cache", ".ipynb_checkpoints"}
SKIP_FILES = {".DS_Store", "Thumbs.db"}

# HANDOVER.md must be the first thing anyone sees when they open the archive.
FIRST = "HANDOVER.md"


def collect():
    found = []
    for root, dirs, files in os.walk(DOCS):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for f in sorted(files):
            if f in SKIP_FILES:
                continue
            full = os.path.join(root, f)
            if os.path.abspath(full) == os.path.abspath(OUT):
                continue
            rel = os.path.relpath(full, DOCS).replace(os.sep, "/")
            found.append((full, rel))
    # put the handover note first inside the archive
    found.sort(key=lambda p: (p[1] != FIRST, p[1]))
    return found


entries = collect()
raw = sum(os.path.getsize(f) for f, _ in entries)

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for full, rel in entries:
        z.write(full, arcname=f"XRayVision_AI_Documentation/{rel}")

packed = os.path.getsize(OUT)
print(f"packaged {len(entries)} files")
print(f"  uncompressed : {raw / 1048576:.1f} MB")
print(f"  zip          : {packed / 1048576:.1f} MB")
print(f"  written to   : {OUT}")

# Report what went in, grouped by top-level folder, so the contents are verifiable.
groups = {}
for _, rel in entries:
    top = rel.split("/")[0] if "/" in rel else "(root)"
    groups[top] = groups.get(top, 0) + 1
print("\ncontents:")
for k in sorted(groups):
    print(f"  {k:<16} {groups[k]:>3} files")
