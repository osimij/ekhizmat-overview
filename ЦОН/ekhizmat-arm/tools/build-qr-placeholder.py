#!/usr/bin/env python3
"""Пересобрать assets/qr-placeholder.svg (§11.1).

Плейсхолдер QR. НЕ настоящий код — «обои» нужного силуэта, чтобы S2 верстался
и снимался на скриншоты до появления identify.qr() в Ф2.

Запуск: python3 tools/build-qr-placeholder.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'qr-placeholder.svg'

N = 25          # модулей (как у QR version 2)
mods = [[0]*N for _ in range(N)]

def finder(r, c):
    for i in range(7):
        for j in range(7):
            edge = i in (0, 6) or j in (0, 6)
            core = 2 <= i <= 4 and 2 <= j <= 4
            mods[r+i][c+j] = 1 if (edge or core) else 0

finder(0, 0); finder(0, N-7); finder(N-7, 0)          # три угла-искателя

for i in range(8, N-8):                                # тайминг-дорожки
    mods[6][i] = mods[i][6] = i % 2 == 0

for i in range(5):                                     # выравнивающий блок
    for j in range(5):
        mods[N-9+i][N-9+j] = 1 if (i in (0,4) or j in (0,4) or (i==2 and j==2)) else 0

# Псевдослучайное «тело». LCG с фиксированным seed — сборка воспроизводима.
seed = 20260717
def rnd():
    global seed
    seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
    return seed / 0x7FFFFFFF

def reserved(r, c):
    return ((r < 9 and c < 9) or (r < 9 and c >= N-8) or (r >= N-8 and c < 9)
            or r == 6 or c == 6 or (r >= N-9 and c >= N-9))

for r in range(N):
    for c in range(N):
        if not reserved(r, c) and rnd() < 0.46:
            mods[r][c] = 1

rects = '\n'.join(
    f'  <rect x="{c}" y="{r}" width="1" height="1"/>'
    for r in range(N) for c in range(N) if mods[r][c])

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- Плейсхолдер QR-кода (§11.1). НЕ сканируется — это не настоящий код,
     а заглушка нужного силуэта для вёрстки S2 и скриншотов.
     Заменяется реальным кодом от identify.qr() в Ф2. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}"
     shape-rendering="crispEdges" role="img" aria-label="QR-код (заглушка)">
  <rect width="{N}" height="{N}" fill="#fff"/>
  <g fill="#1b1d20">
{rects}
  </g>
</svg>
''')
print("ok")
