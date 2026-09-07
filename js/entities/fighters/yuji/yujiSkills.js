import { CONFIG } from '../../../core/config.js';

/**
 * Handles Yuji Itadori's Reverse Cursed Technique (RCT) [Passive].
 * RCT is a passive technique that automatically heals Yuji upon reverting from Sukuna transformation.
 */
export function modUpdateReverseCursedTechnique() {
  // Legacy safety check: if active channeling is somehow requested, complete immediately
  if (this.isChannelingRCT) {
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
  }
}

