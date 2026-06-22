export const rewards = [
  {
    id: 'team-shirt',
    name: 'Camisola oficial de equipa',
    description: 'Escolhe a camisola oficial de uma das equipas disponíveis.',
    price: 1500,
    accent: 'from-red-700/30 to-rose-950/10',
  },
  {
    id: 'football',
    name: 'Bola de futebol',
    description: 'Uma bola de futebol para levares o jogo para qualquer lugar.',
    price: 800,
    accent: 'from-sky-700/30 to-blue-950/10',
  },
  {
    id: 'team-cap',
    name: 'Chapéu de equipa',
    description: 'Apoia a tua equipa favorita com um chapéu oficial.',
    price: 400,
    accent: 'from-amber-700/30 to-orange-950/10',
  },
  {
    id: 'team-scarf',
    name: 'Cachecol de equipa',
    description: 'Um cachecol para mostrares as tuas cores nas bancadas.',
    price: 350,
    accent: 'from-indigo-700/30 to-purple-950/10',
  },
  {
    id: 'goalkeeper-gloves',
    name: 'Luvas de guarda-redes',
    description: 'Luvas confortáveis para defenderes cada remate.',
    price: 700,
    accent: 'from-emerald-700/30 to-teal-950/10',
  },
  {
    id: 'match-ticket',
    name: 'Bilhete para um jogo',
    description: 'Vive a emoção do futebol ao vivo num jogo selecionado.',
    price: 2000,
    accent: 'from-fuchsia-700/30 to-purple-950/10',
  },
] as const

export const rewardIds = new Set<string>(rewards.map((reward) => reward.id))
