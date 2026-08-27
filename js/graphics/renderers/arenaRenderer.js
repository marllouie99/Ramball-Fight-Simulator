import { state, getProjectiles } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { getCurrentPlayingBgmTitle } from '../../systems/arenaBgmSystem.js';
import { drawTacticalMap, STARTER_MAP } from '../../../Tactical Force/maps/index.js';

// ──────────────────────────────────────────
// SKETCHY BORDER HELPERS
// ──────────────────────────────────────────
function drawSketchyLine(ctx, x1, y1, x2, y2, seed, color = 'rgba(20,20,25,0.85)', width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  let currentSeed = seed;
  const nextRand = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Base bow amount (set to 0 for straight sketch lines)
  const baseBowAmt = 0;

  const strokeCount = 4; // Extra strokes for a penciled look
  for (let s = 0; s < strokeCount; s++) {
    ctx.lineWidth = width * (0.5 + nextRand() * 0.4);
    ctx.beginPath();
    
    const length = Math.hypot(x2 - x1, y2 - y1);
    const segmentLength = 12;
    const segments = Math.max(2, Math.floor(length / segmentLength));
    
    // Each pencil stroke gets a slightly different curve/displacement (subtle wobbles instead of bowing)
    const strokeBowVar = (nextRand() - 0.5) * 2.5;
    const totalBow = baseBowAmt + strokeBowVar;
    
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      let targetX = x1 + (x2 - x1) * t;
      let targetY = y1 + (y2 - y1) * t;
      
      const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      
      // Calculate smooth quadratic/sine bow that peaks in the middle (t = 0.5)
      const bowOffset = Math.sin(t * Math.PI) * totalBow;
      
      // Micro-wobbles for rough pencil texture
      let noise = 0;
      if (i < segments) {
        noise = (nextRand() - 0.5) * 2.2;
      }
      
      const totalOffset = bowOffset + noise;
      targetX += Math.cos(angle) * totalOffset;
      targetY += Math.sin(angle) * totalOffset;
      
      ctx.lineTo(targetX, targetY);
    }
    
    // Corner overshoot for hand-drawn feel
    const extendAngle = Math.atan2(y2 - y1, x2 - x1);
    const extension = (nextRand() * 6) + 1;
    ctx.lineTo(x2 + Math.cos(extendAngle) * extension, y2 + Math.sin(extendAngle) * extension);
    
    ctx.stroke();
  }
  ctx.restore();
}

function drawSketchyArenaBorders(ctx, arena, wallWidth, color = 'rgba(15,15,18,0.85)') {
  const x = arena.x;
  const y = arena.y;
  const w = arena.width;
  const h = arena.height;

  // Draw outside walls with pencil effect
  drawSketchyLine(ctx, x, y, x + w, y, 100, color, wallWidth); // Top
  drawSketchyLine(ctx, x + w, y, x + w, y + h, 200, color, wallWidth); // Right
  drawSketchyLine(ctx, x + w, y + h, x, y + h, 300, color, wallWidth); // Bottom
  drawSketchyLine(ctx, x, y + h, x, y, 400, color, wallWidth); // Left
}

/**
 * Renders a solid vector fissure crack (matching manga comic / PNG crack art).
 */
function drawSolidVectorCrack(ctx, crack, isDark = false) {
  const alpha = Math.min(1.0, crack.life / 30); // fade out at end of lifetime
  ctx.save();
  ctx.translate(crack.x, crack.y);
  ctx.rotate(crack.angle);

  let r = crack.seed;
  const rand = () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280;
  };

  const fillStyle = isDark ? `rgba(235, 240, 250, ${alpha * 0.90})` : `rgba(15, 15, 18, ${alpha * 0.95})`;

  // Helper to draw a filled polygonal crack ribbon path with tapering thickness
  const drawPolygonalRibbon = (spineNodes) => {
    if (!spineNodes || spineNodes.length < 2) return;
    const lefts = [];
    const rights = [];

    for (let i = 0; i < spineNodes.length; i++) {
      const curr = spineNodes[i];
      let dx = 0, dy = 0;
      if (i === 0) {
        dx = spineNodes[1].x - curr.x;
        dy = spineNodes[1].y - curr.y;
      } else if (i === spineNodes.length - 1) {
        dx = curr.x - spineNodes[i - 1].x;
        dy = curr.y - spineNodes[i - 1].y;
      } else {
        dx = spineNodes[i + 1].x - spineNodes[i - 1].x;
        dy = spineNodes[i + 1].y - spineNodes[i - 1].y;
      }
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const halfW = Math.max(0.4, curr.w / 2);

      lefts.push({ x: curr.x + nx * halfW, y: curr.y + ny * halfW });
      rights.push({ x: curr.x - nx * halfW, y: curr.y - ny * halfW });
    }

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(lefts[0].x, lefts[0].y);
    for (let i = 1; i < lefts.length; i++) {
      ctx.lineTo(lefts[i].x, lefts[i].y);
    }
    for (let i = rights.length - 1; i >= 0; i--) {
      ctx.lineTo(rights[i].x, rights[i].y);
    }
    ctx.closePath();
    ctx.fill();
  };

  const crackScale = crack.scale !== undefined ? crack.scale : 0.45;
  const crackThickMult = crack.thickness !== undefined ? crack.thickness : 0.35;

  // Generate 2 primary solid fissure branches splitting along the wall zone
  const primaryCount = 2;
  const primarySpines = [];

  for (let p = 0; p < primaryCount; p++) {
    const nodes = [];
    let cx = 0;
    let cy = 0;
    let dir = (p === 0 ? -1 : 1);
    let baseAngle = Math.PI + dir * (0.5 + rand() * 0.5); 
    let currentAngle = baseAngle;
    
    let startThick = (18 + rand() * 10) * crackThickMult; // Scaled core thickness
    const segCount = 6 + Math.floor(rand() * 4);

    nodes.push({ x: cx, y: cy, w: startThick });

    for (let s = 0; s < segCount; s++) {
      const segLen = (14 + rand() * 22) * crackScale;
      cx += Math.cos(currentAngle) * segLen;
      cy += Math.sin(currentAngle) * segLen;

      const progress = (s + 1) / segCount;
      const w = Math.max(0.3, startThick * Math.pow(1 - progress, 1.2));

      nodes.push({ x: cx, y: cy, w: w });

      // Sharp step-wise zig-zag turns
      const turnSign = (s % 2 === 0 ? 1 : -1);
      currentAngle += turnSign * (0.4 + rand() * 0.7);

      // Clamp so it stays outside the arena wall
      const limit = 1.35;
      if (currentAngle > Math.PI + limit) currentAngle = Math.PI + limit;
      if (currentAngle < Math.PI - limit) currentAngle = Math.PI - limit;
    }

    drawPolygonalRibbon(nodes);
    primarySpines.push(nodes);
  }

  // Generate sharp offshoot sub-branches splitting from the primary fissures
  for (const spine of primarySpines) {
    if (spine.length < 3) continue;
    const branchCount = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < branchCount; b++) {
      const nodeIdx = 1 + Math.floor(rand() * (spine.length - 2));
      const parentNode = spine[nodeIdx];
      const parentNext = spine[nodeIdx + 1];

      const parentAngle = Math.atan2(parentNext.y - parentNode.y, parentNext.x - parentNode.x);
      const sideSign = (b % 2 === 0 ? 1 : -1);
      let branchAngle = parentAngle + sideSign * (0.8 + rand() * 0.6);

      const branchNodes = [];
      let cx = parentNode.x;
      let cy = parentNode.y;
      let branchStartThick = Math.min(parentNode.w * 0.75, (10 + rand() * 6) * crackThickMult);
      const branchSegs = 3 + Math.floor(rand() * 4);

      branchNodes.push({ x: cx, y: cy, w: branchStartThick });

      for (let bs = 0; bs < branchSegs; bs++) {
        const segLen = (10 + rand() * 16) * crackScale;
        cx += Math.cos(branchAngle) * segLen;
        cy += Math.sin(branchAngle) * segLen;

        const progress = (bs + 1) / branchSegs;
        const w = Math.max(0.3, branchStartThick * (1 - progress));

        branchNodes.push({ x: cx, y: cy, w: w });

        branchAngle += (bs % 2 === 0 ? 1 : -1) * (0.3 + rand() * 0.6);

        const limit = 1.4;
        if (branchAngle > Math.PI + limit) branchAngle = Math.PI + limit;
        if (branchAngle < Math.PI - limit) branchAngle = Math.PI - limit;
      }

      drawPolygonalRibbon(branchNodes);
    }
  }

  // Draw 1-2 small detached satellite cracks nearby for added detail
  const satelliteCount = 1 + Math.floor(rand() * 2);
  for (let sat = 0; sat < satelliteCount; sat++) {
    const satOffsetAngle = Math.PI + (rand() - 0.5) * 1.8;
    const satDist = (30 + rand() * 45) * crackScale;
    let cx = Math.cos(satOffsetAngle) * satDist;
    let cy = Math.sin(satOffsetAngle) * satDist;

    const satNodes = [];
    let satAngle = satOffsetAngle + (rand() - 0.5) * 1.2;
    let satThick = 5 + rand() * 4;
    const satSegs = 3 + Math.floor(rand() * 3);

    satNodes.push({ x: cx, y: cy, w: satThick });

    for (let ss = 0; ss < satSegs; ss++) {
      const len = 8 + rand() * 14;
      cx += Math.cos(satAngle) * len;
      cy += Math.sin(satAngle) * len;

      const progress = (ss + 1) / satSegs;
      const w = Math.max(0.4, satThick * (1 - progress));

      satNodes.push({ x: cx, y: cy, w: w });
      satAngle += (ss % 2 === 0 ? 1 : -1) * (0.4 + rand() * 0.5);
    }

    drawPolygonalRibbon(satNodes);
  }

  ctx.restore();
}

// ──────────────────────────────────────────
// ANIME GRAPHIC DETAILS OVERLAY SYSTEM
// (Halftone Dots, Action Triangles, Diagonal Speed Needles - OUTSIDE ARENA ONLY)
// ──────────────────────────────────────────

/**
 * Draws the Halftone Dot Matrix ("circle thingy"), Action Triangles, and Speed Needles
 * strictly OUTSIDE the arena playing field onto the outer canvas margins.
 */
function drawOuterArenaGraphicDetails(ctx, canvasWidth, canvasHeight, arena, isDark) {
  ctx.save();

  // Exclude the arena bounding box so details render strictly OUTSIDE the arena
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  ctx.rect(arena.x, arena.y, arena.width, arena.height);
  ctx.clip('evenodd');

  // 1. Halftone Dot Matrix ("circle thingy") in outer margins
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
  drawArenaHalftoneGrid(ctx, 0, 0, canvasWidth, canvasHeight, dotColor);

  // 2. Action Triangles ("the small triangles") & Diagonal Speed Needles in outer margins
  drawOuterActionTrianglesAndNeedles(ctx, canvasWidth, canvasHeight, arena, isDark);

  ctx.restore();
}

function drawArenaHalftoneGrid(ctx, startX, startY, gridW, gridH, dotColor) {
  const spacing = 14;
  const cols = Math.floor(gridW / spacing);
  const rows = Math.floor(gridH / spacing);

  ctx.save();
  ctx.fillStyle = dotColor;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * spacing + (r % 2 === 0 ? 0 : spacing * 0.5);
      const y = startY + r * spacing;

      const normX = c / cols;
      const normY = r / rows;
      const dist = Math.hypot(normX - 0.5, normY - 0.5);
      const radiusFactor = Math.max(0.2, 1.0 - dist * 0.75);
      const radius = Math.min(3.2, Math.max(0.8, radiusFactor * 3.0));

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOuterActionTrianglesAndNeedles(ctx, width, height, arena, isDark) {
  ctx.save();

  // 1. Action Triangles in the outer margins
  const triangleColors = [
    'rgba(56, 189, 248, 0.75)',  // Cyan
    'rgba(235, 60, 80, 0.70)',   // Crimson / Coral
    isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(30, 35, 45, 0.65)', // Contrast Neutral
    'rgba(96, 165, 250, 0.70)'   // Electric Blue
  ];

  for (let i = 0; i < 28; i++) {
    // Distribute triangles primarily in the left, right, top, and bottom margins
    let tx, ty;
    if (i % 4 === 0) {
      // Left margin
      tx = ((i * 37.3 + 15) % Math.max(20, arena.x - 15)) + 10;
      ty = ((i * 123.7) % height);
    } else if (i % 4 === 1) {
      // Right margin
      const rightMarginW = Math.max(20, width - (arena.x + arena.width) - 20);
      tx = arena.x + arena.width + 10 + ((i * 43.1) % rightMarginW);
      ty = ((i * 137.9) % height);
    } else if (i % 4 === 2) {
      // Top margin
      tx = ((i * 89.5) % width);
      ty = ((i * 29.1 + 10) % Math.max(20, arena.y - 15)) + 5;
    } else {
      // Bottom margin
      const bottomMarginH = Math.max(20, height - (arena.y + arena.height) - 15);
      tx = ((i * 93.7) % width);
      ty = arena.y + arena.height + 5 + ((i * 31.3) % bottomMarginH);
    }

    const tr = 4.5 + (i % 5) * 1.6;
    const rot = (i * 0.58) % (Math.PI * 2);
    const color = triangleColors[i % triangleColors.length];
    const isSolid = (i % 4 === 0);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.60 + (i % 3) * 0.15;

    ctx.beginPath();
    ctx.moveTo(0, -tr);
    ctx.lineTo(tr * 0.86, tr * 0.5);
    ctx.lineTo(-tr * 0.86, tr * 0.5);
    ctx.closePath();

    if (isSolid) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Diagonal Needle Speed Lines across the outer margins
  const needleColors = [
    'rgba(56, 189, 248, 0.65)',
    'rgba(96, 165, 250, 0.60)',
    isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(40, 50, 70, 0.55)'
  ];

  for (let i = 0; i < 18; i++) {
    let sx, sy;
    if (i % 2 === 0) {
      // Left side needle
      sx = ((i * 47.1 + 10) % Math.max(20, arena.x - 10));
      sy = ((i * 111.3 + 30) % height);
    } else {
      // Right side needle
      const rightMarginW = Math.max(20, width - (arena.x + arena.width) - 20);
      sx = arena.x + arena.width + 10 + ((i * 53.7) % rightMarginW);
      sy = ((i * 119.7 + 30) % height);
    }

    const len = 45 + (i % 5) * 18;
    const angle = -0.68 + ((i % 3) - 1) * 0.06;
    const color = needleColors[i % needleColors.length];

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55 + (i % 3) * 0.15;
    ctx.lineWidth = 1.2 + (i % 2) * 0.6;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawArena() {
  const { ctx, canvas, arena, pixiLayers, pixiApp } = state;
  const isDark = (state.arenaTheme === 'dark');

  // Custom Tactical Shooter Battleground Map
  if (state.gameCategory === 'tactical') {
    if (state.arenaGraphics) {
      const g = state.arenaGraphics;
      g.clear();
      g.beginFill(0x000000, 1.0);
      const scrW = pixiApp ? pixiApp.screen.width : (canvas.width || 540);
      const scrH = pixiApp ? pixiApp.screen.height : (canvas.height || 960);
      g.drawRect(0, 0, scrW, scrH);
      g.endFill();
    }
    if (state.floorGraphics) state.floorGraphics.clear();
    const activeMap = state.activeMap || STARTER_MAP;
    drawTacticalMap(ctx, activeMap);
    return;
  }

  const hasActiveDomain = state.fighters && state.fighters.some(f => f && f.domainActive && typeof f.drawDomainBackground === 'function');

  // 1. Draw outer background container (Original Colors)
  if (typeof window !== 'undefined' && window.PIXI && pixiApp && pixiLayers?.arena) {
    if (!state.arenaGraphics) {
      state.arenaGraphics = new window.PIXI.Graphics();
      pixiLayers.arena.addChild(state.arenaGraphics);
    }
    
    const g = state.arenaGraphics;
    g.clear();

    const parseColor = (c) => {
      if (typeof c === 'number') return { color: c, alpha: 1 };
      if (!c) return { color: 0x000000, alpha: 1 };
      let hex = c.replace('#', '');
      if (hex.length === 8) return { color: parseInt(hex.substring(0, 6), 16), alpha: parseInt(hex.substring(6, 8), 16) / 255 };
      if (hex.length === 6) return { color: parseInt(hex, 16), alpha: 1 };
      if (hex.length === 3) return { color: parseInt(hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2], 16), alpha: 1 };
      return { color: 0x000000, alpha: 1 };
    };

    const isDark = (state.arenaTheme === 'dark');
    const canvasBg = parseColor(isDark ? '#000000' : (CONFIG.canvasBgColor || '#000000'));
    const outerBg = parseColor(isDark ? '#000000' : (CONFIG.arenaOuterBgColor || '#f5f5f5'));
    const innerBg = parseColor(isDark ? '#000000' : (CONFIG.arenaInnerBgColor || '#ffffff'));

    g.beginFill(canvasBg.color, canvasBg.alpha);
    g.drawRect(0, 0, pixiApp.screen.width, pixiApp.screen.height);
    g.endFill();

    const whiteTop = 0;
    const whiteBottom = pixiApp.screen.height;
    if (!hasActiveDomain) {
      g.beginFill(outerBg.color, outerBg.alpha);
      g.drawRect(0, whiteTop, pixiApp.screen.width, whiteBottom - whiteTop);
      g.endFill();
    } else {
      g.beginFill(canvasBg.color, canvasBg.alpha);
      g.drawRect(0, whiteTop, pixiApp.screen.width, whiteBottom - whiteTop);
      g.endFill();
    }

    // 2. Draw Floor Background (Original Colors)
    if (!hasActiveDomain) {
      if (!state.floorGraphics && pixiLayers?.environment) {
        state.floorGraphics = new window.PIXI.Graphics();
        pixiLayers.environment.addChildAt(state.floorGraphics, 0);
      }
      if (state.floorGraphics) {
        const fg = state.floorGraphics;
        fg.clear();
        fg.beginFill(innerBg.color, innerBg.alpha);
        fg.drawRect(arena.x, arena.y, arena.width, arena.height);
        fg.endFill();
      }
    } else {
      if (state.floorGraphics) {
        state.floorGraphics.clear();
      }
    }
  }

  // 3. Draw Graphic Details (Halftone Dots, Action Triangles, Speed Needles) strictly OUTSIDE the arena
  // In DARK MODE: completely hide background theme details outside the arena (pure plain black)
  if (!hasActiveDomain && !isDark) {
    const detailsKey = `${canvas.width}_${canvas.height}_${arena.x}_${arena.y}_${arena.width}_${arena.height}_${isDark ? 'dark' : 'light'}`;
    if (!state._arenaOuterDetailsCanvas || state._arenaOuterDetailsCanvas._key !== detailsKey) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
      const oc = offCanvas.getContext('2d');
      drawOuterArenaGraphicDetails(oc, canvas.width, canvas.height, arena, isDark);
      offCanvas._key = detailsKey;
      state._arenaOuterDetailsCanvas = offCanvas;
    }

    ctx.save();
    ctx.drawImage(state._arenaOuterDetailsCanvas, 0, 0);
    ctx.restore();
  }

  // 4. Draw Arena Borders
  {
    const wallWidth = (typeof state !== 'undefined' && state.config && state.config.arena && state.config.arena.wallWidth) 
      ? state.config.arena.wallWidth 
      : 4;

    const borderColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 15, 18, 0.85)';
    const borderKey = `${arena.width}_${arena.height}_${wallWidth}_${isDark ? 'dark_clean' : 'light'}`;
    if (!state._arenaBorderCanvas || state._arenaBorderCanvas._key !== borderKey) {
      const padding = 60;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = arena.width + padding * 2;
      offCanvas.height = arena.height + padding * 2;
      const oc = offCanvas.getContext('2d');
      if (isDark) {
        // Clean straight-line borders for Dark Mode
        oc.strokeStyle = borderColor;
        oc.lineWidth = wallWidth;
        oc.lineJoin = 'miter';
        oc.lineCap = 'square';
        oc.strokeRect(padding, padding, arena.width, arena.height);
      } else {
        drawSketchyArenaBorders(oc, { x: padding, y: padding, width: arena.width, height: arena.height }, wallWidth, borderColor);
      }
      offCanvas._key = borderKey;
      state._arenaBorderCanvas = offCanvas;
    }

    const shakeX = state.shakeX || 0;
    const shakeY = state.shakeY || 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.drawImage(state._arenaBorderCanvas, arena.x - 60, arena.y - 60);

    // ── Draw Wall Cracks (Decals) ──
    if (state.wallCracks && state.wallCracks.length > 0) {
      ctx.save();
      ctx.beginPath();
      const clipMarginTop = 75;
      const clipMarginBottom = 75;
      const clipMarginSides = 42;
      ctx.rect(
        arena.x - clipMarginSides,
        arena.y - clipMarginTop,
        arena.width + clipMarginSides * 2,
        arena.height + clipMarginTop + clipMarginBottom
      );
      ctx.clip();

      for (let i = state.wallCracks.length - 1; i >= 0; i--) {
        const crack = state.wallCracks[i];
        crack.life--;
        if (crack.life <= 0) {
          state.wallCracks.splice(i, 1);
          continue;
        }
        drawSolidVectorCrack(ctx, crack, isDark);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 5. Draw "CRONOSPHERE" transparent watermark (Light Mode Only - hidden in Dark Mode)
  if (!isDark) {
    const centerX = arena.x + arena.width / 2;
    const centerY = arena.y + arena.height / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(30, 120, 255, 0.05)';
    ctx.font = '900 34px "Impact", "Trebuchet MS", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = '6px';
    }
    ctx.fillText('CRONOSPHERE', centerX, centerY);
    ctx.restore();
  }

  const centerX = arena.x + arena.width / 2;

  // 5b. Text above Top Arena Wall (Dark Mode: Fighter Names | Light Mode: BGM Title)
  if (isDark) {
    // In DARK MODE: Display Match Fighters Name above Top Arena Wall (e.g. "GOJO VS SUKUNA") with prominent bold typography
    if (state.fighters && state.fighters.length > 0 && (state.gameState === 'playing' || state.gameState === 'countdown' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
      const textY = arena.y - 12;
      ctx.save();
      ctx.font = '900 22px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
      ctx.textBaseline = 'bottom';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '2px';
      }

      if (state.fighters.length === 2) {
        const f1 = state.fighters[0];
        const f2 = state.fighters[1];
        const name1 = (f1.name || f1._def?.name || f1.characterId || 'P1').toUpperCase();
        const name2 = (f2.name || f2._def?.name || f2.characterId || 'P2').toUpperCase();
        const vsText = 'VS';

        const nameFont = '900 22px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
        const vsFont = '800 14px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
        const vsPadding = 12;

        ctx.font = nameFont;
        const w1 = ctx.measureText(name1).width;
        const w2 = ctx.measureText(name2).width;

        ctx.font = vsFont;
        const wVs = ctx.measureText(vsText).width;

        const totalW = w1 + vsPadding + wVs + vsPadding + w2;
        const maxW = arena.width - 16; // 8px padding on each side
        const scale = totalW > maxW ? maxW / totalW : 1.0;

        ctx.translate(centerX, textY);
        ctx.scale(scale, 1.0);
        ctx.translate(-centerX, -textY);

        let startX = centerX - totalW / 2;

        ctx.textAlign = 'left';

        // Fighter 1 Name
        ctx.font = nameFont;
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillStyle = f1.themeColor || f1.color || '#38BDF8';
        ctx.strokeText(name1, startX, textY);
        ctx.fillText(name1, startX, textY);
        startX += w1 + vsPadding;

        // "VS" Accent
        ctx.font = vsFont;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillStyle = '#94A3B8';
        const vsY = textY - 1.5;
        ctx.strokeText(vsText, startX, vsY);
        ctx.fillText(vsText, startX, vsY);
        startX += wVs + vsPadding;

        // Fighter 2 Name
        ctx.font = nameFont;
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillStyle = f2.themeColor || f2.color || '#F87171';
        ctx.strokeText(name2, startX, textY);
        ctx.fillText(name2, startX, textY);
      } else {
        // Multi-fighter or single fighter fallback
        const names = state.fighters.map(f => (f.name || f._def?.name || f.characterId || 'P').toUpperCase()).join(' VS ');
        ctx.textAlign = 'center';
        const namesW = ctx.measureText(names).width;
        const maxW = arena.width - 16;
        const scale = namesW > maxW ? maxW / namesW : 1.0;
        ctx.translate(centerX, textY);
        ctx.scale(scale, 1.0);
        ctx.translate(-centerX, -textY);
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeText(names, centerX, textY);
        ctx.fillText(names, centerX, textY);
      }

      ctx.restore();
    }
  } else {
    // In LIGHT MODE: Background Music Title Text above Top Arena Wall
    const bgmTitle = getCurrentPlayingBgmTitle();
    if (bgmTitle && (state.gameState === 'playing' || state.gameState === 'countdown' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
      const textY = arena.y - 8;
      ctx.save();
      ctx.font = '900 11px "Outfit", "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // Crisp light stroke outline
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeText(bgmTitle, centerX, textY);
      
      // Amber-gold fill
      ctx.fillStyle = '#b45309';
      ctx.fillText(bgmTitle, centerX, textY);
      ctx.restore();
    }
  }

  // 6. Cached Title Header (text only)
  const showTitle = (typeof CONFIG !== 'undefined' && CONFIG.showArenaTitle !== undefined) ? CONFIG.showArenaTitle : false;
  if (!showTitle) {
    return;
  }

  if (!state._titleHeaderCanvas || state._titleHeaderCanvasTheme !== (state.arenaTheme || 'light')) {
    // Prevent Flash of Unstyled Text (FOUT) and visual jumping by waiting for custom fonts
    if (document.fonts) {
      const harutoReady = document.fonts.check('900 42px "Haruto"');
      const glastReady = document.fonts.check('18px "Glast Blitch"');
      if (!harutoReady || !glastReady) {
        document.fonts.load('900 42px "Haruto"');
        document.fonts.load('18px "Glast Blitch"');
        return; // Skip rendering header completely until fonts are fully loaded
      }
    }

    const headerW = CONFIG.canvasWidth || 540;
    const headerH = 170;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = headerW;
    offCanvas.height = headerH;
    const oc = offCanvas.getContext('2d');

    // ── Title Text (rendered once) ────────────────────────────────────────
    const textCX = headerW / 2;
    oc.fillStyle = isDark ? '#ffffff' : '#000000';
    oc.font = '900 42px "Haruto", Arial';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.strokeStyle = isDark ? '#000000' : '#ffffff';
    oc.lineWidth = 4.5;
    oc.strokeText('Fight of Characters', textCX, 100);
    oc.fillText('Fight of Characters', textCX, 100);

    oc.font = '18px "Glast Blitch", Arial';
    oc.lineWidth = 3.5;
    oc.strokeText('Ball Fight Simulator', textCX, 135);
    oc.fillText('Ball Fight Simulator', textCX, 135);

    offCanvas._theme = state.arenaTheme || 'light';
    state._titleHeaderCanvas = offCanvas;
    state._titleHeaderCanvasTheme = offCanvas._theme;
  }

  // Blit the fully cached title header (text only) in one drawImage call
  // Position it relative to the arena and scale it using CONFIG.internalScale
  const scale = CONFIG.internalScale || 1.0;
  const drawW = state._titleHeaderCanvas.width * scale;
  const drawH = state._titleHeaderCanvas.height * scale;
  
  ctx.save();
  ctx.drawImage(state._titleHeaderCanvas, centerX - drawW / 2, arena.y - drawH - 10, drawW, drawH);
  
  // The title header banner ("FIGHT OF CHARACTERS") is drawn bright and clear above the arena
  ctx.restore();
}

export function excludeGojoInfinityFromDim(ctx) {
  if (!state.fighters) return;
  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;
  const isSaitamaCounterActive = state.fighters.some(f => 
    f && (f.characterId === 'saitama' || f.type === 'saitama') && 
    ((f._counterPunchTimer && f._counterPunchTimer > 0) || 
     (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) || 
     (f._counterWindupTimer && f._counterWindupTimer > 0) ||
     f.isCountering)
  );
  for (const f of state.fighters) {
    if (!f || f.hp <= 0) continue;
    const isGojo = (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo');
    if (!isGojo) continue;
    const isBarrierSuppressed = Boolean(f.isTargetOfAmbush || f.caughtInSaitamaCounter || isSaitamaCounterActive || (f.infinityFadeOpacity !== undefined && f.infinityFadeOpacity <= 0.005));
    if (isBarrierSuppressed) continue;
    const isLimitlessActive = (!f.isMeleeMode || (f.infinityBlockTimer || 0) > 0);
    if (!isLimitlessActive) continue;
    
    const infinityR = CONFIG.gojo?.infinityRadius ?? (f.r + 30);
    const cutoutRadius = infinityR + 25;
    const drawX = f.x + shakeX;
    const drawY = f.y - (f.z || 0) + shakeY;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const holeGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, cutoutRadius);
    holeGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    holeGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.85)');
    holeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(drawX, drawY, cutoutRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let currentPurpleDimOpacity = 0;

/**
 * Draws a purple dim screen overlay when Gojo's Hollow Purple is being channeled,
 * actively moving as a projectile, or in post-fire recovery.
 */
export function drawPurpleDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const activeProjectiles = typeof getProjectiles === 'function' ? getProjectiles() : [];
  const purpleOrb = activeProjectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0);

  const gojoFighter = state.fighters?.find(f =>
    f && (f.isChannelingPurple || (f.purpleRecoveryTimer && f.purpleRecoveryTimer > 0))
  );

  let targetOpacity = 0;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (gojoFighter && gojoFighter.isChannelingPurple) {
    cx = gojoFighter.x;
    cy = gojoFighter.y - (gojoFighter.z || 0);
    const chargeMax = gojoFighter.purpleChargeMax || 120;
    const progress = Math.min(1.0, (gojoFighter.purpleChargeTimer || 0) / Math.max(1, chargeMax));
    targetOpacity = 0.25 + progress * 0.55; // Smooth charge up from 0.25 to 0.80
  } else if (purpleOrb) {
    cx = purpleOrb.x;
    cy = purpleOrb.y;
    const maxLife = purpleOrb.maxLife || 300;
    const currentLife = purpleOrb.life || 0;
    const lifeRatio = Math.max(0, Math.min(1, currentLife / maxLife));
    targetOpacity = 0.50 + Math.sin(lifeRatio * Math.PI) * 0.20; // High intensity during orb flight
  } else if (gojoFighter && gojoFighter.purpleRecoveryTimer > 0) {
    cx = gojoFighter.x;
    cy = gojoFighter.y - (gojoFighter.z || 0);
    const recProgress = gojoFighter.purpleRecoveryTimer / 30;
    targetOpacity = 0.45 * recProgress;
  }

  // Smoothly interpolate dim opacity for seamless fade-in and gradual fade-out
  if (targetOpacity > currentPurpleDimOpacity) {
    currentPurpleDimOpacity += (targetOpacity - currentPurpleDimOpacity) * 0.15; // Smooth charge fade-in
  } else {
    currentPurpleDimOpacity += (targetOpacity - currentPurpleDimOpacity) * 0.18; // Smooth clear fade-out
  }

  if (currentPurpleDimOpacity < 0.01) {
    currentPurpleDimOpacity = 0;
    return;
  }

  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;

  ctx.save();
  // Reset transform to identity screen space so full-screen dim rect doesn't shake outer edges
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const opacity = currentPurpleDimOpacity;

  // Dark base black overlay (instead of purple)
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.92})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dynamic radial gradient centered on Gojo or Purple Orb
  const maxDim = Math.max(arena.width, arena.height) * 0.70;
  const roundCx = Math.round((cx + shakeX) / 10) * 10;
  const roundCy = Math.round((cy + shakeY) / 10) * 10;
  const is200 = (purpleOrb && purpleOrb.is200Percent) || (gojoFighter && (gojoFighter.is200PercentChannel || gojoFighter.purpleUseCount === 1));
  const key = `${roundCx}_${roundCy}_${maxDim}_${is200}`;

  if (!state._cachedPurpleDimGrad || state._cachedPurpleDimKey !== key) {
    state._cachedPurpleDimKey = key;
    state._cachedPurpleDimGrad = ctx.createRadialGradient(
      roundCx, roundCy, 0,
      roundCx, roundCy, maxDim
    );
    const glowR = is200 ? 140 : 90;
    const rRatio = glowR / maxDim;

    // Concentrates a deep, highly saturated vibrant purple halo around the Hollow Purple orb, fading to pitch black
    state._cachedPurpleDimGrad.addColorStop(0, 'rgba(210, 40, 255, 1.0)');           // Vibrant neon magenta-purple core
    state._cachedPurpleDimGrad.addColorStop(rRatio * 0.20, 'rgba(160, 0, 255, 0.95)'); // Saturated electric royal purple
    state._cachedPurpleDimGrad.addColorStop(rRatio * 0.55, 'rgba(120, 0, 220, 0.75)');  // Deep JJK cursed purple ring
    state._cachedPurpleDimGrad.addColorStop(rRatio * 1.00, 'rgba(75, 0, 150, 0.45)');   // Dark violet halo bloom
    state._cachedPurpleDimGrad.addColorStop(rRatio * 1.50, 'rgba(30, 0, 70, 0.20)');    // Deep night-purple transition
    state._cachedPurpleDimGrad.addColorStop(Math.min(1.0, rRatio * 2.2), 'rgba(0, 0, 0, 1.0)'); // Dark outer space
    state._cachedPurpleDimGrad.addColorStop(1.0, 'rgba(0, 0, 0, 1.0)');               // Pitch black boundary
  }

  ctx.globalAlpha = opacity;
  ctx.fillStyle = state._cachedPurpleDimGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Render vibrant Red & Blue radiant bloom halos during Hollow Purple mixing phase ──
  if (gojoFighter && gojoFighter.isChannelingPurple) {
    const chargeMax = gojoFighter.purpleChargeMax || 120;
    const progress = Math.min(1.0, (gojoFighter.purpleChargeTimer || 0) / Math.max(1, chargeMax));
    const is200 = !!(gojoFighter.is200PercentChannel || gojoFighter.purpleUseCount === 1);

    if (progress < 0.70) {
      const f = gojoFighter;
      const angle = f.gunAngle || f.angle || 0;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const moveP = progress / 0.70;
      const easeMove = Math.sin(moveP * Math.PI * 0.5);

      let headX, handSpreadY;
      if (is200) {
        headX = -f.r * 2.8;
        handSpreadY = f.r * 2.8;
      } else {
        headX = f.r + 10;
        handSpreadY = 14;
      }
      const spreadY = handSpreadY * (1 - easeMove);

      // Red orb canvas center (right side)
      const redLocalX = headX;
      const redLocalY = spreadY;
      const redCanvasX = f.x + (redLocalX * cosA - redLocalY * sinA) + shakeX;
      const redCanvasY = (f.y - (f.z || 0)) + (redLocalX * sinA + redLocalY * cosA) + shakeY;

      // Blue orb canvas center (left side)
      const blueLocalX = headX;
      const blueLocalY = -spreadY;
      const blueCanvasX = f.x + (blueLocalX * cosA - blueLocalY * sinA) + shakeX;
      const blueCanvasY = (f.y - (f.z || 0)) + (blueLocalX * sinA + blueLocalY * cosA) + shakeY;

      // Render radiant Red & Blue bloom halos over pitch-black screen dim
      const fadeInP = Math.min(1.0, progress / 0.22);
      const easeFade = Math.sin(fadeInP * Math.PI * 0.5);
      const growP = Math.min(1.0, progress / 0.35);
      const easeGrow = Math.sin(growP * Math.PI * 0.5);
      const bloomScale = is200 ? (0.20 + 0.80 * easeGrow) : 1.0;
      const bloomRadius = (is200 ? 110 : 80) * bloomScale;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = opacity * (1.0 - progress * 0.3) * easeFade;

      // 1. Red Bloom Halo
      const redGrad = ctx.createRadialGradient(redCanvasX, redCanvasY, 0, redCanvasX, redCanvasY, bloomRadius);
      redGrad.addColorStop(0, 'rgba(255, 60, 60, 1.0)');
      redGrad.addColorStop(0.25, 'rgba(255, 0, 0, 0.90)');
      redGrad.addColorStop(0.60, 'rgba(180, 0, 0, 0.60)');
      redGrad.addColorStop(1.0, 'rgba(80, 0, 0, 0)');
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.arc(redCanvasX, redCanvasY, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Blue Bloom Halo
      const blueGrad = ctx.createRadialGradient(blueCanvasX, blueCanvasY, 0, blueCanvasX, blueCanvasY, bloomRadius);
      blueGrad.addColorStop(0, 'rgba(80, 220, 255, 1.0)');
      blueGrad.addColorStop(0.25, 'rgba(0, 120, 255, 0.90)');
      blueGrad.addColorStop(0.60, 'rgba(0, 50, 220, 0.60)');
      blueGrad.addColorStop(1.0, 'rgba(0, 20, 140, 0)');
      ctx.fillStyle = blueGrad;
      ctx.beginPath();
      ctx.arc(blueCanvasX, blueCanvasY, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Exclude Rika from Gojo's Purple dim screen overlay so she stays fully bright & un-tinted
  if (state.fighters) {
    for (const f of state.fighters) {
      if (!f || !f.rika || !f.rika.active || !f.rikaAlpha || f.rikaAlpha <= 0) continue;
      const rk = f.rika;
      const rScale = rk.spawnScale ?? 1.0;
      const cutoutRadius = Math.max(90, (rk.r || 35) * rScale * 3.0 + 60);
      const rkX = rk.x + shakeX;
      const rkY = rk.y + shakeY;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const holeGrad = ctx.createRadialGradient(rkX, rkY, 0, rkX, rkY, cutoutRadius);
      const alphaMult = Math.min(1.0, f.rikaAlpha || 1.0);
      holeGrad.addColorStop(0, `rgba(0, 0, 0, ${alphaMult})`);
      holeGrad.addColorStop(0.60, `rgba(0, 0, 0, ${alphaMult * 0.85})`);
      holeGrad.addColorStop(1.0, `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(rkX, rkY, cutoutRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Exclude Gojo's Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

let currentTojiUltimateOpacity = 0;
let currentSaitamaSeriousPunchOpacity = 0;
let flyHeads = [];
let seriousPunchImg = null;
let seriousPunchImgLoading = false;

function loadSeriousPunchImage() {
  if (seriousPunchImg || seriousPunchImgLoading) return;
  seriousPunchImgLoading = true;
  seriousPunchImg = new Image();
  seriousPunchImg.onload = () => {
    seriousPunchImgLoading = false;
  };
  seriousPunchImg.onerror = (e) => {
    console.error("Failed to load serious punch image:", e);
    seriousPunchImgLoading = false;
    seriousPunchImg = null;
  };
  seriousPunchImg.src = 'Assets/Overlays/serious-punch.png';
}

export function drawTojiUltimateOverlay() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const toji = state.fighters?.find(f => f && f.ultimateActive && (f.ultimatePhase === 'VANISHED' || f.ultimatePhase === 'STRIKING' || f.ultimatePhase === 'CRATER_FADEIN' || f.ultimatePhase === 'CRATER'));

  let targetOpacity = 0;
  if (toji) {
    targetOpacity = 0.85; // Very dark
    
    // Spawn fly heads if we have less than 40
    if (Math.random() < 0.4 && flyHeads.length < 40) {
      flyHeads.push({
        x: canvas.width + Math.random() * 100,
        y: Math.random() * canvas.height,
        vx: -15 - Math.random() * 20,
        vy: (Math.random() - 0.5) * 5,
        size: 5 + Math.random() * 10 // Reduced from 15 + Math.random() * 30 to be much smaller
      });
    }
  }

  // Smooth fade
  if (targetOpacity > currentTojiUltimateOpacity) {
    currentTojiUltimateOpacity += (targetOpacity - currentTojiUltimateOpacity) * 0.15;
  } else {
    currentTojiUltimateOpacity += (targetOpacity - currentTojiUltimateOpacity) * 0.18;
  }

  if (currentTojiUltimateOpacity < 0.01) {
    currentTojiUltimateOpacity = 0;
    flyHeads = []; // Clear array when not in use
    return;
  }

  ctx.save();
  // Reset the transform temporarily so the pitch-black overlay and swarm are perfectly glued to the camera
  // and do not jitter or expose the edges of the screen during violent screen shakes.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = currentTojiUltimateOpacity;
  
  // Pitch black overlay
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw and update fly heads
  ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
  for (let i = flyHeads.length - 1; i >= 0; i--) {
    const head = flyHeads[i];
    
    ctx.beginPath();
    ctx.arc(head.x, head.y, head.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Tiny red eyes
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(head.x - head.size * 0.3, head.y - head.size * 0.1, 2, 0, Math.PI * 2);
    ctx.arc(head.x + head.size * 0.1, head.y - head.size * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    
    head.x += head.vx;
    head.y += head.vy;
    
    if (head.x < -100) {
      flyHeads.splice(i, 1);
    }
  }

  // ── SPOTLIGHT HIGHLIGHTS: Illuminates Toji and the Target through the dark ultimate overlay ──
  if (toji) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // 1. Toji Cinematic Spotlight / Ethereal Backlight
    const tojiScreenX = toji.x + (state.shakeX || 0);
    const tojiScreenY = (toji.y - (toji.z || 0)) + (state.shakeY || 0);
    const tojiSpotR = (toji.r || 25) * 5.0; // ~125px radius bloom
    const tojiGrad = ctx.createRadialGradient(tojiScreenX, tojiScreenY, 10, tojiScreenX, tojiScreenY, tojiSpotR);
    tojiGrad.addColorStop(0,    'rgba(215, 140, 255, 0.85)'); // Electric Violet Core
    tojiGrad.addColorStop(0.30, 'rgba(160, 48, 255, 0.55)');
    tojiGrad.addColorStop(0.65, 'rgba(100, 20, 180, 0.25)');
    tojiGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tojiGrad;
    ctx.beginPath();
    ctx.arc(tojiScreenX, tojiScreenY, tojiSpotR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Target Cinematic Threat Spotlight (The Enemy)
    const target = toji.ultimateTarget;
    if (target && target.hp > 0) {
      const targetScreenX = target.x + (state.shakeX || 0);
      const targetScreenY = (target.y - (target.z || 0)) + (state.shakeY || 0);
      const targetSpotR = (target.r || 25) * 5.0; // ~125px radius bloom
      const targetGrad = ctx.createRadialGradient(targetScreenX, targetScreenY, 10, targetScreenX, targetScreenY, targetSpotR);
      targetGrad.addColorStop(0,    'rgba(255, 90, 130, 0.85)'); // Radiant Crimson Core
      targetGrad.addColorStop(0.30, 'rgba(255, 30, 86, 0.55)');
      targetGrad.addColorStop(0.65, 'rgba(180, 15, 50, 0.25)');
      targetGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
      ctx.fillStyle = targetGrad;
      ctx.beginPath();
      ctx.arc(targetScreenX, targetScreenY, targetSpotR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Exclude Gojo's Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(5, 5, 5, ${currentTojiUltimateOpacity})`;
}

/**
 * Draws a dark golden cinematic dim screen overlay when Mahoraga adapts and rotates his 3D Dharma Wheel.
 */
export function drawMahoragaAdaptationDimScreen() {
  if (CONFIG.mahoraga?.enableGoldenScreenDim === false) return;

  const { ctx, canvas, arena } = state;
  const mahoraga = state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')) && (f.wheelClickTimer > 0 || f.adaptationPauseTimer > 0));
  if (!mahoraga) return;

  const timer = (mahoraga.adaptationPauseTimer && mahoraga.adaptationPauseTimer > 0) ? mahoraga.adaptationPauseTimer : mahoraga.wheelClickTimer;
  const clickMax = mahoraga.adaptationPauseMax || mahoraga.wheelClickMax || CONFIG.mahoraga?.wheelClickDuration || 25;
  const rawProgress = (clickMax - timer) / clickMax; // Elapsed progress: 0.0 -> 0.5 (peak) -> 1.0
  const progress = Math.min(1.0, Math.max(0.0, rawProgress));
  const maxOpacity = CONFIG.mahoraga?.goldenDimOpacity ?? 0.85;
  const opacity = Math.sin(progress * Math.PI) * maxOpacity; // Bell-curve: 0 at start -> 1 at middle -> 0 at end!

  if (opacity <= 0.01) return;

  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;

  ctx.save();
  // Reset transform to identity screen space so full-screen dim rect doesn't shake outer edges
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Dark Golden Vignette Radial Gradient centered at Mahoraga's wheel
  const drawX = mahoraga.x + shakeX;
  const wheelY = mahoraga.y - mahoraga.r - 28 + shakeY;
  const maxRadius = Math.max(arena.width, arena.height) * 0.70;
  const grad = ctx.createRadialGradient(
    drawX, wheelY, 15,
    drawX, wheelY, maxRadius
  );
  // Dark cinematic vignette overlay (properly darkens the entire arena including Gojo and afterimages!)
  grad.addColorStop(0, `rgba(40, 30, 8, ${opacity * 0.65})`);
  grad.addColorStop(0.25, `rgba(18, 12, 3, ${opacity * 0.88})`);
  grad.addColorStop(0.60, `rgba(8, 4, 1, ${opacity * 0.96})`);
  grad.addColorStop(1.0, `rgba(0, 0, 0, ${opacity * 0.98})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nanami Classic Graphic Paint Splatter (Faithful to Reference Image)
// ─────────────────────────────────────────────────────────────────────────────
// PRE-SEEDED STATIC SPLATTER ARRAYS (Zero Per-Frame GC Allocations)
// ─────────────────────────────────────────────────────────────────────────────
const _SPLATTER_CORE_CIRCLES = [
  { x: 0, y: 0, r: 22 }, { x: -8, y: -12, r: 16 }, { x: 12, y: -6, r: 18 },
  { x: 5, y: 15, r: 15 }, { x: -14, y: 8, r: 14 }, { x: -18, y: -5, r: 12 },
  { x: 18, y: 12, r: 14 }, { x: 20, y: -18, r: 12 }, { x: -10, y: 22, r: 10 },
  { x: 15, y: 20, r: 9 }, { x: 0, y: -22, r: 13 }, { x: -22, y: 12, r: 9 }
];

const _SPLATTER_STREAKS = [
  { x1: 15, y1: -15, x2: 22, y2: -8, tipX: 95, tipY: -55 },
  { x1: -15, y1: -10, x2: -8, y2: -18, tipX: -75, tipY: -65 },
  { x1: -20, y1: 0, x2: -15, y2: 15, tipX: -55, tipY: 10 },
  { x1: -15, y1: 15, x2: -5, y2: 20, tipX: -30, tipY: 45 },
  { x1: 5, y1: 20, x2: 15, y2: 15, tipX: 10, tipY: 60, bulbR: 6 },
  { x1: 15, y1: 10, x2: 22, y2: 5, tipX: 60, tipY: 25 },
  { x1: -5, y1: -20, x2: 5, y2: -20, tipX: -2, tipY: -45 },
  { x1: 20, y1: -5, x2: 20, y2: 5, tipX: 45, tipY: -10 },
  { x1: -20, y1: -15, x2: -15, y2: -10, tipX: -45, tipY: -25 }
];

const _SPLATTER_DOTS = [
  { x: -55, y: -15, r: 3.5 },
  { x: 85, y: 10, r: 4 },
  { x: -45, y: 65, r: 5 },
  { x: -65, y: 68, r: 2.5 },
  { x: -85, y: 35, r: 2 },
  { x: 35, y: 55, r: 2.5 },
  { x: -20, y: -75, r: 3 },
  { x: 65, y: -45, r: 2 },
  { x: 45, y: -70, r: 2.5 }
];

function _drawPaintSplatter(ctx, cx, cy, scale = 1.0, color = '#E50018', bgDark = '#78000A') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  function drawInkSplat(c, drawColor) {
    c.fillStyle = drawColor;
    
    // 1. Irregular Core (overlapping circles to form a bumpy, solid blob)
    for (let i = 0; i < _SPLATTER_CORE_CIRCLES.length; i++) {
      const d = _SPLATTER_CORE_CIRCLES[i];
      c.beginPath();
      c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      c.fill();
    }

    // 2. Sharp, irregular streaks/spikes shooting outward
    for (let i = 0; i < _SPLATTER_STREAKS.length; i++) {
      const s = _SPLATTER_STREAKS[i];
      c.beginPath();
      c.moveTo(s.x1, s.y1);
      c.lineTo(s.tipX, s.tipY);
      c.lineTo(s.x2, s.y2);
      c.closePath();
      c.fill();
      
      if (s.bulbR) {
        c.beginPath();
        c.arc(s.tipX, s.tipY, s.bulbR, 0, Math.PI * 2);
        c.fill();
      }
    }

    // 3. Floating, detached dots
    for (let i = 0; i < _SPLATTER_DOTS.length; i++) {
      const d = _SPLATTER_DOTS[i];
      c.beginPath();
      c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      c.fill();
    }
  }

  // Pass 1: Dark Burgundy undercoat for depth
  ctx.save();
  ctx.scale(1.15, 1.15);
  drawInkSplat(ctx, bgDark);
  ctx.restore();

  // Pass 2: Vivid anime crimson body
  drawInkSplat(ctx, color);

  ctx.restore();
}

/**
 * Draws a high-contrast 7:3 Ratio ruler and graphic paint splatter overlay when Nanami lands a 7:3 Ratio Crit.
 */
export function drawNanamiRatioCritDimScreen() {
  if (CONFIG.nanami?.enableRatioDimScreen === false) return;

  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const nanami = state.fighters?.find(f => f && (f.characterId === 'nanami' || f.type === 'nanami' || f._def?.id === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);
  if (!nanami) return;

  const timer = nanami.ratioHitPauseTimer || 0;
  const maxTimer = nanami.ratioHitPauseMax || CONFIG.nanami?.ratioCritHitPauseFrames || 35;
  const rawProgress = Math.min(1.0, Math.max(0.0, (maxTimer - timer) / maxTimer));
  const maxOpacity = CONFIG.nanami?.ratioDimOpacity ?? 0.94;
  const opacity = Math.sin(rawProgress * Math.PI) * maxOpacity;

  if (opacity <= 0.01) return;

  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;

  // 1. Full Screen Cinematic Black Background
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(3, 3, 6, ${opacity * 0.96})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 2. Tilted 7:3 Measurement Ruler & Graphic Paint Splatter Overlay
  if (CONFIG.nanami?.enableRatioRulerOverlay !== false) {
    const target = nanami.ratioHitPauseTarget || nanami._chopTarget;
    const impactX = target ? target.x : (nanami.x + Math.cos(nanami.gunAngle || 0) * (nanami.r + 30));
    const impactY = target ? target.y : (nanami.y + Math.sin(nanami.gunAngle || 0) * (nanami.r + 30));

    const baseAngle = nanami.gunAngle || 0;
    const targetAngle = baseAngle - 0.20; // Final locked severance cut angle

    // ── Phase 1: Ruler Smooth 360° Spin & Expansion (0.0 to 0.30 Progress) ──
    const spinP = Math.min(1.0, rawProgress / 0.30);
    const easeSpin = 1.0 - Math.pow(1.0 - spinP, 3.0); // Smooth cubic ease-out
    // Spins exactly once (360° / 2*PI) and smoothly settles into target angle
    const currentAngle = targetAngle + (1.0 - easeSpin) * (Math.PI * 2);
    // Smoothly expands from small (0.10x) to full size (1.0x) as it spins
    const rulerScale = 0.10 + 0.90 * easeSpin;

    ctx.save();
    ctx.translate(impactX + shakeX, impactY + shakeY);
    ctx.rotate(currentAngle);
    ctx.scale(rulerScale, rulerScale);

    const rulerLength = 360;
    const halfL = rulerLength * 0.5;
    const step = rulerLength / 10;
    const alpha = Math.sin(rawProgress * Math.PI);

    // ── 2A. DRAW WHITE 10-DIVISION RULER LINE ──
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, alpha * 1.1);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'butt';

    // Main horizontal measurement bar
    ctx.beginPath();
    ctx.moveTo(-halfL, 0);
    ctx.lineTo(halfL, 0);
    ctx.stroke();

    // Measurement Ticks
    for (let k = 0; k <= 10; k++) {
      const tx = -halfL + k * step;
      if (k === 0 || k === 10) {
        // End T-Caps
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5.0;
        ctx.beginPath();
        ctx.moveTo(tx, -18);
        ctx.lineTo(tx, 18);
        ctx.stroke();
      } else if (k === 7) {
        // The 7:3 Division Point (Crimson Red Highlight)
        ctx.strokeStyle = '#FF1E27';
        ctx.lineWidth = 5.0;
        ctx.beginPath();
        ctx.moveTo(tx, -16);
        ctx.lineTo(tx, 16);
        ctx.stroke();
      } else {
        // Standard White Ticks
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(tx, -10);
        ctx.lineTo(tx, 10);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ── 2B. DRAW GRAPHIC PAINT SPLATTER (After 360 Spin Finishes) ──
    const ruptureX = -halfL + 7 * step; // Exactly at the 7:3 division tick (+72px along ruler)
    if (rawProgress >= 0.30) {
      const snapP = Math.min(1.0, (rawProgress - 0.30) / 0.70);
      const dropT = Math.min(1.0, snapP / 0.08); // 2-frame downward drop slam
      const dropY = -25 * (1.0 - dropT);
      const impactScale = 1.0 + 0.06 * (1.0 - dropT);

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, alpha * 1.35);
      _drawPaintSplatter(ctx, ruptureX, dropY, impactScale * 1.15, '#E50018', '#78000A');
      ctx.restore();
    }

    ctx.restore();
  }

  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

let currentMahoLevel8DimOpacity = 0;

export function drawMahoragaLevel8DimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const isPlaying = state.gameState === 'playing';
  // Find any active Mahoraga fighter that is Level 8 (transformed)
  const mahoraga = state.fighters?.find(f => {
    if (!f || f.hp <= 0) return false;
    const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
    return totalStages >= 8 || f.isMaxAdapted || f.isInfinityBlitz || (f.goldStages >= 8);
  });

  const shouldDim = isPlaying && !!mahoraga;
  const targetOpacity = shouldDim ? 1.0 : 0.0;

  // Smooth cinematic interpolation over ~1.5 seconds
  currentMahoLevel8DimOpacity += (targetOpacity - currentMahoLevel8DimOpacity) * 0.035;

  if (currentMahoLevel8DimOpacity <= 0.005) {
    currentMahoLevel8DimOpacity = 0;
    return;
  }

  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Center the spotlight and expand radius to encompass Mahoraga, enemy fighters, Rika, AND illusion minions
  const activeMaho = mahoraga || state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')));
  const activeTargets = [];
  if (activeMaho) activeTargets.push(activeMaho);
  if (state.fighters) {
    for (const f of state.fighters) {
      if (f && f !== activeMaho && f.hp > 0) {
        activeTargets.push(f);
        if (f.rika && f.rika.active && !f.rika.isDying) {
          activeTargets.push(f.rika);
        }
      }
    }
  }
  if (state.illusions) {
    for (const ill of state.illusions) {
      if (ill && ill.hp > 0) {
        activeTargets.push(ill);
      }
    }
  }

  let cx = canvas.width / 2;
  let cy = canvas.height / 2;
  let maxTargetDist = 80;

  if (activeTargets.length > 0) {
    let sumX = 0, sumY = 0;
    for (const t of activeTargets) {
      sumX += t.x;
      sumY += t.y;
    }
    cx = sumX / activeTargets.length;
    cy = sumY / activeTargets.length;

    for (const t of activeTargets) {
      const d = Math.hypot(t.x - cx, t.y - cy);
      if (d > maxTargetDist) maxTargetDist = d;
    }
  }

  const drawX = cx + shakeX;
  const drawY = cy + shakeY;
  const spotlightInnerR = Math.max(140, Math.min(650, maxTargetDist + 90));
  const maxRadius = Math.max(arena.width, arena.height) * 1.25;

  const grad = ctx.createRadialGradient(
    drawX, drawY, spotlightInnerR * 0.4,
    drawX, drawY, maxRadius
  );
  
  // High intensity golden-brown dark cinematic vignette
  const time = Date.now() * 0.0015;
  const pulse = Math.sin(time) * 0.04;
  const baseDimOpacity = 0.88 * currentMahoLevel8DimOpacity;
  const opacity = baseDimOpacity + pulse * currentMahoLevel8DimOpacity;
  
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.0)'); // Fully bright spotlight center
  grad.addColorStop(Math.min(0.7, (spotlightInnerR / maxRadius)), `rgba(14, 8, 2, ${opacity * 0.35})`); // Golden-brown highlight transition
  grad.addColorStop(0.8, `rgba(6, 3, 1, ${opacity * 0.88})`); // Very dark golden-brown
  grad.addColorStop(1.0, `rgba(0, 0, 0, ${opacity * 0.99})`); // Absolute black border

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── AMBIENT GOLDEN LIGHT SPILL (illumination of surroundings) ──
  if (activeMaho) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const pulseScale = 1.0 + Math.sin(Date.now() * 0.003) * 0.08; // Pulsing light intensity

    // 1. Wheel Light Spill (glow centered at Dharma Wheel)
    const wheelX = activeMaho.x + shakeX;
    const wheelY = activeMaho.y - activeMaho.r - 28 + shakeY;
    const wheelGlow = ctx.createRadialGradient(
      wheelX, wheelY, 5,
      wheelX, wheelY, 85 * pulseScale
    );
    wheelGlow.addColorStop(0, `rgba(255, 215, 0, ${0.35 * currentMahoLevel8DimOpacity})`); // Gold center
    wheelGlow.addColorStop(0.3, `rgba(255, 179, 0, ${0.15 * currentMahoLevel8DimOpacity})`); // Amber mid
    wheelGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = wheelGlow;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, 85 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // 2. Sword Light Spill (glow centered at extending blade)
    const swordAngle = activeMaho.gunAngle !== undefined ? activeMaho.gunAngle : 0;
    const swordDist = activeMaho.r + 30;
    const swordX = activeMaho.x + Math.cos(swordAngle) * swordDist + shakeX;
    const swordY = activeMaho.y + Math.sin(swordAngle) * swordDist + shakeY;

    const swordGlow = ctx.createRadialGradient(
      swordX, swordY, 10,
      swordX, swordY, 110 * pulseScale
    );
    swordGlow.addColorStop(0, `rgba(255, 235, 59, ${0.30 * currentMahoLevel8DimOpacity})`); // Bright yellow-gold
    swordGlow.addColorStop(0.4, `rgba(255, 152, 0, ${0.12 * currentMahoLevel8DimOpacity})`); // Soft orange
    swordGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = swordGlow;
    ctx.beginPath();
    ctx.arc(swordX, swordY, 110 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

export function drawFuelPickups() {
  const { ctx, fuelPickups, fighters } = state;

  // Only draw fuel pickups if an Orange fighter is currently alive in the arena.
  const hasOrange = fighters.some(f => f && f.hp > 0 && f._def.type === 'orange');
  if (!hasOrange) return;

  fuelPickups.forEach(pickup => {
    if (!pickup.active) return;

    ctx.save();

    // Pulsing effect
    const pulse = 0.85 + Math.sin(pickup.pulsePhase) * 0.15;
    const r = pickup.radius * pulse; // base radius for scaling

    // â”€â”€ Outer glow â”€â”€
    const glowGrad = ctx.createRadialGradient(pickup.x, pickup.y, r * 0.6, pickup.x, pickup.y, r * 2.2);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // â”€â”€ Battery dimensions â”€â”€
    const bw = r * 1.6;   // battery body width (half)
    const bh = r * 1.1;   // battery body height (half)
    const br = r * 0.35;  // corner radius
    const nx = pickup.x;  // center x
    const ny = pickup.y;  // center y

    // â”€â”€ Battery body (rounded rectangle) â”€â”€
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.fill();

    // ── Body metallic gradient overlay ──
    const bodyGrad = ctx.createLinearGradient(nx - bw, ny - bh, nx + bw, ny + bh);
    bodyGrad.addColorStop(0, '#6e6e6e');
    bodyGrad.addColorStop(0.3, '#8a8a8a');
    bodyGrad.addColorStop(0.5, '#b0b0b0');
    bodyGrad.addColorStop(0.7, '#8a8a8a');
    bodyGrad.addColorStop(1, '#5a5a5a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    roundedRect(ctx, nx - bw + 1.5, ny - bh + 1.5, bw * 2 - 3, bh * 2 - 3, br - 1);
    ctx.fill();

    // ── Positive terminal nub (top) ──
    const nubW = r * 0.35;
    const nubH = r * 0.45;
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW, ny - bh - nubH, nubW * 2, nubH, r * 0.15);
    ctx.fill();
    // nub highlight
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW + 1, ny - bh - nubH + 1, nubW * 2 - 2, nubH * 0.55, r * 0.1);
    ctx.fill();

    // ── Fuel level indicator (colored bar inside battery) ──
    const fuelRatio = 0.75; // pickups are always "full" looking
    const barPad = r * 0.25;
    const barX = nx - bw + barPad;
    const barY = ny - bh + barPad;
    const barW = (bw * 2 - barPad * 2) * fuelRatio;
    const barH = bh * 2 - barPad * 2;

    // Bar background (dark empty portion)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    roundedRect(ctx, barX, barY, bw * 2 - barPad * 2, barH, r * 0.12);
    ctx.fill();

    // Bar fill (green-to-orange gradient = energy)
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#4caf50');
    barGrad.addColorStop(0.5, '#ff9800');
    barGrad.addColorStop(1, '#ff5722');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    roundedRect(ctx, barX, barY, barW, barH, r * 0.12);
    ctx.fill();

    // ── Small "F" label on the bar ──
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * 0.55)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', nx, ny);

    // ── Battery outline ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.stroke();
    ctx.restore();
  });
}

// Helper: draw a rounded rectangle path
function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawSaitamaSeriousPunchDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  // Active ONLY during the charging/wind-up phase before the punch lands (_counterPunchTimer > 0)
  const saitama = state.fighters?.find(f => f && (f.type === 'saitama' || f.characterId === 'saitama' || f._def?.id === 'saitama') && f._counterPunchTimer > 0);

  // Trigger preloading of the user's serious punch overlay image
  if (!seriousPunchImg && !seriousPunchImgLoading) {
    loadSeriousPunchImage();
  }

  // The moment the punch lands (_counterPunchTimer reaches 0), instantly snap opacity to 0!
  if (!saitama) {
    currentSaitamaSeriousPunchOpacity = 0;
    if (typeof state !== 'undefined') state._saitamaSeriousPunchOpacity = 0;
    return;
  }

  const targetOpacity = 0.98; // Dark cinematic dimming during charge
  const totalTime = (CONFIG.saitama?.counterPunchPoseFrames ?? 90) + (CONFIG.saitama?.counterTeleportIdleFrames ?? 30);
  const progress = Math.min(1.0, Math.max(0.0, 1.0 - (saitama._counterPunchTimer / totalTime)));

  if (targetOpacity > currentSaitamaSeriousPunchOpacity) {
    currentSaitamaSeriousPunchOpacity += (targetOpacity - currentSaitamaSeriousPunchOpacity) * 0.25;
  } else {
    currentSaitamaSeriousPunchOpacity = targetOpacity;
  }
  if (typeof state !== 'undefined') state._saitamaSeriousPunchOpacity = currentSaitamaSeriousPunchOpacity;

  if (currentSaitamaSeriousPunchOpacity < 0.01) {
    currentSaitamaSeriousPunchOpacity = 0;
    if (typeof state !== 'undefined') state._saitamaSeriousPunchOpacity = 0;
    return;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = currentSaitamaSeriousPunchOpacity;

  // Center exactly in the middle of the arena
  const cx = arena.x + arena.width / 2;
  const cy = arena.y + arena.height / 2;

  // 1. Solid pitch black dimming screen (OPM Death Punch style)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.99)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw a dramatic glowing red backdrop directly behind where the fist centers
  const glowGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(canvas.width, canvas.height) * 0.45);
  glowGrad.addColorStop(0, 'rgba(255, 10, 10, 0.35)');
  glowGrad.addColorStop(0.5, 'rgba(120, 0, 0, 0.12)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(canvas.width, canvas.height) * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 2. Fixed Tapered Speed Lines (they stay at fixed angles while flowing/moving outwards)
  const now = Date.now();
  ctx.fillStyle = 'rgba(255, 30, 30, 0.22)';
  const numLines = 24;
  for (let i = 0; i < numLines; i++) {
    const angle = (i / numLines) * Math.PI * 2; // Stay fixed (no rotation!)
    
    // Draw 2 rapid outward flowing segments along this fixed angle
    for (let j = 0; j < 2; j++) {
      const shift = j * 160;
      const travel = ((now * 0.45 + i * 55 + shift) % 320);
      const startDist = 120 + travel;
      const endDist = startDist + 90 + Math.sin(i * 11) * 35;
      
      const wStart = 0.007;
      const wEnd = 0.002;
      
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle - wStart) * startDist, cy + Math.sin(angle - wStart) * startDist);
      ctx.lineTo(cx + Math.cos(angle - wEnd) * endDist, cy + Math.sin(angle - wEnd) * endDist);
      ctx.lineTo(cx + Math.cos(angle + wEnd) * endDist, cy + Math.sin(angle + wEnd) * endDist);
      ctx.lineTo(cx + Math.cos(angle + wStart) * startDist, cy + Math.sin(angle + wStart) * startDist);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 3. Draw the giant red fist!
  const poseFrames = CONFIG.saitama?.counterPunchPoseFrames ?? 90;
  if (saitama._counterPunchTimer <= poseFrames) {
    const punchProgress = (poseFrames - saitama._counterPunchTimer) / poseFrames;
    
    // Starts big (0.90) and slowly grows to peak (1.30)
    const scale = 0.90 + Math.pow(punchProgress, 1.5) * 0.40;
    
    // Screen shaking intensity increases with progress
    const shakeIntensity = 8 * punchProgress;
    const fistX = cx + (Math.random() - 0.5) * shakeIntensity;
    const fistY = cy + (Math.random() - 0.5) * shakeIntensity;
    
    ctx.save();
    ctx.translate(fistX, fistY);
    ctx.scale(scale, scale);
    
    // Smoothly fade in the fist over the first 25% of the punch progress
    const fistFade = Math.min(1.0, punchProgress * 4.0);
    ctx.globalAlpha = Math.min(0.45, currentSaitamaSeriousPunchOpacity * 0.45) * fistFade;
    
    if (seriousPunchImg && seriousPunchImg.complete && seriousPunchImg.naturalWidth > 0) {
      // Scale PNG to occupy 70% of the canvas width at base scale = 1.0
      const targetWidth = canvas.width * 0.70;
      const imgScale = targetWidth / seriousPunchImg.naturalWidth;
      
      ctx.save();
      ctx.scale(imgScale, imgScale);
      ctx.drawImage(seriousPunchImg, -seriousPunchImg.naturalWidth / 2, -seriousPunchImg.naturalHeight / 2);
      ctx.restore();
    } else {
      // High-quality vector fallback if the image hasn't finished loading yet
      _drawSeriousRedFist(ctx, punchProgress);
    }
    
    ctx.restore();
  }

  ctx.restore();
}
function _pathHandShape(ctx) {
  ctx.beginPath();
  // Wrist left
  ctx.moveTo(-110, 190);
  // Left pinky side curve
  ctx.bezierCurveTo(-160, 110, -170, 20, -145, -45);
  // Pinky knuckle bump
  ctx.bezierCurveTo(-135, -85, -100, -95, -80, -85);
  // Ring knuckle bump
  ctx.bezierCurveTo(-60, -100, -30, -100, -10, -90);
  // Middle knuckle bump
  ctx.bezierCurveTo(10, -105, 45, -105, 65, -85);
  // Index knuckle bump
  ctx.bezierCurveTo(85, -75, 115, -65, 125, -25);
  // Down the right side
  ctx.bezierCurveTo(135, 15, 125, 110, 95, 190);
  ctx.closePath();
}

function _drawSeriousRedFist(ctx, progress) {
  ctx.save();
  
  // Tilt the fist slightly counter-clockwise to match the OPM impact frame angle
  ctx.rotate(-0.12);

  const now = Date.now();

  // Spiky Aura Energy Flares radiating from the knuckle border (Rule #11 compliant)
  ctx.save();
  const numFlares = 80;
  for (let i = 0; i < numFlares; i++) {
    const angle = (i / numFlares) * Math.PI * 2 + (now / 200);
    const rBase = 120 + Math.sin(angle * 7 + now / 80) * 15;
    const length = 35 + Math.sin(angle * 13 + now / 40) * 45;
    
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 30, 30, 0.6)';
    ctx.lineWidth = i % 2 === 0 ? 1.5 : 3.5;
    
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * rBase, Math.sin(angle) * rBase);
    ctx.lineTo(Math.cos(angle) * (rBase + length), Math.sin(angle) * (rBase + length));
    ctx.stroke();
  }
  ctx.restore();

  // Glow Layers (Rule 11 compliant concentric shapes)
  ctx.save();
  ctx.scale(1.25, 1.25);
  _pathHandShape(ctx);
  ctx.fillStyle = 'rgba(255, 0, 0, 0.10)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.scale(1.15, 1.15);
  _pathHandShape(ctx);
  ctx.fillStyle = 'rgba(255, 20, 20, 0.20)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.scale(1.06, 1.06);
  _pathHandShape(ctx);
  ctx.fillStyle = 'rgba(255, 50, 50, 0.35)';
  ctx.fill();
  ctx.restore();

  // Base Fist silhouette fill using a high-impact Radial Gradient (White-hot core to deep crimson)
  const fistGrad = ctx.createRadialGradient(-5, -15, 10, -5, -15, 150);
  fistGrad.addColorStop(0, '#ffffff'); // White-hot core
  fistGrad.addColorStop(0.2, '#ffaaaa'); // Soft pink-white glow
  fistGrad.addColorStop(0.45, '#ff232d'); // Vibrant anime red
  fistGrad.addColorStop(0.8, '#8a0002'); // Deep crimson shadow
  fistGrad.addColorStop(1.0, '#260001'); // Dark outer shadow
  ctx.fillStyle = fistGrad;
  _pathHandShape(ctx);
  ctx.fill();

  // Ink outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 11;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  _pathHandShape(ctx);
  ctx.stroke();

  // Knuckle Crease Separator Lines (expressing clenched fingers)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 9;
  
  // Pinky / Ring separator
  ctx.beginPath();
  ctx.moveTo(-80, -85);
  ctx.bezierCurveTo(-85, -20, -75, 40, -65, 75);
  ctx.stroke();

  // Ring / Middle separator
  ctx.beginPath();
  ctx.moveTo(-10, -90);
  ctx.bezierCurveTo(-15, -25, -5, 35, 5, 80);
  ctx.stroke();

  // Middle / Index separator
  ctx.beginPath();
  ctx.moveTo(65, -85);
  ctx.bezierCurveTo(55, -20, 50, 40, 55, 70);
  ctx.stroke();

  // Knuckle Crease Highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3.5;
  
  ctx.beginPath();
  ctx.moveTo(-75, -75);
  ctx.bezierCurveTo(-80, -20, -70, 40, -60, 65);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, -80);
  ctx.bezierCurveTo(-10, -25, 0, 35, 10, 70);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(70, -75);
  ctx.bezierCurveTo(60, -20, 55, 40, 60, 60);
  ctx.stroke();

  // Thumb folded across bottom-left
  ctx.save();
  ctx.translate(-25, 75);
  ctx.rotate(Math.PI * 0.05);

  ctx.beginPath();
  ctx.moveTo(-80, 0);
  ctx.bezierCurveTo(-50, 35, 20, 35, 60, 10);
  ctx.bezierCurveTo(90, -5, 100, -25, 95, -45);
  ctx.bezierCurveTo(70, -20, 20, -10, -30, -10);
  ctx.bezierCurveTo(-60, -10, -75, -10, -80, 0);
  ctx.closePath();

  const thumbGrad = ctx.createLinearGradient(-80, 0, 80, 0);
  thumbGrad.addColorStop(0, '#2b0000');
  thumbGrad.addColorStop(0.4, '#8a0002');
  thumbGrad.addColorStop(0.8, '#ff232d');
  thumbGrad.addColorStop(1.0, '#ffffff');
  ctx.fillStyle = thumbGrad;
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 9;
  ctx.stroke();

  // Inner thumb crease highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-60, 5);
  ctx.bezierCurveTo(-20, 15, 30, 15, 65, 0);
  ctx.stroke();

  ctx.restore();

  // Manga Shading Hatching lines (Black wedges)
  ctx.fillStyle = '#000000';
  
  ctx.beginPath();
  ctx.moveTo(-70, 110);
  ctx.lineTo(-50, 185);
  ctx.lineTo(-75, 185);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 95);
  ctx.lineTo(5, 188);
  ctx.lineTo(-10, 188);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(50, 115);
  ctx.lineTo(55, 185);
  ctx.lineTo(40, 185);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ──────────────────────────────────────────
// BLEACH BANKAI CINEMATIC TRANSFORMATION SEEDS & OVERLAY
// ──────────────────────────────────────────
let _bankaiInwardSeeds = null;
function _initBankaiInwardSeeds() {
  _bankaiInwardSeeds = [];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 1.7) * 0.12);
    const startDist = 380 + (i % 7) * 45;
    const len = 70 + (i % 5) * 30;
    const maxThick = 1.6 + (i % 3) * 0.8;
    const speed = 1.8 + (i % 4) * 0.5;
    const phase = (i * 17) % 100;
    let color;
    if (i % 4 === 0) color = '#DC143C';                     // Crimson Reiatsu
    else if (i % 4 === 1) color = '#00E5FF';                // Electric Cyan
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White Core
    else color = 'rgba(15, 8, 20, 0.95)';                   // Deep Manga Ink

    _bankaiInwardSeeds.push({ angle, startDist, len, maxThick, speed, phase, color });
  }
}

let _bankaiBurstSeeds = null;
function _initBankaiBurstSeeds() {
  _bankaiBurstSeeds = [];
  const count = 48;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 2.3) * 0.08);
    const len = 90 + (i % 6) * 40;
    const maxThick = 1.8 + (i % 4) * 0.9;
    const speed = 2.4 + (i % 3) * 0.8;
    const phase = (i * 23) % 100;
    let color;
    if (i % 4 === 0) color = '#DC143C';                     // Crimson Reiatsu
    else if (i % 4 === 1) color = '#FF3214';                // Fiery Red/Scarlet
    else if (i % 4 === 2) color = '#FFFFFF';                // White Core
    else color = 'rgba(10, 4, 15, 0.95)';                   // Jet Black Ink

    _bankaiBurstSeeds.push({ angle, len, maxThick, speed, phase, color });
  }
}

/**
 * Draws cinematic Bleach anime atmospheric lighting, inward manga gravitational focus lines,
 * ground spiritual fissures, radial blast lines, and title typography during Bankai transformation.
 */
export function drawBankaiImpactDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const ichigo = state.fighters?.find(f => 
    f && (f.characterId === 'ichigo' || f.type === 'ichigo') && (
      f.isChannelingBankai || 
      (f.bankaiBurstTimer && f.bankaiBurstTimer > 0) ||
      (f.hollowMaskFormationTimer && f.hollowMaskFormationTimer > 0) ||
      (f.hollowBurstTimer && f.hollowBurstTimer > 0)
    )
  );
  if (!ichigo) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;
  const cx = ichigo.x + shakeX;
  const cy = ichigo.y + shakeY;
  const r = ichigo.r || 25;

  let isChanneling = Boolean(ichigo.isChannelingBankai && ichigo.bankaiChargeTimer > 0);
  let isBursting = Boolean(ichigo.bankaiBurstTimer && ichigo.bankaiBurstTimer > 0);
  let isHollow = !isChanneling && !isBursting && Boolean(
    (ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) ||
    (ichigo.hollowBurstTimer && ichigo.hollowBurstTimer > 0)
  );

  let opacity = 0;
  let bankaiProg = 0;
  let burstProg = 0;

  if (isChanneling) {
    const maxB = ichigo.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 50;
    const curB = ichigo.bankaiChargeTimer || 0;
    bankaiProg = Math.min(1.0, Math.max(0.0, 1.0 - (curB / maxB)));

    if (bankaiProg < 0.70) {
      // Phase 1: Rising atmospheric spiritual pressure & vortex build-up
      opacity = Math.min(0.88, bankaiProg * 1.30);
    } else {
      // Phase 2: Maximum Singularity Implosion tension
      const compP = (bankaiProg - 0.70) / 0.30;
      opacity = 0.88 + compP * 0.08 + Math.sin(now * 0.04) * 0.03;
    }
  } else if (isBursting) {
    // Phase 3: Eruption release burst decay
    const burstMax = ichigo.bankaiBurstMax || CONFIG.ichigo?.bankaiBurstFrames || 36;
    burstProg = 1.0 - (ichigo.bankaiBurstTimer / burstMax);
    opacity = Math.pow(1.0 - burstProg, 1.3) * 0.92;
  } else if (isHollow) {
    // Hollow Transformation burst & formation decay
    const maxH = ichigo.hollowBurstMax || ichigo.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 54;
    const curH = (ichigo.hollowBurstTimer !== undefined && ichigo.hollowBurstTimer > 0) 
      ? ichigo.hollowBurstTimer 
      : (ichigo.hollowMaskFormationTimer || 0);
    burstProg = Math.min(1.0, Math.max(0.0, 1.0 - (curH / maxH)));
    opacity = Math.pow(1.0 - burstProg, 1.2) * 0.88;
  }

  if (opacity <= 0.01) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // ── 1. Moment of Eruption Inverted Negative Flash (Frames 0-3 of burst) ──
  if ((isBursting || isHollow) && burstProg < 0.10) {
    const flashAlpha = Math.pow(1.0 - (burstProg / 0.10), 1.5) * 0.95;
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── 2. Full-Screen Radial Bleach Void Vignette ──
  const maxR = Math.max(canvas.width, canvas.height) * 0.95;
  const grad = ctx.createRadialGradient(cx, cy, r * 1.2, cx, cy, maxR);
  if (isHollow) {
    // Stark monochrome White-Black theme for Hollow Transformation
    grad.addColorStop(0.0, `rgba(255, 255, 255, ${(opacity * 0.18).toFixed(3)})`);
    grad.addColorStop(0.25, `rgba(25, 25, 32, ${(opacity * 0.70).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(6, 6, 10, ${(opacity * 0.94).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(1, 1, 3, ${(opacity * 0.98).toFixed(3)})`);
  } else {
    // Crimson-Black theme for Bankai
    grad.addColorStop(0.0, `rgba(40, 6, 15, ${(opacity * 0.35).toFixed(3)})`);
    grad.addColorStop(0.25, `rgba(16, 3, 8, ${(opacity * 0.75).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(4, 1, 6, ${(opacity * 0.94).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(1, 0, 2, ${(opacity * 0.98).toFixed(3)})`);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── 3. Arena Floor Expanding Concentric Reiatsu Shock Rings ──
  if (isChanneling || isHollow) {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringP = ((now * 0.0022 + i * (1.0 / ringCount)) % 1.0);
      const ringR = r * 1.5 + ringP * 280;
      const ringAlpha = (1.0 - ringP) * Math.sin(ringP * Math.PI) * opacity * 0.70;
      if (ringAlpha > 0.01) {
        if (isHollow) {
          ctx.strokeStyle = (i % 2 === 0) 
            ? `rgba(255, 255, 255, ${ringAlpha.toFixed(3)})` 
            : `rgba(10, 10, 15, ${ringAlpha.toFixed(3)})`;
        } else {
          ctx.strokeStyle = (i % 2 === 0) 
            ? `rgba(220, 20, 20, ${ringAlpha.toFixed(3)})` 
            : `rgba(255, 45, 20, ${ringAlpha.toFixed(3)})`;
        }
        ctx.lineWidth = Math.max(1.0, 3.5 * (1.0 - ringP));
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// ──────────────────────────────────────────
// DRAW — FLOATING TEXT LABELS
// ──────────────────────────────────────────