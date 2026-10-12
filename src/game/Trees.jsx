import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { loadGLB } from './loadGLB.js'
import { addCollider } from './colliders.js'
import { ENVIRONMENT } from './config.js'

const T = ENVIRONMENT.arvores

// posições aleatórias num anel ao redor do centro (como os inimigos)
function gerarPosicoes() {
  const arr = []
  for (let i = 0; i < T.quantidade; i++) {
    const ang = Math.random() * Math.PI * 2
    const r = T.distanciaMinima + Math.random() * (T.areaRaio - T.distanciaMinima)
    arr.push({
      id: i,
      x: Math.cos(ang) * r,
      z: Math.sin(ang) * r,
      rotY: Math.random() * Math.PI * 2, // só o giro varia (tamanho/Y iguais)
    })
  }
  return arr
}

export default function Trees() {
  const [gltf, setGltf] = useState(null)
  const posicoes = useMemo(gerarPosicoes, [])

  useEffect(() => {
    let vivo = true
    loadGLB(T.modelo)
      .then((g) => vivo && setGltf(g))
      .catch((e) => console.error('[Trees] erro ao carregar GLB:', e))
    return () => {
      vivo = false
    }
  }, [])

  // normaliza (altura-alvo), apoia no chão e corrige material — uma vez no modelo
  // base. Todas as árvores usam a mesma escala e o mesmo yOffset (mesmo nível).
  const { escala, yOffset } = useMemo(() => {
    if (!gltf) return { escala: 1, yOffset: 0 }
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          if (!m) return
          if ('metalness' in m) {
            m.metalness = 0
            m.roughness = 1
          }
          if (m.color) m.color.set(T.cor) // escurece a árvore
          m.needsUpdate = true
        })
      }
    })
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const esc = T.altura / (size.y || 1)
    return { escala: esc, yOffset: -box.min.y * esc }
  }, [gltf])

  // colisão opcional no tronco (removida ao desmontar)
  useEffect(() => {
    if (!T.raioColisao) return
    const rem = posicoes.map((p) => addCollider({ x: p.x, z: p.z, r: T.raioColisao }))
    return () => rem.forEach((f) => f())
  }, [posicoes])

  if (!gltf) return null
  return posicoes.map((p) => (
    <Arvore key={p.id} gltf={gltf} escala={escala} yOffset={yOffset} x={p.x} z={p.z} rotY={p.rotY} />
  ))
}

// Cada árvore CLONA o modelo (o mesmo objeto não pode ter vários pais no three).
function Arvore({ gltf, escala, yOffset, x, z, rotY }) {
  const obj = useMemo(() => gltf.scene.clone(true), [gltf])
  return (
    <group position={[x, yOffset, z]} rotation={[0, rotY, 0]} scale={escala}>
      <primitive object={obj} />
    </group>
  )
}
