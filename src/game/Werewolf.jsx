import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimations } from '@react-three/drei'
import { useControls, folder } from 'leva'
import { useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { resolveClips, isLoopOnce } from './animationMap.js'

const ALTURA_ALVO = 1.9

// Cache simples por URL para o GLB (evita recarregar em remonta do StrictMode).
// Não cacheia promise rejeitada: se um load falhar (ex.: server reiniciando),
// a próxima tentativa recomeça do zero.
const cache = new Map()
function loadGLB(url) {
  if (!cache.has(url)) {
    const p = new Promise((resolve, reject) => {
      new GLTFLoader().load(url, resolve, undefined, reject)
    }).catch((err) => {
      cache.delete(url)
      throw err
    })
    cache.set(url, p)
  }
  return cache.get(url)
}

// Pai: carrega o GLB manualmente e só monta a view quando pronto, para o painel
// leva nascer já com a lista de animações completa.
export default function Werewolf() {
  const [gltf, setGltf] = useState(null)
  useEffect(() => {
    let vivo = true
    let tentativas = 0
    const tentar = () => {
      loadGLB('/werewolf.glb')
        .then((g) => vivo && setGltf(g))
        .catch((err) => {
          console.error('[Werewolf] ERRO ao carregar GLB:', err)
          if (vivo && tentativas++ < 5) setTimeout(tentar, 600)
        })
    }
    tentar()
    return () => {
      vivo = false
    }
  }, [])

  if (!gltf) return null
  return <WerewolfModel gltf={gltf} />
}

function WerewolfModel({ gltf }) {
  const group = useRef()
  const { scene, animations } = gltf
  const { actions, names } = useAnimations(animations, group)
  const { byId, options } = useMemo(() => resolveClips(names), [names])

  // Normaliza escala e assenta o modelo no chão; liga sombras.
  const { scale, position } = useMemo(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const s = ALTURA_ALVO / (size.y || 1)
    return { scale: s, position: [-center.x * s, -box.min.y * s, -center.z * s] }
  }, [scene])

  const ids = Object.values(options)
  const { animacao, velocidade, girar } = useControls('Lobisomem', {
    animacao: {
      value: ids[0] ?? 'nenhuma',
      options: Object.keys(options).length ? options : { nenhuma: 'nenhuma' },
    },
    reproducao: folder({
      velocidade: { value: 1, min: 0.1, max: 3, step: 0.1, label: 'velocidade' },
      girar: { value: false, label: 'girar modelo' },
    }),
  })

  // O jogo nunca manda "tocar animação": muda o estado e cada estado tem sua
  // animação, com fade suave na transição. (ver plano, pág. 3)
  useEffect(() => {
    const action = actions[byId[animacao]]
    if (!action) return
    if (isLoopOnce(animacao)) {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity)
    }
    action.reset().fadeIn(0.3).play()
    return () => action.fadeOut(0.3)
  }, [actions, byId, animacao])

  useEffect(() => {
    const action = actions[byId[animacao]]
    if (action) action.setEffectiveTimeScale(velocidade)
  }, [actions, byId, animacao, velocidade])

  useFrame((_, dt) => {
    if (girar && group.current) group.current.rotation.y += dt * 0.5
  })

  return <primitive ref={group} object={scene} scale={scale} position={position} />
}
