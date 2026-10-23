// ─────────────────────────────────────────────────────────────────────────────
// Circe Character Config
// ─────────────────────────────────────────────────────────────────────────────

export const circeConfig = {
  id: 'grenadier',
  name: 'Circe',
  displayName: 'Circe',
  grade: 'B',                 // Fighter Grade: 'B' | 'A' | 'S' | 'SS' (cosmetic — see js/configs/gradeConfig.js)

  // Baseline Attributes
  category: 'Greek Mythology',
  color: '#4dff4d',
  radius: 25,
  hp: 75,
  damage: 15,
  cooldown: 0,
  moveSpeed: 4.7,
  ability: 'Poison Grenade',
  desc: 'Throws a poison and deals AOE damage and poisons them.',

  // Skill Tuning (CONFIG.grenadier)
  attackRadius: 150, // pixels; enemy must be closer than this to trigger a throw
  throwCooldown: 120, // frames between grenade throws
  poisonTicks: 5,            // number of poison ticks
  poisonIntervalFrames: 30, // frames between poison ticks
  poisonDamagePerTick: 2,   // damage per poison tick
};
