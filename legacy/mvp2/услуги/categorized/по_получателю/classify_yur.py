# -*- coding: utf-8 -*-
"""Classify юр.лицо services into 12 top-level groups (+ подгруппы внутри Ведомства/Земля).

Переиспользует fine-grained классификатор из classify_fiz (CODE_OVERRIDE, mvd_rule,
BODY_MAP) и добавляет ведомства, которых нет в физ.лицо. Отличия финальной раскладки
от физ.лицо: нет «Семья и дети» (для юр.лиц таких услуг нет), вместо неё топ-уровнем
стоит «Лицензии и разрешения» — крупнейшая категория для бизнеса.
"""
import csv
from collections import Counter

import classify_fiz as cf

SRC = 'все_услуги_юр_лицо.csv'
OUT = 'все_услуги_юр_лицо_сгруппировано.csv'

G_TRANSP_YUR = 'Транспорт'                  # без «и права»: водительских прав у юр.лиц нет
G_DOCS_YUR   = 'Документы и аккредитация'   # аккредитационные карты МИД, домовые книги

# ведомства, встречающиеся только в юр.лицо
cf.BODY_MAP.extend([
    ('АВИАТСИЯИ ГРАЖДАН', cf.G_TRANSP),
    ('ГЕОЛОГИЯ', cf.G_ECO),
    ('БЕҲДОШТИ ЗАМИН ВА ОБЁР', cf.G_AGRO),
])

# Правительство РТ, коды 000001-000007: разрешения на недропользование
# (поиск/оценка, коллекции минералов, нефть/газ, уголь, прочие недра, отходы)
for c in ['000001', '000002', '000003', '000004', '000005', '000006', '000007']:
    cf.CODE_OVERRIDE[c] = cf.G_LIC

# ---- final 12-group layout (юр.лицо) ----
FINAL_MAP = {
    cf.G_ARCH:    (cf.G_LAND,  cf.G_ARCH),
    cf.G_ECO:     (cf.G_VEDOM, cf.G_ECO),
    cf.G_AGRO:    (cf.G_VEDOM, cf.G_AGRO),
    cf.G_CUSTOMS: (cf.G_VEDOM, cf.G_CUSTOMS),
    cf.G_TRANSP:  (G_TRANSP_YUR, ''),
    cf.G_DOCS:    (G_DOCS_YUR, ''),
}

def main():
    with open(SRC, encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = [r for r in reader if any(c.strip() for c in r)]

    CODE, BODY, NAME = 3, 0, 4
    out_rows, unmatched = [], []
    dist, sub_dist = Counter(), Counter()
    for r in rows:
        g = cf.classify(r[CODE], r[BODY], r[NAME])
        if g is None:
            unmatched.append(r)
            g = cf.G_OTHER
        top, sub = FINAL_MAP.get(g, (g, ''))
        dist[top] += 1
        if sub:
            sub_dist[(top, sub)] += 1
        out_rows.append([top, sub] + r)

    with open(OUT, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Группа', 'Подгруппа'] + header)
        w.writerows(out_rows)

    print('TOTAL:', len(out_rows), '| групп:', len(dist))
    for g, n in dist.most_common():
        print(f'  {n:4d}  {g}')
        for (top, sub), m in sub_dist.most_common():
            if top == g:
                print(f'          {m:4d}  └ {sub}')
    if unmatched:
        print('\n!!! UNMATCHED bodies:')
        seen = set()
        for r in unmatched:
            if r[BODY] not in seen:
                seen.add(r[BODY]); print('   ', r[BODY])

if __name__ == '__main__':
    main()
