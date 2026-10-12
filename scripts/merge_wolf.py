"""Monta public/werewolf2.glb: malha do werewolf2 + clipes vindos de vários FBX
(idle, arremesso, run, jump, fall, angry), já que o werewolf2 veio com tudo
concatenado numa timeline só. Todos usam o mesmo rig Mixamo.

  blender --background --python scripts/merge_wolf.py
"""
import bpy
import os

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(PROJ, "public")
TEX = os.path.join(PUB, "tripo_rgb_d614559b-a94c-4588-8329-e71069d91f39.png")
OUT = os.path.join(PUB, "werewolf2.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)


def import_fbx(name):
    before_a = set(bpy.data.actions)
    before_o = set(o for o in bpy.data.objects if o.type == "ARMATURE")
    bpy.ops.import_scene.fbx(filepath=os.path.join(PUB, name))
    acts = [a for a in bpy.data.actions if a not in before_a]
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE" and o not in before_o]
    return acts, arms


def pick(acts, kw):
    for a in acts:
        if kw in a.name.lower():
            return a
    return None


# 1) malha principal = werewolf2 (descarta sua ação concatenada)
_a, w2_arms = import_fbx("werewolf2.fbx")
main_arm = w2_arms[0]
for a in list(_a):
    bpy.data.actions.remove(a)

# 2) clipes isolados. ATENÇÃO: os arquivos vieram com o conteúdo TROCADO —
# "idlewolf.fbx" contém o ARREMESSO e "arremesso-wolf.fbx" contém a IDLE.
idle_acts, idle_arms = import_fbx("idlewolf.fbx")
arremesso_act = idle_acts[0]  # idlewolf.fbx -> arremesso real
arremesso_act.name = "arremesso"

arr_acts, arr_arms = import_fbx("arremesso-wolf.fbx")
idle_act = arr_acts[0]  # arremesso-wolf.fbx -> idle real
idle_act.name = "idle"

# 3) werewolf1: run/jump/fall/angry
w1_acts, w1_arms = import_fbx("werewolf.fbx")
run_act = pick(w1_acts, "full speed") or pick(w1_acts, "run")
jump_act = pick(w1_acts, "jump")
fall_act = pick(w1_acts, "fall")
angry_act = pick(w1_acts, "angry")
for a, nm in [(run_act, "run"), (jump_act, "jump"), (fall_act, "fall"), (angry_act, "angry")]:
    if a:
        a.name = nm

wanted = [
    ("idle", idle_act),
    ("run", run_act),
    ("jump", jump_act),
    ("arremesso", arremesso_act),
    ("fall", fall_act),
    ("angry", angry_act),
]
wanted = [(n, a) for n, a in wanted if a]
print("CLIPES:", [n for n, _ in wanted])

# aplica como faixas NLA no armature principal (mesmos nomes de osso Mixamo)
if not main_arm.animation_data:
    main_arm.animation_data_create()
main_arm.animation_data.action = None
for t in list(main_arm.animation_data.nla_tracks):
    main_arm.animation_data.nla_tracks.remove(t)
for name, act in wanted:
    act.use_fake_user = True
    tr = main_arm.animation_data.nla_tracks.new()
    tr.name = name
    s = tr.strips.new(name, int(act.frame_range[0]), act)
    s.name = name

# remove armatures/malhas auxiliares (mantém só a malha do werewolf2)
for arm in idle_arms + arr_arms + w1_arms:
    for ch in list(arm.children):
        bpy.data.objects.remove(ch, do_unlink=True)
    bpy.data.objects.remove(arm, do_unlink=True)

# textura (reaponta as quebradas para o PNG do Tripo)
for img in bpy.data.images:
    if tuple(img.size) == (0, 0) or not img.has_data:
        img.filepath = TEX
        img.source = "FILE"
        img.reload()
try:
    bpy.ops.file.pack_all()
except Exception as e:
    print("pack_all aviso:", e)

print("NLA FINAL:", [t.name for t in main_arm.animation_data.nla_tracks])

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_image_format="AUTO",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_nla_strips=True,
    export_skins=True,
    export_morph=True,
    export_yup=True,
)
print("OK ->", OUT)
