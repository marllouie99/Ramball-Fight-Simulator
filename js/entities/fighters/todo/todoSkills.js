import { CONFIG } from '../../../core/config.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { playSkillEffectSound } from '../../../soundEffects/skillEffectSounds.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnImpactFlash, spawnMeleeClashShockwave, spawnSparks, spawnBoogieWoogieSwapEffect, spawnTodoClapCEParticles } from '../../../graphics/particles/sparkEffect.js';

export function playTodoRockCounterVoiceline(fighter) {
  if (!fighter) return;
  const chance = (typeof CONFIG.todo?.comboVoiceChance === 'number') ? CONFIG.todo.comboVoiceChance : 0.5;
  if (Math.random() < chance) {
    const list = CONFIG.todo?.comboVoiceSounds || [
      'Assets/Sound Effects/Skills/todo-combo-voiceline.mp3',
      'Assets/Sound Effects/Skills/todo-combo-voiceline2.mp3'
    ];
    if (list && list.length > 0) {
      const selected = list[Math.floor(Math.random() * list.length)];
      const vol = (typeof CONFIG.todo?.comboVoiceVolume === 'number') ? CONFIG.todo.comboVoiceVolume : 2.8;
      audioSystem.playFighterVoiceline(fighter, selected, vol);
    }
  }
}

export function getClapCooldown(fighter) {
  const baseCd = CONFIG.todo?.clapCooldown || 120;
  if (fighter && fighter.isTakadaUltActive) {
    const mult = CONFIG.todo?.takadaClapCooldownMult ?? 0.5;
    return Math.round(baseCd * mult);
  }
  return baseCd;
}

export function modUpdateBoogieWoogie(targets) {
  if (this.isTakadaChanneling) return;
  if (this.boogieWoogieCooldown > 0 || this.clapWindupTimer > 0 || this.clapHoldTimer > 0 || (this.rockCounterComboLeft || 0) > 0) return;

  // 1. If cursed rocks are active, swap with the rock anytime cooldown is up!
  if (this.cursedRocks && this.cursedRocks.length > 0) {
    const rock = this.cursedRocks[0];
    this.clapAnimTimer = 20;
    this.clapWindupTimer = 7;
    this.boogieWoogieCooldown = getClapCooldown(this);
    this.pendingSwapData = { type: 'rock', rock };
    return;
  }

  // 2. Otherwise swap with potential target
  let potentialTargets = targets && targets.length > 0 ? targets : state.fighters.filter(f => f.id !== this.id && !f.isDead);

  let swapTarget = null;
  if (potentialTargets.length > 0) {
    let closestDist = Infinity;
    for (const pTarget of potentialTargets) {
      const d = Math.hypot(pTarget.x - this.x, pTarget.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        swapTarget = pTarget;
      }
    }
  }

  // Queue clap windup: hands close together in advance frames before teleporting!
  this.clapAnimTimer = 20;
  this.clapWindupTimer = 7;

  if (swapTarget) {
    this.pendingSwapData = { type: 'boogie', swapTarget, potentialTargets };
    this.boogieWoogieCooldown = getClapCooldown(this);
  } else {
    // Fake clap! (Mind game)
    this.pendingSwapData = { type: 'fake' };
    this.boogieWoogieCooldown = Math.round(getClapCooldown(this) / 2);
  }
}

export function hasLiveTeammate(fighter) {
  if (!state || !state.fighters) return false;
  const myIndex = state.fighters.indexOf(fighter);
  if (myIndex < 0) {
    if (fighter.team !== undefined) {
      return state.fighters.some(other => other && other !== fighter && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && other.team === fighter.team);
    }
    return false;
  }
  const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;
  if (myTeam !== null && myTeam !== undefined) {
    return state.fighters.some((other, idx) => idx !== myIndex && other && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && state.getFighterTeam(idx) === myTeam);
  }
  if (fighter.team !== undefined) {
    return state.fighters.some(other => other && other !== fighter && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && other.team === fighter.team);
  }
  return false;
}

export function modThrowCursedRock(target) {
  // Prevent throwing rocks while executing counter combo flurry
  if ((this.rockCounterComboLeft || 0) > 0) return;
  // Only 1 active rock allowed at a time
  if (this.cursedRocks && this.cursedRocks.length >= (CONFIG.todo?.maxRocks || 1)) return;

  // Angle
  let angle = this.gunAngle;
  if (target) {
    angle = Math.atan2(target.y - this.y, target.x - this.x);
  } else if (this.playerControlled && state.mouseX !== undefined) {
     angle = Math.atan2(state.mouseY - this.y, state.mouseX - this.x);
  }

  const speed = CONFIG.todo?.rockSpeed || 12;
  const rad = 8;
  let spawnX = this.x + Math.cos(angle) * this.r;
  let spawnY = this.y + Math.sin(angle) * this.r;

  const arena = CONFIG.arena;
  if (arena) {
    const wallW = arena.wallWidth || 4;
    spawnX = Math.max(arena.x + wallW + rad, Math.min(arena.x + arena.width - wallW - rad, spawnX));
    spawnY = Math.max(arena.y + wallW + rad, Math.min(arena.y + arena.height - wallW - rad, spawnY));
  }

  const newRock = {
    x: spawnX,
    y: spawnY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: CONFIG.todo?.rockLife || 240,
    radius: rad,
    isRock: true,
    hasTriggeredTeleport: false
  };

  this.cursedRocks.push(newRock);
  this.rockThrowCooldown = this.rockThrowCooldownMax;
}

export function modUpdateCursedRocks(targets) {
  if (!this.cursedRocks || this.cursedRocks.length === 0) return;

  const enemies = targets && targets.length > 0
    ? targets
    : (typeof state !== 'undefined' && state.fighters ? state.fighters.filter(f => f && f.id !== this.id && !f.isDead && f.hp > 0) : []);

  const rockProximityTriggerDist = CONFIG.todo?.rockProximityTriggerDist || 75;
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;

  for (let i = this.cursedRocks.length - 1; i >= 0; i--) {
    let rock = this.cursedRocks[i];
    if (!rock) continue;

    // Rock continuously travels along its velocity vector
    rock.x += rock.vx;
    rock.y += rock.vy;
    rock.life--;

    // Bounce off arena walls (supports both circular and rectangular arenas)
    if (arena) {
      if (arena.shape === 'circle') {
        const cx = arena.x + arena.width / 2;
        const cy = arena.y + arena.height / 2;
        const radius = (arena.radius || (arena.width / 2)) - (rock.radius || 10);
        const dx = rock.x - cx;
        const dy = rock.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > radius) {
          const nx = dx / dist;
          const ny = dy / dist;
          const dot = rock.vx * nx + rock.vy * ny;
          if (dot > 0) {
            rock.vx -= 2 * dot * nx;
            rock.vy -= 2 * dot * ny;
          }
          rock.x = cx + nx * radius;
          rock.y = cy + ny * radius;
        }
      } else {
        const wallW = arena.wallWidth || 10;
        const rR = rock.radius || 10;
        if (rock.x - rR < arena.x + wallW) {
          rock.x = arena.x + wallW + rR;
          rock.vx = Math.abs(rock.vx);
        } else if (rock.x + rR > arena.x + arena.width - wallW) {
          rock.x = arena.x + arena.width - wallW - rR;
          rock.vx = -Math.abs(rock.vx);
        }
        if (rock.y - rR < arena.y + wallW) {
          rock.y = arena.y + wallW + rR;
          rock.vy = Math.abs(rock.vy);
        } else if (rock.y + rR > arena.y + arena.height - wallW) {
          rock.y = arena.y + arena.height - wallW - rR;
          rock.vy = -Math.abs(rock.vy);
        }
      }
    }

    // Proximity trigger check for Boogie Woogie swap (only if Todo is alive and able to act and rock counter cooldown is ready)
    const isFrozen = (typeof this._handleTimeStop === 'function') ? this._handleTimeStop() : false;
    const canSwap = !this.isDead && this.hp > 0 && !this.isDemoFighter && (this.rockCounterComboLeft || 0) <= 0 && (this.rockCounterCooldown || 0) <= 0 && !rock.hasTriggeredTeleport && !this.clapWindupTimer && !this.clapHoldTimer && !isFrozen && !this.isParalyzed && !this.isTakadaChanneling;

    if (canSwap) {
      for (const enemy of enemies) {
        const distToEnemy = Math.hypot(rock.x - enemy.x, rock.y - enemy.y);
        if (distToEnemy <= rockProximityTriggerDist) {
          rock.hasTriggeredTeleport = true; // Mark so rock doesn't re-trigger continuously

          // Advance windup frames: hands slam together before teleport!
          this.clapAnimTimer = 20;
          this.clapWindupTimer = 7;
          this.boogieWoogieCooldown = getClapCooldown(this);
          this.pendingSwapData = { type: 'rock', rock, enemy };
          break;
        }
      }
    }

    if (rock.life <= 0) {
      this.cursedRocks.splice(i, 1);
    }
  }
}

export function modRepositionDisengage(target) {
  // Self swap disengage escape disabled as requested
  return;
}

/**
 * Applies a global attack reaction delay to all enemies when Todo or his partner swaps.
 */
export function applyBoogieDisorientation(todoFighter) {
  if (!state || !state.fighters) return;
  const myIdx = state.fighters.indexOf(todoFighter);
  const myTeam = (state.getFighterTeam && myIdx >= 0) ? state.getFighterTeam(myIdx) : todoFighter.team;
  const disorientFrames = CONFIG.todo?.swapDisorientationFrames ?? 20;

  // Process fighters first (use loop index for team check — no indexOf needed)
  for (let fi = 0; fi < state.fighters.length; fi++) {
    const enemy = state.fighters[fi];
    if (!enemy || enemy === todoFighter || enemy.hp <= 0) continue;
    const isTeammate = (state.getFighterTeam && myIdx >= 0)
      ? (state.getFighterTeam(fi) === myTeam)
      : (enemy.team === todoFighter.team);
    if (isTeammate) continue;

    if ('shootCooldown' in enemy) enemy.shootCooldown = Math.max(enemy.shootCooldown || 0, disorientFrames);
    if ('cooldown' in enemy) enemy.cooldown = Math.max(enemy.cooldown || 0, disorientFrames);
    if ('cooldownTimer' in enemy) enemy.cooldownTimer = Math.max(enemy.cooldownTimer || 0, disorientFrames);
    if ('meleePunchCooldown' in enemy) enemy.meleePunchCooldown = Math.max(enemy.meleePunchCooldown || 0, disorientFrames);
    if ('swordCooldown' in enemy) enemy.swordCooldown = Math.max(enemy.swordCooldown || 0, disorientFrames);
    if ('attackCooldown' in enemy) enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, disorientFrames);
  }

  // Process illusions separately (derive team from owner — no indexOf on illusions)
  if (state.illusions) {
    for (let ii = 0; ii < state.illusions.length; ii++) {
      const enemy = state.illusions[ii];
      if (!enemy || enemy === todoFighter || enemy.hp <= 0) continue;
      // Check if illusion's owner is a teammate
      if (enemy.owner && myTeam !== null && myTeam !== undefined) {
        const ownerIdx = state.fighters.indexOf(enemy.owner);
        const ownerTeam = (state.getFighterTeam && ownerIdx >= 0) ? state.getFighterTeam(ownerIdx) : enemy.owner.team;
        if (ownerTeam === myTeam) continue;
      }

      if ('shootCooldown' in enemy) enemy.shootCooldown = Math.max(enemy.shootCooldown || 0, disorientFrames);
      if ('cooldown' in enemy) enemy.cooldown = Math.max(enemy.cooldown || 0, disorientFrames);
      if ('cooldownTimer' in enemy) enemy.cooldownTimer = Math.max(enemy.cooldownTimer || 0, disorientFrames);
      if ('meleePunchCooldown' in enemy) enemy.meleePunchCooldown = Math.max(enemy.meleePunchCooldown || 0, disorientFrames);
      if ('swordCooldown' in enemy) enemy.swordCooldown = Math.max(enemy.swordCooldown || 0, disorientFrames);
      if ('attackCooldown' in enemy) enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, disorientFrames);
    }
  }
}

/**
 * Grants an evasion buff against basic attacks to Todo and his active teammate when swapping via Boogie Woogie.
 */
export function applyBoogieEvadeBuff(todoFighter) {
  if (!state || !state.fighters) return;
  const myIdx = state.fighters.indexOf(todoFighter);
  const myTeam = (state.getFighterTeam && myIdx >= 0) ? state.getFighterTeam(myIdx) : todoFighter.team;
  const duration = CONFIG.todo?.evadeBuffDurationFrames ?? 75; // ~1.25s
  const chance = CONFIG.todo?.evadeChance ?? 0.60;

  // Apply to Todo
  todoFighter.evadeBuffTimer = Math.max(todoFighter.evadeBuffTimer || 0, duration);
  todoFighter.evadeChance = chance;
  spawnSparks(todoFighter.x, todoFighter.y, 8, 'lightningTrail', '#00E5FF');

  // Apply to living teammates
  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (!f || f === todoFighter || f.hp <= 0) continue;
    const isTeammate = (state.getFighterTeam && myIdx >= 0)
      ? (state.getFighterTeam(i) === myTeam)
      : (f.team === todoFighter.team);
    if (isTeammate) {
      f.evadeBuffTimer = Math.max(f.evadeBuffTimer || 0, duration);
      f.evadeChance = chance;
      spawnSparks(f.x, f.y, 8, 'lightningTrail', '#00E5FF');
    }
  }
}

export function modExecutePendingSwap() {
  if (!this.pendingSwapData) return;
  const data = this.pendingSwapData;
  this.pendingSwapData = null;

  // CLAP SOUND & VISUAL EFFECT! Triggered at hands collision point
  let clapAudioHandle = null;
  if (CONFIG.todo?.clapSound) {
    clapAudioHandle = audioSystem.playSFX(CONFIG.todo.clapSound, CONFIG.todo.clapVolume ?? 2.0);
  } else {
    clapAudioHandle = playSkillEffectSound('todo', 'clap');
  }

  // Smooth fade-out effect on the clap audio tail
  const fadeMs = CONFIG.todo?.clapFadeDurationMs ?? 400;
  if (clapAudioHandle && fadeMs > 0) {
    setTimeout(() => {
      audioSystem.fadeOutSFX(clapAudioHandle, fadeMs);
    }, 100);
  }

  spawnMeleeClashShockwave(this.x, this.y, 90, 'todo');
  spawnSparks(this.x, this.y, 16, 'lightningTrail', '#00E5FF');
  spawnImpactFlash(this.x, this.y, 35, '#00E5FF');
  spawnTodoClapCEParticles(this.x, this.y, this.gunAngle || 0);

  const vanishFrames = CONFIG.todo?.vanishDurationFrames ?? 3;

  if (data.type === 'fake') {
    this.vanishTimer = vanishFrames;
    return;
  }

  if (data.type === 'boogie') {
    const swapTarget = data.swapTarget;
    if (swapTarget && (swapTarget.hp > 0 || swapTarget.isRock)) {
      const oldTodoX = this.x;
      const oldTodoY = this.y;
      const oldTargetX = swapTarget.x;
      const oldTargetY = swapTarget.y;

      spawnMeleeClashShockwave(oldTargetX, oldTargetY, 80, 'todo');
      spawnSparks(oldTargetX, oldTargetY, 12, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(oldTodoX, oldTodoY, 15, '#4da3ff');
      spawnImpactFlash(oldTargetX, oldTargetY, 15, '#4da3ff');
      spawnTodoClapCEParticles(oldTargetX, oldTargetY, 0);

      this.x = oldTargetX;
      this.y = oldTargetY;
      swapTarget.x = oldTodoX;
      swapTarget.y = oldTodoY;

      // Flash vanish delay where both entities become invisible during swap
      this.vanishTimer = vanishFrames;
      if (swapTarget.characterId || !swapTarget.isRock) {
        swapTarget.vanishTimer = vanishFrames;
      }

      // Trigger full Boogie Woogie Swap Visual Beam between original positions
      spawnBoogieWoogieSwapEffect(oldTodoX, oldTodoY, oldTargetX, oldTargetY);

      const arena = CONFIG.arena;
      if (arena) {
        const wallW = arena.wallWidth || 4;
        const myR = this.r || 25;
        this.x = Math.max(arena.x + wallW + myR, Math.min(arena.x + arena.width - wallW - myR, this.x));
        this.y = Math.max(arena.y + wallW + myR, Math.min(arena.y + arena.height - wallW - myR, this.y));
      }

      if (swapTarget.characterId) {
        this.aim(swapTarget);
      } else if (data.potentialTargets && data.potentialTargets.length > 0) {
        this.aim(data.potentialTargets[0]);
      }

      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      // Apply global attack reaction delay to enemies
      applyBoogieDisorientation(this);
      // Apply evasion buff to Todo and active teammate
      applyBoogieEvadeBuff(this);
    }
  } else if (data.type === 'rescueTeammate') {
    const teammate = data.swapTarget;
    if (teammate && teammate.hp > 0) {
      const distToTeammate = Math.hypot(this.x - teammate.x, this.y - teammate.y);
      const minSwapDist = CONFIG.todo?.minTeammateSwapDistance || 120;
      if (distToTeammate < minSwapDist) return;

      const oldTodoX = this.x;
      const oldTodoY = this.y;
      const oldTeamX = teammate.x;
      const oldTeamY = teammate.y;

      this.x = oldTeamX;
      this.y = oldTeamY;
      teammate.x = oldTodoX;
      teammate.y = oldTodoY;

      // Flash vanish delay where both Todo and partner become invisible during rescue swap
      this.vanishTimer = vanishFrames;
      teammate.vanishTimer = vanishFrames;

      // Spawn Expanding Boogie Woogie Shockwave Rings at BOTH swap positions!
      spawnMeleeClashShockwave(oldTodoX, oldTodoY, 130, 'todo');
      spawnMeleeClashShockwave(oldTeamX, oldTeamY, 130, 'todo');
      spawnMeleeClashShockwave(oldTeamX, oldTeamY, 165, 'gojo'); // Partner rescue protection ring

      spawnSparks(oldTodoX, oldTodoY, 18, 'lightningTrail', '#00E5FF');
      spawnSparks(oldTeamX, oldTeamY, 18, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(oldTodoX, oldTodoY, 40, '#00E5FF');
      spawnImpactFlash(oldTeamX, oldTeamY, 40, '#00E5FF');
      spawnTodoClapCEParticles(oldTeamX, oldTeamY, 0);

      // Trigger full Boogie Woogie Swap Visual Beam between original positions!
      spawnBoogieWoogieSwapEffect(oldTodoX, oldTodoY, oldTeamX, oldTeamY);

      const arena = CONFIG.arena;
      if (arena) {
        const wallW = arena.wallWidth || 4;
        const myR = this.r || 25;
        this.x = Math.max(arena.x + wallW + myR, Math.min(arena.x + arena.width - wallW - myR, this.x));
        this.y = Math.max(arena.y + wallW + myR, Math.min(arena.y + arena.height - wallW - myR, this.y));
        const teamR = teammate.r || 25;
        teammate.x = Math.max(arena.x + wallW + teamR, Math.min(arena.x + arena.width - wallW - teamR, teammate.x));
        teammate.y = Math.max(arena.y + wallW + teamR, Math.min(arena.y + arena.height - wallW - teamR, teammate.y));
      }

      // Rescued teammate gains invulnerability buffer to survive the fatal hit!
      const invulnFrames = CONFIG.todo?.rescueInvulnerableFrames || 45;
      teammate.invulnerableTimer = Math.max(teammate.invulnerableTimer || 0, invulnFrames);

      // Aim Todo at nearest enemy to immediately step in and unleash combo flurry!
      let nearestEnemy = data.targetEnemy;
      if (!nearestEnemy || nearestEnemy.hp <= 0) {
        let minDist = Infinity;
        if (state && state.fighters) {
          const myIdx = state.fighters.indexOf(this);
          const myTeam = state.getFighterTeam ? state.getFighterTeam(myIdx) : null;
          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (f && f.hp > 0 && state.getFighterTeam(i) !== myTeam) {
              const d = Math.hypot(f.x - this.x, f.y - this.y);
              if (d < minDist) {
                minDist = d;
                nearestEnemy = f;
              }
            }
          }
        }
      }

      if (nearestEnemy) {
        this.aim(nearestEnemy);
        // Initiate Todo's Brawler Counter-Attack Flurry upon swapping in!
        const totalHits = CONFIG.todo?.rockCounterComboHits || 7;
        const interval = CONFIG.todo?.rockCounterComboInterval || 10;
        const comboTotalDuration = totalHits * interval + 10;

        // Stop movement mechanic: Zero velocity, 100% movement stop, and hit stun for entire combo duration
        nearestEnemy.vx = 0;
        nearestEnemy.vy = 0;
        if (typeof nearestEnemy.applySlow === 'function') {
          nearestEnemy.applySlow(comboTotalDuration, 0.0);
        } else {
          nearestEnemy.slowTimer = comboTotalDuration;
          nearestEnemy.slowMultiplier = 0.0;
        }
        if (typeof nearestEnemy.applyHitStun === 'function') {
          nearestEnemy.applyHitStun(comboTotalDuration);
        }

        this.rockCounterComboLeft = totalHits;
        this.rockCounterComboTarget = nearestEnemy;
        this.rockCounterComboInterval = interval;
        this.rockCounterComboTimer = 0;
        this.rockCounterCooldown = CONFIG.todo?.rockCounterCooldown || 180;
        playTodoRockCounterVoiceline(this);
      }

      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      // Apply global attack reaction delay to enemies
      applyBoogieDisorientation(this);
      // Apply evasion buff to Todo and active teammate
      applyBoogieEvadeBuff(this);
    }
  } else if (data.type === 'rock') {
    const { rock, enemy } = data;
    if (rock) {
      const oldTodoX = this.x;
      const oldTodoY = this.y;
      const oldRockX = rock.x;
      const oldRockY = rock.y;

      spawnMeleeClashShockwave(oldRockX, oldRockY, 90, 'todo');
      spawnSparks(oldRockX, oldRockY, 14, 'lightningTrail', '#00E5FF');
      spawnImpactFlash(oldTodoX, oldTodoY, 30, '#00E5FF');
      spawnImpactFlash(oldRockX, oldRockY, 35, '#00E5FF');
      spawnTodoClapCEParticles(oldRockX, oldRockY, 0);

      // Trigger full Boogie Woogie Swap Visual Beam between original positions
      spawnBoogieWoogieSwapEffect(oldTodoX, oldTodoY, oldRockX, oldRockY);

      this.vx = 0;
      this.vy = 0;

      // Swap positions
      this.x = oldRockX;
      this.y = oldRockY;
      rock.x = oldTodoX;
      rock.y = oldTodoY;

      this.vanishTimer = vanishFrames;

      const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;
      if (arena) {
        if (arena.shape === 'circle') {
          const cx = arena.x + arena.width / 2;
          const cy = arena.y + arena.height / 2;
          const radius = (arena.radius || (arena.width / 2)) - (this.r || 25);
          const dx = this.x - cx;
          const dy = this.y - cy;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > radius) {
            this.x = cx + (dx / dist) * radius;
            this.y = cy + (dy / dist) * radius;
          }
        } else {
          const wallW = arena.wallWidth || 4;
          const myR = this.r || 25;
          this.x = Math.max(arena.x + wallW + myR, Math.min(arena.x + arena.width - wallW - myR, this.x));
          this.y = Math.max(arena.y + wallW + myR, Math.min(arena.y + arena.height - wallW - myR, this.y));
        }
      }

      // Find nearest living enemy to new position if enemy wasn't provided or died
      let targetEnemy = (enemy && enemy.hp > 0 && !enemy.isDead) ? enemy : null;
      if (!targetEnemy && state && state.fighters) {
        let minDist = Infinity;
        const myIndex = state.fighters.indexOf(this);
        const myTeam = (state.getFighterTeam && myIndex >= 0) ? state.getFighterTeam(myIndex) : this.team;
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (f && f !== this && f.hp > 0 && !f.isIllusion) {
            const isTeammate = (state.getFighterTeam && myIndex >= 0)
              ? (state.getFighterTeam(i) === myTeam)
              : (f.team === this.team);
            if (isTeammate) continue;
            const d = Math.hypot(f.x - this.x, f.y - this.y);
            if (d < minDist) {
              minDist = d;
              targetEnemy = f;
            }
          }
        }
      }

      if (targetEnemy && targetEnemy.hp > 0) {
        const distToEnemy = Math.hypot(targetEnemy.x - this.x, targetEnemy.y - this.y);
        const isClose = distToEnemy <= (this.r || 25) + (targetEnemy.r || 25) + 60;

        if (isClose) {
          const isGojoInfinity = (targetEnemy.characterId === 'gojo' || targetEnemy.type === 'gojo') && (targetEnemy.infinityCooldown <= 0 || targetEnemy.infinityActive) && !targetEnemy.isMeleeMode;

          const totalHits = CONFIG.todo?.rockCounterComboHits || 4;
          const interval = CONFIG.todo?.rockCounterComboInterval || 12;
          const comboTotalDuration = totalHits * interval + 10;

          if (!isGojoInfinity) {
            // Stop movement mechanic: Zero velocity, 100% movement stop, and hit stun for entire combo duration
            targetEnemy.vx = 0;
            targetEnemy.vy = 0;

            if (typeof targetEnemy.applySlow === 'function') {
              targetEnemy.applySlow(comboTotalDuration, 0.0);
            } else {
              targetEnemy.slowTimer = comboTotalDuration;
              targetEnemy.slowMultiplier = 0.0;
            }

            if (typeof targetEnemy.applyHitStun === 'function') {
              targetEnemy.applyHitStun(comboTotalDuration);
            }

            if (typeof triggerGlobalScreenShake === 'function') {
              triggerGlobalScreenShake(CONFIG.todo?.rockArrivalScreenShake || 6.0, 8);
            }
          } else {
            if (typeof targetEnemy.triggerInfinityBlock === 'function') {
              targetEnemy.triggerInfinityBlock(this.x, this.y, this);
            }
          }

          this.rockCounterComboLeft = totalHits;
          this.rockCounterComboTarget = targetEnemy;
          this.rockCounterComboInterval = interval;
          this.rockCounterComboTimer = 0;
          this.rockCounterCooldown = CONFIG.todo?.rockCounterCooldown || 180;
          playTodoRockCounterVoiceline(this);
        }

        this.aim(targetEnemy);
      }

      this.justSwappedTimer = CONFIG.todo?.blackFlashWindow || 45;
      this.blackFlashGlowTimer = this.justSwappedTimer;

      // Apply global attack reaction delay to enemies
      applyBoogieDisorientation(this);
      // Apply evasion buff to Todo
      applyBoogieEvadeBuff(this);
    }
  } else if (data.type === 'disengage') {
    const target = data.target;
    spawnImpactFlash(this.x, this.y, 25, '#4da3ff');

    let swappedWithRock = false;
    const oldX = this.x;
    const oldY = this.y;

    if (this.cursedRocks && this.cursedRocks.length > 0) {
      let bestIndex = -1;
      let maxDist = -1;

      for (let i = 0; i < this.cursedRocks.length; i++) {
        const r = this.cursedRocks[i];
        const distToEnemy = target ? Math.hypot(r.x - target.x, r.y - target.y) : 200;
        if (distToEnemy > maxDist) {
          maxDist = distToEnemy;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        const rock = this.cursedRocks[bestIndex];
        this.x = rock.x;
        this.y = rock.y;
        this.vx = 0;
        this.vy = 0;
        this.cursedRocks.splice(bestIndex, 1);
        swappedWithRock = true;
        spawnImpactFlash(this.x, this.y, 30, '#4da3ff');
      }
    }

    if (target && !target.isDead) {
      this.aim(target);
      target.slowTimer = 0;
      target.slowMultiplier = 1.0;
      if (target.hitStunTimer !== undefined) {
        target.hitStunTimer = 0;
      }
    }

    const seqCd = CONFIG.todo?.sequenceCooldown || 180;
    this.boogieWoogieCooldown = seqCd;
    this.rockThrowCooldown = seqCd;
  }
}

/**
 * Monitors Todo's cursed rock in the arena.
 * Uses the same logic as teammate rescue: Todo can swap anytime with his active cursed rock as long as CD is up!
 */
export function modCheckRockSwap() {
  if (!state || !state.fighters) return false;
  if (this.isTakadaChanneling) return false;
  if (this.boogieWoogieCooldown > 0 || this.clapWindupTimer > 0 || this.clapHoldTimer > 0 || (this.rockCounterComboLeft || 0) > 0) return false;
  if (this.timeStopTimer > 0 || this.electricStunTimer > 0 || this.isTargetOfAmbush) return false;
  if (!this.cursedRocks || this.cursedRocks.length === 0) return false;

  const rock = this.cursedRocks[0];
  if (!rock || rock.life <= 0) return false;

  // RULE 1: Do NOT swap if Todo and the rock are extremely close to each other
  const distToRock = Math.hypot(this.x - rock.x, this.y - rock.y);
  const minSwapDist = CONFIG.todo?.minRockSwapDistance || 80;
  if (distToRock < minSwapDist) return false;

  // RULE 2: Check enemy proximity to either rock or Todo
  const myIndex = state.fighters.indexOf(this);
  const myTeam = (state.getFighterTeam && myIndex >= 0) ? state.getFighterTeam(myIndex) : this.team;

  let closestEnemyToRock = null;
  let distRockToEnemy = Infinity;
  let closestEnemyToTodo = null;
  let distTodoToEnemy = Infinity;

  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && f !== this && f.hp > 0 && !f.isIllusion) {
      const isTeammate = (state.getFighterTeam && myIndex >= 0)
        ? (state.getFighterTeam(i) === myTeam)
        : (f.team === this.team);
      if (isTeammate) continue;

      const dRock = Math.hypot(f.x - rock.x, f.y - rock.y);
      if (dRock < distRockToEnemy) {
        distRockToEnemy = dRock;
        closestEnemyToRock = f;
      }
      const dTodo = Math.hypot(f.x - this.x, f.y - this.y);
      if (dTodo < distTodoToEnemy) {
        distTodoToEnemy = dTodo;
        closestEnemyToTodo = f;
      }
    }
  }

  // Also check illusions if no fighter found
  if (!closestEnemyToRock && state.illusions) {
    for (let ill of state.illusions) {
      if (ill && ill !== this && ill.hp > 0) {
        const dRock = Math.hypot(ill.x - rock.x, ill.y - rock.y);
        if (dRock < distRockToEnemy) {
          distRockToEnemy = dRock;
          closestEnemyToRock = ill;
        }
      }
    }
  }

  const proximityThreshold = CONFIG.todo?.enemyProximitySwapDistance || 130;
  const isRockCloseToEnemy = closestEnemyToRock && (distRockToEnemy <= (closestEnemyToRock.r || 25) + proximityThreshold);
  const isTodoCloseToEnemy = closestEnemyToTodo && (distTodoToEnemy <= (this.r || 25) + proximityThreshold);

  // Todo swaps anytime the rock is near an enemy, or Todo is pressured/near an enemy, or when CD is ready with good tactical separation!
  if (isRockCloseToEnemy || isTodoCloseToEnemy || distToRock >= 130) {
    this.clapAnimTimer = 20;
    this.clapWindupTimer = 7;
    this.boogieWoogieCooldown = getClapCooldown(this);
    const targetEnemy = isRockCloseToEnemy ? closestEnemyToRock : closestEnemyToTodo;
    this.pendingSwapData = { type: 'rock', rock, enemy: targetEnemy };
    rock.hasTriggeredTeleport = true;
    return true;
  }

  return false;
}

/**
 * Monitors Todo's teammate in pair team modes (1v2, 2v2).
 * Triggers Boogie Woogie rescue swap if teammate takes >= 35 damage or HP drops to <= 30% within a 2-second window.
 */
export function modCheckTeammateRescue() {
  if (!state || !state.fighters) return false;
  if (this.isTakadaChanneling) return false;
  if (this.boogieWoogieCooldown > 0 || this.clapWindupTimer > 0 || this.clapHoldTimer > 0 || (this.rockCounterComboLeft || 0) > 0) return false;
  if (this.timeStopTimer > 0 || this.electricStunTimer > 0 || this.isTargetOfAmbush) return false;

  const myIndex = state.fighters.indexOf(this);
  if (myIndex < 0) return false;
  const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;
  if (myTeam === null || myTeam === undefined) return false;

  // Find live teammate
  let teammate = null;
  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && f !== this && f.hp > 0 && !f.isIllusion) {
      if (state.getFighterTeam(i) === myTeam) {
        teammate = f;
        break;
      }
    }
  }

  if (!teammate) return false;

  // RULE 1: Do NOT swap if Todo and his partner are in close distance to each other!
  const distToTeammate = Math.hypot(this.x - teammate.x, this.y - teammate.y);
  const minSwapDist = CONFIG.todo?.minTeammateSwapDistance || 140;
  if (distToTeammate < minSwapDist) return false;

  // RULE 2: Todo should swap whenever his partner OR him is very close distance to the enemy!
  const proximityThreshold = CONFIG.todo?.enemyProximitySwapDistance || 130;
  
  let closestEnemyToPartner = null;
  let distPartnerToEnemy = Infinity;
  let closestEnemyToTodo = null;
  let distTodoToEnemy = Infinity;

  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (f && f.hp > 0 && !f.isIllusion && state.getFighterTeam(i) !== myTeam) {
      const dPartner = Math.hypot(f.x - teammate.x, f.y - teammate.y);
      if (dPartner < distPartnerToEnemy) {
        distPartnerToEnemy = dPartner;
        closestEnemyToPartner = f;
      }
      const dTodo = Math.hypot(f.x - this.x, f.y - this.y);
      if (dTodo < distTodoToEnemy) {
        distTodoToEnemy = dTodo;
        closestEnemyToTodo = f;
      }
    }
  }

  // Check if either partner is in close distance to an enemy OR Todo is in close distance to an enemy
  const partnerCloseReach = (teammate.r || 25) + proximityThreshold;
  const todoCloseReach = (this.r || 25) + proximityThreshold;
  const isPartnerCloseToEnemy = closestEnemyToPartner && (distPartnerToEnemy <= partnerCloseReach);
  const isTodoCloseToEnemy = closestEnemyToTodo && (distTodoToEnemy <= todoCloseReach);

  // Also track emergency damage taken by partner in rolling 2-second window
  const now = Date.now();
  if (!teammate._rescueDamageHistory) {
    teammate._rescueDamageHistory = [];
  }
  if (teammate._lastRescueHp === undefined) {
    teammate._lastRescueHp = teammate.hp;
  }

  const hpLoss = teammate._lastRescueHp - teammate.hp;
  if (hpLoss > 0) {
    teammate._rescueDamageHistory.push({ time: now, damage: hpLoss });
  }
  teammate._lastRescueHp = teammate.hp;

  teammate._rescueDamageHistory = teammate._rescueDamageHistory.filter(hit => now - hit.time <= 2000);

  const damageIn2Sec = teammate._rescueDamageHistory.reduce((sum, hit) => sum + hit.damage, 0);
  const hpRatio = teammate.hp / (teammate.maxHp || 100);
  const isTakingHeavyDamage = hpLoss > 0 || damageIn2Sec >= 15 || hpRatio <= 0.45;

  // Trigger natural Boogie Woogie teammate swap when partner OR Todo is close to an enemy!
  if (isPartnerCloseToEnemy || isTodoCloseToEnemy || isTakingHeavyDamage) {
    this.clapAnimTimer = 20;
    this.clapWindupTimer = 7;
    this.boogieWoogieCooldown = getClapCooldown(this);
    const targetEnemy = isPartnerCloseToEnemy ? closestEnemyToPartner : closestEnemyToTodo;
    this.pendingSwapData = { type: 'rescueTeammate', swapTarget: teammate, targetEnemy };

    // Play Todo's "Brother!" voiceline on teammate swap based on config chance
    const brotherChance = CONFIG.todo?.brotherVoiceChance ?? 0.25;
    if (Math.random() < brotherChance) {
      const brotherSnd = CONFIG.todo?.brotherVoiceSound || 'Assets/Sound Effects/Skills/todo-brother-voiceline.mp3';
      const brotherVol = CONFIG.todo?.brotherVoiceVolume ?? 2.5;
      audioSystem.playSFX(brotherSnd, brotherVol);
    }

    teammate._rescueDamageHistory = [];
    return true;
  }

  return false;
}

/**
 * Starts Aoi Todo's 3-second (180 frames) Takada-chan Imagination channeling phase.
 * Plays his channeling voiceline and schedules the background song fade-in!
 */
export function modStartTakadaChanneling(force = false) {
  if ((this.takadaUltCooldown || 0) > 0 || this.isTakadaChanneling || this.isTakadaUltActive) return false;

  // Strict 50% HP threshold check: Cannot auto-trigger ultimate if HP is above 50%!
  const hpThreshold = CONFIG.todo?.hpThresholdUltTrigger ?? 0.50;
  const hpUltEnabled = CONFIG.todo?.enableHpThresholdUlt !== false;
  if (!force && hpUltEnabled && (this.hp / (this.maxHp || 100)) > hpThreshold) {
    return false;
  }

  const channelFrames = CONFIG.todo?.channelDuration || 180;
  this.isTakadaChanneling = true;
  this.takadaChannelTimer = channelFrames;
  this.takadaSongStarted = false;
  this.takadaSongHandle = null;
  this.takadaSongFadedOut = false;
  this.takadaUltCooldown = CONFIG.todo?.ultCooldown || 1200;
  this.pureLoveBeamRecoveryTimer = 0;
  this.hitStunTimer = 0;

  spawnImpactFlash(this.x, this.y, 45, '#ec4899');
  spawnFloatingText(this.x, this.y - (this.r || 25) - 30, "530,000 IQ CPU THINKING...", "#ec4899");

  // Play 3.0s channeling voice line
  const channelVoice = CONFIG.todo?.takadaChannelingVoiceline || 'Assets/Sound Effects/Skills/todo-tadakaimagination-voiceline.mp3';
  const voiceVol = CONFIG.todo?.takadaChannelingVoiceVolume ?? 3.5;
  audioSystem.playSFX('skill_todotadakachannelvoice', voiceVol);
  audioSystem.playSFX(channelVoice, voiceVol);

  return true;
}

/**
 * Activates Takada-chan Idol Ultimate mode after the 3-second channeling phase finishes.
 */
export function modActivateTakadaUltimate() {
  this.isTakadaChanneling = false;
  const dur = CONFIG.todo?.ultDuration ?? 5000;
  this.isTakadaUltActive = true;
  this.takadaUltTimer = dur;

  // Reduce active Skill 1 cooldown immediately upon activating ultimate
  if (this.boogieWoogieCooldown > 0) {
    this.boogieWoogieCooldown = Math.min(this.boogieWoogieCooldown, getClapCooldown(this));
  }

  spawnImpactFlash(this.x, this.y, 60, '#ec4899');
  spawnMeleeClashShockwave(this.x, this.y, 140, 'pink');
  spawnSparks(this.x, this.y, 30, 'lightningTrail', '#ff66cc');
  spawnFloatingText(this.x, this.y - (this.r || 25) - 30, "TAKADA-CHAN 530,000 IQ!", "#ec4899");
}

export function modTriggerTakadaUltimate() {
  return modStartTakadaChanneling.call(this, true);
}
