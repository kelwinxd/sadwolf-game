
import { useCallback, useEffect, useRef, useState } from 'react'
import { RADIO } from './config.js'

async function buscarEstacoes() {
  const path =
    `/json/stations/bytag/${encodeURIComponent(RADIO.tag)}` +
    `?limit=${RADIO.limite}&hidebroken=true&order=votes&reverse=true`

  for (const srv of RADIO.servidores) {
    try {
      const r = await fetch(srv + path)
      if (!r.ok) continue

      const list = await r.json()
      const ok = list.filter((s) => s.url_resolved)

      if (ok.length) return ok
    } catch {
      // Tenta o próximo servidor
    }
  }

  return []
}

export default function RadioPlayer() {
  const audioRef = useRef(null)
  const estacoesRef = useRef([])
  const idxRef = useRef(0)
  const tocandoRef = useRef(false)
  const tentativaRef = useRef(false)

  const [estacoes, setEstacoes] = useState([])
  const [idx, setIdx] = useState(0)
  const [tocando, setTocando] = useState(false)
  const [volume, setVolume] = useState(RADIO.volumeInicial)
  const [status, setStatus] = useState('carregando rádios...')

  const atualizarTocando = useCallback((valor) => {
    tocandoRef.current = valor
    setTocando(valor)
  }, [])

  const pausar = useCallback(() => {
    const audio = audioRef.current

    if (audio) {
      audio.pause()
    }

    atualizarTocando(false)
    setStatus('pausado')
  }, [atualizarTocando])

  const tocarEstacao = useCallback(async (estacao) => {
    const audio = audioRef.current

    if (!audio || !estacao) return

    try {
      if (audio.src !== estacao.url_resolved) {
        audio.src = estacao.url_resolved
        audio.load()
      }

      audio.volume = volume
      await audio.play()

      atualizarTocando(true)
      setStatus(estacao.name?.trim() || 'tocando')
    } catch {
      atualizarTocando(false)
      setStatus('Clique em ▶ para iniciar a rádio')
    }
  }, [volume, atualizarTocando])

  // Busca as estações
  useEffect(() => {
    let vivo = true

    buscarEstacoes().then((list) => {
      if (!vivo) return

      estacoesRef.current = list
      setEstacoes(list)

      setStatus(
        list.length ? 'iniciando rádio...' : 'nenhuma estação encontrada'
      )
    })

    return () => {
      vivo = false
    }
  }, [])

  // Tenta iniciar a rádio automaticamente uma única vez
  useEffect(() => {
    if (!estacoes.length || tentativaRef.current) return

    tentativaRef.current = true
    tocarEstacao(estacoes[0])
  }, [estacoes, tocarEstacao])

  // Volume e índice atual
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  useEffect(() => {
    idxRef.current = idx
  }, [idx])

  // Para o áudio ao esconder a página ou sair dela
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const pararAoEsconder = () => {
      if (document.hidden) {
        audio.pause()
        atualizarTocando(false)
        setStatus('pausado')
      }
    }

    const pararAoSair = () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

    document.addEventListener('visibilitychange', pararAoEsconder)
    window.addEventListener('pagehide', pararAoSair)

    return () => {
      document.removeEventListener('visibilitychange', pararAoEsconder)
      window.removeEventListener('pagehide', pararAoSair)

      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [atualizarTocando])

  const tocar = () => {
    tocarEstacao(estacoes[idx])
  }

  const proxima = useCallback(async () => {
    const lista = estacoesRef.current
    if (lista.length < 2) return

    const novoIdx = (idxRef.current + 1) % lista.length

    idxRef.current = novoIdx
    setIdx(novoIdx)

    await tocarEstacao(lista[novoIdx])
  }, [tocarEstacao])

  return (
    <div className="radio">
      <div className="radio-top">
        <span className="radio-dot" data-on={tocando} />
        <span className="radio-title">
          RÁDIO · {RADIO.tag.toUpperCase()}
        </span>
      </div>

      <div className="radio-status">{status}</div>

      <div className="radio-ctrls">
        <button
          onClick={tocando ? pausar : tocar}
          disabled={!estacoes.length}
          title={tocando ? 'Pausar rádio' : 'Tocar rádio'}
        >
          {tocando ? '❚❚' : '▶'}
        </button>

        <button
          onClick={proxima}
          disabled={estacoes.length < 2}
          title="Próxima estação"
        >
          ⏭
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          title="Volume"
        />

        <audio
          ref={audioRef}
          preload="none"
          onError={() => {
            if (!tocandoRef.current) return

            atualizarTocando(false)
            setStatus('stream indisponível — tente outra estação')
          }}
        />
      </div>
    </div>
  )
}
