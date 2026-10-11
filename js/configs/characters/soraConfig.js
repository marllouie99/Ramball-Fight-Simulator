// ─────────────────────────────────────────────
// Sora (Aliased to Shiro) Config
// Re-exports Shiro's configuration for backward compatibility
// ─────────────────────────────────────────────

import { shiroConfig } from './shiroConfig.js';

export const soraConfig = {
  ...shiroConfig,
  name: 'Shiro',
  displayName: 'Shiro'
};
