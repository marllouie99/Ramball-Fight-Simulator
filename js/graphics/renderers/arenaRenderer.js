import { state, getProjectiles } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
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
        // Clean straight-line borders for Dark Mode strictly calibrated to match Light Mode visual thickness and bounds
        const strokeW = 2.5; // Match the 2.5px average sketchy border line width to prevent optical enlargement
        oc.strokeStyle = borderColor;
        oc.lineWidth = strokeW;
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

  // 5b. Match Fighter Names above Top Arena Wall (e.g. "GOJO VS SUKUNA")
  if (state.fighters && state.fighters.length > 0 && (state.gameState === 'playing' || state.gameState === 'countdown' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) {
    const isPrimaryFighter = (f) => Boolean(
      f &&
      !f.isTurret &&
      !f.isMinion &&
      !f.isDeployable &&
      !f.isIceWall &&
      !f.isIllusion &&
      !f.isRika &&
      !f.isEvasionMinion &&
      !f.isTransfiguredHuman &&
      !f.isClone &&
      !f.owner &&
      f.type !== 'Turret' &&
      f.type !== 'turret' &&
      f.type !== 'Dispenser' &&
      f.type !== 'dispenser' &&
      !f._def?.isTurret &&
      !f._def?.isMinion
    );

    const mainFighters = state.fighters.filter(isPrimaryFighter);
    if (mainFighters.length > 0) {
      const textY = arena.y - 12;
      ctx.save();
      const nameFont = '900 22px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
      const vsFont = '800 14px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
      const accentFont = vsFont;
      const ampFont = vsFont;

      ctx.font = nameFont;
      ctx.textBaseline = 'bottom';
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '2px';
      }

      const getFighterThemeColor = (f, fallbackColor = '#38BDF8') => {
        if (!f) return fallbackColor;
        const isYuta = Boolean(f.characterId === 'yuta' || f.type === 'yuta' || (f._def && (f._def.id === 'yuta' || f._def.type === 'yuta')) || (f.name && f.name.toUpperCase().includes('YUTA')));
        if (isYuta) return '#FF1493';
        return f.themeColor || f._def?.themeColor || f.color || f._def?.color || fallbackColor;
      };

      if (mainFighters.length === 2) {
        const f1 = mainFighters[0];
        const f2 = mainFighters[1];
        const name1 = (f1.name || f1._def?.name || f1.characterId || 'P1').toUpperCase();
        const name2 = (f2.name || f2._def?.name || f2.characterId || 'P2').toUpperCase();
        const vsText = 'VS';
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
        ctx.fillStyle = getFighterThemeColor(f1, '#38BDF8');
        ctx.fillText(name1, startX, textY);
        startX += w1 + vsPadding;

        // "VS" Accent
        ctx.font = vsFont;
        ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
        const vsY = textY - 1.5;
        ctx.fillText(vsText, startX, vsY);
        startX += wVs + vsPadding;

        // Fighter 2 Name
        ctx.font = nameFont;
        ctx.fillStyle = getFighterThemeColor(f2, '#F87171');
        ctx.fillText(name2, startX, textY);
      } else if (mainFighters.length === 3) {
        // ── 1v2 Mode: "NAME1 VS NAME2 & NAME3" with per-fighter colors ──
        const f1 = mainFighters[0];
        const f2 = mainFighters[1];
        const f3 = mainFighters[2];
        const name1 = (f1.name || f1._def?.name || f1.characterId || 'P1').toUpperCase();
        const name2 = (f2.name || f2._def?.name || f2.characterId || 'P2').toUpperCase();
        const name3 = (f3.name || f3._def?.name || f3.characterId || 'P3').toUpperCase();

        const pad = 12;
        const ampPad = 8;

        ctx.font = nameFont;
        const w1 = ctx.measureText(name1).width;
        const w2 = ctx.measureText(name2).width;
        const w3 = ctx.measureText(name3).width;
        ctx.font = accentFont;
        const wVs = ctx.measureText('VS').width;
        ctx.font = ampFont;
        const wAmp = ctx.measureText('&').width;

        const is1v2 = (state.mode === '1v2 Stand Off' || state.mode === '1v2' || state.mode === 'Stand Off 1v2');
        const totalW = is1v2 
          ? (w1 + pad + wVs + pad + w2 + ampPad + wAmp + ampPad + w3)
          : (w1 + pad + wVs + pad + w2 + pad + wVs + pad + w3);
        const maxW = arena.width - 16;
        const scale = totalW > maxW ? maxW / totalW : 1.0;

        ctx.translate(centerX, textY);
        ctx.scale(scale, 1.0);
        ctx.translate(-centerX, -textY);

        let startX = centerX - totalW / 2;
        ctx.textAlign = 'left';

        // Fighter 1 Name (Solo)
        ctx.font = nameFont;
        ctx.fillStyle = getFighterThemeColor(f1, '#38BDF8');
        ctx.fillText(name1, startX, textY);
        startX += w1 + pad;

        // "VS" Accent
        ctx.font = accentFont;
        ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
        ctx.fillText('VS', startX, textY - 1.5);
        startX += wVs + pad;

        // Fighter 2 Name (Team Member 1)
        ctx.font = nameFont;
        ctx.fillStyle = getFighterThemeColor(f2, '#F87171');
        ctx.fillText(name2, startX, textY);

        if (is1v2) {
          startX += w2 + ampPad;

          // "&" Ampersand Accent
          ctx.font = ampFont;
          ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
          ctx.fillText('&', startX, textY - 1.5);
          startX += wAmp + ampPad;
        } else {
          startX += w2 + pad;

          // "VS" Accent
          ctx.font = accentFont;
          ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
          ctx.fillText('VS', startX, textY - 1.5);
          startX += wVs + pad;
        }

        // Fighter 3 Name
        ctx.font = nameFont;
        ctx.fillStyle = getFighterThemeColor(f3, '#FBBF24');
        ctx.fillText(name3, startX, textY);
      } else {
        // Multi-fighter fallback (2v2 or FFA): Per-fighter colored names joined by "VS" or "&"
        const pad = 10;
        const is2v2 = mainFighters.length === 4 && (state.mode === '2v2' || state.mode === 'Tactical 2v2');

        const fighterData = mainFighters.map(f => ({
          name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
          color: getFighterThemeColor(f, '#F8FAFC')
        }));

        // Measure total width
        let totalW = 0;
        ctx.font = nameFont;
        fighterData.forEach((fd, i) => {
          totalW += ctx.measureText(fd.name).width;
          if (i < fighterData.length - 1) {
            ctx.font = vsFont;
            const sep = (is2v2 && (i === 0 || i === 2)) ? '&' : 'VS';
            totalW += pad + ctx.measureText(sep).width + pad;
            ctx.font = nameFont;
          }
        });

        const maxW = arena.width - 16;
        const scale = totalW > maxW ? maxW / totalW : 1.0;
        ctx.translate(centerX, textY);
        ctx.scale(scale, 1.0);
        ctx.translate(-centerX, -textY);

        let startX = centerX - totalW / 2;
        ctx.textAlign = 'left';

        fighterData.forEach((fd, i) => {
          // Fighter Name
          ctx.font = nameFont;
          ctx.fillStyle = fd.color;
          ctx.fillText(fd.name, startX, textY);
          startX += ctx.measureText(fd.name).width;

          if (i < fighterData.length - 1) {
            startX += pad;
            ctx.font = vsFont;
            ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
            const sep = (is2v2 && (i === 0 || i === 2)) ? '&' : 'VS';
            ctx.fillText(sep, startX, textY - 1.5);
            startX += ctx.measureText(sep).width + pad;
          }
        });
      }

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

let currentGojoDomainDimOpacity = 0;

/**
 * Draws a dark cosmic blue dim screen overlay when Gojo's Domain Expansion (Unlimited Void) is active.
 * This dim overlay is NOT clipped to the arena — it spreads across the full screen for cinematic immersion.
 * The domain IMAGE itself remains clipped inside the arena via WebGL masking in hybridEnvironmentRenderer.
 */
export function drawGojoDomainDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const gojoFighter = state.fighters?.find(f =>
    f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo') && (f.domainActive || f.isChannelingDomainExpansion)
  );

  let targetOpacity = 0;
  if (gojoFighter) {
    if (gojoFighter.domainActive) {
      targetOpacity = 0.72;
    } else if (gojoFighter.isChannelingDomainExpansion) {
      const chargeMax = gojoFighter.domainChargeMax || 120;
      const progress = Math.min(1.0, (gojoFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  // Smoothly interpolate
  if (targetOpacity > currentGojoDomainDimOpacity) {
    currentGojoDomainDimOpacity += (targetOpacity - currentGojoDomainDimOpacity) * 0.08;
  } else {
    currentGojoDomainDimOpacity += (targetOpacity - currentGojoDomainDimOpacity) * 0.06;
  }

  if (currentGojoDomainDimOpacity < 0.01) {
    currentGojoDomainDimOpacity = 0;
    return;
  }

  const opacity = currentGojoDomainDimOpacity;

  ctx.save();
  // Reset transform to identity screen space so full-screen dim doesn't shift with camera shake
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.88})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Deep cosmic dark blue radial gradient centered on Gojo
  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;
  const cx = gojoFighter ? (gojoFighter.x + shakeX) : canvas.width / 2;
  const cy = gojoFighter ? ((gojoFighter.y - (gojoFighter.z || 0)) + shakeY) : canvas.height / 2;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.75;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, 'rgba(60, 140, 255, 0.55)');      // Bright limitless blue core
  grad.addColorStop(0.15, 'rgba(30, 80, 200, 0.45)');     // Deep royal blue halo
  grad.addColorStop(0.35, 'rgba(15, 40, 140, 0.30)');     // Dark cosmic blue ring
  grad.addColorStop(0.60, 'rgba(5, 15, 60, 0.15)');       // Deep space blue fade
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');             // Pitch black boundary

  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(0, 5, 20, ${opacity * 0.95})`;
}

let currentSukunaDomainDimOpacity = 0;

/**
 * Draws a dark crimson/blood-red dim screen overlay when Sukuna's Domain Expansion (Malevolent Shrine) is active.
 * This dim overlay is NOT clipped to the arena — it spreads across the full screen.
 * The domain IMAGE itself remains clipped inside the arena via WebGL masking.
 */
export function drawSukunaDomainDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const sukunaFighter = state.fighters?.find(f =>
    f && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.id === 'sukuna' || f._def?.type === 'sukuna') && (f.domainActive || f.isChannelingDomainExpansion)
  );

  let targetOpacity = 0;
  if (sukunaFighter) {
    if (sukunaFighter.domainActive) {
      targetOpacity = 0.75;
    } else if (sukunaFighter.isChannelingDomainExpansion) {
      const chargeMax = CONFIG.sukuna?.domainChargeMax || 120;
      const progress = Math.min(1.0, (sukunaFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentSukunaDomainDimOpacity) {
    currentSukunaDomainDimOpacity += (targetOpacity - currentSukunaDomainDimOpacity) * 0.08;
  } else {
    currentSukunaDomainDimOpacity += (targetOpacity - currentSukunaDomainDimOpacity) * 0.06;
  }

  if (currentSukunaDomainDimOpacity < 0.01) {
    currentSukunaDomainDimOpacity = 0;
    return;
  }

  const opacity = currentSukunaDomainDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.88})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Deep crimson/blood-red radial gradient centered on Sukuna
  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;
  const cx = sukunaFighter ? (sukunaFighter.x + shakeX) : canvas.width / 2;
  const cy = sukunaFighter ? ((sukunaFighter.y - (sukunaFighter.z || 0)) + shakeY) : canvas.height / 2;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.75;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, 'rgba(200, 30, 30, 0.50)');       // Bright cursed crimson core
  grad.addColorStop(0.15, 'rgba(140, 10, 10, 0.40)');     // Deep blood red halo
  grad.addColorStop(0.35, 'rgba(80, 5, 5, 0.25)');        // Dark crimson ring
  grad.addColorStop(0.60, 'rgba(30, 2, 2, 0.12)');        // Deep maroon fade
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');             // Pitch black boundary

  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(10, 0, 0, ${opacity * 0.95})`;
}

let currentYutaDomainDimOpacity = 0;

/**
 * Draws a dark cursed purple/pink dim screen overlay when Yuta's Domain Expansion is active.
 * This dim overlay is NOT clipped to the arena — it spreads across the full screen.
 */
export function drawYutaDomainDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const yutaFighter = state.fighters?.find(f =>
    f && (f.characterId === 'yuta' || f.type === 'yuta' || f._def?.id === 'yuta' || f._def?.type === 'yuta') && (f.domainActive || f.isChannelingDomain)
  );

  let targetOpacity = 0;
  if (yutaFighter) {
    if (yutaFighter.domainActive) {
      targetOpacity = 0.75;
    } else if (yutaFighter.isChannelingDomain) {
      const chargeMax = yutaFighter.domainChargeMax || 180;
      const progress = Math.min(1.0, (yutaFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentYutaDomainDimOpacity) {
    currentYutaDomainDimOpacity += (targetOpacity - currentYutaDomainDimOpacity) * 0.08;
  } else {
    currentYutaDomainDimOpacity += (targetOpacity - currentYutaDomainDimOpacity) * 0.06;
  }

  if (currentYutaDomainDimOpacity < 0.01) {
    currentYutaDomainDimOpacity = 0;
    return;
  }

  const opacity = currentYutaDomainDimOpacity;

  // During domain channeling, draw smooth dark charge-up overlay; when domain is active, renderYutaDomainBackground displays the authentic full-screen void, vortex & environment
  if (yutaFighter && yutaFighter.isChannelingDomain && !yutaFighter.domainActive) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.75})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  state.globalDimEdgeColor = `rgba(5, 0, 10, ${opacity * 0.95})`;
}

let currentMahitoDomainDimOpacity = 0;

/**
 * Draws a dark teal/cursed dim screen overlay when Mahito's Domain Expansion (Self-Embodiment of Perfection) is active.
 * This dim overlay is NOT clipped to the arena — it spreads across the full screen.
 */
export function drawMahitoDomainDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const mahitoFighter = state.fighters?.find(f =>
    f && (f.characterId === 'mahito' || f.type === 'mahito') && (f.domainActive || f._mahitoDomainActive || f.isChannelingDomainExpansion)
  );

  let targetOpacity = 0;
  if (mahitoFighter) {
    if (mahitoFighter.domainActive || mahitoFighter._mahitoDomainActive) {
      targetOpacity = 0.68;
    } else if (mahitoFighter.isChannelingDomainExpansion) {
      const chargeMax = mahitoFighter.domainChargeMax || 120;
      const progress = Math.min(1.0, (mahitoFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.40;
    }
  }

  if (targetOpacity > currentMahitoDomainDimOpacity) {
    currentMahitoDomainDimOpacity += (targetOpacity - currentMahitoDomainDimOpacity) * 0.08;
  } else {
    currentMahitoDomainDimOpacity += (targetOpacity - currentMahitoDomainDimOpacity) * 0.06;
  }

  if (currentMahitoDomainDimOpacity < 0.01) {
    currentMahitoDomainDimOpacity = 0;
    return;
  }

  const opacity = currentMahitoDomainDimOpacity;

  // During domain channeling, draw smooth dark charge-up overlay; when domain is active, renderMahitoDomainBackground displays the authentic full-screen void & environment
  if (mahitoFighter && mahitoFighter.isChannelingDomainExpansion && !mahitoFighter.domainActive) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.75})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  state.globalDimEdgeColor = `rgba(0, 5, 5, ${opacity * 0.95})`;
}

let currentTojiUltimateOpacity = 0;
let currentSaitamaSeriousPunchOpacity = 0;
let currentHollowMaskOpacity = 0;
let flyHeads = [];
let seriousPunchImg = null;
let seriousPunchImgLoading = false;
let hollowMaskOverlayImg = null;
let hollowMaskOverlayImgLoading = false;

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

function loadHollowMaskOverlayImage() {
  if (hollowMaskOverlayImg || hollowMaskOverlayImgLoading) return;
  hollowMaskOverlayImgLoading = true;
  hollowMaskOverlayImg = new Image();
  hollowMaskOverlayImg.onload = () => {
    hollowMaskOverlayImgLoading = false;
  };
  hollowMaskOverlayImg.onerror = (e) => {
    console.error("Failed to load Hollow Mask overlay image:", e);
    hollowMaskOverlayImgLoading = false;
    hollowMaskOverlayImg = null;
  };
  hollowMaskOverlayImg.src = 'Assets/references/Hollow Mask.png';
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

  const isDarkMode = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  ctx.save();
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

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // Stepped pixel circle fill
  function _pixCircle(cx, cy, rad, fillColor) {
    const gridR = Math.ceil(rad / P);
    for (let gy = -gridR; gy <= gridR; gy++) {
      for (let gx = -gridR; gx <= gridR; gx++) {
        const dist = Math.sqrt(gx * gx + gy * gy) * P;
        if (dist > rad + P * 0.25) continue;
        const px = snap(cx + gx * P);
        const py = snap(cy + gy * P);
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }
    }
  }

  // Stepped pixel triangle streak
  function _pixStreak(x1, y1, tipX, tipY, x2, y2, fillColor) {
    const minX = Math.min(x1, tipX, x2);
    const maxX = Math.max(x1, tipX, x2);
    const minY = Math.min(y1, tipY, y2);
    const maxY = Math.max(y1, tipY, y2);

    const startX = snap(minX - P);
    const endX = snap(maxX + P);
    const startY = snap(minY - P);
    const endY = snap(maxY + P);

    // 3-point in-triangle test
    function _inTri(px, py) {
      const d1 = (px - tipX) * (y1 - tipY) - (x1 - tipX) * (py - tipY);
      const d2 = (px - x2) * (tipY - y2) - (tipX - x2) * (py - y2);
      const d3 = (px - x1) * (y2 - y1) - (x2 - x1) * (py - y1);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      return !(hasNeg && hasPos);
    }

    ctx.fillStyle = fillColor;
    for (let py = startY; py <= endY; py += P) {
      for (let px = startX; px <= endX; px += P) {
        if (_inTri(px, py)) {
          ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
        }
      }
    }
  }

  function drawPixelInkSplat(fillColor, scaleMult = 1.0) {
    ctx.save();
    if (scaleMult !== 1.0) {
      ctx.scale(scaleMult, scaleMult);
    }

    // 1. Core Blob Circles (Stepped Pixel Masses)
    for (let i = 0; i < _SPLATTER_CORE_CIRCLES.length; i++) {
      const d = _SPLATTER_CORE_CIRCLES[i];
      _pixCircle(d.x, d.y, d.r, fillColor);
    }

    // 2. Outward Streaks & Bulbous Tips
    for (let i = 0; i < _SPLATTER_STREAKS.length; i++) {
      const s = _SPLATTER_STREAKS[i];
      _pixStreak(s.x1, s.y1, s.tipX, s.tipY, s.x2, s.y2, fillColor);
      if (s.bulbR) {
        _pixCircle(s.tipX, s.tipY, s.bulbR, fillColor);
      }
    }

    // 3. Detached Splatter Dots
    for (let i = 0; i < _SPLATTER_DOTS.length; i++) {
      const d = _SPLATTER_DOTS[i];
      _pixCircle(d.x, d.y, d.r, fillColor);
    }

    ctx.restore();
  }

  // Pass 1: Dark Burgundy undercoat for depth (scaled up for outline effect)
  drawPixelInkSplat(bgDark, 1.14);

  // Pass 2: Vivid anime crimson body
  drawPixelInkSplat(color, 1.0);

  // Pass 3: High-contrast Pixel Specular Glints on blood masses
  ctx.fillStyle = 'rgba(255, 175, 185, 0.92)';
  ctx.fillRect(snap(-6), snap(-12), P * 2, P);
  ctx.fillRect(snap(6), snap(-8), P * 2, P);
  ctx.fillRect(snap(-14), snap(4), P, P * 2);
  ctx.fillRect(snap(10), snap(8), P * 2, P);
  ctx.fillRect(snap(-2), snap(16), P * 2, P);

  // Pure white glint pixels
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(-4), snap(-10), P, P);
  ctx.fillRect(snap(8), snap(-6), P, P);

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

    // ── 2A. DRAW PIXEL ART 10-DIVISION 7:3 RULER ──
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;

    function _rulerPixLine(x0, y0, x1, y1, color, thickness) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(2, Math.ceil(len / P));
      const halfT = Math.max(P * 0.5, (thickness || P) * 0.5);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = snap(x0 + dx * t);
        const py = snap(y0 + dy * t);
        ctx.fillStyle = color;
        ctx.fillRect(px - halfT, py - halfT, halfT * 2, halfT * 2);
      }
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1.0, alpha * 1.1);

    // Main horizontal measurement bar (Dark outline + Crisp White core + Yellow tint center)
    _rulerPixLine(-halfL - 2, 0, halfL + 2, 0, '#000000', 8.0);
    _rulerPixLine(-halfL, 0, halfL, 0, '#FFFFFF', 4.0);
    _rulerPixLine(-halfL + 4, 0, halfL - 4, 0, '#FEF9C3', 2.0);

    // Measurement Ticks
    for (let k = 0; k <= 10; k++) {
      const tx = snap(-halfL + k * step);
      if (k === 0 || k === 10) {
        // End T-Caps (Pixel Art Crossbars)
        _rulerPixLine(tx, -20, tx, 20, '#000000', 9.0);
        _rulerPixLine(tx, -18, tx, 18, '#FFFFFF', 5.0);
        // T-cap horizontal end caps
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(tx - P * 2, snap(-18) - P * 0.5, P * 4, P);
        ctx.fillRect(tx - P * 2, snap(18) - P * 0.5, P * 4, P);
      } else if (k === 7) {
        // The 7:3 Division Point (Ruby/Crimson Pixel Pillar + White Core)
        _rulerPixLine(tx, -20, tx, 20, '#4A0005', 9.0);
        _rulerPixLine(tx, -18, tx, 18, '#FF1E27', 6.0);
        _rulerPixLine(tx, -15, tx, 15, '#FFFFFF', 2.0);

        // Stepped Pixel Diamond Reticle around 7:3 point
        ctx.fillStyle = '#FF1E27';
        ctx.fillRect(tx - P * 3, snap(-P), P, P * 2);
        ctx.fillRect(tx + P * 2, snap(-P), P, P * 2);
        ctx.fillRect(snap(tx - P), -P * 3, P * 2, P);
        ctx.fillRect(snap(tx - P), P * 2, P * 2, P);
      } else {
        // Standard Division Ticks
        const tickH = (k === 5) ? 14 : 10;
        _rulerPixLine(tx, -tickH - 2, tx, tickH + 2, '#000000', 6.0);
        _rulerPixLine(tx, -tickH, tx, tickH, '#FFFFFF', 3.2);
        // Yellow tip highlight
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(tx - P * 0.5, snap(-tickH) - P * 0.5, P, P);
        ctx.fillRect(tx - P * 0.5, snap(tickH) - P * 0.5, P, P);
      }
    }
    ctx.restore();

    // ── 2B. DRAW PIXEL ART BLOOD SPLATTER (After 360 Spin Finishes) ──
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

  // Reusable target buffer to eliminate per-frame array allocation & GC churn
  const activeMaho = mahoraga || state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')));
  let sumX = 0, sumY = 0, targetCount = 0;
  let maxTargetDist = 80;

  if (activeMaho) {
    sumX += activeMaho.x;
    sumY += activeMaho.y;
    targetCount++;
  }
  if (state.fighters) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (f && f !== activeMaho && f.hp > 0) {
        sumX += f.x;
        sumY += f.y;
        targetCount++;
        if (f.rika && f.rika.active && !f.rika.isDying) {
          sumX += f.rika.x;
          sumY += f.rika.y;
          targetCount++;
        }
      }
    }
  }
  if (state.illusions) {
    for (let i = 0; i < state.illusions.length; i++) {
      const ill = state.illusions[i];
      if (ill && ill.hp > 0) {
        sumX += ill.x;
        sumY += ill.y;
        targetCount++;
      }
    }
  }

  let cx = canvas.width / 2;
  let cy = canvas.height / 2;
  if (targetCount > 0) {
    cx = sumX / targetCount;
    cy = sumY / targetCount;

    if (activeMaho) {
      const d = Math.hypot(activeMaho.x - cx, activeMaho.y - cy);
      if (d > maxTargetDist) maxTargetDist = d;
    }
    if (state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (f && f !== activeMaho && f.hp > 0) {
          const d = Math.hypot(f.x - cx, f.y - cy);
          if (d > maxTargetDist) maxTargetDist = d;
        }
      }
    }
  }

  const drawX = cx + shakeX;
  const drawY = cy + shakeY;
  const spotlightInnerR = Math.max(140, Math.min(480, maxTargetDist + 80));
  const maxRadius = Math.max(arena.width, arena.height) * 1.15;

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
  grad.addColorStop(Math.min(0.65, (spotlightInnerR / maxRadius)), `rgba(14, 8, 2, ${opacity * 0.35})`); // Golden-brown highlight transition
  grad.addColorStop(0.8, `rgba(6, 3, 1, ${opacity * 0.88})`); // Very dark golden-brown
  grad.addColorStop(1.0, `rgba(0, 0, 0, ${opacity * 0.99})`); // Absolute black border

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── AMBIENT GOLDEN LIGHT SPILL (illumination of surroundings) ──
  if (activeMaho) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const pulseScale = 1.0 + Math.sin(Date.now() * 0.003) * 0.08;

    // 1. Wheel Light Spill (glow centered at Dharma Wheel)
    const wheelX = activeMaho.x + shakeX;
    const wheelY = activeMaho.y - activeMaho.r - 28 + shakeY;
    const wheelR = 85 * pulseScale;
    const wheelGlow = ctx.createRadialGradient(wheelX, wheelY, 5, wheelX, wheelY, wheelR);
    wheelGlow.addColorStop(0, `rgba(255, 215, 0, ${0.35 * currentMahoLevel8DimOpacity})`);
    wheelGlow.addColorStop(0.3, `rgba(255, 179, 0, ${0.15 * currentMahoLevel8DimOpacity})`);
    wheelGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = wheelGlow;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Sword Light Spill (glow centered at extending blade)
    const swordAngle = activeMaho.gunAngle !== undefined ? activeMaho.gunAngle : 0;
    const swordDist = activeMaho.r + 30;
    const swordX = activeMaho.x + Math.cos(swordAngle) * swordDist + shakeX;
    const swordY = activeMaho.y + Math.sin(swordAngle) * swordDist + shakeY;
    const swordR = 110 * pulseScale;

    const swordGlow = ctx.createRadialGradient(swordX, swordY, 10, swordX, swordY, swordR);
    swordGlow.addColorStop(0, `rgba(255, 235, 59, ${0.30 * currentMahoLevel8DimOpacity})`);
    swordGlow.addColorStop(0.4, `rgba(255, 152, 0, ${0.12 * currentMahoLevel8DimOpacity})`);
    swordGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = swordGlow;
    ctx.beginPath();
    ctx.arc(swordX, swordY, swordR, 0, Math.PI * 2);
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
 * ground spiritual fissures, radial blast lines, and title typography during Bankai transformation
 * and Hollow Awakening (smoothly displaying the Hollow Mask PNG centered in the arena during channeling).
 */
export function drawBankaiImpactDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const ichigo = state.fighters?.find(f => 
    f && f.hp > 0 && !f.isRespawning && (f.characterId === 'ichigo' || f.type === 'ichigo') && (
      f.isChannelingBankai || 
      (f.bankaiBurstTimer && f.bankaiBurstTimer > 0) ||
      (f.hollowMaskFormationTimer && f.hollowMaskFormationTimer > 0) ||
      (f.hollowBurstTimer && f.hollowBurstTimer > 0)
    )
  );

  const isBankaiChannelingOrBursting = Boolean(
    ichigo && (
      ichigo.isChannelingBankai ||
      (ichigo.bankaiChargeTimer && ichigo.bankaiChargeTimer > 0) ||
      (ichigo.bankaiBurstTimer && ichigo.bankaiBurstTimer > 0)
    )
  );

  if (isBankaiChannelingOrBursting) {
    currentHollowMaskOpacity = 0;
  }

  const isHollowChanneling = !isBankaiChannelingOrBursting && Boolean(
    ichigo && ((ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) || ichigo._hollowVoicelineWait)
  );

  if (isHollowChanneling) {
    if (!hollowMaskOverlayImg && !hollowMaskOverlayImgLoading) {
      loadHollowMaskOverlayImage();
    }
    const maxH = ichigo.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 325;
    const formProg = Math.min(1.0, Math.max(0.0, 1.0 - (ichigo.hollowMaskFormationTimer / maxH)));
    // Target opacity builds up to a faint, subtle 0.20 to keep the mask less visible and ghostly
    const targetAlpha = Math.min(0.20, formProg * 0.35);
    currentHollowMaskOpacity += (targetAlpha - currentHollowMaskOpacity) * 0.08;
  } else {
    currentHollowMaskOpacity = Math.max(0, currentHollowMaskOpacity - 0.045);
  }

  if (!ichigo && currentHollowMaskOpacity <= 0.01) return;

  const isFrozen = Boolean(
    ichigo && (
      ichigo.isFrozenByInfinity ||
      (ichigo.timeStopTimer && ichigo.timeStopTimer > 0) ||
      (ichigo.statusEffects && ichigo.statusEffects.timeStopTimer > 0) ||
      (ichigo.electricStunTimer && ichigo.electricStunTimer > 0) ||
      (ichigo.paralyzeTimer && ichigo.paralyzeTimer > 0) ||
      (ichigo.hitStunTimer && ichigo.hitStunTimer > 0) ||
      ichigo.isParalyzed ||
      ichigo.isGrabbedByMahoraga ||
      ichigo.isParalyzedByMahoraga ||
      ichigo.isWallSlammed ||
      ichigo.wallSlamPinnedX !== undefined ||
      ichigo.isTargetOfAmbush
    )
  );
  if (isFrozen) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;
  const cx = (ichigo ? ichigo.x : (arena.x || 0) + (arena.width || 800) / 2) + shakeX;
  const cy = (ichigo ? ichigo.y : (arena.y || 0) + (arena.height || 600) / 2) + shakeY;
  const r = ichigo ? (ichigo.r || 25) : 25;

  let isChanneling = Boolean(ichigo && ichigo.isChannelingBankai && ichigo.bankaiChargeTimer > 0);
  let isBursting = Boolean(ichigo && ichigo.bankaiBurstTimer && ichigo.bankaiBurstTimer > 0);
  let isHollow = !isChanneling && !isBursting && Boolean(
    (ichigo && ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) ||
    (ichigo && ichigo.hollowBurstTimer && ichigo.hollowBurstTimer > 0) ||
    currentHollowMaskOpacity > 0.01
  );

  let opacity = 0;
  let bankaiProg = 0;
  let burstProg = 0;

  if (isChanneling) {
    const maxB = ichigo.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 66;
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
    // Hollow Transformation formation (5s build-up) & burst decay
    if (ichigo && ichigo.hollowMaskFormationTimer !== undefined && ichigo.hollowMaskFormationTimer > 0) {
      const maxH = ichigo.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 325;
      const formProg = Math.min(1.0, Math.max(0.0, 1.0 - (ichigo.hollowMaskFormationTimer / maxH)));
      opacity = Math.min(0.90, formProg * 1.25);
    } else if (ichigo && ichigo.hollowBurstTimer !== undefined && ichigo.hollowBurstTimer > 0) {
      const maxB = ichigo.hollowBurstMax || CONFIG.ichigo?.hollowBurstFrames || 36;
      burstProg = Math.min(1.0, Math.max(0.0, 1.0 - ((ichigo.hollowBurstTimer || 0) / maxB)));
      opacity = Math.pow(1.0 - burstProg, 1.3) * 0.90;
    } else {
      opacity = currentHollowMaskOpacity;
    }
  }

  if (opacity <= 0.01 && currentHollowMaskOpacity <= 0.01) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // ── 1. Moment of Eruption Inverted Negative Flash (Frames 0-3 of Bankai burst) ──
  if (isBursting && burstProg < 0.10) {
    const flashAlpha = Math.pow(1.0 - (burstProg / 0.10), 1.5) * 0.95;
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── 2. Full-Screen Radial Bleach Void Vignette ──
  const maxR = Math.max(canvas.width, canvas.height) * 0.95;
  const grad = ctx.createRadialGradient(cx, cy, r * 1.2, cx, cy, maxR);
  if (isHollow) {
    // Pure Dark Obsidian & Crimson Void Shroud (NO white background in arena)
    grad.addColorStop(0.0, 'rgba(15, 0, 3, 0.0)');
    grad.addColorStop(0.25, `rgba(20, 2, 5, ${(opacity * 0.45).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(8, 1, 3, ${(opacity * 0.75).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(1, 0, 2, ${(opacity * 0.92).toFixed(3)})`);
  } else {
    // Crimson-Black theme for Bankai
    grad.addColorStop(0.0, `rgba(40, 6, 15, ${(opacity * 0.35).toFixed(3)})`);
    grad.addColorStop(0.25, `rgba(16, 3, 8, ${(opacity * 0.75).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(4, 1, 6, ${(opacity * 0.94).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(1, 0, 2, ${(opacity * 0.98).toFixed(3)})`);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── 3. Arena Floor Expanding Concentric Reiatsu Shock Rings (Pixel-Art Stepped Ring) ──
  if (isChanneling || isHollow) {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringP = ((now * 0.0022 + i * (1.0 / ringCount)) % 1.0);
      const ringR = r * 1.5 + ringP * 280;
      const ringAlpha = (1.0 - ringP) * Math.sin(ringP * Math.PI) * opacity * 0.70;
      if (ringAlpha > 0.01) {
        const ringColor = isHollow
          ? ((i % 2 === 0)
            ? `rgba(255, 255, 255, ${ringAlpha.toFixed(3)})`
            : `rgba(10, 10, 15, ${ringAlpha.toFixed(3)})`)
          : ((i % 2 === 0)
            ? `rgba(220, 20, 20, ${ringAlpha.toFixed(3)})`
            : `rgba(255, 45, 20, ${ringAlpha.toFixed(3)})`);

        const pxStep = 3;
        const ringSteps = Math.max(18, Math.ceil((ringR * Math.PI * 2) / pxStep));
        ctx.fillStyle = ringColor;
        ctx.imageSmoothingEnabled = false;

        for (let step = 0; step < ringSteps; step++) {
          const ang = (step / ringSteps) * Math.PI * 2;
          const px = Math.round((cx + Math.cos(ang) * ringR) / pxStep) * pxStep;
          const py = Math.round((cy + Math.sin(ang) * ringR) / pxStep) * pxStep;
          ctx.fillRect(px, py, pxStep, pxStep);
        }
      }
    }
  }

// ── 22 Organic Jagged Shattered Bone / Porcelain Shards for Hollow Mask Assembly ──
const _HOLLOW_MASK_OVERLAY_SHARDS = [
  // 1. Top Left Horn Needle Spike
  {
    name: 'horn_left_spike',
    poly: [[0.00, 0.00], [0.20, 0.00], [0.26, 0.10], [0.14, 0.16], [0.02, 0.14]],
    startDir: { x: -1.35, y: -0.95 },
    rot: -0.58,
    delay: 0.30,
    seed: 0.8
  },
  // 2. Forehead Upper Left Wedge
  {
    name: 'forehead_left_plate',
    poly: [[0.20, 0.00], [0.38, 0.00], [0.42, 0.13], [0.24, 0.20], [0.14, 0.16], [0.26, 0.10]],
    startDir: { x: -0.85, y: -1.20 },
    rot: 0.42,
    delay: 0.12,
    seed: 0.4
  },
  // 3. Central Crown Apex Crest
  {
    name: 'crown_apex',
    poly: [[0.38, 0.00], [0.62, 0.00], [0.57, 0.12], [0.50, 0.08], [0.42, 0.13]],
    startDir: { x: 0.0, y: -1.45 },
    rot: -0.32,
    delay: 0.03,
    seed: 0.2
  },
  // 4. Forehead Upper Right Plate (Crimson Stripe 1)
  {
    name: 'forehead_right_plate',
    poly: [[0.62, 0.00], [0.80, 0.00], [0.74, 0.10], [0.86, 0.16], [0.76, 0.20], [0.57, 0.12]],
    startDir: { x: 0.85, y: -1.20 },
    rot: -0.42,
    delay: 0.15,
    seed: 0.5
  },
  // 5. Top Right Horn Needle Spike (Crimson Stripe Tip)
  {
    name: 'horn_right_spike',
    poly: [[0.80, 0.00], [1.00, 0.00], [0.98, 0.14], [0.86, 0.16], [0.74, 0.10]],
    startDir: { x: 1.35, y: -0.95 },
    rot: 0.58,
    delay: 0.33,
    seed: 0.9
  },
  // 6. Central Forehead Diamond Splinter
  {
    name: 'forehead_center_splinter',
    poly: [[0.42, 0.13], [0.57, 0.12], [0.50, 0.26], [0.44, 0.23]],
    startDir: { x: 0.15, y: -0.90 },
    rot: 0.22,
    delay: 0.09,
    seed: 0.3
  },
  // 7. Left Temple Wing Shard
  {
    name: 'temple_left_wing',
    poly: [[0.02, 0.14], [0.14, 0.16], [0.24, 0.20], [0.17, 0.33], [0.03, 0.30]],
    startDir: { x: -1.40, y: -0.45 },
    rot: 0.48,
    delay: 0.21,
    seed: 0.6
  },
  // 8. Left Eyebrow & Upper Socket Arch
  {
    name: 'brow_left_arch',
    poly: [[0.17, 0.33], [0.24, 0.20], [0.44, 0.23], [0.47, 0.32], [0.31, 0.36], [0.15, 0.38]],
    startDir: { x: -1.10, y: -0.20 },
    rot: -0.36,
    delay: 0.18,
    seed: 0.5
  },
  // 9. Center Glabella Wedge (Between Eyes)
  {
    name: 'glabella_center',
    poly: [[0.44, 0.23], [0.50, 0.26], [0.56, 0.23], [0.52, 0.40], [0.47, 0.32]],
    startDir: { x: 0.0, y: -0.60 },
    rot: -0.18,
    delay: 0.00,
    seed: 0.1
  },
  // 10. Right Eyebrow Arch (Crimson Stripes)
  {
    name: 'brow_right_arch',
    poly: [[0.50, 0.26], [0.76, 0.20], [0.83, 0.33], [0.69, 0.38], [0.52, 0.40], [0.56, 0.23]],
    startDir: { x: 1.10, y: -0.20 },
    rot: 0.36,
    delay: 0.24,
    seed: 0.7
  },
  // 11. Right Temple Wing Shard
  {
    name: 'temple_right_wing',
    poly: [[0.86, 0.16], [0.98, 0.14], [0.97, 0.30], [0.83, 0.33], [0.76, 0.20]],
    startDir: { x: 1.40, y: -0.45 },
    rot: -0.48,
    delay: 0.27,
    seed: 0.7
  },
  // 12. Outer Left Cheek Flange
  {
    name: 'cheek_outer_left',
    poly: [[0.03, 0.30], [0.17, 0.33], [0.15, 0.38], [0.27, 0.50], [0.05, 0.53]],
    startDir: { x: -1.35, y: 0.25 },
    rot: -0.44,
    delay: 0.42,
    seed: 0.8
  },
  // 13. Inner Left Cheek Bone
  {
    name: 'cheek_inner_left',
    poly: [[0.15, 0.38], [0.31, 0.36], [0.45, 0.40], [0.41, 0.54], [0.27, 0.50]],
    startDir: { x: -0.90, y: 0.35 },
    rot: 0.28,
    delay: 0.36,
    seed: 0.6
  },
  // 14. Center Nasal Bridge Column
  {
    name: 'nasal_ridge',
    poly: [[0.47, 0.32], [0.52, 0.40], [0.53, 0.56], [0.45, 0.56], [0.41, 0.54], [0.45, 0.40]],
    startDir: { x: 0.0, y: 0.10 },
    rot: 0.12,
    delay: 0.06,
    seed: 0.2
  },
  // 15. Inner Right Cheek Plate (Crimson Marks)
  {
    name: 'cheek_inner_right',
    poly: [[0.52, 0.40], [0.69, 0.38], [0.75, 0.44], [0.71, 0.54], [0.53, 0.56]],
    startDir: { x: 0.90, y: 0.35 },
    rot: -0.28,
    delay: 0.39,
    seed: 0.7
  },
  // 16. Outer Right Cheek Sunburst (Crimson Marks)
  {
    name: 'cheek_outer_right',
    poly: [[0.83, 0.33], [0.97, 0.30], [0.95, 0.53], [0.71, 0.54], [0.75, 0.44]],
    startDir: { x: 1.35, y: 0.25 },
    rot: 0.44,
    delay: 0.45,
    seed: 0.9
  },
  // 17. Upper Gritted Teeth Row — Left Flank
  {
    name: 'upper_teeth_left',
    poly: [[0.05, 0.53], [0.27, 0.50], [0.41, 0.54], [0.45, 0.56], [0.49, 0.62], [0.47, 0.70], [0.13, 0.68]],
    startDir: { x: -0.75, y: 0.75 },
    rot: 0.34,
    delay: 0.48,
    seed: 0.7
  },
  // 18. Upper Gritted Teeth Row — Right Flank (Crimson Marks)
  {
    name: 'upper_teeth_right',
    poly: [[0.53, 0.56], [0.71, 0.54], [0.95, 0.53], [0.87, 0.68], [0.51, 0.70], [0.49, 0.62]],
    startDir: { x: 0.75, y: 0.75 },
    rot: -0.34,
    delay: 0.51,
    seed: 0.8
  },
  // 19. Lower Left Jaw Plate & Mandible Teeth
  {
    name: 'jaw_left_mandible',
    poly: [[0.13, 0.68], [0.47, 0.70], [0.44, 0.82], [0.21, 0.83], [0.11, 0.76]],
    startDir: { x: -0.95, y: 1.10 },
    rot: -0.38,
    delay: 0.57,
    seed: 0.9
  },
  // 20. Lower Right Jaw Plate & Mandible Teeth (Crimson Marks)
  {
    name: 'jaw_right_mandible',
    poly: [[0.51, 0.70], [0.87, 0.68], [0.89, 0.76], [0.79, 0.83], [0.54, 0.82]],
    startDir: { x: 0.95, y: 1.10 },
    rot: 0.38,
    delay: 0.60,
    seed: 0.9
  },
  // 21. Mandible Center Teeth Divider
  {
    name: 'mandible_center_teeth',
    poly: [[0.47, 0.70], [0.51, 0.70], [0.54, 0.82], [0.50, 0.86], [0.44, 0.82]],
    startDir: { x: 0.0, y: 0.90 },
    rot: 0.16,
    delay: 0.54,
    seed: 0.6
  },
  // 22. Chin Tip Arrowhead Vertex
  {
    name: 'chin_tip_arrowhead',
    poly: [[0.11, 0.76], [0.21, 0.83], [0.44, 0.82], [0.50, 0.86], [0.54, 0.82], [0.79, 0.83], [0.89, 0.76], [0.50, 1.00]],
    startDir: { x: 0.0, y: 1.45 },
    rot: -0.24,
    delay: 0.63,
    seed: 1.0
  }
];

function _drawHollowMaskOverlayShards(ctx, destX, destY, destW, destH, currentFormProg, maskImg, currentOpacity, arenaW, arenaH) {
  // Assembly spans across 0.0 to 0.88 of total channeling formation
  const maskAssemblyProg = Math.min(1.0, Math.max(0.0, currentFormProg / 0.86));
  const shardFlightDuration = 0.22;

  // 1. Draw Attached / Locked Shards (Stationary on Arena Floor)
  for (let i = 0; i < _HOLLOW_MASK_OVERLAY_SHARDS.length; i++) {
    const shard = _HOLLOW_MASK_OVERLAY_SHARDS[i];
    if (maskAssemblyProg < shard.delay) continue;

    const rawProg = (maskAssemblyProg - shard.delay) / shardFlightDuration;
    if (rawProg < 1.0) continue; // In-flight shards handled below

    // Draw clipped slice of the Hollow Mask PNG for this shard with decreased subtle opacity
    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(maskImg, destX, destY, destW, destH);
    ctx.restore();

    // Subtle dark organic fracture seam line
    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.strokeStyle = 'rgba(20, 2, 8, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Sudden arrival impact flash along fracture seam (for first ~8 frames after snap)
    if (rawProg < 1.40) {
      const flashAlpha = Math.max(0, 1.0 - (rawProg - 1.0) / 0.40);
      ctx.save();
      ctx.globalAlpha = flashAlpha * currentOpacity * 1.5;
      ctx.strokeStyle = 'rgba(255, 60, 90, 0.95)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      shard.poly.forEach((pt, idx) => {
        const px = destX + pt[0] * destW;
        const py = destY + pt[1] * destH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Draw In-Flight Shards Converging Smoothly 1-by-1 with Continuous Fluid Deceleration
  for (let i = 0; i < _HOLLOW_MASK_OVERLAY_SHARDS.length; i++) {
    const shard = _HOLLOW_MASK_OVERLAY_SHARDS[i];
    if (maskAssemblyProg < shard.delay) continue;

    const rawProg = (maskAssemblyProg - shard.delay) / shardFlightDuration;
    if (rawProg >= 1.0) continue; // Already attached

    let cx = 0, cy = 0;
    for (const pt of shard.poly) {
      cx += destX + pt[0] * destW;
      cy += destY + pt[1] * destH;
    }
    cx /= shard.poly.length;
    cy /= shard.poly.length;

    const shardProg = Math.max(0, Math.min(1.0, rawProg));
    // Continuous fluid deceleration power curve: smoothly converges from 1.0 to 0.0 at shardProg=1.0 without pausing
    const remain = Math.pow(1.0 - shardProg, 2.6);

    const flightDist = Math.max(arenaW, arenaH) * (0.36 + (shard.seed || 0.5) * 0.30) * remain;
    const curOffX = shard.startDir.x * flightDist;
    const curOffY = shard.startDir.y * flightDist;
    const curRot = shard.rot * remain;
    const curScale = 0.55 + 0.45 * (1.0 - remain);
    const curAlpha = Math.min(1.0, 0.35 + shardProg * 0.65);

    ctx.save();
    ctx.globalAlpha = Math.min(currentOpacity, currentOpacity * curAlpha);
    ctx.translate(cx + curOffX, cy + curOffY);
    ctx.rotate(curRot);
    ctx.scale(curScale, curScale);
    ctx.translate(-cx, -cy);

    // Draw clipped slice of the Hollow Mask PNG for this in-flight shard
    ctx.save();
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(maskImg, destX, destY, destW, destH);
    ctx.restore();

    // Chaotic jagged fracture edge glow with electric crimson spiritual energy
    ctx.strokeStyle = 'rgba(235, 25, 60, 0.92)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

  // ── 4. Hollow Mask Arena-Spanning Overlay (Cinematic apparition assembling piece-by-piece 1-by-1 and occupying the arena) ──
  if (!isBankaiChannelingOrBursting && currentHollowMaskOpacity > 0.01 && hollowMaskOverlayImg && hollowMaskOverlayImg.complete && hollowMaskOverlayImg.naturalWidth > 0) {
    ctx.save();

    // 1. Strictly clip to the arena boundaries (handling both circular and rectangular arenas)
    ctx.beginPath();
    const arenaX = (arena.x || 0) + shakeX;
    const arenaY = (arena.y || 0) + shakeY;
    const arenaW = arena.width || 800;
    const arenaH = arena.height || 600;
    const arenaCenterX = arenaX + arenaW / 2;
    const arenaCenterY = arenaY + arenaH / 2;

    if (arena.shape === 'circle') {
      const ar = arena.radius || (arenaW / 2);
      ctx.arc(arenaCenterX, arenaCenterY, ar, 0, Math.PI * 2);
    } else {
      ctx.rect(arenaX, arenaY, arenaW, arenaH);
    }
    ctx.clip();

    const maskAlpha = Math.min(0.20, currentHollowMaskOpacity);

    // 2. Scale mask to fully occupy / span across the arena with an enlarged, imposing scale
    const aspect = (hollowMaskOverlayImg.naturalHeight / hollowMaskOverlayImg.naturalWidth) || 1.0;
    const baseSize = Math.max(arenaW, arenaH / aspect) * 1.40;
    const pulse = Math.sin(now * 0.003) * 0.02;
    const maskW = baseSize * (1.0 + pulse);
    const maskH = maskW * aspect;

    const destX = arenaCenterX - maskW / 2;
    const destY = arenaCenterY - maskH / 2;
    const destW = maskW;
    const destH = maskH;

    const isForming = Boolean(ichigo && ((ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) || ichigo._hollowVoicelineWait));
    const maxH = (ichigo && ichigo.hollowMaskFormationMax) || CONFIG.ichigo?.hollowMaskFormationFrames || 325;
    const currentFormProg = (ichigo && ichigo.hollowMaskFormationTimer > 0) 
      ? Math.min(1.0, Math.max(0.0, 1.0 - (ichigo.hollowMaskFormationTimer / maxH))) 
      : 1.0;

    // 3. Draw the Hollow Mask PNG FIRST (either shards 1-by-1 or fully assembled mask at decreased subtle opacity)
    if (isForming && currentFormProg < 0.98) {
      _drawHollowMaskOverlayShards(ctx, destX, destY, destW, destH, currentFormProg, hollowMaskOverlayImg, maskAlpha, arenaW, arenaH);
    } else {
      // Draw the fully assembled Hollow Mask PNG occupying the arena with decreased subtle opacity
      ctx.save();
      ctx.globalAlpha = maskAlpha;
      ctx.drawImage(
        hollowMaskOverlayImg,
        destX,
        destY,
        destW,
        destH
      );
      ctx.restore();
    }

    // 4. Luminous White Spiritual Dim Effect OVERLAYING ON TOP OF the PNG Mask (Strictly clipped into the arena)
    const whiteDimAlpha = Math.min(0.65, (currentFormProg || 1.0) * 0.65);
    if (whiteDimAlpha > 0.01) {
      // Atmospheric white background wash across arena floor overlaying the PNG
      ctx.fillStyle = `rgba(255, 255, 255, ${(whiteDimAlpha * 0.32).toFixed(3)})`;
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);

      // Radial spectral white Reiatsu glow expanding from center overlaying the PNG
      const auraRadius = Math.max(arenaW, arenaH) * 0.80;
      const whiteGrad = ctx.createRadialGradient(
        arenaCenterX, arenaCenterY, auraRadius * 0.10,
        arenaCenterX, arenaCenterY, auraRadius
      );
      whiteGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(whiteDimAlpha * 0.70).toFixed(3)})`);
      whiteGrad.addColorStop(0.40, `rgba(245, 250, 255, ${(whiteDimAlpha * 0.48).toFixed(3)})`);
      whiteGrad.addColorStop(0.75, `rgba(225, 238, 255, ${(whiteDimAlpha * 0.28).toFixed(3)})`);
      whiteGrad.addColorStop(1.0, `rgba(200, 220, 255, ${(whiteDimAlpha * 0.10).toFixed(3)})`);
      ctx.fillStyle = whiteGrad;
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
    }

    ctx.restore();
  }

  ctx.restore();
}

// ──────────────────────────────────────────
// DRAW — FLOATING TEXT LABELS
// ──────────────────────────────────────────