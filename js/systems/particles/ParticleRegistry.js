export const ParticleRegistry = {
  // ─── SPARK EFFECTS ───
  crimson: () => ({
    color: `rgba(255, ${50 + Math.random() * 100}, ${20 + Math.random() * 50}, 1)`,
    decay: 0.04 + Math.random() * 0.06,
    size: 1.5 + Math.random() * 3,
    speed: 2 + Math.random() * 6,
    friction: 0.92,
    isFlash: false
  }),
  parrySpark: () => {
    const rand = Math.random();
    const color = rand > 0.6 ? 'rgba(255, 255, 255, 1)' : (rand > 0.3 ? 'rgba(255, 220, 90, 1)' : 'rgba(255, 120, 20, 1)');
    return {
      color,
      decay: 0.04 + Math.random() * 0.05,
      size: 1.8 + Math.random() * 2.8,
      speed: 8 + Math.random() * 16,
      friction: 0.89,
      isFlash: false
    };
  },
  parryEmberStar: () => {
    const rand = Math.random();
    const color = rand > 0.5 ? 'rgba(255, 255, 255, 1)' : (rand > 0.25 ? 'rgba(255, 220, 80, 1)' : 'rgba(255, 130, 30, 1)');
    return {
      color,
      decay: 0.035 + Math.random() * 0.045,
      size: 2.2 + Math.random() * 3.2,
      speed: 3 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.35,
      friction: 0.92,
      isFlash: false
    };
  },
  crimsonSniper: () => {
    const rand = Math.random();
    const color = rand > 0.65 ? 'rgba(0, 0, 0, 1)' : (rand > 0.25 ? 'rgba(200, 0, 0, 1)' : 'rgba(255, 255, 255, 1)');
    return {
      color,
      decay: 0.04 + Math.random() * 0.06,
      size: 1.5 + Math.random() * 3,
      speed: 2 + Math.random() * 6,
      friction: 0.92,
      isFlash: false
    };
  },
  flash: () => ({
    color: 'rgba(255, 200, 100, 1)',
    decay: 0.04 + Math.random() * 0.06,
    size: 1.5 + Math.random() * 3,
    speed: 2 + Math.random() * 6,
    friction: 0.92,
    isFlash: false
  }),
  arcane: () => ({
    color: `rgba(${20 + Math.random() * 80}, ${200 + Math.random() * 55}, ${20 + Math.random() * 80}, 1)`,
    decay: 0.04 + Math.random() * 0.06,
    size: 1.5 + Math.random() * 3,
    speed: 2 + Math.random() * 6,
    friction: 0.92,
    isFlash: false
  }),
  arcaneAscendLine: () => ({
    color: `rgba(${20 + Math.random() * 80}, ${200 + Math.random() * 55}, ${20 + Math.random() * 80}, 1)`,
    decay: 1 / 30, // exactly 30 frames
    size: 2.5 + Math.random() * 2.5,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -1.5 - Math.random() * 2.5, // Force float upwards
    friction: 0.98,
    isFlash: false
  }),
  laserHit: () => {
    const rand = Math.random();
    let color = 'rgba(255, 255, 255, 1)';
    if (rand > 0.6) color = 'rgba(20, 20, 20, 1)';
    else if (rand > 0.2) color = 'rgba(255, 100, 0, 1)';
    return {
      color,
      decay: 0.05 + Math.random() * 0.08,
      size: 1.5 + Math.random() * 3,
      speed: 2 + Math.random() * 6,
      friction: 0.92,
      isFlash: false
    };
  },
  thunderSpark: () => ({
    color: Math.random() > 0.5 ? 'rgba(0, 220, 255, 1)' : 'rgba(255, 255, 255, 1)',
    decay: 0.03 + Math.random() * 0.05,
    size: 1.5 + Math.random() * 3,
    speed: (2 + Math.random() * 6) * 2.0,
    friction: 0.90,
    isFlash: true // IMPORTANT: route to custom jagged rendering
  }),
  ghostTrail: () => {
    const gray = 150 + Math.random() * 50;
    return {
      color: `rgba(${gray}, ${gray}, ${gray + 20}, 1)`,
      decay: 0.02 + Math.random() * 0.03,
      size: 2 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 1.0,
      vy: -1.0 - Math.random() * 2.0,
      friction: 0.95,
      isFlash: false
    };
  },
  healing: () => {
    const blueIntensity = 180 + Math.random() * 75;
    return {
      color: `rgba(50, ${100 + Math.random() * 80}, ${blueIntensity}, 1)`,
      decay: 0.03 + Math.random() * 0.04,
      size: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      friction: 0.90,
      isGlow: true,
      isFlash: false
    };
  },
  rikaCurse: () => {
    const rand = Math.random();
    let color = `rgba(${35 + Math.random() * 25}, 10, ${55 + Math.random() * 25}, 1)`;
    if (rand > 0.6) color = `rgba(${200 + Math.random() * 55}, 20, ${180 + Math.random() * 55}, 1)`;
    else if (rand > 0.3) color = `rgba(${100 + Math.random() * 50}, 0, ${150 + Math.random() * 50}, 1)`;
    return {
      color,
      decay: 0.02 + Math.random() * 0.02,
      size: 2.0 + Math.random() * 3.5,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -0.6 - Math.random() * 1.4,
      friction: 0.96,
      isFlash: false
    };
  },
  yutaBeamPinkCore: () => ({
    color: 'rgba(255, 20, 147, 1)',
    decay: 0.008 + Math.random() * 0.008,
    size: 3.0 + Math.random() * 5.0,
    speed: 0.3 + Math.random() * 1.5,
    friction: 0.96,
    isFlash: false,
    isPinkCore: true
  }),
  paleStoneShatter: () => {
    const rand = Math.random();
    let color = 'rgba(254, 240, 138, 1)';
    if (rand > 0.65) color = 'rgba(241, 245, 249, 1)';
    else if (rand > 0.35) color = 'rgba(203, 213, 225, 1)';
    else if (rand > 0.15) color = 'rgba(71, 85, 105, 1)';
    return {
      color,
      decay: 0.03 + Math.random() * 0.05,
      size: 2.5 + Math.random() * 4.5,
      speed: 2 + Math.random() * 6,
      friction: 0.88,
      isFlash: false
    };
  },
  default: () => ({
    color: `rgba(255, ${50 + Math.random() * 100}, ${20 + Math.random() * 50}, 1)`,
    decay: 0.04 + Math.random() * 0.06,
    size: 1.5 + Math.random() * 3,
    speed: 2 + Math.random() * 6,
    friction: 0.92,
    isFlash: false
  }),
  
  // ─── IMPACT FLASHES ───
  flash_default: () => ({
    color: 'rgba(255, 255, 255, 0.9)',
    decay: 0.15 + Math.random() * 0.1,
    size: 20 + Math.random() * 15, // Will be overridden by radius in spawnImpactFlash
    speed: 0,
    friction: 0,
    isFlash: true,
    isGlow: false
  }),
  flash_crimson: () => ({
    color: 'rgba(255, 100, 50, 0.9)',
    decay: 0.15 + Math.random() * 0.1,
    size: 20 + Math.random() * 15,
    speed: 0,
    friction: 0,
    isFlash: true,
    isGlow: false
  }),
  flash_void: () => ({
    color: 'rgba(128, 0, 255, 0.9)',
    decay: 0.15 + Math.random() * 0.1,
    size: 20 + Math.random() * 15,
    speed: 0,
    friction: 0,
    isFlash: true,
    isGlow: false
  }),
  flash_arcane: () => ({
    color: 'rgba(50, 255, 100, 0.9)',
    decay: 0.1 + Math.random() * 0.1,
    size: 30 + Math.random() * 20,
    speed: 0,
    friction: 0,
    isFlash: true,
    isGlow: true
  }),
  flash_paleStone: () => ({
    color: 'rgba(226, 232, 240, 0.9)',
    decay: 0.15 + Math.random() * 0.15,
    size: 25 + Math.random() * 20,
    speed: 0,
    friction: 0,
    isFlash: true,
    isGlow: false
  }),
  
  // ─── DEBRIS & WIND ───
  telekinesisDebris: () => {
    const isGreen = Math.random() > 0.5;
    const color = isGreen ? 'rgba(46, 139, 87, 1)' : 'rgba(30, 40, 30, 1)';
    const sizeRoll = Math.random();
    let size = 1 + Math.random() * 2.5;
    if (sizeRoll >= 0.6 && sizeRoll < 0.9) size = 3.5 + Math.random() * 3.5;
    else if (sizeRoll >= 0.9) size = 8 + Math.random() * 4;
    return {
      color,
      decay: 0.003 + Math.random() * 0.003, // Lasts 150-300 frames
      size,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -3.0 - Math.random() * 4.0,
      friction: 0.94,
      isFlash: false,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1
    };
  },
  tojiWindLeaf: () => {
    const leafColors = ['#2E8B57', '#3CB371', '#556B2F', '#D2691E', '#8B5A2B', '#A0522D'];
    return {
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
      decay: 0.018 + Math.random() * 0.015,
      size: 2.5 + Math.random() * 2.5,
      vx: 0, vy: 0, // Handled by orbit logic
      friction: 1.0,
      isFlash: false,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      isOrbit: true
    };
  },
  tojiWindPebble: () => {
    const pebbleColors = ['#3A3D40', '#4A4D50', '#25282B', '#5A5D60', '#1F2225'];
    return {
      color: pebbleColors[Math.floor(Math.random() * pebbleColors.length)],
      decay: 0.018 + Math.random() * 0.015,
      size: 1.2 + Math.random() * 2.0,
      vx: 0, vy: 0,
      friction: 1.0,
      isFlash: false,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      isOrbit: true
    };
  },
  
  // ─── MAHITO SOUL FRAGMENT SPARKS ───
  soulFragment: () => ({
    color: Math.random() > 0.4 ? 'rgba(217, 70, 239, 1)' : (Math.random() > 0.5 ? 'rgba(192, 38, 211, 1)' : 'rgba(245, 208, 254, 1)'),
    decay: 0.04 + Math.random() * 0.06,
    size: 2.0 + Math.random() * 3.5,
    speed: 3 + Math.random() * 6,
    friction: 0.90,
    isFlash: false
  }),
  
  // ─── LAYLA BULLET SPARKS & FLASH ───
  laylaSpark: () => ({
    color: Math.random() > 0.4 ? 'rgba(0, 229, 255, 1)' : 'rgba(224, 255, 255, 1)',
    decay: 0.04 + Math.random() * 0.06,
    size: 1.5 + Math.random() * 3,
    speed: 3 + Math.random() * 6,
    friction: 0.90,
    isFlash: true
  }),
  flash_layla: () => ({
    color: 'rgba(0, 229, 255, 0.85)',
    decay: 0.15 + Math.random() * 0.1,
    size: 25 + Math.random() * 15,
    speed: 0,
    friction: 0,
    isFlash: true,
    isGlow: true
  })
};
