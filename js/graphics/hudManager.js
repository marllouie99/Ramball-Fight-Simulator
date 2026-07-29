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
  
  if (containerBottom) containerBottom.style.opacity = hudOpacity;
  if (containerLeft) containerLeft.style.opacity = hudOpacity;
  if (containerRight) containerRight.style.opacity = hudOpacity;

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


  const buildCard = ({ title, scoreText, fillColor, fillRatio, metaLabel, metaValue, members = null, extraClass = '', borderColor = null, wins = 0, fighterColor = null, shakeTimer = 0, isWinner = false, description = '', kills = [], maxBullets = 5, targetFighter = null }) => {
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
        return `
          <div class="health-card__member" style="margin-top: 6px;">
            <div style="font-size: 12px; margin-bottom: 4px; color: #000; font-weight: bold;">${m.name || ('PLAYER ' + (state.fighters.indexOf(m) + 1))}</div>
            <div class="health-card__bar${glowClass}">
              <div class="health-card__fill${glowClass}" style="${fillStyle}"></div>
            </div>
            <div class="health-card__meta" style="justify-content: flex-end; gap: 6px;"><span>HP</span><span>${Math.floor(Math.max(0, Number(m.hp) || 0))}/${Math.floor(Math.max(0, Number(m.maxHp) || 0))}</span></div>
          </div>
        `;
      }).join('');
    } else if (targetFighter && (targetFighter.type === 'yuta' || (targetFighter._def && targetFighter._def.id === 'yuta'))) {
      const f = targetFighter;
      let rikaStatus = '<span style="color: #16a34a; font-weight: bold;">READY</span>';
      if (f.rika && f.rika.active) {
        rikaStatus = `<span style="color: #db2777; font-weight: bold;">ACTIVE (${(Math.max(0, f.rika.timer || 0) / 60).toFixed(1)}s)</span>`;
      } else if (f.rika && f.rika.cooldownTimer > 0) {
        rikaStatus = `<span style="color: #d97706; font-weight: bold;">${(f.rika.cooldownTimer / 60).toFixed(1)}s</span>`;
      }

      let domainStatus = '<span style="color: #16a34a; font-weight: bold;">READY</span>';
      if (f.domainActive) {
        domainStatus = `<span style="color: #9333ea; font-weight: bold;">ACTIVE (${(Math.max(0, f.domainTimer || 0) / 60).toFixed(1)}s)</span>`;
      } else if (f.domainCooldownTimer > 0) {
        domainStatus = `<span style="color: #d97706; font-weight: bold;">${(f.domainCooldownTimer / 60).toFixed(1)}s</span>`;
      }

      const parryCount = f.parryCount || 0;
      const targetParries = f.targetParriesForFlurry || 3;
      const parryStatus = `<span style="color: #0284c7; font-weight: bold;">${parryCount}/${targetParries}</span>`;

      barsHTML = `
        <div class="hud-cooldowns" style="margin: 4px 0 6px; font-family: Arial, sans-serif; font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; justify-content: space-between; color: #000000;">
            <span style="font-weight: bold;">RIKA SUMMON</span>
            <span>${rikaStatus}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #000000;">
            <span style="font-weight: bold;">DOMAIN EXPANSION</span>
            <span>${domainStatus}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #000000;">
            <span style="font-weight: bold;">PARRY COUNTER</span>
            <span>${parryStatus}</span>
          </div>
        </div>
        <div class="health-card__meta" style="font-size: 13px; font-weight: bold; color: #000000; margin-top: 4px;"><span>DMG: ${Math.max(0, Number(f.damage) || 0)}</span><span>${Math.floor(Math.max(0, Number(f.hp) || 0))}/${Math.floor(Math.max(0, Number(f.maxHp) || 0))}</span></div>
      `;
    } else {
      const percent = Math.round(safeRatio * 100);
      const barColor = safeRatio > 0.5 ? '#22c55e' : safeRatio > 0.25 ? '#eab308' : '#ef4444';
      const { glowStyle, glowClass } = getGlowStyles(targetFighter);
      const fillStyle = `width:${percent}%; background:${barColor}; ${glowStyle}`;
      barsHTML = `
        <div class="health-card__bar${glowClass}">
          <div class="health-card__fill${glowClass}" style="${fillStyle}"></div>
        </div>
        <div class="health-card__meta" style="font-size: 13px; font-weight: bold; color: #000000;"><span>${metaLabel}</span><span>${metaValue}</span></div>
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
        ${title ? `<div class="health-card__title" style="${titleStyle}color: ${nameColor}; display: block; margin-bottom: 2px; font-weight: bold;">${title}</div>` : ''}
        ${maxBullets > 0 ? `<div class="health-card__wins" style="margin: 4px 0 6px; display: flex; gap: 6px;">${winsBullets}</div>` : ''}
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
        maxBullets: is1v2 ? 0 : 3
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
        targetFighter: fighter
      });

      if (is1v1) {
        // We will handle 1v1 in the new HUD
        // But we still push to cardsBottom if we want the old health bar.
        // Actually, the user wants the new redesign to replace the old one for 1v1.
        // We will skip pushing to cardsBottom for 1v1, except maybe we want to keep health?
        // Let's just NOT push to cardsBottom so it's hidden, and we'll use the new HUD exclusively.
      } else if (mode === GAME_MODES.FFA) {
        cardsBottom.push(cardHTML);
      } else if (index % 2 === 0) {
        cardsLeft.push(cardHTML);
      } else {
        cardsRight.push(cardHTML);
      }
    });
  }

  const getSkillProgress = (f) => {
    if (!f) return 100;
    let current = 0;
    let max = 1;
    if (f.type === 'yuta') {
      current = Math.max(0, f.domainCooldownTimer || 0);
      max = CONFIG.yuta.domainCooldown || 1500;
    } else if (f.type === 'gunslinger') {
      current = f.skillTimer || 0;
      max = CONFIG.gunslinger.skillCooldown || 300;
    } else if (f.skillCooldown !== undefined) {
      current = f.skillCooldown;
      max = (CONFIG[f.type] && CONFIG[f.type].skillCooldown) || 100;
    } else if (f.cooldownTimer !== undefined) {
      current = f.cooldownTimer;
      max = f.cooldown || f.shootCooldownMax || 100;
    }
    // Return percentage (100 means ready, 0 means just used)
    return Math.max(0, Math.min(100, (1 - (current / max)) * 100));
  };

  // Populate new 1v1 HUD
  if (is1v1 && fighters.length >= 2) {
    const f1 = fighters[0];
    const f2 = fighters[1];
    
    if (f1 && !f1.isTurret) {
      if (topHudLeft) {
        topHudLeft.innerHTML = f1.name || 'FIGHTER 1';
        topHudLeft.style.color = f1.color || '#a491d3';
        topHudLeft.style.textAlign = 'left';
      }
      if (bottomHudLeft) {
        bottomHudLeft.style.alignItems = 'flex-start';
        bottomHudLeft.style.textAlign = 'left';
        
        const def = f1.fighterIndex !== undefined ? FIGHTER_DEFS[f1.fighterIndex] : null;
        const ability = def ? (def.ability || def.name) : 'Skill';
        const dmg = Math.max(0, Number(f1.damage) || 0);
        const skillPct = getSkillProgress(f1);
        const color = f1.color || '#a491d3';
        bottomHudLeft.innerHTML = `
          <div class="hud-skill-box">
            <div class="hud-skill-box-fill" style="width: ${skillPct}%; background: ${color}; opacity: 0.8;"></div>
            <div class="hud-skill-box-text">${ability}</div>
          </div>
          <div class="hud-damage-text" style="color: ${color};">Damage: ${dmg}</div>
        `;
      }
    }
    
    if (f2 && !f2.isTurret) {
      if (topHudRight) {
        topHudRight.innerHTML = f2.name || 'FIGHTER 2';
        topHudRight.style.color = f2.color || '#eab308';
        topHudRight.style.textAlign = 'right';
      }
      if (bottomHudRight) {
        bottomHudRight.style.alignItems = 'flex-end';
        bottomHudRight.style.textAlign = 'right';
        
        const def = f2.fighterIndex !== undefined ? FIGHTER_DEFS[f2.fighterIndex] : null;
        const ability = def ? (def.ability || def.name) : 'Skill';
        const dmg = Math.max(0, Number(f2.damage) || 0);
        const skillPct = getSkillProgress(f2);
        const color = f2.color || '#eab308';
        bottomHudRight.innerHTML = `
          <div class="hud-skill-box">
            <div class="hud-skill-box-fill" style="width: ${skillPct}%; background: ${color}; opacity: 0.8;"></div>
            <div class="hud-skill-box-text">${ability}</div>
          </div>
          <div class="hud-damage-text" style="color: ${color};">Damage: ${dmg}</div>
        `;
      }
    }
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

