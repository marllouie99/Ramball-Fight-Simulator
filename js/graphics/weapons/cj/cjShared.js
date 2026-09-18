// ─────────────────────────────────────────────
// CJ Weapon Graphics — Shared Utilities
// ─────────────────────────────────────────────

import { state } from '../../../core/state.js';

export function isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

export const _isDarkMode = isDarkMode;

/**
 * Draws Pixel Art Starburst Muzzle Flash for CJ Firearms (Micro-Uzi, Tec-9, etc.)
 */
export function drawCjPixelMuzzleFlash(ctx, x, y, scale = 1.0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const P = 2.0 * scale;

  // Stepped Pixel Diamond Starburst
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-P * 3, -P * 3, P * 6, P * 6);

  ctx.fillStyle = '#F97316'; // Fiery orange outer cross
  ctx.fillRect(-P * 4, -P, P * 8, P * 2);
  ctx.fillRect(-P, -P * 4, P * 2, P * 8);

  ctx.fillStyle = '#FBBF24'; // Golden core
  ctx.fillRect(-P * 2.5, -P * 2.5, P * 5, P * 5);

  ctx.fillStyle = '#FFFFFF'; // White-hot center
  ctx.fillRect(-P, -P, P * 2, P * 2);

  ctx.restore();
}
