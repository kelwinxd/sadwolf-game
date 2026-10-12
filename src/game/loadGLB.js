import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Cache por URL. Não guarda promise rejeitada: se um load falhar (ex.: dev
// server reiniciando), a próxima tentativa recomeça do zero.
const cache = new Map()

export function loadGLB(url) {
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
