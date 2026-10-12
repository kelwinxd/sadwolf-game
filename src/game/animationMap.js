// Mapeia os nomes crus dos clipes para IDs curtos que o resto do jogo usa.
// O casamento é por palavra-chave, então continua funcionando se os clipes forem
// regerados/renomeados.
//
// Inventário atual do werewolf2.glb (clipes já com nomes limpos):
//   idle, run, jump, arremesso, fall, angry
export const CLIP_DEFS = [
  { id: 'idle', label: 'Ocioso (idle)', match: /idle|ocioso|relax/i, loop: true },
  { id: 'run', label: 'Correr (run)', match: /\brun\b|full speed|werewolf runs/i, loop: true },
  { id: 'jump', label: 'Pular (jump)', match: /jump/i, loop: false },
  { id: 'arremesso', label: 'Arremesso', match: /arremesso|pitch|throw|baseball/i, loop: false },
  { id: 'angry', label: 'Rugir (angry)', match: /angry|roar|scream|howl/i, loop: true },
  { id: 'fall', label: 'Cair (fall)', match: /fall|death|die|knock/i, loop: false },
]

// Dado os nomes reais dos clipes (animations.map(a => a.name)), devolve:
//   byId:  { run: 'nome real do clipe', attack: '...', ... }  (só os encontrados)
//   options: { 'Correr (run)': 'run', ... }  para o dropdown do leva
export function resolveClips(names) {
  const byId = {}
  const options = {}
  for (const def of CLIP_DEFS) {
    const real = names.find((n) => def.match.test(n))
    if (real) {
      byId[def.id] = real
      options[def.label] = def.id
    }
  }
  return { byId, options }
}

export const isLoopOnce = (id) => CLIP_DEFS.find((d) => d.id === id)?.loop === false
