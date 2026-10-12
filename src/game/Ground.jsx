import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ENVIRONMENT } from './config.js'

const G = ENVIRONMENT.ground

// Chão plano com a textura de grama repetida, recebendo a sombra do lobisomem.
export default function Ground() {
  // material criado imperativamente para garantir needsUpdate ao aplicar o mapa
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: G.corCarregando, roughness: 1, metalness: 0 }),
    [],
  )

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(G.textura, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(G.repeat, G.repeat)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      material.map = t
      // escurece a grama (tinge a textura) para não ficar lavada
      material.color.set(G.cor)
      material.needsUpdate = true
    })
    return () => material.map?.dispose()
  }, [material])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      material={material}
    >
      <planeGeometry args={[G.size, G.size]} />
    </mesh>
  )
}
