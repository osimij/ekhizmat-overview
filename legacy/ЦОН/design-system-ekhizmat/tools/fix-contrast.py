"""Минимально затемняет шесть светлых --h-*-fg до порога AA 4.5:1 (§4.4, вариант 1).

Правило: трогаем ТОЛЬКО светлоту в OKLCh, оттенок и насыщенность держим —
иначе поедет карта hue §4.4, которую утверждает дизайн-лид. Ищем наибольшую
светлоту, при которой пара проходит 4.5:1: цвет остаётся максимально близким
к снятому с Figma, а не «просто потемнее».
"""
import re, math, pathlib

def srgb_to_lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(hexs):
    r, g, b = (int(hexs[i:i+2], 16) for i in (1, 3, 5))
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def ratio(a, b):
    l1, l2 = sorted((lum(a), lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)

# --- sRGB <-> OKLab ---
def to_oklab(hexs):
    r, g, b = (srgb_to_lin(int(hexs[i:i+2], 16)) for i in (1, 3, 5))
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = l ** (1/3), m ** (1/3), s ** (1/3)
    return (0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_,
            1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_,
            0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_)

def from_oklab(L, a, b):
    l_ = L + 0.3963377774*a + 0.2158037573*b
    m_ = L - 0.1055613458*a - 0.0638541728*b
    s_ = L - 0.0894841775*a - 1.2914855480*b
    l, m, s = l_**3, m_**3, s_**3
    r = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    bb = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    def enc(c):
        c = 12.92*c if c <= 0.0031308 else 1.055*(max(c, 0) ** (1/2.4)) - 0.055
        return max(0, min(255, round(c * 255)))
    return '#%02x%02x%02x' % (enc(r), enc(g), enc(bb))

css = pathlib.Path('css/tokens.css').read_text()
light = css.split('/* ============ dark ============ */')[0]
def get(name):
    return re.search(rf'{name}:\s*(#[0-9a-f]{{6}})', light).group(1)

TARGET = 4.5
report = []
for hue in ['rose', 'blue', 'terra', 'olive', 'green', 'teal']:
    fg, bg = get(f'--h-{hue}-fg'), get(f'--h-{hue}-bg')
    before = ratio(fg, bg)
    L, a, b = to_oklab(fg)
    lo, hi = 0.0, L
    best = from_oklab(0, a, b)
    for _ in range(40):                     # бинарный поиск по светлоте
        mid = (lo + hi) / 2
        cand = from_oklab(mid, a, b)
        if ratio(cand, bg) >= TARGET: lo = mid; best = cand
        else: hi = mid
    report.append((hue, fg, best, before, ratio(best, bg)))

print(f'{"пара":8} {"было":9} {"стало":9} {"было":>6} {"стало":>6}')
for hue, fg, new, b4, af in report:
    print(f'{hue:8} {fg:9} {new:9} {b4:6.2f} {af:6.2f}')

# правим только светлую секцию
head, dark = css.split('/* ============ dark ============ */')
for hue, fg, new, _, _ in report:
    head = re.sub(rf'(--h-{hue}-fg:\s*)#[0-9a-f]{{6}}', rf'\g<1>{new}', head)
pathlib.Path('css/tokens.css').write_text(head + '/* ============ dark ============ */' + dark)
print('\ntokens.css обновлён (только светлая тема)')
