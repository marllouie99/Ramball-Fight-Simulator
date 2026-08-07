// ─────────────────────────────────────────────
// YUTA OKKOTSU DOMAIN EXPANSION (AUTHENTIC MUTUAL LOVE) VISUAL RENDERER
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';

export function renderYutaDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (!fighter.domainActive) return;

  ctx.save();
  const time = Date.now();
  const pulse = Math.sin(time / 300) * 0.04;
  const alphaMult = fighter.domainActive ? 1.0 : Math.min(1.0, fighter.rikaAlpha || 1.0);

  const arena = CONFIG.arena;
  const centerX = arena ? (arena.x + arena.width / 2) : (fighter.domainActive && fighter.domainX !== undefined ? fighter.domainX : fighter.x);
  const centerY = arena ? (arena.y + arena.height / 2) : (fighter.domainActive && fighter.domainY !== undefined ? fighter.domainY : fighter.y);
  const arenaW = arena ? arena.width : 800;
  const arenaH = arena ? arena.height : 600;

  const domX = centerX;
  const domY = centerY;

  let midX = domX;
  let midY = domY;

  const domainRadius = CONFIG.yuta.domainRadius || 350;

  // ── 1. DARK ATMOSPHERIC VOID & ROSY AMBIENT GLOW ──
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  if (!fighter._cachedYutaBgGrad || fighter._cachedYutaBgMidX !== midX || fighter._cachedYutaBgMidY !== midY) {
    fighter._cachedYutaBgMidX = midX;
    fighter._cachedYutaBgMidY = midY;
    fighter._cachedYutaBgGrad = ctx.createRadialGradient(midX, midY, 40, midX, midY, 650);
    fighter._cachedYutaBgGrad.addColorStop(0, 'rgba(55, 10, 32, 0.68)');   // Dark rose core
    fighter._cachedYutaBgGrad.addColorStop(0.35, 'rgba(28, 6, 18, 0.80)'); // Deep magenta-black
    fighter._cachedYutaBgGrad.addColorStop(0.75, 'rgba(12, 3, 9, 0.90)');  // Charcoal void
    fighter._cachedYutaBgGrad.addColorStop(1, 'rgba(4, 1, 4, 0.96)');      // Deep black outer edge
  }

  if (isMultiDomain) {
    // During Domain Clash: Clip void with a feathered radial gradient so Yuta's void blends smoothly into Sukuna's blood pool
    ctx.save();
    const clashGrad = ctx.createRadialGradient(domX, domY, 40, domX, domY, domainRadius + 120);
    clashGrad.addColorStop(0, 'rgba(55, 10, 32, 0.72)');   // Dark rose core
    clashGrad.addColorStop(0.35, 'rgba(28, 6, 18, 0.82)'); // Deep magenta-black
    clashGrad.addColorStop(0.70, 'rgba(12, 3, 9, 0.78)');  // Charcoal void
    clashGrad.addColorStop(0.85, 'rgba(6, 1, 4, 0.35)');   // Feathering start
    clashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');          // Fully transparent outer edge

    ctx.fillStyle = clashGrad;
    ctx.beginPath();
    ctx.arc(domX, domY, domainRadius + 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (!isClashSecondary) {
    ctx.fillStyle = fighter._cachedYutaBgGrad;
    if (arena) {
      ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    } else {
      ctx.fillRect(midX - 1000, midY - 1000, 2000, 2000);
    }
  }

  if (fighter.domainActive) {
    // ── 2. DARK ATMOSPHERIC VORTEX ──
    ctx.save();
    ctx.globalAlpha = (0.6 + pulse * 2) * alphaMult;
    
    // OPTIMIZED: Replaced expensive radial gradient with layered alpha circles
    ctx.beginPath();
    ctx.arc(domX, domY - arenaH * 0.45, 600, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 5, 15, 0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(domX, domY - arenaH * 0.45, 300, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 2, 7, 0.7)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(domX, domY - arenaH * 0.45, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
    if (!isMultiDomain) {
      ctx.strokeStyle = 'rgba(50, 10, 30, 0.3)';
      for (let i = 0; i < 6; i++) {
        ctx.lineWidth = 15 + i * 8;
        ctx.beginPath();
        ctx.ellipse(domX, domY - arenaH * 0.45, 120 + i * 90, 50 + i * 35, (time * 0.0003) + (i * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // ── 3. STATIC DOMAIN ENVIRONMENT (Katanas, Cross Pillars & Chains Cached on Offscreen Canvas) ──
    ctx.save();
    
    const roundDomX = Math.round(domX / 40) * 40;
    const roundDomY = Math.round(domY / 40) * 40;
    const cacheKey = `${arenaW}_${arenaH}_${roundDomX}_${roundDomY}`;
    if (!fighter._cachedSwordsCanvas || fighter._cachedSwordsKey !== cacheKey) {
      fighter._cachedSwordsKey = cacheKey;
      const cvsW = (typeof state !== 'undefined' && state.canvas && state.canvas.width) ? state.canvas.width : 1200;
      const cvsH = (typeof state !== 'undefined' && state.canvas && state.canvas.height) ? state.canvas.height : 900;
      
      if (!fighter._cachedSwordsCanvas) {
        fighter._cachedSwordsCanvas = document.createElement('canvas');
      }
      if (fighter._cachedSwordsCanvas.width !== cvsW || fighter._cachedSwordsCanvas.height !== cvsH) {
        fighter._cachedSwordsCanvas.width = cvsW;
        fighter._cachedSwordsCanvas.height = cvsH;
      }
      const offCtx = fighter._cachedSwordsCanvas.getContext('2d');
      offCtx.clearRect(0, 0, cvsW, cvsH);

      const pillarLayout = [
        { dx: -arenaW * 0.38, dy:  arenaH * 0.25 },
        { dx: -arenaW * 0.28, dy: -arenaH * 0.08 },
        { dx: -arenaW * 0.14, dy: -arenaH * 0.34 },
        { dx:  arenaW * 0.14, dy: -arenaH * 0.34 },
        { dx:  arenaW * 0.28, dy: -arenaH * 0.08 },
        { dx:  arenaW * 0.38, dy:  arenaH * 0.25 }
      ];

      // A. Draw Ground Katana Field onto Offscreen Canvas
      const swords = [];
      const rows = CONFIG.yuta?.domainSwordRows || 4;
      const cols = CONFIG.yuta?.domainSwordCols || 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c;
          const jitterX = (Math.sin(index * 17.3 + 1.2) * 0.35 + 0.5);
          const jitterY = (Math.cos(index * 13.7 + 2.4) * 0.35 + 0.5);

          const gridX = (c + jitterX) / cols;
          const gridY = (r + jitterY) / rows;

          const sx = arena ? (arena.x + 35 + gridX * (arena.width - 70)) : (domX - 300 + gridX * 600);
          const sy = arena ? (arena.y + 35 + gridY * (arena.height - 70)) : (domY - 220 + gridY * 440);

          let overlapsPillar = false;
          for (let p = 0; p < pillarLayout.length; p++) {
            const px = domX + pillarLayout[p].dx;
            const py = domY + pillarLayout[p].dy;
            if (Math.abs(sx - px) < 55 && sy <= py + 20 && sy >= py - 220) {
              overlapsPillar = true;
              break;
            }
          }
          if (overlapsPillar) continue;

          const depthProgress = arena ? Math.max(0, Math.min(1, (sy - arena.y) / arena.height)) : gridY;
          const kScale = 0.28 + Math.pow(depthProgress, 1.3) * 1.55;
          const tiltAngle = (index % 5 - 2) * 0.12;

          swords.push({ sx, sy, kScale, tiltAngle, index });
        }
      }
      swords.sort((a, b) => a.sy - b.sy);

      const offBladeGrad = offCtx.createLinearGradient(-1.5, 0, 1.5, 0);
      offBladeGrad.addColorStop(0, '#ffffff');
      offBladeGrad.addColorStop(0.5, '#d8d8d8');
      offBladeGrad.addColorStop(1, '#909090');

      swords.forEach(sword => {
        const { sx, sy, kScale, tiltAngle } = sword;

        offCtx.save();
        offCtx.translate(sx, sy);
        offCtx.scale(kScale, kScale);

        offCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        offCtx.beginPath();
        offCtx.ellipse(0, 1, 6, 2.5, 0, 0, Math.PI * 2);
        offCtx.fill();

        offCtx.fillStyle = 'rgba(255, 105, 180, 0.35)';
        offCtx.beginPath();
        offCtx.ellipse(0, 1, 9, 4, 0, 0, Math.PI * 2);
        offCtx.fill();

        offCtx.rotate(tiltAngle);

        offCtx.fillStyle = offBladeGrad;
        offCtx.beginPath();
        offCtx.moveTo(-1.5, -16);
        offCtx.lineTo(1.5, -16);
        offCtx.lineTo(0.5, 0);
        offCtx.lineTo(-0.5, 0);
        offCtx.closePath();
        offCtx.fill();

        offCtx.strokeStyle = 'rgba(255, 105, 180, 0.7)';
        offCtx.lineWidth = 0.8;
        offCtx.beginPath();
        offCtx.moveTo(-1.2, -16);
        offCtx.lineTo(-0.4, 0);
        offCtx.stroke();

        offCtx.fillStyle = '#b8860b';
        offCtx.strokeStyle = '#5c4008';
        offCtx.lineWidth = 0.8;
        offCtx.beginPath();
        offCtx.ellipse(0, -16, 5, 2, 0, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.stroke();

        const hiltH = 12;
        const hiltY = -16 - hiltH;

        offCtx.fillStyle = '#111111';
        offCtx.fillRect(-1.8, hiltY, 3.6, hiltH);

        offCtx.fillStyle = '#ff69b4';
        offCtx.beginPath();
        for (let d = 0; d < 3; d++) {
          const dy = hiltY + 1.5 + d * 3.5;
          offCtx.moveTo(0, dy);
          offCtx.lineTo(1.6, dy + 1.5);
          offCtx.lineTo(0, dy + 3);
          offCtx.lineTo(-1.6, dy + 1.5);
          offCtx.closePath();
        }
        offCtx.fill();

        offCtx.fillStyle = '#d4af37';
        offCtx.fillRect(-2, hiltY - 2, 4, 2);

        offCtx.restore();
      });

      // B. Draw Towering Cross Pillars & Chains onto Offscreen Canvas
      const crossPillars = [];
      const layout = [
        { dx: -arenaW * 0.38, dy:  arenaH * 0.25, tilt: -0.14 },
        { dx: -arenaW * 0.28, dy: -arenaH * 0.08, tilt:  0.00 },
        { dx: -arenaW * 0.14, dy: -arenaH * 0.34, tilt:  0.10 },
        { dx:  arenaW * 0.14, dy: -arenaH * 0.34, tilt:  0.00 },
        { dx:  arenaW * 0.28, dy: -arenaH * 0.08, tilt: -0.12 },
        { dx:  arenaW * 0.38, dy:  arenaH * 0.25, tilt:  0.00 }
      ];

      for (let p = 0; p < layout.length; p++) {
        const px = domX + layout[p].dx;
        const py = domY + layout[p].dy;

        const depth = py - domY; 
        const scale = 1.1 + ((depth + arenaH * 0.34) / (arenaH * 0.6)) * 2.4; 
        const tiltAngle = layout[p].tilt;

        crossPillars.push({ px, py, scale, seed: p, id: p, tiltAngle });
      }

      const chainConnections = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]
      ];

      offCtx.save();
      offCtx.lineCap = 'round';
      for (const [i1, i2] of chainConnections) {
        const p1 = crossPillars[i1];
        const p2 = crossPillars[i2];
        
        const attachX1 = p1.px - Math.sin(p1.tiltAngle) * (45 * p1.scale);
        const attachY1 = p1.py - Math.cos(p1.tiltAngle) * (45 * p1.scale);
        const attachX2 = p2.px - Math.sin(p2.tiltAngle) * (45 * p2.scale);
        const attachY2 = p2.py - Math.cos(p2.tiltAngle) * (45 * p2.scale);
        
        const dist = Math.hypot(attachX2 - attachX1, attachY2 - attachY1);
        const cpX = (attachX1 + attachX2) / 2;
        const cpY = (attachY1 + attachY2) / 2 + Math.min(120, dist * 0.32);

        offCtx.strokeStyle = '#050204';
        offCtx.lineWidth = Math.max(2, 3.5 * ((p1.scale + p2.scale) / 2));
        offCtx.beginPath();
        offCtx.moveTo(attachX1, attachY1);
        offCtx.quadraticCurveTo(cpX, cpY, attachX2, attachY2);
        offCtx.stroke();
        
        offCtx.strokeStyle = '#5a4d56';
        offCtx.lineWidth = Math.max(1.5, 2.5 * ((p1.scale + p2.scale) / 2));
        offCtx.setLineDash([5, 8]);
        offCtx.beginPath();
        offCtx.moveTo(attachX1, attachY1);
        offCtx.quadraticCurveTo(cpX, cpY, attachX2, attachY2);
        offCtx.stroke();
        offCtx.setLineDash([]);
      }
      offCtx.restore();

      crossPillars.sort((a, b) => a.py - b.py);

      const w = 10;
      const h = 55;
      const beamW = 34;
      const beamH = 8;
      const beamY = -h + 12;

      const pillarGrad = offCtx.createLinearGradient(-w/2, 0, w/2, 0);
      pillarGrad.addColorStop(0, '#110c14');
      pillarGrad.addColorStop(0.2, '#2e2233');
      pillarGrad.addColorStop(0.7, '#43344a');
      pillarGrad.addColorStop(1, '#1b1420');

      const beamGrad = offCtx.createLinearGradient(0, beamY, 0, beamY + beamH);
      beamGrad.addColorStop(0, '#43344a');
      beamGrad.addColorStop(0.5, '#2e2233');
      beamGrad.addColorStop(1, '#110c14');

      crossPillars.forEach(pillar => {
        offCtx.save();
        offCtx.translate(pillar.px, pillar.py);
        offCtx.rotate(pillar.tiltAngle);
        offCtx.scale(pillar.scale, pillar.scale);

        offCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        offCtx.beginPath();
        offCtx.ellipse(0, 2, w * 1.8, w * 0.65, 0, 0, Math.PI * 2);
        offCtx.fill();

        offCtx.strokeStyle = 'rgba(10, 3, 12, 0.85)';
        offCtx.lineWidth = 0.8;
        offCtx.beginPath();
        offCtx.moveTo(-w * 0.8, 1); offCtx.lineTo(-w * 1.9, 6);
        offCtx.moveTo(w * 0.8, 1); offCtx.lineTo(w * 1.9, 7);
        offCtx.moveTo(0, 2); offCtx.lineTo(0, 10);
        offCtx.stroke();

        offCtx.fillStyle = pillarGrad;
        offCtx.strokeStyle = '#050205';
        offCtx.lineWidth = 0.8;
        
        offCtx.beginPath();
        offCtx.rect(-w/2, -h, w, h + 2);
        offCtx.fill();
        offCtx.stroke();
        
        offCtx.fillStyle = beamGrad;
        offCtx.beginPath();
        offCtx.rect(-beamW/2, beamY, beamW, beamH);
        offCtx.fill();
        offCtx.stroke();

        offCtx.fillStyle = '#221828';
        offCtx.strokeStyle = '#0c0710';
        offCtx.lineWidth = 0.6;

        offCtx.beginPath();
        offCtx.moveTo(-w * 1.3, 2);
        offCtx.lineTo(-w * 0.6, -6);
        offCtx.lineTo(-w * 0.1, 2);
        offCtx.closePath();
        offCtx.fill();
        offCtx.stroke();

        offCtx.beginPath();
        offCtx.moveTo(0, 2);
        offCtx.lineTo(w * 0.65, -7);
        offCtx.lineTo(w * 1.3, 2);
        offCtx.closePath();
        offCtx.fill();
        offCtx.stroke();

        offCtx.fillStyle = '#3a2b42';
        offCtx.beginPath();
        offCtx.moveTo(-w * 0.45, 3);
        offCtx.lineTo(0, -3);
        offCtx.lineTo(w * 0.45, 3);
        offCtx.closePath();
        offCtx.fill();
        offCtx.stroke();

        offCtx.save();
        offCtx.beginPath();
        offCtx.rect(-w/2 + 0.5, -h + 0.5, w - 1, h);
        offCtx.rect(-beamW/2 + 0.5, beamY + 0.5, beamW - 1, beamH - 1);
        offCtx.clip();

        offCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        for(let i = 0; i < 8; i++) {
           const tx = (((pillar.seed * 7.1 + i * 3.3) * 13) % (w - 2)) - (w/2 - 1);
           const ty = -h + 4 + ((((pillar.seed * 2.3 + i * 4.1) * 17) % 1) * (h - 8));
           offCtx.fillRect(tx, ty, 1.2, 1.2);
        }

        const drawCrackPath = (offsetX, offsetY, color, width) => {
          offCtx.strokeStyle = color;
          offCtx.lineWidth = width;
          offCtx.lineCap = 'round';
          offCtx.lineJoin = 'miter';
          offCtx.beginPath();
          
          const seed = pillar.seed;
          const x = (Math.sin(seed * 4.1) * (w * 0.22)) + offsetX;
          const y = -h + 5 + offsetY;
          offCtx.moveTo(x, y);
          offCtx.lineTo(x + 1.8, y + 10);
          offCtx.lineTo(x - 1.8, y + 22);
          offCtx.lineTo(x + 1.2, y + 35);
          offCtx.lineTo(x - 1.0, y + 46);

          const bx = x - 1.8;
          const by = y + 22;
          offCtx.moveTo(bx, by);
          offCtx.lineTo(bx - 2.2, by + 10);
          offCtx.lineTo(bx - 0.8, by + 18);

          offCtx.moveTo(-beamW * 0.32 + offsetX, beamY + 1.5 + offsetY);
          offCtx.lineTo(-beamW * 0.24 + offsetX, beamY + 4.0 + offsetY);
          offCtx.lineTo(-beamW * 0.29 + offsetX, beamY + 6.5 + offsetY);

          offCtx.moveTo(beamW * 0.22 + offsetX, beamY + 1.5 + offsetY);
          offCtx.lineTo(beamW * 0.28 + offsetX, beamY + 4.5 + offsetY);
          offCtx.lineTo(beamW * 0.24 + offsetX, beamY + 6.5 + offsetY);

          offCtx.stroke();
        };

        drawCrackPath(0, 0, 'rgba(5, 2, 7, 0.95)', 0.8);
        drawCrackPath(0.4, 0.4, 'rgba(190, 170, 210, 0.3)', 0.5);

        offCtx.restore();
        offCtx.restore();
      });
    }

    if (fighter._cachedSwordsCanvas) {
      ctx.drawImage(fighter._cachedSwordsCanvas, 0, 0);
    }

    // ── DOMAIN CLASH RIFT: Enhanced energy crackle when clashing with Sukuna ──
    if (fighter.domainActive && isMultiDomain) {
      _renderYutaDomainClashEnergy(fighter, ctx, domX, domY, domainRadius, time, alphaMult);
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders the dramatic domain clash rift overlay when both Yuta and Sukuna domains are active.
 * Called from main.js after both domain backgrounds are drawn.
 * Features: crackling dual-colored cursed energy lightning arcs bridging the two domains,
 * a glowing rift seam, and floating clash particles (dark rose petals vs crimson embers).
 */
export function renderYutaSukunaDomainClashRift(ctx, yutaFighter, sukunaFighter) {
  if (!yutaFighter || !sukunaFighter || !yutaFighter.domainActive || !sukunaFighter.domainActive) return;

  // Check if we should execute in optimized low quality/low FPS mode
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 45)));

  const time = Date.now();
  const arena = CONFIG.arena;
  const centerX = arena ? (arena.x + arena.width / 2) : yutaFighter.x;
  const centerY = arena ? (arena.y + arena.height / 2) : yutaFighter.y;
  const arenaW = arena ? arena.width : 800;
  const arenaH = arena ? arena.height : 600;

  const yDomX = yutaFighter.domainX !== undefined ? yutaFighter.domainX : yutaFighter.x;
  const yDomY = yutaFighter.domainY !== undefined ? yutaFighter.domainY : yutaFighter.y;
  const sDomX = sukunaFighter.domainX !== undefined ? sukunaFighter.domainX : sukunaFighter.x;
  const sDomY = sukunaFighter.domainY !== undefined ? sukunaFighter.domainY : sukunaFighter.y;

  // Rift seam runs perpendicular to the line between domain centers
  const midX = (yDomX + sDomX) / 2;
  const midY = (yDomY + sDomY) / 2;
  const domAngle = Math.atan2(sDomY - yDomY, sDomX - yDomX);
  const riftAngle = domAngle + Math.PI / 2;

  ctx.save();

  // ── 1. DOMAIN CLASH RIFT SEAM — Glowing fracture line between the two domains ──
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const riftLen = Math.max(arenaW, arenaH) * 0.7;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(riftAngle);

  if (isLowQuality) {
    // Fast path: draw a simple, semi-transparent flat-color glow block to avoid CPU gradient allocations
    ctx.fillStyle = `rgba(255, 20, 147, ${0.15 + Math.sin(time / 200) * 0.05})`;
    ctx.fillRect(-riftLen / 2, -10, riftLen, 20);
  } else {
    // Broad atmospheric glow under the rift
    const riftGlow = ctx.createLinearGradient(
      midX + Math.cos(riftAngle) * (-riftLen / 2),
      midY + Math.sin(riftAngle) * (-riftLen / 2),
      midX + Math.cos(riftAngle) * (riftLen / 2),
      midY + Math.sin(riftAngle) * (riftLen / 2)
    );
    riftGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    riftGlow.addColorStop(0.3, `rgba(255, 20, 147, ${0.12 + Math.sin(time / 200) * 0.04})`);
    riftGlow.addColorStop(0.5, `rgba(255, 255, 255, ${0.18 + Math.sin(time / 150) * 0.06})`);
    riftGlow.addColorStop(0.7, `rgba(220, 20, 60, ${0.12 + Math.sin(time / 200 + 1) * 0.04})`);
    riftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = riftGlow;
    ctx.fillRect(-riftLen / 2, -30, riftLen, 60);
  }
  ctx.restore();

  // Core rift crack line removed (resolved wiggling worm in arena)

  ctx.restore();

  // Crackling lightning arcs removed (resolved wiggling worms in arena)

  // ── 3. FLOATING CLASH PARTICLES — Rose Petals (Yuta) vs Crimson Embers (Sukuna) ──
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const particleCount = isLowQuality ? 4 : 8; // Fewer particles in low quality/low FPS mode
  for (let p = 0; p < particleCount; p++) {
    const seed = p * 7.3 + 1.1;
    const isYutaSide = (p % 2 === 0);

    // Orbit around the rift seam
    const orbitT = (p / particleCount - 0.5);
    const orbitDist = 15 + Math.sin(time * 0.002 + seed) * 35;
    const baseX = midX + Math.cos(riftAngle) * orbitT * riftLen * 0.7;
    const baseY = midY + Math.sin(riftAngle) * orbitT * riftLen * 0.7;
    const px = baseX + Math.cos(domAngle + Math.sin(time * 0.003 + seed) * 0.5) * orbitDist * (isYutaSide ? -1 : 1);
    const py = baseY + Math.sin(domAngle + Math.cos(time * 0.003 + seed) * 0.5) * orbitDist * (isYutaSide ? -1 : 1);
    const pAlpha = 0.5 + Math.sin(time * 0.004 + seed * 2) * 0.3;
    const pSize = 2 + Math.sin(time * 0.003 + seed) * 1.5;

    ctx.fillStyle = isYutaSide ? `rgba(255, 105, 180, ${pAlpha})` : `rgba(255, 40, 40, ${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 4. RIKA CURSED ENERGY DOMAIN SURGE AURA ──
  // When Rika is active during domain clash, render a surging spectral aura at her position
  if (yutaFighter.rika && yutaFighter.rika.active && (yutaFighter.rikaAlpha || 0) > 0.2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rk = yutaFighter.rika;
    const surgeRadius = (rk.r || 30) * 3.5 + Math.sin(time / 200) * 15;
    const surgeAlpha = 0.18 + Math.sin(time / 180) * 0.08;

    // Fixed: Included 'playing' state to correctly use flat circle pathing during battles instead of creating radial gradients every frame
    const isGamePlay = (typeof state !== 'undefined' && ['playing', 'fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
    if (isGamePlay || isLowQuality) {
      ctx.fillStyle = `rgba(255, 20, 147, ${surgeAlpha * 1.2})`;
    } else {
      const surgeGrad = ctx.createRadialGradient(rk.x, rk.y, 0, rk.x, rk.y, surgeRadius);
      surgeGrad.addColorStop(0, `rgba(255, 20, 147, ${surgeAlpha * 1.5})`);
      surgeGrad.addColorStop(0.3, `rgba(138, 43, 226, ${surgeAlpha})`);
      surgeGrad.addColorStop(0.6, `rgba(75, 0, 130, ${surgeAlpha * 0.5})`);
      surgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = surgeGrad;
    }
    ctx.beginPath();
    ctx.arc(rk.x, rk.y, surgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Flickering monstrous energy tendrils radiating outward from Rika (completely skipped in low quality to save rendering time)
    if (!isLowQuality) {
      ctx.strokeStyle = `rgba(255, 20, 147, ${surgeAlpha * 2})`;
      ctx.lineWidth = 1.5;
      for (let t = 0; t < 4; t++) {
        const tAngle = (t / 4) * Math.PI * 2 + time * 0.002;
        const tLen = surgeRadius * (0.6 + Math.sin(time * 0.005 + t * 2) * 0.3);
        ctx.beginPath();
        ctx.moveTo(rk.x, rk.y);
        const cpx = rk.x + Math.cos(tAngle + 0.3) * tLen * 0.5;
        const cpy = rk.y + Math.sin(tAngle + 0.3) * tLen * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, rk.x + Math.cos(tAngle) * tLen, rk.y + Math.sin(tAngle) * tLen);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

// ── INTERNAL: Draw a jagged lightning bolt between two points ──
function _drawLightningBolt(ctx, x1, y1, x2, y2, segments, seed) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const dx = x2 - x1;
  const dy = y2 - y1;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitter = (Math.sin(seed * 0.01 + i * 5.7) * 8);
    const px = x1 + dx * t + Math.cos(Math.atan2(dy, dx) + Math.PI / 2) * jitter;
    const py = y1 + dy * t + Math.sin(Math.atan2(dy, dx) + Math.PI / 2) * jitter;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ── INTERNAL: Render enhanced energy crackle on Yuta's domain side during domain clash ──
function _renderYutaDomainClashEnergy(fighter, ctx, domX, domY, domainRadius, time, alphaMult) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Pulsing pink energy border around Yuta's domain zone
  const borderPulse = 0.35 + Math.sin(time / 250) * 0.15;
  ctx.strokeStyle = `rgba(255, 20, 147, ${borderPulse * alphaMult})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(domX, domY, domainRadius + 80, 0, Math.PI * 2);
  ctx.stroke();

  // Flickering inner energy border
  ctx.strokeStyle = `rgba(138, 43, 226, ${borderPulse * 0.6 * alphaMult})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(domX, domY, domainRadius + 60, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
