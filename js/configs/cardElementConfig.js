// ─────────────────────────────────────────────────────────────────────────────
// CARD ELEMENT CONFIG — 16-Bit Retro Pokémon-Style Elemental Energy System
// ─────────────────────────────────────────────────────────────────────────────
// Maps fighters to 10 classic trading card elements and provides procedural
// 16-bit pixel art energy orb renderers (Fighting, Psychic, Steel, Fire,
// Lightning, Darkness, Grass, Water, Dragon, Colorless/Normal).
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_ELEMENTS = Object.freeze({
  fighting: Object.freeze({
    key: 'fighting',
    label: 'FIGHTING',
    color: '#D97706',      // Deep warm fighting amber-orange
    rim: '#92400E',
    accent: '#FDE68A',
    bgDark: '#1E1508',
    bgGrad: ['#2E1E0B', '#140D05'],
    symbol: '👊',
  }),
  psychic: Object.freeze({
    key: 'psychic',
    label: 'PSYCHIC',
    color: '#9333EA',      // Arcane psychic violet
    rim: '#581C87',
    accent: '#E9D5FF',
    bgDark: '#170E24',
    bgGrad: ['#26133B', '#0E0717'],
    symbol: '🔮',
  }),
  steel: Object.freeze({
    key: 'steel',
    label: 'STEEL',
    color: '#64748B',      // Tempered steel slate
    rim: '#334155',
    accent: '#E2E8F0',
    bgDark: '#11151C',
    bgGrad: ['#1E2430', '#0A0D12'],
    symbol: '⚔️',
  }),
  fire: Object.freeze({
    key: 'fire',
    label: 'FIRE',
    color: '#EA580C',      // Blazing solar red-orange
    rim: '#9A3412',
    accent: '#FED7AA',
    bgDark: '#20100A',
    bgGrad: ['#30160C', '#120804'],
    symbol: '🔥',
  }),
  lightning: Object.freeze({
    key: 'lightning',
    label: 'LIGHTNING',
    color: '#EAB308',      // Electric volt yellow
    rim: '#A16207',
    accent: '#FEF08A',
    bgDark: '#1F1A08',
    bgGrad: ['#2C250A', '#120F03'],
    symbol: '⚡',
  }),
  dark: Object.freeze({
    key: 'dark',
    label: 'DARKNESS',
    color: '#3B364C',      // Abyss obsidian violet
    rim: '#1E1A29',
    accent: '#A59DB8',
    bgDark: '#0C0A10',
    bgGrad: ['#171420', '#07060A'],
    symbol: '🌑',
  }),
  grass: Object.freeze({
    key: 'grass',
    label: 'GRASS',
    color: '#16A34A',      // Vibrant nature emerald
    rim: '#14532D',
    accent: '#BBF7D0',
    bgDark: '#0B1C12',
    bgGrad: ['#112A1B', '#06110A'],
    symbol: '🌿',
  }),
  water: Object.freeze({
    key: 'water',
    label: 'WATER',
    color: '#0284C7',      // Deep aqua cyan
    rim: '#075985',
    accent: '#BAE6FD',
    bgDark: '#081726',
    bgGrad: ['#0D233A', '#050E18'],
    symbol: '💧',
  }),
  dragon: Object.freeze({
    key: 'dragon',
    label: 'DRAGON',
    color: '#7C3AED',      // Imperial dragon amethyst
    rim: '#4C1D95',
    accent: '#DDD6FE',
    bgDark: '#150B24',
    bgGrad: ['#23113D', '#0C0615'],
    symbol: '🛡️',
  }),
  colorless: Object.freeze({
    key: 'colorless',
    label: 'COLORLESS',
    color: '#94A3B8',      // Neutral platinum titanium
    rim: '#475569',
    accent: '#F1F5F9',
    bgDark: '#121419',
    bgGrad: ['#1C2028', '#0A0C0F'],
    symbol: '⚪',
  }),
});

/**
 * Maps fighter types to elemental energy types.
 */
const TYPE_ELEMENT_MAP = {
  // Fighting (Brawlers & Martial Artists)
  todo: 'fighting',
  yuji: 'fighting',
  saitama: 'fighting',
  naoya: 'fighting',
  escanor: 'fighting',
  berserker: 'fighting',
  spike: 'fighting',
  melee: 'fighting',

  // Psychic / Cursed (Sorcerers, Domain Users & Mentalists)
  gojo: 'psychic',
  sukuna: 'psychic',
  makima: 'psychic',
  megumi: 'psychic',
  choso: 'psychic',
  mahito: 'psychic',
  nobara: 'psychic',
  circe: 'psychic',
  hydra: 'psychic',
  yuta: 'psychic',
  doppelganger: 'psychic',
  doppleganger: 'psychic',

  // Steel (Weapon Masters, Swordsmen & Armor)
  toji: 'steel',
  maki: 'steel',
  alucard: 'steel',
  musashi: 'steel',
  knight: 'steel',
  pekka: 'steel',
  guts: 'steel',
  nanami: 'steel',
  inosuke: 'steel',
  tanjiro: 'steel',
  zenitsu: 'steel',

  // Fire (Pyromancers, Explosives & Blast Users)
  ember: 'fire',
  bombardier: 'fire',
  bomber: 'fire',
  genos: 'fire',
  reze: 'fire',
  megumin: 'fire',

  // Lightning (Speedsters, Electric & High-Frequency)
  zeus: 'lightning',
  jazz: 'lightning',
  aimbot: 'lightning',

  // Darkness (Shadow Assassins, Cursed Spirits & Void)
  erebus: 'dark',
  black: 'dark',
  shinobi: 'dark',
  darkslategray: 'dark',
  avatarofemptiness: 'dark',
  avatar_of_emptiness: 'dark',
  ulquiorra: 'dark',
  power: 'dark',
  zombie: 'dark',

  // Grass (Flora, Botanical & Nature)
  crazydave: 'grass',
  crazy_dave: 'grass',
  plants: 'grass',

  // Water (Fluid Dynamics & Cold)
  layla: 'water',
  cronos: 'water',
  cronus: 'water',

  // Dragon / Colossal (Raid Bosses & Titans)
  ender_dragon: 'dragon',
  enderdragon: 'dragon',
  eye_of_cthulhu: 'dragon',
  namelessdeity: 'dragon',
  nameless_deity: 'dragon',
  draedon: 'dragon',

  // Colorless / Normal (Marksmen, Modern Tactical & Gun Shooters)
  sharpshooter: 'colorless',
  normal: 'colorless',
  cj: 'colorless',
  john_wick: 'colorless',
  johnwick: 'colorless',
  uryu: 'colorless',
  ishida: 'colorless',
  sans: 'colorless',
  rubbick: 'colorless',
  engineer: 'colorless',
  ruby: 'colorless',
  grenadier: 'colorless',
  hyperion: 'colorless',
  laser: 'colorless',
  nezuko: 'fire',
};

/**
 * Resolves the elemental energy type for a given fighter definition.
 * @param {{ type?: string, name?: string, category?: string }|null|undefined} def
 * @returns {typeof CARD_ELEMENTS.colorless}
 */
export function getFighterCardElement(def) {
  if (!def) return CARD_ELEMENTS.colorless;
  const rawKey = String(def.type || def.name || '').toLowerCase().replace(/[\s-]/g, '_');
  const matchedKey = TYPE_ELEMENT_MAP[rawKey];
  if (matchedKey && CARD_ELEMENTS[matchedKey]) {
    return CARD_ELEMENTS[matchedKey];
  }

  // Fallback by category
  const category = String(def.category || '').toLowerCase();
  if (category.includes('fantasy') || category.includes('magic')) return CARD_ELEMENTS.psychic;
  if (category.includes('mythology')) return CARD_ELEMENTS.dragon;
  if (category.includes('sci-fi') || category.includes('modern')) return CARD_ELEMENTS.colorless;
  if (category.includes('brawler') || category.includes('martial')) return CARD_ELEMENTS.fighting;

  return CARD_ELEMENTS.colorless;
}

/**
 * Draws a 16-bit retro pixel art elemental energy orb.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} elementKey 'fighting' | 'psychic' | 'steel' | 'fire' | 'lightning' | 'dark' | 'grass' | 'water' | 'dragon' | 'colorless'
 * @param {number} cx Center X
 * @param {number} cy Center Y
 * @param {number} r Radius
 */
export function drawEnergyOrb(ctx, elementKey, cx, cy, r) {
  const elem = CARD_ELEMENTS[elementKey] || CARD_ELEMENTS.colorless;

  ctx.save();

  // 1. Outer Dark Manga Ink Border (#090A0E)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#090A0E';
  ctx.fill();

  // 2. Beveled Metallic Colored Disc
  const discR = Math.max(2, r - 1.2);
  const grad = ctx.createLinearGradient(cx - discR, cy - discR, cx + discR, cy + discR);
  grad.addColorStop(0.00, elem.accent);
  grad.addColorStop(0.28, elem.color);
  grad.addColorStop(1.00, elem.rim);
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 3. Top Specular Glint Crescent
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy - discR * 0.28, discR * 0.65, Math.PI * 0.95, Math.PI * 2.05);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(1, discR * 0.28);
  ctx.stroke();
  ctx.restore();

  // 4. Procedural 16-Bit Pixel Element Glyph in Center
  _drawElementGlyph(ctx, elementKey, cx, cy, discR * 0.58);

  ctx.restore();
}

/**
 * Internal procedural glyph renderer for 16-bit energy symbols.
 * Scaled and centered with crisp fills and zero external font dependency.
 */
function _drawElementGlyph(ctx, elementKey, cx, cy, s) {
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#090A0E';
  ctx.lineWidth = 1.0;
  ctx.lineJoin = 'miter';

  switch (elementKey) {
    case 'fighting': {
      // Clenched Fist silhouette
      ctx.beginPath();
      ctx.rect(cx - s * 0.65, cy - s * 0.35, s * 1.3, s * 0.9);
      ctx.rect(cx - s * 0.45, cy - s * 0.75, s * 0.9, s * 0.45);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'psychic': {
      // 4-Point Mystic Star
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.25, cy - s * 0.25);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx + s * 0.25, cy + s * 0.25);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 0.25, cy + s * 0.25);
      ctx.lineTo(cx - s, cy);
      ctx.lineTo(cx - s * 0.25, cy - s * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'steel': {
      // Crossed Blades (X)
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.8, cy - s * 0.8);
      ctx.lineTo(cx + s * 0.8, cy + s * 0.8);
      ctx.moveTo(cx + s * 0.8, cy - s * 0.8);
      ctx.lineTo(cx - s * 0.8, cy + s * 0.8);
      ctx.lineWidth = Math.max(1.8, s * 0.45);
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      break;
    }
    case 'fire': {
      // Flame droplet
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.quadraticCurveTo(cx + s * 0.8, cy, cx, cy + s * 0.8);
      ctx.quadraticCurveTo(cx - s * 0.8, cy, cx, cy - s * 0.9);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'lightning': {
      // Lightning Zigzag
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.1, cy - s);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.05);
      ctx.lineTo(cx - s * 0.05, cy + s * 0.05);
      ctx.lineTo(cx - s * 0.2, cy + s * 0.95);
      ctx.lineTo(cx + s * 0.7, cy - s * 0.05);
      ctx.lineTo(cx + s * 0.05, cy - s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'dark': {
      // Crescent Moon
      ctx.beginPath();
      ctx.arc(cx - s * 0.1, cy, s * 0.75, Math.PI * 0.5, Math.PI * 1.5, false);
      ctx.arc(cx + s * 0.25, cy, s * 0.65, Math.PI * 1.4, Math.PI * 0.6, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'grass': {
      // Double Leaf
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.6, cy + s * 0.6);
      ctx.quadraticCurveTo(cx - s * 0.6, cy - s * 0.7, cx + s * 0.5, cy - s * 0.7);
      ctx.quadraticCurveTo(cx + s * 0.6, cy + s * 0.6, cx - s * 0.6, cy + s * 0.6);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'water': {
      // Teardrop
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.quadraticCurveTo(cx + s * 0.8, cy + s * 0.2, cx, cy + s * 0.8);
      ctx.quadraticCurveTo(cx - s * 0.8, cy + s * 0.2, cx, cy - s * 0.9);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'dragon': {
      // Dragon Crest Chevron
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.lineTo(cx + s * 0.8, cy - s * 0.2);
      ctx.lineTo(cx, cy + s * 0.85);
      ctx.lineTo(cx - s * 0.8, cy - s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    default: { // Colorless / Normal
      // Diamond Gem
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.85);
      ctx.lineTo(cx + s * 0.75, cy);
      ctx.lineTo(cx, cy + s * 0.85);
      ctx.lineTo(cx - s * 0.75, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}
