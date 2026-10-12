
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { loadGLB } from './loadGLB.js'
import { addCollider } from './colliders.js'
import { addEnemy } from './enemies.js'
import { ENEMY } from './config.js'

const {
  modelo: MODELO,
  alturaAlvo: ALTURA_ALVO,
  raio: RAIO,
  emissiveIntensity: EMISSIVE,
  velocidadeAndar: VEL_ANDAR,
  trechoInicio: TRECHO_INICIO,
  trechoFim: TRECHO_FIM,
  velocidadeAnimacao: VEL_ANIMACAO,
  areaRaio: AREA_RAIO,
} = ENEMY

export default function Warrior({
  position = [3, 0, 0],
  rotation = [0, 3, 0],
}) {
  const [gltf, setGltf] = useState(null)
  const [morto, setMorto] = useState(false)

  useEffect(() => {
    let vivo = true
    let n = 0
    let timeout

    const tentar = () =>
      loadGLB(MODELO)
        .then((g) => {
          if (vivo) setGltf(g)
        })
        .catch((e) => {
          console.error('[Warrior] erro ao carregar GLB:', e)

          if (vivo && n++ < 5) {
            timeout = setTimeout(tentar, 600)
          }
        })

    tentar()

    return () => {
      vivo = false
      clearTimeout(timeout)
    }
  }, [])

  if (morto || !gltf) return null

  return (
    <WarriorModel
      gltf={gltf}
      position={position}
      rotation={rotation}
      onMorto={() => setMorto(true)}
    />
  )
}

function WarriorModel({ gltf, position, rotation, onMorto }) {
  const group = useRef()
  const rootRef = useRef()
  const modeloRef = useRef()
  const colisorObj = useRef(null)
  const enemyObj = useRef(null)

  const posicaoInicialRef = useRef(
    new THREE.Vector3(position[0], position[1], position[2])
  )

  const rotacaoInicialRef = useRef(rotation[1] ?? 0)
  const voltandoRef = useRef(false)

  const { animations } = gltf

  const scene = useMemo(
    () => cloneSkinned(gltf.scene),
    [gltf]
  )

  const { actions, names, mixer } = useAnimations(
    animations,
    group
  )

  // Registra o colisor e o inimigo
  useEffect(() => {
    const col = {
      x: position[0],
      z: position[2],
      r: RAIO,
    }

    const ini = {
      x: position[0],
      z: position[2],
      hit: onMorto,
    }

    colisorObj.current = col
    enemyObj.current = ini

    const remColisor = addCollider(col)
    const remInimigo = addEnemy(ini)

    return () => {
      remColisor()
      remInimigo()
    }
  }, [position, onMorto])

  // Ajusta materiais, escala e altura
  const { scale, yOffset } = useMemo(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return

      o.castShadow = true
      o.receiveShadow = true
      o.frustumCulled = false

      const mats = Array.isArray(o.material)
        ? o.material
        : [o.material]

      mats.forEach((m) => {
        if (!m) return

        if ('metalness' in m) m.metalness = 0
        if ('roughness' in m) m.roughness = 1
        if ('transmission' in m) m.transmission = 0

        m.transparent = false
        m.opacity = 1
        m.depthWrite = true

        if (m.map && 'emissive' in m) {
          m.emissive = new THREE.Color(0xffffff)
          m.emissiveMap = m.map
          m.emissiveIntensity = EMISSIVE
        }

        m.needsUpdate = true
      })
    })

    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)

    const s = ALTURA_ALVO / (size.y || 1)

    return {
      scale: s,
      yOffset: -box.min.y * s,
    }
  }, [scene])

  // Controle do trecho da animação
  const clipName = names[0]
  const iniciado = useRef(false)
  const limites = useRef({ inicio: 0, fim: 0 })
  const tempoTrecho = useRef(0)
  const direcao = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const action = actions[clipName]
    if (!action) return

    const duracao = action.getClip().duration

    const inicio = THREE.MathUtils.clamp(
      TRECHO_INICIO ?? 0,
      0,
      1
    )

    const fim = THREE.MathUtils.clamp(
      TRECHO_FIM ?? 1,
      0,
      1
    )

    if (fim <= inicio) {
      console.error(
        '[Warrior] trechoFim precisa ser maior que trechoInicio.'
      )
      return
    }

    limites.current = {
      inicio: duracao * inicio,
      fim: duracao * fim,
    }

    tempoTrecho.current = limites.current.inicio

    action.reset()
    action.enabled = true
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.play()

    // O tempo é controlado manualmente no useFrame
    action.paused = true
    action.time = tempoTrecho.current
    mixer.update(0)

    iniciado.current = true

    return () => {
      action.stop()
      iniciado.current = false
    }
  }, [
    actions,
    clipName,
    mixer,
    TRECHO_INICIO,
    TRECHO_FIM,
  ])

  useFrame((_, delta) => {
    const warrior = rootRef.current
    const modelo = modeloRef.current

    if (!warrior || !modelo) return

    const action = actions[clipName]

    // Atualiza a animação dentro do trecho configurado
    if (action && iniciado.current) {
      const { inicio, fim } = limites.current
      const duracaoTrecho = fim - inicio

      if (duracaoTrecho > 0) {
        tempoTrecho.current +=
          delta * Math.max(0, VEL_ANIMACAO ?? 1)

        if (tempoTrecho.current >= fim) {
          tempoTrecho.current =
            inicio + ((tempoTrecho.current - inicio) % duracaoTrecho)
        }

        action.time = tempoTrecho.current
        mixer.update(0)
      }
    }

    const posicaoInicial = posicaoInicialRef.current
    const limite = AREA_RAIO ?? 30

    const distanciaCentro = Math.hypot(
      warrior.position.x,
      warrior.position.z
    )

    // Retorna ao ponto de nascimento ao sair da área
    if (!voltandoRef.current && distanciaCentro > limite) {
      voltandoRef.current = true
    }

    if (voltandoRef.current) {
      const dx = posicaoInicial.x - warrior.position.x
      const dz = posicaoInicial.z - warrior.position.z
      const distancia = Math.hypot(dx, dz)

      if (distancia > 0.15) {
        warrior.rotation.y = Math.atan2(dx, dz)

        direcao.set(dx, 0, dz).normalize()

        warrior.position.addScaledVector(
          direcao,
          Math.min((VEL_ANDAR ?? 1) * delta, distancia)
        )
      } else {
   warrior.position.copy(posicaoInicial)

  // Escolhe uma nova direção para não repetir o mesmo trajeto
  warrior.rotation.y = Math.random() * Math.PI * 2

  voltandoRef.current = false
      }
    } else {
      // Usa a orientação mundial do modelo para definir a frente
      modelo.updateWorldMatrix(true, false)

    const frente = new THREE.Vector3(0, 0, 1)
const quaternionMundo = new THREE.Quaternion()

warrior.getWorldQuaternion(quaternionMundo)
frente.applyQuaternion(quaternionMundo)
frente.y = 0

      if (frente.lengthSq() > 0.0001) {
        frente.normalize()

        warrior.position.addScaledVector(
          frente,
          (VEL_ANDAR ?? 1) * delta
        )
      }
    }

    // Atualiza as posições dos colisores e do inimigo
    const { x, z } = warrior.position

    if (colisorObj.current) {
      colisorObj.current.x = x
      colisorObj.current.z = z
    }

    if (enemyObj.current) {
      enemyObj.current.x = x
      enemyObj.current.z = z
    }
  })

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={rotation}
    >
      <group
        ref={(node) => {
          group.current = node
          modeloRef.current = node
        }}
        position={[0, yOffset, 0]}
        scale={scale}
      >
        <primitive object={scene} />
      </group>
    </group>
  )
}
