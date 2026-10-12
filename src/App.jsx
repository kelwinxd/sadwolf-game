
import { Suspense, Component, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, KeyboardControls, useProgress } from '@react-three/drei'

import Player from './game/Player.jsx'
import Warrior from './game/Warrior.jsx'
import Ground from './game/Ground.jsx'
import Cavern from './game/Cavern.jsx'
import Trees from './game/Trees.jsx'
import Rain from './game/Rain.jsx'
import RadioPlayer from './game/RadioPlayer.jsx'

import { keyboardMap } from './game/keyboardMap.js'
import { ENVIRONMENT, ENEMY } from './game/config.js'




function gerarInimigos() {
  const arr = []

  const quantidade = ENEMY.quantidade
  const raioMin = Math.max(ENEMY.distanciaMinima ?? 0, 15)
  const raioMax = ENEMY.areaRaio ?? 30

  // Distância mínima entre dois inimigos
  const distanciaMinimaEntreInimigos = 20

  // Evita tentativas infinitas caso não haja espaço suficiente
  const maxTentativas = quantidade * 100

  let tentativas = 0

  while (
    arr.length < quantidade &&
    tentativas < maxTentativas
  ) {
    tentativas++

    const angulo = Math.random() * Math.PI * 2

    // Distribui os inimigos pela área circular
    const raio = Math.sqrt(
      raioMin ** 2 +
        Math.random() * (raioMax ** 2 - raioMin ** 2)
    )

    const novaPosicao = [
      Math.cos(angulo) * raio,
      0,
      Math.sin(angulo) * raio,
    ]

    // Verifica a distância em relação a todos os inimigos existentes
    const muitoProximo = arr.some((inimigo) => {
      const dx = inimigo.position[0] - novaPosicao[0]
      const dz = inimigo.position[2] - novaPosicao[2]

      return Math.hypot(dx, dz) < distanciaMinimaEntreInimigos
    })

    // Só aceita a posição se houver espaço suficiente
    if (muitoProximo) continue

    arr.push({
      id: arr.length,
      position: novaPosicao,
      rotation: [
        0,
        Math.random() * Math.PI * 2,
        0,
      ],
    })
  }

  if (arr.length < quantidade) {
    console.warn(
      `[Inimigos] Foram posicionados ${arr.length} de ${quantidade}. Aumente ENEMY.areaRaio ou reduza a distância mínima.`
    )
  }

  return arr
}



const LUZ = ENVIRONMENT.luzes

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (typeof window !== 'undefined') {
      window.__wolfError = String(error?.stack || error)
    }

    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <Html center>
          <div style={{
            color: '#fff',
            background: '#240d0d',
            padding: '20px',
            borderRadius: '8px',
            width: '280px',
            textAlign: 'center',
          }}>
            Erro ao carregar o jogo.
            <br />
            Verifique o console.
          </div>
        </Html>
      )
    }

    return this.props.children
  }
}

function Loader() {
  const { progress, item, total } = useProgress()

  return (
    <Html fullscreen>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: '#080707',
        color: '#e8d8c0',
        fontFamily: 'sans-serif',
        zIndex: 9999,
      }}>
        <div style={{
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: 800,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px #8b2525',
        }}>
          NIGHTFALL
        </div>

        <div style={{
          marginTop: '14px',
          fontSize: '13px',
          letterSpacing: '3px',
          color: '#b8aaa0',
        }}>
          CARREGANDO...
        </div>

        <div style={{
          width: 'min(300px, 70vw)',
          height: '5px',
          background: '#302522',
          marginTop: '24px',
          overflow: 'hidden',
          borderRadius: '4px',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#b53b2f',
            transition: 'width 200ms ease',
          }} />
        </div>

        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#a89a90',
        }}>
          {Math.round(progress)}%
        </div>

        {item && (
          <div style={{
            marginTop: '8px',
            maxWidth: '80vw',
            fontSize: '10px',
            color: '#756b65',
            overflowWrap: 'anywhere',
            textAlign: 'center',
          }}>
            Preparando recursos...
          </div>
        )}
      </div>
    </Html>
  )
}

export default function App() {
  const inimigos = useMemo(gerarInimigos, [])

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [0, 3.2, 6.5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        <color attach="background" args={[ENVIRONMENT.fundo]} />

        <fog
          attach="fog"
          args={[
            ENVIRONMENT.fog.cor,
            ENVIRONMENT.fog.perto,
            ENVIRONMENT.fog.longe,
          ]}
        />

        <ambientLight
          intensity={LUZ.ambient.intensity}
          color={LUZ.ambient.color}
        />

        <hemisphereLight
          intensity={LUZ.hemisphere.intensity}
          color={LUZ.hemisphere.color}
          groundColor={LUZ.hemisphere.groundColor}
        />

        <directionalLight
          position={LUZ.sol.position}
          intensity={LUZ.sol.intensity}
          color={LUZ.sol.color}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-14, 14, 14, -14, 0.1, 40]}
          />
        </directionalLight>

        <directionalLight
          position={LUZ.preenchimento.position}
          intensity={LUZ.preenchimento.intensity}
          color={LUZ.preenchimento.color}
        />

        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Player />

            {inimigos.map((e) => (
              <Warrior
                key={e.id}
                position={e.position}
                rotation={e.rotation}
              />
            ))}

            {ENVIRONMENT.chuva.ativa && <Rain />}

            <Cavern />
            <Trees />
            <Ground />
          </Suspense>
        </ErrorBoundary>
      </Canvas>

      <RadioPlayer />

      <div className="overlay">
        <b>Clique</b> para travar o mouse e girar a câmera.{' '}
        <b>WASD</b> anda · <b>Shift</b> corre ·{' '}
        <b>Espaço</b> pula · <b>F</b> ataca ·{' '}
        <b>Esc</b> solta o mouse.
        <br />
        <div style={{fontSize:"10px", marginTop:'8px'}}>
        Experimento em desenvolvimento.
        <br />

        por <b>Kelwin Esechiel</b>
      </div>
      </div>


    </KeyboardControls>
  )
}
