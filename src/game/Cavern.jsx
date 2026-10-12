import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { loadGLB } from './loadGLB.js'
import { addCollider } from './colliders.js'
import { ENVIRONMENT } from './config.js'

const C = ENVIRONMENT.cavern

// Objeto de cenário (caverna/rocha) com colisão circular — o player não atravessa.
export default function Cavern() {
  const [gltf, setGltf] = useState(null)

  useEffect(() => {
    let vivo = true
    loadGLB(C.modelo)
      .then((g) => vivo && setGltf(g))
      .catch((e) => console.error('[Cavern] erro ao carregar GLB:', e))
    return () => {
      vivo = false
    }
  }, [])

  // registra o colisor no chão (removido se o componente desmontar)
  useEffect(() => addCollider({ x: C.posicao[0], z: C.posicao[2], r: C.raioColisao }), [])

  // liga sombras, corrige material metálico, normaliza o tamanho e assenta no chão.
  const { scale, yOffset } = useMemo(() => {
    if (!gltf) return { scale: 1, yOffset: C.posicao[1] }
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          if (m && 'metalness' in m) {
            m.metalness = 0
            m.roughness = 1
            m.needsUpdate = true
          }
        })
      }
    })
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maior = Math.max(size.x, size.y, size.z) || 1
    const s = C.tamanho / maior // normaliza: maior dimensão vira C.tamanho
    return { scale: s, yOffset: -box.min.y * s }
  }, [gltf])

  if (!gltf) return null
  return (
    <group
      position={[C.posicao[0], C.posicao[1], C.posicao[2]]}
      rotation={[0, C.rotacaoY, 0]}
      scale={scale}
    >
      <primitive object={gltf.scene} />
    </group>
  )
}
