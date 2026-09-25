"""Gera data/exercises.json a partir do free-exercise-db (Unlicense / domínio público).

Uso:  python scripts/build-exercises.py
Fonte: https://github.com/yuhonas/free-exercise-db  (fixado no commit abaixo; as fotos
são servidas pelo jsDelivr no MESMO commit — ver IMG_BASE em js/exercises.js).
"""
import json
import pathlib
import urllib.request

COMMIT = 'a859101d633a01c4a1a920d6a8ce41dabba0705f'
SRC = f'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@{COMMIT}/dist/exercises.json'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'exercises.json'

with urllib.request.urlopen(SRC) as r:
    raw = json.load(r)

out = []
for x in raw:
    if len(x.get('images') or []) < 2:
        continue  # sem as duas fotos (início/fim) não serve para o app
    out.append({
        'id': x['id'],
        'name': x['name'],
        'eq': x.get('equipment') or 'other',
        'cat': x['category'],
        'lvl': x['level'],
        'mech': x.get('mechanic'),
        'pm': x['primaryMuscles'],
        'sm': x['secondaryMuscles'],
        'ins': [s.replace('�', '¾').strip() for s in x['instructions'] if s.strip()],
    })

out.sort(key=lambda e: e['name'])
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(out)} exercícios -> {OUT} ({OUT.stat().st_size // 1024} KB)')
