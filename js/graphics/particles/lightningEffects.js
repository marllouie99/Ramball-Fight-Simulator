import { state } from '../../core/state.js';
import { drawThunderRootsEffect } from '../statusEffects.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';
import { drawZeusThunderstrike } from '../weapons/zeusWeaponGraphics.js';

export function updateLightningEffects() {
  if (!state.zeusStormStrikes) return;
  
  for (let i = state.zeusStormStrikes.length - 1; i >= 0; i--) {
    let strike = state.zeusStormStrikes[i];
    
    // Play thunder strike sound on first frame when strike is created
    if (strike.life === strike.maxLife && !strike.soundPlayed) {
      strike.soundPlayed = true;
      const thunderSound = getSkillEffectSound('zeus', 'thunderstrike');
      if (thunderSound) audioSystem.playSFX(thunderSound.src, thunderSound.volume);

      const thunderSound2 = getSkillEffectSound('zeus', 'thunderstrike2');
      if (thunderSound2) audioSystem.playSFX(thunderSound2.src, thunderSound2.volume);
    }
    
    strike.life--;
    if (strike.life <= 0) {
      state.zeusStormStrikes.splice(i, 1);
    }
  }
}

/**
 * Draws all active Zeus thunder strikes across the arena using the 12-frame animation engine.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawLightningEffects(ctx) {
  if (!state.zeusStormStrikes || state.zeusStormStrikes.length === 0) return;
  
  for (let i = 0; i < state.zeusStormStrikes.length; i++) {
    const strike = state.zeusStormStrikes[i];
    drawZeusThunderstrike(ctx, strike);
  }
}
