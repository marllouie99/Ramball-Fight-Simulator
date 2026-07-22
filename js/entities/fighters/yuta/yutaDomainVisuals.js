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

  ctx.save();

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

    // ── 3. INFINITE FIELD OF GROUND-PIERCED KATANAS (Hardware Accelerated Canvas Cache) ──
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

    // ── 4. TOWERING CROSS PILLARS ──
    ctx.save();
    const layout = [
      { dx: -arenaW * 0.38, dy:  arenaH * 0.25, tilt: -0.14 },
      { dx: -arenaW * 0.28, dy: -arenaH * 0.08, tilt:  0.00 },
      { dx: -arenaW * 0.14, dy: -arenaH * 0.34, tilt:  0.10 },
      { dx:  arenaW * 0.14, dy: -arenaH * 0.34, tilt:  0.00 },
      { dx:  arenaW * 0.28, dy: -arenaH * 0.08, tilt: -0.10 },
      { dx:  arenaW * 0.38, dy:  arenaH * 0.25, tilt:  0.14 }
    ];

    layout.forEach(p => {
      const px = domX + p.dx;
      const py = domY + p.dy;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.tilt);

      ctx.fillStyle = '#0a0306';
      ctx.beginPath();
      ctx.ellipse(0, 10, 32, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1c1719';
      ctx.strokeStyle = '#050304';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 5, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const pillarH = 260;
      const pillarW = 20;

      const pGrad = ctx.createLinearGradient(-pillarW / 2, 0, pillarW / 2, 0);
      pGrad.addColorStop(0, '#42373c');
      pGrad.addColorStop(0.25, '#292225');
      pGrad.addColorStop(0.7, '#151113');
      pGrad.addColorStop(1, '#090708');

      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(-pillarW / 2, -pillarH, pillarW, pillarH);
      ctx.strokeRect(-pillarW / 2, -pillarH, pillarW, pillarH);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(-pillarW / 2 + 2, -pillarH, 3, pillarH);

      const crossY = -pillarH * 0.72;
      const armL = 58;
      const armH = 18;

      const armGrad = ctx.createLinearGradient(0, crossY - armH / 2, 0, crossY + armH / 2);
      armGrad.addColorStop(0, '#382e32');
      armGrad.addColorStop(0.5, '#221b1e');
      armGrad.addColorStop(1, '#100c0e');

      ctx.fillStyle = armGrad;
      ctx.fillRect(-armL / 2, crossY - armH / 2, armL, armH);
      ctx.strokeRect(-armL / 2, crossY - armH / 2, armL, armH);

      ctx.fillStyle = '#0f080a';
      ctx.fillRect(-pillarW / 2 - 2, crossY - armH / 2 - 2, pillarW + 4, armH + 4);
      ctx.strokeRect(-pillarW / 2 - 2, crossY - armH / 2 - 2, pillarW + 4, armH + 4);

      ctx.restore();
    });

    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}
