import { state, spawnFloatingText, isChampionScreenActive, triggerGlobalScreenShake } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { spawnIllusionDeath } from '../graphics/particles/illusionDeathEffect.js';
import { spawnIllusionSpawn } from '../graphics/particles/illusionSpawnEffect.js';
import { spatialGrid } from './physics.js';
import { applyDamageToTarget } from '../entities/fighter.js';
import { triggerMahitoParalyzeExplosion, applySoulDisfigurementStack } from '../entities/fighters/mahito/mahitoCombat.js';
import { spawnBloodEffect } from '../graphics/particles/bloodEffect.js';
import { spawnMahitoSoulExplosion, spawnBiteAttackEffect } from '../graphics/particles/sparkEffect.js';
import { audioSystem } from './audioSystem.js';
import { clampRikaToArena } from '../entities/fighters/yuta/rikaLogic.js';

// Minimum HP an illusion must have had to be eligible for splitting on death.
// Low threshold — even weak illusions should split as long as children get > 0 HP.
const ILLUSION_SPLIT_MIN_HP = 2;

/**
 * Update active illusions (clones, Rika, etc).
 */
export function updateIllusions() {
  if (state.gameState !== 'playing' && state.gameState !== 'roundEnd' && state.gameState !== 'matchEnd') return;
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;

  for (let i = state.illusions.length - 1; i >= 0; i--) {
    const illusion = state.illusions[i];

    // Transfigured Human & Evasion Minion expanding death animation & explosion
    if (illusion.isDying) {
      illusion.deathTimer--;
      illusion.vx = 0;
      illusion.vy = 0;
      if (illusion.knockbackVx !== undefined) {
        illusion.knockbackVx = 0;
        illusion.knockbackVy = 0;
      }
      
      const mahitoCfg = (typeof CONFIG !== 'undefined' && CONFIG.mahito) ? CONFIG.mahito : {};
      const multCfg = mahitoCfg.soulMultiplicity || {};
      const maxScale = illusion.isEvasionMinion ? 1.65 : (multCfg.minionExpandMaxScale ?? 2.2);
      const deathDur = illusion.isEvasionMinion ? 24 : (multCfg.minionDeathDuration ?? 20);

      const progress = 1.0 - (illusion.deathTimer / (illusion.maxDeathTimer || deathDur));
      // Explode visually by swelling up to maxScale
      illusion.visualScale = 1.0 + progress * (maxScale - 1.0);
      illusion.visualScaleTarget = illusion.visualScale;

      // Spawn subtle boiling soul bubbles during the body swell phase
      if (illusion.isEvasionMinion && Math.random() < 0.45) {
        if (typeof spawnMahitoSoulBubbles === 'function') {
          spawnMahitoSoulBubbles(illusion.x, illusion.y, 1, '#D946EF');
        }
      }

      if (illusion.deathTimer <= 0) {
        if (illusion.isEvasionMinion) {
          spawnIllusionDeath({ ...illusion, color: '#D946EF' });
          if (typeof spawnMahitoSoulExplosion === 'function') {
            spawnMahitoSoulExplosion(illusion.x, illusion.y, 35, true);
          }
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
            const cloneVol = mahitoCfg.soundVolumes?.splitClone !== undefined ? mahitoCfg.soundVolumes.splitClone : (mahitoCfg.sounds?.splitCloneVolume ?? 1.8);
            audioSystem.playSFX(mahitoCfg.sounds?.splitClone || 'Assets/Sound Effects/Skills/mahito-split-clone2.mp3', cloneVol);
            audioSystem.playSFX(mahitoCfg.sounds?.splitCloneAlt || 'Assets/Sound Effects/Skills/mahito-split-clone1.mp3', cloneVol);
          }
          state.illusions.splice(i, 1);
          continue;
        }

        if (typeof spawnMahitoSoulExplosion === 'function') {
          spawnMahitoSoulExplosion(illusion.x, illusion.y, illusion.r * 1.8);
        }
        // Spawn burst of red blood particles (optimized to 30 to prevent FPS drop)
        if (typeof spawnBloodEffect === 'function') {
          spawnBloodEffect({ x: illusion.x, y: illusion.y, r: illusion.r, color: '#e60000' }, 30);
        }

        // Apply AOE damage and knockback to all valid enemies (Rule #6 compliant)
        const explosionRadius = multCfg.minionExplosionRadius || 100;
        const explosionDamage = multCfg.minionExplosionDamage || 50;
        const explosionKnockback = multCfg.minionExplosionKnockback || 12;
        const owner = illusion.owner;
        const ownerStateIdx = owner ? state.fighters.indexOf(owner) : -1;
        const myTeam = owner ? (typeof state.getFighterTeam === 'function' ? state.getFighterTeam(ownerStateIdx) : owner.team) : null;

        // Iterate fighters and illusions without allocating a merged copy
        const _fighters = state.fighters;
        const _illusions = state.illusions;
        const _candidateCount = _fighters.length + _illusions.length;
        for (let ci = 0; ci < _candidateCount; ci++) {
          const target = ci < _fighters.length ? _fighters[ci] : _illusions[ci - _fighters.length];
          if (!target || target === illusion || target === owner || target.hp <= 0 || target.isDead) continue;
          
          // Team check to make sure we don't hurt teammates or ourselves
          if (myTeam !== null) {
            let targetTeam;
            if (target.isIllusion) {
              // Illusion — derive team from its owner
              targetTeam = target.owner ? (typeof state.getFighterTeam === 'function' ? state.getFighterTeam(state.fighters.indexOf(target.owner)) : target.owner.team) : null;
            } else {
              // Fighter — use loop index directly (ci < _fighters.length)
              targetTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ci) : target.team;
            }
            if (targetTeam === myTeam) continue;
          }

          const dist = Math.hypot(target.x - illusion.x, target.y - illusion.y);
          if (dist <= target.r + explosionRadius) {
            if (typeof applyDamageToTarget === 'function') {
              applyDamageToTarget(target, explosionDamage, owner, { isSkill: true });
            } else if (typeof target.takeDamage === 'function') {
              target.takeDamage(explosionDamage, owner, { isSkill: true });
            }

            const angle = Math.atan2(target.y - illusion.y, target.x - illusion.x);
            const kbX = Math.cos(angle) * explosionKnockback;
            const kbY = Math.sin(angle) * explosionKnockback;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(kbX, kbY);
            } else {
              target.vx = (target.vx || 0) + kbX;
              target.vy = (target.vy || 0) + kbY;
            }

            if (typeof target.applyHitStun === 'function') {
              target.applyHitStun(8);
            }

            // Apply +1 stack of Soul Disfigurement (JJK Idle Transfiguration mechanic)
            if (typeof applySoulDisfigurementStack === 'function' && owner) {
              applySoulDisfigurementStack(target, owner);
            }
          }
        }

        // Screen Shake & SFX
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(6, 12);
        }

        // Play soul explosion sound
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
          const expVol = mahitoCfg.soundVolumes?.minionExplosion !== undefined ? mahitoCfg.soundVolumes.minionExplosion : (mahitoCfg.sounds?.minionExplosionVolume ?? 1.8);
          audioSystem.playSFX(mahitoCfg.sounds?.bodyExplode || 'Assets/Sound Effects/Skills/mahito-body-explode.mp3', expVol);
        }
        state.illusions.splice(i, 1);
      }
      continue;
    }

    // Always decrement hit flash even if dying, so they don't get stuck white
    if (illusion.hitFlashTimer > 0) {
      illusion.hitFlashTimer--;
    }

    // Illusions only disappear when they die (HP <= 0), not by duration
    if (illusion.hp <= 0) {
      if (illusion.isRika) continue; // Rika handles her own death animation
      
      if ((illusion.isTransfiguredHuman || illusion.isEvasionMinion) && !illusion.isDying) {
        const mahitoCfg = (typeof CONFIG !== 'undefined' && CONFIG.mahito) ? CONFIG.mahito : {};
        const multCfg = mahitoCfg.soulMultiplicity || {};
        const deathDur = illusion.isEvasionMinion ? 24 : (multCfg.minionDeathDuration ?? 50);

        illusion.isDying = true;
        illusion.deathTimer = deathDur;
        illusion.maxDeathTimer = deathDur;
        illusion.hp = 0; // lock hp to 0
        continue; // Wait for expansion to finish before deleting
      }

      const deathColor = illusion.isEvasionMinion ? '#D946EF' : (illusion.color || '#9966ff');
      spawnIllusionDeath({ ...illusion, color: deathColor });
      if (illusion.isEvasionMinion) {
        if (typeof spawnMahitoSoulExplosion === 'function') {
          spawnMahitoSoulExplosion(illusion.x, illusion.y, 35, true);
        }
      }

      // ── SPLIT ON DEATH MECHANIC (Doppelganger Illusions only) ──
      // When an illusion dies, it splits into 2 child illusions each with
      // 50% of the dying illusion's maxHp, provided it had enough HP to be worth splitting.
      const maxIllusions = CONFIG.doppleganger?.maxIllusions || 10;
      // Use isDoppelganger flag (stamped in DopplegangerFighter.summonIllusion) for reliable detection
      const canSplit = illusion.isDoppelganger === true
        && !illusion.isSplitChild                          // Only first-gen illusions split
        && illusion.maxHp >= ILLUSION_SPLIT_MIN_HP         // Must have meaningful HP
        && (state.illusions.length - 1) < maxIllusions;   // Room for at least 1 child

      if (canSplit) {
        const splitHp = illusion.maxHp * 0.5;
        const splitR   = Math.max(Math.floor(illusion.r * 0.50), 7);  // half size — Minecraft slime style
        const owner    = illusion.owner;
        const ownerSpeed = ((owner && owner.hp > 0 ? owner.speed : null) || illusion.moveSpeed || 1.5) * 1.35; // faster to feel frenetic
        const slotsLeft = maxIllusions - (state.illusions.length - 1); // how many slots remain after this dies
        const spawnCount = Math.min(2, slotsLeft);

        for (let s = 0; s < spawnCount; s++) {
          // Burst outward in opposite directions
          const burstAngle = (illusion.gunAngle || 0) + (s === 0 ? -Math.PI / 3 : Math.PI / 3);
          const child = {
            x: illusion.x + Math.cos(burstAngle) * (illusion.r + splitR + 2),
            y: illusion.y + Math.sin(burstAngle) * (illusion.r + splitR + 2),
            vx: Math.cos(burstAngle) * ownerSpeed,
            vy: Math.sin(burstAngle) * ownerSpeed,
            r: splitR,
            color: illusion.color,
            hp: splitHp,
            maxHp: splitHp,
            damage: illusion.damage * 0.75,  // children deal 75% of parent illusion damage
            owner,
            swordCooldown: 20,
            swordSwingActive: false,
            swordSwingTimer: 0,
            swordSwingAngle: 0,
            duration: CONFIG.doppleganger?.illusionDuration || 2000,
            angle: illusion.angle || 0,
            gunAngle: burstAngle,
            moveSpeed: ownerSpeed,
            isIllusion: true,
            isDoppelganger: true,   // keeps team/targeting logic working
            isTransfiguredHuman: illusion.isTransfiguredHuman === true,
            isSplitChild: true,     // children do NOT split again
            hitFlashTimer: 0,
            timeStopTimer: 0,
            hitStunTimer: 0,
            applyTimeStop(duration) { this.timeStopTimer = Math.max(this.timeStopTimer || 0, duration); },
            applyHitStun(duration)  { this.hitStunTimer  = Math.max(this.hitStunTimer  || 0, duration); },
            applyKnockback(vx, vy) { this.knockbackVx = vx; this.knockbackVy = vy; },
            takeDamage(amount, attacker, opts = {}) {
              return applyDamageToTarget(this, amount, attacker, opts);
            },
          };
          state.illusions.push(child);
          spawnIllusionSpawn(child);
          if (owner) owner.illusionsSummoned++;
        }
        if (illusion.r >= 15) {
          spawnFloatingText(illusion.x, illusion.y - illusion.r - 10, 'SPLIT!', '#d070ff');
        }
      } else {
        if (illusion.r >= 15) {
          spawnFloatingText(illusion.x, illusion.y - illusion.r - 10, 'ILLUSION SHATTERED!', '#9b59b6');
        }
      }

      // High-performance swap-and-pop array cleanup instead of splice
      state.illusions[i] = state.illusions[state.illusions.length - 1];
      state.illusions.pop();
      continue;
    }

    const isChampScreen = (typeof isChampionScreenActive === 'function' && isChampionScreenActive());
    if (isChampScreen) {
      if (!illusion.isRika) {
        illusion.vx = (illusion.vx || 0) * 0.96;
        illusion.vy = (illusion.vy || 0) * 0.96;
        illusion.x += illusion.vx;
        illusion.y += illusion.vy;
      }
      if (arena) {
        const minX = arena.x + illusion.r;
        const maxX = arena.x + arena.width - illusion.r;
        const minY = arena.y + illusion.r;
        const maxY = arena.y + arena.height - illusion.r;
        if (illusion.x < minX) { illusion.x = minX; illusion.vx = -illusion.vx * 0.5; }
        if (illusion.x > maxX) { illusion.x = maxX; illusion.vx = -illusion.vx * 0.5; }
        if (illusion.y < minY) { illusion.y = minY; illusion.vy = -illusion.vy * 0.5; }
        if (illusion.y > maxY) { illusion.y = maxY; illusion.vy = -illusion.vy * 0.5; }
      }
      continue;
    }

    // Process knockback displacement on illusions
    if (illusion.knockbackVx !== undefined && (Math.abs(illusion.knockbackVx) > 0.1 || Math.abs(illusion.knockbackVy) > 0.1)) {
      illusion.x += illusion.knockbackVx;
      illusion.y += illusion.knockbackVy;
      illusion.knockbackVx *= 0.88;
      illusion.knockbackVy *= 0.88;
      if (Math.abs(illusion.knockbackVx) <= 0.1) illusion.knockbackVx = 0;
      if (Math.abs(illusion.knockbackVy) <= 0.1) illusion.knockbackVy = 0;

      // Always clamp illusion to arena boundaries even during knockback
      if (arena) {
        if (illusion.isRika) {
          clampRikaToArena(illusion, arena);
        } else {
          const eR = illusion.r || 20;
          illusion.x = Math.max(arena.x + eR, Math.min(arena.x + arena.width - eR, illusion.x));
          illusion.y = Math.max(arena.y + eR, Math.min(arena.y + arena.height - eR, illusion.y));
        }
      }
    }

    // MANDATORY RULE 1: TimeStop & HitStun Freeze Guard
    if (illusion.timeStopTimer > 0 || illusion.isTargetOfAmbush) {
      if (illusion.timeStopTimer > 0) illusion.timeStopTimer--;
      illusion.vx = 0;
      illusion.vy = 0;
      continue; // Stop update and attack execution so illusion is completely frozen!
    }
    if (illusion.hitStunTimer > 0) {
      illusion.hitStunTimer--;
      illusion.vx = 0;
      illusion.vy = 0;
      continue;
    }

    // Check if inside a Cronos sphere - freeze movement if so
    let insideSphere = false;
    for (const fighter of state.fighters) {
      if (!fighter || !fighter.sphereActive) continue;
      const dx = illusion.x - fighter.sphereX;
      const dy = illusion.y - fighter.sphereY;
      const radius = CONFIG.cronos.sphereRadius;
      if ((dx * dx + dy * dy) <= radius * radius) {
        insideSphere = true;
        break;
      }
    }

    // Fetch spatial grid and nearest targets early for steering/attacks
    const nearbyEntities = spatialGrid.getNearby(illusion.x, illusion.y, illusion.r * 2 + 100);
    let nearestTarget = null;
    // Cache owner's team index once for this illusion's entire update tick
    const _isTeamMode = (state.mode === '2v2' || state.mode === '1v2 Stand Off');
    const _ownerStateIdx = (_isTeamMode && illusion.owner) ? state.fighters.indexOf(illusion.owner) : -1;
    const _ownerTeam = _ownerStateIdx >= 0 ? state.getFighterTeam(_ownerStateIdx) : null;
    if (!insideSphere) {
      let nearestDist = Infinity;
      const isTargetValid = (entity) => {
        if (!entity || !entity.hp || entity.hp <= 0) return false;
        if (entity === illusion) return false;
        
        const targetOwner = entity.isIllusion ? entity.owner : entity;
        if (!targetOwner || targetOwner === illusion.owner) return false;
        
        if (_isTeamMode && illusion.owner) {
          const entityTeam = state.getFighterTeam(state.fighters.indexOf(targetOwner));
          if (entityTeam !== null && entityTeam === _ownerTeam) return false;
        }
        return true;
      };

      for (const entity of nearbyEntities) {
        if (!isTargetValid(entity)) continue;
        const dx = entity.x - illusion.x;
        const dy = entity.y - illusion.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < nearestDist) {
          nearestDist = dSq;
          nearestTarget = entity;
        }
      }
      if (!nearestTarget) {
        for (const fighter of state.fighters) {
          if (!isTargetValid(fighter)) continue;
          const dx = fighter.x - illusion.x;
          const dy = fighter.y - illusion.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < nearestDist) {
            nearestDist = dSq;
            nearestTarget = fighter;
          }
        }
      }
      if (nearestTarget) {
        illusion.gunAngle = Math.atan2(nearestTarget.y - illusion.y, nearestTarget.x - illusion.x);
      }
    }

    if (illusion.hitStunTimer > 0) illusion.hitStunTimer--;
    if (illusion.paralyzeTimer > 0) {
      if (illusion.paralyzeTimer === 1 && illusion.isParalyzedByMahito) {
        triggerMahitoParalyzeExplosion(illusion);
      }
      illusion.paralyzeTimer--;
      if (illusion.paralyzeTimer <= 0) {
        illusion.isParalyzedByMahito = false;
      }
    }

    if (illusion.isEvasionMinion) {
      illusion.hitStunTimer = 0;
    }

    const isIllusionParalyzed = !illusion.isEvasionMinion && ((illusion.hitStunTimer || 0) > 0 || (illusion.paralyzeTimer || 0) > 0 || illusion.isParalyzedByMahoraga);
    if (isIllusionParalyzed) {
      if ((illusion.paralyzeTimer || 0) <= 0 && (illusion.hitStunTimer || 0) <= 0) {
        illusion.isParalyzedByMahoraga = false;
        illusion.isParalyzedByMahito = false;
      }
      illusion.vx = 0;
      illusion.vy = 0;
      continue; // Completely frozen by paralyze stun!
    }

    // Apply velocity - illusions bounce naturally off walls (frozen inside sphere)
    if (!insideSphere) {
      // Process universal knockback
      if (illusion.knockbackVx !== undefined && (Math.abs(illusion.knockbackVx) > 0.1 || Math.abs(illusion.knockbackVy) > 0.1)) {
        illusion.x += illusion.knockbackVx;
        illusion.y += illusion.knockbackVy;

        illusion.knockbackVx *= 0.85;
        illusion.knockbackVy *= 0.85;

        if (Math.abs(illusion.knockbackVx) <= 0.1) illusion.knockbackVx = 0;
        if (Math.abs(illusion.knockbackVy) <= 0.1) illusion.knockbackVy = 0;
      }

      illusion.animationTime = (illusion.animationTime || 0) + 16.666;

      // Wake up illusions if they were frozen by an ambush and are now free
      if (!illusion.isTargetOfAmbush && illusion.vx === 0 && illusion.vy === 0 && !illusion.isRika && !illusion.isDyingEvasion) {
        const randomAngle = Math.random() * Math.PI * 2;
        illusion.vx = Math.cos(randomAngle);
        illusion.vy = Math.sin(randomAngle);
      }

      // Only apply base movement if not being heavily knocked back
      const isKnockedBack = illusion.knockbackVx !== undefined && (Math.abs(illusion.knockbackVx) > 2 || Math.abs(illusion.knockbackVy) > 2);
      if (!isKnockedBack && !illusion.isRika) { // Rika handles her own movement
        // Freeze movement if currently targeted by ambush
        if (illusion.isTargetOfAmbush) {
          illusion.vx = 0;
          illusion.vy = 0;
        } else {
          illusion.x += illusion.vx;
          illusion.y += illusion.vy;
        }
      }

      if (illusion.isEvasionMinion) {
        illusion.swordCooldown = 9999;
        
        // ── Evasion Health Regeneration Buff for minion clones ──
        const evaRegenRate = CONFIG.mahito?.evasion?.regenRate ?? 0.05;
        if (illusion.hp > 0 && illusion.hp < illusion.maxHp) {
          illusion.hp = Math.min(illusion.maxHp, Number((illusion.hp + evaRegenRate).toFixed(2)));
          illusion._evadeRegenTick = (illusion._evadeRegenTick || 0) + 1;
          if (illusion._evadeRegenTick % 30 === 0 && typeof spawnFloatingText === 'function') {
            spawnFloatingText(illusion.x, illusion.y - illusion.r - 18, `+${(evaRegenRate * 30).toFixed(0)} HP`, '#4ADE80');
          }
        }
        
        // Enforce evasion speedMultiplier (1.50x) from CONFIG on clones
        const evaSpeedMult = CONFIG.mahito?.evasion?.speedMultiplier || 1.50;
        const baseSpeed = (illusion.owner && illusion.owner.baseSpeed) || CONFIG.mahito?.moveSpeed || 5.8;
        let targetSpeed = baseSpeed * evaSpeedMult;

        if (illusion.slowTimer !== undefined && illusion.slowTimer > 0) {
          illusion.slowTimer--;
          targetSpeed *= (illusion.slowMultiplier || 0.5);
        }

        const currentSpeed = Math.hypot(illusion.vx, illusion.vy);
        if (currentSpeed > 0 && !illusion.isDyingEvasion) {
          illusion.vx = (illusion.vx / currentSpeed) * targetSpeed;
          illusion.vy = (illusion.vy / currentSpeed) * targetSpeed;
          const moveAngle = Math.atan2(illusion.vy, illusion.vx);
          illusion.angle = moveAngle;
          illusion.gunAngle = moveAngle;
        } else if (currentSpeed <= 0.1 && !illusion.isDyingEvasion) {
          // Re-launch evasion clone if velocity dropped to 0 while taking hits!
          const randAngle = Math.random() * Math.PI * 2;
          illusion.vx = Math.cos(randAngle) * targetSpeed;
          illusion.vy = Math.sin(randAngle) * targetSpeed;
        }
      } else {
        // Normalize speed every frame to match owner's movement speed (non-evasion illusions)
        const speedSq = illusion.vx * illusion.vx + illusion.vy * illusion.vy;
        let targetSpeed = (illusion.owner && illusion.owner.hp > 0 ? illusion.owner.speed : null)
          || illusion.moveSpeed || 1.5;
        if (illusion.slowTimer !== undefined && illusion.slowTimer > 0) {
          illusion.slowTimer--;
          targetSpeed *= (illusion.slowMultiplier || 0.5);
        }
        if (speedSq > 0) {
          const scale = targetSpeed / Math.sqrt(speedSq);
          illusion.vx *= scale;
          illusion.vy *= scale;
        }
      }

      // ── Transfigured Human Minion Periodic Chatter / Noise ──
      if (illusion.isTransfiguredHuman && !illusion.isDying && illusion.hp > 0) {
        if (illusion.minionNoiseTimer === undefined || illusion.minionNoiseTimer === null) {
          illusion.minionNoiseTimer = 45 + Math.floor(Math.random() * 30);
        }
        if (illusion.minionNoiseTimer > 0) {
          illusion.minionNoiseTimer--;
        } else {
          const mahitoCfg = (typeof CONFIG !== 'undefined' && CONFIG.mahito) ? CONFIG.mahito : {};
          const interval = mahitoCfg.sounds?.minionNoiseInterval || 55;
          illusion.minionNoiseTimer = interval + Math.floor((Math.random() - 0.5) * 25);
          const soundToPlay = illusion.minionSound || mahitoCfg.sounds?.minionSummon || 'Assets/Sound Effects/Skills/mahito-minion-summon.mp3';
          const vol = mahitoCfg.soundVolumes?.minionNoise !== undefined ? mahitoCfg.soundVolumes.minionNoise : (mahitoCfg.sounds?.minionNoiseVolume ?? 1.5);
          if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
            audioSystem.playSFX(soundToPlay, vol);
          }
        }
      }
    }

    // Spatial grid was fetched early

    // Check collision with fighters and bump them
    for (const entity of nearbyEntities) {
      if (!entity || entity === illusion) continue;
      if (entity.isIllusion) continue; // Skip illusions here, handled separately
      if (!entity.hp || entity.hp <= 0) continue;
      // Cronos phases through illusions while inside his own sphere; Mahito phases during Phantom Soul Slip
      if (entity._isInsideOwnSphere?.() || (entity.soulPhaseDashTimer && entity.soulPhaseDashTimer > 0)) continue;

      const dx = illusion.x - entity.x;
      const dy = illusion.y - entity.y;
      const minDist = illusion.r + entity.r;

      // Bounding box culling
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        // Bump illusion away from fighter
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        illusion.x += nx * overlap * 0.5;
        illusion.y += ny * overlap * 0.5;

        // Bounce velocity
        const dotProduct = illusion.vx * nx + illusion.vy * ny;
        illusion.vx -= 2 * dotProduct * nx;
        illusion.vy -= 2 * dotProduct * ny;
      }
    }

    // Check collision with other illusions (only check nearby)
    for (const entity of nearbyEntities) {
      if (!entity || entity === illusion) continue;
      if (!entity.isIllusion) continue; // Skip fighters here
      if (!entity.hp || entity.hp <= 0) continue;
      if (illusion.isSplitChild && entity.isSplitChild) continue; // Skip collision between small clumped children

      const dx = illusion.x - entity.x;
      const dy = illusion.y - entity.y;
      const minDist = illusion.r + entity.r;

      // Bounding box culling
      if (Math.abs(dx) > minDist || Math.abs(dy) > minDist) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        // Bump illusions away from each other
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        illusion.x += nx * overlap * 0.5;
        illusion.y += ny * overlap * 0.5;
        entity.x -= nx * overlap * 0.5;
        entity.y -= ny * overlap * 0.5;

        // Bounce velocity for both illusions
        const dotProduct = illusion.vx * nx + illusion.vy * ny;
        illusion.vx -= 2 * dotProduct * nx;
        illusion.vy -= 2 * dotProduct * ny;

        const otherDotProduct = entity.vx * nx + entity.vy * ny;
        entity.vx -= 2 * otherDotProduct * nx;
        entity.vy -= 2 * otherDotProduct * ny;
      }
    }

    // Wall bounce for illusions - auto-lock onto nearest target upon bounce
    let bouncedX = false;
    let bouncedY = false;

    if (illusion.x - illusion.r < arena.x) {
      illusion.x = arena.x + illusion.r;
      bouncedX = true;
    } else if (illusion.x + illusion.r > arena.x + arena.width) {
      illusion.x = arena.x + arena.width - illusion.r;
      bouncedX = true;
    }
    if (illusion.y - illusion.r < arena.y) {
      illusion.y = arena.y + illusion.r;
      bouncedY = true;
    } else if (illusion.y + illusion.r > arena.y + arena.height) {
      illusion.y = arena.y + arena.height - illusion.r;
      bouncedY = true;
    }

    const bounced = bouncedX || bouncedY;

    // If bounded, steer directly towards the nearest target (unless target is Gojo with active Infinity)
    if (bounced) {
      const targetSpeed = (illusion.owner && illusion.owner.hp > 0 ? illusion.owner.speed : null) || illusion.moveSpeed || 1.5;
      const isGojoInfinity = nearestTarget &&
        (nearestTarget.characterId === 'gojo' || nearestTarget.type === 'gojo') &&
        !nearestTarget.isMeleeMode &&
        ((nearestTarget.infinityCooldown || 0) <= 0 || nearestTarget.infinityActive);

      if (illusion.isEvasionMinion) {
        // Pure natural wall bounce — reverse velocity along hit axis
        if (bouncedX) illusion.vx = -illusion.vx;
        if (bouncedY) illusion.vy = -illusion.vy;
        
        const bounceAngle = Math.atan2(illusion.vy, illusion.vx) + (Math.random() - 0.5) * 0.20;
        const curB = Math.hypot(illusion.vx, illusion.vy);
        illusion.vx = Math.cos(bounceAngle) * curB;
        illusion.vy = Math.sin(bounceAngle) * curB;
        illusion.angle = bounceAngle;
        illusion.gunAngle = bounceAngle;
      } else if (nearestTarget && !insideSphere && !isGojoInfinity) {
        const dx = nearestTarget.x - illusion.x;
        const dy = nearestTarget.y - illusion.y;
        const dSq = dx * dx + dy * dy;
        const scale = targetSpeed / (dSq > 0 ? Math.sqrt(dSq) : 1);
        illusion.vx = dx * scale;
        illusion.vy = dy * scale;
      } else {
        // Natural bounce — reverse velocity along the hit wall axis
        if (bouncedX) illusion.vx = -illusion.vx;
        if (bouncedY) illusion.vy = -illusion.vy;
        const speedSq = illusion.vx * illusion.vx + illusion.vy * illusion.vy;
        const scale = targetSpeed / (speedSq > 0 ? Math.sqrt(speedSq) : 1);
        illusion.vx *= scale;
        illusion.vy *= scale;
      }
    }

    // Sword swing cooldown
    if (illusion.swordCooldown > 0) {
      illusion.swordCooldown--;
    }

    // Sword swing animation timer
    if (illusion.swordSwingActive) {
      illusion.swordSwingTimer--;
      if (illusion.swordSwingTimer <= 0) {
        illusion.swordSwingActive = false;
      }
    }

    // Skip attack if frozen inside Cronos sphere
    if (insideSphere) continue;



    // Try to attack nearby fighters (independent targeting, not following owner) (Bypassed for evasion clones)
    if (illusion.isEvasionMinion) continue;
    for (const entity of nearbyEntities) {
      if (!entity || !entity.hp || entity.hp <= 0) continue;
      if (entity === illusion) continue;
      
      const targetOwner = entity.isIllusion ? entity.owner : entity;
      if (!targetOwner || targetOwner === illusion.owner) continue;

      if (_isTeamMode && illusion.owner) {
        const entityTeam = state.getFighterTeam(state.fighters.indexOf(targetOwner));
        if (entityTeam !== null && entityTeam === _ownerTeam) continue;
      }
      if (entity.invincibilityTimer > 0 || entity.flashStepTimer > 0 || (entity.vanishTimer && entity.vanishTimer > 0)) continue;

      const dx = entity.x - illusion.x;
      const dy = entity.y - illusion.y;
      const maxAttackRange = illusion.r + entity.r + CONFIG.doppleganger.swordRange;
      if ((dx * dx + dy * dy) <= maxAttackRange * maxAttackRange && illusion.swordCooldown === 0) {
        // Attack!
        const biteAngle = Math.atan2(entity.y - illusion.y, entity.x - illusion.x);
        illusion.swordSwingAngle = biteAngle;
        illusion.swordSwingActive = true;
        illusion.swordSwingTimer = CONFIG.doppleganger.swordSwingDuration;
        illusion.swordCooldown = CONFIG.doppleganger.swordCooldown;
        entity.takeDamage(illusion.damage, illusion.owner || illusion, { isMelee: true });
        
        if (illusion.isTransfiguredHuman) {
          if (typeof spawnBiteAttackEffect === 'function') {
            spawnBiteAttackEffect(entity.x, entity.y, biteAngle, '#D946EF');
          }
          spawnFloatingText(entity.x, entity.y - entity.r - 12, 'CRUNCH! 🦷', '#D946EF');
        } else {
          spawnFloatingText(entity.x, entity.y - entity.r - 5, 'ILLUSION SLASH!', '#9b59b6');
        }
        break;
      }
    }
  }
}
