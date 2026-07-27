"""Контраст всех hue-пар §4.4 в обеих темах + ключевых текстовых пар §9.
Цифры считаются из tokens.css, а не хранятся: захардкоженный отчёт устаревает
молча — ровно так §4.4 и утверждала «пары выверены на AA», пока не померили.
"""
import re, pathlib, sys

def lin(c):
    c /= 255
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055) ** 2.4

def lum(h):
    r, g, b = (int(h[i:i+2], 16) for i in (1, 3, 5))
    return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)

def ratio(a, b):
    l1, l2 = sorted((lum(a), lum(b)), reverse=True)
    return (l1+0.05)/(l2+0.05)

css = pathlib.Path('css/tokens.css').read_text()
light_src, rest = css.split('/* ============ dark ============ */')
dark_src = rest.split('/* ============ производные')[0]

def vars_of(src):
    return dict(re.findall(r'(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b', src))

light = vars_of(light_src)
dark = {**light, **vars_of(dark_src)}

HUES = ['blue','rose','amber','green','indigo','terra','violet','slate','teal','pink','steel','gray','cyan','olive']
fail = 0
print(f'{"пара":8} {"светлая":>8} {"тёмная":>8}')
for hue in HUES:
    l = ratio(light[f'--h-{hue}-fg'], light[f'--h-{hue}-bg'])
    d = ratio(dark[f'--h-{hue}-fg'], dark[f'--h-{hue}-bg'])
    bad = ' ❌' if min(l, d) < 4.5 else ''
    if bad: fail += 1
    print(f'{hue:8} {l:8.2f} {d:8.2f}{bad}')

print('\nтекстовые пары §9')
TEXT = [('--ink','--bg'), ('--ink','--panel'), ('--ink-2','--panel'), ('--ink-3','--panel'),
        ('--blue-ink','--panel'), ('--red-ink','--panel'), ('--green','--panel'), ('--amber','--panel'),
        ('--blue-ink','--blue-tint'), ('--red-ink','--red-tint'), ('--green','--green-tint'),
        ('--amber','--amber-tint'), ('--on-blue','--red-fill')]
for fg, bg in TEXT:
    l, d = ratio(light[fg], light[bg]), ratio(dark[fg], dark[bg])
    bad = ' ❌' if min(l, d) < 4.5 else ''
    if bad: fail += 1
    print(f'{fg[2:]:>10} на {bg[2:]:<12} {l:6.2f} {d:6.2f}{bad}')

# Известное исключение — печатаем ВСЕГДА и цифрой, а не прячем в зелёный.
# Именно так §4.4 и прожила версию 1.0 с надписью «пары выверены на AA»:
# то, что не измеряется на каждом прогоне, тихо перестаёт быть правдой.
print('\nизвестное исключение (§9 / §14 — решает дизайн-лид)')
ex = ratio(light['--on-blue'], light['--blue'])
print(f'   on-blue на blue        {ex:6.2f} {ex:6.2f}  ← подпись Primary-кнопки')
print('   §9 разрешает --blue для заливок кнопок, но подпись на ней — обычный')
print('   текст (15/17px), и порог для неё 4.5. Варианты — в §14 плана.')

print(f'\n{"❌ пар ниже AA: " + str(fail) if fail else "✓ все пары §4.4 и текстовые пары §9 ≥ 4.5:1 в обеих темах"}')
sys.exit(1 if fail else 0)
