"""Analisa werewolf2.fbx: detecta saltos de pose (cortes entre animações
concatenadas numa única timeline). Lê a pose AVALIADA (depsgraph) e lista os
frames com maior descontinuidade de movimento.

  blender --background --python scripts/detect_cuts.py
"""
import bpy
import os

import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NOME = argv[0] if argv else "werewolf2"
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FBX = os.path.join(PROJ, "public", NOME + ".fbx")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=FBX)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
scene = bpy.context.scene

# range vem da AÇÃO (não da cena)
act = arm.animation_data.action
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
print(f"RANGE {f0}..{f1}")


def pose_at(f):
    scene.frame_set(f)
    deps = bpy.context.evaluated_depsgraph_get()
    ae = arm.evaluated_get(deps)
    # posição de cada osso no espaço do armature (captura o movimento real)
    return [pb.matrix.translation.copy() for pb in ae.pose.bones]


prev = pose_at(f0)
deltas = []
for f in range(f0 + 1, f1 + 1):
    cur = pose_at(f)
    d = sum((a - b).length for a, b in zip(prev, cur))
    deltas.append((f, d))
    prev = cur

vals = [d for _, d in deltas]
mean = sum(vals) / len(vals)
print(f"MEAN_DELTA {mean:.4f}  MAX {max(vals):.4f}")

# perfil de movimento por blocos (mostra onde há animação ativa vs parado)
NB = 13
total = f1 - f0
print("=== PERFIL (fração do clipe : movimento médio) ===")
for b in range(NB):
    a0 = f0 + int(total * b / NB)
    a1 = f0 + int(total * (b + 1) / NB)
    seg = [d for f, d in deltas if a0 <= f < a1]
    avg = sum(seg) / len(seg) if seg else 0
    bar = "#" * int(avg / (mean + 1e-9) * 10)
    print(f"  {b/NB:.2f}-{(b+1)/NB:.2f} f{a0}-{a1}: {avg:7.2f} {bar}")

# máximos locais (pico maior que os vizinhos numa janela), candidatos a cortes
W = 4
picos = []
for i in range(len(deltas)):
    f, d = deltas[i]
    lo = max(0, i - W)
    hi = min(len(deltas), i + W + 1)
    if d == max(v for _, v in deltas[lo:hi]) and d > mean * 1.5:
        picos.append((f, d))
print(f"PICOS_LOCAIS {len(picos)}")
for f, d in picos:
    print(f"  PEAK frame={f} delta={d:.2f}")
