import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { isFighterEffectivelyAlive } from '../../systems/physics.js';
import { TEAM_PALETTES, ROYALE_PALETTES } from './HorizontalTeamSelectScreen.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawChamferedRect } from './uiFramework.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HORIZONTAL HUD MANAGER (16:9 Panoramic Widescreen Combat HUD)
 * Renders high-visibility 1v1 duel meters or multi-team status pods with
 * authentic 90s retro arcade & pixel manga aesthetics across 16:9 widescreen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function drawHorizontalPanoramicHud(ctx) {
  if (state.viewOrientation !== 'horizontal') return;
  if (state.gameState !== 'playing' && state.gameState !== 'countdown' && state.gameState !== 'roundEnd' && state.gameState !== 'matchEnd') return;

  const w = state.canvas.width || 960;
  const fighters = state.fighters || [];
  if (fighters.length === 0) return;

  const mainFighters = fighters.filter(f => f && !f.isIllusion && !f.isTurret && !f.isMinion && !f.isEndCrystal && !f.isDeployable);
  const currentMode = state.mode || '';
  const is1v1 = (currentMode === GAME_MODES.HORIZONTAL_1V1 || currentMode === '1v1 Widescreen Duel' || (mainFighters.length === 2 && !currentMode.includes('2v2') && !currentMode.includes('4v4') && !currentMode.includes('3v3v3v3') && !currentMode.includes('Battle Royale')));

  ctx.save();

  if (is1v1 && mainFighters.length >= 2) {
    _draw1v1WidescreenHud(ctx, mainFighters[0], mainFighters[1], w);
  } else {
    _drawMultiTeamPanoramicHud(ctx, mainFighters, w);
  }

  ctx.restore();
}

/**
 * Renders dedicated 1v1 Widescreen HUD (P1 vs P2 Arcade Duel Layout).
 */
function _draw1v1WidescreenHud(ctx, p1, p2, w) {
  const podW = 390;
  const podH = 50;
  const podY = 10;
  const p1X = 18;
  const p2X = w - 18 - podW;
  const centerX = w / 2;

  // ── P1 HERO POD (LEFT) ──
  _draw1v1HeroPod(ctx, p1X, podY, podW, podH, p1, TEAM_PALETTES[0], true);

  // ── P2 HERO POD (RIGHT) ──
  _draw1v1HeroPod(ctx, p2X, podY, podW, podH, p2, TEAM_PALETTES[1], false);

  // ── CENTER TIMER & ROUND BADGE ──
  const centerW = 120;
  const centerH = 50;
  const cX = centerX - centerW / 2;

  // 3D Chamfered Center Container
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  drawChamferedRect(ctx, cX + 2, podY + 3, centerW, centerH, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.8;
  drawChamferedRect(ctx, cX, podY, centerW, centerH, 6);
  ctx.fill();
  ctx.stroke();

  // Match Timer
  const totalSec = Math.floor((state.matchTimer || 0) / 60);
  const minStr = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const secStr = String(totalSec % 60).padStart(2, '0');

  ctx.font = '900 18px "Outfit", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${minStr}:${secStr}`, centerX, podY + 20);

  // Round / VS Label
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.fillStyle = '#FFD700';
  const roundText = (state.roundNum && state.roundNum > 1) ? `ROUND ${state.roundNum}` : '⚔️ VS ⚔️';
  ctx.fillText(roundText, centerX, podY + 38);
}

/**
 * Draws an individual 1v1 hero health pod with high-visibility healthbar.
 */
function _draw1v1HeroPod(ctx, x, y, w, h, fighter, pal, isP1) {
  ctx.save();
  const isAlive = isFighterEffectivelyAlive(fighter);
  const curHp = Math.max(0, fighter.hp || 0);
  const maxHp = Math.max(1, fighter.maxHp || 200);
  const hpRatio = isAlive ? Math.max(0, Math.min(1, curHp / maxHp)) : 0;

  // 3D Panel Shadow & Body
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  drawChamferedRect(ctx, x + 2, y + 3, w, h, 8);
  ctx.fill();

  ctx.fillStyle = isAlive ? 'rgba(10, 14, 24, 0.92)' : 'rgba(15, 18, 26, 0.70)';
  ctx.strokeStyle = isAlive ? pal.border : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.8;
  drawChamferedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Avatar Anchor (Left flank for both pods)
  const avatarR = 18;
  const avatarX = x + 28;
  const avatarY = y + h / 2;

  // Outer glow and fighter circle
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.fillStyle = fighter.color || pal.color;
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Symmetrical pixel hands (Rule 20)
  const handR = Math.max(4, Math.round(avatarR * 0.30));
  const handOffsetX = Math.round(avatarR * 0.82);
  const handOffsetY = Math.round(avatarR * 0.38);
  const handColor = fighter.handColor || fighter.color || pal.color;
  drawPixelHand(ctx, avatarX - handOffsetX, avatarY + handOffsetY, handR, handColor, '#0E0F14');
  drawPixelHand(ctx, avatarX + handOffsetX, avatarY + handOffsetY, handR, handColor, '#0E0F14');

  // Initial letter
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 13px "Outfit", "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = (fighter.name || fighter._def?.name || fighter.characterId || 'FIGHTER').toUpperCase();
  ctx.fillText(name.charAt(0), avatarX, avatarY + 1);

  // Content positioning (Clean Left aligned)
  const contentX = x + 56;
  const contentW = w - 70;

  // Fighter Name & Role (Left aligned)
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 13px "Outfit", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = isAlive ? '#FFFFFF' : '#64748B';
  ctx.fillText(name, contentX, y + 20);

  // Health Number (e.g. 180 / 200) - Right aligned
  ctx.font = '900 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = isAlive ? pal.color : '#64748B';
  ctx.fillText(`${Math.ceil(curHp)} / ${maxHp}`, contentX + contentW, y + 20);

  // Main Health Bar Track
  const barY = y + 26;
  const barH = 14;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;
  drawChamferedRect(ctx, contentX, barY, contentW, barH, 3);
  ctx.fill();
  ctx.stroke();

  // Health Bar Fill
  if (hpRatio > 0) {
    const fillW = Math.max(4, contentW * hpRatio);
    const fillX = contentX;

    const grad = ctx.createLinearGradient(fillX, barY, fillX + fillW, barY);
    if (isP1) {
      grad.addColorStop(0, '#FF3366');
      grad.addColorStop(1, '#FF6B00');
    } else {
      grad.addColorStop(0, '#00D2FF');
      grad.addColorStop(1, '#00F5D4');
    }
    ctx.fillStyle = grad;
    drawChamferedRect(ctx, fillX, barY, fillW, barH, 3);
    ctx.fill();

    // Specular top glint line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(fillX + 2, barY + 1, fillW - 4, 2);
  }

  ctx.restore();
}

/**
 * Renders Multi-Team Panoramic HUD (4v4, 8-Royale, 3v3v3v3, 2v2v2v2).
 */
function _drawMultiTeamPanoramicHud(ctx, fighters, w) {
  // 1. Group fighters by team
  const teams = [[], [], [], []];
  let totalAlive = 0;
  let totalFighters = 0;

  fighters.forEach((f, idx) => {
    if (!f || f.isIllusion || f.isTurret || f.isMinion || f.isEndCrystal || f.isDeployable) return;
    const teamIdx = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(idx) : 0;
    if (teamIdx !== null && teamIdx >= 0 && teamIdx < 4) {
      teams[teamIdx].push({ fighter: f, index: idx });
      totalFighters++;
      if (isFighterEffectivelyAlive(f)) {
        totalAlive++;
      }
    }
  });

  const activeTeams = teams.filter(t => t.length > 0);
  const teamCount = activeTeams.length || 4;

  const podH = 44;
  const podY = 8;
  const startX = 20;
  const totalAvailW = w - 40;
  const gap = 12;
  const podW = (totalAvailW - (teamCount - 1) * gap) / teamCount;

  // 2. Draw Active Team Pods
  let drawIdx = 0;
  for (let t = 0; t < 4; t++) {
    const teamFighters = teams[t];
    if (!teamFighters || teamFighters.length === 0) continue;

    const pal = TEAM_PALETTES[t];
    const px = startX + drawIdx * (podW + gap);
    drawIdx++;

    const aliveInTeam = teamFighters.filter(item => isFighterEffectivelyAlive(item.fighter)).length;
    const isWiped = (aliveInTeam === 0);

    // Pod Background with 3D drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    drawChamferedRect(ctx, px + 2, podY + 3, podW, podH, 6);
    ctx.fill();

    ctx.fillStyle = isWiped ? 'rgba(15, 18, 26, 0.70)' : 'rgba(10, 14, 24, 0.90)';
    ctx.strokeStyle = isWiped ? 'rgba(255, 255, 255, 0.15)' : pal.border;
    ctx.lineWidth = isWiped ? 1.0 : 1.6;
    drawChamferedRect(ctx, px, podY, podW, podH, 6);
    ctx.fill();
    ctx.stroke();

    // Pod Header: Team Name + Alive Count
    ctx.font = '900 11px "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = isWiped ? '#64748B' : pal.color;
    ctx.fillText(`${pal.name}: ${aliveInTeam}/${teamFighters.length}`, px + 8, podY + 16);

    // Mini Healthbars for each team member
    const barStartY = podY + 22;
    const barCount = teamFighters.length;
    const barGap = 4;
    const totalBarW = podW - 16;
    const singleBarW = (totalBarW - (barCount - 1) * barGap) / barCount;
    const barH = 12;

    teamFighters.forEach((item, slotIdx) => {
      const f = item.fighter;
      const bx = px + 8 + slotIdx * (singleBarW + barGap);
      const isAlive = isFighterEffectivelyAlive(f);
      const hpRatio = isAlive ? Math.max(0, Math.min(1, f.hp / (f.maxHp || 1))) : 0;

      // Bar Track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(bx, barStartY, singleBarW, barH);

      // Bar Fill
      if (hpRatio > 0) {
        ctx.fillStyle = pal.color;
        ctx.fillRect(bx, barStartY, singleBarW * hpRatio, barH);

        // Highlight glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(bx, barStartY, singleBarW * hpRatio, 2);
      }

      // Border
      ctx.strokeStyle = '#0E0F14';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, barStartY, singleBarW, barH);
    });
  }

  // 3. Center Survivor Badge
  const badgeW = 120;
  const badgeH = 22;
  const bx = (w - badgeW) / 2;
  const by = podY + podH + 6;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.0;
  drawChamferedRect(ctx, bx, by, badgeW, badgeH, 11);
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 11px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`⚡ ${totalAlive} / ${totalFighters} ALIVE`, w / 2, by + 11);
}
