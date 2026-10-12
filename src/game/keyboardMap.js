// Mapa de teclas -> nomes de ação, consumido por <KeyboardControls> do drei.
// Lido a cada frame com useKeyboardControls.
export const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'attack', keys: ['KeyF', 'KeyJ'] },
]
