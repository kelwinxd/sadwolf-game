"""Converte <nome>.fbx -> <nome>.glb via Blender headless.

Roda com (nome do modelo opcional após "--", padrão: werewolf2):
  blender --background --python scripts/fbx_to_glb.py -- werewolf2

Importa o FBX (o Blender descomprime a textura embutida), reaponta a textura
para o PNG do Tripo se vier quebrada, empilha as animações como faixas NLA e
exporta GLB com todas as animações e a textura embutida.
"""
import bpy
import os
import sys

# nome base do modelo (após "--"); padrão werewolf2
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NOME = argv[0] if argv else "werewolf2"
TEX_NAME = argv[1] if len(argv) > 1 else "tripo_rgb_d614559b-a94c-4588-8329-e71069d91f39.png"

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FBX = os.path.join(PROJ, "public", NOME + ".fbx")
GLB = os.path.join(PROJ, "public", NOME + ".glb")
# Textura base color (usada como fallback se a do FBX vier quebrada).
TEX = os.path.join(PROJ, "public", TEX_NAME)

# Cena limpa
bpy.ops.wm.read_factory_settings(use_empty=True)

# Importa o FBX
bpy.ops.import_scene.fbx(filepath=FBX)

# A textura do FBX veio quebrada (arquivo externo ausente, size 0x0).
# Reaponta cada imagem faltante para o PNG real do Tripo.
for img in bpy.data.images:
    if tuple(img.size) == (0, 0) or not img.has_data:
        print(f"corrigindo textura: {img.name} -> {os.path.basename(TEX)}")
        img.filepath = TEX
        img.source = "FILE"
        img.reload()

# Empacota todas as imagens no arquivo (garante textura embutida no GLB)
try:
    bpy.ops.file.pack_all()
except Exception as e:
    print("pack_all aviso:", e)

# O exportador glTF só exporta a ação ATIVA por padrão. Para levar TODAS as
# animações como clipes nomeados, empilhamos cada ação como uma faixa NLA no
# armature. Os nomes são limpos (sem o prefixo "Armature|").
arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
if arm:
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = None  # evita duplicar a ação ativa
    # remove faixas NLA pré-existentes
    for t in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(t)
    for act in bpy.data.actions:
        act.use_fake_user = True
        clean = act.name.split("|")[-1]  # "Armature|angry_02.001" -> "angry_02.001"
        track = arm.animation_data.nla_tracks.new()
        track.name = clean
        strip = track.strips.new(clean, int(act.frame_range[0]), act)
        strip.name = clean
    print(f"NLA: {len(arm.animation_data.nla_tracks)} faixas criadas")

# Relatório: imagens e ações encontradas
print("=== IMAGENS ===")
for img in bpy.data.images:
    print(f"  {img.name}  size={tuple(img.size)}  packed={img.packed_file is not None}")
print("=== ACOES (animacoes) ===")
for act in bpy.data.actions:
    print(f"  {act.name}  frames={act.frame_range[0]:.0f}-{act.frame_range[1]:.0f}")

# Exporta GLB: binário, texturas embutidas, todas as animações/ações
bpy.ops.export_scene.gltf(
    filepath=GLB,
    export_format="GLB",
    export_image_format="AUTO",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",  # cada faixa NLA vira um clipe nomeado
    export_nla_strips=True,
    export_skins=True,
    export_morph=True,
    export_yup=True,
)
print("OK ->", GLB)
