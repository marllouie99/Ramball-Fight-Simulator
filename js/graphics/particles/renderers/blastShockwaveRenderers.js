// ─────────────────────────────────────────────
// BLAST & SHOCKWAVE RENDERERS
// High-draw visual effects for impact rings, blasts, and shockwaves
// ─────────────────────────────────────────────
import { state } from '../../../core/state.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function drawMeleeClashShockwave(ctx, effect) {
  if (effect.isFlash) {
    // ── Pixel Art Flash variant ──
    if (effect.targetSize) {
      effect.size += (effect.targetSize - effect.size) * 0.15;
    }
    const isGojo = effect.clashType === 'gojo' || effect.clashType === 'gojo_infinity';
    const isMahoraga = effect.clashType === 'mahoraga' || effect.clashType === 'gold';
    const isHex = typeof effect.clashType === 'string' && effect.clashType.startsWith('#');
    const P = 2.5;
    const snap = (v) => Math.round(v / P) * P;
    const radius = Math.max(P * 2, effect.size);
    const steps = Math.max(28, Math.min(56, Math.round((Math.PI * 2 * radius) / (P * 1.5))));
    const alpha = Math.min(1.0, effect.life * 1.15);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    let ringColor;
    let midColor;
    if (isGojo) {
      ringColor = `rgba(0, 229, 255, ${(alpha * 0.95).toFixed(3)})`;
      midColor = `rgba(180, 245, 255, ${(alpha * 0.90).toFixed(3)})`;
    } else if (isMahoraga) {
      ringColor = `rgba(255, 215, 0, ${(alpha * 0.95).toFixed(3)})`;
      midColor = `rgba(255, 245, 150, ${(alpha * 0.90).toFixed(3)})`;
    } else if (isHex) {
      const rgb = hexToRgb(effect.clashType) || '255, 60, 60';
      ringColor = `rgba(${rgb}, ${(alpha * 0.95).toFixed(3)})`;
      midColor = `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(3)})`;
    } else {
      ringColor = `rgba(255, 60, 60, ${(alpha * 0.95).toFixed(3)})`;
      midColor = `rgba(255, 150, 150, ${(alpha * 0.85).toFixed(3)})`;
    }

    const colBorder = `rgba(8, 18, 32, ${(alpha * 0.90).toFixed(3)})`;
    const colCore = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;

    for (let st = 0; st < steps; st++) {
      const ang = (st / steps) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      const r0 = snap(radius);
      ctx.fillStyle = colBorder;
      ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

      ctx.fillStyle = ringColor;
      ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

      const r1 = snap(radius * 0.75);
      ctx.fillStyle = midColor;
      ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

      const r2 = snap(radius * 0.45);
      ctx.fillStyle = colCore;
      ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
    }
    ctx.restore();
    return;
  }

  // ── Expanding ground shockwave ring for Sukuna-Gojo & Sukuna-Yuta/Rika clashes & Mahoraga teleports ──
  effect.size += (effect.targetSize - effect.size) * 0.08;
  const isYutaClash = (effect.clashType === 'yuta');
  const isTojiClash = (effect.clashType === 'toji');
  const isMahoragaClash = (effect.clashType === 'mahoraga');
  const isTodoClap = (effect.clashType === 'todo');
  const isGenosClash = (effect.clashType === 'genos' || effect.clashType === 'orange');
  const isInfinityClash = (effect.clashType === 'gojo_infinity');

  const isDark = _isDarkMode();

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = isDark 
    ? `rgba(0, 0, 0, 0)` 
    : (isTodoClap ? `rgba(0, 40, 80, ${effect.life * 0.45})` : (isYutaClash ? `rgba(0, 0, 0, 0)` : (isTojiClash ? `rgba(0, 0, 0, 0)` : (isGenosClash ? `rgba(0, 0, 0, 0)` : (isInfinityClash ? `rgba(0, 0, 0, 0)` : (isMahoragaClash ? `rgba(0, 0, 0, 0)` : `rgba(30, 10, 40, ${effect.life * 0.4})`))))));
  if (!isMahoragaClash) {
    ctx.beginPath();
    ctx.ellipse(effect.x, effect.y + 5, effect.size * 1.1, effect.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'lighter';

  if (isTodoClap) {
    ctx.strokeStyle = `rgba(0, 240, 255, ${effect.life * 0.95})`;
    ctx.lineWidth = 10 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size * 1.1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 150, 255, ${effect.life * 0.90})`;
    ctx.lineWidth = 6 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
    ctx.lineWidth = 4 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size * 0.40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 240, 255, ${effect.life * 0.85})`;
    ctx.lineWidth = 2.5 * effect.life;
    for (let i = 0; i < 6; i++) {
      const rayAngle = (Math.PI / 3) * i;
      const r1 = effect.size * 0.3;
      const r2 = effect.size * 1.2;
      ctx.beginPath();
      ctx.moveTo(effect.x + Math.cos(rayAngle) * r1, effect.y + Math.sin(rayAngle) * r1);
      ctx.lineTo(effect.x + Math.cos(rayAngle) * r2, effect.y + Math.sin(rayAngle) * r2);
      ctx.stroke();
    }
  } else if (isGenosClash) {
    if (isDark) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const P = 2.0;
      const snap = (v) => Math.round(v / P) * P;
      const steps = 36;

      for (let st = 0; st < steps; st++) {
        const ang = (st / steps) * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);

        const r0 = snap(effect.size);
        ctx.fillStyle = '#150500';
        ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

        ctx.fillStyle = '#FF5500';
        ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

        const r1 = snap(effect.size * 0.75);
        ctx.fillStyle = '#FFE600';
        ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

        const r2 = snap(effect.size * 0.45);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = `rgba(255, 60, 0, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 170, 0, ${effect.life * 0.90})`;
      ctx.lineWidth = 7 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 245, 200, ${effect.life * 0.98})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (isMahoragaClash) {
    if (isDark) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const P = 2.0;
      const snap = (v) => Math.round(v / P) * P;
      const radius = Math.max(P * 2, effect.size);
      const steps = Math.max(32, Math.round((Math.PI * 2 * radius) / P));

      const alpha = Math.min(1.0, effect.life * 1.25);
      const colBorder = `rgba(15, 12, 0, ${(alpha * 0.85).toFixed(3)})`;
      const colOuter = `rgba(255, 215, 0, ${(alpha * 0.95).toFixed(3)})`;
      const colMid = `rgba(255, 245, 150, ${(alpha * 0.90).toFixed(3)})`;
      const colCore = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;

      for (let st = 0; st < steps; st++) {
        const ang = (st / steps) * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);

        const r0 = snap(radius);
        ctx.fillStyle = colBorder;
        ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

        ctx.fillStyle = colOuter;
        ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

        const r1 = snap(radius * 0.75);
        ctx.fillStyle = colMid;
        ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

        const r2 = snap(radius * 0.45);
        ctx.fillStyle = colCore;
        ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 235, 120, ${effect.life * 0.90})`;
      ctx.lineWidth = 7 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.75), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.45), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (isYutaClash) {
    if (isDark) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(230, 240, 255, ${effect.life * 0.90})`;
      ctx.lineWidth = 8 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(138, 43, 226, ${effect.life * 0.9})`;
      ctx.lineWidth = 15 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.98})`;
      ctx.lineWidth = 11 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 30, 60, ${effect.life * 0.95})`;
      ctx.lineWidth = 8 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.rotate(Math.PI / 4 + (1 - effect.life) * 0.2);
    const slashLen = effect.size * 0.75;
    
    ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${effect.life * 0.7})` : `rgba(255, 30, 60, ${effect.life * 0.7})`;
    ctx.lineWidth = 7 * effect.life;
    ctx.beginPath();
    ctx.moveTo(-slashLen, 0); ctx.lineTo(slashLen, 0);
    ctx.moveTo(0, -slashLen); ctx.lineTo(0, slashLen);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
    ctx.lineWidth = 3.5 * effect.life;
    ctx.beginPath();
    ctx.moveTo(-slashLen, 0); ctx.lineTo(slashLen, 0);
    ctx.moveTo(0, -slashLen); ctx.lineTo(0, slashLen);
    ctx.stroke();
    ctx.restore();
  } else if (isInfinityClash) {
    if (isDark) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const P = 2.5;
      const snap = (v) => Math.round(v / P) * P;
      const radius = Math.max(P * 2, effect.size);
      const steps = Math.max(28, Math.min(56, Math.round((Math.PI * 2 * radius) / (P * 1.5))));
      const alpha = Math.min(1.0, effect.life * 1.15);

      const colBorder = `rgba(8, 18, 32, ${(alpha * 0.90).toFixed(3)})`;
      const colOuter = `rgba(0, 229, 255, ${(alpha * 0.95).toFixed(3)})`;
      const colMid = `rgba(180, 245, 255, ${(alpha * 0.90).toFixed(3)})`;
      const colCore = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;

      for (let st = 0; st < steps; st++) {
        const ang = (st / steps) * Math.PI * 2;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);

        const r0 = snap(radius);
        ctx.fillStyle = colBorder;
        ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

        ctx.fillStyle = colOuter;
        ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

        const r1 = snap(radius * 0.75);
        ctx.fillStyle = colMid;
        ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

        const r2 = snap(radius * 0.45);
        ctx.fillStyle = colCore;
        ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = `rgba(8, 18, 32, ${effect.life * 0.90})`;
      ctx.lineWidth = 14 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(0, 229, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = 8 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(180, 245, 255, ${effect.life * 0.90})`;
      ctx.lineWidth = 5 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.75), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = 3.5 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.45), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (isTojiClash) {
    if (isDark) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(230, 240, 255, ${effect.life * 0.90})`;
      ctx.lineWidth = 7 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.50, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(45, 50, 55, ${effect.life * 0.8})`;
      ctx.lineWidth = 18 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(160, 80, 240, ${effect.life * 0.85})`;
      ctx.lineWidth = 10 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(250, 252, 255, ${effect.life * 0.9})`;
      ctx.lineWidth = 6 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    const isHex = typeof effect.clashType === 'string' && effect.clashType.startsWith('#');
    if (isDark) {
      if (isHex) {
        const rgb = hexToRgb(effect.clashType) || '255, 255, 255';
        ctx.strokeStyle = `rgba(${rgb}, ${effect.life * 0.95})`;
        ctx.lineWidth = 10 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.90})`;
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
        ctx.lineWidth = 3.5 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
        ctx.lineWidth = 10 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(240, 245, 255, ${effect.life * 0.90})`;
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
        ctx.lineWidth = 3.5 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (isHex) {
      const rgb = hexToRgb(effect.clashType) || '255, 50, 80';
      ctx.strokeStyle = `rgba(${rgb}, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${rgb}, ${effect.life * 0.85})`;
      ctx.lineWidth = 7 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = 3.5 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(60, 0, 80, ${effect.life * 0.9})`;
      ctx.lineWidth = 14 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(180, 60, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 10 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(255, 50, 80, ${effect.life * 0.95})`;
      ctx.lineWidth = 8 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(40, 40, 40, ${effect.life * 0.8})`;
      ctx.lineWidth = 5 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(255, 240, 240, ${effect.life * 0.9})`;
      ctx.lineWidth = 3 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = 'source-over';
}

export function drawMahoragaShoutShockwave(ctx, effect) {
  if (effect.isFlash) {
    if (effect.targetSize) {
      effect.size += (effect.targetSize - effect.size) * 0.16;
    }
    ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * 0.85})`;
    ctx.lineWidth = 7 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(224, 232, 255, ${effect.life * 0.9})`;
    ctx.lineWidth = 3 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.95), 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  effect.size += (effect.targetSize - effect.size) * 0.18;
  const isDark = _isDarkMode();
  
  ctx.save();
  if (isDark) {
    ctx.imageSmoothingEnabled = false;
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;
    const radius = Math.max(P * 2, effect.size);
    const steps = Math.max(36, Math.round((Math.PI * 2 * radius) / P));

    const alpha = Math.min(1.0, effect.life * 1.25);
    const colBorder = `rgba(15, 12, 0, ${(alpha * 0.85).toFixed(3)})`;
    const colOuter = `rgba(255, 215, 0, ${(alpha * 0.95).toFixed(3)})`;
    const colMid = `rgba(255, 245, 150, ${(alpha * 0.90).toFixed(3)})`;
    const colCore = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;

    for (let st = 0; st < steps; st++) {
      const ang = (st / steps) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      const r0 = snap(radius);
      ctx.fillStyle = colBorder;
      ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

      ctx.fillStyle = colOuter;
      ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

      const r1 = snap(radius * 0.75);
      ctx.fillStyle = colMid;
      ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

      const r2 = snap(radius * 0.45);
      ctx.fillStyle = colCore;
      ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
    }
  } else {
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * 0.95})`;
    ctx.lineWidth = 12 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(224, 232, 255, ${effect.life * 0.8})`;
    ctx.lineWidth = 6 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.82), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
    ctx.lineWidth = 4 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.65), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

export function drawRikaRoarShockwave(ctx, effect) {
  if (effect.isFlash) {
    if (effect.targetSize) {
      effect.size += (effect.targetSize - effect.size) * 0.16;
    }
    const isDark = _isDarkMode();
    if (isDark) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 6 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(235, 245, 255, ${effect.life * 0.90})`;
      ctx.lineWidth = 2.5 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.94), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd', 'matchEnd', 'playing'].includes(state.gameState));
      if (isGamePlay) {
        ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.85})`;
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
        ctx.lineWidth = 2.5 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.94), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.85})`;
        ctx.lineWidth = 7 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(10, 2, 5, ${effect.life * 0.9})`;
        ctx.lineWidth = 3 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.95), 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 240, 245, ${effect.life * 0.95})`;
        ctx.lineWidth = 2 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.92), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    return;
  }

  effect.size += (effect.targetSize - effect.size) * 0.18;
  const isDark = _isDarkMode();
  
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (isDark) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
    ctx.lineWidth = 9 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(235, 245, 255, ${effect.life * 0.90})`;
    ctx.lineWidth = 4 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.75), 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.95})`;
    ctx.lineWidth = 9 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
    ctx.lineWidth = 4 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.75), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

export function drawPurpleShockwaveRing(ctx, effect) {
  effect.size += (effect.targetSize - effect.size) * 0.22;
  const alpha = Math.min(1.0, effect.life * 1.25);
  const isDark = _isDarkMode();

  ctx.save();
  if (isDark) {
    ctx.imageSmoothingEnabled = false;
    const P = 2.5;
    const snap = (v) => Math.round(v / P) * P;
    const radius = Math.max(P * 2, effect.size);
    const steps = Math.max(28, Math.min(60, Math.round((Math.PI * 2 * radius) / (P * 1.5))));

    const colBorder = `rgba(10, 0, 20, ${(alpha * 0.90).toFixed(3)})`;
    const colOuter = effect.color || `rgba(191, 90, 242, ${(alpha * 0.95).toFixed(3)})`;
    const colMid = `rgba(233, 213, 255, ${(alpha * 0.88).toFixed(3)})`;
    const colCore = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;

    for (let st = 0; st < steps; st++) {
      const ang = (st / steps) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      const r0 = snap(radius);
      ctx.fillStyle = colBorder;
      ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

      ctx.fillStyle = colOuter;
      ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

      const r1 = snap(radius * 0.78);
      ctx.fillStyle = colMid;
      ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

      const r2 = snap(radius * 0.50);
      ctx.fillStyle = colCore;
      ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
    }
  } else {
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = effect.color || `rgba(191, 90, 242, ${(alpha * 0.95).toFixed(3)})`;
    ctx.lineWidth = (effect.is200 ? 7.0 : 4.8) * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(233, 213, 255, ${(alpha * 0.85).toFixed(3)})`;
    ctx.lineWidth = 3.0 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.80), 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`;
    ctx.lineWidth = 2.0 * effect.life;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.55), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

export function drawAnimeImpactFrame(ctx, effect) {
  const isDark = _isDarkMode();

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.translate(effect.x, effect.y);

  const progress = Math.min(1.0, Math.max(0.0, 1.0 - effect.life));
  const alpha = Math.min(1.0, effect.life * 1.35);
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const isGold = (effect.color === 'gold');
  const isBlackPink = (effect.color === 'blackpink' || effect.color === 'pink');
  const isOrange = (effect.color === 'orange');
  const isCyan = (effect.color === 'cyan' || effect.color === 'blue' || effect.color === 'infinity' || effect.color === 'gojo');
  const isCrimson = (effect.color === 'crimson' || effect.color === 'red' || effect.color === 'sukuna');
  const isPurple = (effect.color === 'purple' || effect.color === 'boogie');

  let colRing, colHighlight;
  if (isGold) {
    colRing = `rgba(255, 215, 0, ${alpha * 0.95})`;
    colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
  } else if (isBlackPink) {
    colRing = `rgba(255, 20, 147, ${alpha * 0.95})`;
    colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
  } else if (isOrange) {
    colRing = `rgba(255, 80, 0, ${alpha * 0.95})`;
    colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
  } else if (isCyan) {
    colRing = `rgba(0, 229, 255, ${alpha * 0.95})`;
    colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
  } else if (isCrimson) {
    colRing = `rgba(255, 36, 0, ${alpha * 0.95})`;
    colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
  } else if (isPurple) {
    colRing = `rgba(168, 85, 247, ${alpha * 0.95})`;
    colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
  } else {
    if (!isDark && (effect.color === 'black' || !effect.color)) {
      colRing = `rgba(20, 22, 28, ${alpha * 0.95})`;
      colHighlight = `rgba(80, 90, 110, ${alpha * 0.98})`;
    } else {
      colRing = `rgba(255, 255, 255, ${alpha * 0.95})`;
      colHighlight = `rgba(220, 240, 255, ${alpha * 0.98})`;
    }
  }

  const ringRadius = effect.size * (0.25 + 0.85 * Math.pow(progress, 0.65));
  const ringThick = Math.max(P * 1.5, Math.round((P * 2.2 * effect.life) / P) * P);
  const innerR = Math.max(0, ringRadius - ringThick);
  const outerR = ringRadius + P * 0.5;

  // High-performance Canvas stroke rendering (replaces 3,721-step nested fillRect loop)
  const midR = Math.max(1, (innerR + outerR) / 2);
  const strokeThick = Math.max(1, outerR - innerR);

  // Outer ring body
  ctx.beginPath();
  ctx.arc(0, 0, midR, 0, Math.PI * 2);
  ctx.strokeStyle = colRing;
  ctx.lineWidth = strokeThick;
  ctx.stroke();

  // Crisp inner/core highlight ring
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = colHighlight;
  ctx.lineWidth = Math.max(1, P);
  ctx.stroke();

  ctx.restore();
}

export function drawPunchWindSpeedLine(ctx, effect) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const alpha = Math.min(1.0, effect.life * 1.4);
  const lineAngle = effect.angle || 0;
  const len = (effect.length || 150) * (0.6 + 0.4 * effect.life);
  const halfLen = len / 2;
  const maxThick = (effect.size || 2.5) * effect.life;
  const midOff = halfLen * 0.15; // Offset bulge toward leading tip (Rule #16)

  ctx.translate(effect.x, effect.y);
  ctx.rotate(lineAngle);

  // 4-point double-tapered filled needle polygon (Rule #16)
  const col = effect.color || '#FF8800';
  ctx.fillStyle = col;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);            // sharp trailing tip
  ctx.lineTo(midOff, -maxThick * 0.5); // top mid
  ctx.lineTo(halfLen, 0);             // sharp leading tip
  ctx.lineTo(midOff, maxThick * 0.5);  // bot mid
  ctx.closePath();
  ctx.fill();

  if (effect.isCore) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`;
    const coreLen = halfLen * 0.65;
    const coreThick = Math.max(0.6, maxThick * 0.45);
    ctx.beginPath();
    ctx.moveTo(-coreLen, 0);
    ctx.lineTo(midOff * 0.65, -coreThick * 0.5);
    ctx.lineTo(coreLen, 0);
    ctx.lineTo(midOff * 0.65, coreThick * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function drawSaitamaCounterFrontalBlast(ctx, effect) {
  const startX = effect.x;
  const startY = effect.y;
  const angle = effect.angle || 0;
  const reach = effect.reach || 750;
  const progress = 1.0 - effect.life;
  const alpha = Math.sin(effect.life * Math.PI);

  if (alpha <= 0.01) return;

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(angle);

  const P = 4.0;
  const snap = (v) => Math.round(v / P) * P;

  const currentReach = reach * Math.min(1.0, progress * 4.5);
  const halfArc = 0.48;
  const stepSize = P * 2;
  const numSteps = Math.ceil(currentReach / stepSize);

  for (let s = 0; s < numSteps; s++) {
    const gx = s * stepSize;
    if (gx > currentReach) break;

    const halfW = Math.max(P * 2, snap(gx * Math.tan(halfArc)));

    ctx.fillStyle = `rgba(255, 235, 59, ${(0.18 * alpha).toFixed(3)})`;
    ctx.fillRect(gx, -halfW - P * 2, stepSize, halfW * 2 + P * 4);

    ctx.fillStyle = '#111114';
    ctx.fillRect(gx, -halfW - P, stepSize, P);
    ctx.fillRect(gx, halfW, stepSize, P);

    ctx.fillStyle = `rgba(255, 238, 0, ${(0.96 * alpha).toFixed(3)})`;
    ctx.fillRect(gx, -halfW, stepSize, P * 2);
    ctx.fillStyle = `rgba(255, 183, 0, ${(0.96 * alpha).toFixed(3)})`;
    ctx.fillRect(gx, halfW - P * 2, stepSize, P * 2);

    const coreH = Math.max(0, halfW * 2 - P * 4);
    if (coreH > 0) {
      const coreAlpha = (s % 2 === 0 ? 0.38 : 0.28) * alpha;
      ctx.fillStyle = `rgba(255, 204, 0, ${coreAlpha.toFixed(3)})`;
      ctx.fillRect(gx, -halfW + P * 2, stepSize, coreH);
    }

    const centerW = Math.max(P, snap(halfW * 0.22));
    ctx.fillStyle = (s % 2 === 0) 
      ? `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})` 
      : `rgba(255, 250, 190, ${(0.92 * alpha).toFixed(3)})`;
    ctx.fillRect(gx, -centerW * 0.5, stepSize, centerW);
  }

  ctx.fillStyle = `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})`;
  ctx.fillRect(-P, -P * 2, P * 2, P * 4);
  ctx.fillRect(-P * 2, -P, P * 4, P * 2);

  const numChevrons = 4;
  for (let c = 0; c < numChevrons; c++) {
    const cFrac = ((c + 1) / (numChevrons + 1)) * (0.25 + progress * 0.75);
    const cDist = currentReach * cFrac;
    if (cDist < P * 4 || cDist > currentReach) continue;

    const cHalfW = snap(cDist * Math.tan(halfArc));
    const armSteps = Math.max(4, Math.floor(cHalfW / (P * 2)));

    ctx.fillStyle = (c % 2 === 0)
      ? `rgba(255, 255, 255, ${(0.96 * alpha).toFixed(3)})`
      : `rgba(255, 238, 0, ${(0.92 * alpha).toFixed(3)})`;

    for (let st = 0; st <= armSteps; st++) {
      const t = st / armSteps;
      const px = snap(cDist - t * (cHalfW * 0.35));
      const py = snap(t * cHalfW);
      ctx.fillRect(px, -py - P, P * 1.5, P * 1.5);
      ctx.fillRect(px, py, P * 1.5, P * 1.5);
    }
  }

  const rayAngles = [
    -halfArc * 0.70,
    -halfArc * 0.35,
    0,
    halfArc * 0.35,
    halfArc * 0.70
  ];

  rayAngles.forEach((rayAng, rIdx) => {
    const cosR = Math.cos(rayAng);
    const sinR = Math.sin(rayAng);
    const maxRayLen = currentReach * (rIdx % 2 === 0 ? 0.96 : 0.82);
    const raySteps = Math.floor(maxRayLen / (P * 2));

    ctx.fillStyle = (rayAng === 0) 
      ? `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})` 
      : `rgba(255, 235, 59, ${(0.85 * alpha).toFixed(3)})`;

    for (let st = 1; st <= raySteps; st++) {
      const d = st * (P * 2);
      const rx = snap(cosR * d);
      const ry = snap(sinR * d);
      ctx.fillRect(rx, ry, P, P);
    }
  });

  const capHalfW = snap(currentReach * Math.tan(halfArc));
  ctx.fillStyle = `rgba(255, 255, 255, ${(0.96 * alpha).toFixed(3)})`;
  ctx.fillRect(snap(currentReach), -capHalfW, P, capHalfW * 2);
  ctx.fillStyle = '#111114';
  ctx.fillRect(snap(currentReach) + P, -capHalfW, P, capHalfW * 2);

  const numEmbers = 16;
  for (let eb = 0; eb < numEmbers; eb++) {
    const ebDist = snap(currentReach * (0.15 + (eb / numEmbers) * 0.75));
    const ebAng = ((eb % 7) - 3) * (halfArc * 0.25);
    const ebX = snap(Math.cos(ebAng) * ebDist);
    const ebY = snap(Math.sin(ebAng) * ebDist);
    ctx.fillStyle = (eb % 3 === 0) ? '#FFFFFF' : ((eb % 2 === 0) ? '#FFEE58' : '#FFB300');
    ctx.fillRect(ebX, ebY, P, P);
  }

  ctx.restore();
}

export function drawGojoRedFrontalBlast(ctx, effect) {
  const startX = effect.x;
  const startY = effect.y;
  const angle = effect.angle || 0;
  const reach = effect.reach || 650;
  const halfArc = 0.38;
  const progress = 1.0 - effect.life;
  const alpha = Math.sin(effect.life * Math.PI);
  const isGreen = effect.colorTheme === 'green' || effect.isRubbick;

  if (alpha <= 0.01) return;

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(angle);

  const currentReach = reach * Math.min(1.0, progress * 5.0);
  const P = 4.0;
  const snap = (v) => Math.round(v / P) * P;

  const stepSize = P * 2;
  const numSteps = Math.ceil(currentReach / stepSize);

  const glowCol = isGreen ? `rgba(0, 255, 100, ${(0.22 * alpha).toFixed(3)})` : `rgba(255, 0, 51, ${(0.22 * alpha).toFixed(3)})`;
  const borderCol = isGreen ? '#05180B' : '#110204';
  const rimCol = isGreen ? `rgba(0, 255, 100, ${(0.92 * alpha).toFixed(3)})` : `rgba(255, 0, 51, ${(0.92 * alpha).toFixed(3)})`;
  const coreCol = isGreen ? `rgba(0, 122, 51, ${(0.75 * alpha).toFixed(3)})` : `rgba(139, 0, 20, ${(0.75 * alpha).toFixed(3)})`;
  const centerCol2 = isGreen ? `rgba(180, 255, 210, ${(0.90 * alpha).toFixed(3)})` : `rgba(255, 140, 160, ${(0.90 * alpha).toFixed(3)})`;
  const rayCol2 = isGreen ? `rgba(180, 255, 210, ${(0.80 * alpha).toFixed(3)})` : `rgba(255, 210, 220, ${(0.80 * alpha).toFixed(3)})`;
  const emberCol2 = isGreen ? '#00FF64' : '#FF0033';

  for (let s = 0; s < numSteps; s++) {
    const gx = s * stepSize;
    if (gx > currentReach) break;

    const halfW = Math.max(P * 2, snap(gx * Math.tan(halfArc)));

    ctx.fillStyle = glowCol;
    ctx.fillRect(gx, -halfW - P * 2, stepSize, halfW * 2 + P * 4);

    ctx.fillStyle = borderCol;
    ctx.fillRect(gx, -halfW - P, stepSize, P);
    ctx.fillRect(gx, halfW, stepSize, P);

    ctx.fillStyle = rimCol;
    ctx.fillRect(gx, -halfW, stepSize, P * 2);
    ctx.fillRect(gx, halfW - P * 2, stepSize, P * 2);

    const coreHeight = Math.max(0, halfW * 2 - P * 4);
    if (coreHeight > 0) {
      ctx.fillStyle = coreCol;
      ctx.fillRect(gx, -halfW + P * 2, stepSize, coreHeight);
    }

    const centerW = Math.max(P, snap(halfW * 0.30));
    ctx.fillStyle = (s % 2 === 0) ? `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})` : centerCol2;
    ctx.fillRect(gx, -centerW * 0.5, stepSize, centerW);
  }

  const rayAngles = [
    -halfArc * 0.65,
    -halfArc * 0.32,
    0,
    halfArc * 0.32,
    halfArc * 0.65
  ];

  rayAngles.forEach((rayAng, rIdx) => {
    const cosR = Math.cos(rayAng);
    const sinR = Math.sin(rayAng);
    const maxRayLen = currentReach * (rIdx % 2 === 0 ? 0.95 : 0.80);
    const raySteps = Math.floor(maxRayLen / (P * 2));

    ctx.fillStyle = (rayAng === 0) ? `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})` : rayCol2;

    for (let st = 1; st <= raySteps; st++) {
      const d = st * (P * 2);
      const rx = snap(cosR * d);
      const ry = snap(sinR * d);
      ctx.fillRect(rx, ry, P, P);
    }
  });

  const capHalfW = snap(currentReach * Math.tan(halfArc));
  ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`;
  ctx.fillRect(snap(currentReach), -capHalfW, P, capHalfW * 2);
  ctx.fillStyle = borderCol;
  ctx.fillRect(snap(currentReach) + P, -capHalfW, P, capHalfW * 2);

  const numEmbers = 12;
  for (let eb = 0; eb < numEmbers; eb++) {
    const ebDist = snap(currentReach * (0.20 + (eb / numEmbers) * 0.70));
    const ebAng = ((eb % 5) - 2) * (halfArc * 0.28);
    const ebX = snap(Math.cos(ebAng) * ebDist);
    const ebY = snap(Math.sin(ebAng) * ebDist);
    ctx.fillStyle = (eb % 2 === 0) ? '#FFFFFF' : emberCol2;
    ctx.fillRect(ebX, ebY, P, P);
  }

  ctx.restore();
}

export function drawArcaneShockwave(ctx, effect) {
  effect.size += (effect.targetSize - effect.size) * 0.08;
  const alpha = Math.min(1.0, effect.life * 1.25);
  const P = 2.5;
  const snap = (v) => Math.round(v / P) * P;
  const radius = Math.max(P * 2, snap(effect.size));
  const steps = Math.max(28, Math.min(60, Math.round((Math.PI * 2 * radius) / (P * 1.5))));

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const colBorder = `rgba(5, 20, 10, ${(alpha * 0.90).toFixed(3)})`;
  const colOuter = effect.color || `rgba(0, 255, 120, ${(alpha * 0.95).toFixed(3)})`;
  const colMid = `rgba(160, 255, 200, ${(alpha * 0.88).toFixed(3)})`;
  const colCore = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;

  for (let st = 0; st < steps; st++) {
    const ang = (st / steps) * Math.PI * 2;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    const r0 = snap(radius);
    ctx.fillStyle = colBorder;
    ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

    ctx.fillStyle = colOuter;
    ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

    const r1 = snap(radius * 0.78);
    ctx.fillStyle = colMid;
    ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

    const r2 = snap(radius * 0.50);
    ctx.fillStyle = colCore;
    ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
  }
  ctx.restore();
}
