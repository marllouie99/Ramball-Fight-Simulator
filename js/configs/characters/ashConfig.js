// ─────────────────────────────────────────────
// ASH KETCHUM (POKÉMON TRAINER) CHARACTER CONFIG
// Pallet Town's World Monarch & Commander of the 4 Anime Aces
// Features:
// 1. Stationary Honeycomb Forcefield Barrier while Active Pokémon battles
// 2. Mobile Evasion State while waiting for Summon Cooldown after Pokémon faints
// 3. 4 Autonomous Anime Aces: Pikachu (#0025), Charizard (#0006), Greninja (#0658), Lucario (#0448)
// 4. Ultimate: 10,000,000 Volt Thunderbolt Barrage
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
  radius: 30,
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

  // Trainer Sideline Repositioning (Safe Vantage Points: Top-Middle, Left-Middle, Right-Middle)
  trainerSlowMoveMultiplier: 0.28, // Slow, deliberate trainer walk speed multiplier (~1.5 px/frame)
  trainerVantagePad: 42,           // Sideline wall offset padding in pixels

  // ──────────────────────────────────────────
  // Skill 1: Trainer Command — Signature Elemental Move (Thunderbolt / Flamethrower / Water Shuriken / Aura Sphere)
  // ──────────────────────────────────────────
  enableTrainerCommand: true,
  commandCooldownFrames: 150,        // 2.5s cooldown between special move commands
  initialCommandCooldownFrames: 180, // Initial delay before first trainer command (~3.0s at 60 FPS)
  commandDamageBonus: 1.25,          // +25% damage on commanded signature attacks

  // ──────────────────────────────────────────
  // Ultimate: 10,000,000 Volt Thunderbolt Barrage
  // ──────────────────────────────────────────
  enableUltimate: false,
  ultimateCooldownFrames: 780,        // 13.0s cooldown
  initialUltimateCooldownFrames: 240, // 4.0s initial cooldown at match start
  ultimateDurationFrames: 420,        // 7.0s duration
  ultimateBoltDamage: 18,

  // ──────────────────────────────────────────
  // Pokémon Aces Deployment Toggles (Enable / Disable Specific Pokémon Summons)
  // ──────────────────────────────────────────
  enablePikachu: true,
  enableCharizard: true,
  enableGreninja: true,
  enableLucario: true,

  // ──────────────────────────────────────────
  // Match Victory & Celebration Settings
  // ──────────────────────────────────────────
  victoryPoseDelayFrames: 45, // Delay frames (~0.75s) before active Pokémon transitions into victory pose animation

  // ──────────────────────────────────────────
  // Combat Stance & Cast Immunities
  // ──────────────────────────────────────────
  enablePokemonSkillImmunity: true, // Grants push back, pull, drag, and knockback immunity to Pokémon while casting skills

  // ──────────────────────────────────────────
  // Ash's 4 Anime Aces Roster Stats & Movesets (Canonical Empress catalog.bytes specs)
  // ──────────────────────────────────────────
  pokemonOrder: ['pikachu', 'charizard', 'greninja', 'lucario'],
  pokemonRoster: {
    pikachu: {
      id: 'pikachu',
      enabled: true,
      dexNumber: '0025',
      name: 'PIKACHU',
      themeColor: '#FACC15',
      secondaryColor: '#FEF08A',
      hp: 300,
      radius: 25,
      speed: 5.4,
      scale: 2.00,
      cryKey: 'cryPikachuStarter',
      starterCryKey: 'cryPikachuStarter',
      battleCryKey: 'cryPikachu',
      megaCryKey: 'cryPikachuStarter',
      get megaHudSkillLabel() { return null; },

      // ── Dedicated Skills Configuration (Fighter-Standard Schema) ──
      skills: {
        melee: {
          id: 'quickAttack_ironTail',
          name: 'QUICK ATTACK & IRON TAIL',
          damage: 18,
          reach: 64,
          cooldown: 34,
          initialCooldown: 20,       // Initial delay before first melee strike (~0.33s)
          initialCooldownFrames: 20,
          knockback: 6,
          hitStun: 12,
          dashMultiplier: 1.60,
          meleeSfx: 'ironTail',
          altMeleeSfx: 'quickAttack'
        },
        special: {
          id: 'thunderbolt',
          name: 'THUNDERBOLT!',
          hudLabel: 'THUNDERBOLT',
          windupCallout: 'PIKA...',
          attackCallout: '...CHUUUUUU!',
          cooldown: 135,             // Autonomous Thunderbolt cooldown (2.25s at 60 FPS)
          initialCooldown: 180,      // Initial cooldown before first Thunderbolt (~3.0s at 60 FPS)
          initialCooldownFrames: 180,
          windupFrames: 24,          // High-voltage cheek charging & spark gathering (~0.40s)
          beamDurationFrames: 58,    // Continuous sustained lightning torrent (~0.97s)
          beamTickRate: 5,           // Multi-tick damage delivered every 5 frames (~11 ticks)
          beamDamagePerTick: 4,      // Base damage per tick (~44 total damage across full beam)
          beamWidth: 42,             // Width/thickness of crackling electrical beam
          beamRange: 680,            // Screen-spanning reach across arena
          beamKnockbackPerTick: 1.6, // Continuous directional pushback driving enemy along beam
          paralyzeFramesPerTick: 20, // Electric stasis locks enemy inside the lightning stream
          stunAftermathFrames: 45,   // Aftermath electric stun duration on targets hit by beam (~0.75s)
          recoilPush: 0,             // Stationary stance: Pikachu plants feet firmly with zero backward recoil drift
          screenShake: 5.0,          // Sustained rumble during active beam discharge
          recoveryFrames: 16,        // Post-beam smoke cooling & recovery settle
          specialSfx: 'thunderbolt',
          // Backward compatibility aliases
          specialDamage: 45,
          specialRadius: 105,
          thunderboltSpeed: 13.8,
          thunderboltRadius: 16,
          specialParalyzeFrames: 36
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get initialMeleeCooldown() { return this.skills.melee.initialCooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get initialSpecialCooldown() { return this.skills.special.initialCooldown; },
      get initialSpecialDelayFrames() { return this.skills.special.initialCooldown; },
      get specialName() { return this.skills.special.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get windupCallout() { return this.skills.special.windupCallout; },
      get attackCallout() { return this.skills.special.attackCallout; },
      get stunAftermathFrames() { return this.skills.special.stunAftermathFrames; },
      get specialDamage() { return this.skills.special.specialDamage; },
      get specialRadius() { return this.skills.special.specialRadius; },
      get thunderboltSpeed() { return this.skills.special.thunderboltSpeed; },
      get thunderboltRadius() { return this.skills.special.thunderboltRadius; },
      get specialParalyzeFrames() { return this.skills.special.specialParalyzeFrames; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get altMeleeSfx() { return this.skills.melee.altMeleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    },
    charizard: {
      id: 'charizard',
      enabled: true,
      dexNumber: '0006',
      name: 'CHARIZARD',
      themeColor: '#F97316',
      secondaryColor: '#EF4444',
      hp: 350,
      radius: 50,
      speed: 5.0,
      scale: 3.65,
      cryKey: 'cryCharizard',

      // ── Dedicated Skills Configuration ──
      skills: {
        melee: {
          id: 'dragonClaw',
          name: 'DRAGON CLAW',
          damage: 24,
          reach: 78,
          cooldown: 42,
          initialCooldown: 24,          // Initial delay before first melee strike (~0.40s)
          initialCooldownFrames: 24,
          knockback: 8,
          hitStun: 14,
          meleeSfx: 'dragonClaw'
        },
        special: {
          id: 'flamethrower',
          name: 'FLAMETHROWER!',
          hudLabel: 'FLAMETHROWER',
          windupCallout: 'CHAR...',
          attackCallout: '...ROOOAAAR!',
          cooldown: 200,                // Autonomous Flamethrower cooldown
          initialCooldown: 200,         // Initial cooldown before first Flamethrower (~3.0s at 60 FPS)
          initialCooldownFrames: 200,
          windupFrames: 28,             // Deep inhale & throat fire gathering (~0.45s)
          streamDurationFrames: 120,    // Steady 2.0s continuous raging flame torrent (120 frames at 60 FPS)
          beamDurationFrames: 120,      // Alias for streamDurationFrames
          streamTurnRate: 0.085,        // Dynamic aim tracking speed while firing Flamethrower (~4.9°/frame at 60 FPS)
          turnRate: 0.085,              // Alias for streamTurnRate
          streamTickRate: 6,            // Multi-tick damage delivered every 6 frames (~20 ticks across 2s)
          streamDamagePerTick: 3,       // Damage per tick (~60 total damage across full stream)
          streamWidth: 48,              // Width/thickness of expanding raging fire jet
          streamRange: 680,             // Screen-spanning reach across arena
          streamKnockbackPerTick: 1.2,  // Sustained thermal push driving enemies back
          burnDps: 6,                   // Searing burn damage over time
          burnDurationFrames: 180,      // 3.0s burn status aftermath
          recoveryFrames: 24,           // Breather recovery settle: stationary smoke cooling (~0.40s)
          breatherFrames: 24,           // Alias for recoveryFrames
          recoilPush: 0,                // Steady planted stance: Charizard plants feet firmly with zero backward drift
          screenShake: 4.5,             // Sustained deep rumble during active flame discharge
          specialSfx: 'flamethrower',
          // Backward compatibility aliases
          damage: 32,
          specialDamage: 32,
          specialRadius: 120
        },
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get initialMeleeCooldown() { return this.skills.melee.initialCooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get initialSpecialCooldown() { return this.skills.special.initialCooldown; },
      get initialSpecialDelayFrames() { return this.skills.special.initialCooldown; },
      get specialName() { return this.skills.special.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get windupCallout() { return this.skills.special.windupCallout; },
      get attackCallout() { return this.skills.special.attackCallout; },
      get windupFrames() { return this.skills.special.windupFrames; },
      get streamDurationFrames() { return this.skills.special.streamDurationFrames; },
      get beamDurationFrames() { return this.skills.special.streamDurationFrames; },
      get streamTickRate() { return this.skills.special.streamTickRate; },
      get streamDamagePerTick() { return this.skills.special.streamDamagePerTick; },
      get streamWidth() { return this.skills.special.streamWidth; },
      get streamRange() { return this.skills.special.streamRange; },
      get streamKnockbackPerTick() { return this.skills.special.streamKnockbackPerTick; },
      get recoveryFrames() { return this.skills.special.recoveryFrames; },
      get breatherFrames() { return this.skills.special.recoveryFrames; },
      get specialDamage() { return this.skills.special.damage; },
      get specialRadius() { return this.skills.special.specialRadius; },
      get burnDps() { return this.skills.special.burnDps; },
      get burnDurationFrames() { return this.skills.special.burnDurationFrames; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    },
    greninja: {
      id: 'greninja',
      enabled: true,
      dexNumber: '0658',
      name: 'ASH-GRENINJA',
      themeColor: '#3B82F6',
      secondaryColor: '#EC4899',
      hp: 165,
      radius: 30,
      speed: 6.8,
      scale: 2.50,
      cryKey: 'cryGreninja',

      // ── Dedicated Skills Configuration ──
      skills: {
        melee: {
          id: 'nightSlash',
          name: 'NIGHT SLASH',
          damage: 20,
          reach: 70,
          cooldown: 30,
          initialCooldown: 18,          // Initial delay before first melee strike (~0.30s)
          initialCooldownFrames: 18,
          knockback: 6,
          hitStun: 10,
          meleeSfx: 'nightSlash'
        },
        special: {
          id: 'waterShuriken',
          name: 'WATER SHURIKEN!',
          hudLabel: 'WATER SHURIKEN',
          cooldown: 135,
          initialCooldown: 100,         // Initial cooldown before first Water Shuriken (~1.67s at 60 FPS)
          initialCooldownFrames: 100,
          windupFrames: 14,
          damage: 14,
          shurikenCount: 3,
          shurikenSpeed: 11.5,
          specialRadius: 90,
          specialSfx: 'waterShuriken'
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get initialMeleeCooldown() { return this.skills.melee.initialCooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get initialSpecialCooldown() { return this.skills.special.initialCooldown; },
      get initialSpecialDelayFrames() { return this.skills.special.initialCooldown; },
      get specialName() { return this.skills.special.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get specialDamage() { return this.skills.special.damage; },
      get shurikenCount() { return this.skills.special.shurikenCount; },
      get shurikenSpeed() { return this.skills.special.shurikenSpeed; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
    },
    lucario: {
      id: 'lucario',
      enabled: true,
      dexNumber: '0448',
      name: 'LUCARIO',
      themeColor: '#06B6D4',
      secondaryColor: '#1E40AF',
      hp: 190,
      radius: 30,
      speed: 5.8,
      scale: 1.55,
      cryKey: 'cryLucario',

      // ── Dedicated Skills Configuration ──
      skills: {
        melee: {
          id: 'closeCombat',
          name: 'CLOSE COMBAT',
          damage: 22,
          reach: 68,
          cooldown: 35,
          initialCooldown: 20,          // Initial delay before first melee strike (~0.33s)
          initialCooldownFrames: 20,
          knockback: 9,
          hitStun: 16,
          meleeSfx: 'closeCombat'
        },
        special: {
          id: 'auraSphere',
          name: 'AURA SPHERE!',
          hudLabel: 'AURA SPHERE',
          cooldown: 145,
          initialCooldown: 100,         // Initial cooldown before first Aura Sphere (~1.67s at 60 FPS)
          initialCooldownFrames: 100,
          windupFrames: 22,
          damage: 30,
          auraSphereSpeed: 9.5,
          radius: 22,
          specialRadius: 100,
          specialSfx: 'auraSphere'
        }
      },

      // Backward compatibility getters
      get meleeDamage() { return this.skills.melee.damage; },
      get meleeReach() { return this.skills.melee.reach; },
      get meleeCooldown() { return this.skills.melee.cooldown; },
      get initialMeleeCooldown() { return this.skills.melee.initialCooldown; },
      get specialCooldown() { return this.skills.special.cooldown; },
      get initialSpecialCooldown() { return this.skills.special.initialCooldown; },
      get initialSpecialDelayFrames() { return this.skills.special.initialCooldown; },
      get specialName() { return this.skills.special.name; },
      get hudSkillLabel() { return this.skills.special.hudLabel; },
      get specialDamage() { return this.skills.special.damage; },
      get auraSphereSpeed() { return this.skills.special.auraSphereSpeed; },
      get meleeSfx() { return this.skills.melee.meleeSfx; },
      get specialSfx() { return this.skills.special.specialSfx; }
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
      charge: 'Assets/model/ash/pokemon/pikachu/Charge-Anim.png',
      pose: 'Assets/model/ash/pokemon/pikachu/Pose-Anim.png',
      sleep: 'Assets/model/ash/pokemon/pikachu/Sleep-Anim.png',
      victory: 'Assets/model/ash/pokemon/pikachu/Pose-Anim.png',
      thunderbolt: 'Assets/model/ash/pokemon/pikachu/Thunderbolt/thunderbolt-b.png',
      thunderboltImpact: 'Assets/model/ash/pokemon/pikachu/Thunderbolt_impact/impact-b.png'
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
      sleep: 'Assets/model/ash/pokemon/charizard/Sleep-Anim.png',
      victory: 'Assets/model/ash/pokemon/charizard/Sleep-Anim.png',
      flame: 'Assets/model/ash/pokemon/charizard/Flame/flamethrower-sheet.png',
      flameStrip: 'Assets/model/ash/pokemon/charizard/Flame/flamethrower-b.png',
      flameFrames: Array.from({ length: 18 }, (_, i) => `Assets/model/ash/pokemon/charizard/Flame/flamethrower-${i + 1}.png`),
      flameCharge: 'Assets/model/ash/pokemon/charizard/Flame_charge/flame_charge-b.png',
      flameChargeSheet: 'Assets/model/ash/pokemon/charizard/Flame_charge/flame_charge-sheet.png',
      flameChargeFrames: Array.from({ length: 12 }, (_, i) => `Assets/model/ash/pokemon/charizard/Flame_charge/flame_charge-${i + 1}.png`)
    },
    greninja: {
      idle: 'Assets/model/ash/pokemon/greninja/Idle-Anim.png',
      walk: 'Assets/model/ash/pokemon/greninja/Walk-Anim.png',
      attack: 'Assets/model/ash/pokemon/greninja/Attack-Anim.png',
      special: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',
      shoot: 'Assets/model/ash/pokemon/greninja/Shoot-Anim.png',
      hurt: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',
      faint: 'Assets/model/ash/pokemon/greninja/Hurt-Anim.png',
      charge: 'Assets/model/ash/pokemon/greninja/Charge-Anim.png',
      rearUp: 'Assets/model/ash/pokemon/greninja/RearUp-Anim.png',
      sleep: 'Assets/model/ash/pokemon/greninja/Sleep-Anim.png',
      victory: 'Assets/model/ash/pokemon/greninja/RearUp-Anim.png'
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
      rearUp: 'Assets/model/ash/pokemon/lucario/RearUp-Anim.png',
      sleep: 'Assets/model/ash/pokemon/lucario/Sleep-Anim.png',
      tumbleBack: 'Assets/model/ash/pokemon/lucario/TumbleBack-Anim.png',
      victory: 'Assets/model/ash/pokemon/lucario/TumbleBack-Anim.png'
    }
  },

  // ──────────────────────────────────────────
  // Audio Configuration
  // ──────────────────────────────────────────
  sounds: {
    faint: 'Assets/Sound Effects/PokemonSFX/faint.ogg',
    pokeballThrow: 'Assets/Sound Effects/PokemonSFX/pb_throw.ogg',
    pbThrow: 'Assets/Sound Effects/PokemonSFX/pb_throw.ogg',
    pokeballRelease: 'Assets/Sound Effects/PokemonSFX/pb_rel.ogg',
    pbRelease: 'Assets/Sound Effects/PokemonSFX/pb_rel.ogg',
    hitStrong: 'Assets/Sound Effects/PokemonSFX/hit_strong.ogg',
    hitWeak: 'Assets/Sound Effects/PokemonSFX/hit.ogg',

    // Cries
    cryPikachu: 'Assets/Sound Effects/PokemonSFX/pikachu.ogg',
    cryPikachuStarter: 'Assets/Sound Effects/PokemonSFX/pikachu-starter.ogg',
    cryCharizard: 'Assets/Sound Effects/PokemonSFX/charizard.ogg',
    cryGreninja: 'Assets/Sound Effects/PokemonSFX/greninja.ogg',
    cryLucario: 'Assets/Sound Effects/PokemonSFX/lucario.ogg',

    // Pikachu Moves
    quickAttack: 'Assets/Sound Effects/PokemonSFX/quickattack.ogg',
    ironTail: 'Assets/Sound Effects/PokemonSFX/irontail-1.ogg',
    ironTailCast: 'Assets/Sound Effects/PokemonSFX/irontail-2.ogg',
    thunderbolt: 'Assets/Sound Effects/PokemonSFX/thunderbolt-1.ogg',
    thunderboltCast: 'Assets/Sound Effects/PokemonSFX/thunderbolt-2.ogg',
    voltTackle: 'Assets/Sound Effects/PokemonSFX/volttackle-1.ogg',
    voltTackleCast: 'Assets/Sound Effects/PokemonSFX/volttackle-2.ogg',

    // Charizard Moves
    dragonClaw: 'Assets/Sound Effects/PokemonSFX/dragonclaw.ogg',
    flamethrower: 'Assets/Sound Effects/PokemonSFX/Flamethrower.mp3',
    fireBlast: 'Assets/Sound Effects/PokemonSFX/fireblast.ogg',

    // Greninja Moves
    nightSlash: 'Assets/Sound Effects/PokemonSFX/nightslash-1.ogg',
    nightSlashCast: 'Assets/Sound Effects/PokemonSFX/nightslash-2.ogg',
    aerialAce: 'Assets/Sound Effects/PokemonSFX/aerialace.ogg',
    waterShuriken: 'Assets/Sound Effects/PokemonSFX/waterpulse-1.ogg',
    waterShurikenCast: 'Assets/Sound Effects/PokemonSFX/waterpulse-2.ogg',

    // Lucario Moves
    closeCombat: 'Assets/Sound Effects/PokemonSFX/closecombat.ogg',
    bulletPunch: 'Assets/Sound Effects/PokemonSFX/bulletpunch.ogg',
    machPunch: 'Assets/Sound Effects/PokemonSFX/machpunch.ogg',
    auraSphere: 'Assets/Sound Effects/PokemonSFX/aurasphere-1.ogg',
    auraSphereCast: 'Assets/Sound Effects/PokemonSFX/aurasphere-2.ogg'
  },
  soundVolumes: {
    faint: 0.90,
    pokeballThrow: 0.85,
    pbThrow: 0.85,
    pokeballRelease: 0.90,
    pbRelease: 0.90,
    hitStrong: 0.85,
    hitWeak: 0.70,
    cryPikachu: 0.85,
    cryPikachuStarter: 0.95,
    cryCharizard: 0.90,
    cryGreninja: 0.85,
    cryLucario: 0.85,
    quickAttack: 0.85,
    ironTail: 0.90,
    ironTailCast: 0.90,
    thunderbolt: 0.90,
    thunderboltCast: 0.90,
    voltTackle: 0.95,
    voltTackleCast: 0.95,
    dragonClaw: 0.90,
    flamethrower: 0.85,
    fireBlast: 0.85,
    nightSlash: 0.90,
    nightSlashCast: 0.90,
    aerialAce: 0.85,
    waterShuriken: 0.85,
    waterShurikenCast: 0.85,
    closeCombat: 0.90,
    bulletPunch: 0.80,
    machPunch: 0.80,
    auraSphere: 0.85,
    auraSphereCast: 0.85
  }
};

// Explicit syntax anchor
void 0;
