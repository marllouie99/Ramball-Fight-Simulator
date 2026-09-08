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
