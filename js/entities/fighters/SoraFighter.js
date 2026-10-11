// ─────────────────────────────────────────────
// Sora Fighter Class (Aliased to Shiro)
// ─────────────────────────────────────────────

import { ShiroFighter } from './ShiroFighter.js';

export class SoraFighter extends ShiroFighter {
  constructor(def) {
    super(def);
    this.characterId = 'shiro';
    this.type = 'shiro';
  }
}
