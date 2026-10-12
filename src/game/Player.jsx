import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnimations, useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { loadGLB } from './loadGLB.js'
import { resolveClips } from './animationMap.js'
import { resolveCollision } from './colliders.js'
import { hitEnemiesNear } from './enemies.js'
import { PLAYER, CAMERA, ENEMY } from './config.js'

// Valores centralizados em config.js (PLAYER / CAMERA). Aliases locais mantêm
// os nomes curtos usados no resto do componente.
const {
  modelo: MODELO,
  alturaAlvo: ALTURA_ALVO,
  yAjuste: Y_AJUSTE,
  raio: PLAYER_RADIUS,
  runAnimSpeed: RUN_ANIM_SPEED,
  walkTS: WALK_TS,
  sprintTS: SPRINT_TS,
  turnSpeed: TURN_SPEED,
  runStartOffset: RUN_START_OFFSET,
  runEndOffset: RUN_END_OFFSET,
  arremessoStart: ARREMESSO_START,
  arremessoTrimEnd: ARREMESSO_TRIM_END,
  gravity: GRAVITY,
  jumpSpeed: JUMP_SPEED,
  jumpRamp: JUMP_RAMP,
  jumpStartOffset: JUMP_START_OFFSET,
} = PLAYER
const {
  dist: CAM_DIST,
  height: CAM_HEIGHT,
  mouseSens: MOUSE_SENS,
  pitchMin: PITCH_MIN,
  pitchMax: PITCH_MAX,
} = CAMERA
const UP = new THREE.Vector3(0, 1, 0)

// interpola ângulos pelo caminho mais curto (evita giro de 360°)
function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  return a + (d < -Math.PI ? d + Math.PI * 2 : d) * t
}

export default function Player() {
  const [gltf, setGltf] = useState(null)
  useEffect(() => {
    let vivo = true
    let n = 0
    const tentar = () =>
      loadGLB(MODELO)
        .then((g) => vivo && setGltf(g))
        .catch((e) => {
          console.error('[Player] erro ao carregar GLB:', e)
          if (vivo && n++ < 5) setTimeout(tentar, 600)
        })
    tentar()
    return () => {
      vivo = false
    }
  }, [])

  if (!gltf) return null
  return <PlayerRig gltf={gltf} />
}

function PlayerRig({ gltf }) {
  const root = useRef() // move pelo mundo (posição)
  const modelRef = useRef() // gira para a direção do movimento
  const { scene, animations } = gltf
  const { actions, names, mixer } = useAnimations(animations, modelRef)
  const { byId } = useMemo(() => resolveClips(names), [names])
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const [, getKeys] = useKeyboardControls()

  // ângulos da câmera orbital, controlados pelo mouse (pointer lock)
  const yaw = useRef(Math.PI) // começa olhando o personagem de frente (de trás dele)
  const pitch = useRef(0.25)
  useEffect(() => {
    const dom = gl.domElement
    const onClick = () => {
      if (document.pointerLockElement !== dom) dom.requestPointerLock?.()
    }
    const onMove = (e) => {
      if (document.pointerLockElement !== dom) return
      yaw.current -= e.movementX * MOUSE_SENS
      pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current + e.movementY * MOUSE_SENS))
    }
    dom.addEventListener('click', onClick)
    window.addEventListener('mousemove', onMove)
    return () => {
      dom.removeEventListener('click', onClick)
      window.removeEventListener('mousemove', onMove)
    }
  }, [gl])

  // idle real do werewolf2; cai para "angry" se algum dia faltar.
  const idleId = byId.idle ? 'idle' : byId.angry ? 'angry' : 'run'
  const idleTS = byId.idle ? 1 : 0.4 // idle real roda em velocidade normal

  // Normaliza escala e assenta o modelo no chão; liga sombras.
  const { scale, yOffset } = useMemo(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
        // O GLB do Tripo vem com MeshPhysicalMaterial metálico (preto sem
        // environment) e com transparência/transmission ligada (fica translúcido).
        // O lobisomem é opaco e não-metal: corrigimos o material.
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          if (!m) return
          if ('metalness' in m) m.metalness = 0
          if ('roughness' in m) m.roughness = 1
          if ('transmission' in m) m.transmission = 0
          if ('ior' in m) m.ior = 1
          if ('thickness' in m) m.thickness = 0
          m.transparent = false
          m.opacity = 1
          m.depthWrite = true
          m.side = THREE.FrontSide
          // clareia o lobisomem com leve auto-iluminação da própria textura
          // (independe da luz da cena, destaca ele do fundo escuro)
          if (m.map && 'emissive' in m) {
            m.emissive = new THREE.Color(0xffffff)
            m.emissiveMap = m.map
            m.emissiveIntensity = 0.4
          }
          m.needsUpdate = true
        })
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = ALTURA_ALVO / (size.y || 1)
    return { scale: s, yOffset: -box.min.y * s }
  }, [scene])

  // --- Máquina de estados de animação ---
  const curId = useRef(null)
  const locked = useRef(false) // true enquanto um one-shot (jump/attack) toca

  const play = (id, { once = false, timeScale = 1, fade = 0.2, startAt = 0 } = {}) => {
    const clip = byId[id]
    const action = clip && actions[clip]
    if (!action) return
    if (curId.current === id && !once) {
      action.setEffectiveTimeScale(timeScale)
      return
    }
    action.reset()
    if (startAt) action.time = startAt // pula o arranque do clipe
    action.setEffectiveTimeScale(timeScale)
    if (once) {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity)
    }
    action.fadeIn(fade).play()
    // fadeOut de QUALQUER outra animação ainda com peso. Essencial porque os
    // one-shots (pulo/arremesso) ficam clampados no último frame com peso cheio;
    // sem isto, blendam com a próxima animação (ex.: F após pulo vinha errado).
    for (const other of Object.values(actions)) {
      if (other !== action && other.getEffectiveWeight() > 0.001) other.fadeOut(fade)
    }
    curId.current = id
  }

  // Toca um clipe one-shot começando em `startAt` e CORTANDO `trimEnd` do final.
  // Usa timer (não o evento 'finished' do mixer) porque, ao cortar o final, o
  // 'finished' nunca dispararia — e aí o personagem ficaria travado, sem voltar
  // ao idle. Ao terminar, destrava e o próximo frame retoma idle/locomoção.
  const oneShotTimer = useRef(null)
  const playOnce = (id, { startAt = 0, trimEnd = 0, timeScale = 1, fade = 0.12 } = {}) => {
    const clip = byId[id]
    const action = clip && actions[clip]
    if (!action) return
    locked.current = true
    play(id, { once: true, fade, startAt, timeScale })
    const dur = action.getClip().duration
    const efetiva = Math.max(0.1, (dur - startAt - trimEnd) / timeScale)
    clearTimeout(oneShotTimer.current)
    oneShotTimer.current = setTimeout(() => {
      locked.current = false
      curId.current = null // força retomar idle/locomoção no próximo frame
    }, efetiva * 1000)
  }

  // começa parado (idle)
  useEffect(() => {
    play(idleId, { timeScale: idleTS })
    return () => clearTimeout(oneShotTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prev = useRef({ jump: false, attack: false })
  const vy = useRef(0) // velocidade vertical (pulo)
  const rampLeft = useRef(0) // tempo restante do impulso inicial (saída suave)
  const airborne = useRef(false) // true enquanto está no ar
  const move = new THREE.Vector3()
  const camTarget = new THREE.Vector3()
  const desiredCam = new THREE.Vector3()

  useFrame((_, dt) => {
    const k = getKeys()
    // 1) vetor de input RELATIVO À CÂMERA (yaw): W vai para onde a câmera olha.
    const sy = Math.sin(yaw.current)
    const cy = Math.cos(yaw.current)
    const fwd = (k.forward ? 1 : 0) - (k.backward ? 1 : 0)
    const rgt = (k.right ? 1 : 0) - (k.left ? 1 : 0)
    // forward = (-sy,-cy); right = (cy,-sy)
    move.set(-sy * fwd + cy * rgt, 0, -cy * fwd - sy * rgt)
    const moving = move.lengthSq() > 0
    if (moving) move.normalize()

    // 2) movimento horizontal (vale também no ar = controle aéreo). A velocidade
    // é derivada do timeScale da animação, para as pernas casarem (sem patinar).
    const locomTS = k.sprint ? SPRINT_TS : WALK_TS
    if (moving && root.current) {
      root.current.position.addScaledVector(move, RUN_ANIM_SPEED * locomTS * dt)
      // resolve colisão com obstáculos (ex.: warrior) empurrando para fora
      resolveCollision(root.current.position, PLAYER_RADIUS)
      const alvo = Math.atan2(move.x, move.z)
      modelRef.current.rotation.y = lerpAngle(
        modelRef.current.rotation.y,
        alvo,
        1 - Math.exp(-TURN_SPEED * dt),
      )
    }

    // 3) pulo físico: impulso em rampa (saída suave), depois gravidade, pousa em y=0.
    if (k.jump && !prev.current.jump && !airborne.current && !locked.current && root.current) {
      vy.current = 0
      rampLeft.current = JUMP_RAMP
      airborne.current = true
      play('jump', { once: true, fade: 0.08, startAt: JUMP_START_OFFSET })
    }
    if (airborne.current && root.current) {
      if (rampLeft.current > 0) {
        // impulso: acelera vy de 0 até JUMP_SPEED ao longo de JUMP_RAMP
        vy.current = Math.min(JUMP_SPEED, vy.current + (JUMP_SPEED / JUMP_RAMP) * dt)
        rampLeft.current -= dt
      } else {
        vy.current -= GRAVITY * dt // queda com gravidade
      }
      root.current.position.y += vy.current * dt
      if (root.current.position.y <= 0 && vy.current <= 0) {
        root.current.position.y = 0
        vy.current = 0
        airborne.current = false
        curId.current = null // força retomar locomoção no próximo frame
      }
    }

    // 4) animação de locomoção/ataque — só no chão e sem one-shot travando.
    // Fade curto para a corrida "pegar" na hora (sem deslizar).
    if (!locked.current && !airborne.current) {
      if (k.attack && !prev.current.attack) {
        playOnce('arremesso', { startAt: ARREMESSO_START, trimEnd: ARREMESSO_TRIM_END })
        // elimina inimigos ao alcance do ataque
        const p = root.current.position
        hitEnemiesNear(p.x, p.z, ENEMY.alcanceAtaque)
      }
      else if (moving) play('run', { timeScale: locomTS, fade: 0.1, startAt: RUN_START_OFFSET })
      else play(idleId, { timeScale: idleTS, fade: 0.18 })
    }

    // mantém o loop da corrida só no trecho recortado: ao passar de
    // (duração - RUN_END_OFFSET), reinicia em RUN_START_OFFSET (pula windup e final)
    if (curId.current === 'run') {
      const act = actions[byId.run]
      if (act) {
        const dur = act.getClip().duration
        if (act.time >= dur - RUN_END_OFFSET) act.time = RUN_START_OFFSET
      }
    }

    prev.current.jump = k.jump
    prev.current.attack = k.attack

    // 5) câmera orbital controlada pelo mouse: orbita o personagem segundo
    // yaw/pitch. Segue só a posição horizontal (ignora o pulo em Y).
    if (root.current) {
      const p = root.current.position
      const cp = Math.cos(pitch.current)
      const sp = Math.sin(pitch.current)
      desiredCam.set(
        p.x + Math.sin(yaw.current) * cp * CAM_DIST,
        CAM_HEIGHT + sp * CAM_DIST,
        p.z + Math.cos(yaw.current) * cp * CAM_DIST,
      )
      camera.position.lerp(desiredCam, 1 - Math.exp(-12 * dt))
      camTarget.set(p.x, CAM_HEIGHT, p.z)
      camera.lookAt(camTarget)
    }
  })

  return (
    <group ref={root}>
      <group ref={modelRef} position={[0, yOffset + Y_AJUSTE, 0]} scale={scale}>
        <primitive object={scene} />
      </group>
    </group>
  )
}
