# -*- coding: utf-8 -*-
"""Интерактивный mindmap (markmap HTML): 12 групп физ.лицо -> услуги (рус. названия из xlsx)."""
import csv, re, openpyxl

XLSX = '../../Феҳристи_хизматрасониҳои_давлатӣ_бо_за_бони_руссӣ.xlsx'
SRC  = 'все_услуги_физ_лицо_сгруппировано.csv'
OUT  = 'mindmap_физ_лицо.html'
RU_FROM, RU_TO = 1224, 2415   # русская половина файла

GROUP_ORDER = [
    'Здоровье', 'Справки и выписки', 'Транспорт и права', 'Семья и дети',
    'Образование', 'Документы и паспорт', 'Налоги и штрафы', 'Земля и недвижимость',
    'Юстиция и нотариат', 'Культура, спорт, туризм', 'Ведомства', 'Прочее',
]

def norm(v):
    return '' if v is None else ' '.join(str(v).split())

def ru_names():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb['Лист1']
    names = {}
    for r in range(RU_FROM, RU_TO + 1):
        code = norm(ws.cell(r, 2).value)
        if re.fullmatch(r'\d+', code):
            names[code] = norm(ws.cell(r, 3).value)
    return names

def esc(s):
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return re.sub(r'([*_`\[\]])', r'\\\1', s)

def main():
    names = ru_names()
    # группа -> подгруппа ('' = напрямую в группе) -> [(код, название)]
    tree, missing = {}, 0
    with open(SRC, encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if not any(c.strip() for c in row):
                continue
            grp, sub, code, tj_name = row[0], row[1], row[5], row[6]
            name = names.get(code)
            if not name:
                name, missing = tj_name, missing + 1
            tree.setdefault(grp, {}).setdefault(sub, []).append((code, name))

    lines = []
    total = sum(len(v) for subs in tree.values() for v in subs.values())
    lines.append(f'# Услуги для физических лиц ({total})')
    for grp in GROUP_ORDER:
        subs = tree.get(grp, {})
        n = sum(len(v) for v in subs.values())
        lines.append(f'## {esc(grp)} ({n})')
        for code, name in subs.get('', []):
            lines.append(f'- {code} · {esc(name)}')
        for sub in sorted(s for s in subs if s):
            lines.append(f'### {esc(sub)} ({len(subs[sub])})')
            for code, name in subs[sub]:
                lines.append(f'- {code} · {esc(name)}')
    md = '\n'.join(lines)

    html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mindmap — услуги для физических лиц</title>
<style>
  html, body {{ margin: 0; height: 100%; }}
  .markmap {{ position: absolute; inset: 0; }}
  .markmap > svg {{ width: 100%; height: 100%; }}
</style>
</head>
<body>
<div class="markmap">
<script type="text/template">
---
markmap:
  initialExpandLevel: 2
  colorFreezeLevel: 2
  maxWidth: 420
  spacingVertical: 6
---
{md}
</script>
</div>
<script>window.markmap = {{ autoLoader: {{ toolbar: true }} }};</script>
<script src="https://cdn.jsdelivr.net/npm/markmap-autoloader@0.18"></script>
</body>
</html>'''
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'OK: {OUT} | услуг: {total} | без рус. названия (тадж. fallback): {missing}')

if __name__ == '__main__':
    main()
