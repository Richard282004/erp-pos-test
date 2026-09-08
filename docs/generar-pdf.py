#!/usr/bin/env python3
"""Regenera docs/MANUAL-USUARIO.pdf desde el .md.

Requiere:  pip install markdown xhtml2pdf
Uso:       python docs/generar-pdf.py
"""
import re
import sys
from pathlib import Path

import markdown
from xhtml2pdf import pisa

DOCS = Path(__file__).resolve().parent
src = DOCS / "MANUAL-USUARIO.md"
dst = DOCS / "MANUAL-USUARIO.pdf"

texto = src.read_text(encoding="utf-8")
# xhtml2pdf no tiene fuente con emoji: se quitan (son etiquetas decorativas).
texto = re.sub("[\U0001F000-\U0001FAFF☀-➿️‍]", "", texto)
texto = re.sub(r"[ \t]{2,}", " ", texto)

cuerpo = markdown.markdown(
    texto, extensions=["tables", "fenced_code", "sane_lists", "toc"]
)

CSS = """
@page { size: a4; margin: 2cm 1.8cm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; }
h1 { font-size: 20pt; border-bottom: 2px solid #333; padding-bottom: 4pt; margin: 0 0 12pt; }
h2 { font-size: 14pt; margin: 20pt 0 6pt; border-bottom: 1px solid #bbb; padding-bottom: 2pt; }
h3 { font-size: 11.5pt; margin: 14pt 0 4pt; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 8pt; }
li { margin: 0 0 3pt; }
code { font-family: Courier, monospace; font-size: 9pt; background: #f0f0f0; }
pre { background: #f4f4f4; padding: 6pt; font-size: 9pt; }
blockquote { border-left: 3px solid #999; margin: 0 0 8pt; padding: 2pt 0 2pt 10pt; color: #444; }
table { border-collapse: collapse; width: 100%; margin: 0 0 10pt; font-size: 9.5pt; }
th, td { border: 0.75pt solid #999; padding: 4pt 6pt; text-align: left; vertical-align: top; }
th { background: #ececec; }
"""

html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{cuerpo}</body></html>"
with dst.open("wb") as f:
    res = pisa.CreatePDF(html, dest=f, encoding="utf-8")
print("OK" if not res.err else "ERROR")
sys.exit(1 if res.err else 0)
