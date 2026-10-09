// CRAZY DAVE FIGHTER ENTITY (Plants vs. Zombies)
// Mechanics: Dave has NO direct basic attack. He navigates the arena collecting falling Sun drops.
// Spends accumulated Sun on 5 flora abilities:
// 1. Plant Wall-nut (50 ☀️): Solid immovable barrier defense mechanism blocking enemy advance & absorbing damage.
// 2. Plant Peashooter (100 ☀️): Rapid-fire kinetic pea projectiles dealing regular damage.
// 3. Plant Snow Pea (175 ☀️): Chilling frozen pea projectiles dealing ice damage and slowing enemies.
// 4. Plant Torchwood (175 ☀️): Ignites passing peas into fire peas.
// 5. Plant Potato Mine (75 ☀️): Proximity explosive trap that arms after a delay, then detonates on enemy contact.

import { Fighter, applyDamageToTarget, isSkillEnabled } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { crazyDaveConfig } from '../../configs/characters/crazyDaveConfig.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { isLineOfSightBlockedByObstacle, getArenaCenterObstacle, isPointInsidePlusObstacle } from '../../systems/arenaObstacleSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawCrazyDaveSkin } from '../../graphics/fighters/crazyDaveSkin.js';
import { drawMinionHealthBar } from '../../graphics/statusEffects.js';
import {
  drawWallnut,
  drawPeashooter,
  drawSnowPea,
  drawTorchwood,
  drawLawnmower,
  drawSunDrop,
  drawPotatoMine
} from '../../graphics/weapons/crazyDaveWeaponGraphics.js';
import { getNearestGrassTileCenter, getRandomGrassTileCenter } from '../../graphics/renderers/grassFloorRenderer.js';
import {
  spawnSparks,
  spawnImpactFlash,
  spawnMeleeClashShockwave,
  spawnGroundScorch
} from '../../graphics/particles/sparkEffect.js';

function getCrazyDaveSetting(config, key) {
  return config?.[key] ?? crazyDaveConfig[key];
}

function getCrazyDaveSound(config, key) {
  return config?.sounds?.[key] ?? crazyDaveConfig.sounds[key];
}

function getCrazyDaveSoundVolume(config, key) {
  return config?.soundVolumes?.[key] ?? crazyDaveConfig.soundVolumes[key];
}

/**
 * Applies plant damage and reports whether it actually landed.
 * Returns false when the hit was dodged (e.g. Sans MISS), blocked, absorbed or ignored by immunity,
 * so on-hit effects (burn, stun) are only applied on a successful damaging hit.
 * @returns {boolean}
 */
function dealPlantDamage(target, amount, attacker, opts = {}) {
  if (!target) return false;
  const hpBefore = Number(target.hp);
  let result = false;
  if (typeof applyDamageToTarget === 'function') {
    result = applyDamageToTarget(target, amount, attacker, opts);
  } else if (typeof target.takeDamage === 'function') {
    result = target.takeDamage(amount, attacker, opts);
  } else if (typeof target.hp === 'number') {
    target.hp = Math.max(0, target.hp - amount);
  }
  const hpAfter = Number(target.hp);
  const hpDropped = Number.isFinite(hpBefore) && Number.isFinite(hpAfter) && hpAfter < hpBefore;
  return Boolean(result) || hpDropped;
}

function getCrazyDavePlantOccupants(dave) {
  const occupants = new Set();

  // 1. Dave's own active plant lists
  if (dave) {
    const ownPlantLists = [
      dave.activeWallnuts,
      dave.activePeashooters,
      dave.activeSnowPeas,
      dave.activeTorchwoods,
      dave.activePotatoMines
    ];

    for (const plantList of ownPlantLists) {
      for (const plant of plantList || []) {
        if (plant && plant.hp > 0 && !plant.dead && !plant.isDead) occupants.add(plant);
      }
    }
  }

  // 2. Scan all entities in state.fighters for plants, buildings, deployables, turrets, dispensers
  if (state && Array.isArray(state.fighters)) {
    for (const f of state.fighters) {
      if (!f || f === dave) continue;
      if (f.hp <= 0 || f.dead || f.isDead) continue;

      const isPlant = Boolean(f.isPlant || f.isPlantMinion || f.isPlantBarrier || f.isWallnut);
      const isBuilding = Boolean(f.isTurret || f.isDispenser || f.isDeployable || f.isEndCrystal || f.isIceWall || f.isBuilding || f.isBarrier);

      if (isPlant || isBuilding) {
        occupants.add(f);
      }

      // Check child entities attached to fighters
      if (f.turretEntity && f.turretEntity.hp > 0 && !f.turretEntity.dead) {
        occupants.add(f.turretEntity);
      }
      if (f.dispenserEntity && f.dispenserEntity.hp > 0 && !f.dispenserEntity.dead) {
        occupants.add(f.dispenserEntity);
      }
      if (f.activeWallnuts || f.activePeashooters || f.activeSnowPeas || f.activeTorchwoods || f.activePotatoMines) {
        const otherPlantLists = [f.activeWallnuts, f.activePeashooters, f.activeSnowPeas, f.activeTorchwoods, f.activePotatoMines];
        for (const list of otherPlantLists) {
          if (Array.isArray(list)) {
            for (const p of list) {
              if (p && p.hp > 0 && !p.dead && !p.isDead) {
                occupants.add(p);
              }
            }
          }
        }
      }
    }
  }

  return [...occupants];
}

export function getTeammateCrazyDaves(dave) {
  const daves = new Set();
  if (dave && dave.hp > 0 && !dave.dead && !dave.isDead) {
    daves.add(dave);
  }
  if (state && Array.isArray(state.fighters)) {
    for (const f of state.fighters) {
      if (!f || f.hp <= 0 || f.dead || f.isDead) continue;
      const isCrazyDave = f.characterId === 'crazydave' || f.type === 'crazydave' || f._def?.id === 'crazydave';
      if (!isCrazyDave) continue;
      if (f === dave || (typeof dave.isTeammate === 'function' && dave.isTeammate(f)) || (typeof f.isTeammate === 'function' && f.isTeammate(dave))) {
        daves.add(f);
      }
    }
  }
  return [...daves];
}

function getAvailableCrazyDavePlantTile(dave, targetX, targetY, arena) {
  const activeOccupants = getCrazyDavePlantOccupants(dave);
  const tileCenter = getNearestGrassTileCenter(targetX, targetY, arena, activeOccupants);
  const targetTileSize = getCrazyDaveSetting(CONFIG.crazydave, 'grassTileSize') || 76.6;
  const cols = Math.max(3, Math.round(arena.width / targetTileSize));
  const rows = Math.max(3, Math.round(arena.height / targetTileSize));
  const occupiedRadius = Math.min(arena.width / cols, arena.height / rows) * 0.45;

  if (activeOccupants.some(occ => occ && occ.hp > 0 && Math.hypot(occ.x - tileCenter.x, occ.y - tileCenter.y) < occupiedRadius)) {
    return null;
  }

  return tileCenter;
}

function isMakimaControlledPlant(plant) {
  return Boolean(plant?.isChainedByMakima && plant?.isMindControlledByMakima && plant?._makimaChainer);
}

function getPlantProjectileOwnership(plant, ownerIndex) {
  if (!isMakimaControlledPlant(plant)) {
    return { owner: ownerIndex !== undefined ? ownerIndex : 0, ownerFighter: plant.owner || plant };
  }

  const plantIndex = state.fighters?.indexOf(plant) ?? -1;
  return {
    owner: plantIndex >= 0 ? plantIndex : (ownerIndex !== undefined ? ownerIndex : 0),
    ownerFighter: plant,
  };
}

function playDavePlantingAudio(config) {
  const playSfx = typeof audioSystem.playSFX === 'function'
    ? audioSystem.playSFX
    : audioSystem.playSound;
  if (typeof playSfx !== 'function') return;

  playSfx.call(audioSystem, getCrazyDaveSound(config, 'planting'), getCrazyDaveSoundVolume(config, 'planting'));

  const voiceLines = getCrazyDaveSound(config, 'plantingVoiceLines');
  if (!Array.isArray(voiceLines) || voiceLines.length === 0) return;
  const voiceLine = voiceLines[Math.floor(Math.random() * voiceLines.length)];
  playSfx.call(audioSystem, voiceLine, getCrazyDaveSoundVolume(config, 'plantingVoiceLines'));
}

/**
 * Universal candidate query for all Crazy Dave plants and offensive mechanisms.
 * Collects active candidates from state.fighters, state.illusions, and state.cjDriveBys.
 */
export function getAllPlantTargetCandidates() {
  if (!state) return [];
  const list = [];
  if (Array.isArray(state.fighters)) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (!f) continue;
      list.push(f);
      // Include companion summons/minions attached directly to fighters (e.g. Yuta's Rika, Engineer's Turret/Dispenser)
      if (f.rika && f.rika.active && f.rika.hp > 0 && !list.includes(f.rika)) {
        list.push(f.rika);
      }
      if (f.turretEntity && f.turretEntity.hp > 0 && !list.includes(f.turretEntity)) {
        list.push(f.turretEntity);
      }
      if (f.dispenserEntity && f.dispenserEntity.hp > 0 && !list.includes(f.dispenserEntity)) {
        list.push(f.dispenserEntity);
      }
    }
  }
  if (Array.isArray(state.illusions)) {
    for (let i = 0; i < state.illusions.length; i++) {
      const ill = state.illusions[i];
      if (ill && !list.includes(ill)) list.push(ill);
    }
  }
  if (Array.isArray(state.cjDriveBys)) {
    for (let i = 0; i < state.cjDriveBys.length; i++) {
      const car = state.cjDriveBys[i];
      if (car && !list.includes(car)) list.push(car);
    }
  }
  return list;
}

/**
 * Centralized enemy verification for plants and plant projectiles.
 * Correctly identifies enemy minions, summons, companions, turrets, illusions, and cars while protecting allies.
 */
export function isEnemyPlantTarget(plant, f) {
  if (!f || f === plant || f.dead || f.isDead || f.hp <= 0) return false;
  if (f.isLawnmower || f.isUntargetable || f.untargetable || f.cannotBeTargeted || f.isTargetable === false) return false;

  const isMindControlled = isMakimaControlledPlant(plant);

  // If plant is mind-controlled by Makima, allegiances invert to Makima's side
  if (isMindControlled) {
    const chainer = plant._makimaChainer;
    if (f === chainer || (f.owner && f.owner === chainer)) return false;
    return true;
  }

  const myOwner = plant.owner;
  let myOwnerIdx = (typeof plant.ownerIndex === 'number') ? plant.ownerIndex : -1;
  if (myOwnerIdx === -1 && myOwner && state && state.fighters) {
    myOwnerIdx = state.fighters.indexOf(myOwner);
  }

  // Resolve target f's owner
  let fOwner = f.owner || null;
  let fOwnerIdx = (typeof f.ownerIndex === 'number') ? f.ownerIndex : null;
  if (typeof fOwner === 'number') {
    fOwnerIdx = fOwner;
    fOwner = (state && state.fighters && state.fighters[fOwner]) || null;
  } else if (fOwner && fOwnerIdx === null && state && state.fighters) {
    fOwnerIdx = state.fighters.indexOf(fOwner);
  }

  // Same owner / Dave's own plants or self
  if (f === myOwner || (fOwner && fOwner === myOwner) || (fOwnerIdx !== null && myOwnerIdx !== -1 && fOwnerIdx === myOwnerIdx)) {
    return false;
  }

  // Friendly teammate check
  if (myOwner && typeof myOwner.isTeammate === 'function') {
    if (myOwner.isTeammate(fOwner || f)) return false;
  }
  if (typeof plant.isTeammate === 'function' && plant.isTeammate(fOwner || f)) {
    return false;
  }

  // Plants do not target or burn other plants unless one is mind-controlled by Makima or on an opposing team
  if (f.isPlant || f.isPlantMinion) {
    if (!isMindControlled && !isMakimaControlledPlant(f)) {
      if (state && typeof state.getFighterTeam === 'function' && myOwnerIdx !== -1 && fOwnerIdx !== null && fOwnerIdx !== -1) {
        const myTeam = state.getFighterTeam(myOwnerIdx);
        const targetTeam = state.getFighterTeam(fOwnerIdx);
        if (myTeam === null || targetTeam === null || myTeam === targetTeam) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  // Team index resolution in team modes
  if (state && typeof state.getFighterTeam === 'function' && myOwnerIdx !== -1) {
    const myTeam = state.getFighterTeam(myOwnerIdx);
    const targetIdx = (fOwnerIdx !== null && fOwnerIdx !== -1) ? fOwnerIdx : (state.fighters ? state.fighters.indexOf(f) : -1);
    if (myTeam !== null && targetIdx !== -1) {
      const targetTeam = state.getFighterTeam(targetIdx);
      if (targetTeam !== null && myTeam === targetTeam) {
        return false;
      }
    }
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: PEASHOOTER (Fires rapid kinetic pea projectiles dealing regular damage)
// ─────────────────────────────────────────────────────────────────────────────
export class PeashooterEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = getCrazyDaveSetting(cfg, 'peashooterHp');
    const def = {
      id: 993,
      name: 'Peashooter',
      color: getCrazyDaveSetting(cfg, 'peashooterColor'),
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: getCrazyDaveSetting(cfg, 'peashooterRadius'),
      type: 'Peashooter',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: getCrazyDaveSetting(cfg, 'peashooterDamage'),
      cooldown: getCrazyDaveSetting(cfg, 'peashooterFireRate'),
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.customHitFlash = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    // Committed 1-direction facing: never changes angle once planted
    this.facingDirection = (facingDirection === -1 || facingDirection === Math.PI) ? -1 : 1;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;

    this.shootCooldown = 0;
    this.shootCooldownMax = getCrazyDaveSetting(cfg, 'peashooterFireRate');
    this.hitFlashTimer = 0;
    this.animTick = Math.floor(Math.random() * 30);
  }

  canAim() {
    return false;
  }

  aim() {
    // Strictly locked to committed 1-direction facing; no auto-aim
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  onCollide(opponent) {
    // Entities pass through plants without collision push
  }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() {
    // Synchronize frame marker so EntityRenderer fallback knows overlays were handled
    this._statusOverlaysRenderedFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  }
  drawFreezeTimer() { /* Plants are immune to freeze */ }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly fire check: ignore damage from other plants or Crazy Dave
    const isMindControlled = isMakimaControlledPlant(this);
    const isMindControlledPlantAttacker = isMakimaControlledPlant(attacker);
    if (!isMindControlled && !isMindControlledPlantAttacker && attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    // Ignore debuff DoT tick damages (poison ticks, burn ticks, bleed ticks, electrified ticks)
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) {
        return false;
      }
      if (!isMindControlled && !isMindControlledPlantAttacker && opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    this.onDeath();
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Strict immovable anchor & committed angle: plants NEVER drift, bounce, or tilt
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) {
      return;
    }

    // Lane Target acquisition: only detect enemies in the 1 straight committed direction in front
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const range = getCrazyDaveSetting(cfg, 'peashooterRange');
    const laneTolerance = getCrazyDaveSetting(cfg, 'plantLaneTolerance');

    let targetInLane = null;
    let closestDist = Infinity;

    const isMindControlled = isMakimaControlledPlant(this);
    const evaluateTarget = (f) => {
      if (!isEnemyPlantTarget(this, f)) return;
      const dx = f.x - this.x;
      const dy = f.y - this.y;

      // Check if enemy is ahead in the straight committed direction
      const isAhead = (this.facingDirection === 1) ? (dx > 0) : (dx < 0);
      if (!isMindControlled && !isAhead) return; // Behind the plant!
      if (typeof state !== 'undefined' && state.arena && isLineOfSightBlockedByObstacle(this.x, this.y, f.x, f.y, state.arena)) return;

      const forwardDist = Math.abs(dx);
      const laneDist = Math.abs(dy);

      if (forwardDist <= range && laneDist <= laneTolerance) {
        if (forwardDist < closestDist) {
          closestDist = forwardDist;
          targetInLane = f;
        }
      }
    };

    const candidates = getAllPlantTargetCandidates();
    if (candidates.length > 0) {
      for (const f of candidates) evaluateTarget(f);
    } else if (opponent) {
      evaluateTarget(opponent);
    }

    // Only shoot if a valid enemy is detected in the straight forward direction
    if (targetInLane) {
      if (isMindControlled) {
        this.facingDirection = targetInLane.x < this.x ? -1 : 1;
        this.gunAngle = this.facingDirection === -1 ? Math.PI : 0;
      }
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else {
        this.shootCooldown = this.shootCooldownMax;
        this._firePea(this.gunAngle, ownerIndex);
      }
    } else {
      if (this.shootCooldown > 0) this.shootCooldown--;
    }
  }

  _firePea(angle, ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const ownership = getPlantProjectileOwnership(this, ownerIndex);
    const speed = getCrazyDaveSetting(cfg, 'peashooterSpeed');
    const dmg = getCrazyDaveSetting(cfg, 'peashooterDamage');
    const isLeft = this.facingDirection === -1;
    const muzzleOffsetX = getCrazyDaveSetting(cfg, 'peashooterMuzzleOffsetX');
    const spawnX = this.x + (isLeft ? -muzzleOffsetX : muzzleOffsetX);
    const spawnY = this.y + getCrazyDaveSetting(cfg, 'peashooterMuzzleOffsetY');

    const peaProj = {
      x: spawnX,
      y: spawnY,
      vx: (isLeft ? -1 : 1) * speed,
      vy: 0, // Straight horizontal flight
      angle: isLeft ? Math.PI : 0,
      r: getCrazyDaveSetting(cfg, 'peashooterProjectileRadius'),
      radius: getCrazyDaveSetting(cfg, 'peashooterProjectileRadius'),
      damage: dmg,
      owner: ownership.owner,
      ownerFighter: ownership.ownerFighter,
      isPlantProjectile: true,
      color: '#22C55E',
      visual: 'peaBullet',
      life: getCrazyDaveSetting(cfg, 'peashooterProjectileLife'),
      maxLife: getCrazyDaveSetting(cfg, 'peashooterProjectileLife'),
      penetration: 1,
      knockbackForce: getCrazyDaveSetting(cfg, 'peashooterKnockback'),
    };

    if (typeof projectileSystem !== 'undefined' && Array.isArray(projectileSystem.projectiles)) {
      projectileSystem.projectiles.push(peaProj);
    } else if (state && Array.isArray(state.projectiles)) {
      state.projectiles.push(peaProj);
    }

    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(getCrazyDaveSound(cfg, 'peashooterAttack'), getCrazyDaveSoundVolume(cfg, 'peashooterAttack'));
    } else if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound(getCrazyDaveSound(cfg, 'peashooterAttack'), getCrazyDaveSoundVolume(cfg, 'peashooterAttack'));
    }
  }

  draw(ctx) {
    drawPeashooter(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      const topY = this.y - Math.round(this.r * 2.1 + 8);
      drawMinionHealthBar(ctx, this.x, topY, 34, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: SNOW PEA (Fires frozen ice pea projectiles dealing damage + slowing foes)
// ─────────────────────────────────────────────────────────────────────────────
export class SnowPeaEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = getCrazyDaveSetting(cfg, 'snowPeaHp');
    const def = {
      id: 995,
      name: 'Snow Pea',
      color: getCrazyDaveSetting(cfg, 'snowPeaColor'),
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: getCrazyDaveSetting(cfg, 'snowPeaRadius'),
      type: 'SnowPea',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: getCrazyDaveSetting(cfg, 'snowPeaDamage'),
      cooldown: getCrazyDaveSetting(cfg, 'snowPeaFireRate'),
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.customHitFlash = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    // Committed 1-direction facing: never changes angle once planted
    this.facingDirection = (facingDirection === -1 || facingDirection === Math.PI) ? -1 : 1;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;

    this.shootCooldown = 0;
    this.shootCooldownMax = getCrazyDaveSetting(cfg, 'snowPeaFireRate');
    this.hitFlashTimer = 0;
    this.animTick = Math.floor(Math.random() * 30);
  }

  canAim() {
    return false;
  }

  aim() {
    // Strictly locked to committed 1-direction facing; no auto-aim
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  onCollide(opponent) {
    // Entities pass through plants without collision push
  }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() {
    this._statusOverlaysRenderedFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  }
  drawFreezeTimer() { /* Plants are immune to freeze */ }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly fire check: ignore damage from other plants or Crazy Dave
    const isMindControlled = isMakimaControlledPlant(this);
    const isMindControlledPlantAttacker = isMakimaControlledPlant(attacker);
    if (!isMindControlled && !isMindControlledPlantAttacker && attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    // Ignore debuff DoT tick damages (poison ticks, burn ticks, bleed ticks, electrified ticks)
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) {
        return false;
      }
      if (!isMindControlled && !isMindControlledPlantAttacker && opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    this.onDeath();
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Strict immovable anchor & committed angle: plants NEVER drift, bounce, or tilt
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) {
      return;
    }

    // Lane Target acquisition: only detect enemies in the 1 straight committed direction in front
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const range = getCrazyDaveSetting(cfg, 'snowPeaRange');
    const laneTolerance = getCrazyDaveSetting(cfg, 'plantLaneTolerance');

    let targetInLane = null;
    let closestDist = Infinity;

    const isMindControlled = isMakimaControlledPlant(this);
    const evaluateTarget = (f) => {
      if (!isEnemyPlantTarget(this, f)) return;
      const dx = f.x - this.x;
      const dy = f.y - this.y;

      // Check if enemy is ahead in the straight committed direction
      const isAhead = (this.facingDirection === 1) ? (dx > 0) : (dx < 0);
      if (!isMindControlled && !isAhead) return; // Behind the plant!

      const forwardDist = Math.abs(dx);
      const laneDist = Math.abs(dy);

      if (forwardDist <= range && laneDist <= laneTolerance) {
        if (forwardDist < closestDist) {
          closestDist = forwardDist;
          targetInLane = f;
        }
      }
    };

    const candidates = getAllPlantTargetCandidates();
    if (candidates.length > 0) {
      for (const f of candidates) evaluateTarget(f);
    } else if (opponent) {
      evaluateTarget(opponent);
    }

    // Only shoot if a valid enemy is detected in the straight forward direction
    if (targetInLane) {
      if (isMindControlled) {
        this.facingDirection = targetInLane.x < this.x ? -1 : 1;
        this.gunAngle = this.facingDirection === -1 ? Math.PI : 0;
      }
      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      } else {
        this.shootCooldown = this.shootCooldownMax;
        this._fireSnowPea(this.gunAngle, ownerIndex);
      }
    } else {
      if (this.shootCooldown > 0) this.shootCooldown--;
    }
  }

  _fireSnowPea(angle, ownerIndex) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const ownership = getPlantProjectileOwnership(this, ownerIndex);
    const speed = getCrazyDaveSetting(cfg, 'snowPeaSpeed');
    const dmg = getCrazyDaveSetting(cfg, 'snowPeaDamage');
    const isLeft = this.facingDirection === -1;
    const muzzleOffsetX = getCrazyDaveSetting(cfg, 'snowPeaMuzzleOffsetX');
    const spawnX = this.x + (isLeft ? -muzzleOffsetX : muzzleOffsetX);
    const spawnY = this.y + getCrazyDaveSetting(cfg, 'snowPeaMuzzleOffsetY');

    const snowPeaProj = {
      x: spawnX,
      y: spawnY,
      vx: (isLeft ? -1 : 1) * speed,
      vy: 0, // Straight horizontal flight
      angle: isLeft ? Math.PI : 0,
      r: getCrazyDaveSetting(cfg, 'snowPeaProjectileRadius'),
      radius: getCrazyDaveSetting(cfg, 'snowPeaProjectileRadius'),
      damage: dmg,
      owner: ownership.owner,
      ownerFighter: ownership.ownerFighter,
      isPlantProjectile: true,
      isSnowPea: true,
      isAdaptableSkillShot: true,
      skillShotId: 'crazyDaveSnowPea',
      skillShotColor: '#38BDF8',
      color: '#38BDF8',
      visual: 'snowPeaBullet',
      life: getCrazyDaveSetting(cfg, 'snowPeaProjectileLife'),
      maxLife: getCrazyDaveSetting(cfg, 'snowPeaProjectileLife'),
      penetration: 1,
      knockbackForce: getCrazyDaveSetting(cfg, 'snowPeaKnockback'),
      // Special Snow Pea Hit Callback: applies 1.5s Chill Slow + chance to Freeze
      onHit: (target) => {
        if (target) {
          if (typeof target.applySlow === 'function') {
            target.applySlow(
              getCrazyDaveSetting(cfg, 'snowPeaSlowDuration'),
              getCrazyDaveSetting(cfg, 'snowPeaSlowMultiplier'),
              { isChill: true, isSnowPea: true }
            );
          }

          // Chance to completely freeze enemy into ice stasis
          const freezeChance = getCrazyDaveSetting(cfg, 'snowPeaFreezeChance');
          if (Math.random() < freezeChance && typeof target.applyFreeze === 'function') {
            target.applyFreeze(getCrazyDaveSetting(cfg, 'snowPeaFreezeDuration'), this.owner || this, { isSnowPea: true });
          }
        }
        spawnSparks(target?.x || spawnX, target?.y || spawnY, 14, 'snowPeaShatter');
      }
    };

    if (typeof projectileSystem !== 'undefined' && Array.isArray(projectileSystem.projectiles)) {
      projectileSystem.projectiles.push(snowPeaProj);
    } else if (state && Array.isArray(state.projectiles)) {
      state.projectiles.push(snowPeaProj);
    }

    const shootSfx = getCrazyDaveSound(cfg, 'snowPeaAttack');
    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(shootSfx, getCrazyDaveSoundVolume(cfg, 'snowPeaAttack'));
    } else if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound(shootSfx, getCrazyDaveSoundVolume(cfg, 'snowPeaAttack'));
    }
  }

  draw(ctx) {
    drawSnowPea(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      const topY = this.y - Math.round(this.r * 2.1 + 8);
      drawMinionHealthBar(ctx, this.x, topY, 34, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: WALL-NUT (Solid Immovable Barrier Defense Shield)
// ─────────────────────────────────────────────────────────────────────────────
export class WallnutEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = getCrazyDaveSetting(cfg, 'wallnutHp');
    const def = {
      id: 996,
      name: 'Wall-nut',
      color: getCrazyDaveSetting(cfg, 'wallnutColor') || '#CA8A04',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: getCrazyDaveSetting(cfg, 'wallnutRadius') || 24,
      type: 'Wallnut',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      isWallnut: true,
      isPlantBarrier: true,
      hp: maxHp,
      damage: 0,
      cooldown: 999999,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.customHitFlash = true;
    this.isWallnut = true;
    this.isPlantBarrier = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = false;
    this.ignoreFighterCollisions = false;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    // Committed 1-direction facing
    this.facingDirection = (facingDirection === -1 || facingDirection === Math.PI) ? -1 : 1;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;

    this.hitFlashTimer = 0;
    this.collisionSoundCooldown = 0;
    this.animTick = Math.floor(Math.random() * 30);
  }

  canAim() {
    return false;
  }

  aim() {
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  onCollide(opponent) {
    if (!opponent || opponent === this.owner || (this.owner && opponent.owner === this.owner) || opponent.characterId === 'crazydave' || opponent.isPlant || opponent.isPlantMinion) return;
    if (typeof this.isTeammate === 'function' && this.isTeammate(opponent)) return;

    if (this.collisionSoundCooldown <= 0) {
      this.collisionSoundCooldown = 18;
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
      const hitSound = getCrazyDaveSound(cfg, 'wallnutHit');
      if (audioSystem && typeof audioSystem.playSFX === 'function') {
        audioSystem.playSFX(hitSound, getCrazyDaveSoundVolume(cfg, 'wallnutHit'));
      } else if (audioSystem && typeof audioSystem.playSound === 'function') {
        audioSystem.playSound(hitSound, getCrazyDaveSoundVolume(cfg, 'wallnutHit'));
      }
      spawnSparks(this.x, this.y, 4, '#CA8A04');
    }
  }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() {
    this._statusOverlaysRenderedFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  }
  drawFreezeTimer() { /* Plants are immune to freeze */ }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly fire check: ignore damage from other friendly plants or Crazy Dave
    const isMindControlled = isMakimaControlledPlant(this);
    const isMindControlledPlantAttacker = isMakimaControlledPlant(attacker);
    if (!isMindControlled && !isMindControlledPlantAttacker && attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    // Ignore debuff DoT tick damages
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) {
        return false;
      }
      if (!isMindControlled && !isMindControlledPlantAttacker && opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) {
      this.hitFlashTimer = 6;
      const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
      const hitSound = getCrazyDaveSound(cfg, 'wallnutHit');
      if (audioSystem && typeof audioSystem.playSFX === 'function') {
        audioSystem.playSFX(hitSound, getCrazyDaveSoundVolume(cfg, 'wallnutHit') * 0.7);
      }
      spawnSparks(this.x, this.y, 3, '#CA8A04');
    }
    return applied;
  }

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const crumbleSound = getCrazyDaveSound(cfg, 'wallnutCrumble');
    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(crumbleSound, getCrazyDaveSoundVolume(cfg, 'wallnutCrumble'));
    }
    spawnSparks(this.x, this.y, 16, '#CA8A04');
    spawnSparks(this.x, this.y, 12, '#78350F');
    spawnSparks(this.x, this.y, 8, '#D97706');
    this.onDeath();
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.collisionSoundCooldown > 0) this.collisionSoundCooldown--;

    // Strict immovable anchor: Wall-nuts NEVER drift, bounce, or tilt
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  draw(ctx) {
    drawWallnut(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      const topY = this.y - Math.round(this.r * 2.1 + 8);
      drawMinionHealthBar(ctx, this.x, topY, 38, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: TORCHWOOD (Ignites passing peas / Melts ice peas)
// Authentic PvZ mechanic: Peashooter peas → Fire Peas (2x dmg + splash)
//                         Snow Pea peas → Standard Peas (reverted, no ice)
// ─────────────────────────────────────────────────────────────────────────────
export class TorchwoodEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = getCrazyDaveSetting(cfg, 'torchwoodHp');
    const def = {
      id: 997,
      name: 'Torchwood',
      color: getCrazyDaveSetting(cfg, 'torchwoodColor') || '#F97316',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: getCrazyDaveSetting(cfg, 'torchwoodRadius') || 22,
      type: 'Torchwood',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      isTorchwood: true,
      hp: maxHp,
      damage: 0,
      cooldown: 999999,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.customHitFlash = true;
    this.isTorchwood = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;

    // Committed 1-direction facing
    this.facingDirection = (facingDirection === -1 || facingDirection === Math.PI) ? -1 : 1;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;

    this.hitFlashTimer = 0;
    this.animTick = Math.floor(Math.random() * 30);

    // Torchwood-specific: intercept radius for catching passing peas
    this._interceptRadius = getCrazyDaveSetting(cfg, 'torchwoodInterceptRadius') || 38;
    this._burnRadius = getCrazyDaveSetting(cfg, 'torchwoodBurnRadius') || 70;
    this._burnDuration = getCrazyDaveSetting(cfg, 'torchwoodBurnDuration') || 180;
    this._ignitedSet = new WeakSet(); // Track already-ignited projectiles to avoid re-processing
  }

  canAim() {
    return false;
  }

  aim() {
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  onCollide(opponent) {
    // Entities pass through torchwood without collision push
  }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() {
    this._statusOverlaysRenderedFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  }
  drawFreezeTimer() { /* Plants are immune to freeze */ }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    const isMindControlled = isMakimaControlledPlant(this);
    const isMindControlledPlantAttacker = isMakimaControlledPlant(attacker);
    if (!isMindControlled && !isMindControlledPlantAttacker && attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) {
        return false;
      }
      if (!isMindControlled && !isMindControlledPlantAttacker && opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet' || opts.projectile.visual === 'firePeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    spawnSparks(this.x, this.y, 16, '#F97316');
    spawnSparks(this.x, this.y, 12, '#EF4444');
    spawnSparks(this.x, this.y, 8, '#FBBF24');
    this.onDeath();
  }

  /**
   * Torchwood Core Mechanic: Intercept passing pea projectiles within radius.
   *
   * PvZ Authentic Interactions:
   * - Peashooter (green pea) → Fire Pea (2x damage, splash AoE, fiery visual)
   * - Snow Pea (ice pea) → Standard Pea (reverted, loses all ice/slow/freeze effects)
   * - Fire Pea passing through again → No double-ignition (tracked via WeakSet)
   */
  _interceptProjectiles() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const interceptR = this._interceptRadius;

    // Scan all active projectiles in the system
    let projArray = null;
    if (typeof projectileSystem !== 'undefined' && Array.isArray(projectileSystem.projectiles)) {
      projArray = projectileSystem.projectiles;
    } else if (state && Array.isArray(state.projectiles)) {
      projArray = state.projectiles;
    }
    if (!projArray || projArray.length === 0) return;

    for (let i = 0; i < projArray.length; i++) {
      const p = projArray[i];
      if (!p) continue;

      // Only intercept plant pea projectiles (ignore non-plant projectiles)
      const isPeaBullet = (p.visual === 'peaBullet');
      const isSnowPeaBullet = (p.visual === 'snowPeaBullet');
      if (!isPeaBullet && !isSnowPeaBullet) continue;

      // Skip if already processed by this (or any) Torchwood
      if (p._ignitedByTorchwood || this._ignitedSet.has(p)) continue;

      // Distance check: projectile within interception radius?
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > interceptR) continue;

      // Mark as processed to prevent double-ignition
      p._ignitedByTorchwood = true;
      this._ignitedSet.add(p);

      if (isPeaBullet) {
        // ── PEASHOOTER PEA → FIRE PEA ──
        // Upgrade to fire pea: 2x damage, fiery visual, splash AoE on hit
        const fireMultiplier = getCrazyDaveSetting(cfg, 'torchwoodFireDamageMultiplier') || 2.0;
        p.damage = (p.damage || 10) * fireMultiplier;
        p.visual = 'firePeaBullet';
        p.color = getCrazyDaveSetting(cfg, 'torchwoodFirePeaColor') || '#EF4444';
        p.isFirePea = true;
        p.isPlantProjectile = true;
        p.knockbackForce = (p.knockbackForce || 0.5) * 1.5; // Extra pushback

        // Attach fire pea splash AoE on hit callback
        const splashRadius = getCrazyDaveSetting(cfg, 'torchwoodFirePeaSplashRadius') || 45;
        const splashDamageMult = getCrazyDaveSetting(cfg, 'torchwoodFirePeaSplashDamage') || 0.5;
        const baseDmg = p.damage;
        const existingOnHit = p.onHit;
        p.onHit = (target) => {
          // Call existing onHit if present
          if (typeof existingOnHit === 'function') existingOnHit(target);

          // Fire pea splash AoE: damage and burn nearby enemies & enemy minions
          const splashDmg = baseDmg * splashDamageMult;
          const candidates = getAllPlantTargetCandidates();
          for (const f of candidates) {
            if (!f || f === target || f.hp <= 0 || f.dead) continue;
            if (!isEnemyPlantTarget(this, f)) continue;
            const sdx = f.x - (target?.x || p.x);
            const sdy = f.y - (target?.y || p.y);
            const sDist = Math.hypot(sdx, sdy);
            if (sDist <= splashRadius) {
              const splashAttacker = p.ownerFighter || this.owner || this;
              const splashLanded = dealPlantDamage(f, splashDmg, splashAttacker, { isFirePea: true, isBurn: true, skipKnockback: true });
              // Burn only ignites when the splash actually damaged the enemy
              if (!splashLanded) continue;

              if (typeof f.applyBurn === 'function') {
                f.applyBurn(p.ownerFighter || this.owner || this, this._burnDuration);
              } else {
                f.burnTimer = Math.max(f.burnTimer || 0, this._burnDuration);
                f.lastBurnAttacker = p.ownerFighter || this.owner || this;
              }
              spawnSparks(f.x, f.y, 6, '#F97316');
            }
          }
        };

        // Fire ignition VFX spark burst
        spawnSparks(p.x, p.y, 10, '#FBBF24');
        spawnSparks(p.x, p.y, 6, '#F97316');

      } else if (isSnowPeaBullet) {
        // ── SNOW PEA (ICE PEA) → STANDARD PEA (REVERTED) ──
        // Melt the ice: revert to normal green pea, strip all ice properties
        p.visual = 'peaBullet';
        p.color = '#22C55E';
        p.isSnowPea = false;
        p.isFirePea = false;
        p.isAdaptableSkillShot = false;
        p.skillShotId = undefined;
        p.skillShotColor = undefined;
        // Remove the snow pea chill/slow/freeze onHit callback
        p.onHit = null;
        // Revert damage to base peashooter damage (undo ice bonus if any)
        p.damage = getCrazyDaveSetting(cfg, 'peashooterDamage') || 10;
        p.knockbackForce = getCrazyDaveSetting(cfg, 'peashooterKnockback') || 0.5;

        // Steam melt VFX spark burst
        spawnSparks(p.x, p.y, 8, '#E0F2FE');
        spawnSparks(p.x, p.y, 4, '#94A3B8');
      }
    }
  }

  _applyProximityBurn() {
    if (!state) return;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const candidates = getAllPlantTargetCandidates();

    for (const fighter of candidates) {
      if (!isEnemyPlantTarget(this, fighter)) continue;

      const dx = fighter.x - this.x;
      const dy = fighter.y - this.y;
      const targetR = fighter.r || (fighter.width ? fighter.width * 0.5 : 16);
      if (Math.hypot(dx, dy) > this._burnRadius + targetR) continue;

      // If already burning, do not re-apply or re-damage every frame
      if ((fighter.burnTimer || 0) > 0) continue;

      // Contact blaze: Torchwood burns the enemy ONLY when it actually manages to damage them!
      const contactDamage = getCrazyDaveSetting(cfg, 'torchwoodContactDamage') || 1;
      const damaged = dealPlantDamage(fighter, contactDamage, this, {
        isTorchwood: true,
        isBurn: true,
        isContact: true,
        skipKnockback: true
      });

      if (!damaged) continue; // Dodged (Sans MISS), blocked (Gojo Infinity), or immune -> do not burn!

      if (typeof fighter.applyBurn === 'function') {
        fighter.applyBurn(this, this._burnDuration);
      } else {
        fighter.burnTimer = this._burnDuration;
        fighter.burnDamageTimer = fighter.burnDamageTimer || 0;
        fighter.lastBurnAttacker = this;
      }
      spawnSparks(fighter.x, fighter.y, 4, '#F97316');
    }
  }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Strict immovable anchor: Torchwoods NEVER drift, bounce, or tilt
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    // Enemies and enemy minions that approach the burning stump are ignited only if damaged
    this._applyProximityBurn();

    // Core mechanic: intercept and transform passing pea projectiles
    this._interceptProjectiles();
  }

  draw(ctx) {
    drawTorchwood(ctx, this);
    if (this.hp < this.maxHp && this.hp > 0) {
      const topY = this.y - Math.round(this.r * 3.2 + 8);
      drawMinionHealthBar(ctx, this.x, topY, 36, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT ENTITY: POTATO MINE (Proximity Explosive Trap — PvZ Classic Area Denial)
// Arms after a delay, then detonates when an enemy fighter enters its trigger radius.
// Deals massive AOE explosion damage in a blast radius. Single use — destroyed on detonation.
// ─────────────────────────────────────────────────────────────────────────────
export class PotatoMineEntity extends Fighter {
  constructor(x, y, ownerFighter) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const maxHp = getCrazyDaveSetting(cfg, 'potatoMineHp');
    const def = {
      id: 997,
      name: 'Potato Mine',
      color: getCrazyDaveSetting(cfg, 'potatoMineColor'),
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: getCrazyDaveSetting(cfg, 'potatoMineRadius'),
      type: 'PotatoMine',
      isDeployable: true,
      isMinion: true,
      isPlant: true,
      isPlantMinion: true,
      hp: maxHp,
      damage: 0,
      cooldown: 0,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.characterId = 'crazydave_plant';
    this.isDeployable = true;
    this.isMinion = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.customHitFlash = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.hideHpText = true;
    this.maxHp = maxHp;
    this.hp = maxHp;

    // Complete debuff timer suppression
    this.burnTimer = 0;
    this.burnDamageTimer = 0;
    this.poisonTicks = 0;
    this.poisonTimer = 0;
    this.bleedTimer = 0;
    this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.silenceTimer = 0;
    this.electricStunTimer = 0;
    this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0;
    this.dubstepStunVisualTimer = 0;
    this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0;
    this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0;
    this.voidMarkTimer = 0;
    this.isParalyzed = false;
    this.isParalyzedByMahito = false;
    this.isParalyzedByMahoraga = false;
    this.isFrozenByInfinity = false;
    this.isChainedByMakima = false;
    this.isWallPinnedByMakima = false;
    this.isWallPinnedBySaitama = false;
    this.isDraggedByGetsuga = false;
    this.caughtInSaitamaCounter = false;
    this.caughtInGenosFlurry = false;
    this.caughtInJohnWickCombo = false;
    this.frozenByCronos = false;
    this.isCronosStasis = false;
    this._hitByFugaTimer = 0;
    this._hitByDivineFlameTimer = 0;

    // Anchor plant immovably to centered grass tile position
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.gunAngle = 0;

    // Potato Mine specific state
    const armDelay = getCrazyDaveSetting(cfg, 'potatoMineArmDelay') ?? 0;
    this.armTimer = armDelay;
    this.isArmed = armDelay <= 0;
    this.isExploding = false;
    this.explodeAnimTimer = 0;
    this.explodeAnimDuration = 45; // ~0.75s explosion animation
    this.explodeAnimProgress = 0;
    this.hasDetonated = false;
    this.hitFlashTimer = 0;
    this.animTick = Math.floor(Math.random() * 40);
  }

  canAim() { return false; }
  aim() { this.gunAngle = 0; }
  onCollide(opponent) { /* Entities pass through */ }

  // ── Complete Debuff & Status Effect Neutralization ──
  _handleTimeStop() { return false; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; this.slowMultiplier = 1.0; return; }
  applyParalyze() { this.paralyzeTimer = 0; this.isParalyzed = false; return; }
  applyBurn() { this.burnTimer = 0; this.burnDamageTimer = 0; return; }
  applyPoison() { this.poisonTicks = 0; this.poisonTimer = 0; return; }
  applyBleed() { this.bleedTimer = 0; this.bleedDamageTimer = 0; return; }
  applyStatusEffect() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  applySilence() { this.silenceTimer = 0; return; }
  isSilenced() { return false; }
  isParalyzedDebuffActive() { return false; }
  suppressCombatAndVisuals() { return; }
  interruptAttacks() { return; }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPush() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyPull() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applySuction() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }
  applyDrag() { this.knockbackVx = 0; this.knockbackVy = 0; this.vx = 0; this.vy = 0; return; }

  // ── Master Debuff Ticks Override ──
  handleStatusEffects() {
    this.burnTimer = 0; this.burnDamageTimer = 0;
    this.poisonTicks = 0; this.poisonTimer = 0;
    this.bleedTimer = 0; this.bleedDamageTimer = 0;
    this.paralyzeTimer = 0; this.slowTimer = 0; this.slowMultiplier = 1.0;
    this.hitStunTimer = 0; this.timeStopTimer = 0; this.silenceTimer = 0;
    this.electricStunTimer = 0; this.crimsonElectrifiedTimer = 0;
    this.dubstepStunTimer = 0; this.thunderRootsTimer = 0;
    this.staticDebuffTimer = 0; this.nanamiArmorFractureTimer = 0;
    this.blackFlashDebuffTimer = 0; this.voidMarkTimer = 0;
  }
  handlePoison() { return; }
  handleBurn() { return; }
  handleBleed() { return; }

  // ── Overhead & Status Renderers ──
  drawStatusOverlays() {
    this._statusOverlaysRenderedFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  }
  drawFreezeTimer() { }
  drawSlowEffect() { return; }
  drawPoisonEffect() { return; }
  drawBurnEffect() { return; }
  drawBleedEffect() { return; }
  drawElectricStunEffect() { return; }
  drawCrimsonElectrifiedEffect() { return; }
  drawDubstepStunEffect() { return; }
  drawThunderRootsEffect() { return; }
  drawSilenceEffect() { return; }

  resolveWallBounce(arena, opponent) {
    this.vx = 0; this.vy = 0;
    this.knockbackVx = 0; this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
  }

  takeDamage(amount, attacker, opts = {}) {
    // Friendly fire check
    const isMindControlled = isMakimaControlledPlant(this);
    const isMindControlledPlantAttacker = isMakimaControlledPlant(attacker);
    if (!isMindControlled && !isMindControlledPlantAttacker && attacker && (attacker.isPlant || attacker.isPlantMinion || attacker === this.owner || (this.owner && attacker.owner === this.owner) || attacker.characterId === 'crazydave')) {
      return false;
    }
    if (opts) {
      if (opts.isPoison || opts.isBurn || opts.isBleed || opts.isElectrified) return false;
      if (!isMindControlled && !isMindControlledPlantAttacker && opts.projectile && (opts.projectile.isPlantProjectile || opts.projectile.visual === 'peaBullet' || opts.projectile.visual === 'snowPeaBullet')) {
        return false;
      }
      opts.knockback = false;
      opts.skipKnockback = true;
      opts.skipInterrupt = true;
      opts.knockbackVx = 0;
      opts.knockbackVy = 0;
    }
    const applied = super.takeDamage(amount, attacker, opts);
    this.vx = 0; this.vy = 0;
    this.knockbackVx = 0; this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    if (applied) this.hitFlashTimer = 6;
    return applied;
  }

  _processFighterDeath(attacker, opts) {
    this._hasDied = true;
    this.dead = true;
    this.isDead = true;
    this.onDeath();
  }

  /**
   * Core update: Handles arming countdown, proximity detection, and explosion sequence.
   */
  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0 || this.hasDetonated) return;
    this.animTick++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Strict immovable anchor
    this.angle = 0;
    this.gunAngle = 0;
    this.vx = 0; this.vy = 0;
    this.knockbackVx = 0; this.knockbackVy = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }

    if (this._handleTimeStop() || this.isTargetOfAmbush) return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;

    // Phase 1: Explosion animation playback (already detonated, playing VFX)
    if (this.isExploding) {
      this.explodeAnimTimer++;
      this.explodeAnimProgress = Math.min(1.0, this.explodeAnimTimer / this.explodeAnimDuration);
      if (this.explodeAnimTimer >= this.explodeAnimDuration) {
        // Explosion animation complete — self-destruct
        this.hp = 0;
        this.hasDetonated = true;
        this._processFighterDeath(null, {});
      }
      return;
    }

    // Phase 2: Arming countdown (if arm delay is configured)
    if (!this.isArmed && this.armTimer > 0) {
      this.armTimer--;
      if (this.armTimer <= 0) {
        this.isArmed = true;
        // Play arming sound
        if (audioSystem && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX(getCrazyDaveSound(cfg, 'potatoMineArm'), getCrazyDaveSoundVolume(cfg, 'potatoMineArm'));
        }
        spawnFloatingText(this.x, this.y - 30, 'ARMED!', '#FF4444');
      }
    }

    // Phase 3: Proximity detection — the moment an enemy gets close, detonate immediately!
    const triggerRadius = getCrazyDaveSetting(cfg, 'potatoMineTriggerRadius') || 55;
    const candidates = getAllPlantTargetCandidates();

    for (const f of candidates) {
      if (!isEnemyPlantTarget(this, f)) continue;
      // Only trigger on actual fighters, not on other plants or deployables
      if (f.isPlant || f.isPlantMinion || f.isLawnmower) continue;

      const dist = Math.hypot(f.x - this.x, f.y - this.y);
      const combinedRadius = triggerRadius + (f.r || 20);

      if (dist <= combinedRadius) {
        // SPUDOW! Detonate!
        this._detonate(cfg, ownerIndex);
        return;
      }
    }
  }

  /**
   * Detonates the Potato Mine: deals massive AOE damage to all enemies in blast radius.
   */
  _detonate(cfg, ownerIndex) {
    this.isExploding = true;
    this.explodeAnimTimer = 0;
    this.explodeAnimProgress = 0;

    const explosionDamage = getCrazyDaveSetting(cfg, 'potatoMineExplosionDamage');
    const explosionRadius = getCrazyDaveSetting(cfg, 'potatoMineExplosionRadius');
    const explosionKnockback = getCrazyDaveSetting(cfg, 'potatoMineExplosionKnockback');

    // SPUDOW! floating text
    spawnFloatingText(this.x, this.y - 40, 'SPUDOW!', '#FF6600');

    // Tactile screen shake punch
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(10, 16);
    }

    // Play explosion sound
    if (audioSystem && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(getCrazyDaveSound(cfg, 'potatoMineExplode'), getCrazyDaveSoundVolume(cfg, 'potatoMineExplode'));
    } else if (audioSystem && typeof audioSystem.playSound === 'function') {
      audioSystem.playSound(getCrazyDaveSound(cfg, 'potatoMineExplode'), getCrazyDaveSoundVolume(cfg, 'potatoMineExplode'));
    }

    // Spawn dual-tier impact flash (outer fiery orange + superheated white core)
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 110, '#FF5500');
      spawnImpactFlash(this.x, this.y, 50, '#FFFFFF');
    }

    // Spawn expanding SPUDOW! shockwave rings (earthy ground-level blast wave)
    if (typeof spawnMeleeClashShockwave === 'function') {
      spawnMeleeClashShockwave(this.x, this.y, explosionRadius * 1.15, 'spudow');
      spawnMeleeClashShockwave(this.x, this.y, explosionRadius * 0.70, 'spudow');
    }

    // Spawn persistent charred ground scorch crater on arena floor
    if (typeof spawnGroundScorch === 'function') {
      spawnGroundScorch(this.x, this.y, 45, 200, 'orange');
    }

    // Spawn multi-layered particle debris (flame embers, potato chunks, soil clumps, core sparks)
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, 24, 'crimson', '#FF5500'); // Hot flame sparks
      spawnSparks(this.x, this.y, 20, 'crimson', '#F59E0B'); // Golden potato tuber chunks
      spawnSparks(this.x, this.y, 16, 'crimson', '#78350F'); // Volcanic soil and dirt debris
      spawnSparks(this.x, this.y, 12, 'crimson', '#FFFFFF'); // Superheated white core sparks
    }

    // Deal AOE damage to all enemies within blast radius
    const candidates = getAllPlantTargetCandidates();
    const ownership = getPlantProjectileOwnership(this, ownerIndex);

    for (const f of candidates) {
      if (!isEnemyPlantTarget(this, f)) continue;
      const dist = Math.hypot(f.x - this.x, f.y - this.y);
      if (dist > explosionRadius) continue;

      // Distance-based damage falloff: full damage at center, 40% at edge
      const falloff = 1.0 - (dist / explosionRadius) * 0.6;
      const finalDamage = Math.round(explosionDamage * falloff);

      // Apply damage
      if (typeof applyDamageToTarget === 'function') {
        applyDamageToTarget(f, finalDamage, this.owner || this, {
          knockback: true,
          skipInterrupt: false,
        });
      } else if (typeof f.takeDamage === 'function') {
        f.takeDamage(finalDamage, this.owner || this, {});
      }

      // Apply explosion knockback push away from mine center
      if (f && typeof f.applyKnockback === 'function' && !f.isImmovable && !f.cannotBeKnockbacked) {
        const angle = Math.atan2(f.y - this.y, f.x - this.x);
        const kbForce = explosionKnockback * falloff;
        f.knockbackVx = (f.knockbackVx || 0) + Math.cos(angle) * kbForce;
        f.knockbackVy = (f.knockbackVy || 0) + Math.sin(angle) * kbForce;
      }
    }
  }

  draw(ctx) {
    if (this.hasDetonated && !this.isExploding) return;
    drawPotatoMine(ctx, this);
    if (!this.isExploding && this.hp < this.maxHp && this.hp > 0) {
      const topY = this.y - Math.round(this.r * 2.2 + 8);
      drawMinionHealthBar(ctx, this.x, topY, 30, 5, this.hp, this.maxHp);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BASELINE DEFENSE ENTITY: LAWNMOWER (PvZ Signature Last Line of Defense)
// ─────────────────────────────────────────────────────────────────────────────
export class LawnmowerEntity extends Fighter {
  constructor(x, y, ownerFighter, facingDirection = 1, row = 0) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const def = {
      id: 996,
      name: 'Lawnmower',
      color: getCrazyDaveSetting(cfg, 'lawnmowerColor') || '#DC2626',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: getCrazyDaveSetting(cfg, 'lawnmowerRadius') || 18,
      type: 'Lawnmower',
      isDeployable: true,
      isMinion: true,
      isMinionEntity: true,
      isLawnmower: true,
      isUntargetable: true,
      untargetable: true,
      cannotBeTargeted: true,
      isTargetable: false,
      hp: 99999,
      damage: getCrazyDaveSetting(cfg, 'lawnmowerDamage') || 180,
      cooldown: 999999,
      moveSpeed: 0,
      spinRate: 0,
    };
    super(def);

    this.owner = ownerFighter;
    this.ownerIndex = ownerFighter?.fighterIndex ?? 0;
    this.team = ownerFighter?.team;
    this.characterId = 'crazydave_lawnmower';
    this.isDeployable = true;
    this.isMinion = true;
    this.isMinionEntity = true;
    this.isPlant = true;
    this.isPlantMinion = true;
    this.customHitFlash = true;
    this.isLawnmower = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPull = true;
    this.immuneToPush = true;
    this.cannotBeDisplaced = true;
    this.immuneToCC = true;
    this.domainImmunity = true;
    this.immuneToBurn = true;
    this.immuneToPoison = true;
    this.immuneToBleed = true;
    this.isDebuffImmune = true;
    this.gojoBlueDragImmune = true;
    this.gojoInfinityImmune = true;
    this.phasesThroughEntities = true;
    this.ignoreFighterCollisions = true;
    this.isUntargetable = true;
    this.untargetable = true;
    this.cannotBeTargeted = true;
    this.isTargetable = false;
    this.hideHpText = true;
    this.hideHealthBar = true;
    this.invulnerable = true;
    this.maxHp = 99999;
    this.hp = 99999;

    this.facingDirection = facingDirection;
    this.row = row;
    this.state = 'idle'; // 'idle' | 'charging' | 'despawned'
    this.animTick = 0;
    this._fixedX = x;
    this._fixedY = y;
    this._shreddedTargets = new WeakSet();
    this._triggerRadius = getCrazyDaveSetting(cfg, 'lawnmowerTriggerRadius') || 38;
    this._speed = getCrazyDaveSetting(cfg, 'lawnmowerSpeed') || 11.5;
    this._damage = getCrazyDaveSetting(cfg, 'lawnmowerDamage') || 180;
  }

  takeDamage() {
    return 0; // Lawnmower is invulnerable
  }

  canAim() {
    return false;
  }

  isValidAimTarget() {
    return false;
  }

  aim() {
    this.angle = 0;
    this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
  }

  trigger() {
    if (this.state !== 'idle') return;
    this.state = 'charging';
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    spawnFloatingText(this.x, this.y - 20, 'VROOOOM!', '#DC2626');
    spawnSparks(this.x, this.y, 8, '#DC2626');
    spawnSparks(this.x, this.y, 8, '#FBBF24');

    const playSfx = typeof audioSystem.playSFX === 'function' ? audioSystem.playSFX : audioSystem.playSound;
    if (typeof playSfx === 'function') {
      playSfx.call(audioSystem, getCrazyDaveSound(cfg, 'lawnmowerEngine'), getCrazyDaveSoundVolume(cfg, 'lawnmowerEngine'));
    }
  }

  _checkTripCondition(arena, cfg) {
    if (!state) return;

    const rowH = arena.height / Math.max(3, Math.round(arena.height / (getCrazyDaveSetting(cfg, 'grassTileSize') || 76.6)));
    const halfRowH = rowH * 0.55;
    const allCandidates = getAllPlantTargetCandidates();

    for (const f of allCandidates) {
      if (!isEnemyPlantTarget(this, f)) continue;

      const dy = Math.abs(f.y - this.y);
      const dx = Math.abs(f.x - this.x);
      const dist = Math.hypot(dx, dy);

      // Direct proximity trigger
      if (dist <= this._triggerRadius) {
        this.trigger();
        return;
      }

      // Lane breach trigger: enemy is within mower's lane and crosses baseline zone
      if (dy <= halfRowH) {
        if (this.facingDirection === 1 && f.x <= this.x + this._triggerRadius + 12) {
          this.trigger();
          return;
        } else if (this.facingDirection === -1 && f.x >= this.x - this._triggerRadius - 12) {
          this.trigger();
          return;
        }
      }
    }
  }

  _shredEnemies(cfg) {
    if (!state) return;
    const playSfx = typeof audioSystem.playSFX === 'function' ? audioSystem.playSFX : audioSystem.playSound;
    const allCandidates = getAllPlantTargetCandidates();

    for (const f of allCandidates) {
      if (!isEnemyPlantTarget(this, f)) continue;

      const hitDist = this.r + (f.r || f.hitRadius || 18) + 8;
      if (Math.hypot(f.x - this.x, f.y - this.y) <= hitDist) {
        if (!this._shreddedTargets.has(f)) {
          this._shreddedTargets.add(f);

          // ── Special Interaction: Gojo Limitless Infinity Barrier ──
          // Lawnmower is a physical object — Infinity halts it and the mower self-destructs on impact.
          // 0 damage to Gojo. The barrier is impenetrable to mechanical entities.
          const isGojoInfinityActive = (
            (f.characterId === 'gojo' || f.type === 'gojo') &&
            f.infinityActive &&
            (f.infinityCooldown || 0) <= 0 &&
            (f.infinityBarrierHp === undefined || f.infinityBarrierHp > 0)
          );

          if (isGojoInfinityActive) {
            // Lawnmower slams into Infinity and explodes — 0 damage to Gojo
            const midX = (this.x + f.x) * 0.5;
            const midY = (this.y + f.y) * 0.5;

            spawnFloatingText(midX, midY - 30, 'INFINITY!', '#00E5FF');
            spawnFloatingText(this.x, this.y - 20, 'DESTROYED!', '#DC2626');

            // Infinity barrier clash shockwave
            if (typeof spawnMeleeClashShockwave === 'function') {
              spawnMeleeClashShockwave(midX, midY, 65, 'gojo_infinity');
            }

            // Mower wreckage sparks and debris
            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(this.x, this.y, 60, '#FF5500');
            }
            spawnSparks(this.x, this.y, 20, 'crimson', '#DC2626');
            spawnSparks(this.x, this.y, 14, 'crimson', '#475569');
            spawnSparks(midX, midY, 10, 'crimson', '#00E5FF');

            // Screen shake from the collision impact
            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(8, 12);
            }

            // Play destruction SFX
            if (typeof playSfx === 'function') {
              playSfx.call(audioSystem, getCrazyDaveSound(cfg, 'lawnmowerHit'), getCrazyDaveSoundVolume(cfg, 'lawnmowerHit'));
            }

            // Self-destruct the lawnmower
            this.despawn();
            return;
          }

          // Devastating steamroller shred damage
          const crushLanded = dealPlantDamage(f, this._damage, this.owner || this, { isLawnmower: true, damageType: 'crush', isUnblockable: true });

          // Dodged / blocked / immune → no knockback, no splat, and NO stun
          if (!crushLanded) continue;

          const kbX = this.facingDirection * 10;
          const kbY = (Math.random() - 0.5) * 6;
          f.knockbackVx = kbX;
          f.knockbackVy = kbY;
          if (typeof f.applyKnockback === 'function') {
            f.applyKnockback(kbX, kbY);
          }

          // Splat sparks, text & SFX
          spawnSparks(f.x, f.y, 16, '#DC2626');
          spawnSparks(f.x, f.y, 10, '#15803D');
          spawnFloatingText(f.x, f.y - 25, 'SPLAT!', '#DC2626');

          // Apply stun effect — steamroller impact freezes the target
          const stunDuration = getCrazyDaveSetting(cfg, 'lawnmowerStunDuration') || 45;
          if (typeof f.applyTimeStop === 'function') {
            f.applyTimeStop(stunDuration);
            spawnFloatingText(f.x, f.y - 45, 'STUNNED!', '#FBBF24');
          }

          if (typeof playSfx === 'function') {
            playSfx.call(audioSystem, getCrazyDaveSound(cfg, 'lawnmowerHit'), getCrazyDaveSoundVolume(cfg, 'lawnmowerHit'));
          }
        }
      }
    }
  }

  despawn() {
    this.state = 'despawned';
    this.hp = 0;
    this.dead = true;
    if (this.owner && Array.isArray(this.owner.lawnmowers)) {
      const idx = this.owner.lawnmowers.indexOf(this);
      if (idx !== -1) this.owner.lawnmowers.splice(idx, 1);
    }
    if (state && Array.isArray(state.fighters)) {
      const idx = state.fighters.indexOf(this);
      if (idx !== -1) state.fighters.splice(idx, 1);
    }
  }

  update(opponent, ownerIndex, arena) {
    if (this.state === 'despawned') return;

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    arena = arena || (state && state.arena) || { x: 0, y: 0, width: 460, height: 460 };

    this.animTick = (this.animTick || 0) + 1;

    if (this.state === 'idle') {
      this.x = this._fixedX;
      this.y = this._fixedY;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
      this.angle = 0;

      this._checkTripCondition(arena, cfg);
    } else if (this.state === 'charging') {
      this.x += this.facingDirection * this._speed;
      this.y = this._fixedY;
      this.vx = this.facingDirection * this._speed;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.gunAngle = (this.facingDirection === -1) ? Math.PI : 0;
      this.angle = 0;

      // ── + Wall Collision: Lawnmower explodes on impact with the arena center wall ──
      // The + wall is treated as an arena border — the mower cannot pass through it.
      const _plusObs = getArenaCenterObstacle(arena);
      if (_plusObs && isPointInsidePlusObstacle(this.x, this.y, _plusObs.cx, _plusObs.cy, _plusObs.halfSize + this.r, _plusObs.halfThick + this.r)) {
        // Impact point: push back to wall face
        const impactX = this.x - this.facingDirection * this._speed;
        const impactY = this.y;

        spawnFloatingText(impactX, impactY - 20, 'CRASH!', '#DC2626');
        spawnFloatingText(impactX, impactY - 38, '💥 WALL', '#F97316');

        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(impactX, impactY, 55, '#FF5500');
        }
        spawnSparks(impactX, impactY, 18, '#DC2626');
        spawnSparks(impactX, impactY, 12, '#FBBF24');
        spawnSparks(impactX, impactY, 8, '#475569');

        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(6, 10);
        }

        const playSfx = typeof audioSystem.playSFX === 'function' ? audioSystem.playSFX : audioSystem.playSound;
        if (typeof playSfx === 'function') {
          playSfx.call(audioSystem, getCrazyDaveSound(cfg, 'lawnmowerHit'), getCrazyDaveSoundVolume(cfg, 'lawnmowerHit'));
        }

        this.despawn();
        return;
      }

      if (this.animTick % 3 === 0) {
        spawnSparks(this.x - this.facingDirection * 14, this.y + 8, 3, '#15803D');
        spawnSparks(this.x - this.facingDirection * 16, this.y - 4, 2, '#475569');
      }

      this._shredEnemies(cfg);

      const outLeft = this.facingDirection === -1 && this.x < arena.x - 60;
      const outRight = this.facingDirection === 1 && this.x > arena.x + arena.width + 60;
      if (outLeft || outRight) {
        this.despawn();
      }
    }
  }

  drawStatusOverlays() {
    this._statusOverlaysRenderedFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : Date.now();
  }

  draw(ctx) {
    if (this.state === 'despawned') return;
    drawLawnmower(ctx, this);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CRAZY DAVE FIGHTER CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class CrazyDaveFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'crazydave';
    this.type = 'crazydave';
    this.name = 'PLANTS';
    this.displayName = 'PLANTS';

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    this.color = def?.color ?? getCrazyDaveSetting(cfg, 'color');
    this.themeColor = def?.themeColor ?? getCrazyDaveSetting(cfg, 'themeColor');
    this.secondaryColor = def?.secondaryColor ?? getCrazyDaveSetting(cfg, 'secondaryColor');
    this.damageNumberColor = getCrazyDaveSetting(cfg, 'color');

    this.hp = getCrazyDaveSetting(cfg, 'hp');
    this.maxHp = getCrazyDaveSetting(cfg, 'maxHp');
    this.speed = getCrazyDaveSetting(cfg, 'speed');
    this.baseSpeed = getCrazyDaveSetting(cfg, 'speed');

    // Zero basic attack (Dave does not attack directly; orientation flips horizontally without rotation)
    this.damage = getCrazyDaveSetting(cfg, 'damage');
    this.cooldown = 999999;
    this.shootCooldown = 999999;
    this.shootCooldownMax = 999999;
    this.canShoot = false;
    this.angle = 0;
    this.gunAngle = 0;
    this.facingLeft = false;
    this.plantingPauseTimer = 0;
    this.plantingAnimTimer = 0;
    this.plantingAnimDuration = getCrazyDaveSetting(cfg, 'plantingDuration');
    this.shovelSwingTimer = 0;

    // Sun Economy State
    this.sunPickupValue = def?.sunPickupValue ?? getCrazyDaveSetting(cfg, 'sunPickupValue');
    this.sunCount = def?.sunCount ?? getCrazyDaveSetting(cfg, 'initialSun');
    this.maxSun = getCrazyDaveSetting(cfg, 'maxSun');
    this.suns = [];
    this.ambientSunTimer = 0;
    this.ambientSunInterval = getCrazyDaveSetting(cfg, 'sunSpawnRate');

    // Skill Cooldowns (5 Flora Abilities)
    this.wallnutCooldown = 0;
    this.peashooterCooldown = 0;
    this.snowPeaCooldown = 0;
    this.torchwoodCooldown = 0;
    this.potatoMineCooldown = 0;

    // Plant Roster References & Selection History
    this.activeWallnuts = [];
    this.activePeashooters = [];
    this.activeSnowPeas = [];
    this.activeTorchwoods = [];
    this.activePotatoMines = [];
    this.lastPlantedType = null;

    // Lawnmower Baseline Defense System (PvZ Signature Final Defense)
    this.lawnmowers = [];
    this.lawnmowersInitialized = false;

    // Register Declarative Skills for HUD
    this._registerSkills();
  }

  canAim() {
    return true;
  }

  isStationarySkillActive() {
    return Boolean(
      (this.plantingPauseTimer && this.plantingPauseTimer > 0) ||
      (this.plantingAnimTimer && this.plantingAnimTimer > 0) ||
      super.isStationarySkillActive?.()
    );
  }

  aim(opponent) {
    if (!opponent) return;
    // Dave does NOT rotate at diagonal angles; body orientation is strictly horizontal (0 or PI)
    this.angle = 0;
    if (opponent.x !== undefined) {
      this.facingLeft = opponent.x < this.x;
      this.gunAngle = this.facingLeft ? Math.PI : 0;
    }
  }

  shoot(ownerIndex) {
    // Dave has NO basic attack and never shoots projectiles
    this.shootCooldown = 999999;
    return false;
  }

  _registerSkills() {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const skills = [];

    if (isSkillEnabled(cfg.enableWallnut, true)) {
      skills.push({
        id: 'wallnut',
        name: `Wall-nut (${getCrazyDaveSetting(cfg, 'wallnutCost')}☀️)`,
        type: 'defense',
        cooldownKey: 'wallnutCooldown',
        cooldownMax: () => getCrazyDaveSetting(cfg, 'wallnutCooldown'),
        color: getCrazyDaveSetting(cfg, 'wallnutColor') || '#CA8A04',
        onActivate: (fighter, opponent) => {
          fighter.plantWallnut(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enablePeashooter, true)) {
      skills.push({
        id: 'peashooter',
        name: `Peashooter (${getCrazyDaveSetting(cfg, 'peashooterCost')}☀️)`,
        type: 'basic',
        cooldownKey: 'peashooterCooldown',
        cooldownMax: () => getCrazyDaveSetting(cfg, 'peashooterCooldown'),
        color: getCrazyDaveSetting(cfg, 'peashooterColor'),
        onActivate: (fighter, opponent) => {
          fighter.plantPeashooter(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableSnowPea, true)) {
      skills.push({
        id: 'snowPea',
        name: `Snow Pea (${getCrazyDaveSetting(cfg, 'snowPeaCost')}☀️)`,
        type: 'ultimate',
        cooldownKey: 'snowPeaCooldown',
        cooldownMax: () => getCrazyDaveSetting(cfg, 'snowPeaCooldown'),
        color: getCrazyDaveSetting(cfg, 'snowPeaColor'),
        onActivate: (fighter, opponent) => {
          fighter.plantSnowPea(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enableTorchwood, true)) {
      skills.push({
        id: 'torchwood',
        name: `Torchwood (${getCrazyDaveSetting(cfg, 'torchwoodCost')}☀️)`,
        type: 'special',
        cooldownKey: 'torchwoodCooldown',
        cooldownMax: () => getCrazyDaveSetting(cfg, 'torchwoodCooldown'),
        color: getCrazyDaveSetting(cfg, 'torchwoodColor') || '#F97316',
        onActivate: (fighter, opponent) => {
          fighter.plantTorchwood(opponent);
        }
      });
    }

    if (isSkillEnabled(cfg.enablePotatoMine, true)) {
      skills.push({
        id: 'potatoMine',
        name: `Potato Mine (${getCrazyDaveSetting(cfg, 'potatoMineCost')}☀️)`,
        type: 'passive',
        cooldownKey: 'potatoMineCooldown',
        cooldownMax: () => getCrazyDaveSetting(cfg, 'potatoMineCooldown'),
        color: getCrazyDaveSetting(cfg, 'potatoMineColor') || '#A16207',
        onActivate: (fighter, opponent) => {
          fighter.plantPotatoMine(opponent);
        }
      });
    }

    if (skills.length > 0 && this.skillManager) {
      this.skillManager.registerSkills(skills);
    }
  }

  reset() {
    super.reset();
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    this.sunPickupValue = getCrazyDaveSetting(cfg, 'sunPickupValue');
    this.sunCount = getCrazyDaveSetting(cfg, 'initialSun');
    this.suns = [];
    this.ambientSunTimer = 0;
    this.wallnutCooldown = 0;
    this.peashooterCooldown = 0;
    this.snowPeaCooldown = 0;
    this.torchwoodCooldown = 0;
    this.potatoMineCooldown = 0;
    this.plantingPauseTimer = 0;
    this.shootCooldown = 999999;
    this.shootCooldownMax = 999999;
    this.angle = 0;
    this.gunAngle = 0;

    if (this.activeWallnuts) {
      this.activeWallnuts.forEach(w => {
        if (w) {
          w.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(w);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    if (this.activePeashooters) {
      this.activePeashooters.forEach(p => {
        if (p) {
          p.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(p);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    if (this.activeSnowPeas) {
      this.activeSnowPeas.forEach(s => {
        if (s) {
          s.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(s);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    if (this.activeTorchwoods) {
      this.activeTorchwoods.forEach(t => {
        if (t) {
          t.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(t);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    if (this.activePotatoMines) {
      this.activePotatoMines.forEach(m => {
        if (m) {
          m.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(m);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    this.activeWallnuts = [];
    this.activePeashooters = [];
    this.activeSnowPeas = [];
    this.activeTorchwoods = [];
    this.activePotatoMines = [];
    this.lastPlantedType = null;

    // Clear lawnmowers on reset
    this.clearLawnmowers();
    this.lawnmowersInitialized = false;
  }

  takeDamage(amount, attacker, opts = {}) {
    const applied = super.takeDamage(amount, attacker, opts);
    if (this.hp <= 0) {
      // Transfer uncollected sun drops to living teammate Daves so none are lost
      const livingTeammates = getTeammateCrazyDaves(this).filter(d => d !== this && d.hp > 0);
      if (livingTeammates.length > 0 && Array.isArray(this.suns) && this.suns.length > 0) {
        livingTeammates[0].suns.push(...this.suns);
        this.suns = [];
      }

      if (this.lawnmowers) {
        this.lawnmowers.forEach(m => {
          if (m && m.state === 'idle') {
            m.despawn();
          }
        });
      }
      if (this.activeWallnuts) {
        this.activeWallnuts.forEach(w => {
          if (w) {
            w.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(w);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      if (this.activePeashooters) {
        this.activePeashooters.forEach(p => {
          if (p) {
            p.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(p);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      if (this.activeSnowPeas) {
        this.activeSnowPeas.forEach(s => {
          if (s) {
            s.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(s);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      if (this.activeTorchwoods) {
        this.activeTorchwoods.forEach(t => {
          if (t) {
            t.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(t);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      if (this.activePotatoMines) {
        this.activePotatoMines.forEach(m => {
          if (m) {
            m.hp = 0;
            if (state && Array.isArray(state.fighters)) {
              const idx = state.fighters.indexOf(m);
              if (idx !== -1) state.fighters.splice(idx, 1);
            }
          }
        });
      }
      this.activeWallnuts = [];
      this.activePeashooters = [];
      this.activeSnowPeas = [];
      this.activeTorchwoods = [];
      this.activePotatoMines = [];
    }
    return applied;
  }

  /**
   * Initializes lawnmowers along Crazy Dave's home baseline edge for each grass tile row.
   */
  initLawnmowers(arena) {
    this.lawnmowersInitialized = true;
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    if (!isSkillEnabled(cfg.enableLawnmower, true)) return;

    arena = arena || (state && state.arena) || { x: 0, y: 0, width: 460, height: 460 };
    const targetTileSize = getCrazyDaveSetting(cfg, 'grassTileSize') || 76.6;
    const rows = Math.max(3, Math.round(arena.height / targetTileSize));
    const cellH = arena.height / rows;

    // Lawnmowers parked on the side based on where Dave spawns
    const arenaMidX = arena.x + arena.width / 2;
    const spawnX = Number.isFinite(this.x)
      ? this.x
      : ((typeof this.startX === 'number' && !isNaN(this.startX))
        ? this.startX
        : ((this._def && typeof this._def.startX === 'number' && !isNaN(this._def.startX)) ? this._def.startX : 0));

    const isRightSpawn = spawnX > arenaMidX;
    const facingDirection = isRightSpawn ? -1 : 1;
    const baselineOffset = getCrazyDaveSetting(cfg, 'lawnmowerBaselineOffset') ?? 2;
    const baselineX = isRightSpawn
      ? (arena.x + arena.width - baselineOffset)
      : (arena.x + baselineOffset);

    this.lawnmowers = [];
    for (let r = 0; r < rows; r++) {
      const rowY = arena.y + (r + 0.5) * cellH;
      const mower = new LawnmowerEntity(baselineX, rowY, this, facingDirection, r);
      this.lawnmowers.push(mower);
      if (state && Array.isArray(state.fighters) && !state.fighters.includes(mower)) {
        state.fighters.push(mower);
      }
    }
  }

  /**
   * Clears and despawns all active lawnmowers.
   */
  clearLawnmowers() {
    if (this.lawnmowers) {
      this.lawnmowers.forEach(m => {
        if (m) {
          m.state = 'despawned';
          m.hp = 0;
          if (state && Array.isArray(state.fighters)) {
            const idx = state.fighters.indexOf(m);
            if (idx !== -1) state.fighters.splice(idx, 1);
          }
        }
      });
    }
    this.lawnmowers = [];
  }

  /**
   * Spawns a Sun drop outside the top of the arena that falls down to land on the center of a grass tile.
   */
  spawnSunDrop(targetX, targetY, value) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const arena = (state && state.arena) ? state.arena : CONFIG.arena;

    let destX = targetX;
    let destY = targetY;
    if (destX === undefined || destX === null || destY === undefined || destY === null) {
      const tile = getRandomGrassTileCenter(arena);
      destX = tile.x;
      destY = tile.y;
    }

    // ── + Wall Guard: Redirect sun drops that would land inside the arena center wall ──
    // The + wall occupies the arena center; suns must not land on solid wall geometry.
    const _sunObs = getArenaCenterObstacle(arena);
    if (_sunObs) {
      let _sunWallRetries = 0;
      while (
        isPointInsidePlusObstacle(destX, destY, _sunObs.cx, _sunObs.cy, _sunObs.halfSize, _sunObs.halfThick) &&
        _sunWallRetries < 8
      ) {
        const tile = getRandomGrassTileCenter(arena);
        destX = tile.x;
        destY = tile.y;
        _sunWallRetries++;
      }
    }

    // Spawn at the top outside of the arena and drop down to the grass tile center
    const startY = (arena && arena.y !== undefined)
      ? arena.y - getCrazyDaveSetting(cfg, 'sunDropSpawnOffset')
      : destY - getCrazyDaveSetting(cfg, 'sunDropFallbackOffset');
    const fallSpeed = getCrazyDaveSetting(cfg, 'sunFallSpeed');
    const defaultVal = this.sunPickupValue ?? getCrazyDaveSetting(cfg, 'sunPickupValue');
    const resolvedValue = (value !== undefined && value !== null) ? value : defaultVal;

    const sun = {
      x: destX,
      y: startY,
      targetX: destX,
      targetY: destY,
      vx: 0,
      vy: fallSpeed,
      isLanding: true,
      r: getCrazyDaveSetting(cfg, 'sunRadius'),
      value: resolvedValue,
      life: getCrazyDaveSetting(cfg, 'sunDecayFrames'),
      pulse: 0,
      rotAngle: Math.random() * Math.PI,
    };
    this.suns.push(sun);
    return sun;
  }

  /**
   * Plant Ability 1: Wall-nut (Costs 50 ☀️) — Solid Immovable Barrier Defense Shield
   */
  plantWallnut(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const wallnutCost = getCrazyDaveSetting(cfg, 'wallnutCost');
    if (this.sunCount < wallnutCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${wallnutCost}☀️!`, '#EF4444');
      return false;
    }
    this.activeWallnuts = this.activeWallnuts.filter(w => w && w.hp > 0);
    const maxActiveWallnuts = getCrazyDaveSetting(cfg, 'maxActiveWallnuts') || 2;
    if (this.activeWallnuts.length >= maxActiveWallnuts) {
      spawnFloatingText(this.x, this.y - 25, `Max ${maxActiveWallnuts} Wall-nuts active!`, '#EF4444');
      return false;
    }

    const arena = (state && state.arena) ? state.arena : CONFIG.arena;
    const plantSpawnOffset = getCrazyDaveSetting(cfg, 'plantSpawnOffset');
    const rawX = this.x + Math.cos(this.gunAngle || 0) * plantSpawnOffset;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * plantSpawnOffset;
    const tileCenter = getAvailableCrazyDavePlantTile(this, rawX, rawY, arena);
    if (!tileCenter) {
      spawnFloatingText(this.x, this.y - 25, 'No open grass tile!', '#EF4444');
      return false;
    }
    this.sunCount -= wallnutCost;
    this.wallnutCooldown = getCrazyDaveSetting(cfg, 'wallnutCooldown');

    // Compute committed 1-direction facing (Left = -1, Right = +1)
    let facingDirection = 1;
    let targetEnemy = (opponent && opponent.hp > 0 && opponent !== this) ? opponent : null;
    if (!targetEnemy && state && Array.isArray(state.fighters)) {
      let closestDist = Infinity;
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDeployable && !f.isMinion && f.hp > 0 && !f.dead) {
          const d = Math.hypot(f.x - tileCenter.x, f.y - tileCenter.y);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = f;
          }
        }
      }
    }
    if (targetEnemy) {
      facingDirection = (targetEnemy.x < tileCenter.x) ? -1 : 1;
    } else if (this.gunAngle !== undefined) {
      facingDirection = (Math.abs(this.gunAngle) > Math.PI / 2) ? -1 : 1;
    } else {
      const arenaMidX = arena.x + arena.width / 2;
      facingDirection = (tileCenter.x > arenaMidX) ? -1 : 1;
    }

    const wallnut = new WallnutEntity(tileCenter.x, tileCenter.y, this, facingDirection);
    this.activeWallnuts.push(wallnut);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(wallnut)) {
      state.fighters.push(wallnut);
    }

    spawnFloatingText(this.x, this.y - 25, `-${wallnutCost} ☀️ Wall-nut!`, getCrazyDaveSetting(cfg, 'wallnutColor') || '#CA8A04');
    playDavePlantingAudio(cfg);

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'wallnut';
    const plantingDuration = getCrazyDaveSetting(cfg, 'plantingDuration');
    this.plantingPauseTimer = plantingDuration;
    this.plantingAnimTimer = plantingDuration;
    this.plantingAnimDuration = plantingDuration;
    this.shovelSwingTimer = plantingDuration;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    return true;
  }

  /**
   * Plant Ability 2: Peashooter (Costs 100 ☀️)
   */
  plantPeashooter(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const peashooterCost = getCrazyDaveSetting(cfg, 'peashooterCost');
    if (this.sunCount < peashooterCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${peashooterCost}☀️!`, '#EF4444');
      return false;
    }
    this.activePeashooters = this.activePeashooters.filter(p => p && p.hp > 0);

    const arena = (state && state.arena) ? state.arena : CONFIG.arena;
    const plantSpawnOffset = getCrazyDaveSetting(cfg, 'plantSpawnOffset');
    const rawX = this.x + Math.cos(this.gunAngle || 0) * plantSpawnOffset;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * plantSpawnOffset;
    const tileCenter = getAvailableCrazyDavePlantTile(this, rawX, rawY, arena);
    if (!tileCenter) {
      spawnFloatingText(this.x, this.y - 25, 'No open grass tile!', '#EF4444');
      return false;
    }
    this.sunCount -= peashooterCost;
    this.peashooterCooldown = getCrazyDaveSetting(cfg, 'peashooterCooldown');

    // Compute committed 1-direction facing (Left = -1, Right = +1)
    let facingDirection = 1;
    let targetEnemy = (opponent && opponent.hp > 0 && opponent !== this) ? opponent : null;
    if (!targetEnemy && state && Array.isArray(state.fighters)) {
      let closestDist = Infinity;
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDeployable && !f.isMinion && f.hp > 0 && !f.dead) {
          const d = Math.hypot(f.x - tileCenter.x, f.y - tileCenter.y);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = f;
          }
        }
      }
    }
    if (targetEnemy) {
      facingDirection = (targetEnemy.x < tileCenter.x) ? -1 : 1;
    } else if (this.gunAngle !== undefined) {
      facingDirection = (Math.abs(this.gunAngle) > Math.PI / 2) ? -1 : 1;
    } else {
      const arenaMidX = arena.x + arena.width / 2;
      facingDirection = (tileCenter.x > arenaMidX) ? -1 : 1;
    }

    const peashooter = new PeashooterEntity(tileCenter.x, tileCenter.y, this, facingDirection);
    this.activePeashooters.push(peashooter);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(peashooter)) {
      state.fighters.push(peashooter);
    }

    spawnFloatingText(this.x, this.y - 25, `-${peashooterCost} ☀️ Peashooter!`, getCrazyDaveSetting(cfg, 'peashooterColor'));
    playDavePlantingAudio(cfg);

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'peashooter';
    const plantingDuration = getCrazyDaveSetting(cfg, 'plantingDuration');
    this.plantingPauseTimer = plantingDuration;
    this.plantingAnimTimer = plantingDuration;
    this.plantingAnimDuration = plantingDuration;
    this.shovelSwingTimer = plantingDuration;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    return true;
  }

  /**
   * Plant Ability 3: Snow Pea (Costs 175 ☀️)
   */
  plantSnowPea(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const snowPeaCost = getCrazyDaveSetting(cfg, 'snowPeaCost');
    if (this.sunCount < snowPeaCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${snowPeaCost}☀️!`, '#EF4444');
      return false;
    }
    this.activeSnowPeas = this.activeSnowPeas.filter(s => s && s.hp > 0);

    const arena = (state && state.arena) ? state.arena : CONFIG.arena;
    const plantSpawnOffset = getCrazyDaveSetting(cfg, 'plantSpawnOffset');
    const rawX = this.x + Math.cos(this.gunAngle || 0) * plantSpawnOffset;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * plantSpawnOffset;
    const tileCenter = getAvailableCrazyDavePlantTile(this, rawX, rawY, arena);
    if (!tileCenter) {
      spawnFloatingText(this.x, this.y - 25, 'No open grass tile!', '#EF4444');
      return false;
    }
    this.sunCount -= snowPeaCost;
    this.snowPeaCooldown = getCrazyDaveSetting(cfg, 'snowPeaCooldown');

    // Compute committed 1-direction facing (Left = -1, Right = +1)
    let facingDirection = 1;
    let targetEnemy = (opponent && opponent.hp > 0 && opponent !== this) ? opponent : null;
    if (!targetEnemy && state && Array.isArray(state.fighters)) {
      let closestDist = Infinity;
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDeployable && !f.isMinion && f.hp > 0 && !f.dead) {
          const d = Math.hypot(f.x - tileCenter.x, f.y - tileCenter.y);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = f;
          }
        }
      }
    }
    if (targetEnemy) {
      facingDirection = (targetEnemy.x < tileCenter.x) ? -1 : 1;
    } else if (this.gunAngle !== undefined) {
      facingDirection = (Math.abs(this.gunAngle) > Math.PI / 2) ? -1 : 1;
    } else {
      const arenaMidX = arena.x + arena.width / 2;
      facingDirection = (tileCenter.x > arenaMidX) ? -1 : 1;
    }

    const snowpea = new SnowPeaEntity(tileCenter.x, tileCenter.y, this, facingDirection);
    this.activeSnowPeas.push(snowpea);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(snowpea)) {
      state.fighters.push(snowpea);
    }

    spawnFloatingText(this.x, this.y - 25, `-${snowPeaCost} ☀️ Snow Pea!`, getCrazyDaveSetting(cfg, 'snowPeaColor'));
    playDavePlantingAudio(cfg);

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'snowpea';
    const plantingDuration = getCrazyDaveSetting(cfg, 'plantingDuration');
    this.plantingPauseTimer = plantingDuration;
    this.plantingAnimTimer = plantingDuration;
    this.plantingAnimDuration = plantingDuration;
    this.shovelSwingTimer = plantingDuration;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    return true;
  }

  /**
   * Plant Ability 4: Torchwood (Costs 175 ☀️)
   * Ignites passing green peas into blazing Fire Peas (2x dmg + splash)
   * and melts Snow Pea ice peas back into standard peas.
   */
  plantTorchwood(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const torchwoodCost = getCrazyDaveSetting(cfg, 'torchwoodCost');
    if (this.sunCount < torchwoodCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${torchwoodCost}☀️!`, '#EF4444');
      return false;
    }
    this.activeTorchwoods = (this.activeTorchwoods || []).filter(t => t && t.hp > 0);
    const maxActiveTorchwoods = getCrazyDaveSetting(cfg, 'maxActiveTorchwoods') || 2;
    if (this.activeTorchwoods.length >= maxActiveTorchwoods) {
      spawnFloatingText(this.x, this.y - 25, `Max ${maxActiveTorchwoods} Torchwoods active!`, '#EF4444');
      return false;
    }

    const arena = (state && state.arena) ? state.arena : CONFIG.arena;
    const plantSpawnOffset = getCrazyDaveSetting(cfg, 'plantSpawnOffset');
    const rawX = this.x + Math.cos(this.gunAngle || 0) * plantSpawnOffset;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * plantSpawnOffset;
    const tileCenter = getAvailableCrazyDavePlantTile(this, rawX, rawY, arena);
    if (!tileCenter) {
      spawnFloatingText(this.x, this.y - 25, 'No open grass tile!', '#EF4444');
      return false;
    }
    this.sunCount -= torchwoodCost;
    this.torchwoodCooldown = getCrazyDaveSetting(cfg, 'torchwoodCooldown');

    // Compute committed 1-direction facing (Left = -1, Right = +1)
    let facingDirection = 1;
    let targetEnemy = (opponent && opponent.hp > 0 && opponent !== this) ? opponent : null;
    if (!targetEnemy && state && Array.isArray(state.fighters)) {
      let closestDist = Infinity;
      for (const f of state.fighters) {
        if (f && f !== this && !f.isDeployable && !f.isMinion && f.hp > 0 && !f.dead) {
          const d = Math.hypot(f.x - tileCenter.x, f.y - tileCenter.y);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = f;
          }
        }
      }
    }
    if (targetEnemy) {
      facingDirection = (targetEnemy.x < tileCenter.x) ? -1 : 1;
    } else if (this.gunAngle !== undefined) {
      facingDirection = (Math.abs(this.gunAngle) > Math.PI / 2) ? -1 : 1;
    } else {
      const arenaMidX = arena.x + arena.width / 2;
      facingDirection = (tileCenter.x > arenaMidX) ? -1 : 1;
    }

    const torchwood = new TorchwoodEntity(tileCenter.x, tileCenter.y, this, facingDirection);
    this.activeTorchwoods.push(torchwood);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(torchwood)) {
      state.fighters.push(torchwood);
    }

    spawnFloatingText(this.x, this.y - 25, `-${torchwoodCost} ☀️ Torchwood!`, getCrazyDaveSetting(cfg, 'torchwoodColor') || '#F97316');
    playDavePlantingAudio(cfg);

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'torchwood';
    const plantingDuration = getCrazyDaveSetting(cfg, 'plantingDuration');
    this.plantingPauseTimer = plantingDuration;
    this.plantingAnimTimer = plantingDuration;
    this.plantingAnimDuration = plantingDuration;
    this.shovelSwingTimer = plantingDuration;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    return true;
  }

  /**
   * Plant Ability 5: Potato Mine (Costs 75 ☀️) — Proximity Explosive Trap
   * Plants a Potato Mine on the nearest available grass tile. Arms after a delay, then detonates
   * when an enemy fighter enters its trigger radius, dealing massive AOE damage. Single use.
   */
  plantPotatoMine(opponent) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    const mineCost = getCrazyDaveSetting(cfg, 'potatoMineCost');
    if (this.sunCount < mineCost) {
      spawnFloatingText(this.x, this.y - 25, `Need ${mineCost}☀️!`, '#EF4444');
      return false;
    }
    this.activePotatoMines = (this.activePotatoMines || []).filter(m => m && m.hp > 0 && !m.hasDetonated);
    const maxActiveMines = getCrazyDaveSetting(cfg, 'maxActivePotatoMines') || 2;
    if (this.activePotatoMines.length >= maxActiveMines) {
      spawnFloatingText(this.x, this.y - 25, `Max ${maxActiveMines} Potato Mines!`, '#EF4444');
      return false;
    }

    const arena = (state && state.arena) ? state.arena : CONFIG.arena;
    const plantSpawnOffset = getCrazyDaveSetting(cfg, 'plantSpawnOffset');
    const rawX = this.x + Math.cos(this.gunAngle || 0) * plantSpawnOffset;
    const rawY = this.y + Math.sin(this.gunAngle || 0) * plantSpawnOffset;
    const tileCenter = getAvailableCrazyDavePlantTile(this, rawX, rawY, arena);
    if (!tileCenter) {
      spawnFloatingText(this.x, this.y - 25, 'No open grass tile!', '#EF4444');
      return false;
    }
    this.sunCount -= mineCost;
    this.potatoMineCooldown = getCrazyDaveSetting(cfg, 'potatoMineCooldown');

    const mine = new PotatoMineEntity(tileCenter.x, tileCenter.y, this);
    this.activePotatoMines.push(mine);

    if (state && Array.isArray(state.fighters) && !state.fighters.includes(mine)) {
      state.fighters.push(mine);
    }

    spawnFloatingText(this.x, this.y - 25, `-${mineCost} ☀️ Potato Mine!`, getCrazyDaveSetting(cfg, 'potatoMineColor') || '#A16207');
    playDavePlantingAudio(cfg);

    // Stop Dave's movement momentarily upon planting and play shovel dig animation
    this.lastPlantedType = 'potatoMine';
    const plantingDuration = getCrazyDaveSetting(cfg, 'plantingDuration');
    this.plantingPauseTimer = plantingDuration;
    this.plantingAnimTimer = plantingDuration;
    this.plantingAnimDuration = plantingDuration;
    this.shovelSwingTimer = plantingDuration;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    return true;
  }

  _updateSunDrops(arena, cfg) {
    if (!cfg) {
      cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;
    }

    // 1. Ambient Sun Falling from the Sky
    this.ambientSunTimer++;
    if (this.ambientSunTimer >= this.ambientSunInterval) {
      this.ambientSunTimer = 0;
      const tile = getRandomGrassTileCenter(arena);
      const sunVal = this.sunPickupValue ?? getCrazyDaveSetting(cfg, 'sunPickupValue');
      this.spawnSunDrop(tile.x, tile.y, sunVal);
    }

    // 2. Sun Drops Physics & Teammate Magnetic Pickup Loop
    const magnetRadius = getCrazyDaveSetting(cfg, 'sunAttractionRadius');
    const magnetSpeed = getCrazyDaveSetting(cfg, 'sunAttractionSpeed');
    const teammateDaves = getTeammateCrazyDaves(this);

    for (let i = this.suns.length - 1; i >= 0; i--) {
      const sun = this.suns[i];
      sun.life--;
      if (sun.life <= 0) {
        this.suns.splice(i, 1);
        continue;
      }

      sun.rotAngle += 0.03;

      // Find closest living teammate Dave for magnetic attraction and pickup
      let closestDave = this;
      let closestDist = Math.hypot(this.x - sun.x, this.y - sun.y);
      let collectingDave = null;

      for (const tDave of teammateDaves) {
        const d = Math.hypot(tDave.x - sun.x, tDave.y - sun.y);
        if (d < closestDist) {
          closestDist = d;
          closestDave = tDave;
        }
        if (d < (tDave.r + sun.r + 8)) {
          collectingDave = tDave;
        }
      }

      const dx = closestDave.x - sun.x;
      const dy = closestDave.y - sun.y;
      const dist = closestDist;

      // Magnetic Attraction (pulls toward closest teammate Dave and interrupts landing descent)
      if (dist < magnetRadius && dist > 0.001) {
        sun.isLanding = false;
        const pull = (1.0 - dist / magnetRadius) * magnetSpeed;
        sun.vx = (sun.vx || 0) * 0.92 + (dx / dist) * pull;
        sun.vy = (sun.vy || 0) * 0.92 + (dy / dist) * pull;
        sun.x += sun.vx;
        sun.y += sun.vy;
      } else if (sun.isLanding) {
        // Falling down from the sky outside the top of the arena
        sun.y += sun.vy ?? getCrazyDaveSetting(cfg, 'sunFallSpeed');
        sun.x = sun.targetX;
        if (sun.y >= sun.targetY) {
          sun.y = sun.targetY;
          sun.vy = 0;
          sun.vx = 0;
          sun.isLanding = false;
        }
      } else {
        // Settled on grass tile center
        sun.x = sun.targetX;
        sun.y = sun.targetY;
        sun.vx = 0;
        sun.vy = 0;
      }

      // Pickup Collision by ANY living teammate Dave
      if (collectingDave || dist < (closestDave.r + sun.r + 8)) {
        const pickupVal = sun.value ?? this.sunPickupValue ?? getCrazyDaveSetting(cfg, 'sunPickupValue');
        const maxSun = getCrazyDaveSetting(cfg, 'maxSun');

        // Award Sun to ALL teammate Daves on the team so they can collaboratively power flora skills
        for (const tDave of teammateDaves) {
          tDave.sunCount = Math.min(maxSun, (tDave.sunCount || 0) + pickupVal);
          spawnFloatingText(tDave.x, tDave.y - 20, `+${pickupVal} ☀️`, '#FEF08A');
        }

        spawnSparks(sun.x, sun.y, 8, '#FACC15');
        if (audioSystem && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX(getCrazyDaveSound(cfg, 'sunPickup'), getCrazyDaveSoundVolume(cfg, 'sunPickup'));
        } else if (audioSystem && typeof audioSystem.playSound === 'function') {
          audioSystem.playSound(getCrazyDaveSound(cfg, 'sunPickup'), getCrazyDaveSoundVolume(cfg, 'sunPickup'));
        }
        this.suns.splice(i, 1);
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.crazydave) ? CONFIG.crazydave : crazyDaveConfig;

    // Environmental lawnmowers initialization at match start / round start
    if (!this.lawnmowersInitialized) {
      this.initLawnmowers(arena);
    }

    // Environmental sun drops physics & ambient falling loop MUST update even if Dave is frozen or CC'd
    this._updateSunDrops(arena, cfg);

    // 1. Freeze / Time-Stop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // Enforce strictly zero angular rotation and update horizontal facing direction
    this.angle = 0;
    if (Math.abs(this.vx) > 0.3) {
      this.facingLeft = this.vx < 0;
      this.gunAngle = this.facingLeft ? Math.PI : 0;
    } else if (opponent && opponent.x !== undefined && opponent.hp > 0) {
      this.facingLeft = opponent.x < this.x;
      this.gunAngle = this.facingLeft ? Math.PI : 0;
    }
    this.shootCooldown = 999999;

    // Shovel planting animation timer & dirt particle puff
    if (this.plantingAnimTimer > 0) {
      this.plantingAnimTimer--;
      this.shovelSwingTimer = this.plantingAnimTimer;
      if (this.plantingAnimTimer === 10) {
        // Shovel scoops dirt: spawn small soil particles
        const dirtX = this.x + (this.facingLeft ? -this.r * 1.2 : this.r * 1.2);
        const dirtY = this.y + this.r * 0.55;
        spawnSparks(dirtX, dirtY, 4, '#15803D');
        spawnSparks(dirtX, dirtY, 4, '#78350F');
      }
    }

    // Cooldown updates
    if (this.wallnutCooldown > 0) this.wallnutCooldown--;
    if (this.peashooterCooldown > 0) this.peashooterCooldown--;
    if (this.snowPeaCooldown > 0) this.snowPeaCooldown--;
    if (this.torchwoodCooldown > 0) this.torchwoodCooldown--;
    if (this.potatoMineCooldown > 0) this.potatoMineCooldown--;

    // Planting Pause: stop Dave's movement for a moment when planting
    if (this.plantingPauseTimer > 0) {
      this.plantingPauseTimer--;
      this.vx = 0;
      this.vy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.resolveWallBounce(arena, opponent);
      return;
    }

    // 4. AI Planting Decisions (Balanced Barrier Defense & Flora Arsenal Standard)
    if (opponent && opponent.hp > 0) {
      const wallnutCost = getCrazyDaveSetting(cfg, 'wallnutCost');
      const peashooterCost = getCrazyDaveSetting(cfg, 'peashooterCost');
      const snowPeaCost = getCrazyDaveSetting(cfg, 'snowPeaCost');
      const torchwoodCost = getCrazyDaveSetting(cfg, 'torchwoodCost');
      const potatoMineCost = getCrazyDaveSetting(cfg, 'potatoMineCost');
      const wallnutEnabled = isSkillEnabled(cfg.enableWallnut, true);
      const peashooterEnabled = isSkillEnabled(cfg.enablePeashooter, true);
      const snowPeaEnabled = isSkillEnabled(cfg.enableSnowPea, true);
      const torchwoodEnabled = isSkillEnabled(cfg.enableTorchwood, true);
      const potatoMineEnabled = isSkillEnabled(cfg.enablePotatoMine, true);

      const livingWallnuts = (this.activeWallnuts || []).filter(w => w && w.hp > 0);
      const livingTorchwoods = (this.activeTorchwoods || []).filter(t => t && t.hp > 0);
      const livingMines = (this.activePotatoMines || []).filter(m => m && m.hp > 0 && !m.hasDetonated);
      const activePeas = (this.activePeashooters || []).filter(p => p && p.hp > 0).length;
      const activeSnow = (this.activeSnowPeas || []).filter(s => s && s.hp > 0).length;
      const maxActiveWallnuts = getCrazyDaveSetting(cfg, 'maxActiveWallnuts') || 2;
      const maxActiveTorchwoods = getCrazyDaveSetting(cfg, 'maxActiveTorchwoods') || 2;
      const maxActiveMines = getCrazyDaveSetting(cfg, 'maxActivePotatoMines') || 2;

      let chooseType = null;

      // 1. Establish/replenish Wall-nut barrier if none exists or if existing wallnut is heavily cracked (<30% HP)
      const needsWallnut = wallnutEnabled && livingWallnuts.length < maxActiveWallnuts && this.wallnutCooldown <= 0 && this.sunCount >= wallnutCost && (livingWallnuts.length === 0 || livingWallnuts.every(w => w.hp < w.maxHp * 0.3));

      // 2. Deploy Torchwood if Peashooters are active and firing, and no Torchwood is currently deployed
      const needsTorchwood = torchwoodEnabled && livingTorchwoods.length < maxActiveTorchwoods && this.torchwoodCooldown <= 0 && this.sunCount >= torchwoodCost && activePeas >= 1;

      // 3. Plant Potato Mine as proximity trap when shooters are on cooldown or when area denial is needed
      const canPlantPeashooter = peashooterEnabled && this.peashooterCooldown <= 0 && this.sunCount >= peashooterCost;
      const canPlantSnowPea = snowPeaEnabled && this.snowPeaCooldown <= 0 && this.sunCount >= snowPeaCost;
      const distToEnemy = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const needsPotatoMine = potatoMineEnabled && livingMines.length < maxActiveMines && this.potatoMineCooldown <= 0 && this.sunCount >= potatoMineCost && (
        (!canPlantPeashooter && !canPlantSnowPea) ||
        (activePeas >= 1 && activeSnow >= 1 && distToEnemy < 160 && this.lastPlantedType !== 'potatoMine')
      );

      if (needsWallnut) {
        chooseType = 'wallnut';
      } else if (needsTorchwood) {
        chooseType = 'torchwood';
      } else if (canPlantPeashooter && canPlantSnowPea) {
        // Both flora skills enabled and ready: Ensure Dave alternates selections to balance field
        if (activePeas > activeSnow) {
          chooseType = 'snowpea';
        } else if (activeSnow > activePeas) {
          chooseType = 'peashooter';
        } else {
          chooseType = (this.lastPlantedType === 'peashooter') ? 'snowpea' : 'peashooter';
        }
      } else if (canPlantPeashooter) {
        chooseType = 'peashooter';
      } else if (canPlantSnowPea) {
        chooseType = 'snowpea';
      } else if (needsPotatoMine) {
        // Potato Mine: Proximity trap deployed when shooters are on cooldown or under close pressure
        chooseType = 'potatoMine';
      }

      // Execute planting for chosen plant
      if (chooseType === 'wallnut') {
        if (this.wallnutCooldown <= 0 && this.sunCount >= wallnutCost) {
          this.plantWallnut(opponent);
        }
      } else if (chooseType === 'potatoMine') {
        if (this.potatoMineCooldown <= 0 && this.sunCount >= potatoMineCost) {
          this.plantPotatoMine(opponent);
        }
      } else if (chooseType === 'torchwood') {
        if (this.torchwoodCooldown <= 0 && this.sunCount >= torchwoodCost) {
          this.plantTorchwood(opponent);
        }
      } else if (chooseType === 'snowpea') {
        if (this.snowPeaCooldown <= 0 && this.sunCount >= snowPeaCost) {
          this.plantSnowPea(opponent);
        }
      } else if (chooseType === 'peashooter') {
        if (this.peashooterCooldown <= 0 && this.sunCount >= peashooterCost) {
          this.plantPeashooter(opponent);
        }
      }
    }

    // 5. Centralized Movement & Physics Standard (Rule 1.2)
    super.update(opponent, ownerIndex, arena);
  }

  /**
   * Main Draw method for Crazy Dave.
   */
  draw(ctx) {
    // 1. Draw Active Sun Drops in World Space
    if (Array.isArray(this.suns) && this.suns.length > 0) {
      this.suns.forEach(sun => {
        drawSunDrop(ctx, sun);
      });
    }

    // 2. Draw Lawnmowers if not present in state.fighters (e.g. preview / tests)
    if (this.lawnmowers && (!state || !state.fighters || !state.fighters.includes(this.lawnmowers[0]))) {
      this.lawnmowers.forEach(m => {
        if (m && m.state !== 'despawned') m.draw(ctx);
      });
    }

    // 3. Draw Dave's Body, Pot & Overhead Sun Pill
    drawCrazyDaveSkin(ctx, this);
    this.drawHealth(ctx);
  }
}
