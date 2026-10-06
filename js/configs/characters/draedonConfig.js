// ─────────────────────────────────────────────
// Draedon / Exo Electric Disintegrator Character Config
// Terraria: Calamity Mod — Supreme Exo-Mechanical Mastermind
// ─────────────────────────────────────────────

export const draedonConfig = {
  assets: {
    pixelSkin: 'Assets/model/ExoMech/Exo-Disintegrator-PIXEL-SKIN.png',
    marsMissile: 'Assets/model/ExoMech/ExoMech-MarsMissile.png',
    marsMissileGlow: 'Assets/model/ExoMech/ExoMech-MarsMissileGlow.png',
    railgunCannon: 'Assets/model/ExoMech/ExoMech-RailgunCannon.png',
    railgunCannonGlowmask: 'Assets/model/ExoMech/ExoMech-RailgunCannonGlowmask.png',
    unstableEnergyCannon: 'Assets/model/ExoMech/ExoMech-UnstableEnergyCannon.png',
    unstableEnergyCannonGlowmask: 'Assets/model/ExoMech/ExoMech-UnstableEnergyCannonGlowmask.png',
    unstableEnergyCannonScrollMap: 'Assets/model/ExoMech/ExoMech-UnstableEnergyCannonScrollMap.png',
    unstableEnergyCannonScrollMapBlurred: 'Assets/model/ExoMech/ExoMech-UnstableEnergyCannonScrollMapBlurred.png',
    solynSentientStar: 'Assets/model/ExoMech/ExoMech-SolynSentientStar.png',
  },

  id: 'draedon',
  name: 'Draedon',
  displayName: 'Draedon',
  category: 'Gaming',
  bossTitle: 'Architect of the Exo Mechs',
  title: 'Architect of the Exo Mechs',

  // Core Combat Stats
  hp: 430,
  maxHp: 430,
  speed: 4.6,
  moveSpeed: 4.6,
  radius: 28,
  r: 28,
  damage: 18,
  cooldown: 32,
  projectileSpeedMultiplier: 1.0,

  // Theme & Aesthetics Palette
  color: '#06B6D4',          // Exo Plasma Cyan
  themeColor: '#06B6D4',     // Primary Theme Color
  secondaryColor: '#F59E0B', // Ares Plasma Amber
  accentRed: '#EF4444',      // Laser Reticle Red
  accentGreen: '#10B981',    // Thanatos Electric Mint
  accentWhite: '#FFFFFF',    // Core Plasma White
  accentDark: '#0B0F19',     // Deep Obsidian Exo-Chassis

  ability: 'Exo Electric Disintegrator & Ares Artillery',
  desc: 'The apex cybernetic scientist from Terraria: Calamity Mod. Commands high-frequency Exo-Pulse Blasters, Ares Gauss Artillery, Thanatos Refractive Shields, and unleashes the apocalyptic "Exo Electric Disintegrator" multi-stream melting beam.',

  // ──────────────────────────────────────────
  // Basic Attack: Twin Exo-Pulse Blaster
  // ──────────────────────────────────────────
  enableExoPulse: true,
  pulseDamage: 12,
  pulseSpeed: 12.0,
  pulseCount: 2,
  pulseSpreadOffset: 12,

  // ──────────────────────────────────────────
  // Skill 1: Ares Gauss Artillery (Homing Missile Volley)
  // ──────────────────────────────────────────
  enableAresArtillery: true,
  artilleryCooldown: 380,
  artilleryRocketCount: 4,
  artilleryDamagePerRocket: 9,
  artillerySpeed: 7.5,
  artilleryHomingStrength: 0.08,
  artilleryExplosionRadius: 36,
  artilleryColor: '#F59E0B',

  // ──────────────────────────────────────────
  // Skill 2: Thanatos Energy Matrix (Refractive Armor & Shockwave)
  // ──────────────────────────────────────────
  enableThanatosMatrix: true,
  matrixCooldown: 440,
  matrixDuration: 120,
  matrixDamageReduction: 0.35,  // 35% incoming damage mitigation while active
  matrixDischargeDamage: 30,
  matrixDischargeRadius: 110,
  matrixColor: '#10B981',

  // ──────────────────────────────────────────
  // Skill 3: Artemis & Apollo Cross-Lasers (Precision Strafe)
  // ──────────────────────────────────────────
  enableArtemisApolloLasers: true,
  crossLaserCooldown: 480,
  crossLaserDamage: 36,
  crossLaserRange: 450,
  crossLaserWidth: 16,
  crossLaserColor: '#EF4444',

  // ──────────────────────────────────────────
  // Ultimate: Exo Electric Disintegrator (Multi-Stream Plasma Melting Beam)
  // ──────────────────────────────────────────
  enableExoDisintegrator: true,
  disintegratorCooldown: 820,
  disintegratorWindupFrames: 40,   // High-voltage coil charging & arcs
  disintegratorFireFrames: 95,     // Searing continuous disintegration beam
  disintegratorRecoveryFrames: 25, // Heat dissipation & cooling vents
  disintegratorTotalDamage: 135,   // Heavy high-frequency melting ticks
  disintegratorTickInterval: 4,
  disintegratorBeamWidth: 42,
  disintegratorKnockbackPerTick: 1.5,
  disintegratorRecoilImpulse: 2.0,
  disintegratorScreenShake: 6.0,
  disintegratorColor: '#06B6D4',
  disintegratorSecondaryColor: '#F59E0B',
};
