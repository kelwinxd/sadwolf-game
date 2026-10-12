import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em dev, impede o navegador de cachear modelos 3D (.glb/.gltf/.fbx). Sem isso,
// ao regenerar o GLB o navegador pode servir uma versão antiga/parcial em cache.
const noCacheModels = {
  name: 'no-cache-models',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && /\.(glb|gltf|fbx)(\?|$)/i.test(req.url)) {
        res.setHeader('Cache-Control', 'no-store')
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), noCacheModels],
  server: { host: true },
  // Pré-otimiza os pacotes pesados no startup para evitar reotimização em
  // runtime (que causa 504 "Outdated Optimize Dep" no preview headless).
  // Pré-otimiza os pacotes pesados no startup para evitar reotimização em
  // runtime (que causa 504 "Outdated Optimize Dep" no preview headless).
  //
  // NOTA ANTIVÍRUS: o Avast dá um falso positivo (JS:Prontxi-Z) no bundle
  // do @react-three/drei e o corta em trânsito (Web Shield). Correção: excluir
  // `localhost` das exceções do Avast (Web Shield / varredura de URL). Ver README.
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'leva',
      // GLTFLoader carregado manualmente (o useGLTF do drei não resolvia este
      // GLB); incluído aqui para o Vite não reotimizar em runtime.
      'three/examples/jsm/loaders/GLTFLoader.js',
      // SkeletonUtils: clona modelos com esqueleto (vários warriors).
      'three/examples/jsm/utils/SkeletonUtils.js',
    ],
  },
})
