import { state, spawnFloatingText, triggerGlobalScreenShake } from '../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { GAME_MODES, MODE_SETTINGS } from '../core/modeConfig.js';
import { audioSystem } from './audioSystem.js';
import { FIGHTER_CLASS_MAP } from '../entities/factories/fighterFactory.js';
import { resolveEntityPlusObstacleCollision, getArenaObstacles } from './arenaObstacleSystem.js';
import { drawSurvivorUpgradeModal } from '../graphics/ui/SurvivorUpgradeModal.js';
import { spawnSparks } from '../graphics/particles/sparkEffect.js';
function _playSfx(id, volume = 1.0) {
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
    audioSystem.playSFX(id, volume);
  }
}


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CIRCLE SURVIVOR SYSTEM (VAMPIRE SURVIVORS HORDE MODE)
 * Manages horde wave spawning, XP gems, vacuum magnetism, 3-card upgrades,
 * modular survivor weapons (Orbiters, Garlic Aura, Kunai, Thunder, Scythe),
 * auto-aim combat, and 3-minute timed boss progression.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export class SurvivorSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      active: false,
      timer: 0,                   // 60 FPS match frame ticks
      maxDuration: 180 * 60,       // 3 minutes (10,800 frames)
      kills: 0,
      level: 1,
      xp: 0,
      nextXp: 35,
      isPausedForUpgrade: false,
      upgradeChoices: [],
      spawnTimer: 0,
      spawnInterval: 120,          // Every 2 seconds initially
      maxConcurrentMobs: 30,
      miniBoss1Spawned: false,
      miniBoss2Spawned: false,
      finalBossSpawned: false,
      finalBossDefeated: false,
      runVictory: false,
      runDefeat: false,

      // Active Survivor Weapons & Ranks (0 = not acquired, 1-5 = rank)
      weapons: {
        orbiters: { level: 1, angle: 0, cooldown: 0 },
        garlic:   { level: 0, timer: 0, pulseRadius: 0, maxRadius: 110 },
        kunai:    { level: 0, cooldown: 0 },
        thunder:  { level: 0, cooldown: 0 },
        scythe:   { level: 0, cooldown: 0 },
      },

      // Passive Stat Boosters
      passives: {
        might: 1.0,        // Damage multiplier
        swiftness: 1.0,    // Move speed multiplier
        toughness: 0,      // Bonus Max HP
        haste: 1.0,        // Cooldown multiplier (lower is faster)
        magnet: 1.0,       // Gem attraction radius multiplier
        vampirism: 0,      // HP restored per kill
      },

      // Active visual projectiles & projectiles
      activeKunais: [],
      activeScythes: [],
      activeThunderBolts: [],
    };

    this.gems = [];
    this.hordeMobs = [];
  }

  /**
   * Initializes survivor match state when a new game starts.
   */
  initMatch(playerFighter) {
    this.reset();
    this.state.active = true;

    const cfg = this._getSurvivorConfig();
    const startHp = typeof cfg.playerFixedHp === 'number' ? cfg.playerFixedHp : 500;

    if (playerFighter) {
      playerFighter.maxHp = startHp;
      playerFighter.hp = startHp;
      playerFighter.isSurvivorPlayer = true;
      if (typeof cfg.speedMultiplier === 'number') {
        playerFighter.speedMultiplier = cfg.speedMultiplier;
      }
    }

    // Starting weapon selection
    const startWep = cfg.startingWeapon || 'orbiters';
    for (const k in this.state.weapons) {
      this.state.weapons[k].level = (k === startWep) ? 1 : 0;
    }

    // Dynamic duration and milestone timers
    const matchDurationSec = typeof cfg.matchDurationSec === 'number' ? cfg.matchDurationSec : 180;
    this.state.maxDuration = matchDurationSec * 60;
    this.state.miniBoss1Time = (typeof cfg.miniBoss1TimeSec === 'number' ? cfg.miniBoss1TimeSec : 60) * 60;
    this.state.miniBoss2Time = (typeof cfg.miniBoss2TimeSec === 'number' ? cfg.miniBoss2TimeSec : 120) * 60;
    this.state.finalBossTime = (typeof cfg.finalBossTimeSec === 'number' ? cfg.finalBossTimeSec : matchDurationSec) * 60;

    state.survivorState = this.state;
  }

  /**
   * Main per-frame update loop for survivor mode.
   */
  update(playerFighter, arena) {
    if (!this.state.active || !playerFighter || playerFighter.hp <= 0) {
      if (this.state.active && playerFighter && playerFighter.hp <= 0 && !this.state.runDefeat) {
        this.state.runDefeat = true;
      }
      return;
    }

    // Freeze update while upgrade modal is open
    if (this.state.isPausedForUpgrade) {
      return;
    }

    this.state.timer++;

    // 1. Spawning Director
    this._updateSpawningDirector(playerFighter, arena);

    // 2. Update Horde Mobs (Knights)
    this._updateHordeMobs(playerFighter, arena);

    // 3. Update XP Gems & Vacuum Magnetism
    this._updateGems(playerFighter);

    // 4. Update Modular Survivor Weapons
    this._updateSurvivorWeapons(playerFighter, arena);

    // 5. Player Auto-Aim Helper
    this._updatePlayerAutoAim(playerFighter);

    // 6. Check Win Condition
    if (this.state.finalBossSpawned && this.state.finalBossDefeated && !this.state.runVictory) {
      this.state.runVictory = true;
      state.gameState = 'matchEnd';
      state.matchWinner = 0; // Player 1 Wins!
    }
  }

  /**
   * Helper to retrieve active mode settings from modeConfig.js.
   */
  _getSurvivorConfig() {
    if (typeof state !== 'undefined' && state.mode && MODE_SETTINGS[state.mode]) {
      return MODE_SETTINGS[state.mode];
    }
    return MODE_SETTINGS[GAME_MODES.SURVIVOR] || {};
  }

  /**
   * Spawns waves of horde mobs and scheduled bosses around the perimeter of the arena.
   * Dynamically respects spawnInterval, minSpawnInterval, spawnRateMultiplier,
   * spawnCountPerWave, maxConcurrentMobs, enemyPool, and milestone bosses from modeConfig.js.
   */
  _updateSpawningDirector(playerFighter, arena) {
    const cfg = this._getSurvivorConfig();
    const ar = arena || state.arena || { x: -300, y: -430, width: 1560, height: 1400 };
    const seconds = Math.floor(this.state.timer / 60);

    const baseInterval = typeof cfg.spawnInterval === 'number' ? cfg.spawnInterval : 60;
    const minInterval = typeof cfg.minSpawnInterval === 'number' ? cfg.minSpawnInterval : 20;
    const rateMultiplier = typeof cfg.spawnRateMultiplier === 'number' && cfg.spawnRateMultiplier > 0 ? cfg.spawnRateMultiplier : 1.0;
    const maxMobs = typeof cfg.maxConcurrentMobs === 'number' ? cfg.maxConcurrentMobs : 40;
    const baseSpawnCount = typeof cfg.spawnCountPerWave === 'number' ? cfg.spawnCountPerWave : 2;

    // Dynamic wave difficulty escalation (spawn interval shortens over time)
    let dynamicInterval = baseInterval;
    if (seconds >= 120) {
      dynamicInterval = Math.max(minInterval, Math.floor(baseInterval * 0.50));
    } else if (seconds >= 60) {
      dynamicInterval = Math.max(minInterval, Math.floor(baseInterval * 0.70));
    } else if (seconds >= 30) {
      dynamicInterval = Math.max(minInterval, Math.floor(baseInterval * 0.85));
    }

    this.state.spawnInterval = Math.max(minInterval, Math.round(dynamicInterval / rateMultiplier));
    this.state.maxConcurrentMobs = maxMobs;

    // Milestone: Mini-Boss 1 (Chest drop on defeat)
    const mb1Time = this.state.miniBoss1Time || 3600;
    if (this.state.timer >= mb1Time && !this.state.miniBoss1Spawned) {
      this.state.miniBoss1Spawned = true;
      const bCfg = cfg.bosses?.miniBoss1;
      this._spawnConfiguredBoss(playerFighter, ar, bCfg, {
        characterId: 'knight',
        name: 'Elite Knight Commander',
        hp: 450,
        radius: 32,
        speed: 1.9,
        damage: 18,
        isChestDrop: true,
        isFinalBoss: false,
      });
    }

    // Milestone: Mini-Boss 2 (Twin Paladins / Champions)
    const mb2Time = this.state.miniBoss2Time || 7200;
    if (this.state.timer >= mb2Time && !this.state.miniBoss2Spawned) {
      this.state.miniBoss2Spawned = true;
      const bCfg = cfg.bosses?.miniBoss2;
      if (Array.isArray(bCfg)) {
        bCfg.forEach(singleBossCfg => {
          this._spawnConfiguredBoss(playerFighter, ar, singleBossCfg, {
            characterId: 'knight',
            name: 'Paladin Champion',
            hp: 600,
            radius: 32,
            speed: 2.1,
            damage: 22,
            isChestDrop: true,
            isFinalBoss: false,
          });
        });
      } else {
        this._spawnConfiguredBoss(playerFighter, ar, bCfg, {
          characterId: 'knight',
          name: 'Paladin Champion',
          hp: 600,
          radius: 32,
          speed: 2.1,
          damage: 22,
          isChestDrop: true,
          isFinalBoss: false,
        });
      }
    }

    // Milestone: Climax Final Boss
    const fbTime = this.state.finalBossTime || (this.state.maxDuration || 10800);
    if (this.state.timer >= fbTime && !this.state.finalBossSpawned) {
      this.state.finalBossSpawned = true;
      const bCfg = cfg.bosses?.finalBoss;
      this._spawnConfiguredBoss(playerFighter, ar, bCfg, {
        characterId: 'knight',
        name: 'The Dark Overlord',
        hp: 1800,
        radius: 42,
        speed: 2.2,
        damage: 30,
        isChestDrop: false,
        isFinalBoss: true,
      });
    }

    // Regular Swarm Spawns
    this.state.spawnTimer++;
    if (this.state.spawnTimer >= this.state.spawnInterval && this.hordeMobs.length < this.state.maxConcurrentMobs) {
      this.state.spawnTimer = 0;
      const timeBonus = seconds > 90 ? 2 : (seconds > 45 ? 1 : 0);
      const spawnCount = baseSpawnCount + timeBonus;
      for (let i = 0; i < spawnCount; i++) {
        if (this.hordeMobs.length < this.state.maxConcurrentMobs) {
          this._spawnRegularMob(playerFighter, ar);
        }
      }
    }
  }

  /**
   * Spawns a regular horde mob chosen randomly from cfg.enemyPool.
   */
  _spawnRegularMob(playerFighter, ar) {
    const cfg = this._getSurvivorConfig();
    let pool = cfg.enemyPool;
    if (!Array.isArray(pool) || pool.length === 0) {
      if (typeof pool === 'string' && pool.trim()) {
        pool = [pool.trim()];
      } else {
        pool = ['knight'];
      }
    }

    const rawCharId = pool[Math.floor(Math.random() * pool.length)] || 'knight';
    const charKey = String(rawCharId).toLowerCase().trim();
    const FighterClass = FIGHTER_CLASS_MAP[charKey] || FIGHTER_CLASS_MAP[rawCharId] || FIGHTER_CLASS_MAP['knight'];
    if (!FighterClass) return;

    const coords = this._getRandomPerimeterPosition(ar);
    const seconds = Math.floor(this.state.timer / 60);

    // Dynamic stats scaling over time
    const hp = 45 + Math.min(100, seconds * 0.8);
    const speed = 1.6 + Math.min(1.0, seconds * 0.005);
    const damage = 10 + Math.min(15, Math.floor(seconds * 0.1));

    const baseDef = (typeof FIGHTER_DEFS !== 'undefined' && FIGHTER_DEFS.find(d => d && (d.type === charKey || d.characterId === charKey || d.name?.toLowerCase() === charKey))) || {};

    const def = {
      ...baseDef,
      id: 9000 + Math.floor(Math.random() * 99999),
      name: baseDef.name ? `${baseDef.name} Swarm` : `${rawCharId} Swarm`,
      color: baseDef.color || '#9e9e9e',
      themeColor: baseDef.themeColor || '#718096',
      startX: coords.x,
      startY: coords.y,
      startVx: 0,
      startVy: 0,
      radius: baseDef.radius || 20,
      type: rawCharId,
      characterId: rawCharId,
      hp: hp,
      maxHp: hp,
      damage: damage,
      cooldown: 40,
      moveSpeed: speed,
      isMinion: true,
      isSurvivorMob: true,
      team: 1,
    };

    const mob = new FighterClass(def);
    mob.x = coords.x;
    mob.y = coords.y;
    mob.team = 1;
    mob.characterId = rawCharId;
    mob.type = rawCharId;
    mob.isSurvivorMob = true;
    mob.isMinion = true;
    mob.touchAttackCooldown = 0;
    mob.maxHp = hp;
    mob.hp = hp;
    mob.damage = damage;
    mob.moveSpeed = speed;

    this.hordeMobs.push(mob);
    state.fighters.push(mob);
  }

  /**
   * Spawns a milestone mini-boss or climax final boss according to config.
   */
  _spawnConfiguredBoss(playerFighter, ar, userBossCfg, defaults) {
    let charId = defaults.characterId;
    let name = defaults.name;
    let hp = defaults.hp;
    let radius = defaults.radius;
    let speed = defaults.speed;
    let damage = defaults.damage;
    let isChestDrop = defaults.isChestDrop ?? true;
    let isFinalBoss = defaults.isFinalBoss ?? false;

    if (typeof userBossCfg === 'string') {
      charId = userBossCfg.trim();
      const baseDef = (typeof FIGHTER_DEFS !== 'undefined' && FIGHTER_DEFS.find(d => d && (d.type === charId.toLowerCase() || d.characterId === charId.toLowerCase())));
      if (baseDef && baseDef.name) {
        name = isFinalBoss ? `The Dark ${baseDef.name}` : `Elite ${baseDef.name}`;
      }
    } else if (userBossCfg && typeof userBossCfg === 'object') {
      if (userBossCfg.characterId) charId = userBossCfg.characterId;
      if (userBossCfg.name) name = userBossCfg.name;
      if (typeof userBossCfg.hp === 'number') hp = userBossCfg.hp;
      if (typeof userBossCfg.radius === 'number') radius = userBossCfg.radius;
      if (typeof userBossCfg.speed === 'number') speed = userBossCfg.speed;
      if (typeof userBossCfg.damage === 'number') damage = userBossCfg.damage;
      if (typeof userBossCfg.isChestDrop === 'boolean') isChestDrop = userBossCfg.isChestDrop;
      if (typeof userBossCfg.isFinalBoss === 'boolean') isFinalBoss = userBossCfg.isFinalBoss;
    }

    const charKey = String(charId).toLowerCase().trim();
    const FighterClass = FIGHTER_CLASS_MAP[charKey] || FIGHTER_CLASS_MAP[charId] || FIGHTER_CLASS_MAP['knight'];
    if (!FighterClass) return;

    const coords = this._getRandomPerimeterPosition(ar);
    const baseDef = (typeof FIGHTER_DEFS !== 'undefined' && FIGHTER_DEFS.find(d => d && (d.type === charKey || d.characterId === charKey || d.name?.toLowerCase() === charKey))) || {};

    const def = {
      ...baseDef,
      id: 99000 + Math.floor(Math.random() * 9999),
      name: name,
      color: isFinalBoss ? '#E53E3E' : (baseDef.color || '#ECC94B'),
      themeColor: isFinalBoss ? '#E53E3E' : (baseDef.themeColor || '#ECC94B'),
      startX: coords.x,
      startY: coords.y,
      startVx: 0,
      startVy: 0,
      radius: radius,
      type: charId,
      characterId: charId,
      hp: hp,
      maxHp: hp,
      damage: damage,
      cooldown: 30,
      moveSpeed: speed,
      isMinion: true,
      isSurvivorMob: true,
      isMiniBoss: !isFinalBoss,
      isFinalBoss: isFinalBoss,
      isChestDrop: isChestDrop,
      team: 1,
    };

    const boss = new FighterClass(def);
    boss.x = coords.x;
    boss.y = coords.y;
    boss.team = 1;
    boss.characterId = charId;
    boss.type = charId;
    boss.isSurvivorMob = true;
    boss.isMinion = true;
    boss.isMiniBoss = !isFinalBoss;
    boss.isFinalBoss = isFinalBoss;
    boss.isChestDrop = isChestDrop;
    boss.touchAttackCooldown = 0;
    boss.maxHp = hp;
    boss.hp = hp;
    boss.damage = damage;
    boss.moveSpeed = speed;

    this.hordeMobs.push(boss);
    state.fighters.push(boss);

    triggerGlobalScreenShake(4.0, 15);
    spawnFloatingText(`⚠️ ${name.toUpperCase()} APPROACHING!`, playerFighter.x, playerFighter.y - 60, isFinalBoss ? '#E53E3E' : '#ECC94B', 36);
  }

  _getRandomPerimeterPosition(ar) {
    const margin = 30;
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let x = 0, y = 0;

    switch (side) {
      case 0: // Top
        x = ar.x + Math.random() * ar.width;
        y = ar.y + margin;
        break;
      case 1: // Right
        x = ar.x + ar.width - margin;
        y = ar.y + Math.random() * ar.height;
        break;
      case 2: // Bottom
        x = ar.x + Math.random() * ar.width;
        y = ar.y + ar.height - margin;
        break;
      case 3: // Left
        x = ar.x + margin;
        y = ar.y + Math.random() * ar.height;
        break;
    }
    return { x, y };
  }

  /**
   * Updates all active horde mobs.
   */
  _updateHordeMobs(playerFighter, arena) {
    const ar = arena || state.arena;

    for (let i = this.hordeMobs.length - 1; i >= 0; i--) {
      const mob = this.hordeMobs[i];

      // Defeated check
      if (mob.hp <= 0 || mob.isDead || mob.dead) {
        this._handleMobDefeated(mob);
        this.hordeMobs.splice(i, 1);
        const idxInGlobal = state.fighters.indexOf(mob);
        if (idxInGlobal !== -1) {
          state.fighters.splice(idxInGlobal, 1);
        }
        continue;
      }

      // Tick attack cooldown and animation timers
      if (mob.touchAttackCooldown > 0) mob.touchAttackCooldown--;
      if (mob.slashSwingTimer > 0) mob.slashSwingTimer--;
      if (mob.meleeSwingTimer > 0) mob.meleeSwingTimer--;
      if (mob.punchAnimTimer > 0) mob.punchAnimTimer--;
      if (mob.spearThrustTimer > 0) mob.spearThrustTimer--;
      if (mob.katanaSlashTimer > 0) mob.katanaSlashTimer--;
      if (mob.hitStunTimer > 0) mob.hitStunTimer--;

      // Track & advance toward player
      const dx = playerFighter.x - mob.x;
      const dy = playerFighter.y - mob.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      let speed = mob.moveSpeed || 1.8;
      if (mob.hitStunTimer > 0) speed *= 0.35;
      if (mob.freezeTimer > 0) speed = 0;

      mob.gunAngle = Math.atan2(dy, dx);
      mob.angle = mob.gunAngle;

      if (speed > 0) {
        mob.vx = (dx / dist) * speed;
        mob.vy = (dy / dist) * speed;
        mob.x += mob.vx;
        mob.y += mob.vy;
      }

      // Obstacle & Wall Collisions
      resolveEntityPlusObstacleCollision(mob, ar);

      // Arena boundary clamp
      if (mob.x < ar.x + mob.r) { mob.x = ar.x + mob.r; mob.vx = Math.abs(mob.vx); }
      if (mob.x > ar.x + ar.width - mob.r) { mob.x = ar.x + ar.width - mob.r; mob.vx = -Math.abs(mob.vx); }
      if (mob.y < ar.y + mob.r) { mob.y = ar.y + mob.r; mob.vy = Math.abs(mob.vy); }
      if (mob.y > ar.y + ar.height - mob.r) { mob.y = ar.y + ar.height - mob.r; mob.vy = -Math.abs(mob.vy); }

      // Contact Touch Damage against Player
      if (dist < (mob.r + playerFighter.r)) {
        if (mob.touchAttackCooldown <= 0) {
          mob.touchAttackCooldown = 45;
          mob.slashSwingTimer = 16;
          mob.meleeSwingTimer = 16;
          mob.punchAnimTimer = 16;
          mob.spearThrustTimer = 16;
          mob.katanaSlashTimer = 16;
          mob.isAttacking = true;
          const dmg = mob.damage || 12;
          playerFighter.hp = Math.max(0, playerFighter.hp - dmg);
          triggerGlobalScreenShake(2.0, 6);
          _playSfx('attack_fleshhit');
          spawnSparks(playerFighter.x, playerFighter.y, 8, '#FF3366');

          // Knockback push away from player
          mob.x -= (dx / dist) * 16;
          mob.y -= (dy / dist) * 16;
        }
      }
    }
  }

  /**
   * Handles loot and stats when a mob is killed.
   */
  _handleMobDefeated(mob) {
    this.state.kills++;

    // Vampirism passive heal (Healthbar-only, Rule 27 compliant)
    if (this.state.passives.vampirism > 0 && state.fighters[0]) {
      const p1 = state.fighters[0];
      const heal = this.state.passives.vampirism;
      p1.hp = Math.min(p1.maxHp, p1.hp + heal);
      p1._lastHealAmount = (p1._lastHealAmount || 0) + heal;
      p1._healthBarHealTimer = 16;
    }

    if (mob.isFinalBoss) {
      this.state.finalBossDefeated = true;
      return;
    }

    // Spawn Gem or Chest
    if (mob.isChestDrop) {
      this.gems.push({
        x: mob.x,
        y: mob.y,
        vx: 0,
        vy: 0,
        type: 'chest',
        xp: 150,
        color: '#FFD700',
        radius: 12,
        bobOffset: Math.random() * Math.PI * 2,
      });
    } else {
      const isGreen = Math.random() < 0.22;
      this.gems.push({
        x: mob.x,
        y: mob.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        type: isGreen ? 'green' : 'blue',
        xp: isGreen ? 25 : 10,
        color: isGreen ? '#00FF66' : '#00E5FF',
        radius: isGreen ? 7 : 5,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Updates XP gems and vacuum magnetism toward player.
   */
  _updateGems(playerFighter) {
    const magnetRadius = 80 * (this.state.passives.magnet || 1.0);

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      const dx = playerFighter.x - gem.x;
      const dy = playerFighter.y - gem.y;
      const dist = Math.hypot(dx, dy) || 0.001;

      // Vacuum suction physics
      if (dist < magnetRadius) {
        const pull = Math.min(14, (1.0 - dist / magnetRadius) * 12 + 3);
        gem.vx += (dx / dist) * pull * 0.25;
        gem.vy += (dy / dist) * pull * 0.25;
      } else {
        gem.vx *= 0.88;
        gem.vy *= 0.88;
      }

      gem.x += gem.vx;
      gem.y += gem.vy;

      // Absorption check
      if (dist < playerFighter.r + gem.radius + 6) {
        this._absorbGem(gem, playerFighter);
        this.gems.splice(i, 1);
      }
    }
  }

  _absorbGem(gem, playerFighter) {
    if (gem.type === 'chest') {
      _playSfx('select');
      playerFighter.hp = Math.min(playerFighter.maxHp, playerFighter.hp + 60);
      spawnFloatingText('🎁 TREASURE CHEST!', playerFighter.x, playerFighter.y - 45, '#FFD700', 28);
      this._triggerLevelUp();
    } else {
      this.state.xp += gem.xp;
      _playSfx('attack_fleshhit', 0.2);

      if (this.state.xp >= this.state.nextXp) {
        this.state.xp -= this.state.nextXp;
        this.state.level++;
        this.state.nextXp = Math.floor(this.state.nextXp * 1.35 + 20);
        this._triggerLevelUp();
      }
    }
  }

  _triggerLevelUp() {
    this.state.isPausedForUpgrade = true;
    _playSfx('select');
    this.state.upgradeChoices = this._rollUpgradeChoices();
  }

  /**
   * Selects an upgrade from the 3 choices.
   */
  selectUpgrade(choiceIndex) {
    if (!this.state.isPausedForUpgrade || !this.state.upgradeChoices) return;
    const choice = this.state.upgradeChoices[choiceIndex];
    if (!choice) return;

    // Apply the upgrade
    choice.apply();
    _playSfx('select');
    this.state.isPausedForUpgrade = false;
    this.state.upgradeChoices = [];
  }

  /**
   * Generates 3 random upgrades from the available pool.
   */
  _rollUpgradeChoices() {
    const catalog = [
      {
        id: 'orbiters',
        name: 'Celestial Orbiters',
        type: 'weapon',
        icon: '🪐',
        color: '#00E5FF',
        currentTier: this.state.weapons.orbiters.level,
        description: '+1 Orbiting blade circling player, +15% orbit speed',
        apply: () => { this.state.weapons.orbiters.level++; },
      },
      {
        id: 'garlic',
        name: 'Radiant Sanctum (Garlic)',
        type: 'weapon',
        icon: '🧄',
        color: '#ECC94B',
        currentTier: this.state.weapons.garlic.level,
        description: 'Pulsing holy barrier that repels and damages swarming enemies',
        apply: () => { this.state.weapons.garlic.level++; },
      },
      {
        id: 'kunai',
        name: 'Flying Kunai',
        type: 'weapon',
        icon: '🗡️',
        color: '#ED8936',
        currentTier: this.state.weapons.kunai.level,
        description: 'Rapidly throws piercing daggers forward into the horde',
        apply: () => { this.state.weapons.kunai.level++; },
      },
      {
        id: 'thunder',
        name: 'Thunder Smite',
        type: 'weapon',
        icon: '⚡',
        color: '#9F7AEA',
        currentTier: this.state.weapons.thunder.level,
        description: 'Strikes random nearby enemies with arcing chain lightning',
        apply: () => { this.state.weapons.thunder.level++; },
      },
      {
        id: 'scythe',
        name: 'Bouncing Scythe',
        type: 'weapon',
        icon: '🪓',
        color: '#E53E3E',
        currentTier: this.state.weapons.scythe.level,
        description: 'Fires spinning scythes that ricochet off walls and obstacles',
        apply: () => { this.state.weapons.scythe.level++; },
      },
      {
        id: 'might',
        name: 'Titan Might',
        type: 'passive',
        icon: '💪',
        color: '#F56565',
        currentTier: Math.round((this.state.passives.might - 1.0) / 0.2),
        description: '+20% Damage dealt on all weapons and abilities',
        apply: () => { this.state.passives.might += 0.20; },
      },
      {
        id: 'swiftness',
        name: 'Hermes Swiftness',
        type: 'passive',
        icon: '👟',
        color: '#4FD1C5',
        currentTier: Math.round((this.state.passives.swiftness - 1.0) / 0.15),
        description: '+15% Movement speed for evasive maneuvering',
        apply: () => {
          this.state.passives.swiftness += 0.15;
          if (state.fighters[0]) state.fighters[0].moveSpeed = (state.fighters[0].moveSpeed || 2.5) * 1.15;
        },
      },
      {
        id: 'toughness',
        name: 'Iron Resilience',
        type: 'passive',
        icon: '🛡️',
        color: '#48BB78',
        currentTier: Math.round(this.state.passives.toughness / 40),
        description: '+40 Max HP and instantly heals 50 HP',
        apply: () => {
          this.state.passives.toughness += 40;
          if (state.fighters[0]) {
            state.fighters[0].maxHp += 40;
            state.fighters[0].hp = Math.min(state.fighters[0].maxHp, state.fighters[0].hp + 50);
          }
        },
      },
      {
        id: 'haste',
        name: 'Chronos Haste',
        type: 'passive',
        icon: '⌛',
        color: '#ED64A6',
        currentTier: Math.round((1.0 - this.state.passives.haste) / 0.12),
        description: '-15% Cooldown on all weapons and character skills',
        apply: () => { this.state.passives.haste = Math.max(0.4, this.state.passives.haste * 0.85); },
      },
      {
        id: 'magnet',
        name: 'Cosmic Magnet',
        type: 'passive',
        icon: '🧲',
        color: '#667EEA',
        currentTier: Math.round((this.state.passives.magnet - 1.0) / 0.5),
        description: '+50% Vacuum attraction radius for XP gems and loot',
        apply: () => { this.state.passives.magnet += 0.50; },
      },
      {
        id: 'vampirism',
        name: 'Cursed Lifesteal',
        type: 'passive',
        icon: '🩸',
        color: '#9B2C2C',
        currentTier: this.state.passives.vampirism,
        description: 'Heals +1 HP every time an enemy is defeated',
        apply: () => { this.state.passives.vampirism += 1; },
      },
    ];

    // Filter out maxed weapons (level >= 5)
    const valid = catalog.filter(c => c.currentTier < 5);
    // Shuffle and pick 3
    const shuffled = valid.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  /**
   * Updates all active survivor modular weapons.
   */
  _updateSurvivorWeapons(playerFighter, arena) {
    const ar = arena || state.arena;
    const might = this.state.passives.might;
    const haste = this.state.passives.haste;

    // 1. Celestial Orbiters
    const orbiters = this.state.weapons.orbiters;
    if (orbiters.level > 0) {
      orbiters.angle += 0.05 * (1 + orbiters.level * 0.1);
      const numOrbs = Math.min(6, orbiters.level + 1);
      const radius = 70;

      for (let i = 0; i < numOrbs; i++) {
        const ang = orbiters.angle + (i * Math.PI * 2) / numOrbs;
        const ox = playerFighter.x + Math.cos(ang) * radius;
        const oy = playerFighter.y + Math.sin(ang) * radius;

        // Check collision against horde mobs
        for (let m = 0; m < this.hordeMobs.length; m++) {
          const mob = this.hordeMobs[m];
          const dist = Math.hypot(mob.x - ox, mob.y - oy);
          if (dist < mob.r + 10) {
            const dmg = (18 + orbiters.level * 4) * might;
            mob.hp -= dmg;
            spawnSparks(ox, oy, 4, '#00E5FF');
            _playSfx('sukuna_slice', 0.25);
            // Knockback
            mob.x += Math.cos(ang) * 12;
            mob.y += Math.sin(ang) * 12;
          }
        }
      }
    }

    // 2. Radiant Sanctum (Garlic Aura)
    const garlic = this.state.weapons.garlic;
    if (garlic.level > 0) {
      garlic.timer++;
      const pulseInterval = Math.round(45 * haste);
      if (garlic.timer % pulseInterval === 0) {
        garlic.pulseRadius = 20;
        const maxR = garlic.maxRadius + garlic.level * 20;
        const dmg = (14 + garlic.level * 3) * might;

        for (let m = 0; m < this.hordeMobs.length; m++) {
          const mob = this.hordeMobs[m];
          const dist = Math.hypot(mob.x - playerFighter.x, mob.y - playerFighter.y);
          if (dist < maxR) {
            mob.hp -= dmg;
            spawnSparks(mob.x, mob.y, 3, '#ECC94B');
            const pushAng = Math.atan2(mob.y - playerFighter.y, mob.x - playerFighter.x);
            mob.x += Math.cos(pushAng) * 16;
            mob.y += Math.sin(pushAng) * 16;
          }
        }
      }
      if (garlic.pulseRadius > 0) {
        garlic.pulseRadius += 6;
        if (garlic.pulseRadius > garlic.maxRadius + garlic.level * 20) {
          garlic.pulseRadius = 0;
        }
      }
    }

    // 3. Flying Kunai
    const kunai = this.state.weapons.kunai;
    if (kunai.level > 0) {
      kunai.cooldown--;
      if (kunai.cooldown <= 0) {
        kunai.cooldown = Math.round(25 * haste);
        const aimAng = playerFighter.gunAngle || playerFighter.angle || 0;
        this.state.activeKunais.push({
          x: playerFighter.x,
          y: playerFighter.y,
          vx: Math.cos(aimAng) * 9,
          vy: Math.sin(aimAng) * 9,
          pierce: kunai.level + 1,
          damage: (24 + kunai.level * 5) * might,
          life: 80,
        });
      }
    }

    // Update Kunais
    for (let k = this.state.activeKunais.length - 1; k >= 0; k--) {
      const p = this.state.activeKunais[k];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // Mob hit
      for (let m = 0; m < this.hordeMobs.length; m++) {
        const mob = this.hordeMobs[m];
        if (Math.hypot(mob.x - p.x, mob.y - p.y) < mob.r + 6) {
          mob.hp -= p.damage;
          p.pierce--;
          spawnSparks(p.x, p.y, 4, '#ED8936');
          _playSfx('attack_fleshhit', 0.4);
          if (p.pierce <= 0) break;
        }
      }

      if (p.life <= 0 || p.pierce <= 0) {
        this.state.activeKunais.splice(k, 1);
      }
    }

    // 4. Thunder Smite (Chain Lightning)
    const thunder = this.state.weapons.thunder;
    if (thunder.level > 0) {
      thunder.cooldown--;
      if (thunder.cooldown <= 0) {
        thunder.cooldown = Math.round(75 * haste);
        this._triggerThunderSmite(playerFighter, thunder.level, might);
      }
    }

    // Fade Thunder Bolts
    for (let t = this.state.activeThunderBolts.length - 1; t >= 0; t--) {
      const b = this.state.activeThunderBolts[t];
      b.life--;
      if (b.life <= 0) {
        this.state.activeThunderBolts.splice(t, 1);
      }
    }

    // 5. Bouncing Scythe
    const scythe = this.state.weapons.scythe;
    if (scythe.level > 0) {
      scythe.cooldown--;
      if (scythe.cooldown <= 0) {
        scythe.cooldown = Math.round(60 * haste);
        const ang = Math.random() * Math.PI * 2;
        this.state.activeScythes.push({
          x: playerFighter.x,
          y: playerFighter.y,
          vx: Math.cos(ang) * 6,
          vy: Math.sin(ang) * 6,
          rot: 0,
          bounces: 4 + scythe.level,
          damage: (32 + scythe.level * 6) * might,
          life: 240,
        });
      }
    }

    // Update Bouncing Scythes
    for (let s = this.state.activeScythes.length - 1; s >= 0; s--) {
      const sc = this.state.activeScythes[s];
      sc.x += sc.vx;
      sc.y += sc.vy;
      sc.rot += 0.25;
      sc.life--;

      // Boundary & obstacle bounce
      if (ar) {
        if (sc.x < ar.x + 10 || sc.x > ar.x + ar.width - 10) { sc.vx = -sc.vx; sc.bounces--; }
        if (sc.y < ar.y + 10 || sc.y > ar.y + ar.height - 10) { sc.vy = -sc.vy; sc.bounces--; }
      }

      // Damage mobs
      for (let m = 0; m < this.hordeMobs.length; m++) {
        const mob = this.hordeMobs[m];
        if (Math.hypot(mob.x - sc.x, mob.y - sc.y) < mob.r + 14) {
          mob.hp -= sc.damage;
          spawnSparks(sc.x, sc.y, 4, '#E53E3E');
        }
      }

      if (sc.life <= 0 || sc.bounces <= 0) {
        this.state.activeScythes.splice(s, 1);
      }
    }
  }

  _triggerThunderSmite(playerFighter, level, might) {
    if (this.hordeMobs.length === 0) return;

    // Pick closest mob
    let closestMob = null;
    let minDist = 350;
    for (let i = 0; i < this.hordeMobs.length; i++) {
      const mob = this.hordeMobs[i];
      const d = Math.hypot(mob.x - playerFighter.x, mob.y - playerFighter.y);
      if (d < minDist) {
        minDist = d;
        closestMob = mob;
      }
    }

    if (!closestMob) return;

    const baseDmg = (50 + level * 10) * might;
    closestMob.hp -= baseDmg;
    spawnSparks(closestMob.x, closestMob.y, 8, '#9F7AEA');
    _playSfx('attack_heavypunch1', 0.5);

    this.state.activeThunderBolts.push({
      x1: closestMob.x,
      y1: closestMob.y - 120,
      x2: closestMob.x,
      y2: closestMob.y,
      life: 8,
    });

    // Chain to nearby mobs
    const chainCount = Math.min(level + 1, 4);
    let prevX = closestMob.x;
    let prevY = closestMob.y;

    for (let c = 0; c < chainCount; c++) {
      const nextMob = this.hordeMobs[Math.floor(Math.random() * this.hordeMobs.length)];
      if (nextMob && nextMob !== closestMob) {
        nextMob.hp -= baseDmg * 0.65;
        this.state.activeThunderBolts.push({
          x1: prevX,
          y1: prevY,
          x2: nextMob.x,
          y2: nextMob.y,
          life: 8,
        });
        prevX = nextMob.x;
        prevY = nextMob.y;
      }
    }
  }

  /**
   * Helper that automatically aims Player 1 at the closest enemy mob.
   */
  _updatePlayerAutoAim(playerFighter) {
    if (this.hordeMobs.length === 0) return;

    let closest = null;
    let minDist = 400;

    for (let i = 0; i < this.hordeMobs.length; i++) {
      const mob = this.hordeMobs[i];
      const d = Math.hypot(mob.x - playerFighter.x, mob.y - playerFighter.y);
      if (d < minDist) {
        minDist = d;
        closest = mob;
      }
    }

    if (closest) {
      playerFighter.gunAngle = Math.atan2(closest.y - playerFighter.y, closest.x - playerFighter.x);
      // Auto trigger attack if off cooldown
      if (playerFighter.shootCooldown <= 0 && typeof playerFighter.attack === 'function') {
        playerFighter.attack(closest);
      }
    }
  }

  /**
   * Renders gems, weapons, and upgrade modal in camera space and screen space.
   */
  drawInCameraSpace(ctx) {
    if (!this.state.active) return;

    // 1. Draw XP Gems
    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      const bob = Math.sin((this.state.timer * 0.08) + gem.bobOffset) * 2;
      const gy = gem.y + bob;

      ctx.save();
      ctx.fillStyle = gem.color;
      ctx.shadowColor = gem.color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      if (gem.type === 'chest') {
        ctx.rect(gem.x - 8, gy - 6, 16, 12);
      } else {
        ctx.arc(gem.x, gy, gem.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Celestial Orbiters
    const p1 = state.fighters[0];
    const orbiters = this.state.weapons.orbiters;
    if (p1 && orbiters.level > 0) {
      const numOrbs = Math.min(6, orbiters.level + 1);
      const radius = 70;

      for (let i = 0; i < numOrbs; i++) {
        const ang = orbiters.angle + (i * Math.PI * 2) / numOrbs;
        const ox = p1.x + Math.cos(ang) * radius;
        const oy = p1.y + Math.sin(ang) * radius;

        ctx.save();
        ctx.fillStyle = '#00E5FF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ox, oy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. Draw Garlic Pulse (Rule 26 compliant concentric ring)
    const garlic = this.state.weapons.garlic;
    if (p1 && garlic.pulseRadius > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(236, 201, 75, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, garlic.pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Kunais
    for (let k = 0; k < this.state.activeKunais.length; k++) {
      const p = this.state.activeKunais[k];
      ctx.save();
      ctx.strokeStyle = '#ED8936';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Thunder Bolts
    for (let t = 0; t < this.state.activeThunderBolts.length; t++) {
      const b = this.state.activeThunderBolts[t];
      ctx.save();
      ctx.strokeStyle = '#D6BCFA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      const midX = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 16;
      const midY = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 16;
      ctx.lineTo(midX, midY);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Bouncing Scythes
    for (let s = 0; s < this.state.activeScythes.length; s++) {
      const sc = this.state.activeScythes[s];
      ctx.save();
      ctx.translate(sc.x, sc.y);
      ctx.rotate(sc.rot);
      ctx.strokeStyle = '#E53E3E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Draws screen-space UI elements: Top XP Bar, Timer, and Upgrade Modal.
   */
  drawScreenSpaceUI(ctx) {
    if (!this.state.active) return;

    const w = ctx.canvas.width;
    const pad = 24;

    // 1. Top XP Bar
    const xpPct = Math.min(1.0, this.state.xp / Math.max(1, this.state.nextXp));
    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
    ctx.fillRect(0, 0, w, 12);

    ctx.fillStyle = '#00FF66';
    ctx.fillRect(0, 0, w * xpPct, 12);

    // 2. Top HUD Stats Panel
    ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    const panelW = 320;
    const panelH = 36;
    const panelX = (w - panelW) / 2;
    const panelY = 16;

    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 6);
    ctx.fill();
    ctx.stroke();

    // Timer text
    const totalSec = Math.floor(this.state.timer / 60);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} / 03:00`;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏱️ ${timeStr}`, panelX + 16, panelY + panelH / 2);

    // Level Badge
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`Lv. ${this.state.level}`, panelX + 160, panelY + panelH / 2);

    // Kill Count
    ctx.fillStyle = '#FF3366';
    ctx.fillText(`💀 ${this.state.kills}`, panelX + 240, panelY + panelH / 2);

    ctx.restore();

    // 3. Draw Level-Up Upgrade Modal (if active)
    if (this.state.isPausedForUpgrade) {
      drawSurvivorUpgradeModal(ctx, this.state);
    }
  }
}

export const survivorSystem = new SurvivorSystem();
