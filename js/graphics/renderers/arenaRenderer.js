import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { drawTacticalMap, STARTER_MAP } from '../../../Tactical Force/maps/index.js';
import { applyCameraToCtx, worldToScreen } from '../../systems/cameraSystem.js';

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

  const hasActiveDomain = state.fighters && state.fighters.some(f => f && (f.domainActive || f.stolenDomainActive || f._mahitoDomainActive) && typeof f.drawDomainBackground === 'function');

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

  // 3. Outer background theme details (Halftone Dots, Action Triangles, Speed Needles) removed for clean minimalist background

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

    // ── Draw Floor Background in Canvas 2D (Synchronized under Camera) ──
    if (!hasActiveDomain) {
      ctx.save();
      applyCameraToCtx(ctx);
      ctx.fillStyle = isDark ? '#000000' : (CONFIG.arenaInnerBgColor || '#ffffff');
      if (arena.shape === 'circle') {
        const cx = arena.x + arena.width / 2;
        const cy = arena.y + arena.height / 2;
        const ar = arena.radius || (arena.width / 2);
        ctx.beginPath();
        ctx.arc(cx, cy, ar, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(arena.x, arena.y, arena.width, arena.height);
      }
      ctx.restore();
    } else if (hasActiveDomain && !state.pixiApp) {
      // In native Canvas 2D mode, render active domain background under camera transform
      const activeDomainFighter = state.fighters?.find(f => f && (f.domainActive || f.stolenDomainActive || f._mahitoDomainActive) && typeof f.drawDomainBackground === 'function');
      if (activeDomainFighter) {
        ctx.save();
        applyCameraToCtx(ctx);
        activeDomainFighter.drawDomainBackground(ctx);
        ctx.restore();
      }
    }

    ctx.save();
    applyCameraToCtx(ctx);
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

  // 5. Watermark removed for clean arena floor

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
      applyCameraToCtx(ctx);
      const nameFont = '700 42px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
      const vsFont = '700 24px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
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

      const is1v2 = (state.mode === '1v2 Stand Off' || state.mode === '1v2' || state.mode === 'Stand Off 1v2' || state.mode === GAME_MODES?.STAND_OFF_1V2);
      const is2v2 = (state.mode === '2v2' || state.mode === 'Tactical 2v2' || state.mode === GAME_MODES?.TWO_VS_TWO || state.mode === GAME_MODES?.TACTICAL_2V2);
      const is4v4 = (state.mode === '4v4' || state.mode === 'Tactical 4v4' || state.mode === GAME_MODES?.TACTICAL_4V4);

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
        if (is1v2 && mainFighters.length >= 3) {
          team0 = [mainFighters[0]];
          team1 = [mainFighters[1], mainFighters[2]];
        } else if (is2v2 && mainFighters.length >= 4) {
          team0 = [mainFighters[0], mainFighters[1]];
          team1 = [mainFighters[2], mainFighters[3]];
        } else if (mainFighters.length === 2) {
          team0 = [mainFighters[0]];
          team1 = [mainFighters[1]];
        }
      }

      const isTeamMatch = (team0.length > 0 && team1.length > 0 && (team0.length + team1.length === mainFighters.length));

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

        ctx.font = customNameFont;
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = '2px';
        }

        let wTeam0 = 0;
        team0Data.forEach(td => {
          wTeam0 = Math.max(wTeam0, ctx.measureText(td.name).width);
        });

        let wTeam1 = 0;
        team1Data.forEach(td => {
          wTeam1 = Math.max(wTeam1, ctx.measureText(td.name).width);
        });

        ctx.font = customVsFont;
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = '1.5px';
        }
        const vsText = 'vs';
        const wVs = ctx.measureText(vsText).width;

        const pad = 14;
        const totalW = wTeam0 + pad + wVs + pad + wTeam1;
        const maxW = arena.width - 16;
        const scale = totalW > maxW ? maxW / totalW : 1.0;

        const bottomY = arena.y - 12;
        const lineSpacing = hasStackedTeam ? 34 : 0;
        const topY = bottomY - lineSpacing;
        const midY = (topY + bottomY) / 2;

        ctx.save();
        if (scale < 1.0) {
          const scaleAnchorY = hasStackedTeam ? midY : bottomY;
          ctx.translate(centerX, scaleAnchorY);
          ctx.scale(scale, scale);
          ctx.translate(-centerX, -scaleAnchorY);
        }

        const startX = centerX - totalW / 2;
        const vsX = startX + wTeam0 + pad;
        const team1X = vsX + wVs + pad;

        ctx.textAlign = 'left';

        // Render Team 0 (Left Side)
        ctx.font = customNameFont;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        if (team0Data.length === 1) {
          ctx.fillStyle = team0Data[0].color;
          ctx.fillText(team0Data[0].name, startX, hasStackedTeam ? midY : bottomY);
        } else {
          ctx.fillStyle = team0Data[0].color;
          ctx.fillText(team0Data[0].name, startX, topY);
          ctx.fillStyle = team0Data[1].color;
          ctx.fillText(team0Data[1].name, startX, bottomY);
        }

        // Render Center "vs"
        ctx.font = customVsFont;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
        ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
        ctx.fillText(vsText, vsX, (hasStackedTeam ? midY : bottomY) - 1.5);

        // Render Team 1 (Right Side)
        ctx.font = customNameFont;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        if (team1Data.length === 1) {
          ctx.fillStyle = team1Data[0].color;
          ctx.fillText(team1Data[0].name, team1X, hasStackedTeam ? midY : bottomY);
        } else {
          ctx.fillStyle = team1Data[0].color;
          ctx.fillText(team1Data[0].name, team1X, topY);
          ctx.fillStyle = team1Data[1].color;
          ctx.fillText(team1Data[1].name, team1X, bottomY);
        }

        ctx.restore();
      } else {
        // Multi-fighter FFA fallback: horizontal row joined with "vs"
        const pad = 10;
        const vsText = 'vs';
        const fighterData = mainFighters.map(f => ({
          name: (f.name || f._def?.name || f.characterId || 'P').toUpperCase(),
          color: getFighterThemeColor(f, '#F8FAFC')
        }));

        let totalW = 0;
        ctx.font = nameFont;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        fighterData.forEach((fd, i) => {
          totalW += ctx.measureText(fd.name).width;
          if (i < fighterData.length - 1) {
            ctx.font = vsFont;
            totalW += pad + ctx.measureText(vsText).width + pad;
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
          ctx.font = nameFont;
          if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
          ctx.fillStyle = fd.color;
          ctx.fillText(fd.name, startX, textY);
          startX += ctx.measureText(fd.name).width;

          if (i < fighterData.length - 1) {
            startX += pad;
            ctx.font = vsFont;
            if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
            ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
            ctx.fillText(vsText, startX, textY - 1.5);
            startX += ctx.measureText(vsText).width + pad;
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

// ──────────────────────────────────────────
// DOMAIN & ULTIMATE DIM SCREEN OVERLAYS
// (Extracted to ./domainDimOverlays.js)
// ──────────────────────────────────────────
export {
  excludeGojoInfinityFromDim,
  applyDomainArenaVignetteCutout,
  drawPurpleDimScreen,
  drawGojoDomainDimScreen,
  drawRubbickDomainDimScreen,
  drawSukunaDomainDimScreen,
  drawYutaDomainDimScreen,
  drawMahitoDomainDimScreen,
  drawTojiUltimateOverlay,
  drawMahoragaAdaptationDimScreen,
  drawNanamiRatioCritDimScreen,
  drawMahoragaLevel8DimScreen,
  drawSaitamaSeriousPunchDimScreen,
  drawBankaiImpactDimScreen
} from './domainDimOverlays.js';

// ──────────────────────────────────────────
// DRAW — FUEL PICKUPS (Orange Fighter)
// ──────────────────────────────────────────
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

    // ── Outer glow ──
    const glowGrad = ctx.createRadialGradient(pickup.x, pickup.y, r * 0.6, pickup.x, pickup.y, r * 2.2);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Battery dimensions ──
    const bw = r * 1.6;   // battery body width (half)
    const bh = r * 1.1;   // battery body height (half)
    const br = r * 0.35;  // corner radius
    const nx = pickup.x;  // center x
    const ny = pickup.y;  // center y

    // ── Battery body (rounded rectangle) ──
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

