"""Build only the brand glyphs from the supplied V1 vector artwork.

Usage: python3 scripts/build-v1-wordmark-font.py /path/to/client-logo.pdf
Requires PyMuPDF and fonttools[woff]. This is not a full GT America font.
"""
import sys
from pathlib import Path
import fitz
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

document = fitz.open(sys.argv[1])
drawings = document[4].get_drawings()
# Drawing IDs and advances preserve the V1 headline's overlapping spacing.
letters = {'n': (5, 98.70), 'e': (7, 89.88), 'w': (2, 164.68),
           'o': (6, 100.71), 'r': (8, 75.53), 'k': (4, 106.15), '.': (9, 35.90)}
glyphs = {}
metrics = {}
for char, (index, advance) in letters.items():
    drawing = drawings[index]
    origin = drawing['rect'].x0
    def point(p):
        return ((p.x - origin) * 4, (569.56 - p.y) * 4)
    pen = TTGlyphPen(None)
    curves = Cu2QuPen(pen, max_err=0.5, reverse_direction=True)
    current = None
    for item in drawing['items']:
        kind = item[0]
        if kind == 're':
            r = item[1]
            if current is not None:
                curves.closePath()
            curves.moveTo(point(r.tl))
            for p in (r.tr, r.br, r.bl):
                curves.lineTo(point(p))
            curves.closePath()
            current = None
            continue
        if kind not in ('l', 'c'):
            raise ValueError(f'Unsupported PDF path: {kind}')
        start = point(item[1])
        if current != start:
            if current is not None:
                curves.closePath()
            curves.moveTo(start)
        if kind == 'l':
            curves.lineTo(point(item[2]))
        else:
            curves.curveTo(*(point(p) for p in item[2:]))
        current = point(item[-1])
    if current is not None:
        curves.closePath()
    glyphs[char] = pen.glyph()
    metrics[char] = (round(advance * 4), 0)
for name, width in [('.notdef', 500), ('space', 112)]:
    glyphs[name] = TTGlyphPen(None).glyph()
    metrics[name] = (width, 0)
font = FontBuilder(1000, isTTF=True)
font.setupGlyphOrder(['.notdef', 'space', *letters])
font.setupCharacterMap({32: 'space', **{ord(c): c for c in letters}})
font.setupGlyf(glyphs)
font.setupHorizontalMetrics(metrics)
font.setupHorizontalHeader(ascent=800, descent=-100)
font.setupNameTable({'familyName': 'New Work V1 Artwork', 'styleName': 'Black',
                    'uniqueFontIdentifier': 'NewWorkV1Artwork-Black-1',
                    'fullName': 'New Work V1 Artwork Black',
                    'psName': 'NewWorkV1Artwork-Black', 'version': 'Version 1.0'})
font.setupOS2(sTypoAscender=800, sTypoDescender=-100, usWinAscent=800,
             usWinDescent=100, usWeightClass=900)
font.setupPost()
font.font.flavor = 'woff2'
root = Path(__file__).resolve().parents[1]
font.save(root / 'public/media/brand/new-work-v1-artwork.woff2')

# Keep the video mask in step with the live title glyphs and .74em leading.
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
glyph_set = font.font.getGlyphSet()
paths = []
all_bounds = []
for word, baseline in [('new', 800), ('work', 1540)]:
    x = 0
    for char in word:
        transform = (1, 0, 0, -1, x, baseline)
        svg = SVGPathPen(glyph_set)
        glyph_set[char].draw(TransformPen(svg, transform))
        paths.append(f'<path d="{svg.getCommands()}"/>')
        bounds = BoundsPen(glyph_set)
        glyph_set[char].draw(TransformPen(bounds, transform))
        all_bounds.append(bounds.bounds)
        x += metrics[char][0]
left = min(b[0] for b in all_bounds)
top = min(b[1] for b in all_bounds)
right = max(b[2] for b in all_bounds)
bottom = max(b[3] for b in all_bounds)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} {top} {right-left} {bottom-top}">' + ''.join(paths) + '</svg>'
(root / 'public/media/brand/new-work-v1-mask.svg').write_text(svg)
