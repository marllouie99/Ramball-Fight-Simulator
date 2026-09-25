// ─────────────────────────────────────────────
// BOSS REGISTRY
// Catalog of boss-eligible fighters, presentation metadata, and featured boss flags
// ─────────────────────────────────────────────

export const BOSS_ROSTER = [
  {
    id: 'zeus',
    name: 'Zeus',
    title: 'KING OF OLYMPUS',
    subtitle: 'LORD OF THUNDER & THE HEAVENS',
    themeColor: '#00BFFF',
    isFeatured: true
  },
  {
    id: 'sukuna',
    name: 'Sukuna',
    title: 'KING OF CURSES',
    subtitle: 'DISASTER INCARNATE — RYOMEN SUKUNA',
    themeColor: '#DC2626',
    isFeatured: true
  },
  {
    id: 'gojo',
    name: 'Gojo',
    title: 'THE HONORED ONE',
    subtitle: 'LIMITLESS JUJUTSU SORCERER — SATORU GOJO',
    themeColor: '#38BDF8',
    isFeatured: true
  },
  {
    id: 'mahoraga',
    name: 'Mahoraga',
    title: 'DIVINE GENERAL',
    subtitle: 'EIGHT-HANDLED SWORD DIVERGENT SILA',
    themeColor: '#F59E0B',
    isFeatured: true
  },
  {
    id: 'escanor',
    name: 'Escanor',
    title: 'LION SIN OF PRIDE',
    subtitle: 'THE PINNACLE OF ALL RACES — THE ONE',
    themeColor: '#F97316',
    isFeatured: true
  },
  {
    id: 'makima',
    name: 'Makima',
    title: 'CONTROL DEVIL',
    subtitle: 'PUBLIC SAFETY SPECIAL DIVISION 4 LEADER',
    themeColor: '#EF4444',
    isFeatured: true
  },
  {
    id: 'yuta',
    name: 'Yuta',
    title: 'THE BUSH CAMPER',
    subtitle: 'SPECIAL GRADE SORCERER & CURSED SPIRIT QUEEN',
    themeColor: '#FF1493',
    isFeatured: true
  },
  {
    id: 'eye_of_cthulhu',
    name: 'Eye of Cthulhu',
    title: 'ANCIENT OCULAR HORROR',
    subtitle: 'YOU FEEL AN EVIL PRESENCE WATCHING YOU...',
    themeColor: '#E11D48',
    isFeatured: true
  }
];

export class BossRegistry {
  static getBossInfo(characterId) {
    if (!characterId) return null;
    return BOSS_ROSTER.find(b => b.id.toLowerCase() === characterId.toLowerCase()) || null;
  }

  static isFeaturedBoss(characterId) {
    const info = this.getBossInfo(characterId);
    return Boolean(info?.isFeatured);
  }
}
