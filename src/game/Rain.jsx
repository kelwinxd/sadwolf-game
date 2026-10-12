import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ENVIRONMENT } from './config.js'

const R = ENVIRONMENT.chuva

// Chuva: gotas (segmentos de linha) caindo em fluxo contínuo, acompanhando a
// câmera. Geometria imperativa com boundingSphere "infinita" para nunca ser
// cortada pelo frustum culling (era por isso que sumia depois de uns riscos).
// + som procedural de chuva (ruído filtrado, Web Audio).
export default function Rain() {
  const ref = useRef()
  const camera = useThree((s) => s.camera)

  // x/z fixos por gota + uma "fase" aleatória (deslocamento no ciclo de queda).
  // A posição Y é recalculada do tempo absoluto a cada frame — nunca sincroniza
  // nem salta após engasgos/pausas do loop.
  const fases = useMemo(() => {
    const f = new Float32Array(R.quantidade)
    for (let i = 0; i < R.quantidade; i++) f[i] = Math.random() * R.altura
    return f
  }, [])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const arr = new Float32Array(R.quantidade * 2 * 3) // 2 vértices por gota
    for (let i = 0; i < R.quantidade; i++) {
      const x = (Math.random() - 0.5) * R.area
      const z = (Math.random() - 0.5) * R.area
      const y = R.altura - (fases[i] % R.altura) // posição em t=0
      const b = i * 6
      arr[b] = x
      arr[b + 1] = y
      arr[b + 2] = z
      arr[b + 3] = x
      arr[b + 4] = y + R.comprimento
      arr[b + 5] = z
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    // nunca sair do frustum (as gotas se movem muito além da caixa inicial)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e9)
    return g
  }, [])

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: R.cor, transparent: true, opacity: 0.45 }),
    [],
  )

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const arr = geometry.attributes.position.array
    const avanco = t * R.velocidade
    for (let i = 0; i < R.quantidade; i++) {
      // y desce de altura→0 ciclicamente, com fase própria (fluxo uniforme)
      const y = R.altura - ((avanco + fases[i]) % R.altura)
      const b = i * 6
      arr[b + 1] = y
      arr[b + 4] = y + R.comprimento
    }
    geometry.attributes.position.needsUpdate = true
    // segue a câmera no plano XZ (chuva sempre cobrindo a área visível)
    ref.current.position.x = camera.position.x
    ref.current.position.z = camera.position.z
  })

  // limpa a geometria/material ao desmontar
  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  // Som procedural de chuva: ruído branco filtrado, iniciado no 1º clique.
  useEffect(() => {
    let ctx, noise
    const iniciar = () => {
      if (ctx) return
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ctx = new AC()
      const size = 2 * ctx.sampleRate
      const buf = ctx.createBuffer(1, size, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
      noise = ctx.createBufferSource()
      noise.buffer = buf
      noise.loop = true
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 400
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1200
      const gain = ctx.createGain()
      gain.gain.value = R.volumeSom
      noise.connect(hp)
      hp.connect(lp)
      lp.connect(gain)
      gain.connect(ctx.destination)
      noise.start()
    }
    window.addEventListener('pointerdown', iniciar, { once: true })
    return () => {
      window.removeEventListener('pointerdown', iniciar)
      try {
        noise?.stop()
        ctx?.close()
      } catch {
        /* já fechado */
      }
    }
  }, [])

  return <lineSegments ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}
