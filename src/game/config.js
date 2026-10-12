// Configuração central do jogo, agrupada por domínio.
// Mexa nos números AQUI — os componentes (Player/lobisomem, Enemy/warrior,
// Environment/chão+luzes) leem desta fonte única.

// ───────────────────────── JOGADOR (lobisomem) ─────────────────────────
export const PLAYER = {
  modelo: '/werewolf2.glb',
  alturaAlvo: 1.9, // altura do modelo no mundo (metros)
  yAjuste: 0, // ajuste fino vertical (negativo = mais para baixo)
  raio: 0.45, // raio de colisão no chão

  // Locomoção — a velocidade de deslocamento é derivada do timeScale da
  // animação, para as pernas casarem com o chão (sem "patinar").
  runAnimSpeed: 10, // m/s que o clipe "run" representa a timeScale 1.0
  walkTS: 0.6, // timeScale do run ao andar
  sprintTS: 1.1, // timeScale do run ao correr (Shift)
  turnSpeed: 12, // rapidez para virar na direção do movimento
  runStartOffset: 0.45, // pula o arranque do clipe de corrida (s)
  runEndOffset: 2, // corta do fim do ciclo de corrida (s)

  // Arremesso (tecla F) — one-shot com offset inicial e corte do final
  arremessoStart: 1.5,
  arremessoTrimEnd: 1.5,

  // Pulo físico (deslocamento vertical real, além da animação)
  gravity: 37, // m/s² (maior = pulo mais "pesado")
  jumpSpeed: 8, // velocidade máxima de subida (maior = mais alto)
  jumpRamp: 0.14, // tempo do impulso inicial (saída suave)
  jumpStartOffset: 0.55, // pula o arranque do clipe de pulo
}

// ───────────────────── CÂMERA (3ª pessoa orbital, mouse) ────────────────
export const CAMERA = {
  dist: 6.5, // distância da câmera ao personagem
  height: 1.6, // altura do ponto que a câmera mira (cabeça)
  mouseSens: 0.0025, // sensibilidade do mouse
  pitchMin: 0.08, // limite vertical inferior (não desce tanto)
  pitchMax: 0.85, // limite vertical superior
}

// ───────────────────────── INIMIGO (warrior) ───────────────────────────


export const ENEMY = {
  modelo: '/warrior3.glb',
  alturaAlvo: 20,
  raio: 4,
  emissiveIntensity: 0.35,

  // Trecho da animação
  trechoInicio: 0.08,
  trechoFim: 1,

  // Velocidades
  velocidadeAnimacao: 0.2,
  velocidadeAndar: 2.5,

  quantidade: 10,
  areaRaio: 35,
  distanciaMinima: 20,
  alcanceAtaque: 2.4,
  vagarRaio: 22,
}

// ──────────────────── AMBIENTE (chão + névoa + luzes) ───────────────────
export const ENVIRONMENT = {
  fundo: '#0b0b12',
  fog: { cor: '#0b0b12', perto: 14, longe: 36 },
  ground: {
    size: 200, // lado do chão (metros)
    repeat: 40, // repetições da textura (tiling)
    textura: '/grass.jpg',
    cor: '#6b6f4e', // tinge a grama (mais escuro = mais sombrio)
    corCarregando: '#2f3d26', // cor até a textura carregar
  },
  // Clima noturno quente (âmbar/avermelhado), ambiente baixo (sombrio)
  luzes: {
    ambient: { intensity: 0.35, color: '#ffcaa0' },
    hemisphere: { intensity: 0.5, color: '#e8a060', groundColor: '#1a140e' },
    sol: { intensity: 2.4, color: '#ffb46e', position: [5, 8, 5] },
    preenchimento: { intensity: 0.35, color: '#ff7a55', position: [-4, 3, 4] },
  },
  // Chuva: gotas (linhas) caindo + som procedural de chuva (Web Audio).
  chuva: {
    ativa: true, // false = sem chuva (nem visual nem som)
    quantidade: 5000, // nº de gotas (mais = mais densa/constante)
    area: 26, // lado da área coberta (segue a câmera)
    altura: 18, // de que altura caem
    comprimento: 0.4, // tamanho de cada gota (risco)
    velocidade: 20, // velocidade de queda (m/s)
    cor: '#9fb4c8',
    volumeSom: 0.08, // volume do som de chuva (0–1)
  },
  // Cavern: objeto de cenário (rocha/caverna) com colisão circular.
  cavern: {
    modelo: '/cavern.glb',
    tamanho: 20, // maior dimensão no mundo (metros) — normalizado, não multiplicador
    posicao: [12, -0.5, -12], // onde fica no mundo (x, y, z)
    rotacaoY: 35, // giro em radianos
    raioColisao: 4, // raio da colisão (player não atravessa)
  },
  // Árvores mortas: espalhadas aleatoriamente (cenário). Todas apoiadas no chão
  // (mesmo Y). Funciona como os inimigos: quantidade + posição aleatória.
  arvores: {
    modelo: '/tree-dead.glb',
    quantidade: 30, // quantas árvores nascem
    altura: 13, // altura-alvo no mundo (normaliza o modelo)
    areaRaio: 45, // raio da área onde se espalham (metros)
    distanciaMinima: 9, // não nascem a menos disto do centro (player)
    raioColisao: 0.9, // tronco — player não atravessa (0 = sem colisão)
    cor: '#2a241f', // tinge a árvore (mais escuro = mais sombria)
  },
}

// ───────────────────────── RÁDIO (música ambiente) ─────────────────────
// Streams da Radio Browser API (radio-browser.info) — pública, sem chave.
export const RADIO = {
  tag: 'grunge', // gênero buscado
  limite: 50, // nº de estações buscadas
  volumeInicial: 0.4,
  // mirrors da API (tenta em ordem se algum falhar)
  servidores: [
    'https://de1.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info',
  ],
}
