#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тақсими «Феҳристи хизматрасониҳои давлатӣ» аз рӯйи гирандаи хизматрасонӣ.
Манбаъ: нимаи тоҷикии файл (сатрҳои 6..1222, рамзи рақамӣ дар сутуни B).
Натиҷа: 3 файли CSV — шахси воқеӣ (физ), шахси ҳуқуқӣ (юр), воқеӣ+ҳуқуқӣ (физ и юр).
"""
import re, csv, openpyxl

SRC = "Феҳристи_хизматрасониҳои_давлатӣ_бо_за_бони_руссӣ.xlsx"
ROW_FROM, ROW_TO = 6, 1222          # Tajik half only

def norm(v):
    """Cell -> single-line trimmed string."""
    return "" if v is None else " ".join(str(v).split())

def is_service(ws, r):
    """A real service row has a purely numeric code in column B."""
    return re.fullmatch(r"\d+", norm(ws.cell(r, 2).value)) is not None

def clean_body(a):
    a = re.sub(r"^\d+\.\s*", "", a)              # drop leading "7. "
    a = re.sub(r"[¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*$", "", a)      # drop trailing footnote superscripts
    return a.strip()

def clean_cat(a):
    return re.sub(r"^§\s*\d+\.?\s*", "", a).strip()  # drop leading "§3. "

def classify(d):
    s = d.lower().replace("ӣ", "и").replace("e", "е")   # fold tail-и and latin-e typo
    fiz = ("физическ" in s) or ("воқеи" in s) or ("воке" in s)
    jur = ("юридическ" in s) or ("ҳуқуқ" in s) or ("хукук" in s) or ("қуқ" in s)
    if fiz and jur: return "both"
    if fiz:         return "fiz"
    if jur:         return "jur"
    return "other"

HEADER = [
    "Мақоми давлатӣ", "Категория", "№", "Рамзи хизматрасонӣ",
    "Номгӯйи хизматрасонӣ", "Гирандаи хизматрасонӣ", "Хизматрасонанда",
    "Ташкилоти қабул ва додани натиҷа", "Шакли хизматрасонӣ", "Музднок ё ройгон",
]

def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Лист1"]

    buckets = {"fiz": [], "jur": [], "both": []}
    other = []
    body = cat = ""

    for r in range(ROW_FROM, ROW_TO + 1):
        a, b = norm(ws.cell(r, 1).value), norm(ws.cell(r, 2).value)
        if a and not b:                       # a section/category header row
            if a.startswith("§"):
                cat = clean_cat(a)
            elif re.match(r"^\d+\.", a):
                body, cat = clean_body(a), ""  # new body resets category
            continue
        if not is_service(ws, r):
            continue
        cls = classify(norm(ws.cell(r, 4).value))
        row = [body, cat] + [norm(ws.cell(r, c).value) for c in range(1, 9)]
        if cls in buckets:
            buckets[cls].append(row)
        else:
            other.append((r, norm(ws.cell(r, 4).value)))

    files = {
        "fiz":  "физ_лицо_шахси_воқеӣ.csv",
        "jur":  "юр_лицо_шахси_ҳуқуқӣ.csv",
        "both": "физ_и_юр_шахси_воқеӣ_ва_ҳуқуқӣ.csv",
    }
    for key, fname in files.items():
        with open(fname, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(HEADER)
            w.writerows(buckets[key])
        print(f"{fname:42s} -> {len(buckets[key]):4d} хизматрасонӣ")

    total = sum(len(v) for v in buckets.values())
    print(f"{'ҲАМАГӢ':42s} -> {total:4d} хизматрасонӣ")
    if other:
        print("ОГОҲӢ — таснифнашуда:", other)

if __name__ == "__main__":
    main()
