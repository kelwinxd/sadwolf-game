// Colisão simples por círculos no plano XZ (sem física/rapier por enquanto).
// Cada obstáculo é um círculo { x, z, r }. O Player resolve a colisão empurrando
// sua posição para fora de qualquer círculo que esteja sobrepondo.
const obstaculos = new Set()

export function addCollider(c) {
  obstaculos.add(c)
  return () => obstaculos.delete(c)
}

// Empurra (x,z) para fora de todos os obstáculos, considerando o raio do player.
// Muta o objeto {x,z} passado e devolve ele.
export function resolveCollision(pos, playerRadius) {
  for (const o of obstaculos) {
    const dx = pos.x - o.x
    const dz = pos.z - o.z
    const minDist = o.r + playerRadius
    const d2 = dx * dx + dz * dz
    if (d2 < minDist * minDist && d2 > 1e-6) {
      const d = Math.sqrt(d2)
      const push = (minDist - d) / d
      pos.x += dx * push
      pos.z += dz * push
    }
  }
  return pos
}
