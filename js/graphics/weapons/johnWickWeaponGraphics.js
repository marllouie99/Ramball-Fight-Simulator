// ─────────────────────────────────────────────
// John Wick Weapon Graphics: TTI Pit Viper & The Pencil
// Adhering to Rule 11 (Zero shadowBlur) and Weapon Studio Standards
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';

export const JOHN_WICK_WEAPON_GRAPHICS = {
  pistol: {
    // Two-Tone Champagne / Brushed Tungsten Titanium Slide
    slideChampagne: '#9E978E',      // Brushed Champagne Titanium Flat Panel
    slideChampagneTop: '#B5ADA2',   // Upper Metallic Sheen
    slideChampagneBevel: '#D1CAC0', // Polished Chamfer Edge Highlight
    slideTopBlack: '#161719',       // Top Flat & Slide Recesses
    slideSerration: '#181A1D',      // Deep Angled Cocking Serration Grooves
    slideMarking: '#D4CFC7',        // Laser Engraved Pit Viper Text & Logo Tone
    
    // Rose-Gold / Copper Titanium-Nitride Accents
    barrelBronze: '#C87D55',        // Rose-Gold / Copper Chamber Hood & Match Barrel
    barrelHighlight: '#F0B08E',     // Rose-Gold Metallic Specular Sheen
    barrelFlute: '#9E5B38',         // Barrel Fluting Shadow
    hammerRoseGold: '#D48B63',      // Rose-Gold Skeletonized Combat Hammer
    
    // Machined Silver / Aluminum Match Trigger
    triggerSilver: '#E2E8F0',       // Machined Aluminum Match Trigger
    triggerHole: '#1E2024',         // Trigger Lightening Cutout Holes
    
    // High-Visibility Green/Lime Fiber-Optic Sights (Matching photo)
    frontSightGreen: '#84CC16',     // High-Vis Lime-Green Fiber Optic Pipe
    frontSightCore: '#D9F99D',      // Bright White-Lime Glowing Core
    frontSightBezel: '#111215',     // Steel Sight Post Housing
    rearSight: '#141518',           // Dawson Precision Rear Combat Sight
    
    // 2011 Modular Frame, Grip & Controls
    frameBase: '#17181B',           // Deep Matte Black 2011 Frame
    frameBevel: '#2A2D33',          // Dust Cover & Accessory Rail Bevels
    gripStipple: '#0E0F11',         // Fine Stippled Grip Pattern
    gripBushing: '#2E323A',         // Circular Grip Bushing Screw
    magwellFlare: '#181A1D',        // Flared Competition Magwell
    magwellPin: '#CBD5E1',          // Magwell Retention Pin
    safetyLever: '#2C2F36',         // Ambi Thumb Safety Lever
    slideStop: '#26282E',           // Takedown Slide Stop Pin & Markings
    compPin: '#A8A29E',             // Compensator Set Pin
  },
  pencil: {
    graphiteTip: '#2B2D31',     // Dark Graphite Point
    woodCollar: '#DEB887',      // Sharpened Cedar Wood
    shaftYellow: '#F59E0B',     // Classic #2 Amber Yellow Shaft
    shaftFacet: '#D97706',      // Hexagonal Facet Shading
    ferruleSilver: '#94A3B8',   // Metal Ferrule Band
    eraserPink: '#F472B6',      // Classic Pink Rubber Eraser
  },
  shotgun: {
    receiverBase: '#1C1E22',    // Matte Mil-Spec Parkerized Receiver
    receiverTop: '#282B30',     // Upper Receiver & Picatinny Rail Ridge
    receiverBevel: '#353942',   // Receiver Contour Chamfer
    receiverPin: '#0B0C0E',     // Trigger Group Retaining Pin
    boltCarrier: '#94A3B8',     // Chrome / Parkerized Steel Bolt Carrier
    boltExtractor: '#475569',   // Extractor Claw
    chargingHandle: '#282B32',  // Knurled Tactical Charging Handle Knob
    barrelSteel: '#2C2E33',     // 18.5" Heavy Steel Barrel
    barrelHighlight: '#43474F', // Barrel Specular Sheen Line
    magazineTube: '#18191D',    // Full-Length Extended Magazine Tube
    magTubeBracket: '#26292F',  // Barrel & Magazine Tube Twin Locking Clamp
    magCapKnurled: '#363942',   // Knurled Magazine Cap with QD Swivel
    pumpForend: '#111215',      // Ribbed Ergonomic Polymer Pump Forend
    pumpRibShadow: '#090A0C',   // Pump Rib Deep Grooves
    pumpRibHighlight: '#2A2D35',// Pump Rib Edge Highlights
    heatShield: '#23262B',      // Ventilated Heat Shield / Shroud
    heatShieldSlot: '#0E0F12',  // Heat Shield Cooling Slots
    heatShieldBracket: '#3A3D46',// Heat Shield Fastener Screws
    ghostRingSight: '#EF4444',  // Red Front Sight Post
    ghostRingEars: '#121417',   // Front Sight Protective Steel Ears
    rearGhostRing: '#1E2026',   // LPA Ghost Ring Rear Aperture
    shellBrass: '#F59E0B',      // High-Brass 12-Gauge Hull
    shellPlastic: '#DC2626',    // Crimson 12-Gauge Shell
    shellCrimp: '#991B1B',      // 8-Point Star Folded Crimp Tip
    shellRim: '#D97706',        // Brass Extractor Rim
    shellPrimer: '#E2E8F0',     // Silver Center Primer
    ejectionPort: '#0C0D0E',    // Open Ejection Chamber
    boltReleasePaddle: '#2D3038',// Oversized Tactical Bolt Release Button
    stockGuideRod: '#3E424D',   // Twin Steel Telescoping Stock Rails
    stockBody: '#16171B',       // Skeletonized Stock Body
    stockPad: '#0E0F12',        // Textured Rubber Buttpad
  },
  rifle: {
    receiverBase: '#1C1E23',    // Matte Gunmetal Black Lower & Upper Receiver
    receiverUpper: '#262930',   // Upper Receiver & Brass Deflector
    picatinnyRail: '#2A2D35',   // Flattop Picatinny Receiver Rail
    scopeBody: '#1E2026',       // Aimpoint CompM4 Tactical Optic Tube
    scopeRiser: '#272A32',      // QRP2 Cantilever Riser Mount
    scopeKnob: '#3A3E48',       // Rotary Adjustment Turrets & Battery Cap
    scopeGlass: '#38BDF8',      // Multi-Coated Anti-Reflective Optical Glass
    scopeReticle: '#EF4444',    // Red Dot Laser Reticle
    handguardRibbed: '#181A1E', // Cylindrical Ribbed Polymer Carbine Handguard
    handguardRibLine: '#2D313A',// Vertical Rib Highlight Lines
    barrelSteel: '#2B2E35',     // Stepped Parkerized 14.5" Steel Barrel
    frontSightBase: '#1E2026',  // Iconic A-Frame Triangular Front Sight Gas Block
    flashHider: '#15161A',      // A2 Birdcage Flash Hider with Vents
    stockLE: '#17191D',         // Collapsible 6-Position LE/Carbine Stock
    stockPad: '#0E0F12',        // Textured Rubber Buttpad
    bufferTube: '#2E323A',      // Cylindrical Buffer Tube
    stanagMag: '#24272F',       // Curved 30-round STANAG Steel Magazine
    magRib: '#383D48',          // Stamped Steel Reinforcement Ribs
    magFloorplate: '#131417',   // Steel Magazine Floorplate
    gripA2: '#131417',          // A2 Ergonomic Pistol Grip with Finger Groove
    ejectionPort: '#090A0C',    // Open Ejection Port Chamber
    deltaRing: '#333742',       // Delta Ring Handguard Connector Collar
    chargingHandle: '#33373E',  // Charging Handle
  }
};

/**
 * Draws the TTI Pit Viper (9mm Combat Master 2011)
 * Features matte carbon tri-top slide with lightning cuts, titanium-bronze fluted match barrel,
 * single-port "Fang" stand-off compensator, skeletonized match hammer & trigger,
 * ambidextrous thumb safety, beveled flared competition magwell, and Dawson fiber-optic sights.
 */
export function drawJohnWickPistol(ctx, x, y, gunAngle, r, opts = {}) {
  const g = JOHN_WICK_WEAPON_GRAPHICS.pistol;
  const isDemo = opts.isDemo || false;
  const recoilOffset = opts.recoilOffset || 0;

  ctx.save();
  ctx.translate(x, y);

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = gunAngle - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }
  ctx.rotate(baseAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.rotate(normDiff);

  // Default base weapon scaling (make the gun 25% bigger)
  const defaultWeaponScale = 1.25;
  ctx.scale(defaultWeaponScale, defaultWeaponScale);

  // Apply weapon customization offset if available
  const custom = (!opts.isThrown && typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.john_wick) 
    ? state.weaponCustomizations.john_wick 
    : null;
  if (custom) {
    ctx.translate(custom.offsetX, custom.offsetY);
    ctx.scale(custom.scale, custom.scale);
    ctx.rotate(custom.angleOffset);
  }

  const isReloading = opts.isReloading || false;
  const reloadTimer = opts.reloadTimer || 0;
  const reloadMaxTime = opts.reloadMaxTime || 75;
  const reloadProgress = isReloading ? Math.max(0, Math.min(1.0, 1 - (reloadTimer / reloadMaxTime))) : 0;

  // Tactical workspace tilt during speed reload
  let reloadAngleOffset = 0;
  let reloadOffsetY = 0;
  if (isReloading) {
    const tiltSine = Math.sin(reloadProgress * Math.PI);
    reloadAngleOffset = -0.28 * tiltSine; // Tilts gun up into workspace
    reloadOffsetY = -3.5 * tiltSine;
  }
  ctx.rotate(reloadAngleOffset);
  ctx.translate(0, reloadOffsetY);

  // Positioning relative to fighter body circle radius (adjusted for default scale)
  const barrelX = (r * 0.85 - recoilOffset) / defaultWeaponScale;
  const barrelY = -3.5 / defaultWeaponScale;

  // ─────────────────────────────────────────────────────────────
  // 1. 2011 LOWER FRAME, STIPPLED GRIP & CONTROLS (Matching Real Photo)
  // ─────────────────────────────────────────────────────────────
  // A. Extended Beavertail Grip Safety with Memory Bump (Rear of grip)
  ctx.fillStyle = '#16171A';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX - 3.5, barrelY + 4.5);
  ctx.quadraticCurveTo(barrelX - 8.5, barrelY + 2.5, barrelX - 10.5, barrelY + 1.2); // Upswept ducktail horn
  ctx.quadraticCurveTo(barrelX - 8.0, barrelY + 5.0, barrelX - 6.2, barrelY + 9.5);
  ctx.lineTo(barrelX - 3.5, barrelY + 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Beavertail memory bump pad
  ctx.strokeStyle = '#2E323A';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(barrelX - 5.5, barrelY + 7.2, 1.8, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  // B. Skeletonized Rose-Gold / Copper Combat Hammer (Cocked Loop Spur - Matching Photo)
  const hammerGrad = ctx.createLinearGradient(barrelX - 9.5, barrelY - 3.2, barrelX - 4.5, barrelY + 1.5);
  hammerGrad.addColorStop(0, '#F0A780'); // Polished rose-gold highlight
  hammerGrad.addColorStop(0.45, '#D47E54'); // Rich copper/bronze core
  hammerGrad.addColorStop(1, '#8C401C'); // Deep metallic shadow

  ctx.fillStyle = hammerGrad;
  ctx.strokeStyle = '#5E260E';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 5.5, barrelY + 1.2);
  ctx.quadraticCurveTo(barrelX - 9.5, barrelY - 0.2, barrelX - 9.5, barrelY - 1.8); // Curved spur
  ctx.quadraticCurveTo(barrelX - 9.0, barrelY - 3.5, barrelX - 6.8, barrelY - 3.5);
  ctx.quadraticCurveTo(barrelX - 4.8, barrelY - 2.5, barrelX - 4.5, barrelY - 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hammer skeletonized circular loop cutout (Hollow center matching photo)
  ctx.fillStyle = '#101114';
  ctx.beginPath();
  ctx.arc(barrelX - 7.0, barrelY - 1.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // C. 2011 Lower Frame & Main Stippled Grip Body (73° Tactical Grip Angle)
  const frameGrad = ctx.createLinearGradient(barrelX - 10, barrelY + 4, barrelX + 6, barrelY + 18);
  frameGrad.addColorStop(0, '#1E2024');
  frameGrad.addColorStop(0.5, '#141517');
  frameGrad.addColorStop(1, '#0C0D0E');

  ctx.fillStyle = frameGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX - 2.5, barrelY + 3.8);
  ctx.lineTo(barrelX - 7.8, barrelY + 16.5); // Backstrap angle
  ctx.lineTo(barrelX - 0.5, barrelY + 17.8); // Grip base
  ctx.lineTo(barrelX + 4.5, barrelY + 5.2);  // Frontstrap angle
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fine Volcanic Micro-Stipple Texture (Subtle uniform textured grip panel)
  ctx.fillStyle = '#0B0C0D';
  ctx.beginPath();
  ctx.moveTo(barrelX - 2.0, barrelY + 5.5);
  ctx.lineTo(barrelX - 6.8, barrelY + 15.5);
  ctx.lineTo(barrelX - 1.2, barrelY + 16.8);
  ctx.lineTo(barrelX + 3.6, barrelY + 6.5);
  ctx.closePath();
  ctx.fill();

  // Organic micro-stipple grain highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let sY = 0; sY < 6; sY++) {
    const rowY = barrelY + 6.5 + sY * 1.8;
    const rowX = barrelX - 1.2 - sY * 0.7;
    ctx.fillRect(rowX, rowY, 1.0, 0.8);
    ctx.fillRect(rowX + 2.0, rowY + 0.4, 1.0, 0.8);
  }

  // Realistic Grip Bushing Screw (Single subtle hex bushing - matching photo)
  ctx.fillStyle = '#222428';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(barrelX - 3.8, barrelY + 12.8, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4B515E';
  ctx.beginPath();
  ctx.arc(barrelX - 3.8, barrelY + 12.8, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Front Accessory Picatinny Rail on Frame Dust Cover
  ctx.fillStyle = '#181A1D';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX + 7.5, barrelY + 3.8, 15.5, 2.2);
  ctx.fill();
  ctx.stroke();

  // Rail recoil slots & beveled dust cover contour cut
  ctx.fillStyle = '#262930';
  ctx.fillRect(barrelX + 10.0, barrelY + 4.2, 1.4, 1.4);
  ctx.fillRect(barrelX + 14.5, barrelY + 4.2, 1.4, 1.4);
  ctx.fillRect(barrelX + 19.0, barrelY + 4.2, 1.4, 1.4);

  // Beveled dust cover horizontal groove (matching photo)
  ctx.strokeStyle = '#353942';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX + 10.0, barrelY + 2.4);
  ctx.lineTo(barrelX + 23.0, barrelY + 2.4);
  ctx.stroke();

  // D. Flared Competition Magwell (Anodized Black Aluminum Funnel)
  const magwellGrad = ctx.createLinearGradient(0, barrelY + 15, 0, barrelY + 19);
  magwellGrad.addColorStop(0, '#22252A');
  magwellGrad.addColorStop(0.5, '#16171A');
  magwellGrad.addColorStop(1, '#0B0C0E');

  ctx.fillStyle = magwellGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(barrelX - 9.8, barrelY + 15.0);
  ctx.lineTo(barrelX + 1.2, barrelY + 16.5);
  ctx.lineTo(barrelX + 0.2, barrelY + 19.0);
  ctx.lineTo(barrelX - 10.8, barrelY + 17.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Magwell retention pin (Small silver pin)
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(barrelX - 5.0, barrelY + 16.8, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Extended Black 2011 Basepad (Below Magwell)
  ctx.fillStyle = '#101113';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 8.5, barrelY + 18.0);
  ctx.lineTo(barrelX - 1.2, barrelY + 19.2);
  ctx.lineTo(barrelX - 2.2, barrelY + 22.0);
  ctx.lineTo(barrelX - 9.5, barrelY + 20.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Basepad retention pin / locking plate
  ctx.fillStyle = '#475569';
  ctx.fillRect(barrelX - 4.2, barrelY + 20.2, 1.2, 1.0);

  // F. High-Grip Square Trigger Guard with Double Undercut
  ctx.fillStyle = '#0B0C0E';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(barrelX + 2.8, barrelY + 4.2);
  ctx.lineTo(barrelX + 9.2, barrelY + 4.2);  // Top horizontal guard
  ctx.lineTo(barrelX + 9.2, barrelY + 10.8); // Front straight vertical face
  ctx.lineTo(barrelX + 1.6, barrelY + 10.8); // Flat bottom bar
  ctx.quadraticCurveTo(barrelX + 1.0, barrelY + 7.0, barrelX + 2.8, barrelY + 4.2); // Double undercut transition
  ctx.fill();
  ctx.stroke();

  // Checkering on front face of trigger guard
  ctx.strokeStyle = '#3A3E47';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(barrelX + 9.2, barrelY + 5.5); ctx.lineTo(barrelX + 9.2, barrelY + 9.8);
  ctx.stroke();

  // G. Machined Silver Flat-Face Match Trigger with 3 Skeleton Slots (Matching Photo)
  const trigGrad = ctx.createLinearGradient(barrelX + 3.8, barrelY + 5.0, barrelX + 6.2, barrelY + 10.0);
  trigGrad.addColorStop(0, '#FFFFFF');
  trigGrad.addColorStop(0.45, '#E2E8F0');
  trigGrad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = trigGrad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(barrelX + 3.6, barrelY + 5.0, 2.5, 5.0, 0.4);
  ctx.fill();
  ctx.stroke();

  // Trigger 3 horizontal skeleton lightening slots
  ctx.fillStyle = '#121316';
  ctx.beginPath();
  ctx.roundRect(barrelX + 4.0, barrelY + 5.6, 1.7, 0.8, 0.3);
  ctx.roundRect(barrelX + 4.0, barrelY + 7.1, 1.7, 0.8, 0.3);
  ctx.roundRect(barrelX + 4.0, barrelY + 8.6, 1.7, 0.8, 0.3);
  ctx.fill();

  // H. Ambidextrous Thumb Safety Lever & Takedown Slide Stop Pin
  ctx.fillStyle = '#2C2F36';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(barrelX - 4.5, barrelY + 3.6, 5.2, 1.8, 0.6);
  ctx.fill();
  ctx.stroke();

  // Takedown / Slide Stop Pin
  ctx.fillStyle = '#26282E';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(barrelX + 3.5, barrelY + 3.8, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // TTI laser engraving text "TTI 09PV" on frame dust cover
  ctx.fillStyle = '#525B6A';
  ctx.fillRect(barrelX + 4.6, barrelY + 4.4, 2.6, 0.6);

  // ─────────────────────────────────────────────────────────────
  // 2. SPEED RELOAD MAGAZINE INSERTION ANIMATION
  // ─────────────────────────────────────────────────────────────
  if (isReloading && reloadProgress >= 0.20 && reloadProgress <= 0.75) {
    const insertT = Math.min(1.0, (reloadProgress - 0.20) / 0.45); // 0 to 1
    const magSlideY = (1 - insertT) * 16; // Slides upward into magwell

    ctx.save();
    ctx.translate(barrelX - 5.5, barrelY + 16.5 + magSlideY);

    // Magazine Body (Steel tube sliding into grip with round count witness holes)
    ctx.fillStyle = '#1A1C20';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-2.8, -7, 5.6, 13, 0.6);
    ctx.fill();
    ctx.stroke();

    // Witness holes
    ctx.fillStyle = '#C87248'; // Copper brass visible through witness holes
    for (let w = -4; w <= 3; w += 2.5) {
      ctx.beginPath();
      ctx.arc(0, w, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Extended Black Basepad
    ctx.fillStyle = '#111214';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.roundRect(-3.5, 5, 7.0, 3.5, 0.6);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ROSE-GOLD TITANIUM-NITRIDE MATCH BARREL (Under Slide)
  // ─────────────────────────────────────────────────────────────
  const barrelGrad = ctx.createLinearGradient(0, barrelY - 2.5, 0, barrelY + 2.5);
  barrelGrad.addColorStop(0, '#F2AE8B'); // White-copper metallic sheen
  barrelGrad.addColorStop(0.35, '#C87248'); // Titanium-nitride rose gold
  barrelGrad.addColorStop(0.85, '#9E5B38'); // Copper shadow
  barrelGrad.addColorStop(1, '#5C2810');

  ctx.fillStyle = barrelGrad;
  ctx.strokeStyle = '#4A2310';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.rect(barrelX + 6, barrelY - 2.2, 20, 4.2);
  ctx.fill();
  ctx.stroke();

  // Longitudinal Match Barrel Fluting Line
  ctx.strokeStyle = '#7A3516';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX + 8, barrelY - 0.5); ctx.lineTo(barrelX + 24, barrelY - 0.5);
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 4. TWO-TONE BRUSHED BRONZE/TUNGSTEN TITANIUM SLIDE & COMPENSATOR
  // ─────────────────────────────────────────────────────────────
  const flashTimer = isReloading ? 0 : (opts.flashTimer || 0);
  let slideBlowback = flashTimer > 0 ? Math.sin((flashTimer / 4) * Math.PI) * 7 : 0;
  if (isReloading) {
    if (reloadProgress < 0.72) {
      slideBlowback = 6.5;
    } else {
      const slapProgress = (reloadProgress - 0.72) / 0.28;
      slideBlowback = Math.max(0, 6.5 * (1 - Math.min(1.0, slapProgress * 4.0)));
    }
  }

  ctx.save();
  ctx.translate(-slideBlowback, 0); // Slide kicks backward on fire / locks back on reload

  // A. Slide Matte Black Top Flat & Lower Frame Rail
  ctx.fillStyle = '#16171A';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(barrelX - 5.5, barrelY - 4.6, 30.5, 8.8, [1.2, 0.5, 0.5, 1.2]);
  ctx.fill();
  ctx.stroke();

  // B. Signature Brushed Bronze/Tungsten Side Panel (Warm metallic luster - matching photo)
  const champGrad = ctx.createLinearGradient(0, barrelY - 3.6, 0, barrelY + 3.4);
  champGrad.addColorStop(0, '#7A7367');   // Upper metallic sheen
  champGrad.addColorStop(0.35, '#585248'); // Dark brushed bronze-tungsten body
  champGrad.addColorStop(0.85, '#433E37'); // Lower shadow tone
  champGrad.addColorStop(1, '#2E2B26');

  ctx.fillStyle = champGrad;
  ctx.strokeStyle = '#8E8578'; // Polished chamfer edge
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(barrelX - 4.5, barrelY - 3.4, 29.0, 6.8, 0.6);
  ctx.fill();
  ctx.stroke();

  // Subtle brushed horizontal titanium texture lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(barrelX - 3.5, barrelY - 1.2); ctx.lineTo(barrelX + 23.5, barrelY - 1.2);
  ctx.moveTo(barrelX - 3.5, barrelY + 1.2); ctx.lineTo(barrelX + 23.5, barrelY + 1.2);
  ctx.stroke();

  // C. Polished Rose-Gold / Copper Chamber Hood (Flush Inside Top Slide Cut - Matching Photo)
  const chamberGrad = ctx.createLinearGradient(0, barrelY - 4.5, 0, barrelY - 1.2);
  chamberGrad.addColorStop(0, '#7A3516');   // Top edge shadow
  chamberGrad.addColorStop(0.35, '#F2AE8B'); // Cylindrical high-gloss specular highlight
  chamberGrad.addColorStop(0.70, '#C87248'); // Rich titanium rose-gold
  chamberGrad.addColorStop(1, '#5E260E');   // Bottom chamber shadow

  ctx.fillStyle = chamberGrad;
  ctx.strokeStyle = '#3D1607';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.rect(barrelX + 5.0, barrelY - 4.5, 5.8, 3.4);
  ctx.fill();
  ctx.stroke();

  // Chamber hood step bevel line
  ctx.strokeStyle = '#F5BF9F';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(barrelX + 5.0, barrelY - 4.3); ctx.lineTo(barrelX + 10.8, barrelY - 4.3);
  ctx.stroke();

  // D. Laser-Engraved "PIT VIPER" Center Mark & TTI Triangle Shield Logo
  // Left side: Stylized PIT VIPER text plate
  ctx.fillStyle = '#AEA79C';
  ctx.font = 'bold 3.2px sans-serif';
  ctx.beginPath();
  ctx.moveTo(barrelX - 0.5, barrelY - 1.2);
  ctx.lineTo(barrelX + 3.8, barrelY - 1.2);
  ctx.lineTo(barrelX + 3.2, barrelY + 0.2);
  ctx.lineTo(barrelX - 1.0, barrelY + 0.2);
  ctx.closePath();
  ctx.fill();

  // Right side: TTI Triangle Shield Logo silhouette (Right of chamber)
  ctx.fillStyle = '#3A3833';
  ctx.beginPath();
  ctx.moveTo(barrelX + 12.0, barrelY - 2.8);
  ctx.lineTo(barrelX + 14.2, barrelY - 2.8);
  ctx.lineTo(barrelX + 13.1, barrelY - 0.8);
  ctx.closePath();
  ctx.fill();

  // E. Forward Elongated Lightning Port Window (Pill-shaped slot exposing Copper Fluted Barrel)
  const windowX = barrelX + 16.0;
  const windowY = barrelY - 2.8;
  const windowW = 5.2;
  const windowH = 1.8;

  // Window opening showing round copper barrel tube
  ctx.fillStyle = '#C87248';
  ctx.beginPath();
  ctx.roundRect(windowX, windowY, windowW, windowH, 0.8);
  ctx.fill();

  // Barrel metallic specular shine inside window
  ctx.fillStyle = '#F2AE8B';
  ctx.fillRect(windowX + 0.6, windowY + 0.3, windowW - 1.2, 0.5);

  // Barrel center flute groove
  ctx.fillStyle = '#7A3516';
  ctx.fillRect(windowX, windowY + 0.9, windowW, 0.5);

  // Window dark beveled border
  ctx.strokeStyle = '#181A1D';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(windowX, windowY, windowW, windowH, 0.8);
  ctx.stroke();

  // F. Angled Cocking Serrations (~68° Forward Slant - Matching Real Pitch & Spacing)
  ctx.strokeStyle = '#141517';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  // Rear Serrations (6 clean angled channels)
  for (let i = 0; i < 6; i++) {
    const sX = barrelX - 3.2 + i * 1.2;
    ctx.moveTo(sX + 0.8, barrelY - 3.3);
    ctx.lineTo(sX - 0.4, barrelY + 3.2);
  }
  // Front Lower Serrations (6 clean angled channels below window)
  for (let i = 0; i < 6; i++) {
    const sX = barrelX + 15.2 + i * 1.2;
    ctx.moveTo(sX + 0.6, barrelY + 0.6);
    ctx.lineTo(sX - 0.4, barrelY + 3.2);
  }
  ctx.stroke();

  // G. Integrated Front Stand-Off Compensator ("The Fang" - Matching Real Photo)
  const compGrad = ctx.createLinearGradient(barrelX + 24.5, barrelY - 4.5, barrelX + 31.0, barrelY + 3.8);
  compGrad.addColorStop(0, '#7A7367');
  compGrad.addColorStop(0.4, '#585248');
  compGrad.addColorStop(0.85, '#262930');
  compGrad.addColorStop(1, '#111215');

  ctx.fillStyle = compGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX + 24.5, barrelY - 4.5);
  ctx.lineTo(barrelX + 30.5, barrelY - 4.5);
  ctx.lineTo(barrelX + 31.0, barrelY - 2.4); // Top stand-off "Fang" prong
  ctx.lineTo(barrelX + 29.5, barrelY);       // Inward angular fang notch
  ctx.lineTo(barrelX + 31.0, barrelY + 2.4); // Bottom stand-off "Fang" prong
  ctx.lineTo(barrelX + 30.5, barrelY + 3.8);
  ctx.lineTo(barrelX + 24.5, barrelY + 3.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Compensator matching angled serrations (3 cuts on side of compensator)
  ctx.strokeStyle = '#181A1D';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const sX = barrelX + 25.5 + i * 1.2;
    ctx.moveTo(sX + 0.6, barrelY - 3.2);
    ctx.lineTo(sX - 0.4, barrelY + 3.0);
  }
  ctx.stroke();

  // Compensator Set Pin
  ctx.fillStyle = '#8E8578';
  ctx.beginPath();
  ctx.arc(barrelX + 29.2, barrelY - 1.0, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Compensator Top Vertical Gas Exhaust Port Chimney
  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(barrelX + 25.2, barrelY - 4.5, 3.2, 1.4);

  // ─────────────────────────────────────────────────────────────
  // 5. DAWSON PRECISION SIGHTS & LIME-GREEN FIBER-OPTIC ROD
  // ─────────────────────────────────────────────────────────────
  // Rear Dawson Combat Sight (Low-profile matte black with elevation screw)
  ctx.fillStyle = '#141518';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 4.8, barrelY - 6.2, 4.2, 2.0, 0.4);
  ctx.fill();
  ctx.stroke();

  // Rear sight elevation screw
  ctx.fillStyle = '#475569';
  ctx.fillRect(barrelX - 3.8, barrelY - 5.6, 1.0, 0.7);

  // Front Sight Low-Profile Black Dovetail Housing (Mounted directly on top flat)
  ctx.fillStyle = '#111215';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.rect(barrelX + 25.5, barrelY - 5.8, 3.8, 1.5);
  ctx.fill();
  ctx.stroke();

  // Horizontal Cylindrical Lime-Green Fiber-Optic Rod (Light pipe - Matching Photo!)
  ctx.fillStyle = '#84CC16'; // Vivid lime-green
  ctx.beginPath();
  ctx.roundRect(barrelX + 25.8, barrelY - 5.8, 3.4, 1.2, 0.5);
  ctx.fill();

  // Bright White-Yellow Fiber-Optic Glow Core
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.roundRect(barrelX + 26.2, barrelY - 5.5, 2.6, 0.6, 0.3);
  ctx.fill();

  ctx.restore(); // End slide blowback offset


  // Ejected Brass Casing (flies out of ejection port in preview mode; in-game shells use physics system)
  const casingTimer = opts.casingTimer || 0;
  if (casingTimer > 0 && (opts.inPreview || (typeof state !== 'undefined' && state.gameState !== 'playing'))) {
    const maxCasingFrames = 12;
    const t = 1 - (casingTimer / maxCasingFrames); // 0 → 1 over 12 frames

    // Arcing trajectory: eject upward-backward with gravity pull
    const ejectX = barrelX + 6 + t * -4;             // Drift slightly backward
    const ejectY = barrelY - 6 - t * 22 + t * t * 18; // Parabolic arc (up then down)
    const tumbleAngle = t * 5.5;                       // Fast tumble spin
    const casingAlpha = Math.max(0, 1 - t * 0.85);    // Fade out near end

    ctx.save();
    ctx.globalAlpha = casingAlpha;
    ctx.translate(ejectX, ejectY);
    ctx.rotate(tumbleAngle);

    // Brass casing body (larger — 4×8px)
    ctx.fillStyle = '#D4A840';
    ctx.strokeStyle = '#7A5A10';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-2, -4, 4, 8, 1);
    ctx.fill();
    ctx.stroke();

    // Rim at base
    ctx.fillStyle = '#C49A30';
    ctx.beginPath();
    ctx.roundRect(-2.5, 3, 5, 1.5, 0.5);
    ctx.fill();

    // Primer circle on the base
    ctx.fillStyle = '#9E7A18';
    ctx.beginPath();
    ctx.arc(0, 3.5, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight streak on casing body
    ctx.fillStyle = 'rgba(255, 230, 160, 0.5)';
    ctx.fillRect(-0.5, -3, 1, 5);

    ctx.restore();
  }

  // 5. Cinema-Grade Dynamic Muzzle Flash (Compensator Vents, Conical Blast Plume, Starburst & Sparks)
  if (flashTimer > 0) {
    ctx.save();
    // Position flash at the tip of the TTI Pit Viper compensator
    ctx.translate(barrelX + 28, barrelY);

    const maxFlash = 5;
    const progress = Math.min(1.0, flashTimer / maxFlash); // 1.0 down to 0.0
    const alpha = Math.pow(progress, 0.6); // Non-linear decay for punchy flash

    // A. Top Port Gas Jets (Compensator Vents gas upward)
    ctx.fillStyle = `rgba(255, 190, 60, ${0.75 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-12, -14 * progress);
    ctx.lineTo(-8, -4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(-7, -11 * progress);
    ctx.lineTo(-4, -4);
    ctx.fill();

    // B. Large Outer Radial Fire Glow (Concentric radial gradient, Zero shadowBlur)
    const glowR = 36 * progress;
    const outerGlow = ctx.createRadialGradient(4, 0, 0, 4, 0, glowR);
    outerGlow.addColorStop(0, `rgba(255, 230, 150, ${0.9 * alpha})`);
    outerGlow.addColorStop(0.35, `rgba(251, 146, 60, ${0.65 * alpha})`);
    outerGlow.addColorStop(0.7, `rgba(239, 68, 68, ${0.25 * alpha})`);
    outerGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(4, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // C. Forward Conical Muzzle Plume (High-velocity expansion cone)
    ctx.fillStyle = `rgba(254, 215, 170, ${0.85 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(28 * progress, -9 * progress);
    ctx.lineTo(38 * progress, 0);
    ctx.lineTo(28 * progress, 9 * progress);
    ctx.lineTo(0, 3.5);
    ctx.closePath();
    ctx.fill();

    // D. Multi-Spoke Starburst Flare (8-point jagged star stretched forward)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.9 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const starPoints = 8;
    const outerStarR = 24 * progress;
    const innerStarR = 6 * progress;
    for (let i = 0; i < starPoints * 2; i++) {
      const spAngle = (i * Math.PI) / starPoints;
      const R = i % 2 === 0 ? outerStarR : innerStarR;
      const stretchX = (i % 2 === 0 && Math.cos(spAngle) > 0) ? 1.6 : 1.0;
      const sx = Math.cos(spAngle) * R * stretchX;
      const sy = Math.sin(spAngle) * R;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // E. Incandescent Hot-White Core Diamond
    ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(5 * progress, -4.5 * progress);
    ctx.lineTo(16 * progress, 0);
    ctx.lineTo(5 * progress, 4.5 * progress);
    ctx.closePath();
    ctx.fill();

    // F. High-Velocity Side Fire Sparks (Flying outward along firing cone)
    ctx.fillStyle = `rgba(254, 240, 138, ${0.95 * alpha})`;
    for (let i = 0; i < 5; i++) {
      const sparkAngle = (Math.sin(i * 99 + flashTimer) * 0.45);
      const sparkDist = (12 + (i * 7)) * progress;
      const sparkSize = (1.2 + (i % 3) * 0.6) * progress;
      ctx.beginPath();
      ctx.arc(Math.cos(sparkAngle) * sparkDist, Math.sin(sparkAngle) * sparkDist, sparkSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws John Wick's infamous No. 2 Graphite Pencil
 * Features sharp graphite tip, sharpened wood taper, yellow hexagonal shaft,
 * aluminum ferrule, and pink eraser.
 */
export function drawJohnWickPencil(ctx, x, y, gunAngle, r, opts = {}) {
  const p = JOHN_WICK_WEAPON_GRAPHICS.pencil;

  ctx.save();
  ctx.translate(x, y);

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = gunAngle - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }
  ctx.rotate(baseAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.rotate(normDiff);

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
  const windupF = cfg.cqcPencilWindupFrames ?? 14;
  const thrustF = cfg.cqcPencilThrustFrames ?? 8;
  const pullbackF = cfg.cqcPencilPullbackFrames ?? 14;
  const totalF = opts.stabMaxTime || cfg.cqcPencilStabDuration || (windupF + thrustF + pullbackF);

  const windupRatio = Math.min(0.85, Math.max(0.1, windupF / totalF));
  const thrustRatio = Math.min(0.95, Math.max(windupRatio + 0.05, (windupF + thrustF) / totalF));

  const stabTimer = opts.stabTimer || 0;
  let pencilX = r * 0.88;
  let pencilY = -r * 0.08;
  let pencilAngleOffset = 0;
  let isThrusting = false;

  if (stabTimer > 0) {
    const stabProgress = Math.min(1.0, Math.max(0.0, 1.0 - (stabTimer / totalF)));
    if (stabProgress < windupRatio) {
      // 1. Chamber / Pullback Phase: Smoothly retract arm & pencil back to chest
      const chamberT = stabProgress / windupRatio;
      const easeChamber = (1 - Math.cos(chamberT * Math.PI)) * 0.5; // Smooth ease-in-out
      pencilX = r * (0.88 - 0.45 * easeChamber); // Retracts to r * 0.43
      pencilY = -r * (0.08 + 0.06 * easeChamber);
      pencilAngleOffset = -0.10 * easeChamber;
    } else if (stabProgress < thrustRatio) {
      // 2. Explosive Forward Stab Phase: Plunges pencil tip straight forward deep into target
      isThrusting = true;
      const thrustT = (stabProgress - windupRatio) / (thrustRatio - windupRatio);
      const easeThrust = 1 - Math.pow(1 - thrustT, 3); // Snappy ease-out cubic
      pencilX = r * (0.43 + 1.42 * easeThrust); // Plunges forward to r * 1.85!
      pencilY = -r * (0.14 - 0.08 * easeThrust);
      pencilAngleOffset = 0.05 * (1 - easeThrust);
    } else {
      // 3. Snappy Pullback Phase: Retracts pencil cleanly back to guard position
      const pullT = (stabProgress - thrustRatio) / (1.0 - thrustRatio);
      const easePull = (1 - Math.cos(pullT * Math.PI)) * 0.5; // Smooth ease-in-out
      pencilX = r * (1.85 - 0.97 * easePull); // Retracts back to r * 0.88
      pencilY = -r * (0.06 + 0.02 * easePull);
      pencilAngleOffset = 0;
    }
  }

  // Linear speed streak / thrust motion lines trailing the graphite tip during active forward plunge
  if (isThrusting) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pencilX - 25, pencilY);
    ctx.lineTo(pencilX + 22, pencilY);
    ctx.stroke();

    // Top and bottom secondary needle speed streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pencilX - 18, pencilY - 3);
    ctx.lineTo(pencilX + 16, pencilY - 3);
    ctx.moveTo(pencilX - 18, pencilY + 3);
    ctx.lineTo(pencilX + 16, pencilY + 3);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(pencilX, pencilY);
  ctx.rotate(pencilAngleOffset);

  // Scaled from config
  const pencilScale = cfg.pencilScale || 1.40;
  ctx.scale(pencilScale, pencilScale);

  // 1. Pink Rubber Eraser (Back)
  ctx.fillStyle = p.eraserPink;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(-22, -2.2, 5, 4.4, [2, 0, 0, 2]);
  ctx.fill();
  ctx.stroke();

  // 2. Silver Ferrule (Metal Band with Grooves)
  ctx.fillStyle = p.ferruleSilver;
  ctx.beginPath();
  ctx.rect(-17, -2.4, 4.5, 4.8);
  ctx.fill();
  ctx.stroke();

  // Ferrule crimp lines
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-15.5, -2.4); ctx.lineTo(-15.5, 2.4);
  ctx.moveTo(-13.5, -2.4); ctx.lineTo(-13.5, 2.4);
  ctx.stroke();

  // 3. Hexagonal Yellow Wooden Shaft
  ctx.fillStyle = p.shaftYellow;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(-12.5, -2.2, 22.5, 4.4);
  ctx.fill();
  ctx.stroke();

  // Hexagonal facet highlight/shadow line
  ctx.strokeStyle = p.shaftFacet;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-12.5, 0);
  ctx.lineTo(10.0, 0);
  ctx.stroke();

  // 4. Sharpened Wood Collar
  ctx.fillStyle = p.woodCollar;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(10.0, -2.2);
  ctx.lineTo(18.0, 0);
  ctx.lineTo(10.0, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Sharp Graphite Tip
  ctx.fillStyle = p.graphiteTip;
  ctx.beginPath();
  ctx.moveTo(15.5, -1.1);
  ctx.lineTo(22.5, 0);
  ctx.lineTo(15.5, 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Universal weapon preview dispatcher for John Wick in the Weapon Menu
 */
export function drawJohnWickWeapon(ctx, x, y, gunAngle, r, opts = {}) {
  const weaponIndex = (typeof state !== 'undefined' && state.johnWickWeaponIndex !== undefined)
    ? state.johnWickWeaponIndex
    : 0;

  if (weaponIndex === 0) {
    drawJohnWickPistol(ctx, x, y, gunAngle, r, opts);
  } else if (weaponIndex === 1) {
    drawJohnWickShotgun(ctx, x, y, gunAngle, r, opts);
  } else if (weaponIndex === 2) {
    drawJohnWickRifle(ctx, x, y, gunAngle, r, opts);
  } else {
    drawJohnWickPencil(ctx, x, y, gunAngle, r, opts);
  }
}

// ─────────────────────────────────────────────
// Reusable Gradient Caches for High-Performance Projectile Rendering (Zero per-frame allocations)
// ─────────────────────────────────────────────
let _cachedBulletTrailGrad = null;
let _cachedBulletCoreGrad = null;
let _cachedPelletStreakGrad = null;
let _cachedRifleTrailGrad = null;
let _cachedRifleCoreGrad = null;

function _getBulletTrailGrad(ctx) {
  if (!_cachedBulletTrailGrad) {
    _cachedBulletTrailGrad = ctx.createLinearGradient(-32, 0, 0, 0);
    _cachedBulletTrailGrad.addColorStop(0, 'rgba(251, 191, 36, 0.0)');
    _cachedBulletTrailGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.3)');
    _cachedBulletTrailGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0.8)');
  }
  return _cachedBulletTrailGrad;
}

function _getBulletCoreGrad(ctx) {
  if (!_cachedBulletCoreGrad) {
    _cachedBulletCoreGrad = ctx.createLinearGradient(-7, 0, 7, 0);
    _cachedBulletCoreGrad.addColorStop(0, '#D97706'); // Copper jacket base
    _cachedBulletCoreGrad.addColorStop(0.6, '#F59E0B'); // Polished gold middle
    _cachedBulletCoreGrad.addColorStop(1.0, '#FEF08A'); // Hot-white tip
  }
  return _cachedBulletCoreGrad;
}

function _getPelletStreakGrad(ctx) {
  if (!_cachedPelletStreakGrad) {
    _cachedPelletStreakGrad = ctx.createLinearGradient(-18, 0, 0, 0);
    _cachedPelletStreakGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
    _cachedPelletStreakGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.5)');
    _cachedPelletStreakGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0.9)');
  }
  return _cachedPelletStreakGrad;
}

function _getRifleTrailGrad(ctx) {
  if (!_cachedRifleTrailGrad) {
    _cachedRifleTrailGrad = ctx.createLinearGradient(-28, 0, 0, 0);
    _cachedRifleTrailGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    _cachedRifleTrailGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.35)');
    _cachedRifleTrailGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0.85)');
  }
  return _cachedRifleTrailGrad;
}

function _getRifleCoreGrad(ctx) {
  if (!_cachedRifleCoreGrad) {
    _cachedRifleCoreGrad = ctx.createLinearGradient(-8, 0, 8, 0);
    _cachedRifleCoreGrad.addColorStop(0, '#D97706');    // Copper jacket base
    _cachedRifleCoreGrad.addColorStop(0.65, '#F59E0B'); // Polished brass middle
    _cachedRifleCoreGrad.addColorStop(1.0, '#10B981');  // Green-tip M855 steel penetrator tip
  }
  return _cachedRifleCoreGrad;
}

/**
 * Draws John Wick's high-velocity 9mm tactical bullet projectile
 */
export function drawJohnWickBullet(ctx, p) {
  const vx = p.vx || 0;
  const vy = p.vy || 0;
  const angle = Math.atan2(vy, vx);
  const len = 14;  // Length of the bullet core
  const width = 3.5; // Width of the bullet core

  // 1. Persistent World-Space Tracer Trail (using projectile path history)
  if (p.history && p.history.length > 1) {
    ctx.save();
    
    // Draw outer golden-amber trace line
    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)'; // Amber gold glow
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw inner hot-yellow highlight line on the final segments for high-velocity look
    const sliceCount = Math.max(1, p.history.length - 4);
    ctx.beginPath();
    ctx.moveTo(p.history[sliceCount - 1].x, p.history[sliceCount - 1].y);
    for (let i = sliceCount; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)'; // Yellow-white tracer core
    ctx.lineWidth = 1.0;
    ctx.stroke();
    
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // 1. High-speed Motion Trail (Fading gradient streak trailing backward - Reused Cache)
  const trailLen = 32;
  ctx.fillStyle = _getBulletTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(-trailLen, 0);
  ctx.lineTo(-len / 2, -width * 0.8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-len / 2, width * 0.8);
  ctx.closePath();
  ctx.fill();

  // 2. Copper/Gold Bullet Core (Sharp metal jacket bullet - Reused Cache)
  ctx.fillStyle = _getBulletCoreGrad(ctx);
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 0.8;

  ctx.beginPath();
  // Flat back
  ctx.moveTo(-len / 2, -width / 2);
  // Straight body
  ctx.lineTo(len * 0.15, -width / 2);
  // Pointed aerodynamic tip
  ctx.quadraticCurveTo(len / 2, 0, len / 2, 0);
  ctx.quadraticCurveTo(len * 0.15, width / 2, len * 0.15, width / 2);
  // Straight body bottom
  ctx.lineTo(-len / 2, width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Inner Hot-White core shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-len * 0.2, -width * 0.25);
  ctx.lineTo(len * 0.2, 0);
  ctx.lineTo(-len * 0.2, width * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the Benelli M4 Tactical Shotgun (12 Gauge Combat Master)
 * Features matte Parkerized receiver with MIL-STD-1913 Picatinny rail, chrome bolt carrier with
 * knurled charging handle, oversized tactical bolt release, full-length 7+1 magazine tube with barrel clamp,
 * 18.5" heavy steel barrel with ventilated heat shield, LPA ghost-ring sights with protective wings,
 * skeletonized collapsible stock with guide rails, and dynamic ribbed racking pump forend.
 */
export function drawJohnWickShotgun(ctx, x, y, gunAngle, r, opts = {}) {
  const g = JOHN_WICK_WEAPON_GRAPHICS.shotgun;
  const recoilOffset = opts.recoilOffset || 0;
  const flashTimer = opts.flashTimer || 0;
  const casingTimer = opts.casingTimer || 0;
  const isReloading = opts.isReloading || false;
  const isSwitching = opts.isSwitching || false;
  const switchTimer = opts.switchTimer || 0;
  const switchMaxTime = opts.switchMaxTime || 36;
  const reloadTimer = opts.reloadTimer || 0;
  const reloadMaxTime = opts.reloadMaxTime || 80;

  ctx.save();
  ctx.translate(x, y);

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = gunAngle - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }
  ctx.rotate(baseAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.rotate(normDiff);

  const defaultScale = 1.20;
  ctx.scale(defaultScale, defaultScale);

  // Apply weapon customization offset if available
  const custom = (!opts.isThrown && typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.john_wick) 
    ? state.weaponCustomizations.john_wick 
    : null;
  if (custom) {
    ctx.translate(custom.offsetX, custom.offsetY);
    ctx.scale(custom.scale, custom.scale);
    ctx.rotate(custom.angleOffset);
  }

  // Weapon switch & reload workspace motion
  let switchAngleOffset = 0;
  let switchOffsetY = 0;
  let pumpOffset = 0;

  if (isSwitching && switchTimer > 0) {
    const switchProgress = 1.0 - (switchTimer / switchMaxTime); // 0 to 1

    // 3-Phase Tactical Lift & Crack Animation:
    // Phase 1 (0.00 - 0.28): Rapid high-ready lift (shotgun tilts up ~48° and raises into chest)
    // Phase 2 (0.28 - 0.68): Held high while the forend aggressively racks back (-13.5px) and snaps forward
    // Phase 3 (0.68 - 1.00): Smooth level down to horizontal shoulder aim stance
    if (switchProgress < 0.28) {
      const liftT = switchProgress / 0.28;
      const easeLift = Math.sin(liftT * Math.PI * 0.5); // Ease out curve
      switchAngleOffset = -0.82 * easeLift; // Lift up ~47 degrees
      switchOffsetY = -10.5 * easeLift;
      pumpOffset = 0;
    } else if (switchProgress < 0.68) {
      const rackT = (switchProgress - 0.28) / 0.40; // 0 to 1
      // Held up high with a tiny mechanical kickback when racked
      const rackSine = Math.sin(rackT * Math.PI);
      switchAngleOffset = -0.82 - 0.08 * rackSine;
      switchOffsetY = -10.5 - 1.5 * rackSine;
      // Aggressive pump stroke: slides back -13.5px and forcefully snaps forward
      pumpOffset = -Math.sin(rackT * Math.PI) * 13.5;
    } else {
      const lowerT = (switchProgress - 0.68) / 0.32; // 0 to 1
      const easeLower = 1.0 - Math.sin(lowerT * Math.PI * 0.5);
      switchAngleOffset = -0.82 * easeLower;
      switchOffsetY = -10.5 * easeLower;
      pumpOffset = 0;
    }
  } else if (isReloading && reloadTimer > 0) {
    const reloadProgress = 1.0 - (reloadTimer / reloadMaxTime);
    const tiltSine = Math.sin(reloadProgress * Math.PI);
    switchAngleOffset = -0.22 * tiltSine;
    switchOffsetY = -3.0 * tiltSine;

    if (reloadProgress > 0.65) {
      const rackP = (reloadProgress - 0.65) / 0.35;
      pumpOffset = -Math.sin(rackP * Math.PI) * 7.0;
    }
  }

  // Visual recoil kickback and muzzle climb
  if (recoilOffset > 0) {
    const climb = -(recoilOffset / 20.0) * 0.16;
    ctx.rotate(climb);
  }

  // Auto pump racking on recoil recovery
  const firePumpOffset = (recoilOffset > 0) ? -Math.sin((recoilOffset / 20.0) * Math.PI) * 9.5 : 0;

  ctx.rotate(switchAngleOffset);
  ctx.translate(0, switchOffsetY);

  const barrelX = (r * 0.85 - recoilOffset) / defaultScale;
  const barrelY = -3.0 / defaultScale;

  // ─────────────────────────────────────────────────────────────
  // 1. SKELETONIZED COLLAPSIBLE STOCK & PISTOL GRIP
  // ─────────────────────────────────────────────────────────────
  // A. Twin Telescoping Steel Stock Guide Rods
  ctx.fillStyle = g.stockGuideRod;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX - 25, barrelY - 2.8, 14, 2.0); // Top rod
  ctx.rect(barrelX - 25, barrelY + 1.2, 14, 2.0); // Bottom rod
  ctx.fill();
  ctx.stroke();

  // Stock locking notches
  ctx.fillStyle = '#1A1C20';
  ctx.fillRect(barrelX - 21, barrelY - 2.8, 1.2, 2.0);
  ctx.fillRect(barrelX - 17, barrelY - 2.8, 1.2, 2.0);

  // B. Skeletonized Polymer Buttstock Body
  ctx.fillStyle = g.stockBody;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX - 25, barrelY - 5.5);
  ctx.lineTo(barrelX - 29, barrelY - 5.5);
  ctx.lineTo(barrelX - 30, barrelY + 12.0);
  ctx.lineTo(barrelX - 25, barrelY + 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stock cheek rest upper bevel
  ctx.fillStyle = '#22252C';
  ctx.fillRect(barrelX - 29, barrelY - 5.5, 4.0, 3.2);

  // Textured Rubber Recoil Buttpad
  ctx.fillStyle = g.stockPad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 32.5, barrelY - 6.5, 3.0, 20.0, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Buttpad horizontal recoil ridges
  ctx.strokeStyle = '#22242B';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let rIdx = 0; rIdx < 5; rIdx++) {
    const rY = barrelY - 4.0 + rIdx * 3.8;
    ctx.moveTo(barrelX - 32.0, rY);
    ctx.lineTo(barrelX - 30.0, rY);
  }
  ctx.stroke();

  // Rear sling swivel attachment loop
  ctx.strokeStyle = '#3A3E48';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(barrelX - 27.5, barrelY + 9.5, 1.8, 0, Math.PI * 2);
  ctx.stroke();

  // C. Benelli M4 Ergonomic Pistol Grip
  const gripGrad = ctx.createLinearGradient(barrelX - 10, barrelY + 4, barrelX - 18, barrelY + 19);
  gripGrad.addColorStop(0, '#1E2025');
  gripGrad.addColorStop(0.5, '#141518');
  gripGrad.addColorStop(1, '#0B0C0E');

  ctx.fillStyle = gripGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX - 9.5, barrelY + 3.8);
  ctx.lineTo(barrelX - 18.5, barrelY + 17.8); // Backstrap angle
  ctx.lineTo(barrelX - 11.5, barrelY + 19.2); // Base
  ctx.lineTo(barrelX - 2.8, barrelY + 6.2);   // Frontstrap finger ridge
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pistol grip stipple texture panel
  ctx.fillStyle = '#0E0F12';
  ctx.beginPath();
  ctx.roundRect(barrelX - 15.0, barrelY + 7.5, 5.0, 9.0, 1.0);
  ctx.fill();

  ctx.strokeStyle = '#262930';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(barrelX - 14.5, barrelY + 9.5); ctx.lineTo(barrelX - 11.0, barrelY + 9.5);
  ctx.moveTo(barrelX - 15.0, barrelY + 12.0); ctx.lineTo(barrelX - 11.5, barrelY + 12.0);
  ctx.moveTo(barrelX - 15.5, barrelY + 14.5); ctx.lineTo(barrelX - 12.0, barrelY + 14.5);
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 2. PARKERIZED RECEIVER, PICATINNY RAIL & BOLT MECHANISM
  // ─────────────────────────────────────────────────────────────
  // A. Receiver Main Body
  const recGrad = ctx.createLinearGradient(0, barrelY - 6, 0, barrelY + 7);
  recGrad.addColorStop(0, g.receiverTop);
  recGrad.addColorStop(0.3, g.receiverBevel);
  recGrad.addColorStop(0.7, g.receiverBase);
  recGrad.addColorStop(1, '#111215');

  ctx.fillStyle = recGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(barrelX - 12.5, barrelY - 5.5, 25.0, 11.5, [1.5, 1.0, 1.0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Receiver contour chamfer line
  ctx.strokeStyle = g.receiverBevel;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 11.5, barrelY - 3.8);
  ctx.lineTo(barrelX + 11.5, barrelY - 3.8);
  ctx.stroke();

  // Trigger group retaining cross-pins
  ctx.fillStyle = g.receiverPin;
  ctx.beginPath();
  ctx.arc(barrelX - 4.5, barrelY + 3.8, 0.9, 0, Math.PI * 2);
  ctx.arc(barrelX + 3.5, barrelY + 3.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // B. Full-Length Top MIL-STD-1913 Picatinny Rail with Machined Teeth
  ctx.fillStyle = g.receiverTop;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX - 11.0, barrelY - 7.5, 22.0, 2.2);
  ctx.fill();
  ctx.stroke();

  // Rail cross-slots (individual rail teeth)
  ctx.fillStyle = '#101114';
  for (let rIdx = 0; rIdx < 8; rIdx++) {
    ctx.fillRect(barrelX - 9.5 + rIdx * 2.6, barrelY - 7.5, 1.2, 1.6);
  }

  // Rail mounting hex screws
  ctx.fillStyle = '#4A4F5C';
  ctx.fillRect(barrelX - 8.0, barrelY - 6.2, 1.0, 0.8);
  ctx.fillRect(barrelX + 2.0, barrelY - 6.2, 1.0, 0.8);
  ctx.fillRect(barrelX + 9.0, barrelY - 6.2, 1.0, 0.8);

  // C. LPA Ghost Ring Rear Sight Assembly (Mounted at rear of receiver rail)
  ctx.fillStyle = g.rearGhostRing;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX - 10.5, barrelY - 10.2, 4.2, 3.0); // Sight base
  ctx.fill();
  ctx.stroke();

  // Ghost ring aperture circle & protective steel wings
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(barrelX - 8.4, barrelY - 9.2, 1.2, 0, Math.PI * 2);
  ctx.stroke();

  // D. Open Ejection Port Chamber & Chrome Bolt Carrier
  ctx.fillStyle = g.ejectionPort;
  ctx.fillRect(barrelX - 4.5, barrelY - 3.2, 11.5, 5.5);

  // Chrome-Plated Steel Bolt Carrier
  const isBoltRacked = (pumpOffset < -3 || firePumpOffset < -3);
  const boltSlideX = isBoltRacked ? -6.0 : 0;

  ctx.save();
  ctx.translate(boltSlideX, 0);

  ctx.fillStyle = g.boltCarrier;
  ctx.strokeStyle = '#2B2E35';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(barrelX - 1.0, barrelY - 2.8, 7.5, 4.6, 0.5);
  ctx.fill();
  ctx.stroke();

  // Extractor Claw on Bolt Face
  ctx.fillStyle = g.boltExtractor;
  ctx.fillRect(barrelX + 5.0, barrelY - 2.2, 1.5, 3.4);

  // Protruding Knurled Tactical Charging Handle Knob
  ctx.fillStyle = g.chargingHandle;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(barrelX + 1.2, barrelY - 1.2, 4.8, 2.2, 0.6);
  ctx.fill();
  ctx.stroke();

  // Charging handle knurling ribs
  ctx.strokeStyle = '#4B5160';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(barrelX + 2.4, barrelY - 1.2); ctx.lineTo(barrelX + 2.4, barrelY + 1.0);
  ctx.moveTo(barrelX + 4.0, barrelY - 1.2); ctx.lineTo(barrelX + 4.0, barrelY + 1.0);
  ctx.stroke();

  ctx.restore();

  // High-Brass 12-Gauge Hull visible inside open chamber when racking
  if (isBoltRacked) {
    ctx.fillStyle = g.shellBrass;
    ctx.fillRect(barrelX - 3.5, barrelY - 2.0, 4.5, 3.0);
    ctx.fillStyle = g.shellPlastic;
    ctx.fillRect(barrelX + 1.0, barrelY - 2.0, 3.5, 3.0);
  }

  // Oversized Competition Tactical Bolt Release Button (Below ejection port)
  ctx.fillStyle = g.boltReleasePaddle;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(barrelX - 1.5, barrelY + 2.8, 4.5, 1.8, 0.4);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 3. EXTENDED 7+1 MAGAZINE TUBE, BARREL CLAMP & CAP
  // ─────────────────────────────────────────────────────────────
  // Full-Length Extended Steel Magazine Tube
  const magTubeGrad = ctx.createLinearGradient(0, barrelY + 1.8, 0, barrelY + 6.5);
  magTubeGrad.addColorStop(0, '#2D3038');
  magTubeGrad.addColorStop(0.5, g.magazineTube);
  magTubeGrad.addColorStop(1, '#0B0C0E');

  ctx.fillStyle = magTubeGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 10.5, barrelY + 1.8, 33.5, 4.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Knurled Magazine Tube Cap with QD Swivel Mount Socket
  ctx.fillStyle = g.magCapKnurled;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX + 43.0, barrelY + 1.6, 3.2, 5.2);
  ctx.fill();
  ctx.stroke();

  // Mag Cap knurling grip lines
  ctx.strokeStyle = '#181A20';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(barrelX + 44.2, barrelY + 1.6); ctx.lineTo(barrelX + 44.2, barrelY + 6.8);
  ctx.moveTo(barrelX + 45.4, barrelY + 1.6); ctx.lineTo(barrelX + 45.4, barrelY + 6.8);
  ctx.stroke();

  // Heavy-Duty Dual-Bolt Barrel & Mag Tube Clamp Bracket
  ctx.fillStyle = g.magTubeBracket;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 38.5, barrelY - 5.0, 3.8, 12.0, 0.8);
  ctx.fill();
  ctx.stroke();

  // Clamp hex fastener screws
  ctx.fillStyle = '#64748B';
  ctx.fillRect(barrelX + 39.6, barrelY - 3.2, 1.4, 1.4);
  ctx.fillRect(barrelX + 39.6, barrelY + 3.8, 1.4, 1.4);

  // ─────────────────────────────────────────────────────────────
  // 4. 18.5" HEAVY STEEL BARREL & VENTILATED HEAT SHIELD
  // ─────────────────────────────────────────────────────────────
  // Heavy Parkerized Steel Barrel
  const barrelGrad = ctx.createLinearGradient(0, barrelY - 5.0, 0, barrelY + 1.5);
  barrelGrad.addColorStop(0, g.barrelHighlight);
  barrelGrad.addColorStop(0.35, g.barrelSteel);
  barrelGrad.addColorStop(1, '#111215');

  ctx.fillStyle = barrelGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 11.5, barrelY - 5.0, 37.0, 6.4, 0.8);
  ctx.fill();
  ctx.stroke();

  // Tactical Breacher Choke / Muzzle Crown Ring
  ctx.fillStyle = '#1A1C20';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX + 47.5, barrelY - 5.2, 2.5, 6.8);
  ctx.fill();
  ctx.stroke();

  // Perforated Steel Heat Shield Shroud
  const shieldGrad = ctx.createLinearGradient(0, barrelY - 6.8, 0, barrelY - 4.5);
  shieldGrad.addColorStop(0, '#353942');
  shieldGrad.addColorStop(0.5, g.heatShield);
  shieldGrad.addColorStop(1, '#181A1F');

  ctx.fillStyle = shieldGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 13.0, barrelY - 6.8, 32.0, 2.2, 0.5);
  ctx.fill();
  ctx.stroke();

  // Heat Shield Oval Cooling Slots (6 precision vents)
  ctx.fillStyle = g.heatShieldSlot;
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    ctx.beginPath();
    ctx.roundRect(barrelX + 15.5 + sIdx * 5.0, barrelY - 6.5, 3.4, 1.4, 0.6);
    ctx.fill();
  }

  // Heat shield retaining clamp screws
  ctx.fillStyle = g.heatShieldBracket;
  ctx.fillRect(barrelX + 13.5, barrelY - 6.6, 1.2, 1.8);
  ctx.fillRect(barrelX + 43.5, barrelY - 6.6, 1.2, 1.8);

  // ─────────────────────────────────────────────────────────────
  // 5. PROTECTED LPA FRONT BLADE SIGHT WITH RED FIBER-OPTIC
  // ─────────────────────────────────────────────────────────────
  // Steel Protective Ears
  ctx.fillStyle = g.ghostRingEars;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX + 44.5, barrelY - 4.8);
  ctx.lineTo(barrelX + 45.2, barrelY - 8.8);
  ctx.lineTo(barrelX + 47.5, barrelY - 8.8);
  ctx.lineTo(barrelX + 48.0, barrelY - 4.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Red Glowing Fiber-Optic Front Bead
  ctx.fillStyle = g.ghostRingSight;
  ctx.beginPath();
  ctx.arc(barrelX + 46.4, barrelY - 7.5, 1.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FECACA';
  ctx.beginPath();
  ctx.arc(barrelX + 46.4, barrelY - 7.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────────────────────
  // 6. TACTICAL RIBBED POLYMER PUMP FOREND (Dynamic Racking Action)
  // ─────────────────────────────────────────────────────────────
  const pumpX = barrelX + 13.5 + pumpOffset + firePumpOffset;
  const pumpGrad = ctx.createLinearGradient(0, barrelY - 1.5, 0, barrelY + 7.5);
  pumpGrad.addColorStop(0, '#24272E');
  pumpGrad.addColorStop(0.3, g.pumpForend);
  pumpGrad.addColorStop(1, '#0A0B0D');

  ctx.fillStyle = pumpGrad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;

  // Ergonomic Pump Body with Front Hand-Stop Lip
  ctx.beginPath();
  ctx.moveTo(pumpX, barrelY - 1.2);
  ctx.lineTo(pumpX + 17.5, barrelY - 1.2);
  ctx.lineTo(pumpX + 18.5, barrelY + 7.8); // Front hand-stop lip flare
  ctx.lineTo(pumpX, barrelY + 7.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Deep Traction Ribbing Grooves (5 vertical ribs with bevels)
  for (let rIdx = 0; rIdx < 5; rIdx++) {
    const rx = pumpX + 2.8 + rIdx * 2.8;
    // Deep groove shadow
    ctx.fillStyle = g.pumpRibShadow;
    ctx.fillRect(rx, barrelY - 0.5, 1.2, 7.0);
    // Highlight ridge
    ctx.fillStyle = g.pumpRibHighlight;
    ctx.fillRect(rx + 1.2, barrelY - 0.5, 0.7, 7.0);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. DYNAMIC 12-GAUGE RELOAD SHELL INSERTION ANIMATION
  // ─────────────────────────────────────────────────────────────
  if (isReloading && reloadTimer > 0) {
    const reloadProgress = 1.0 - (reloadTimer / reloadMaxTime);
    if (reloadProgress < 0.88) {
      const shellCycleP = (reloadProgress * 6) % 1.0; // 0 -> 1 per individual shell
      const pushX = barrelX - 2 + shellCycleP * 6.5;
      const pushY = barrelY + 10 - shellCycleP * 7.5;
      const shellAngle = -0.35 + shellCycleP * 0.35;

      ctx.save();
      ctx.translate(pushX, pushY);
      ctx.rotate(shellAngle);

      // High-Brass Head
      ctx.fillStyle = g.shellBrass;
      ctx.fillRect(-2, 1, 4.5, 3.2);
      ctx.fillStyle = g.shellRim;
      ctx.fillRect(-2.3, 3.6, 5.1, 1.0);

      // Crimson Plastic Hull
      ctx.fillStyle = g.shellPlastic;
      ctx.fillRect(-2, -6.5, 4.5, 7.5);
      // Star Crimp Tip
      ctx.fillStyle = g.shellCrimp;
      ctx.fillRect(-2, -7.8, 4.5, 1.3);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-2, -7.8, 4.5, 12.0);

      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. DYNAMIC EJECTED 12-GAUGE HULL (Preview Mode Only)
  // ─────────────────────────────────────────────────────────────
  if (casingTimer > 0 && (opts.inPreview || (typeof state !== 'undefined' && state.gameState !== 'playing'))) {
    const maxCasingFrames = opts.casingMaxFrames || 24;
    const t = Math.min(1.0, Math.max(0.0, 1 - (casingTimer / maxCasingFrames)));
    const ejectX = barrelX - 2 - t * 28;
    const ejectY = barrelY - 8 - Math.sin(t * Math.PI * 0.85) * 44 + (t * t * 38);
    const tumbleAngle = t * 10.5;
    const casingAlpha = Math.max(0, 1 - Math.pow(t, 2.5) * 0.85);

    ctx.save();
    ctx.globalAlpha = casingAlpha;
    ctx.translate(ejectX, ejectY);
    ctx.rotate(tumbleAngle);

    // High-Brass Head (Gold Base)
    ctx.fillStyle = g.shellBrass;
    ctx.fillRect(-3, 3, 6, 4.5);
    // Brass Rim
    ctx.fillStyle = g.shellRim;
    ctx.fillRect(-3.5, 6.5, 7, 1.5);
    // Silver Primer
    ctx.fillStyle = g.shellPrimer;
    ctx.beginPath();
    ctx.arc(0, 7.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Crimson Plastic Hull
    ctx.fillStyle = g.shellPlastic;
    ctx.fillRect(-3, -9, 6, 12);
    // Dark crimp tip
    ctx.fillStyle = g.shellCrimp;
    ctx.fillRect(-3, -10.5, 6, 1.8);

    // Specular highlight line along the plastic cylinder
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(-1.5, -9, 1.2, 12);

    ctx.strokeStyle = '#5B1111';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-3, -10.5, 6, 18.5);

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // 9. CINEMATIC 12-GAUGE MUZZLE BLAST FLASH & FLAME CONE
  // ─────────────────────────────────────────────────────────────
  if (flashTimer > 0) {
    ctx.save();
    ctx.translate(barrelX + 50, barrelY - 1.8);

    const maxFlash = 5;
    const progress = Math.min(1.0, flashTimer / maxFlash);
    const alpha = Math.pow(progress, 0.5);

    // Expanding fire cone
    const glowR = 48 * progress;
    const grad = ctx.createRadialGradient(4, 0, 0, 4, 0, glowR);
    grad.addColorStop(0, `rgba(255, 245, 180, ${0.95 * alpha})`);
    grad.addColorStop(0.3, `rgba(249, 115, 22, ${0.75 * alpha})`);
    grad.addColorStop(0.7, `rgba(220, 38, 38, ${0.35 * alpha})`);
    grad.addColorStop(1.0, 'rgba(100, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-6, -14 * progress);
    ctx.lineTo(36 * progress, 0);
    ctx.lineTo(-6, 14 * progress);
    ctx.closePath();
    ctx.fill();

    // High-intensity white-hot core spike
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -5 * progress);
    ctx.lineTo(24 * progress, 0);
    ctx.lineTo(0, 5 * progress);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // 10. SUPPORT HAND (Front Hand Gripping Shotgun Pump Forend)
  // ─────────────────────────────────────────────────────────────
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || opts.hideHands || opts.isThrown || opts.inPreview;
  if (!shouldHideHands) {
    let supportHandX = pumpX + 8.5;
    let supportHandY = barrelY + 3.2;

    if (isReloading && reloadTimer > 0) {
      const reloadProgress = 1.0 - (reloadTimer / reloadMaxTime);
      if (reloadProgress < 0.88) {
        const shellCycleP = (reloadProgress * 6) % 1.0;
        supportHandX = barrelX - 2 + shellCycleP * 6.5;
        supportHandY = barrelY + 11.0 - shellCycleP * 7.5;
      }
    }

    ctx.save();
    ctx.fillStyle = opts.handColor || '#F4CBB2';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(supportHandX, supportHandY, getHandSize(6.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hand shading / finger crease curve
    ctx.strokeStyle = '#D9A083';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(supportHandX, supportHandY - 1.2, getHandSize(4.8), 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws a heavy 12-gauge buckshot pellet projectile
 */
export function drawJohnWickShotgunPellet(ctx, p) {
  const vx = p.vx || 0;
  const vy = p.vy || 0;
  const angle = Math.atan2(vy, vx);

  if (p.history && p.history.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.40)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Fiery motion streak (Reused Cache)
  ctx.fillStyle = _getPelletStreakGrad(ctx);
  ctx.fillRect(-18, -1.8, 18, 3.6);

  // Heavy Lead/Copper Buckshot Sphere
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(1.0, -1.0, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the TTI M4 / BCM Carbine (M4 Rifle)
 * Features matte carbon receiver, free-float M-LOK rail, TTI bronze match barrel,
 * EOTech holographic sight with red reticle, Magpul CTR stock, and curved PMAG with gold basepad.
 */
/**
 * Draws the iconic M4A1 Carbine / M4 Rifle
 * Features authentic collapsible LE stock with buffer tube, A2 ergonomic pistol grip,
 * curved 30-round STANAG steel magazine, receiver with ejection port & forward assist,
 * iconic A2 integrated carrying handle with rear sight tunnel loop, Delta ring collar,
 * cylindrical ribbed carbine handguard with heat vents, iconic triangular A-frame front sight gas block,
 * stepped 14.5" steel barrel, and slotted A2 birdcage flash hider.
 */
export function drawJohnWickRifle(ctx, x, y, gunAngle, r, opts = {}) {
  const g = JOHN_WICK_WEAPON_GRAPHICS.rifle;
  const recoilOffset = opts.recoilOffset || 0;
  const flashTimer = opts.flashTimer || 0;
  const casingTimer = opts.casingTimer || 0;
  const isReloading = opts.isReloading || false;
  const isSwitching = opts.isSwitching || false;
  const switchTimer = opts.switchTimer || 0;
  const switchMaxTime = opts.switchMaxTime || 36;
  const reloadTimer = opts.reloadTimer || 0;
  const reloadMaxTime = opts.reloadMaxTime || 85;

  ctx.save();
  ctx.translate(x, y);

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = gunAngle - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }
  ctx.rotate(baseAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.rotate(normDiff);

  const defaultScale = 1.15;
  ctx.scale(defaultScale, defaultScale);

  // Weapon switch & reload workspace motion
  let switchAngleOffset = 0;
  let switchOffsetY = 0;
  let chargingOffset = 0;

  if (isSwitching && switchTimer > 0) {
    const switchProgress = 1.0 - (switchTimer / switchMaxTime); // 0 to 1

    // 3-Phase Tactical High-Ready Lift & Charging Handle Crack Animation:
    // Phase 1 (0.00 - 0.28): Rapid high-ready lift (rifle tilts up ~45° and raises into chest)
    // Phase 2 (0.28 - 0.68): Held high while charging handle aggressively racks back (-12.0px) and snaps forward into battery
    // Phase 3 (0.68 - 1.00): Smooth level down to horizontal shoulder aim stance
    if (switchProgress < 0.28) {
      const liftT = switchProgress / 0.28;
      const easeLift = Math.sin(liftT * Math.PI * 0.5); // Ease out curve
      switchAngleOffset = -0.78 * easeLift; // Lift up ~45 degrees
      switchOffsetY = -10.0 * easeLift;
      chargingOffset = 0;
    } else if (switchProgress < 0.68) {
      const rackT = (switchProgress - 0.28) / 0.40; // 0 to 1
      // Held up high with a crisp mechanical kickback when racked
      const rackSine = Math.sin(rackT * Math.PI);
      switchAngleOffset = -0.78 - 0.06 * rackSine;
      switchOffsetY = -10.0 - 1.2 * rackSine;
      // Charging handle pull & release stroke: slides back -12.0px and forcefully snaps forward
      chargingOffset = -Math.sin(rackT * Math.PI) * 12.0;
    } else {
      const lowerT = (switchProgress - 0.68) / 0.32; // 0 to 1
      const easeLower = 1.0 - Math.sin(lowerT * Math.PI * 0.5);
      switchAngleOffset = -0.78 * easeLower;
      switchOffsetY = -10.0 * easeLower;
      chargingOffset = 0;
    }
  } else if (isReloading && reloadTimer > 0) {
    const reloadProgress = 1.0 - (reloadTimer / reloadMaxTime);
    const tiltSine = Math.sin(reloadProgress * Math.PI);
    switchAngleOffset = -0.20 * tiltSine;
    switchOffsetY = -3.0 * tiltSine;

    if (reloadProgress > 0.70) {
      const slapP = (reloadProgress - 0.70) / 0.30;
      chargingOffset = -Math.sin(slapP * Math.PI) * 5.0;
    }
  }

  // Recoil upward muzzle kick
  let recoilPitchAngle = 0;
  if (recoilOffset > 0) {
    recoilPitchAngle = -0.065 * Math.min(1.0, recoilOffset / 4.5);
  }

  ctx.rotate(switchAngleOffset + recoilPitchAngle);
  ctx.translate(0, switchOffsetY);

  const barrelX = (r * 0.85 - recoilOffset) / defaultScale;
  const barrelY = -2.5 / defaultScale;

  // ─────────────────────────────────────────────────────────────
  // 1. BUFFER TUBE & COLLAPSIBLE LE / CARBINE STOCK
  // ─────────────────────────────────────────────────────────────
  // Cylindrical Buffer Tube
  ctx.fillStyle = g.bufferTube;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(barrelX - 27, barrelY - 2.6, 17, 5.2);
  ctx.fill();
  ctx.stroke();

  // Buffer tube lower rail track
  ctx.fillStyle = '#1A1C20';
  ctx.fillRect(barrelX - 26, barrelY + 2.6, 15, 1.6);

  // LE / M4 Carbine Stock Main Body
  ctx.fillStyle = g.stockLE;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX - 30, barrelY - 5.8, 17, 10.5, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Stock Lower Angled Triangular Strut / Webbing
  ctx.beginPath();
  ctx.moveTo(barrelX - 30, barrelY + 4.7);
  ctx.lineTo(barrelX - 30, barrelY + 12.5);
  ctx.lineTo(barrelX - 15, barrelY + 4.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stock Adjustment Latch / Release Lever
  ctx.fillStyle = '#2A2D35';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 23, barrelY + 2.8, 8, 3.2, 0.8);
  ctx.fill();
  ctx.stroke();

  // Textured Rubber Buttpad (Rear plate)
  ctx.fillStyle = g.stockPad;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX - 32.5, barrelY - 6.8, 3.2, 20.2, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Buttpad vertical rubber traction ridges
  ctx.strokeStyle = '#22252C';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 31, barrelY - 4); ctx.lineTo(barrelX - 31, barrelY + 11);
  ctx.stroke();

  // Sling swivel loop mount
  ctx.fillStyle = '#22242B';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(barrelX - 28, barrelY + 12, 3.5, 2.5);

  // ─────────────────────────────────────────────────────────────
  // 2. A2 PISTOL GRIP & TRIGGER ASSEMBLY
  // ─────────────────────────────────────────────────────────────
  // A2 Ergonomic Pistol Grip (Angled back ~70° with front finger shelf)
  ctx.fillStyle = g.gripA2;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX - 10, barrelY + 4.5);
  ctx.lineTo(barrelX - 17.5, barrelY + 18.5);
  ctx.lineTo(barrelX - 11.5, barrelY + 19.5);
  ctx.lineTo(barrelX - 4.5, barrelY + 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // A2 Finger Groove Notch Bump on front edge
  ctx.fillStyle = '#22252A';
  ctx.beginPath();
  ctx.roundRect(barrelX - 15.5, barrelY + 10.5, 3.2, 3.5, 1.0);
  ctx.fill();

  // Grip checkering texture lines
  ctx.strokeStyle = '#2A2D35';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(barrelX - 13, barrelY + 7);  ctx.lineTo(barrelX - 9, barrelY + 8);
  ctx.moveTo(barrelX - 15, barrelY + 14); ctx.lineTo(barrelX - 10, barrelY + 15);
  ctx.moveTo(barrelX - 16, barrelY + 17); ctx.lineTo(barrelX - 11, barrelY + 18);
  ctx.stroke();

  // Trigger Guard (Oval loop underneath receiver)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(barrelX - 1.5, barrelY + 7.0, 3.2, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Curved Metal Trigger inside guard
  ctx.strokeStyle = '#52525B';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(barrelX - 2.0, barrelY + 5.5);
  ctx.quadraticCurveTo(barrelX - 3.2, barrelY + 7.8, barrelX - 2.0, barrelY + 9.2);
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 3. CURVED 30-ROUND STANAG STEEL MAGAZINE (Animated 4-Phase Reload: Pull -> Drop -> Insert Fresh -> Lock)
  // ─────────────────────────────────────────────────────────────
  let showMag = true;
  let magSlideY = 0;
  let magSlideX = 0;

  if (isReloading && reloadTimer > 0) {
    const relP = 1.0 - (reloadTimer / reloadMaxTime);
    if (relP < 0.28) {
      // Phase 1: Takes off empty magazine (slides DOWN and slightly backward out of magwell)
      const p1 = relP / 0.28;
      magSlideY = p1 * 24.0;
      magSlideX = -p1 * 3.0;
    } else if (relP < 0.55) {
      // Phase 2: Magazine dropped! Magwell is open and empty
      showMag = false;
    } else if (relP < 0.85) {
      // Phase 3: Inserting fresh magazine (slides UP from below into the magwell)
      const p3 = (relP - 0.55) / 0.30;
      magSlideY = (1.0 - p3) * 24.0;
      magSlideX = -(1.0 - p3) * 3.0;
    } else {
      // Phase 4: Fresh magazine fully locked into magwell
      magSlideY = 0;
      magSlideX = 0;
    }
  }

  if (showMag) {
    ctx.save();
    ctx.translate(magSlideX, magSlideY);

    // Magazine Body (Authentic forward-curving STANAG 30-round curve pointing right)
    ctx.fillStyle = g.stanagMag;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    // Top-left insertion point at magwell
    ctx.moveTo(barrelX + 1.0, barrelY + 5.5);
    // Rear spine curving down and forward to the right
    ctx.bezierCurveTo(barrelX + 1.5, barrelY + 12.0, barrelX + 3.0, barrelY + 19.5, barrelX + 5.5, barrelY + 26.5);
    // Bottom angled floorplate edge
    ctx.lineTo(barrelX + 14.5, barrelY + 25.0);
    // Front spine curving up-backward to magwell
    ctx.bezierCurveTo(barrelX + 12.2, barrelY + 19.5, barrelX + 10.5, barrelY + 12.0, barrelX + 10.0, barrelY + 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Stamped Vertical Steel Reinforcement Ribs (3 vertical channels curving forward)
    const ribOffsets = [0.22, 0.50, 0.78]; // 3 evenly spaced vertical ribs across magazine width
    for (let r = 0; r < ribOffsets.length; r++) {
      const frac = ribOffsets[r];
      const topX = (barrelX + 1.0) * (1 - frac) + (barrelX + 10.0) * frac;
      const midX = (barrelX + 2.2) * (1 - frac) + (barrelX + 11.2) * frac;
      const botX = (barrelX + 5.5) * (1 - frac) + (barrelX + 14.5) * frac;
      const botY = (barrelY + 26.5) * (1 - frac) + (barrelY + 25.0) * frac;

      // Dark stamped groove channel
      ctx.strokeStyle = '#0C0D10';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(topX, barrelY + 6.0);
      ctx.bezierCurveTo(topX + 0.3, barrelY + 12.0, midX + 0.5, barrelY + 19.5, botX + 0.4, botY - 1.2);
      ctx.stroke();

      // Raised stamped metal highlight ridge (giving 3D pressed steel appearance)
      ctx.strokeStyle = g.magRib;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(topX + 0.8, barrelY + 6.0);
      ctx.bezierCurveTo(topX + 1.0, barrelY + 12.0, midX + 1.2, barrelY + 19.5, botX + 1.1, botY - 1.2);
      ctx.stroke();
    }

    // Horizontal Magwell Catch Rib / Insertion Stop near top
    ctx.strokeStyle = '#323640';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(barrelX + 1.5, barrelY + 8.2);
    ctx.lineTo(barrelX + 9.8, barrelY + 8.2);
    ctx.stroke();

    // Angled Steel Magazine Floorplate at bottom
    ctx.fillStyle = g.magFloorplate;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.9;
    ctx.save();
    ctx.translate(barrelX + 10.0, barrelY + 25.8);
    ctx.rotate(-0.18); // Aligns flush with the forward-angled bottom curve
    ctx.beginPath();
    ctx.roundRect(-5.2, -1.2, 10.2, 2.6, 0.6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // End magazine translation
  } else {
    // When magazine is removed: draw empty dark magwell cavity / receiver opening
    ctx.fillStyle = '#090A0C';
    ctx.fillRect(barrelX + 1.5, barrelY + 5.5, 8.5, 3.2);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LOWER & UPPER RECEIVER
  // ─────────────────────────────────────────────────────────────
  // Lower & Upper Receiver Body
  ctx.fillStyle = g.receiverBase;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(barrelX - 11, barrelY - 6.0, 23, 11.5, 1.2);
  ctx.fill();
  ctx.stroke();

  // Magwell flared collar (Firmly housing top of magazine)
  ctx.fillStyle = g.receiverUpper;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 0.5, barrelY + 2.0, 11.0, 4.5, 0.6);
  ctx.fill();
  ctx.stroke();

  // Fire selector switch (SAFE / SEMI / AUTO dial)
  ctx.fillStyle = '#3A3E48';
  ctx.beginPath();
  ctx.arc(barrelX - 8.5, barrelY + 2.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Take-down pins
  ctx.fillStyle = '#0E0F12';
  ctx.beginPath();
  ctx.arc(barrelX - 9.5, barrelY - 3.5, 1.1, 0, Math.PI * 2);
  ctx.arc(barrelX + 9.5, barrelY + 2.5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Ejection Port & Dust Cover (Opens when charging handle is pulled!)
  ctx.fillStyle = (chargingOffset < -1.5) ? '#0D0E11' : g.ejectionPort;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX - 3.0, barrelY - 4.5, 8.5, 4.5);
  ctx.fill();
  ctx.stroke();

  // If charging handle is pulled: show bolt carrier group sliding back and golden 5.56 brass round in chamber
  if (chargingOffset < -1.5) {
    // Silver-chrome Bolt Carrier Group sliding back
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(barrelX - 2.5 + chargingOffset * 0.45, barrelY - 4.0, 3.8, 3.5);

    // 5.56 NATO Gold Brass Cartridge visible in chamber
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.roundRect(barrelX + 0.8, barrelY - 3.0, 4.2, 1.8, 0.4);
    ctx.fill();
  }

  // Brass Deflector triangular pyramid
  ctx.fillStyle = g.receiverUpper;
  ctx.beginPath();
  ctx.moveTo(barrelX - 4.5, barrelY - 4.2);
  ctx.lineTo(barrelX - 7.0, barrelY - 2.2);
  ctx.lineTo(barrelX - 4.5, barrelY - 0.5);
  ctx.closePath();
  ctx.fill();

  // Forward Assist plunger cylinder
  ctx.fillStyle = '#2A2D34';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(barrelX - 12.5, barrelY - 3.0, 3.0, 2.5, 0.5);
  ctx.fill();
  ctx.stroke();

  // Ambidextrous Charging Handle at upper rear (Animates on equip/reload)
  ctx.fillStyle = g.chargingHandle;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 13.5 + chargingOffset, barrelY - 7.2, 4.5, 2.2, 0.6);
  ctx.fill();
  ctx.stroke();

  // Charging handle extended latch lever when pulled
  if (chargingOffset < -2.0) {
    ctx.fillStyle = '#1A1C20';
    ctx.fillRect(barrelX - 15.5 + chargingOffset, barrelY - 8.2, 3.5, 2.0);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. AIMPOINT CompM4 / M68 CCO TACTICAL RED DOT SCOPE (Matching Reference Image)
  // ─────────────────────────────────────────────────────────────
  // Flattop Picatinny Receiver Rail
  ctx.fillStyle = g.picatinnyRail;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 11.0, barrelY - 7.5, 23.0, 2.0, 0.4);
  ctx.fill();
  ctx.stroke();

  // Picatinny recoil slots along the rail
  for (let s = 0; s < 5; s++) {
    ctx.fillStyle = '#0F1013';
    ctx.fillRect(barrelX - 9.0 + s * 4.2, barrelY - 7.5, 1.6, 2.0);
  }

  // QRP2 Cantilever Riser Mount Base (Clamped to rail)
  ctx.fillStyle = g.scopeRiser;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 7.5, barrelY - 10.0, 16.5, 2.8, 0.6);
  ctx.fill();
  ctx.stroke();

  // Mount clamp screw dots / torque knob
  ctx.fillStyle = '#111215';
  ctx.beginPath();
  ctx.arc(barrelX - 4.5, barrelY - 8.6, 1.0, 0, Math.PI * 2);
  ctx.arc(barrelX + 5.5, barrelY - 8.6, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // Cantilever Riser Pedestal Neck
  ctx.fillStyle = g.scopeRiser;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 6.0, barrelY - 12.8, 14.0, 3.2, 0.5);
  ctx.fill();
  ctx.stroke();

  // Main Optic Sight Tube Body
  ctx.fillStyle = g.scopeBody;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX - 8.5, barrelY - 18.5, 17.5, 6.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Rear Ocular Eyepiece Housing (Left bell)
  ctx.fillStyle = '#14161A';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 12.2, barrelY - 19.5, 4.2, 8.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Knurled diopter ridges on eyepiece
  ctx.strokeStyle = '#2E323B';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(barrelX - 10.8, barrelY - 18.5); ctx.lineTo(barrelX - 10.8, barrelY - 11.5);
  ctx.moveTo(barrelX - 9.5, barrelY - 18.5);  ctx.lineTo(barrelX - 9.5, barrelY - 11.5);
  ctx.stroke();

  // Rear Ocular Lens Glass (Anti-reflective cyan tint)
  ctx.fillStyle = g.scopeGlass;
  ctx.fillRect(barrelX - 12.6, barrelY - 18.0, 0.9, 5.8);

  // Front Objective Lens Housing / Sunshade Bell (Right side)
  ctx.fillStyle = '#14161A';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 8.5, barrelY - 19.8, 6.0, 9.4, 0.8);
  ctx.fill();
  ctx.stroke();

  // Front Objective Lens Collar / Rubber Armor
  ctx.fillStyle = '#0F1013';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 13.5, barrelY - 19.2, 2.2, 8.2, 0.5);
  ctx.fill();
  ctx.stroke();

  // Front Optical Lens Glint (Ruby-Cyan anti-reflective sheen)
  ctx.fillStyle = g.scopeGlass;
  ctx.fillRect(barrelX + 15.0, barrelY - 18.0, 1.0, 5.8);

  // Top-Right High Battery Compartment (Aimpoint CompM4 signature top tube)
  ctx.fillStyle = g.scopeBody;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 1.5, barrelY - 22.8, 11.5, 4.6, 0.8);
  ctx.fill();
  ctx.stroke();

  // Knurled Rotary Battery Cap at front of battery tube
  ctx.fillStyle = g.scopeKnob;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 9.5, barrelY - 23.2, 3.0, 5.4, 0.6);
  ctx.fill();
  ctx.stroke();

  // Battery cap tether / knurl notches
  ctx.strokeStyle = '#181A20';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(barrelX + 10.8, barrelY - 22.5);
  ctx.lineTo(barrelX + 10.8, barrelY - 18.5);
  ctx.stroke();

  // Side Elevation / Brightness Rotary Dial Turret
  ctx.fillStyle = g.scopeKnob;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(barrelX - 2.8, barrelY - 15.2, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cross-slotted adjustment grooves on rotary knob ('+' cross shape)
  ctx.strokeStyle = '#181A20';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(barrelX - 4.8, barrelY - 15.2); ctx.lineTo(barrelX - 0.8, barrelY - 15.2);
  ctx.moveTo(barrelX - 2.8, barrelY - 17.2); ctx.lineTo(barrelX - 2.8, barrelY - 13.2);
  ctx.stroke();

  // Red Dot Laser Reticle Glow (Internal optical sight dot)
  ctx.fillStyle = g.scopeReticle;
  ctx.beginPath();
  ctx.arc(barrelX - 0.5, barrelY - 15.2, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────────────────────
  // 6. DELTA RING & CYLINDRICAL RIBBED CARBINE HANDGUARD
  // ─────────────────────────────────────────────────────────────
  // Delta Ring Handguard Retention Collar (Tapered connector)
  ctx.fillStyle = g.deltaRing;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 12.0, barrelY - 6.2, 3.5, 12.0, 0.8);
  ctx.fill();
  ctx.stroke();

  // Cylindrical Ribbed Polymer Handguard Body
  ctx.fillStyle = g.handguardRibbed;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(barrelX + 15.5, barrelY - 6.0, 23.5, 11.5, 1.4);
  ctx.fill();
  ctx.stroke();

  // Distinct Vertical Ribs & Heat Vent Channels (Matching reference photo)
  const ribCount = 7;
  for (let rIdx = 0; rIdx < ribCount; rIdx++) {
    const rx = barrelX + 18.0 + rIdx * 3.0;
    // Dark groove
    ctx.strokeStyle = '#0B0C0E';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(rx, barrelY - 5.5);
    ctx.lineTo(rx, barrelY + 5.0);
    ctx.stroke();

    // Raised rib highlight
    ctx.strokeStyle = g.handguardRibLine;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(rx + 1.2, barrelY - 5.0);
    ctx.lineTo(rx + 1.2, barrelY + 4.5);
    ctx.stroke();
  }

  // Handguard Front Retention Endcap
  ctx.fillStyle = '#2D3038';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 39.0, barrelY - 5.0, 2.0, 9.5, 0.5);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 7. ICONIC A-FRAME TRIANGULAR FRONT SIGHT GAS BLOCK
  // ─────────────────────────────────────────────────────────────
  // A2 Triangular Front Sight Tower rising from the barrel
  ctx.fillStyle = g.frontSightBase;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX + 41.0, barrelY - 3.5);
  ctx.lineTo(barrelX + 43.5, barrelY - 17.0); // Left angled strut
  ctx.lineTo(barrelX + 45.0, barrelY - 17.0); // Top sight protective hood
  ctx.lineTo(barrelX + 47.5, barrelY - 3.5);  // Right angled strut
  ctx.lineTo(barrelX + 48.5, barrelY + 4.5);  // Lower gas block collar
  ctx.lineTo(barrelX + 40.5, barrelY + 4.5);  // Gas block base
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front Sight Post Tip
  ctx.fillStyle = '#0A0B0D';
  ctx.fillRect(barrelX + 44.0, barrelY - 18.0, 1.0, 2.5);

  // Bayonet Lug bracket underneath gas block
  ctx.fillStyle = '#262930';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.rect(barrelX + 43.0, barrelY + 4.5, 3.5, 2.2);
  ctx.fill();
  ctx.stroke();

  // Front Sling Swivel Ring Loop dangling below
  ctx.strokeStyle = '#383C46';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(barrelX + 44.0, barrelY + 6.8, 3.0, 2.2);

  // ─────────────────────────────────────────────────────────────
  // 8. STEPPED 14.5" STEEL BARREL & A2 BIRDCAGE FLASH HIDER
  // ─────────────────────────────────────────────────────────────
  // Stepped Parkerized Steel Barrel extending past front sight
  ctx.fillStyle = g.barrelSteel;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX + 47.5, barrelY - 2.0, 8.5, 3.8);
  ctx.fill();
  ctx.stroke();

  // M203 Grenade Launcher Step-Down Barrel Cutout
  ctx.fillStyle = '#1A1C20';
  ctx.fillRect(barrelX + 51.5, barrelY - 1.4, 2.6, 2.6);

  // Barrel Muzzle Thread Collar
  ctx.fillStyle = '#2D3038';
  ctx.fillRect(barrelX + 56.0, barrelY - 2.0, 2.0, 3.8);

  // A2 Birdcage Flash Hider
  ctx.fillStyle = g.flashHider;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 58.0, barrelY - 3.0, 8.5, 5.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Longitudinal gas vent slots on flash hider
  ctx.fillStyle = '#07080A';
  ctx.fillRect(barrelX + 59.8, barrelY - 2.0, 1.4, 3.8);
  ctx.fillRect(barrelX + 62.2, barrelY - 2.0, 1.4, 3.8);
  ctx.fillRect(barrelX + 64.6, barrelY - 2.0, 1.4, 3.8);

  // ─────────────────────────────────────────────────────────────
  // 8.5. TACTICAL UNDERBARREL GREEN LASER MODULE & LASER BEAM
  // ─────────────────────────────────────────────────────────────
  // Tactical Laser Module Housing (Mounted underneath barrel / gas block)
  ctx.fillStyle = '#14161A';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 41.0, barrelY + 4.5, 13.0, 5.0, 0.8);
  ctx.fill();
  ctx.stroke();

  // Laser Mount Bracket connecting to underbarrel rail
  ctx.fillStyle = '#22252C';
  ctx.beginPath();
  ctx.roundRect(barrelX + 42.5, barrelY + 3.0, 9.0, 1.8, 0.4);
  ctx.fill();

  // Green Diode Emitter Bezel at front of laser module
  ctx.fillStyle = '#0B0C0E';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.roundRect(barrelX + 54.0, barrelY + 5.0, 2.2, 4.0, 0.5);
  ctx.fill();
  ctx.stroke();

  // Green Laser Diode Emitter Aperture
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(barrelX + 55.5, barrelY + 7.0, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Side Activation Indicator LED
  ctx.fillStyle = '#34D399';
  ctx.fillRect(barrelX + 43.5, barrelY + 6.2, 1.5, 1.5);

  // Tactical Emerald Green Laser Beam (Projecting forward along aim vector)
  const laserX = barrelX + 56.5;
  const laserY = barrelY + 7.0;
  const beamLength = 480;

  // Outer ambient laser glow
  const glowGrad = ctx.createLinearGradient(laserX, laserY, laserX + beamLength, laserY);
  glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
  glowGrad.addColorStop(0.25, 'rgba(16, 185, 129, 0.22)');
  glowGrad.addColorStop(0.70, 'rgba(16, 185, 129, 0.08)');
  glowGrad.addColorStop(1.0, 'rgba(16, 185, 129, 0)');

  ctx.strokeStyle = glowGrad;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(laserX, laserY);
  ctx.lineTo(laserX + beamLength, laserY);
  ctx.stroke();

  // Inner razor-sharp neon green core beam
  const coreGrad = ctx.createLinearGradient(laserX, laserY, laserX + beamLength, laserY);
  coreGrad.addColorStop(0, 'rgba(167, 243, 208, 0.95)');
  coreGrad.addColorStop(0.12, 'rgba(52, 211, 153, 0.85)');
  coreGrad.addColorStop(0.60, 'rgba(16, 185, 129, 0.40)');
  coreGrad.addColorStop(1.0, 'rgba(16, 185, 129, 0)');

  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(laserX, laserY);
  ctx.lineTo(laserX + beamLength, laserY);
  ctx.stroke();

  // Laser Diode Emitter Flare
  ctx.fillStyle = 'rgba(52, 211, 153, 0.50)';
  ctx.beginPath();
  ctx.arc(laserX, laserY, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#A7F3D0';
  ctx.beginPath();
  ctx.arc(laserX, laserY, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────────────────────
  // 9. DYNAMIC ANIMATIONS: EJECTED BRASS CASING & MUZZLE FLASH
  // ─────────────────────────────────────────────────────────────
  // Ejected 5.56 NATO Brass Casing (Preview mode only; in-game shells use physics system)
  if (casingTimer > 0 && (opts.inPreview || (typeof state !== 'undefined' && state.gameState !== 'playing'))) {
    const maxCasingFrames = 12;
    const t = 1 - (casingTimer / maxCasingFrames);
    const ejectX = barrelX + 1 + t * -5;
    const ejectY = barrelY - 6 - t * 22 + t * t * 18;
    const tumbleAngle = t * 6.5;
    const casingAlpha = Math.max(0, 1 - t * 0.85);

    ctx.save();
    ctx.globalAlpha = casingAlpha;
    ctx.translate(ejectX, ejectY);
    ctx.rotate(tumbleAngle);

    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.roundRect(-1.5, -4, 3, 9, 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // 9. HIGH-VELOCITY 5.56 NATO A2 BIRDCAGE MUZZLE BLAST FLASH
  // ─────────────────────────────────────────────────────────────
  // Supersonic 5.56 Muzzle Burst Flash (Erupting from A2 flash hider crown)
  if (flashTimer > 0) {
    ctx.save();
    ctx.translate(barrelX + 67.5, barrelY - 0.1);

    const maxFlash = 4;
    const progress = Math.min(1.0, flashTimer / maxFlash);
    const alpha = Math.pow(progress, 0.45); // Explosive initial snap with rapid decay

    // A. Supersonic Cyan-Blue Vapor Shock Ring (5.56 supersonic signature)
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * alpha})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(8 * progress, 0, 18 * progress, 0, Math.PI * 2);
    ctx.stroke();

    // B. Volumetric Radiant Fireball Atmospheric Glow (Concentric radial gradient)
    const glowR = 46 * progress;
    const grad = ctx.createRadialGradient(4, 0, 0, 4, 0, glowR);
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * alpha})`);
    grad.addColorStop(0.25, `rgba(254, 240, 138, ${0.90 * alpha})`);
    grad.addColorStop(0.55, `rgba(249, 115, 22, ${0.60 * alpha})`);
    grad.addColorStop(0.82, `rgba(220, 38, 38, ${0.25 * alpha})`);
    grad.addColorStop(1.0, 'rgba(220, 38, 38, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(4, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // C. A2 Birdcage Multi-Slot Gas Compensator Vents (4 Angled Radial Jets)
    const ventAngles = [-1.30, -0.65, 0.65, 1.30];
    const ventLengths = [18, 22, 22, 18];
    for (let v = 0; v < ventAngles.length; v++) {
      const vAngle = ventAngles[v];
      const vLen = ventLengths[v] * progress;
      const vx = Math.cos(vAngle) * vLen;
      const vy = Math.sin(vAngle) * vLen;

      ctx.fillStyle = `rgba(251, 191, 36, ${0.85 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-2 + vx, vy);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // White-hot vent root
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-2 + vx * 0.45, vy * 0.45);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();
    }

    // D. Forward Conical Combustion Flame Plume (High-velocity propellant expansion)
    ctx.fillStyle = `rgba(254, 215, 170, ${0.90 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-3, -4.5 * progress);
    ctx.lineTo(34 * progress, -11 * progress);
    ctx.lineTo(46 * progress, 0);
    ctx.lineTo(34 * progress, 11 * progress);
    ctx.lineTo(-3, 4.5 * progress);
    ctx.closePath();
    ctx.fill();

    // E. 8-Point Aggressive Stretched Starburst Flare
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.85 * alpha})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    const starPoints = 8;
    const outerStarR = 26 * progress;
    const innerStarR = 7 * progress;
    for (let i = 0; i < starPoints * 2; i++) {
      const spAngle = (i * Math.PI) / starPoints;
      const R = i % 2 === 0 ? outerStarR : innerStarR;
      const stretchX = (i % 2 === 0 && Math.cos(spAngle) > 0) ? 2.1 : 1.0;
      const sx = Math.cos(spAngle) * R * stretchX;
      const sy = Math.sin(spAngle) * R;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // F. Supersonic Mach Expansion Shock Diamonds (Mach Discs ahead of bore)
    // First Mach Diamond
    ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
    ctx.strokeStyle = `rgba(253, 224, 71, ${0.95 * alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(10 * progress, 0);
    ctx.lineTo(16 * progress, -4.0 * progress);
    ctx.lineTo(22 * progress, 0);
    ctx.lineTo(16 * progress, 4.0 * progress);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Second Mach Diamond (Further out)
    ctx.beginPath();
    ctx.moveTo(27 * progress, 0);
    ctx.lineTo(32 * progress, -2.8 * progress);
    ctx.lineTo(37 * progress, 0);
    ctx.lineTo(32 * progress, 2.8 * progress);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // G. White-Hot Incandescent Core Diamond at Flash Hider Mouth
    ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4 * progress, -5.5 * progress);
    ctx.lineTo(15 * progress, 0);
    ctx.lineTo(4 * progress, 5.5 * progress);
    ctx.closePath();
    ctx.fill();

    // H. High-Speed Incandescent Powder Sparks & Embers (Shooting forward along cone)
    ctx.fillStyle = `rgba(254, 240, 138, ${0.95 * alpha})`;
    for (let s = 0; s < 7; s++) {
      const sparkSeed = (s * 47.3 + flashTimer * 19.7);
      const sparkAngle = Math.sin(sparkSeed) * 0.40;
      const sparkDist = (15 + (s * 8)) * progress;
      const sparkSize = (1.1 + (s % 3) * 0.6) * progress;
      const spX = Math.cos(sparkAngle) * sparkDist;
      const spY = Math.sin(sparkAngle) * sparkDist;
      ctx.beginPath();
      ctx.arc(spX, spY, sparkSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 10. SUPPORT HAND (Front Hand gripping the M4 Handguard - matching user sketch)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || opts.hideHands || opts.isThrown || opts.inPreview;
  if (!shouldHideHands) {
    let supportHandX = barrelX + 27.0;
    let supportHandY = barrelY + 3.2;
    let showSupportHand = true;

    if (isReloading && reloadTimer > 0) {
      const relP = 1.0 - (reloadTimer / reloadMaxTime);
      if (relP < 0.28) {
        // Phase 1: Hand pulls empty magazine down out of magwell
        const p1 = relP / 0.28;
        supportHandX = barrelX + 5.5 - p1 * 3.0;
        supportHandY = barrelY + 12.0 + p1 * 14.0;
      } else if (relP < 0.55) {
        // Phase 2: Magazine dropped, hand reaches to vest
        const p2 = (relP - 0.28) / 0.27;
        supportHandX = barrelX - 6.0;
        supportHandY = barrelY + 22.0 - Math.sin(p2 * Math.PI) * 4.0;
      } else if (relP < 0.85) {
        // Phase 3: Hand guides fresh magazine UP into the magwell
        const p3 = (relP - 0.55) / 0.30;
        supportHandX = barrelX - 6.0 + p3 * 11.5;
        supportHandY = barrelY + 22.0 - p3 * 10.0;
      } else {
        // Phase 4: Bolt release slap / return to handguard
        const p4 = (relP - 0.85) / 0.15;
        supportHandX = barrelX + 27.0 - (1.0 - p4) * 10.0;
        supportHandY = barrelY + 3.2;
      }
    } else if (isSwitching && switchTimer > 0) {
      const swP = 1.0 - (switchTimer / switchMaxTime);
      if (swP > 0.30 && swP < 0.70) {
        // Hand racks the charging handle
        supportHandX = barrelX - 12.0 + chargingOffset;
        supportHandY = barrelY - 6.0;
      }
    }

    if (showSupportHand) {
      ctx.save();
      ctx.fillStyle = opts.handColor || '#F4CBB2';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(supportHandX, supportHandY, getHandSize(6.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hand shading / finger crease curve
      ctx.strokeStyle = '#D9A083';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(supportHandX, supportHandY - 1.2, getHandSize(4.8), 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Draws John Wick's supersonic 5.56x45mm NATO green-tip rifle bullet projectile
 */
export function drawJohnWickRifleBullet(ctx, p) {
  const vx = p.vx || 0;
  const vy = p.vy || 0;
  const angle = Math.atan2(vy, vx);
  const len = 16;
  const width = 3.2;

  // 1. Supersonic Vapor Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.40)'; // Supersonic cyan-blue shockwave tracer
    ctx.lineWidth = 1.8;
    ctx.stroke();

    const sliceCount = Math.max(1, p.history.length - 4);
    ctx.beginPath();
    ctx.moveTo(p.history[sliceCount - 1].x, p.history[sliceCount - 1].y);
    for (let i = sliceCount; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)'; // Hot yellow-white core
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // 2. High-speed Motion Trail (Reused Cache)
  const trailLen = 28;
  ctx.fillStyle = _getRifleTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(-trailLen, 0);
  ctx.lineTo(-len / 2, -width * 0.8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-len / 2, width * 0.8);
  ctx.closePath();
  ctx.fill();

  // 3. Copper Jacket / Green Tip Penetrator Bullet Core (Reused Cache)
  ctx.fillStyle = _getRifleCoreGrad(ctx);
  ctx.strokeStyle = '#064E3B';
  ctx.lineWidth = 0.7;

  ctx.beginPath();
  ctx.moveTo(-len / 2, -width / 2);
  ctx.lineTo(len * 0.2, -width / 2);
  ctx.quadraticCurveTo(len / 2, 0, len / 2, 0);
  ctx.quadraticCurveTo(len * 0.2, width / 2, len * 0.2, width / 2);
  ctx.lineTo(-len / 2, width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. White core shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-len * 0.15, -width * 0.2);
  ctx.lineTo(len * 0.25, 0);
  ctx.lineTo(-len * 0.15, width * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

