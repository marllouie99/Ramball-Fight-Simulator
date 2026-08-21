// ─────────────────────────────────────────────
// UI MODULE (Refactored Entry Point)
// ─────────────────────────────────────────────

import { renderFpsDebugOverlay } from './ui/debugOverlay.js';
import { renderTeamHpCard } from './ui/hudRenderer.js';
import { drawHUD, clearHealthHud, drawMissionPassedOverlay } from './hudManager.js?v=6';
import { 
  handleUIMove, 
  handleUIClick, 
  drawPanel 
} from './ui/uiFramework.js';
import { 
  drawTitleScreen, 
  drawLeaderboardScreen 
} from './ui/MainMenuScreen.js';
import { 
  drawIndexScreen, 
  drawIndexDetailScreen 
} from './ui/FighterIndexScreen.js';
import { 
  drawWeaponMenu, 
  isFighterDemoAttacking, 
  drawWeaponInfoCard, 
  triggerWeaponDemoAttack, 
  drawWeaponDetailScreen, 
  drawYutaKatana 
} from './ui/WeaponIndexScreen.js';
import { 
  drawWeaponStudioScreen 
} from './ui/WeaponStudioScreen.js';
import { 
  drawSelectScreen 
} from './ui/CharacterSelectScreen.js';
import { 
  drawPauseScreen, 
  drawCountdown 
} from './ui/HUD.js';
import { 
  drawRoundEndScreen, 
  drawMatchEndScreen 
} from './ui/GameOverScreen.js';

export {
  renderTeamHpCard,
  renderFpsDebugOverlay,
  drawHUD,
  clearHealthHud,
  handleUIMove,
  handleUIClick,
  drawPanel,
  drawTitleScreen,
  drawLeaderboardScreen,
  drawIndexScreen,
  drawWeaponMenu,
  isFighterDemoAttacking,
  drawWeaponInfoCard,
  triggerWeaponDemoAttack,
  drawWeaponDetailScreen,
  drawWeaponStudioScreen,
  drawYutaKatana,
  drawIndexDetailScreen,
  drawSelectScreen,
  drawPauseScreen,
  drawRoundEndScreen,
  drawMatchEndScreen,
  drawCountdown,
  drawMissionPassedOverlay
};
