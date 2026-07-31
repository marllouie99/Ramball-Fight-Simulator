export const SKILL_REGISTRY = {
  // Gojo's Hollow Purple
  'purple': {
    id: 'purple',
    name: 'Hollow Purple',
    ownerType: 'gojo',
    skillShotColor: '#800080',
    dodgeRadius: 140,
    adaptationThresholdPct: 0.20,
    adaptationWindowFrames: 300,
    adaptationDelayFrames: 60,
    dodgeType: 'perpendicular',
  },
  
  // Gojo's Reversal Red
  'red': {
    id: 'red',
    name: 'Reversal Red',
    ownerType: 'gojo',
    skillShotColor: '#FF0000',
    dodgeRadius: 180,
    adaptationThresholdPct: 0.15,
    adaptationWindowFrames: 300,
    adaptationDelayFrames: 45,
    dodgeType: 'away',
  },
  
  // Toji's 1-3 Stealth Ambush Sequence
  'tojiAmbush': {
    id: 'tojiAmbush',
    name: 'Stealth Ambush',
    ownerType: 'toji',
    skillShotColor: '#A040FF',
    dodgeRadius: 80,
    adaptationThresholdPct: 0.10, // Fast adaptation (10% max HP taken)
    adaptationWindowFrames: 300,
    adaptationDelayFrames: 10,    // Rapid 10-frame adaptation time for fast reaction
    dodgeType: 'away',
  },
  
  // Sukuna's Divine Flame (Fuga)
  'divineFlame': {
    id: 'divineFlame',
    name: 'Divine Flame: Fuga',
    ownerType: 'sukuna',
    skillShotColor: '#FFA500',
    dodgeRadius: 160,
    adaptationThresholdPct: 0.20,
    adaptationWindowFrames: 300,
    adaptationDelayFrames: 60,
    dodgeType: 'perpendicular',
  },
  
  // Sharpshooter's Executioner Bullet
  'sharpshooter_executor': {
    id: 'sharpshooter_executor',
    name: 'The Executioner',
    ownerType: 'sharpshooter',
    skillShotColor: '#FFD700',
    dodgeRadius: 140,
    adaptationThresholdPct: 0.25,
    adaptationWindowFrames: 300,
    adaptationDelayFrames: 60,
    dodgeType: 'perpendicular',
  },
  
  // Hyperion's Laser Beam
  'laser_beam': {
    id: 'laser_beam',
    name: 'Solar Beam',
    ownerType: 'solarchampion',
    skillShotColor: '#FFFFFF',
    dodgeRadius: 1200,
    adaptationThresholdPct: 0.05,
    adaptationWindowFrames: 900,
    adaptationDelayFrames: 45,
    dodgeType: 'behind', // Automatically dodge behind for massive sweeping beams
  }
};
