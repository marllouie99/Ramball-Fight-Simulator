// ─────────────────────────────────────────────
// ASH KETCHUM (POKÉMON TRAINER) CHARACTER CONFIG
// Pallet Town's World Monarch & Commander of the 4 Anime Aces
// Features:
// 1. Stationary Honeycomb Forcefield Barrier while Active Pokémon battles
// 2. Mobile Evasion State while waiting for Summon Cooldown after Pokémon faints
// 3. 4 Autonomous Anime Aces: Pikachu (#0025), Charizard (#0006), Greninja (#0658), Lucario (#0448)
// 4. Ultimate: Bond Phenomenon / Mega Evolution (Mega Charizard X & Mega Lucario) + 10,000,000 Volt Thunderbolt
// ─────────────────────────────────────────────

export const ashConfig = {
  id: 'ash',
  name: 'ASH',
  displayName: 'ASH',
  grade: 'SS', // Fighter Grade: 'B' | 'A' | 'S' | 'SS' | 'SSR'
  category: 'Anime & Gaming',
  bossTitle: 'World Coronation Monarch',
  title: 'World Coronation Monarch',

  // Universal Humanoid Baseline (Rule 24 — Toji Reference Standard)
  r: 25,
  radius: 25,
  hp: 360,
  maxHp: 360,
  speed: 5.5,
  moveSpeed: 5.5,
  damage: 24,
  cooldown: 45,
  projectileSpeedMultiplier: 1.0,

  // Theme Palette
  color: '#EF4444',             // Poké Ball Crimson Red
  themeColor: '#FACC15',        // Pikachu Thunderbolt Gold
  secondaryColor: '#2563EB',    // Kanto Trainer Jacket Royal Blue
  damageNumberColor: '#FACC15', // Unified damage number color

  ability: 'Honeycomb Trainer Barrier & Pokémon Aces',
  desc: 'World Coronation Monarch of Pallet Town. Deploys Pikachu, Charizard, Greninja, and Lucario from Poké Balls! Projects an impenetrable Hexagonal Honeycomb Forcefield while his Pokémon battles on the field, resuming mobile evasion when his Pokémon faints until the next summon cooldown.',

  // ──────────────────────────────────────────
  // Core Mechanic: Poké Ball Deployment & Honeycomb Barrier
  // ──────────────────────────────────────────
  initialSummonDelayFrames: 30, // 0.5s at match start before throwing first Poké Ball
  summonCooldownFrames: 210,    // 3.5s mobile evasion window after active Pokémon faints
  pokeballThrowFrames: 18,      // Flight duration of thrown Poké Ball before popping open
  pokeballThrowDistance: 95,    // Distance in front of Ash where Poké Ball lands
  honeycombBarrierRadius: 46,   // Radius of hexagonal honeycomb dome shielding Ash
  honeycombBarrierColor: '#38BDF8',
  honeycombBarrierGold: '#FACC15',

  // ──────────────────────────────────────────
  // Skill 1: Trainer Command — Signature Elemental Move (Thunderbolt / Flamethrower / Water Shuriken / Aura Sphere)
  // ──────────────────────────────────────────
  enableTrainerCommand: true,
  commandCooldownFrames: 150,   // 2.5s cooldown between special move commands
  commandDamageBonus: 1.25,     // +25% damage on commanded signature attacks

  // ──────────────────────────────────────────
  // Ultimate: Bond Awakening & 10,000,000 Volt Barrage
  // ──────────────────────────────────────────
  enableMegaAwakening: true,
  ultimateCooldownFrames: 780,  // 13.0s cooldown
  ultimateDurationFrames: 420,  // 7.0s Mega Evolution / Bond Awakening duration
  ultimateBarrageBolts: 8,      // Multi-spectrum elemental bolts across the arena
  ultimateBoltDamage: 18,
  ultimatePokemonHealRatio: 0.50, // Restores 50% HP to active Pokémon upon awakening

  // ──────────────────────────────────────────
  // Ash's 4 Anime Aces Roster Stats & Movesets (Canonical Empress catalog.bytes specs)
  // ──────────────────────────────────────────
  pokemonOrder: ['pikachu', 'charizard', 'greninja', 'lucario'],
  pokemonRoster: {
    pikachu: {
      id: 'pikachu',
      dexNumber: '0025',
      name: 'PIKACHU',
      themeColor: '#FACC15',
      secondaryColor: '#FEF08A',
      hp: 155,
      radius: 25,
      speed: 5.4,
      scale: 1.45,
      meleeDamage: 18,
      meleeReach: 64,
      meleeCooldown: 34,
      specialCooldown: 135,      // Autonomous Thunderbolt cooldown (2.25s)
      specialName: 'THUNDERBOLT!',
      hudSkillLabel: 'THUNDERBOLT',
      specialDamage: 28,
      specialRadius: 105,
      thunderboltSpeed: 13.8,    // Canonical catalog.bytes speed: 830 px/s (~13.8 px/frame)
      thunderboltRadius: 16,     // Canonical catalog.bytes radius: 16
      specialParalyzeFrames: 36,
      cryKey: 'cryPikachu',
      megaCryKey: 'cryPikachuStarter',
      meleeSfx: 'ironTail',
      altMeleeSfx: 'quickAttack',
      specialSfx: 'thunderbolt'
    },
    charizard: {
      id: 'charizard',
      dexNumber: '0006',
      name: 'CHARIZARD',
      megaName: 'MEGA CHARIZARD X',
      themeColor: '#F97316',
      megaColor: '#38BDF8',
      secondaryColor: '#EF4444',
      hp: 210,
      radius: 26,
      speed: 5.0,
      scale: 1.65,
      meleeDamage: 24,
      meleeReach: 78,
      meleeCooldown: 42,
      specialCooldown: 150,
      specialName: 'FLAMETHROWER!',
      megaSpecialName: 'BLUE FLARE BLITZ!',
      hudSkillLabel: 'FLAMETHROWER',
      megaHudSkillLabel: 'BLUE FLARE BLITZ',
      specialDamage: 32,
      specialRadius: 120,
      burnDps: 5,
      burnDurationFrames: 150,
      cryKey: 'cryCharizard',
      megaCryKey: 'cryCharizardMega',
      meleeSfx: 'dragonClaw',
      specialSfx: 'flamethrower'
    },
    greninja: {
      id: 'greninja',
      dexNumber: '0658',
      name: 'ASH-GRENINJA',
      themeColor: '#3B82F6',
      secondaryColor: '#EC4899',
      hp: 165,
      radius: 22,
      speed: 6.8,
      scale: 1.50,
      meleeDamage: 20,
      meleeReach: 70,
      meleeCooldown: 30,
      specialCooldown: 135,
      specialName: 'WATER SHURIKEN!',
      hudSkillLabel: 'WATER SHURIKEN',
      specialDamage: 14, // Fires 3 piercing shurikens
      shurikenCount: 3,
      shurikenSpeed: 11.5,
      cryKey: 'cryGreninja',
      meleeSfx: 'nightSlash',
      specialSfx: 'waterShuriken'
    },
    lucario: {
      id: 'lucario',
      dexNumber: '0448',
      name: 'LUCARIO',
      megaName: 'MEGA LUCARIO',
      themeColor: '#06B6D4',
      megaColor: '#F43F5E',
      secondaryColor: '#1E40AF',
      hp: 190,
      radius: 23,
      speed: 5.8,
      scale: 1.55,
      meleeDamage: 22,
      meleeReach: 68,
      meleeCooldown: 35,
      specialCooldown: 145,
      specialName: 'AURA SPHERE!',
      megaSpecialName: 'MAX AURA SPHERE!',
      hudSkillLabel: 'AURA SPHERE',
      megaHudSkillLabel: 'MAX AURA SPHERE',
      specialDamage: 30,
      auraSphereSpeed: 9.5,
      cryKey: 'cryLucario',
      megaCryKey: 'cryLucarioMega',
      meleeSfx: 'closeCombat',
      specialSfx: 'auraSphere'
    }
  },

  // ──────────────────────────────────────────
  // Registered Assets (Verified by verifyCodebase.js)
  // ──────────────────────────────────────────
  assets: {
    hair: 'Assets/model/ash/Ash-hair.png',
    trainerSprite: 'Assets/model/ash/red.png',
    pikachu: {
      idle: 'Assets/model/ash/pokemon/pikachu/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/pikachu/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/pikachu/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/pikachu/Shock-Anim.png',
      shoot: 'Assets/model/ash/pokemon/pikachu/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/pikachu/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/pikachu/Faint-Anim.png',
      charge: 'Assets/model/ash/pokemon/pikachu/Charge-Anim.png'
    },
    charizard: {
      idle: 'Assets/model/ash/pokemon/charizard/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/charizard/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/charizard/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/charizard/Shoot-Anim.png',
      shoot: 'Assets/model/ash/pokemon/charizard/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/charizard/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/charizard/Faint-Anim.png',
      charge: 'Assets/model/ash/pokemon/charizard/Charge-Anim.png',
      megaIdle: 'Assets/model/ash/pokemon/charizard/mega/Idle-Anim.png',
      megaWalk: 'Assets/model/ash/pokemon/charizard/mega/Walk-Anim.png',
      megaAttack: 'Assets/model/ash/pokemon/charizard/mega/Attack-Anim.png',
      megaSpecial: 'Assets/model/ash/pokemon/charizard/mega/Shoot-Anim.png',
      megaHurt: 'Assets/model/ash/pokemon/charizard/mega/Hurt-Anim.png',
      megaCharge: 'Assets/model/ash/pokemon/charizard/mega/Charge-Anim.png'
    },
    greninja: {
      idle: 'Assets/model/ash/pokemon/greninja/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/greninja/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/greninja/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',
      shoot: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',
      charge: 'Assets/model/ash/pokemon/greninja/Charge-Anim.png'
    },
    lucario: {
      idle: 'Assets/model/ash/pokemon/lucario/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/lucario/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/lucario/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',
      shoot: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',
      hurt: 'Assets/model/ash/pokemon/lucario/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/lucario/Faint-Anim.png',
      charge: 'Assets/model/ash/pokemon/lucario/Charge-Anim.png',
      megaIdle: 'Assets/model/ash/pokemon/lucario/mega/Idle-Anim.png',
      megaWalk: 'Assets/model/ash/pokemon/lucario/mega/Walk-Anim.png',
      megaAttack: 'Assets/model/ash/pokemon/lucario/mega/Attack-Anim.png',
      megaSpecial: 'Assets/model/ash/pokemon/lucario/mega/RearUp-Anim.png',
      megaHurt: 'Assets/model/ash/pokemon/lucario/mega/Hurt-Anim.png',
      megaCharge: 'Assets/model/ash/pokemon/lucario/mega/Charge-Anim.png'
    }
  },

  // ──────────────────────────────────────────
  // Audio Configuration & Normalized Volumes (Exact Empress audio.bytes Mapping)
  // ──────────────────────────────────────────
  sounds: {
    pbThrow: 'Assets/Sound Effects/AshSFX/pb_throw.ogg',
    pbRelease: 'Assets/Sound Effects/AshSFX/pb_rel.ogg',
    faint: 'Assets/Sound Effects/AshSFX/faint.ogg',
    restore: 'Assets/Sound Effects/AshSFX/restore.ogg',
    megaFanfare: 'Assets/Sound Effects/AshSFX/level_up_fanfare.ogg',
    charge: 'Assets/Sound Effects/AshSFX/charge.ogg',
    hit: 'Assets/Sound Effects/AshSFX/hit.ogg',
    hitStrong: 'Assets/Sound Effects/AshSFX/hit_strong.ogg',
    cryPikachu: 'Assets/Sound Effects/AshSFX/pikachu.ogg',
    cryPikachuStarter: 'Assets/Sound Effects/AshSFX/pikachu-starter.ogg',
    cryCharizard: 'Assets/Sound Effects/AshSFX/charizard.ogg',
    cryCharizardMega: 'Assets/Sound Effects/AshSFX/charizard-megax.ogg',
    cryGreninja: 'Assets/Sound Effects/AshSFX/greninja.ogg',
    cryLucario: 'Assets/Sound Effects/AshSFX/lucario.ogg',
    cryLucarioMega: 'Assets/Sound Effects/AshSFX/lucario-mega.ogg',
    thunderbolt: 'Assets/Sound Effects/AshSFX/thunderbolt-1.ogg',
    thunderboltCast: 'Assets/Sound Effects/AshSFX/thunderbolt-2.ogg',
    thunder: 'Assets/Sound Effects/AshSFX/thunder.ogg',
    thunderWave: 'Assets/Sound Effects/AshSFX/thunderwave.ogg',
    voltTackle: 'Assets/Sound Effects/AshSFX/volttackle-1.ogg',
    voltTackleCast: 'Assets/Sound Effects/AshSFX/volttackle-2.ogg',
    ironTail: 'Assets/Sound Effects/AshSFX/irontail-1.ogg',
    ironTailCast: 'Assets/Sound Effects/AshSFX/irontail-2.ogg',
    quickAttack: 'Assets/Sound Effects/AshSFX/quickattack.ogg',
    flamethrower: 'Assets/Sound Effects/AshSFX/flamethrower.ogg',
    fireBlast: 'Assets/Sound Effects/AshSFX/fireblast.ogg',
    dragonClaw: 'Assets/Sound Effects/AshSFX/dragonclaw.ogg',
    waterShuriken: 'Assets/Sound Effects/AshSFX/waterpulse-1.ogg',
    waterShurikenCast: 'Assets/Sound Effects/AshSFX/waterpulse-2.ogg',
    nightSlash: 'Assets/Sound Effects/AshSFX/nightslash-1.ogg',
    nightSlashCast: 'Assets/Sound Effects/AshSFX/nightslash-2.ogg',
    auraSphere: 'Assets/Sound Effects/AshSFX/aurasphere-1.ogg',
    auraSphereCast: 'Assets/Sound Effects/AshSFX/aurasphere-2.ogg',
    closeCombat: 'Assets/Sound Effects/AshSFX/closecombat.ogg',
    barrierBlock: 'Assets/Sound Effects/Skills/parry.mp3'
  },

  soundVolumes: {
    pbThrow: 0.90,
    pbRelease: 0.95,
    faint: 0.85,
    restore: 0.85,
    megaFanfare: 0.95,
    charge: 0.80,
    hit: 0.85,
    hitStrong: 0.92,
    cryPikachu: 0.95,
    cryPikachuStarter: 1.0,
    cryCharizard: 1.0,
    cryCharizardMega: 1.0,
    cryGreninja: 0.95,
    cryLucario: 0.95,
    cryLucarioMega: 1.0,
    thunderbolt: 0.95,
    thunderboltCast: 1.0,
    thunder: 1.0,
    thunderWave: 0.90,
    voltTackle: 0.90,
    voltTackleCast: 0.95,
    ironTail: 0.90,
    ironTailCast: 0.95,
    quickAttack: 0.90,
    flamethrower: 0.95,
    fireBlast: 1.0,
    dragonClaw: 0.90,
    waterShuriken: 0.90,
    waterShurikenCast: 0.95,
    nightSlash: 0.90,
    nightSlashCast: 0.95,
    auraSphere: 0.95,
    auraSphereCast: 1.0,
    closeCombat: 0.95,
    barrierBlock: 0.45
  }
};
