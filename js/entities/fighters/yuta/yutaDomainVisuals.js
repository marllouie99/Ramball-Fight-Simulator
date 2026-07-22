// ─────────────────────────────────────────────
// YUTA OKKOTSU DOMAIN EXPANSION (AUTHENTIC MUTUAL LOVE) VISUAL RENDERER
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';

export function renderYutaDomainBackground(fighter, ctx, isClashSecondary = false) {
  const isRikaVisible = (fighter.rika && (fighter.rika.active || (fighter.rikaAlpha && fighter.rikaAlpha > 0.05)));
  if (!fighter.domainActive && !isRikaVisible) return;

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

  ctx.save();

  // ── 1. DARK ATMOSPHERIC VOID & ROSY AMBIENT GLOW ──
  if (!isClashSecondary) {
    const bgGrad = ctx.createRadialGradient(midX, midY, 40, midX, midY, 650);
    bgGrad.addColorStop(0, `rgba(55, 10, 32, ${(0.65 + pulse) * alphaMult})`);   // Dark rose core
    bgGrad.addColorStop(0.35, `rgba(28, 6, 18, ${(0.78 + pulse) * alphaMult})`); // Deep magenta-black
    bgGrad.addColorStop(0.75, `rgba(12, 3, 9, ${(0.88 + pulse) * alphaMult})`);  // Charcoal void
    bgGrad.addColorStop(1, `rgba(4, 1, 4, ${(0.95 + pulse) * alphaMult})`);      // Deep black outer edge

    ctx.fillStyle = bgGrad;
    ctx.fillRect(midX - 1000, midY - 1000, 2000, 2000);
  }

  if (fighter.domainActive) {
    // ── 2. DARK ATMOSPHERIC VORTEX ──
    ctx.save();
    ctx.globalAlpha = (0.6 + pulse * 2) * alphaMult;
    
    const vortexGradient = ctx.createRadialGradient(domX, domY - arenaH * 0.45, 50, domX, domY - arenaH * 0.45, 600);
    vortexGradient.addColorStop(0, '#000000');
    vortexGradient.addColorStop(0.2, '#0c0207');
    vortexGradient.addColorStop(0.6, 'rgba(20, 5, 15, 0.6)');
    vortexGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = vortexGradient;
    ctx.beginPath();
    ctx.arc(domX, domY - arenaH * 0.45, 600, 0, Math.PI * 2);
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

    // ── 3. INFINITE FIELD OF GROUND-PIERCED KATANAS (Offscreen Canvas Cache) ──
    ctx.save();
    
    const cacheKey = `${arenaW}_${arenaH}_${domX}_${domY}`;
    if (!fighter._cachedSwordsCanvas || fighter._cachedSwordsKey !== cacheKey) {
      fighter._cachedSwordsKey = cacheKey;
      const cvsW = (typeof state !== 'undefined' && state.canvas && state.canvas.width) ? state.canvas.width : 1200;
      const cvsH = (typeof state !== 'undefined' && state.canvas && state.canvas.height) ? state.canvas.height : 900;
      
      fighter._cachedSwordsCanvas = document.createElement('canvas');
      fighter._cachedSwordsCanvas.width = cvsW;
      fighter._cachedSwordsCanvas.height = cvsH;
      const offCtx = fighter._cachedSwordsCanvas.getContext('2d');

      const pillarLayout = [
        { dx: -arenaW * 0.38, dy:  arenaH * 0.25 },
        { dx: -arenaW * 0.28, dy: -arenaH * 0.08 },
        { dx: -arenaW * 0.14, dy: -arenaH * 0.34 },
        { dx:  arenaW * 0.14, dy: -arenaH * 0.34 },
        { dx:  arenaW * 0.28, dy: -arenaH * 0.08 },
        { dx:  arenaW * 0.38, dy:  arenaH * 0.25 }
      ];

      const swords = [];
      const rows = 6;
      const cols = 6;
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
    }

    if (fighter._cachedSwordsCanvas) {
      ctx.drawImage(fighter._cachedSwordsCanvas, 0, 0);
    }

    ctx.restore();

    // ── 4. TOWERING CROSS PILLARS & DROOPING METALLIC CHAINS ──
    ctx.save();
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

    // Continuous chain connecting sequentially from left to right along the horseshoe arch
    const chainConnections = [
      [0, 1], // Lower-left to Mid-left
      [1, 2], // Mid-left to Top-left
      [2, 3], // Top-left to Top-right (drapes across the top)
      [3, 4], // Top-right to Mid-right
      [4, 5]  // Mid-right to Lower-right
    ];

    // Draw Chains between pillars BEFORE sorting, so chains render behind pillar bodies
    ctx.save();
    ctx.lineCap = 'round';
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

      // Base dark shadow chain
      ctx.strokeStyle = '#050204';
      ctx.lineWidth = Math.max(2, 3.5 * ((p1.scale + p2.scale) / 2));
      ctx.beginPath();
      ctx.moveTo(attachX1, attachY1);
      ctx.quadraticCurveTo(cpX, cpY, attachX2, attachY2);
      ctx.stroke();
      
      // Chain links (dashed metallic)
      ctx.strokeStyle = '#5a4d56';
      ctx.lineWidth = Math.max(1.5, 2.5 * ((p1.scale + p2.scale) / 2));
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.moveTo(attachX1, attachY1);
      ctx.quadraticCurveTo(cpX, cpY, attachX2, attachY2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Sort pillars by depth (Y) so foreground pillars overlap background elements
    crossPillars.sort((a, b) => a.py - b.py);

    const w = 10;
    const h = 55;
    const beamW = 34;
    const beamH = 8;
    const beamY = -h + 12;

    const pillarGrad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    pillarGrad.addColorStop(0, '#110c14');
    pillarGrad.addColorStop(0.2, '#2e2233');
    pillarGrad.addColorStop(0.7, '#43344a');
    pillarGrad.addColorStop(1, '#1b1420');

    const beamGrad = ctx.createLinearGradient(0, beamY, 0, beamY + beamH);
    beamGrad.addColorStop(0, '#43344a');
    beamGrad.addColorStop(0.5, '#2e2233');
    beamGrad.addColorStop(1, '#110c14');

    crossPillars.forEach(pillar => {
      ctx.save();
      ctx.translate(pillar.px, pillar.py);
      ctx.rotate(pillar.tiltAngle);
      ctx.scale(pillar.scale, pillar.scale);

      // Ground shadow & impact crater at pillar base to ground the pillar firmly into earth
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.ellipse(0, 2, w * 1.8, w * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Radiating ground cracks around pillar base
      ctx.strokeStyle = 'rgba(10, 3, 12, 0.85)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-w * 0.8, 1); ctx.lineTo(-w * 1.9, 6);
      ctx.moveTo(w * 0.8, 1); ctx.lineTo(w * 1.9, 7);
      ctx.moveTo(0, 2); ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.restore();

      // Draw vertical pillar body
      ctx.fillStyle = pillarGrad;
      ctx.strokeStyle = '#050205';
      ctx.lineWidth = 0.8;
      
      ctx.beginPath();
      ctx.rect(-w/2, -h, w, h + 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.rect(-beamW/2, beamY, beamW, beamH);
      ctx.fill();
      ctx.stroke();

      // Stone Rubble & Debris Mound piled around pillar base (roots pillar into ground)
      ctx.fillStyle = '#221828';
      ctx.strokeStyle = '#0c0710';
      ctx.lineWidth = 0.6;

      ctx.beginPath();
      ctx.moveTo(-w * 1.3, 2);
      ctx.lineTo(-w * 0.6, -6);
      ctx.lineTo(-w * 0.1, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(w * 0.65, -7);
      ctx.lineTo(w * 1.3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3a2b42';
      ctx.beginPath();
      ctx.moveTo(-w * 0.45, 3);
      ctx.lineTo(0, -3);
      ctx.lineTo(w * 0.45, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stone Textures & Detailed Jagged Cracks (Clipped strictly inside pillar stone)
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w/2 + 0.5, -h + 0.5, w - 1, h);
      ctx.rect(-beamW/2 + 0.5, beamY + 0.5, beamW - 1, beamH - 1);
      ctx.clip();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for(let i = 0; i < 8; i++) {
         const tx = (((pillar.seed * 7.1 + i * 3.3) * 13) % (w - 2)) - (w/2 - 1);
         const ty = -h + 4 + ((((pillar.seed * 2.3 + i * 4.1) * 17) % 1) * (h - 8));
         ctx.fillRect(tx, ty, 1.2, 1.2);
      }

      const drawCrackPath = (offsetX, offsetY, color, width) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        
        const seed = pillar.seed;
        const x = (Math.sin(seed * 4.1) * (w * 0.22)) + offsetX;
        const y = -h + 5 + offsetY;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 1.8, y + 10);
        ctx.lineTo(x - 1.8, y + 22);
        ctx.lineTo(x + 1.2, y + 35);
        ctx.lineTo(x - 1.0, y + 46);

        const bx = x - 1.8;
        const by = y + 22;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 2.2, by + 10);
        ctx.lineTo(bx - 0.8, by + 18);

        ctx.moveTo(-beamW * 0.32 + offsetX, beamY + 1.5 + offsetY);
        ctx.lineTo(-beamW * 0.24 + offsetX, beamY + 4.0 + offsetY);
        ctx.lineTo(-beamW * 0.29 + offsetX, beamY + 6.5 + offsetY);

        ctx.moveTo(beamW * 0.22 + offsetX, beamY + 1.5 + offsetY);
        ctx.lineTo(beamW * 0.28 + offsetX, beamY + 4.5 + offsetY);
        ctx.lineTo(beamW * 0.24 + offsetX, beamY + 6.5 + offsetY);

        ctx.stroke();
      };

      drawCrackPath(0, 0, 'rgba(5, 2, 7, 0.95)', 0.8);
      drawCrackPath(0.4, 0.4, 'rgba(190, 170, 210, 0.3)', 0.5);

      ctx.restore();
      ctx.restore();
    });

    ctx.restore();

    // ── 5. ATMOSPHERIC FLOATING PETALS ──
    ctx.save();
    for (let p = 0; p < 16; p++) {
      const px = domX + Math.sin(time * 0.0006 + p * 1.7) * (domainRadius * 0.85);
      const py = domY + Math.cos(time * 0.0005 + p * 2.3) * (domainRadius * 0.85);
      const pAlpha = 0.25 + Math.sin(time * 0.002 + p) * 0.15;

      ctx.fillStyle = `rgba(255, 182, 193, ${pAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}
