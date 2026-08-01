import { CONFIG, FIGHTER_DEFS } from '../core/config.js';
import { state } from '../core/state.js';
import { GAME_MODES, MODE_SETTINGS } from '../core/modeConfig.js';
import { drawBlueAimbotGun } from './weaponVisuals.js';
import { drawPanel } from './ui.js';

export function drawHUD() {
  const { ctx, canvas, fighters, scores, roundNum, mode, gameState, matchEndTimer, roundEndTimer, roundWinner, ffaMatchComplete } = state;


  // Calculate HUD opacity during champion reveal fade-in
  let hudOpacity = 1;
  if (gameState === 'matchEnd') {
    const revealTimer = Math.max(0, matchEndTimer - 45); // match end delay
    hudOpacity = Math.max(0, 1 - (revealTimer / 30));
  } else if (gameState === 'roundEnd') {
    const winnerIndex = roundWinner ? fighters.indexOf(roundWinner) : -1;
    const modeRounds = MODE_SETTINGS[state.mode]?.rounds || 3;
    const winThreshold = modeRounds === 1 ? 1 : 2;
    const hasTwoWins = winnerIndex >= 0 && scores[winnerIndex] >= winThreshold;
    const showModel = hasTwoWins && roundWinner;
    const isChampionReveal = (mode === 'FFA' && ffaMatchComplete) || showModel;
    
    if (isChampionReveal) {
      const displayDelay = 60; // round end delay
      const delayedTimer = Math.max(0, roundEndTimer - displayDelay);
      hudOpacity = Math.max(0, 1 - (delayedTimer / 30));
    }
  }

  // Health HUD is rendered below the canvas in DOM.
  const containerBottom = document.getElementById('healthHud');
  const containerLeft = document.getElementById('healthHudLeft');
  const containerRight = document.getElementById('healthHudRight');
  const topContainer = document.querySelector('.hud-top-container');
  const bottomContainer = document.querySelector('.hud-bottom-container');
  
  if (containerBottom) {
    containerBottom.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerBottom.style.visibility = 'hidden';
      containerBottom.style.pointerEvents = 'none';
    } else {
      containerBottom.style.display = 'flex';
      containerBottom.style.visibility = 'visible';
      containerBottom.style.pointerEvents = 'auto';
    }
  }
  if (containerLeft) {
    containerLeft.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerLeft.style.visibility = 'hidden';
      containerLeft.style.pointerEvents = 'none';
    } else {
      containerLeft.style.display = 'block';
      containerLeft.style.visibility = 'visible';
      containerLeft.style.pointerEvents = 'auto';
    }
  }
  if (containerRight) {
    containerRight.style.opacity = hudOpacity;
    if (hudOpacity <= 0) {
      containerRight.style.visibility = 'hidden';
      containerRight.style.pointerEvents = 'none';
    } else {
      containerRight.style.display = 'block';
      containerRight.style.visibility = 'visible';
      containerRight.style.pointerEvents = 'auto';
    }
  }
  if (topContainer) {
    topContainer.style.opacity = hudOpacity;
    topContainer.style.display = 'none';
  }
  if (bottomContainer) {
    bottomContainer.style.opacity = hudOpacity;
    bottomContainer.style.display = 'none';
  }

  updateHealthHud();

  if (hudOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = hudOpacity;

    const cx = state.arena.x + state.arena.width / 2;
    const topY = state.arena.y - 36;

    // Draw round on top (hidden in Stand Off modes)
    if (mode !== GAME_MODES.STAND_OFF && mode !== GAME_MODES.STAND_OFF_1V2 && mode !== 'Stand Off' && mode !== '1v2 Stand Off') {
        drawPanel(cx - 90, topY, 180, 26, 0.7);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const roundsMax = MODE_SETTINGS[mode]?.rounds || MODE_SETTINGS[GAME_MODES.ONE_VS_ONE].rounds;
        ctx.fillText(`ROUND ${roundNum} OF ${roundsMax}`, cx, topY + 18);
    }

    // Draw rotate message at the bottom
    const bottomY = state.arena.y + state.arena.height + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'italic 12px Arial';
    ctx.fillText('', cx, bottomY);

    ctx.restore();
  }
}

// Helper function to adjust color brightness
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function clearHealthHud() {
  const containerBottom = document.getElementById('healthHud');
  const containerLeft = document.getElementById('healthHudLeft');
  const containerRight = document.getElementById('healthHudRight');
  if (containerBottom) containerBottom.innerHTML = '';
  if (containerLeft) containerLeft.innerHTML = '';
  if (containerRight) containerRight.innerHTML = '';
  
  const topHudLeft = document.getElementById('hudTopLeft');
  const topHudRight = document.getElementById('hudTopRight');
  const bottomHudLeft = document.getElementById('hudBottomLeft');
  const bottomHudRight = document.getElementById('hudBottomRight');
  if (topHudLeft) topHudLeft.innerHTML = '';
  if (topHudRight) topHudRight.innerHTML = '';
  if (bottomHudLeft) bottomHudLeft.innerHTML = '';
  if (bottomHudRight) bottomHudRight.innerHTML = '';
}

document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.dummy-aggressive-toggle')) {
    import('../core/state.js').then(m => {
      m.state.dummyAggressive = !m.state.dummyAggressive;
    });
  }
});

function updateHealthHud() {
  const containerBottom = document.getElementById('healthHud');
  const containerLeft = document.getElementById('healthHudLeft');
  const containerRight = document.getElementById('healthHudRight');
  if (!containerBottom) return;

  const { fighters, mode, scores, teamScores } = state;
  const is1v2 = mode === GAME_MODES.STAND_OFF_1V2;
  const teamMode = mode === GAME_MODES.TWO_VS_TWO || is1v2;
  const is1v1 = mode === '1v1' || mode === GAME_MODES.ONE_VS_ONE || mode === GAME_MODES.STAND_OFF || mode === 'TLFS';
  
  const cardsLeft = [];
  const cardsRight = [];
  const cardsBottom = [];

  const topHudLeft = document.getElementById('hudTopLeft');
  const topHudRight = document.getElementById('hudTopRight');
  const bottomHudLeft = document.getElementById('hudBottomLeft');
  const bottomHudRight = document.getElementById('hudBottomRight');
  
  // Reset new HUDs
  if (topHudLeft) topHudLeft.innerHTML = '';
  if (topHudRight) topHudRight.innerHTML = '';
  if (bottomHudLeft) bottomHudLeft.innerHTML = '';
  if (bottomHudRight) bottomHudRight.innerHTML = '';


  const getSkillDataForFighter = (f) => {
    if (f.characterId === 'gojo' || f.type === 'gojo') {
      const themeColor = f.color || '#00e5ff';
      const domainMax = CONFIG.gojo?.domainCooldown || 2000;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = CONFIG.gojo?.domainDuration || 400;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }

      const activeProjectiles = typeof getProjectiles === 'function' ? getProjectiles() : [];
      const purpleOrb = activeProjectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0 && p.owner === state.fighters?.indexOf(f));
      const purpleMax = CONFIG.gojo?.purpleCooldown || 1500;
      const purpleTimer = f.purpleCooldown !== undefined ? f.purpleCooldown : purpleMax;
      let purplePct;
      if (f.isChannelingPurple) {
        const chargeMax = CONFIG.gojo?.purpleChargeMax || 100;
        const chargeTimer = f.purpleChargeTimer || 0;
        purplePct = Math.max(0, Math.min(100, (1 - chargeTimer / chargeMax) * 100));
      } else if (purpleOrb) {
        const orbMaxLife = CONFIG.gojo?.purpleLife || 250;
        purplePct = Math.max(0, Math.min(100, (purpleOrb.life / orbMaxLife) * 100));
      } else if ((f.purpleRecoveryTimer || 0) > 0) {
        purplePct = 0;
      } else {
        purplePct = Math.max(0, Math.min(100, (1 - (purpleTimer / purpleMax)) * 100));
      }

      const redMax = CONFIG.gojo?.redCooldown || 1000;
      const redTimer = f.redCooldown !== undefined ? f.redCooldown : redMax;
      const redPct = Math.max(0, Math.min(100, (1 - (redTimer / redMax)) * 100));

      return [
        { id: 'uv',     pct: domainPct, ready: domainPct >= 99, color: themeColor, label: 'UNLIMITED VOID' },
        { id: 'purple', pct: purplePct, ready: purplePct >= 99, color: themeColor, label: 'HOLLOW PURPLE' },
        { id: 'red',    pct: redPct,    ready: redPct >= 99,    color: themeColor, label: 'REVERSAL RED' },
      ];
    }
    if (f.characterId === 'toji' || f.type === 'toji') {
      const themeColor = '#a855f7';
      const ambushTrigger = CONFIG.toji?.ambushTriggerFrames || 55;
      const ambushMax = (CONFIG.toji?.stealthCooldown || 500) - ambushTrigger;
      const rawAmbushTimer = f.stealthCooldown !== undefined ? f.stealthCooldown : 0;
      let ambushPct = 0;
      if (f.stealthTimer > 0) { ambushPct = 0; }
      else {
        const cooldownRemaining = Math.max(0, rawAmbushTimer - ambushTrigger);
        ambushPct = Math.max(0, Math.min(100, (1 - (cooldownRemaining / ambushMax)) * 100));
      }
      if (f.isAmbushing) {
        let ap = 0;
        const ph = f.ambushPhase;
        if (ph === 'FRONT_PAUSE' || ph === 'FRONT_LAUNCH') { ap = 0.05; }
        else if (ph === 'BACK_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (CONFIG.toji?.ambushBackChargeDuration || 25))); ap = 0.10 + p * 0.20; }
        else if (ph === 'BACK_STAB' || ph === 'KATANA_DRAW') { ap = 0.35; }
        else if (ph === 'KATANA_CHASE' || ph === 'KATANA_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (CONFIG.toji?.ambushKatanaChargeDuration || 30))); ap = 0.40 + p * 0.20; }
        else if (ph === 'KATANA_SLASH') { ap = 0.65; }
        else if (ph === 'PHANTOM_FLURRY') { ap = 0.65 + ((f.phantomStrikeCount || 0) / (CONFIG.toji?.ambushPhantomFlurryStrikes || 10)) * 0.25; }
        else if (ph === 'FINISHER_DASH' || ph === 'FINISHER_SLASH') { ap = 0.95; }
        ambushPct = Math.max(0, 100 - ap * 100);
      }
      const ultMax = f.ultimateCooldownMax || CONFIG.toji?.ultimateCooldown || 1500;
      const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
      let ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      if (f.ultimateActive) {
        let ap = 0;
        if (f.ultimatePhase === 'CHANNELING') { ap = ((f.ultimateChargeTimer || 0) / (f.ultimateChargeMax || 90)) * 0.15; }
        else if (f.ultimatePhase === 'VANISHED' || f.ultimatePhase === 'STRIKING') { ap = 0.15 + ((f.ultimateAssaultCount || 0) / (CONFIG.toji?.ultimateMaxStrikes || 6)) * 0.40; }
        else if (f.ultimatePhase === 'CRATER_FADEIN') { ap = 0.55 + Math.max(0, 1 - ((f.ultimateCycleTimer || 0) / (f.craterFadeInTotal || 30))) * 0.05; }
        else if (f.ultimatePhase === 'CRATER_CHARGE') { ap = 0.60 + Math.max(0, 1 - ((f.ultimateCycleTimer || 0) / (CONFIG.toji?.ultimateCraterChargeTime || 90))) * 0.35; }
        else if (f.ultimatePhase === 'CRATER_DIVE') { ap = 0.95 + Math.max(0, 1 - ((f.ultimateCycleTimer || 0) / (CONFIG.toji?.ultimateCraterDiveTime || 15))) * 0.05; }
        ultPct = Math.max(0, 100 - ap * 100);
      }
      return [
        { id: 'ambush', pct: ambushPct, ready: ambushPct >= 99, color: themeColor, label: 'STEALTH AMBUSH' },
        { id: 'ult',    pct: ultPct,    ready: ultPct >= 99,    color: themeColor, label: 'HEAVENLY RESTRICTION' },
      ];
    }
    if (f.characterId === 'sukuna' || f.type === 'sukuna') {
      const themeColor = f.color || '#ff4500';
      const domainMax = CONFIG.sukuna?.domainCooldown || 1200;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = CONFIG.sukuna?.domainDuration || 500;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }

      const flameMax = CONFIG.sukuna?.divineFlameCooldown || 1500;
      const flameTimer = f.divineFlameCooldown !== undefined ? f.divineFlameCooldown : flameMax;
      let flamePct;
      if (f.isChannelingDivineFlame) {
        const chargeMax = f.divineFlameChargeMax || 150;
        const chargeTimer = f.divineFlameChargeTimer || 0;
        flamePct = Math.max(0, Math.min(100, (chargeTimer / chargeMax) * 100));
      } else if ((f.divineFlameRecoveryTimer || 0) > 0) {
        flamePct = 0;
      } else {
        flamePct = Math.max(0, Math.min(100, (1 - (flameTimer / flameMax)) * 100));
      }

      return [
        { id: 'ms',     pct: domainPct,  ready: domainPct >= 99,  color: themeColor, label: 'MALEVOLENT SHRINE' },
        { id: 'fuga',   pct: flamePct,   ready: flamePct >= 99,   color: themeColor, label: 'FUGA (FURNACE)' }
      ];
    }
    if (f.characterId === 'mahoraga' || f.type === 'mahoraga') {
      const themeColor = f.color || '#00ff66';
      const cleaveMax = CONFIG.mahoraga?.cleaveCooldown || 600;
      const cleaveTimer = f.cleaveCooldown !== undefined ? f.cleaveCooldown : cleaveMax;
      const cleavePct = Math.max(0, Math.min(100, (1 - (cleaveTimer / cleaveMax)) * 100));

      const shoutMax = CONFIG.mahoraga?.shoutCooldown || 480;
      const shoutTimer = f.shoutCooldown !== undefined ? f.shoutCooldown : shoutMax;
      const shoutPct = Math.max(0, Math.min(100, (1 - (shoutTimer / shoutMax)) * 100));

      const throwMax = CONFIG.mahoraga?.throwCooldown || 1000;
      const throwTimer = f.throwCooldown !== undefined ? f.throwCooldown : throwMax;
      const throwPct = Math.max(0, Math.min(100, (1 - (throwTimer / throwMax)) * 100));

      return [
        { id: 'cleave', pct: cleavePct, ready: cleavePct >= 99, color: themeColor, label: 'SWORD CLEAVE' },
        { id: 'shout',  pct: shoutPct,  ready: shoutPct >= 99,  color: themeColor, label: 'WORLD SHOUT' },
        { id: 'throw',  pct: throwPct,  ready: throwPct >= 99,  color: themeColor, label: 'BLADE BARRAGE' }
      ];
    }
    if (f.characterId === 'layla' || f.type === 'layla') {
      const themeColor = f.color || '#00d5ff';
      const bombMax = CONFIG.layla?.maleficBombCooldown || 400;
      const bombTimer = f.maleficBombCooldown !== undefined ? f.maleficBombCooldown : bombMax;
      const bombPct = Math.max(0, Math.min(100, (1 - (bombTimer / bombMax)) * 100));

      const dashMax = CONFIG.layla?.voidDashCooldown || 240;
      const dashTimer = f.voidDashCooldown !== undefined ? f.voidDashCooldown : dashMax;
      const dashPct = Math.max(0, Math.min(100, (1 - (dashTimer / dashMax)) * 100));

      const ultMax = CONFIG.layla?.destructionBarrageCooldown || 1200;
      const ultTimer = f.destructionBarrageCooldown !== undefined ? f.destructionBarrageCooldown : ultMax;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

      return [
        { id: 'bomb', pct: bombPct, ready: bombPct >= 99, color: themeColor, label: 'MALEFIC BOMB' },
        { id: 'dash', pct: dashPct, ready: dashPct >= 99, color: themeColor, label: 'VOID DASH' },
        { id: 'ult',  pct: ultPct,  ready: ultPct >= 99,  color: themeColor, label: 'DESTRUCTION BARRAGE' }
      ];
    }
    if (f.characterId === 'todo' || f.type === 'todo') {
      const themeColor = f.color || '#eab308';
      const clapMax = CONFIG.todo?.clapCooldown || 60;
      const clapTimer = f.boogieWoogieCooldown !== undefined ? f.boogieWoogieCooldown : clapMax;
      const clapPct = Math.max(0, Math.min(100, (1 - (clapTimer / clapMax)) * 100));

      const rockMax = CONFIG.todo?.rockCooldown || 300;
      const rockTimer = f.rockThrowCooldown !== undefined ? f.rockThrowCooldown : rockMax;
      const rockPct = Math.max(0, Math.min(100, (1 - (rockTimer / rockMax)) * 100));

      return [
        { id: 'clap', pct: clapPct, ready: clapPct >= 99, color: themeColor, label: 'BOOGIE WOOGIE' },
        { id: 'rock', pct: rockPct, ready: rockPct >= 99, color: themeColor, label: 'CURSED ROCK' }
      ];
    }
    if (f.characterId === 'yuji' || f.type === 'yuji') {
      const themeColor = f.color || '#ff69b4';
      const comboMax = CONFIG.yuji?.comboRushCooldown || 600;
      const comboTimer = f.comboRushCooldown !== undefined ? f.comboRushCooldown : comboMax;
      const comboPct = Math.max(0, Math.min(100, (1 - (comboTimer / comboMax)) * 100));

      const rctMax = CONFIG.yuji?.rctCooldown || 900;
      const rctTimer = f.rctCooldown !== undefined ? f.rctCooldown : rctMax;
      const rctPct = Math.max(0, Math.min(100, (1 - (rctTimer / rctMax)) * 100));

      return [
        { id: 'combo', pct: comboPct, ready: comboPct >= 99, color: themeColor, label: 'DIVERGENT FIST' },
        { id: 'rct',   pct: rctPct,   ready: rctPct >= 99,   color: themeColor, label: 'RCT HEAL' }
      ];
    }
    if (f.characterId === 'cronos' || f.type === 'cronos') {
      const themeColor = f.color || '#00e5ff';
      const sphereMax = CONFIG.cronos?.sphereCooldown || 1200;
      const sphereTimer = f.sphereCooldown !== undefined ? f.sphereCooldown : sphereMax;
      const spherePct = Math.max(0, Math.min(100, (1 - (sphereTimer / sphereMax)) * 100));
      return [{ id: 'sphere', pct: spherePct, ready: spherePct >= 99, color: themeColor, label: 'TIME SPHERE' }];
    }
    if (f.characterId === 'musashi' || f.type === 'musashi') {
      const themeColor = f.color || '#3cb371';
      const flurryMax = CONFIG.musashi?.flurryCooldown || 900;
      const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : flurryMax;
      const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));
      return [{ id: 'flurry', pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'NITEN ICHIRYU FLURRY' }];
    }
    if (f.characterId === 'yuta' || f.type === 'yuta') {
      const themeColor = '#ff69b4';

      // 1. Rika Summon Progress Bar
      let rikaPct = 0;
      let rikaLabel = 'RIKA SUMMON';
      const rk = f.rika;
      if (rk && rk.active) {
        const duration = CONFIG.yuta?.rikaDuration || 1000;
        const remaining = rk.timer || 0;
        rikaPct = Math.max(0, Math.min(100, (remaining / duration) * 100));
        rikaLabel = 'RIKA (ACTIVE)';
      } else if (rk && rk.cooldownTimer > 0 && rk.hasSummonedAt50Hp) {
        const maxCd = CONFIG.yuta?.rikaCooldown || 1200;
        rikaPct = Math.max(0, Math.min(100, (1 - (rk.cooldownTimer / maxCd)) * 100));
        rikaLabel = 'RIKA COOLDOWN';
      } else {
        const threshold = CONFIG.yuta?.rikaSummonHpThreshold ?? 0.5;
        rikaPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - threshold)) * 100));
        rikaLabel = 'RIKA SUMMON';
      }

      // 2. Authentic Love Progress Bar
      const domainMax = CONFIG.yuta?.domainCooldown || 1300;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomain) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = CONFIG.yuta?.domainDuration || 800;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }

      return [
        { id: 'rika',   pct: rikaPct,   ready: rikaPct >= 99 && (!rk || !rk.active), color: themeColor, label: rikaLabel },
        { id: 'domain', pct: domainPct, ready: domainPct >= 99 && !f.domainActive,   color: themeColor, label: 'AUTHENTIC MUTUAL LOVE' }
      ];
    }
    if (f.characterId === 'gunslinger' || f.type === 'gunslinger') {
      const themeColor = f.color || '#eab308';
      let pct = 0;
      let label = 'RAPID FIRE';

      if (f.isReloading) {
        const reloadTime = CONFIG.gunslinger?.reloadTime || 90;
        pct = Math.max(0, Math.min(100, (f.reloadTimer / reloadTime) * 100));
        label = 'RELOADING...';
      } else {
        pct = Math.max(0, Math.min(100, (1 - (f.magazineBullets || 0) / (f.maxMagazine || 24)) * 100));
      }

      return [
        { id: 'rapidfire', pct: pct, ready: pct >= 99 && !f.isReloading, color: themeColor, label: label }
      ];
    }

    // Default
    let current = 0;
    let max = 1;
    if (f.skillCooldown !== undefined) {
      current = f.skillCooldown;
      max = (CONFIG[f.type] && CONFIG[f.type].skillCooldown) || 100;
    } else if (f.cooldownTimer !== undefined) {
      current = f.cooldownTimer;
      max = f.cooldown || f.shootCooldownMax || 100;
    }
    const skillPct = Math.max(0, Math.min(100, (1 - (current / max)) * 100));
    
    const color = f.color || '#a491d3';
    const def = f.fighterIndex !== undefined ? FIGHTER_DEFS[f.fighterIndex] : null;
    const ability = def ? (def.ability || def.name) : 'Skill';
    return [{ id: 'skill', pct: skillPct, ready: skillPct >= 99, color, label: ability.toUpperCase() }];
  };

  const generateFighterSkillsHTML = (f, align) => {
    const skills = getSkillDataForFighter(f);

    return skills.map(s => `
      <div class="hud-skill-box align-${align}${s.ready ? ' hud-skill-ready' : ''}" data-skill-id="${s.id}" style="--skill-glow-color: ${s.color}; margin-top: 4px;">
        <div class="hud-skill-box-fill" style="width: ${s.pct}%; background: ${s.color};"></div>
        <div class="hud-skill-box-text" style="text-align: ${align};">${s.label}</div>
      </div>
    `).join('');
  };

  const getAdditionalInfoForFighter = (f) => {
    const info = [];
    const baseDmg = Math.max(0, Number(f.damage) || 0);

    if (f.characterId === 'yuta' || f.type === 'yuta') {
      const isRikaAlive = typeof f.isRikaAliveInDomain === 'function' ? f.isRikaAliveInDomain() : (f.rika && f.rika.active && !f.rika.isDying);
      
      if (f.domainActive && isRikaAlive) {
        const boostDmg = Math.round(baseDmg * ((CONFIG.yuta?.domainRikaDamageMultiplier || 2.0) - 1));
        info.push(`<b>Damage:</b> ${baseDmg} + ${boostDmg} <span style="color: #15803d; font-size: 10px;">▲</span>`);
      } else {
        info.push(`<b>Damage:</b> ${baseDmg}`);
      }

      info.push(`<b>Parries:</b> ${f.parryCount || 0}/${f.targetParriesForFlurry || 5}`);
      
      if (f.domainActive) {
        const domainRctHealRate = CONFIG.yuta?.domainRctHealRate || 0.50;
        const domainRikaRegenMultiplier = CONFIG.yuta?.domainRikaRegenMultiplier || 1.2;
        if (isRikaAlive) {
          info.push(`<b>Regen:</b> ${domainRctHealRate.toFixed(2)} * ${domainRikaRegenMultiplier.toFixed(2)}+ <span style="color: #15803d; font-size: 10px;">▲</span>`);
        } else {
          info.push(`<b>Regen:</b> ${domainRctHealRate.toFixed(2)}+ <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else {
        const regen = CONFIG.yuta?.regenRate || 0.05;
        info.push(`<b>Regen:</b> ${regen.toFixed(2)}+`);
      }
    } else {
      info.push(`<b>Damage:</b> ${baseDmg}`);
      
      if (f.characterId === 'gojo' || f.type === 'gojo') {
        const infinityCooldown = f.infinityCooldown || 0;
        const isLimitlessActive = (infinityCooldown <= 0 || f.infinityActive || (f.infinityBlockTimer || 0) > 0);
        if (isLimitlessActive) {
          info.push(`<b>Infinity:</b> Active`);
        } else {
          info.push(`<b>Infinity:</b> CD`);
        }
      } else if (f.characterId === 'layla' || f.type === 'layla') {
        if (f.powerStacks > 0) {
          info.push(`<b>Power Stacks:</b> ${f.powerStacks}/${f.maxStacks || 10} <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
        if (f.isInUltimate) {
          info.push(`<b>Ultimate:</b> Rapid Fire <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'todo' || f.type === 'todo') {
        if (f.blackFlashTimer > 0) {
          info.push(`<b>The Zone:</b> 120% Potential <span style="color: #15803d; font-size: 10px;">▲</span>`);
        }
      } else if (f.characterId === 'gunslinger' || f.type === 'gunslinger') {
        const baseChance = CONFIG.gunslinger?.critChance || 0.20;
        const baseMult = CONFIG.gunslinger?.critMultiplier || 1.8;
        const currentChance = f.critChance !== undefined ? f.critChance : baseChance;
        const currentMult = f.critMultiplier !== undefined ? f.critMultiplier : baseMult;
        
        const baseChanceVal = Math.round(baseChance * 100);
        const baseMultVal = baseMult.toFixed(2);
        
        const chanceUp = currentChance > baseChance ? ' <span style="color: #15803d; font-size: 10px;">▲</span>' : '';
        const multUp = currentMult > baseMult ? ' <span style="color: #15803d; font-size: 10px;">▲</span>' : '';
        
        let critChanceStr = `${baseChanceVal}%`;
        if (currentChance > baseChance) {
          const boostChance = Math.round((currentChance - baseChance) * 100);
          critChanceStr = `${baseChanceVal}% + ${boostChance}%`;
        }
        
        let critMultStr = `${baseMultVal}x`;
        if (currentMult > baseMult) {
          const boostMult = (currentMult - baseMult).toFixed(2);
          critMultStr = `${baseMultVal} + ${boostMult}x`;
        }
        
        info.push(`<b>Crit Rate:</b> ${critChanceStr}${chanceUp}`);
        info.push(`<b>Crit DMG:</b> ${critMultStr}${multUp}`);
      }
    }
    return info;
  };

  const generateFighterInfoHTML = (f) => {
    const info = getAdditionalInfoForFighter(f);
    if (info.length === 0) return '';
    
    // Initialize tracking structures on fighter if not present
    if (!f._prevHudValues) {
      f._prevHudValues = {};
      f._hudGlowTimers = {};
    }
    
    const linesHTML = info.map(line => {
      // Find the label text inside <b>...</b>
      let labelText = '';
      const labelStart = line.indexOf('<b>');
      const labelEnd = line.indexOf('</b>');
      if (labelStart !== -1 && labelEnd !== -1) {
        labelText = line.substring(labelStart + 3, labelEnd).replace(':', '').trim();
      }
      
      const splitIdx = line.indexOf('</b>');
      const label = splitIdx !== -1 ? line.substring(0, splitIdx + 4) : '';
      const val = splitIdx !== -1 ? line.substring(splitIdx + 4) : line;
      
      const textOnlyVal = val.replace(/<[^>]*>/g, '').trim();
      
      if (labelText) {
        const prevVal = f._prevHudValues[labelText];
        
        if (prevVal !== undefined && prevVal !== textOnlyVal) {
          let isIncrease = true;
          
          const parseVal = (str) => {
            return str.split('+').reduce((acc, part) => {
              const mulParts = part.split(/[*x]/);
              const partVal = mulParts.reduce((mulAcc, p, idx) => {
                const num = parseFloat(p) || 0;
                return idx === 0 ? num : mulAcc * num;
              }, 1);
              return acc + partVal;
            }, 0);
          };
          const prevNum = parseVal(prevVal);
          const currNum = parseVal(textOnlyVal);
          
          if (!isNaN(prevNum) && !isNaN(currNum) && prevNum !== currNum) {
            isIncrease = currNum > prevNum;
          } else {
            // String deactivation checks
            if (textOnlyVal.includes('CD') || prevVal.includes('Active')) {
              isIncrease = false;
            }
          }
          
          f._hudGlowTimers[labelText] = isIncrease ? 45 : -45;
        }
        
        // Save current value
        f._prevHudValues[labelText] = textOnlyVal;
        
        // Tick timer towards 0
        const timer = f._hudGlowTimers[labelText] || 0;
        if (timer > 0) f._hudGlowTimers[labelText]--;
        else if (timer < 0) f._hudGlowTimers[labelText]++;
      }
      
      let glowClass = '';
      if (labelText) {
        const timer = f._hudGlowTimers[labelText] || 0;
        if (timer > 0) glowClass = ' glow-green';
        else if (timer < 0) glowClass = ' glow-red';
      }
      
      let valFontSize = 13;
      const textOnly = val.replace(/<[^>]*>/g, '').trim();
      if (textOnly.length > 14) {
        valFontSize = Math.max(11, 13 - (textOnly.length - 14) * 0.4);
      }
      
      if (splitIdx !== -1) {
        return `<div class="${glowClass}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}<span style="font-size: ${valFontSize.toFixed(1)}px; margin-left: 2px;">${val}</span></div>`;
      }
      return `<div class="${glowClass}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${line}</div>`;
    }).join('');

    return `
      <div class="health-card__info">
        ${linesHTML}
      </div>
    `;
  };

  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '', kills = [], maxBullets = 5, targetFighter = null, titleAlign = 'left' }) => {
    const safeRatio = Number.isFinite(fillRatio) ? Math.max(0, Math.min(1, fillRatio)) : 0;
    const shakeAmount = shakeTimer > 0 ? Math.sin((12 - shakeTimer) * 0.75) * 3 : 0;
    const shakeStyle = shakeTimer > 0 ? `transform: translateX(${shakeAmount}px);` : '';
    // Winner effect - no glow
    const winnerStyle = '';

    const getGlowStyles = (f) => {
      if (!f) return { glowStyle: '', glowClass: '' };
      if (f._lastHp === undefined) {
        f._lastHp = f.hp;
      } else {
        const delta = f.hp - f._lastHp;
        if (delta < -0.1) f._healthBarHitTimer = 14;
        else if (delta > 0.1) f._healthBarHealTimer = 14;
        f._lastHp = f.hp;
      }
      if (f._healthBarHitTimer > 0) f._healthBarHitTimer--;
      if (f._healthBarHealTimer > 0) f._healthBarHealTimer--;

      const hitTimer = f._healthBarHitTimer || 0;
      const healTimer = f._healthBarHealTimer || 0;

      if (hitTimer > 0) {
        const alpha = (hitTimer / 14).toFixed(2);
        const intensity = (1 + 0.35 * (hitTimer / 14)).toFixed(2);
        return {
          glowStyle: `box-shadow: 0 0 14px 2px rgba(255, 30, 30, ${alpha}), inset 0 0 8px 2px rgba(255, 255, 255, ${alpha}); filter: brightness(${intensity});`,
          glowClass: ' hit-glow'
        };
      } else if (healTimer > 0) {
        const alpha = (healTimer / 14).toFixed(2);
        const intensity = (1 + 0.35 * (healTimer / 14)).toFixed(2);
        return {
          glowStyle: `box-shadow: 0 0 14px 2px rgba(34, 197, 94, ${alpha}), inset 0 0 8px 2px rgba(255, 255, 255, ${alpha}); filter: brightness(${intensity});`,
          glowClass: ' heal-glow'
        };
      }
      return { glowStyle: '', glowClass: '' };
    };

    let barsHTML = '';
    if (members && members.length > 0) {
      barsHTML = members.map(m => {
        const ratio = m.maxHp > 0 ? Math.max(0, Number(m.hp) / Number(m.maxHp)) : 0;
        const percent = Math.round(ratio * 100);
        const barColor = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
        const { glowStyle, glowClass } = getGlowStyles(m);
        const fillStyle = `width:${percent}%; background:${barColor}; ${glowStyle}`;
        const hpText = `${Math.floor(Math.max(0, Number(m.hp) || 0))}/${Math.floor(Math.max(0, Number(m.maxHp) || 0))}`;
        return `
          <div class="health-card__member" style="margin-top: 6px;">
            <div style="font-size: 12px; margin-bottom: 4px; color: #000; font-weight: bold;">${m.name || ('PLAYER ' + (state.fighters.indexOf(m) + 1))}</div>
            <div class="health-card__bar${glowClass}">
              <div class="health-card__fill${glowClass}" style="${fillStyle}"></div>
              <span class="health-card__bar-text">${hpText}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      const percent = Math.round(safeRatio * 100);
      const barColor = safeRatio > 0.5 ? '#22c55e' : safeRatio > 0.25 ? '#eab308' : '#ef4444';
      const { glowStyle, glowClass } = getGlowStyles(targetFighter);
      const fillStyle = `width:${percent}%; background:${barColor}; ${glowStyle}`;
      
      const isDummy = targetFighter && (targetFighter.characterId === 'dummy' || targetFighter.type === 'dummy');
      const skillsHTML = targetFighter && !isDummy ? generateFighterSkillsHTML(targetFighter, 'left') : '';
      const infoHTML = targetFighter ? generateFighterInfoHTML(targetFighter) : '';

      barsHTML = `
        <div class="health-card__bar${glowClass}">
          <div class="health-card__fill${glowClass}" style="${fillStyle}"></div>
          <span class="health-card__bar-text">${metaValue}</span>
        </div>
        ${isDummy ? `
          ${infoHTML}
          <div class="health-card__desc" style="color: #666666;">
            ${description}
          </div>
        ` : `
          <div class="health-card__skills">
            ${skillsHTML}
          </div>
          ${infoHTML}
        `}
      `;
    }

    // Auto-scale title font size for long names
    const baseFontSize = extraClass.includes('ffa-card') ? 13 : 16;
    const maxChars = extraClass.includes('ffa-card') ? 10 : 12;
    const minFontSize = 9;
    let titleFontSize = baseFontSize;
    if (title.length > maxChars) {
      titleFontSize = Math.max(minFontSize, Math.floor(baseFontSize * maxChars / title.length));
    }
    const titleStyle = titleFontSize < baseFontSize ? `font-size:${titleFontSize}px;` : '';
    const nameColor = '#000000';

    // Generate victory bullets (filled bullets for wins)
    const winsBullets = Array.from({ length: maxBullets }, (_, i) => {
      const filled = i < wins;
      return `<span class="health-card__win-bullet" style="background: ${filled ? '#ffd700' : 'rgba(0,0,0,0.2)'}; ${filled ? 'box-shadow: 0 0 6px rgba(255,215,0,0.6);' : ''}"></span>`;
    }).join('');

    return `
      <div class="health-card" style="${shakeStyle}${winnerStyle} background: transparent; border: none; border-radius: 0; padding: 0; box-shadow: none;">
        ${title ? `<div class="health-card__title" style="${titleStyle}color: ${nameColor}; display: block; margin-bottom: 2px; font-weight: bold; text-align: ${titleAlign};">${title}</div>` : ''}
        ${maxBullets > 0 ? `<div class="health-card__wins" style="margin: 4px 0 6px; display: flex; gap: 6px; justify-content: ${titleAlign === 'right' ? 'flex-end' : 'flex-start'};">${winsBullets}</div>` : ''}
        ${barsHTML}
      </div>
    `;
  };

  if (teamMode) {
    const teamLabels = is1v2 ? [
      { title: '', color: '#ff4d4d', indexes: [0], key: 'red' },
      { title: '', color: '#4da3ff', indexes: [1, 2], key: 'blue' },
    ] : [
      { title: 'RED TEAM', color: '#ff4d4d', indexes: [0, 1], key: 'red' },
      { title: 'BLUE TEAM', color: '#4da3ff', indexes: [2, 3], key: 'blue' },
    ];

    teamLabels.forEach((team, teamIndex) => {
      const members = team.indexes.map((fighterIndex) => fighters[fighterIndex]).filter(Boolean);
      const shakeTimer = members.reduce((max, fighter) => Math.max(max, fighter._healthBarShakeTimer || 0), 0);
      const isWinner = state.roundWinner && team.indexes.some(idx => fighters[idx] === state.roundWinner);

      const cardHTML = buildCard({
        title: team.title,
        scoreText: `${teamScores[teamIndex] || 0} WINS`,
        fillColor: team.color,
        members: members,
        extraClass: team.key,
        shakeTimer,
        isWinner: isWinner,
        borderColor: isWinner ? '#ffd700' : null,
        kills: members.flatMap(m => state.matchKills ? state.matchKills[m] || [] : []),
        maxBullets: is1v2 ? 0 : 3,
        titleAlign: teamIndex === 0 ? 'left' : 'right'
      });
      cardsBottom.push(cardHTML);
    });
  } else {
    fighters.forEach((fighter, index) => {
      if (!fighter || fighter.isTurret) return;
      const ratio = fighter.maxHp > 0 ? Math.max(0, Number(fighter.hp) / Number(fighter.maxHp)) : 0;
      const color = fighter.color || '#fff';
      const fighterName = fighter.name || `FIGHTER ${index + 1}`;
      const fighterStats = state.leaderboard[fighter.fighterIndex] || { wins: 0, losses: 0 };
      const careerWins = fighterStats.wins;
      const losses = fighterStats.losses;
      const totalGames = careerWins + losses;
      const winRate = totalGames > 0 ? Math.round((careerWins / totalGames) * 100) : 0;
      const fighterDef = fighter.fighterIndex !== undefined ? FIGHTER_DEFS[fighter.fighterIndex] : null;
      const className = fighterDef ? fighterDef.type.toUpperCase() : '';
      const shakeTimer = fighter._healthBarShakeTimer || 0;
      const matchWins = scores[index] || 0;

      let cardDesc = (fighterDef && mode !== GAME_MODES.FFA) ? fighterDef.desc : '';
      if (fighterDef && fighterDef.type === 'dummy') {
        const checkedStr = state.dummyAggressive ? 'checked' : '';
        cardDesc = `
            <div class="dummy-aggressive-toggle" style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); cursor: pointer; pointer-events: auto;">
              <span style="font-weight: bold; font-size: 11px; color: ${state.dummyAggressive ? '#ef4444' : '#aaa'}; pointer-events: none;">AGGRESSIVE MODE</span>
              <label style="position: relative; display: inline-block; width: 34px; height: 18px; pointer-events: none;">
                <input type="checkbox" ${checkedStr} style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: ${state.dummyAggressive ? '#ef4444' : '#555'}; border-radius: 18px; transition: .2s;">
                  <span style="position: absolute; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; border-radius: 50%; transition: .2s; transform: ${state.dummyAggressive ? 'translateX(16px)' : 'none'};"></span>
                </span>
              </label>
            </div>
          `;
      }

      const cardHTML = buildCard({
        title: fighterName,
        scoreText: totalGames > 0 ? `${winRate}% WR` : '',
        fillColor: color,
        fillRatio: ratio,
        metaLabel: `DMG: ${Math.max(0, Number(fighter.damage) || 0)}`,
        metaValue: `${Math.floor(Math.max(0, Number(fighter.hp) || 0))}/${Math.floor(Math.max(0, Number(fighter.maxHp) || 0))}`,
        extraClass: mode === GAME_MODES.FFA ? 'ffa-card' : '',
        borderColor: color,
        wins: matchWins,
        fighterColor: color,
        shakeTimer,
        isWinner: fighter === state.roundWinner,
        description: cardDesc,
        kills: (mode === GAME_MODES.FFA) && state.matchKills ? state.matchKills[index] || [] : [],
        maxBullets: mode === GAME_MODES.STAND_OFF ? 0 : 2,
        targetFighter: fighter,
        titleAlign: (mode === GAME_MODES.FFA) ? 'left' : (index % 2 === 0 ? 'left' : 'right')
      });

      if (mode === GAME_MODES.FFA || mode === GAME_MODES.ONE_VS_ONE || mode === '1v1' || mode === GAME_MODES.STAND_OFF || mode === 'TLFS') {
        cardsBottom.push(cardHTML);
      } else if (index % 2 === 0) {
        cardsLeft.push(cardHTML);
      } else {
        cardsRight.push(cardHTML);
      }
    });
  }

  const leftHTML = cardsLeft.join('');
  if (containerLeft && containerLeft.innerHTML !== leftHTML) containerLeft.innerHTML = leftHTML;

  const rightHTML = cardsRight.join('');
  if (containerRight && containerRight.innerHTML !== rightHTML) containerRight.innerHTML = rightHTML;

  const bottomHTML = cardsBottom.join('');
  if (containerBottom && containerBottom.innerHTML !== bottomHTML) containerBottom.innerHTML = bottomHTML;
  
  if (containerBottom) {
    containerBottom.style.top = '';
  }
}

