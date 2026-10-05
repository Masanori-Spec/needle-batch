"""Check actual Chromium PDF text and bounds; PNGs remain a visual review gate."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

def parse_embedded_fonts(fonts):
    rows = [line.split() for line in fonts.splitlines()[2:] if line.strip()]
    assert rows and all(len(row) >= 8 and row[-5] == 'yes' for row in rows), 'PDF contains an unembedded font'
    return rows


if __name__ == '__main__':
    pdf = Path(sys.argv[1])
    manifest = json.loads(Path(sys.argv[2]).read_text())
    raw = pdf.read_bytes()
    assert raw.startswith(b'%PDF-') and len(raw) > 1000
    text = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-'], text=True)
    compact = lambda value: re.sub(r'\s+', '', value)
    normalized = compact(text)
    required = ['NeedleBatch', 'Fixed-order loading checklist',
                f"Minimum replacements: {manifest['minimumChanges']}",
                'No physical sewout, safety or elapsed-time guarantee.']
    for job in manifest['jobs']:
        required += [job['sourceName'], job['outputName'],
                     ' → '.join(f'N{n}' for n in job['needleSequence'][:120]),
                     f"Original STOPs retained: {job['stopCount']}"]
        required += [f"N{change['number']}: {change['from'] or '空 / empty'} → {change['to']}"
                     for change in job['changes']]
    for value in required:
        assert compact(value) in normalized, f'Printed text missing: {value}'
    assert '糸交換チェックリスト' in normalized, 'Japanese checklist title missing'
    bbox = subprocess.check_output(['pdftotext', '-bbox', str(pdf), '-'])
    tree = ET.fromstring(bbox)
    pages = tree.findall('.//{*}page')
    assert 1 <= len(pages) <= 12, f'Unexpected canonical checklist pagination: {len(pages)}'
    word_count = 0
    for page in pages:
        width, height = float(page.attrib['width']), float(page.attrib['height'])
        words = page.findall('.//{*}word')
        assert words, 'Blank print page'
        for word in words:
            x0, x1 = float(word.attrib['xMin']), float(word.attrib['xMax'])
            y0, y1 = float(word.attrib['yMin']), float(word.attrib['yMax'])
            assert -0.5 <= x0 < x1 <= width + 0.5, 'Text outside horizontal page bounds'
            assert -0.5 <= y0 < y1 <= height + 0.5, 'Text outside vertical page bounds'
            word_count += 1
    fonts = subprocess.check_output(['pdffonts', str(pdf)], text=True)
    # Older Poppler releases omit Type 3 font family names. Require embedding and
    # Unicode text fidelity rather than a backend-specific display name.
    pdf.with_name('pdf-fonts.txt').write_text(fonts)
    font_rows = parse_embedded_fonts(fonts)
    for japanese in ['糸交換チェックリスト', '全針の状態', '元の停止命令を保持', '実機での安全性']:
        assert compact(japanese) in normalized, f'Japanese printed text missing: {japanese}'
    report = {'passed': True, 'pdf': pdf.name,
              'sha256': hashlib.sha256(raw).hexdigest(), 'pages': len(pages),
              'wordsWithinPageBounds': word_count, 'expectedTextChecks': len(required),
              'japaneseTextAndEmbeddedFontsPresent': True,
              'embeddedFontRows': len(font_rows),
              'scope': 'Actual downloaded checklist printed by sandboxed Chromium. '
                       'Text/bounds checks do not replace reviewing the rendered PNG pages.'}
    pdf.with_name('print-results.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
