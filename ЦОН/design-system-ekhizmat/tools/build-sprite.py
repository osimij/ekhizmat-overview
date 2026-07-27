#!/usr/bin/env python3
"""Пересобрать assets/icons.svg из экспорта Figma (§4.3).

Как пользоваться:
  1. В Figma «eKhizmat — Design System — Screens» выделить фрейм Icons
     (node 15-4) и экспортировать в SVG как tools/icons-frame.svg.
  2. python3 tools/build-sprite.py

Почему так, а не «сохранить каждую иконку отдельно»: экспорт фрейма держит
все пути в АБСОЛЮТНЫХ координатах фрейма и раскладывает иконки по сетке 44px,
не трогая transform у групп. Поэтому мы не переписываем path data (риск
испортить геометрию), а даём каждому <symbol> свой viewBox по его ячейке —
геометрия нетронута, stroke не масштабируется.

Позиции ячеек взяты из get_metadata(node 15:4) — это источник правды,
а не догадка о порядке раскладки.

Скрипт падает, если:
  · имена в экспорте разошлись со списком §4.3;
  · иконка стоит не в своей ячейке;
  · в спрайте остался литеральный цвет;
  · результат не парсится как XML (см. историю: вложенный <g> в girih-tile
    делал нечитаемыми все 25 символов после него).
"""
import re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'icons-frame.svg'
OUT = HERE.parent / 'assets' / 'icons.svg'
CELL = 24

# name -> (x, y), transcribed from get_metadata(fileKey=E0E7fpRFpfvH4cavtI2eyy,
# nodeId=15:4). Order here is also the sprite's emit order.
POS = {
    'logo': (0, 0), 'search': (44, 0), 'fire': (88, 0), 'bell': (132, 0),
    'globe': (176, 0), 'moon': (220, 0), 'sun': (264, 0), 'biz': (308, 0),
    'baby': (352, 0), 'rings': (396, 0), 'move': (440, 0), 'job': (484, 0),
    'retire': (528, 0), 'shield': (572, 0), 'wallet': (616, 0), 'doc': (660, 0),
    'qr': (704, 0), 'check': (748, 0), 'chev-d': (792, 0), 'chev-r': (836, 0),
    'chev-l': (0, 44), 'clock': (44, 44), 'chat': (88, 44), 'star8': (132, 44),
    'cat-health': (176, 44), 'cat-cert': (220, 44), 'cat-transport': (264, 44),
    'cat-family': (308, 44), 'cat-edu': (352, 44), 'cat-passport': (396, 44),
    'cat-tax': (440, 44), 'cat-land': (484, 44), 'cat-other': (528, 44),
    'cat-gov': (572, 44), 'cat-justice': (616, 44), 'cat-culture': (660, 44),
    'cat-license': (704, 44), 'cat-accred': (748, 44), 'lock': (792, 44),
    'eye': (836, 44),
    'out': (0, 88), 'call': (44, 88), 'mail': (88, 88), 'pin': (132, 88),
    'girih-tile': (176, 88), 'plus': (220, 88), 'user-add': (264, 88),
    'users': (308, 88), 'filter': (352, 88), 'sort': (396, 88), 'gear': (440, 88),
    'edit': (484, 88), 'trash': (528, 88), 'download': (572, 88),
    'upload': (616, 88), 'calendar': (660, 88), 'dash': (704, 88),
    'inbox': (748, 88), 'dots': (792, 88), 'role': (836, 88),
    'building': (0, 132), 'history': (44, 132), 'money': (88, 132),
    'arrow-ur': (132, 132), 'info': (176, 132), 'paperclip': (220, 132),
    'card': (264, 132), 'sign': (308, 132), 'x': (352, 132), 'refresh': (396, 132),
}

if not SRC.exists():
    sys.exit(f'нет {SRC.name} — сначала выгрузите фрейм Icons (node 15-4) из Figma '
             f'в SVG и положите сюда: {SRC}')

src = SRC.read_text(encoding='utf-8')

TAG = re.compile(r'<g\b|</g>')

def extract(src):
    """Pull each <g id="Icon/NAME"> ... </g> block, matching </g> by depth.

    A non-greedy regex to the first </g> is WRONG here: at least one icon
    (girih-tile) wraps its paths in a nested <g>, so the naive match truncates
    the body and leaves an unbalanced tag -- which makes the whole sprite
    unparseable from that symbol onward.
    """
    out = []
    for m in re.finditer(r'<g id="Icon/([^"]+)"[^>]*>', src):
        depth, i = 1, m.end()
        while depth:
            t = TAG.search(src, i)
            if not t:
                sys.exit(f'unbalanced <g> in {m.group(1)}')
            depth += 1 if t.group(0) == '<g' else -1
            i = t.end()
        out.append((m.group(1), src[m.end():i - len('</g>')]))
    return out

blocks = extract(src)

names = [n for n, _ in blocks]
if set(names) != set(POS):
    sys.exit(f'export/metadata mismatch\n  only in export: {set(names) - set(POS)}'
             f'\n  only in metadata: {set(POS) - set(names)}')
if len(names) != len(set(names)):
    sys.exit('duplicate icon names in export')

# A path's leading moveto is the one number pair we can read without a full path
# parser: 'M'/'m' as the first command is absolute either way. Later commands are
# not safely parseable this way (arcs carry radii+flags, lowercase carry deltas),
# so this checks placement only -- which is exactly what could go wrong here.
LEAD = re.compile(r'^\s*[Mm]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)')

symbols, problems = [], []

for name, body in blocks:
    x, y = POS[name]

    for d in re.findall(r'\sd="([^"]+)"', body):
        m = LEAD.match(d)
        if not m:
            problems.append(f'{name}: path does not start with a moveto')
            continue
        px, py = float(m.group(1)), float(m.group(2))
        # 1px of slack absorbs stroke overshoot and exporter rounding.
        if not (x - 1 <= px <= x + CELL + 1 and y - 1 <= py <= y + CELL + 1):
            problems.append(f'{name}: starts at ({px}, {py}), cell is ({x}, {y})')

    # Theme-ability: the sprite must carry no literal colour (§11.2 "никаких
    # hex в компонентах"). #1B1D20 is the exporter's ink, not a design decision.
    body = re.sub(r'(stroke|fill)="#1B1D20"', r'\1="currentColor"', body)
    body = re.sub(r'\sid="Vector[^"]*"', '', body)          # exporter noise
    body = re.sub(r'\sclip-path="url\([^)]*\)"', '', body)  # == cell bounds; viewBox already crops
    body = re.sub(r'\n\s*\n', '\n', body).strip()

    symbols.append(f'  <symbol id="i-{name}" viewBox="{x} {y} {CELL} {CELL}">\n'
                   + '\n'.join('    ' + l.strip() for l in body.split('\n'))
                   + '\n  </symbol>')

if problems:
    sys.exit('validation failed:\n  ' + '\n  '.join(problems))

leftover = set(re.findall(r'#[0-9A-Fa-f]{6}', '\n'.join(symbols)))
if leftover:
    sys.exit(f'literal colours survived: {leftover}')

out = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<!-- eKhizmat — АРМ ЦОН · спрайт иконок (§4.3)\n'
    '     Источник: Figma «eKhizmat — Design System — Screens», node 15-2 → 15-4.\n'
    '     Hugeicons 24×24, stroke 1.5. Цвет — currentColor, размер — класс .icon.\n'
    '     Использование: <svg class="icon"><use href="assets/icons.svg#i-qr"/></svg>\n'
    '     СГЕНЕРИРОВАНО скриптом из Figma — не править руками. -->\n'
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n'
    + '\n'.join(symbols) + '\n</svg>\n')

# The sprite is only useful if a browser can PARSE it: an XML error makes every
# symbol after the fault silently unresolvable, which looks like "some icons are
# just missing". Parse it here so that failure never reaches the page.
try:
    root = ET.fromstring(out)
except ET.ParseError as e:
    sys.exit(f'generated sprite is not well-formed XML: {e}')

parsed = [el.get('id') for el in root.iter('{http://www.w3.org/2000/svg}symbol')]
if len(parsed) != len(POS):
    sys.exit(f'parsed {len(parsed)} symbols, expected {len(POS)}')

OUT.write_text(out, encoding='utf-8')
print(f'ok — {len(parsed)} символов разобрано и записано -> {OUT}')
