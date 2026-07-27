# -*- coding: utf-8 -*-
"""Classify физ.лицо services into 12 top-level groups (+ подгруппы внутри Ведомства/Прочее)."""
import csv, sys

SRC = 'все_услуги_физ_лицо.csv'
OUT = 'все_услуги_физ_лицо_сгруппировано.csv'

G_HEALTH   = 'Здоровье'
G_SPRAVKI  = 'Справки и выписки'
G_TRANSP   = 'Транспорт и права'
G_FAMILY   = 'Семья и дети'
G_EDU      = 'Образование'
G_DOCS     = 'Документы и паспорт'
G_TAX      = 'Налоги и штрафы'
G_LAND     = 'Земля и недвижимость'
G_ARCH     = 'Архитектура и строительство'
G_ECO      = 'Экология и природа'
G_AGRO     = 'Сельское хозяйство'
G_JUST     = 'Юстиция и нотариат'
G_LIC      = 'Лицензии и разрешения'
G_CUSTOMS  = 'Таможня'
G_CULTURE  = 'Культура, спорт, туризм'
G_VEDOM    = 'Ведомства'
G_OTHER    = 'Прочее'

# ---- final 12-group layout ----
# Fine-grained group -> (top-level group, подгруппа).
# Specialized agency domains fold into «Ведомства»; лицензирование — into «Прочее»;
# архитектура — into «Земля и недвижимость».
FINAL_MAP = {
    G_ARCH:    (G_LAND,  G_ARCH),
    G_ECO:     (G_VEDOM, G_ECO),
    G_AGRO:    (G_VEDOM, G_AGRO),
    G_CUSTOMS: (G_VEDOM, G_CUSTOMS),
    G_LIC:     (G_OTHER, G_LIC),
}

# ---- per-code overrides (win over everything) ----
CODE_OVERRIDE = {}

# МВД tricky codes
CODE_OVERRIDE['000169'] = G_DOCS      # принадлежность к гражданству (misspelled, escapes kw)
CODE_OVERRIDE['000183'] = G_TRANSP    # акт проверки станций тех.помощи (truncated, no kw)
CODE_OVERRIDE['000187'] = G_TRANSP    # талон технический

# Юстиция: ЗАГС / семейные акты -> Семья и дети (rest of Адлия -> Юстиция)
for c in ['000045','000046','000047','000048','000049','000050','000051',
          '000080','000081','000082','000083','000102','000103','000113']:
    CODE_OVERRIDE[c] = G_FAMILY

# МИД: апостиль и легализация -> Юстиция (rest of МИД -> Документы)
CODE_OVERRIDE['000241'] = G_JUST
CODE_OVERRIDE['000267'] = G_JUST

# Минэкономики/торговли: дефолт = Налоги/регистрация (рег. интеллект. собственности),
# кроме лицензий и регистрации диссертаций
CODE_OVERRIDE['000380'] = G_LIC       # лицензия патентного поверенного
CODE_OVERRIDE['000381'] = G_LIC       # экспортный контроль двойного назначения
CODE_OVERRIDE['000400'] = G_EDU       # гос.регистрация канд./докт. диссертаций

# Минздрав: соц.защита / прочее
CODE_OVERRIDE['000447'] = G_FAMILY    # справка о составе семьи
CODE_OVERRIDE['000448'] = G_SPRAVKI   # справка о доходах семьи
CODE_OVERRIDE['000449'] = G_ECO       # утилизация пестицидов
CODE_OVERRIDE['000450'] = G_ECO       # хранение металлолома

# Комитет пищевой безопасности: человеческая мед.лицензия -> Здоровье
CODE_OVERRIDE['000555'] = G_HEALTH

# Минфин: пробирный надзор (оценка драгметаллов/камней) -> Прочее; налог.резидентство -> Налоги
for c in ['000300','000301','000302','000303','000304','000305','000306','000307',
          '000308','000309','000310','000311','000312','000313','000314','000315','000318']:
    CODE_OVERRIDE[c] = G_OTHER
CODE_OVERRIDE['000316'] = G_TAX       # сертификат налогового резидентства

# Комитет по языку: имянаречение -> Семья, учебники -> Образование, прочее -> Прочее
CODE_OVERRIDE['000586'] = G_FAMILY
CODE_OVERRIDE['000587'] = G_FAMILY
CODE_OVERRIDE['000596'] = G_EDU

# Правительство РТ (ҲУКУМАТИ) — каждый код вручную
CODE_OVERRIDE['000008'] = G_CUSTOMS   # импорт
CODE_OVERRIDE['000009'] = G_CUSTOMS   # экспорт
CODE_OVERRIDE['000010'] = G_CUSTOMS   # транзит
CODE_OVERRIDE['000011'] = G_OTHER     # наружная реклама
CODE_OVERRIDE['000012'] = G_ARCH      # разрешение на строительство
CODE_OVERRIDE['000013'] = G_LIC       # кабельные сети вещания
CODE_OVERRIDE['000014'] = G_LAND
CODE_OVERRIDE['000015'] = G_ARCH
CODE_OVERRIDE['000016'] = G_ARCH
CODE_OVERRIDE['000017'] = G_ARCH
CODE_OVERRIDE['000018'] = G_ARCH
CODE_OVERRIDE['000019'] = G_LAND
CODE_OVERRIDE['000020'] = G_LAND
CODE_OVERRIDE['000021'] = G_LAND
CODE_OVERRIDE['000022'] = G_LAND
CODE_OVERRIDE['000023'] = G_ARCH
CODE_OVERRIDE['000024'] = G_OTHER

# Комитет инвестиций и гос.имущества: оценочная лицензия -> Лицензии (rest -> Земля/недвиж.)
CODE_OVERRIDE['000521'] = G_LIC

# Агентство соц.страхования и пенсий: справка о стаже -> Справки (rest -> Прочее)
CODE_OVERRIDE['000801'] = G_SPRAVKI

MVD_T = ['нақлиёт','ронанд','ҳаракат дар роҳ','муоина','автомобил','мотоцикл','мототсикл',
         'мотосикл','ядак','транзит','тахограф','идоракунии восита','қоидаҳои ҳаракат',
         'роҳхат','реклама','азнавтаҷҳиз','азнавтачҳиз','роҳҳои автомобил']
MVD_LIC = ['силоҳ','лавозимоти ҷанг','маводи тарканда','маводи сахттаъсир','оташ','сӯхтор',
           'оташнишон',' муҳр','сикка','таркиш','заҳролуд']
MVD_REF = ['доғи судӣ','бюрои суроғав','аз ҷойи зист','дактилоскоп']
MVD_DOC = ['шаҳрванд','шиноснома','гуреза','бешаҳрванд','истиқомат','китобҳои ҳавлигӣ','китоби ҳавлигӣ']

def mvd_rule(name):
    n = name.lower()
    if 'экспертиза' in n and 'суд' in n:
        return G_JUST                      # судебная экспертиза
    for kw in MVD_LIC:
        if kw in n: return G_LIC
    for kw in MVD_REF:
        if kw in n: return G_SPRAVKI
    for kw in MVD_DOC:
        if kw in n: return G_DOCS
    for kw in MVD_T:
        if kw in n: return G_TRANSP
    if 'мувофиқасоз' in n:
        return G_TRANSP
    return G_OTHER

# (substring of body name, group). Order matters; first hit wins.
BODY_MAP = [
    ('КОРҲОИ ХОРИҶ', G_DOCS),                 # МИД (default)
    ('РУШДИ ИҚТИСОД', G_TAX),                  # Минэкономразвития/торговли (default)
    ('ТАНДУРУСТӢ', G_HEALTH),
    ('МОЛИЯ', G_LIC),                          # Минфин (default)
    ('АДЛИЯ', G_JUST),                         # Минюст (default)
    ('НАҚЛИЁТ', G_TRANSP),
    ('ҲИФЗИ МУҲИТИ ЗИСТ', G_ECO),
    ('ХОҶАГИИ ҶАНГАЛ', G_ECO),
    ('ИДОРАИ ЗАМИН ВА ГЕОДЕЗ', G_LAND),
    ('МЕЪМОРӢ ВА СОХТМОН', G_ARCH),
    ('ГУМРУК', G_CUSTOMS),
    ('АГЕНТИИ СОДИРОТ', G_CUSTOMS),
    ('КУМИТАИ АНДОЗ', G_TAX),
    ('КИШОВАРЗ', G_AGRO),
    ('БЕХАТАРИИ ОЗУҚАВОР', G_AGRO),
    ('АМНИЯТИ ХИМИЯВ', G_LIC),
    ('СТАНДАРТИЗАТСИЯ', G_LIC),
    ('БЕХАТАРИИ КОРҲО ДАР САНОАТ', G_LIC),
    ('ХАДАМОТИ АЛОҚА', G_LIC),
    ('ҲИФЗИ СИРРИ ДАВЛАТ', G_LIC),
    ('БОНКИ МИЛЛ', G_LIC),
    ('САНОАТ ВА ТЕХНОЛОГ', G_LIC),
    ('НАЗОРАТИ ДАВЛАТИИ ЭНЕРГЕТИК', G_LIC),
    ('МАВОДИ НАШЪАОВАР', G_LIC),
    ('ИННОВАТСИЯ ВА ТЕХНОЛОГИЯҲОИ РАҚАМ', G_LIC),
    ('ТЕЛЕВИЗИОН ВА РАДИО', G_LIC),
    ('МЕҲНАТ, МУҲОҶИРАТ', G_LIC),
    ('АМНИЯТИ МИЛЛ', G_LIC),
    ('КОМИССИЯИ ОЛИИ АТТЕСТАТСИОН', G_EDU),
    ('МАОРИФ ВА ИЛМ', G_EDU),
    ('ТАҲСИЛОТИ ИБТИДОӢ ВА МИЁНАИ КАСБ', G_EDU),
    ('МАРКАЗИ МИЛЛИИ ТЕСТ', G_EDU),
    ('ФАРҲАНГ', G_CULTURE),
    ('РУШДИ САЙЁҲ', G_CULTURE),
    ('ҶАВОНОН ВА ВАРЗИШ', G_CULTURE),
    ('КИТОБХОНАИ МИЛЛ', G_CULTURE),
    ('ОСОРХОНАИ МИЛЛ', G_CULTURE),
    ('БОЙГОН', G_SPRAVKI),
    ('ОМОР', G_SPRAVKI),
    ('САРМОЯГУЗОРӢ ВА ИДОРАИ АМВОЛ', G_LAND),
    ('СУҒУРТАИ ИҶТИМОӢ ВА НАФАҚА', G_OTHER),
    ('ДИН ВА ТАНЗИМ', G_OTHER),
    ('ХОҶАГИИ МАНЗИЛИЮ КОММУНАЛ', G_OTHER),
    ('ЭНЕРГЕТИКА ВА ЗАХИРАҲОИ ОБ', G_OTHER),
    ('ХАРИДИ ДАВЛАТ', G_OTHER),
    ('ЗИДДИИНҲИСОР', G_OTHER),
    ('ҲОЛАТҲОИ ФАВҚУЛОДДА', G_OTHER),
    ('ЗАБОН ВА ИСТИЛОҲОТ', G_OTHER),    # языковая экспертиза (default)
]

def classify(code, body, name):
    if code in CODE_OVERRIDE:
        return CODE_OVERRIDE[code]
    if 'КОРҲОИ ДОХИЛ' in body:
        return mvd_rule(name)
    for sub, grp in BODY_MAP:
        if sub in body:
            return grp
    return None  # unmatched -> flag

def main():
    with open(SRC, encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = [r for r in reader if any(c.strip() for c in r)]

    # column indexes
    CODE, BODY, NAME = 3, 0, 4
    out_rows, unmatched = [], []
    from collections import Counter
    dist, sub_dist = Counter(), Counter()
    for r in rows:
        g = classify(r[CODE], r[BODY], r[NAME])
        if g is None:
            unmatched.append(r)
            g = G_OTHER
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
        seen=set()
        for r in unmatched:
            if r[BODY] not in seen:
                seen.add(r[BODY]); print('   ', r[BODY])

if __name__ == '__main__':
    main()
