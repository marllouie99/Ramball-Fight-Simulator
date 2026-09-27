// ─────────────────────────────────────────────────────────────
// NATURAL HUD SHATTER SYSTEM (DIRECTIONAL TOP NAMES & BOTTOM HUD)
// High-impact manga-style HUD destruction on Serious Counter punch.
// Directional rules:
// - ONLY shatters TOP Arena Match Names when punch is directed UPWARDS into top wall
// - ONLY shatters BOTTOM HUD when punch is directed DOWNWARDS into bottom wall
// - Sideways punches into side walls leave Top/Bottom HUD intact and untouched
// - Shatter epicenter & velocities originate physically from the punch hit point (hitX)
// ─────────────────────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { findArenaWallIntersection } from './saitamaWallShatter.js';
import { getSkillDataForFighter, shouldShowFighterSkill, shouldShowHudSkillBars, shouldShowHudStats } from '../ui/hudSkillProviders.js';
import { getFighterHealthBarColor } from '../hudManager.js';

/**
 * Checks whether a given point (px, py) is strictly inside the frontal supersonic cone / corridor
 * of Saitama's counter punch blast.
 * @param {number} px - Target coordinate X
 * @param {number} py - Target coordinate Y
 * @param {number} originX - Saitama punch origin X
 * @param {number} originY - Saitama punch origin Y
 * @param {number} punchAngle - Serious Punch release angle
 * @param {number} [halfArc=((14 * Math.PI) / 180)] - Frontal half-arc angle
 * @param {number} [padding=40] - Base beam width padding
 * @returns {boolean}
 */
export function isInsideSaitamaFrontalBlast(px, py, originX, originY, punchAngle, halfArc = ((14 * Math.PI) / 180), padding = 40) {
  const cosA = Math.cos(punchAngle);
  const sinA = Math.sin(punchAngle);

  const dx = px - originX;
  const dy = py - originY;

  // Longitudinal distance projected along punch ray
  const projDist = dx * cosA + dy * sinA;
  if (projDist <= 0) {
    return false; // Point is behind Saitama's punch direction
  }

  // Perpendicular offset from the punch central ray
  const perpDist = Math.abs(-dx * sinA + dy * cosA);

  // Width of frontal supersonic cone at distance projDist
  const beamHalfWidth = Math.max(padding, projDist * Math.tan(halfArc) + padding);

  return perpDist <= beamHalfWidth;
}

/**
 * Triggers a natural directional HUD shatter effect based on punch trajectory.
 * @param {number} originX - Shockwave origin X
 * @param {number} originY - Shockwave origin Y
 * @param {number} punchAngle - Serious Punch release angle
 * @param {object} arena - Arena bounds
 * @param {object|Array} [hits=null] - Precalculated wall intersection details (single hit or array)
 */
export function triggerHudShatter(originX, originY, punchAngle, arena, hits = null) {
  if (!arena && typeof state !== 'undefined') arena = state.arena;
  if (!arena) return;

  const hitList = Array.isArray(hits) ? hits : (hits ? [hits] : []);
  if (hitList.length === 0) {
    const singleHit = findArenaWallIntersection(originX, originY, punchAngle, arena);
    if (singleHit) hitList.push(singleHit);
  }
  if (hitList.length === 0) return;

  const sinA = Math.sin(punchAngle);
  const isUpward = sinA < -0.30;
  const isDownward = sinA > 0.30;

  // Strict Directional Target Determination:
  // - Top Target: ONLY when punch trajectory is directed UPWARDS into top wall / upper dome
  const topHit = isUpward ? hitList.find(h => h.wallType === 'top' || (h.wallType === 'circle' && h.y <= (arena.y + arena.height * 0.35))) : null;
  // - Bottom Target: ONLY when punch trajectory is directed DOWNWARDS into bottom wall / lower dome
  const bottomHit = isDownward ? hitList.find(h => h.wallType === 'bottom' || (h.wallType === 'circle' && h.y >= (arena.y + arena.height * 0.65))) : null;

  const isTopTarget = Boolean(topHit);
  const isBottomTarget = Boolean(bottomHit);

  // If punch was directed sideways into left or right wall only, DO NOT shatter Top or Bottom HUD
  if (!isTopTarget && !isBottomTarget) {
    return;
  }

  const maxLife = 220;
  let topNameShatter = state.hudShatters?.topNameShatter || null;
  let bottomHudShatter = state.hudShatters?.bottomHudShatter || null;

  if (isTopTarget && topHit) {
    if (!topNameShatter) {
      topNameShatter = generateTopNameShatters(arena, punchAngle, topHit.x, maxLife, originX, originY);
    } else {
      // Re-trigger & violently re-accelerate all glyph shards inside the new punch cone
      const halfArc = (CONFIG.saitama?.counterFrontalArc ?? ((28 * Math.PI) / 180)) / 2;
      const cosA = Math.cos(punchAngle);
      for (let i = 0; i < topNameShatter.glyphShards.length; i++) {
        const g = topNameShatter.glyphShards[i];
        const inCone = isInsideSaitamaFrontalBlast(g.x, g.y, originX, originY, punchAngle, halfArc, 45) ||
                       isInsideSaitamaFrontalBlast(g.originX, g.originY, originX, originY, punchAngle, halfArc, 45);
        if (inCone) {
          const dx = g.originX - topHit.x;
          const dist = Math.abs(dx);
          const pushDir = Math.abs(dx) < 6 ? (i % 2 === 0 ? 1 : -1) : (dx > 0 ? 1 : -1);
          const intensity = 1.0 / (1.0 + dist * 0.005);
          g.isBlownAway = true;
          g.delay = 0;
          g.vx += pushDir * (6.0 + 9.0 * intensity) + cosA * (4.0 * intensity);
          g.vy -= (6.5 + 9.5 * intensity + Math.random() * 2.5);
          g.rotSpeed += pushDir * (0.08 + 0.12 * intensity);
          g.gravity = 0.22;
          g.drag = 0.968;
        }
      }
    }
    if (typeof document !== 'undefined') {
      const topHud = document.getElementById('hudTopContainer');
      if (topHud && topHud.classList && typeof topHud.classList.remove === 'function') {
        topHud.classList.remove('hud-shattered-shock');
        void topHud.offsetWidth;
        topHud.classList.add('hud-shattered-shock');
      }
    }
  }

  if (isBottomTarget && bottomHit) {
    if (!bottomHudShatter) {
      bottomHudShatter = generateBottomHudShatters(arena, punchAngle, bottomHit.x, maxLife, originX, originY);
    } else {
      // Re-trigger & violently re-accelerate all bottom components inside the new punch cone
      const halfArc = (CONFIG.saitama?.counterFrontalArc ?? ((28 * Math.PI) / 180)) / 2;
      const cosA = Math.cos(punchAngle);
      const applyHit = (item) => {
        if (!item) return;
        const inCone = isInsideSaitamaFrontalBlast(item.x, item.y, originX, originY, punchAngle, halfArc, 45) ||
                       isInsideSaitamaFrontalBlast(item.originX, item.originY, originX, originY, punchAngle, halfArc, 45);
        if (inCone) {
          const dx = item.originX - bottomHit.x;
          const dist = Math.abs(dx);
          const pushDir = dx >= 0 ? 1 : -1;
          const intensity = 1.0 / (1.0 + dist * 0.005);
          item.isBlownAway = true;
          item.delay = 0;
          item.vx += pushDir * (6.0 + 9.5 * intensity) + cosA * (3.5 * intensity);
          item.vy += (6.5 + 10.5 * intensity) + Math.random() * 2.5;
          item.rotSpeed += pushDir * (0.06 + 0.12 * intensity);
          item.gravity = 0.24;
          item.drag = 0.965;
        }
      };
      if (bottomHudShatter.healthBars) bottomHudShatter.healthBars.forEach(applyHit);
      if (bottomHudShatter.skillBars) bottomHudShatter.skillBars.forEach(applyHit);
      if (bottomHudShatter.statRows) bottomHudShatter.statRows.forEach(applyHit);
    }
    if (typeof document !== 'undefined') {
      const healthHud = document.getElementById('healthHud');
      const leftHud = document.getElementById('healthHudLeft');
      const rightHud = document.getElementById('healthHudRight');
      if (healthHud) {
        healthHud.style.opacity = '0';
        if (healthHud.classList && typeof healthHud.classList.remove === 'function') {
          healthHud.classList.remove('hud-shattered-shock');
          void healthHud.offsetWidth;
          healthHud.classList.add('hud-shattered-shock');
        }
      }
      if (leftHud) leftHud.style.opacity = '0';
      if (rightHud) rightHud.style.opacity = '0';
    }
  }

  const primaryHit = topHit || bottomHit || hitList[0];
  state.hudShatters = {
    topNameShatter,
    bottomHudShatter,
    punchAngle,
    hitX: primaryHit.x,
    hitY: primaryHit.y
  };
}

/**
 * Helper to get primary active match fighters.
 */
function getPrimaryFighters() {
  if (!state || !state.fighters || state.fighters.length === 0) return [];

  const isPrimary = (f) => Boolean(
    f && !f.isTurret && !f.isMinion && !f.isEndCrystal && !f.isDeployable &&
    !f.isIceWall && !f.isIllusion && !f.isRika && !f.isEvasionMinion &&
    !f.isTransfiguredHuman && !f.isClone && !f.owner &&
    f.type !== 'Turret' && f.type !== 'turret' &&
    f.type !== 'Dispenser' && f.type !== 'dispenser' &&
    !f._def?.isTurret && !f._def?.isMinion
  );

  return state.fighters.filter(isPrimary);
}

/**
 * Resolves theme color for fighter.
 */
function getFighterThemeColor(f, fallbackColor = '#38BDF8') {
  if (!f) return fallbackColor;
  const isYuta = Boolean(f.characterId === 'yuta' || f.type === 'yuta' || (f._def && (f._def.id === 'yuta' || f._def.type === 'yuta')) || (f.name && f.name.toUpperCase().includes('YUTA')));
  if (isYuta) return '#FF1493';
  return f.themeColor || f._def?.themeColor || f.color || f._def?.color || fallbackColor;
}

/**
 * Helper to draw a rounded rectangle on Canvas 2D.
 */
function drawRoundedRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Helper to get active match fighter names and colors.
 */
function getMatchNamesData(arena) {
  const mainFighters = getPrimaryFighters();
  if (mainFighters.length === 0) return null;

  let team0 = [];
  let team1 = [];

  if (typeof state.getFighterTeam === 'function') {
    mainFighters.forEach(f => {
      const origIdx = state.fighters.indexOf(f);
      const t = state.getFighterTeam(origIdx);
      if (t === 0) team0.push(f);
      else if (t === 1) team1.push(f);
    });
  }

  if (team0.length === 0 && team1.length === 0) {
    if (mainFighters.length >= 2) {
      team0 = [mainFighters[0]];
      team1 = [mainFighters[1]];
    }
  }

  const isTeamMatch = (team0.length > 0 && team1.length > 0);
  if (!isTeamMatch) return null;

  const team0Data = team0.map(f => ({
    name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
    color: getFighterThemeColor(f, '#38BDF8')
  }));

  const team1Data = team1.map(f => ({
    name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
    color: getFighterThemeColor(f, '#F87171')
  }));

  return { team0Data, team1Data };
}

/**
 * Breaks the Top Match Name text into discrete fractured glyph shards and naturally pushed letters centered on hitX.
 */
function getTopMatchNameCharacters(arena) {
  const mainFighters = getPrimaryFighters();
  if (mainFighters.length === 0) return [];

  const centerX = arena.x + arena.width / 2;
  const bottomY = arena.y - 12;
  const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));

  let measureCtx = (typeof state !== 'undefined' && state.ctx) ? state.ctx : null;
  if (!measureCtx && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d');
  }

  let team0 = [];
  let team1 = [];

  if (typeof state.getFighterTeam === 'function') {
    mainFighters.forEach(f => {
      const origIdx = state.fighters.indexOf(f);
      const t = state.getFighterTeam(origIdx);
      if (t === 0) team0.push(f);
      else if (t === 1) team1.push(f);
    });
  }

  if (team0.length === 0 && team1.length === 0) {
    if (mainFighters.length >= 2) {
      team0 = [mainFighters[0]];
      team1 = [mainFighters[1]];
    }
  }

  const isTeamMatch = (team0.length > 0 && team1.length > 0 && (team0.length + team1.length === mainFighters.length));
  const charList = [];

  if (isTeamMatch) {
    const team0Data = team0.map(f => ({
      name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
      color: getFighterThemeColor(f, '#38BDF8')
    }));

    const team1Data = team1.map(f => ({
      name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
      color: getFighterThemeColor(f, '#F87171')
    }));

    const hasStackedTeam = team0.length > 1 || team1.length > 1;
    const nameFontSize = hasStackedTeam ? 34 : 42;
    const customNameFont = `700 ${nameFontSize}px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;
    const vsFontSize = hasStackedTeam ? 22 : 24;
    const customVsFont = `700 ${vsFontSize}px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;

    if (measureCtx) {
      measureCtx.font = customNameFont;
      if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '2px';
    }

    let wTeam0 = 0;
    team0Data.forEach(td => {
      const w = measureCtx ? measureCtx.measureText(td.name).width : (td.name.length * nameFontSize * 0.7);
      wTeam0 = Math.max(wTeam0, w);
    });

    let wTeam1 = 0;
    team1Data.forEach(td => {
      const w = measureCtx ? measureCtx.measureText(td.name).width : (td.name.length * nameFontSize * 0.7);
      wTeam1 = Math.max(wTeam1, w);
    });

    if (measureCtx) {
      measureCtx.font = customVsFont;
      if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '1.5px';
    }
    const vsText = 'vs';
    const wVs = measureCtx ? measureCtx.measureText(vsText).width : (vsText.length * vsFontSize * 0.7);

    const pad = 14;
    const totalW = wTeam0 + pad + wVs + pad + wTeam1;
    const maxW = arena.width - 16;
    const scale = totalW > maxW ? maxW / totalW : 1.0;

    const lineSpacing = hasStackedTeam ? 34 : 0;
    const topY = bottomY - lineSpacing;
    const midY = (topY + bottomY) / 2;
    const scaleAnchorY = hasStackedTeam ? midY : bottomY;

    const startX = centerX - totalW / 2;
    const vsX = startX + wTeam0 + pad;
    const team1X = vsX + wVs + pad;

    const extractChars = (str, startPos, baseY, font, letterSpacing, color, fontSize) => {
      if (measureCtx) {
        measureCtx.font = font;
        if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = letterSpacing;
      }
      for (let c = 0; c < str.length; c++) {
        const char = str[c];
        const offsetLeft = measureCtx ? measureCtx.measureText(str.substring(0, c)).width : (c * fontSize * 0.7);
        const charW = measureCtx ? measureCtx.measureText(char).width : (fontSize * 0.7);

        const unscaledCenterX = startPos + offsetLeft + charW / 2;
        const unscaledCenterY = baseY - fontSize * 0.42;

        const worldCenterX = scale < 1.0 ? (centerX + (unscaledCenterX - centerX) * scale) : unscaledCenterX;
        const worldCenterY = scale < 1.0 ? (scaleAnchorY + (unscaledCenterY - scaleAnchorY) * scale) : unscaledCenterY;

        charList.push({
          char,
          font,
          letterSpacing,
          color,
          fontSize,
          scale,
          charW: charW * scale,
          charH: fontSize * scale,
          unscaledCharW: charW,
          unscaledCharH: fontSize,
          originX: worldCenterX,
          originY: worldCenterY
        });
      }
    };

    // Team 0
    if (team0Data.length === 1) {
      extractChars(team0Data[0].name, startX, hasStackedTeam ? midY : bottomY, customNameFont, '2px', team0Data[0].color, nameFontSize);
    } else {
      extractChars(team0Data[0].name, startX, topY, customNameFont, '2px', team0Data[0].color, nameFontSize);
      if (team0Data[1]) extractChars(team0Data[1].name, startX, bottomY, customNameFont, '2px', team0Data[1].color, nameFontSize);
    }

    // VS
    extractChars(vsText, vsX, (hasStackedTeam ? midY : bottomY) - 1.5, customVsFont, '1.5px', isDark ? '#94A3B8' : '#475569', vsFontSize);

    // Team 1
    if (team1Data.length === 1) {
      extractChars(team1Data[0].name, team1X, hasStackedTeam ? midY : bottomY, customNameFont, '2px', team1Data[0].color, nameFontSize);
    } else {
      extractChars(team1Data[0].name, team1X, topY, customNameFont, '2px', team1Data[0].color, nameFontSize);
      if (team1Data[1]) extractChars(team1Data[1].name, team1X, bottomY, customNameFont, '2px', team1Data[1].color, nameFontSize);
    }
  } else {
    // Multi-fighter FFA fallback
    const pad = 10;
    const vsText = 'vs';
    const textY = arena.y - 12;
    const fighterData = mainFighters.map(f => ({
      name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
      color: getFighterThemeColor(f, '#F8FAFC')
    }));

    const nameFont = '700 42px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
    const vsFont = '700 24px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
    const nameFontSize = 42;
    const vsFontSize = 24;

    let totalW = 0;
    if (measureCtx) {
      measureCtx.font = nameFont;
      if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '2px';
    }
    fighterData.forEach((fd, i) => {
      totalW += measureCtx ? measureCtx.measureText(fd.name).width : (fd.name.length * nameFontSize * 0.7);
      if (i < fighterData.length - 1) {
        if (measureCtx) {
          measureCtx.font = vsFont;
          if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '1.5px';
        }
        totalW += pad + (measureCtx ? measureCtx.measureText(vsText).width : (vsText.length * vsFontSize * 0.7)) + pad;
        if (measureCtx) {
          measureCtx.font = nameFont;
          if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '2px';
        }
      }
    });

    const maxW = arena.width - 16;
    const scale = totalW > maxW ? maxW / totalW : 1.0;
    let curX = centerX - totalW / 2;

    const extractFfaChars = (str, startPos, font, letterSpacing, color, fontSize) => {
      if (measureCtx) {
        measureCtx.font = font;
        if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = letterSpacing;
      }
      for (let c = 0; c < str.length; c++) {
        const char = str[c];
        const offsetLeft = measureCtx ? measureCtx.measureText(str.substring(0, c)).width : (c * fontSize * 0.7);
        const charW = measureCtx ? measureCtx.measureText(char).width : (fontSize * 0.7);

        const unscaledCenterX = startPos + offsetLeft + charW / 2;
        const unscaledCenterY = textY - fontSize * 0.42;

        const worldCenterX = scale < 1.0 ? (centerX + (unscaledCenterX - centerX) * scale) : unscaledCenterX;
        const worldCenterY = scale < 1.0 ? (textY + (unscaledCenterY - textY) * scale) : unscaledCenterY;

        charList.push({
          char,
          font,
          letterSpacing,
          color,
          fontSize,
          scale,
          charW: charW * scale,
          charH: fontSize * scale,
          unscaledCharW: charW,
          unscaledCharH: fontSize,
          originX: worldCenterX,
          originY: worldCenterY
        });
      }
    };

    fighterData.forEach((fd, i) => {
      extractFfaChars(fd.name, curX, nameFont, '2px', fd.color, nameFontSize);
      if (measureCtx) {
        measureCtx.font = nameFont;
        if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '2px';
      }
      curX += measureCtx ? measureCtx.measureText(fd.name).width : (fd.name.length * nameFontSize * 0.7);

      if (i < fighterData.length - 1) {
        curX += pad;
        extractFfaChars(vsText, curX, vsFont, '1.5px', isDark ? '#94A3B8' : '#475569', vsFontSize);
        if (measureCtx) {
          measureCtx.font = vsFont;
          if ('letterSpacing' in measureCtx) measureCtx.letterSpacing = '1.5px';
        }
        curX += (measureCtx ? measureCtx.measureText(vsText).width : (vsText.length * vsFontSize * 0.7)) + pad;
      }
    });
  }

  return charList;
}

/**
 * Breaks the Top Match Name text into discrete fractured glyph shards centered on hitX.
 */
function generateTopNameShatters(arena, punchAngle, hitX, maxLife, originX, originY) {
  const characters = getTopMatchNameCharacters(arena);
  const glyphShards = [];
  const crumbs = [];

  const cosA = Math.cos(punchAngle);
  const halfArc = (CONFIG.saitama?.counterFrontalArc ?? ((28 * Math.PI) / 180)) / 2;

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    const isHit = isInsideSaitamaFrontalBlast(ch.originX, ch.originY, originX, originY, punchAngle, halfArc, 38);

    if (!isHit) {
      // OUTSIDE frontal cone: stays completely intact and solid in place
      glyphShards.push({
        char: ch.char,
        font: ch.font,
        letterSpacing: ch.letterSpacing,
        color: ch.color,
        fontSize: ch.fontSize,
        scale: ch.scale,
        originX: ch.originX,
        originY: ch.originY,
        x: ch.originX,
        y: ch.originY,
        vx: 0,
        vy: 0,
        rot: 0,
        rotSpeed: 0,
        rotDamping: 1,
        gravity: 0,
        drag: 1,
        delay: 0,
        isShard: false,
        isBlownAway: false,
        charW: ch.charW,
        charH: ch.charH,
        alpha: 1.0
      });
      continue;
    }

    // INSIDE frontal cone: gets shattered and blown away
    const dx = ch.originX - hitX;
    const dist = Math.abs(dx);
    const pushDir = Math.abs(dx) < 6 ? (i % 2 === 0 ? 1 : -1) : (dx > 0 ? 1 : -1);
    const delay = Math.min(12, Math.floor(dist / 32));
    const intensity = 1.0 / (1.0 + dist * 0.005);

    if (dist < 80) {
      // Direct blast epicenter: split into 2 jagged polygonal shards
      const slices = [
        { name: 'top', y0: -ch.unscaledCharH * 0.55, y1: 0, x0: -ch.unscaledCharW * 0.7, x1: ch.unscaledCharW * 0.7 },
        { name: 'bot', y0: 0, y1: ch.unscaledCharH * 0.55, x0: -ch.unscaledCharW * 0.7, x1: ch.unscaledCharW * 0.7 }
      ];

      for (let s = 0; s < slices.length; s++) {
        const slice = slices[s];
        const lateralScatter = (s === 0 ? -1.0 : 1.0) * (1.5 + Math.random() * 2.0);
        const shardVx = pushDir * (4.5 + 7.5 * intensity) + cosA * (3.0 * intensity) + lateralScatter;
        const shardVy = - (6.0 + 8.0 * intensity + (s === 0 ? 2.5 : 0.5) + Math.random() * 2.0);
        const shardRotSpeed = pushDir * (0.08 + 0.14 * intensity) * (s === 0 ? 1.0 : -0.8);

        glyphShards.push({
          char: ch.char,
          font: ch.font,
          letterSpacing: ch.letterSpacing,
          color: ch.color,
          fontSize: ch.fontSize,
          scale: ch.scale,
          originX: ch.originX,
          originY: ch.originY,
          x: ch.originX,
          y: ch.originY,
          vx: shardVx,
          vy: shardVy,
          rot: 0,
          rotSpeed: shardRotSpeed,
          rotDamping: 0.985,
          gravity: 0.23 + Math.random() * 0.04,
          drag: 0.965,
          delay,
          isShard: true,
          isBlownAway: true,
          sliceX0: slice.x0,
          sliceY0: slice.y0,
          sliceX1: slice.x1,
          sliceY1: slice.y1,
          charW: ch.charW,
          charH: ch.charH,
          alpha: 1.0
        });
      }
    } else {
      // Intermediate & Flank letters: whole letter pushed away naturally
      const lateralPush = pushDir * (3.5 + 6.5 * intensity) + cosA * (2.0 * intensity) + (Math.random() - 0.5) * 0.6;
      const upwardLift = - (3.5 + 5.5 * intensity + Math.random() * 1.5);
      const rotSpeed = pushDir * (0.03 + 0.07 * intensity + (Math.random() - 0.5) * 0.02);

      glyphShards.push({
        char: ch.char,
        font: ch.font,
        letterSpacing: ch.letterSpacing,
        color: ch.color,
        fontSize: ch.fontSize,
        scale: ch.scale,
        originX: ch.originX,
        originY: ch.originY,
        x: ch.originX,
        y: ch.originY,
        vx: lateralPush,
        vy: upwardLift,
        rot: 0,
        rotSpeed,
        rotDamping: 0.988,
        gravity: 0.20 + Math.random() * 0.03,
        drag: 0.970,
        delay,
        isShard: false,
        isBlownAway: true,
        charW: ch.charW,
        charH: ch.charH,
        alpha: 1.0
      });
    }
  }

  // Generate 25-35 supersonic shockwave crumbs bursting outward from impact
  const crumbCount = 28;
  for (let k = 0; k < crumbCount; k++) {
    const fanAngle = punchAngle + (Math.random() - 0.5) * 1.4;
    const speed = 4.0 + Math.random() * 9.0;
    crumbs.push({
      x: hitX + (Math.random() - 0.5) * 12,
      y: arena.y - 12 + (Math.random() - 0.5) * 6,
      vx: Math.cos(fanAngle) * speed,
      vy: Math.sin(fanAngle) * speed - (2.0 + Math.random() * 4.0),
      radius: 1.2 + Math.random() * 1.8,
      gravity: 0.28,
      drag: 0.965,
      life: 45 + Math.floor(Math.random() * 40),
      maxLife: 85,
      color: Math.random() < 0.4 ? '#FFD700' : (Math.random() < 0.4 ? '#38BDF8' : '#FFFFFF'),
      alpha: 1.0
    });
  }

  return {
    glyphShards,
    crumbs,
    life: maxLife,
    maxLife,
    hitX
  };
}

/**
 * Generates natural, physics-driven shatter debris for HUD Health Bars, Skill Bars, and Stats.
 * Faithfully matches the exact modern styled HUD of the DOM (rounded pill bars, accurate typography, proper themes).
 */
function generateBottomHudShatters(arena, punchAngle, hitX, maxLife, originX, originY) {
  const mainFighters = getPrimaryFighters();
  const healthBars = [];
  const skillBars = [];
  const statRows = [];
  const crumbs = [];

  const cosA = Math.cos(punchAngle);
  const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));
  const baseY = arena.y + arena.height + 20;
  const numFighters = Math.max(1, mainFighters.length);
  const halfArc = (CONFIG.saitama?.counterFrontalArc ?? ((28 * Math.PI) / 180)) / 2;

  const showHealthBars = !(CONFIG.hudHideAll || CONFIG.hudHideHealthBars);
  const showSkillBars = shouldShowHudSkillBars();
  const showStats = shouldShowHudStats();

  for (let fIdx = 0; fIdx < mainFighters.length; fIdx++) {
    const f = mainFighters[fIdx];
    let cardLeftX = arena.x + 12;
    let cardW = Math.min(210, (arena.width - 36) / Math.max(2, numFighters));

    if (numFighters === 2) {
      cardLeftX = fIdx === 0 ? (arena.x + 14) : (arena.x + arena.width - cardW - 14);
    } else {
      cardLeftX = arena.x + 14 + fIdx * (cardW + 12);
    }
    const cardCenterX = cardLeftX + cardW / 2;

    const hpRatio = f.maxHp > 0 ? Math.max(0, Math.min(1, Number(f.hp) / Number(f.maxHp))) : 0;
    const hpColor = getFighterHealthBarColor(f, hpRatio, isDark);
    const hpText = `${Math.floor(Math.max(0, Number(f.hp) || 0))}`;

    const dx = cardCenterX - hitX;
    const dist = Math.abs(dx);
    const pushDir = Math.abs(dx) < 8 ? (fIdx % 2 === 0 ? -1 : 1) : (dx > 0 ? 1 : -1);
    const delay = Math.min(12, Math.floor(dist / 32));
    const intensity = 1.0 / (1.0 + dist * 0.005);

    // 1. Health Bar (Modern rounded track + inner pill fill + right-aligned HP number text)
    if (showHealthBars) {
      const hbY = baseY + 12;
      const hbW = cardW;
      const hbH = 16;
      const isHbHit = isInsideSaitamaFrontalBlast(cardCenterX, hbY, originX, originY, punchAngle, halfArc, cardW * 0.45);

      healthBars.push({
        x: cardCenterX,
        y: hbY,
        originX: cardCenterX,
        originY: hbY,
        w: hbW,
        h: hbH,
        fillRatio: hpRatio,
        color: hpColor,
        hpText,
        vx: isHbHit ? (pushDir * (4.5 + 7.5 * intensity) + cosA * (2.5 * intensity)) : 0,
        vy: isHbHit ? ((5.5 + 8.5 * intensity) + Math.random() * 2.0) : 0,
        rot: 0,
        rotSpeed: isHbHit ? (pushDir * (0.05 + 0.10 * intensity)) : 0,
        rotDamping: 0.985,
        gravity: isHbHit ? 0.24 : 0,
        drag: isHbHit ? 0.965 : 1,
        delay: isHbHit ? delay : 0,
        isBlownAway: isHbHit
      });
    }

    // 2. Skill Bars (Modern rounded box + 55% fill + clean label)
    let skills = [];
    if (showSkillBars) {
      try {
        const rawSkills = getSkillDataForFighter(f) || [];
        skills = rawSkills.filter(s => shouldShowFighterSkill(f, s));
      } catch (e) {
        skills = [];
      }
    }

    const skillsStartY = showHealthBars ? (baseY + 36) : (baseY + 12);
    for (let sIdx = 0; sIdx < skills.length; sIdx++) {
      const s = skills[sIdx];
      const sY = skillsStartY + sIdx * 24;
      const sW = cardW;
      const sH = 18;
      const sLabel = (s.label || s.id || `SKILL ${sIdx + 1}`).replace(/<[^>]*>/g, '').toUpperCase();
      const sColor = s.color || hpColor || '#FFCC00';
      const sFill = Math.max(0, Math.min(1, (s.pct !== undefined ? s.pct : 100) / 100));

      const isSkillHit = isInsideSaitamaFrontalBlast(cardCenterX, sY, originX, originY, punchAngle, halfArc, cardW * 0.45);

      skillBars.push({
        x: cardCenterX,
        y: sY,
        originX: cardCenterX,
        originY: sY,
        w: sW,
        h: sH,
        label: sLabel,
        color: sColor,
        fillRatio: sFill,
        ready: Boolean(s.ready),
        vx: isSkillHit ? (pushDir * (4.0 + 7.0 * intensity) + cosA * (2.2 * intensity)) : 0,
        vy: isSkillHit ? ((5.0 + 8.0 * intensity) + sIdx * 0.8 + Math.random() * 1.5) : 0,
        rot: 0,
        rotSpeed: isSkillHit ? (pushDir * (0.04 + 0.09 * intensity)) : 0,
        rotDamping: 0.986,
        gravity: isSkillHit ? 0.23 : 0,
        drag: isSkillHit ? 0.968 : 1,
        delay: isSkillHit ? delay : 0,
        isBlownAway: isSkillHit
      });
    }

    // 3. Stats Rows (Muted Label + White/Accent Value)
    if (showStats) {
      const statsList = [];
      const baseDmg = Math.round(Number(f.damage !== undefined ? f.damage : (f._def && f._def.damage)) || 15);
      statsList.push({ label: 'DMG:', val: `${baseDmg}` });
      if (f.regenRate || f.rctActive || f.characterId === 'yuta') {
        statsList.push({ label: 'REGEN:', val: `${(f.regenRate || 0).toFixed(0)}%` });
      }
      const defVal = Math.round((Number(f.defense !== undefined ? f.defense : (f._def && f._def.defense)) || 0) * 100);
      if (defVal >= 0) statsList.push({ label: 'DEF:', val: `${defVal}%` });
      if (f.evadeChance) {
        statsList.push({ label: 'DODGE:', val: `${Math.round(f.evadeChance * 100)}%` });
      } else if (f.parryPassiveChance || f.parryChance) {
        statsList.push({ label: 'PARRY:', val: `${Math.round((f.parryPassiveChance || f.parryChance || 0.5) * 100)}%` });
      }

      const statsBaseY = showHealthBars 
        ? (skills.length > 0 ? (baseY + 38 + skills.length * 24) : (baseY + 36))
        : (skills.length > 0 ? (baseY + 14 + skills.length * 24) : (baseY + 12));

      for (let stIdx = 0; stIdx < statsList.length; stIdx++) {
        const st = statsList[stIdx];
        const stY = statsBaseY + stIdx * 18;
        const isStatHit = isInsideSaitamaFrontalBlast(cardCenterX, stY, originX, originY, punchAngle, halfArc, cardW * 0.45);

        statRows.push({
          x: cardCenterX,
          y: stY,
          originX: cardCenterX,
          originY: stY,
          w: cardW,
          label: st.label,
          value: st.val,
          text: `${st.label} ${st.val}`,
          vx: isStatHit ? (pushDir * (3.8 + 6.5 * intensity)) : 0,
          vy: isStatHit ? ((4.5 + 7.5 * intensity) + Math.random() * 1.5) : 0,
          rot: 0,
          rotSpeed: isStatHit ? (pushDir * (0.05 + 0.10 * intensity)) : 0,
          rotDamping: 0.985,
          gravity: isStatHit ? 0.22 : 0,
          drag: isStatHit ? 0.970 : 1,
          delay: isStatHit ? delay : 0,
          isBlownAway: isStatHit
        });
      }
    }
  }

  // Crumbs
  const crumbCount = 28;
  for (let c = 0; c < crumbCount; c++) {
    const fanAngle = punchAngle + (Math.random() - 0.5) * 1.3;
    const speed = 4.0 + Math.random() * 9.0;
    crumbs.push({
      x: hitX + (Math.random() - 0.5) * 14,
      y: arena.y + arena.height + 4,
      vx: Math.cos(fanAngle) * speed,
      vy: Math.sin(fanAngle) * speed + (2.0 + Math.random() * 4.0),
      radius: 1.2 + Math.random() * 1.8,
      gravity: 0.28,
      drag: 0.965,
      life: 45 + Math.floor(Math.random() * 40),
      maxLife: 85,
      color: Math.random() < 0.35 ? '#FFD700' : '#FFFFFF',
      alpha: 1.0
    });
  }

  return {
    healthBars,
    skillBars,
    statRows,
    crumbs,
    hitX
  };
}

/**
 * Updates physics for all active HUD shatter effects.
 */
export function updateHudShatters() {
  if (!state.hudShatters) return;

  const hs = state.hudShatters;

  // ── Update Top Name Glyph Shards ──
  if (hs.topNameShatter) {
    const tns = hs.topNameShatter;

    for (let i = 0; i < tns.glyphShards.length; i++) {
      const g = tns.glyphShards[i];
      if (!g.isBlownAway) continue;

      if (g.delay > 0) {
        g.delay--;
        g.x = g.originX;
        g.y = g.originY;
        g.rot = 0;
        continue;
      }

      g.vy += g.gravity;
      g.vx *= g.drag;
      g.vy *= g.drag;
      g.x += g.vx;
      g.y += g.vy;
      g.rot += g.rotSpeed;
      g.rotSpeed *= g.rotDamping;
    }

    // Update Crumbs
    for (let c = tns.crumbs.length - 1; c >= 0; c--) {
      const cr = tns.crumbs[c];
      cr.vy += cr.gravity;
      cr.vx *= cr.drag;
      cr.vy *= cr.drag;
      cr.x += cr.vx;
      cr.y += cr.vy;
      cr.life--;
      cr.alpha = Math.max(0, cr.life / cr.maxLife);
      if (cr.life <= 0) tns.crumbs.splice(c, 1);
    }
  }

  // ── Update Bottom HUD (Health Bars, Skill Bars, Stat Rows) ──
  if (hs.bottomHudShatter) {
    const bhs = hs.bottomHudShatter;

    const updatePhysicsItem = (item) => {
      if (!item.isBlownAway) return;
      if (item.delay > 0) {
        item.delay--;
        item.x = item.originX;
        item.y = item.originY;
        return;
      }
      item.vy += item.gravity;
      item.vx *= item.drag;
      item.vy *= item.drag;
      item.x += item.vx;
      item.y += item.vy;
      item.rot += item.rotSpeed;
      item.rotSpeed *= item.rotDamping;
    };

    if (bhs.healthBars) bhs.healthBars.forEach(updatePhysicsItem);
    if (bhs.skillBars) bhs.skillBars.forEach(updatePhysicsItem);
    if (bhs.statRows) bhs.statRows.forEach(updatePhysicsItem);

    // Update Bottom Crumbs
    if (bhs.crumbs) {
      for (let c = bhs.crumbs.length - 1; c >= 0; c--) {
        const cr = bhs.crumbs[c];
        cr.vy += cr.gravity;
        cr.vx *= cr.drag;
        cr.vy *= cr.drag;
        cr.x += cr.vx;
        cr.y += cr.vy;
        cr.life--;
        cr.alpha = Math.max(0, cr.life / cr.maxLife);
        if (cr.life <= 0) bhs.crumbs.splice(c, 1);
      }
    }
  }
}

/**
 * Draws the shattered Top Arena Match Names glyphs in camera space.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {boolean} isDark - Dark mode active
 * @param {object} arena - Arena object
 * @returns {boolean} Whether shattered names were rendered
 */
export function drawTopHudNameShatters(ctx, isDark, arena) {
  if (!state.hudShatters || !state.hudShatters.topNameShatter) {
    return false;
  }

  const tns = state.hudShatters.topNameShatter;

  ctx.save();

  // 1. Draw Pushed & Shattered Letters / Shards
  for (let i = 0; i < tns.glyphShards.length; i++) {
    const g = tns.glyphShards[i];

    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    if (g.scale && g.scale !== 1.0) {
      ctx.scale(g.scale, g.scale);
    }
    ctx.globalAlpha = 1.0;

    ctx.font = g.font;
    if ('letterSpacing' in ctx && g.letterSpacing) {
      ctx.letterSpacing = g.letterSpacing;
    }
    ctx.fillStyle = g.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (g.isShard) {
      ctx.beginPath();
      ctx.rect(g.sliceX0, g.sliceY0, g.sliceX1 - g.sliceX0, g.sliceY1 - g.sliceY0);
      ctx.clip();
    }

    ctx.fillText(g.char, 0, 0);
    ctx.restore();
  }

  // 2. Draw Blast Spark Crumbs
  for (let c = 0; c < tns.crumbs.length; c++) {
    const cr = tns.crumbs[c];
    if (cr.alpha <= 0.01) continue;

    ctx.save();
    ctx.fillStyle = cr.color || (isDark ? '#FFFFFF' : '#111114');
    ctx.globalAlpha = cr.alpha;
    ctx.beginPath();
    ctx.arc(cr.x, cr.y, cr.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // Return true while active to prevent duplicate static rendering in arenaRenderer
  return true;
}

/**
 * Draws the shattered Bottom HUD components (Health Bars, Skill Bars, Stats, Win Bullets) in camera space.
 * Faithfully matches the modern DOM HUD card styling (rounded pill bars, accurate typography, proper themes).
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {boolean} isDark - Dark mode active
 * @param {object} arena - Arena object
 */
export function drawBottomHudShatters(ctx, isDark, arena) {
  if (!state.hudShatters || !state.hudShatters.bottomHudShatter) {
    return;
  }

  const bhs = state.hudShatters.bottomHudShatter;

  ctx.save();

  // 1. Draw Flying Health Bars (Exact 1:1 match with modern DOM .health-card__bar style)
  if (bhs.healthBars) {
    for (const hb of bhs.healthBars) {
      ctx.save();
      ctx.translate(hb.x, hb.y);
      ctx.rotate(hb.rot);
      ctx.globalAlpha = 1.0;

      // Outer Rounded Track (matching DOM .health-card__bar)
      const trackBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)';
      const trackBorder = isDark ? 'rgba(255, 255, 255, 0.60)' : '#222222';
      ctx.fillStyle = trackBg;
      drawRoundedRect(ctx, -hb.w / 2, -hb.h / 2, hb.w, hb.h, 3);
      ctx.fill();
      ctx.strokeStyle = trackBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner Health Fill (matching DOM .health-card__fill)
      const fillMaxW = hb.w - 3;
      const fillW = Math.max(0, fillMaxW * hb.fillRatio);
      if (fillW > 0) {
        ctx.fillStyle = hb.color || '#22C55E';
        drawRoundedRect(ctx, -hb.w / 2 + 1.5, -hb.h / 2 + 1.5, fillW, hb.h - 3, 2);
        ctx.fill();
      }

      // Floating HP Number Text (right-aligned inside the bar matching DOM .health-card__bar-text)
      ctx.font = '700 11.5px "Rajdhani", "Outfit", "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Inter", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.strokeText(hb.hpText, hb.w / 2 - 6, 0.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(hb.hpText, hb.w / 2 - 6, 0.5);

      ctx.restore();
    }
  }

  // 3. Draw Flying Skill Bars (Exact 1:1 match with modern DOM .hud-skill-box style)
  if (bhs.skillBars) {
    for (const sb of bhs.skillBars) {
      ctx.save();
      ctx.translate(sb.x, sb.y);
      ctx.rotate(sb.rot);
      ctx.globalAlpha = 1.0;

      // Outer Rounded Box (matching DOM .hud-skill-box)
      const boxBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const boxBorder = isDark ? 'rgba(255, 255, 255, 0.60)' : '#222222';
      ctx.fillStyle = boxBg;
      drawRoundedRect(ctx, -sb.w / 2, -sb.h / 2, sb.w, sb.h, 3);
      ctx.fill();
      ctx.strokeStyle = boxBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner Progress Fill (55% opacity matching DOM .hud-skill-box-fill)
      const fillMaxW = sb.w - 3;
      const fillW = Math.max(0, fillMaxW * sb.fillRatio);
      if (fillW > 0) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = sb.color || '#FFCC00';
        drawRoundedRect(ctx, -sb.w / 2 + 1.5, -sb.h / 2 + 1.5, fillW, sb.h - 3, 2);
        ctx.fill();
        ctx.restore();
      }

      // Skill Name Text (matching DOM .hud-skill-box-text)
      ctx.font = '14px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
      ctx.fillStyle = isDark ? '#FFFFFF' : '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(sb.label, -sb.w / 2 + 8, 0.5);

      ctx.restore();
    }
  }

  // 4. Draw Flying Stats Rows (Exact 1:1 match with modern DOM .health-card__info style)
  if (bhs.statRows) {
    for (const st of bhs.statRows) {
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot);
      ctx.globalAlpha = 1.0;

      ctx.font = '14px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (st.label && st.value) {
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.70)' : '#444444';
        ctx.fillText(st.label, -st.w / 2, 0);
        const labelW = ctx.measureText(st.label).width;
        ctx.fillStyle = isDark ? '#FFFFFF' : '#000000';
        ctx.fillText(` ${st.value}`, -st.w / 2 + labelW, 0);
      } else {
        ctx.fillStyle = isDark ? '#FFFFFF' : '#000000';
        ctx.fillText(st.text || '', -st.w / 2, 0);
      }

      ctx.restore();
    }
  }

  // 5. Draw Falling Sparks / Crumbs
  if (bhs.crumbs) {
    for (const cr of bhs.crumbs) {
      if (cr.alpha <= 0.01) continue;
      ctx.save();
      ctx.fillStyle = cr.color || '#FFFFFF';
      ctx.globalAlpha = cr.alpha;
      ctx.beginPath();
      ctx.arc(cr.x, cr.y, cr.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Resets all HUD shatter states and restores DOM visibility.
 */
export function clearHudShatters() {
  if (state && state.hudShatters) {
    state.hudShatters = null;
  }
  if (typeof document !== 'undefined') {
    const healthHud = document.getElementById('healthHud');
    const leftHud = document.getElementById('healthHudLeft');
    const rightHud = document.getElementById('healthHudRight');
    const topHud = document.getElementById('hudTopContainer');

    if (healthHud) {
      healthHud.style.opacity = '1';
      if (healthHud.classList && typeof healthHud.classList.remove === 'function') {
        healthHud.classList.remove('hud-shattered-shock');
      }
    }
    if (leftHud) leftHud.style.opacity = '1';
    if (rightHud) rightHud.style.opacity = '1';
    if (topHud) {
      topHud.style.opacity = '1';
      if (topHud.classList && typeof topHud.classList.remove === 'function') {
        topHud.classList.remove('hud-shattered-shock');
      }
    }
  }
}
