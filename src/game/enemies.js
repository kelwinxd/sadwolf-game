// Registro de inimigos vivos para o ataque do player alcançá-los.
// Cada inimigo é { x, z, hit } — hit() faz ele sumir (definido no Warrior).
const vivos = new Set()

export function addEnemy(e) {
  vivos.add(e)
  return () => vivos.delete(e)
}

// Elimina todos os inimigos dentro do raio de (x,z). Devolve quantos caíram.
export function hitEnemiesNear(x, z, raio) {
  let n = 0
  for (const e of [...vivos]) {
    const dx = e.x - x
    const dz = e.z - z
    if (dx * dx + dz * dz <= raio * raio) {
      e.hit()
      n++
    }
  }
  return n
}
