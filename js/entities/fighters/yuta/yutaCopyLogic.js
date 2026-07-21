import { CONFIG } from '../../../core/config.js';
import { spawnFloatingText, state } from '../../../core/state.js';
import { playSound } from '../../../systems/soundSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';

export const COPIED_TECHNIQUES = [
  'CURSED_SPEECH',
  'THIN_ICE_BREAKER'
];

export function getNextCopiedTechnique(fighter) {
  if (fighter.copiedTechniqueIndex === undefined) {
    fighter.copiedTechniqueIndex = 0;
  } else {
    fighter.copiedTechniqueIndex = (fighter.copiedTechniqueIndex + 1) % COPIED_TECHNIQUES.length;
  }
  return COPIED_TECHNIQUES[fighter.copiedTechniqueIndex];
}

export function executeCopiedTechnique(fighter, angle) {
  const technique = COPIED_TECHNIQUES[fighter.copiedTechniqueIndex || 0];
  
  if (technique === 'CURSED_SPEECH') {
    executeCursedSpeech(fighter);
  } else if (technique === 'THIN_ICE_BREAKER') {
    executeThinIceBreaker(fighter, angle);
  }
}

function executeCursedSpeech(fighter) {
  // Spawn a fast expanding wave or just instantly apply an AoE freeze
  spawnFloatingText(fighter.x, fighter.y - 40, '"DONT MOVE!"', '#FFFFFF');
  
  // Play sound if we had one
  // playSound('Assets/Sound Effects/Skills/cursedspeech.mp3', 0.8);
  
  // We'll handle the actual hit logic by spawning a special visual projectile 
  // that instantly expands and checks collisions in projectileSystem.js, 
  // or we can just apply it directly here.
  
  // Let's spawn an expanding ring projectile to give it a hitbox
  projectileSystem.projectiles.push({
    owner: state.fighters.indexOf(fighter),
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: 0,
    r: 10,
    maxR: CONFIG.yuta.cursedSpeechRadius || 150,
    damage: 0, // No damage, just CC
    life: 20,
    maxLife: 20,
    visual: 'cursedSpeechWave',
    isCursedSpeech: true
  });
}

function executeThinIceBreaker(fighter, angle) {
  const speed = CONFIG.yuta.thinIceBreakerSpeed || 25;

  projectileSystem.projectiles.push({
    owner: state.fighters.indexOf(fighter),
    x: fighter.x,
    y: fighter.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 8,
    damage: CONFIG.yuta.thinIceBreakerDamage || 25,
    life: 60,
    maxLife: 60,
    visual: 'thinIceBreaker',
    isThinIceBreaker: true
  });
}
