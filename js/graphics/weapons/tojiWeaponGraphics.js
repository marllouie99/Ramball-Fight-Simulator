import { CONFIG, getHandSize } from '../../core/config.js';

/**
 * Visual & Animation Speed Configuration for Toji's Weapons.
 * Adjust these values to speed up or slow down weapon attack animations.
 */
export const TOJI_WEAPON_CONFIG = {
  // Global animation speed multiplier (e.g. 1.0 = normal, 1.5 = 50% faster, 2.0 = 2x speed)
  animationSpeed: 1.5,

  // Duration in frames for each phantom flurry slash swing
  flurrySlashDuration: 10,

  // Spear melee swing speed multiplier
  spearSwingAnimSpeed: 1.0,

  // Split Soul Katana slash speed multiplier
  katanaSlashAnimSpeed: 1.0,
};

/**
 * Draws natural physics-simulated metal chain links with real hollow centers.
 */
export function drawPhysicsChain(ctx, chainNodes) {
  if (!chainNodes || chainNodes.length < 2) return;

  ctx.save();

  // 1. Continuous dark metallic spine underlay (guarantees zero gaps between links when bending)
  ctx.beginPath();
  ctx.moveTo(chainNodes[0].x, chainNodes[0].y);
  for (let i = 1; i < chainNodes.length; i++) {
    ctx.lineTo(chainNodes[i].x, chainNodes[i].y);
  }
  ctx.strokeStyle = '#1A1E24';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 2. Interlocking hollow metal links
  for (let i = 1; i < chainNodes.length; i++) {
    const ptA = chainNodes[i - 1];
    const ptB = chainNodes[i];
    const midX = (ptA.x + ptB.x) / 2;
    const midY = (ptA.y + ptB.y) / 2;
    const linkAngle = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(linkAngle);

    if (i % 2 === 0) {
      // Face-on hollow link with evenodd fill (real hole!)
      ctx.beginPath();
      ctx.roundRect(-5.5, -3.2, 11, 6.4, 2.5);
      ctx.roundRect(-2.8, -1.4, 5.6, 2.8, 1.2);
      ctx.fillStyle = '#4A5260';
      ctx.fill('evenodd');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      // Side-on connecting metallic link
      ctx.beginPath();
      ctx.roundRect(-2, -4.5, 4, 9, 1.2);
      ctx.fillStyle = '#2A2F38';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Metallic highlight
      ctx.fillStyle = '#8A95A5';
      ctx.fillRect(-0.6, -3, 1.2, 6);
    }

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws Toji's Inverted Spear of Heaven (Accurate to anime reference)
 */
export function drawInvertedSpear(ctx, cx, cy, angle, r = 25, chainNodes = null, handColor = '#242722', baseAngle = null) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const flipAngle = baseAngle !== null ? baseAngle : angle;
  const normAngle = Math.atan2(Math.sin(flipAngle), Math.cos(flipAngle));
  if (Math.abs(normAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position weapon relative to fighter radius
  ctx.translate(r - 4, 0);

  // Scale for optimal UI/Game visibility
  const scale = 0.75;
  ctx.scale(scale, scale);

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.toji) ? state.weaponCustomizations.toji : null;
  if (custom) {
    ctx.translate(custom.offsetX, custom.offsetY);
    ctx.scale(custom.scale, custom.scale);
    ctx.rotate(custom.angleOffset);
  }

  // 1. Draw static chain fallback if physics nodes not passed (UI / preview cards)
  if (!chainNodes) {
    const staticNodes = [];
    const p0 = { x: 0, y: 0 };
    const p1 = { x: -4, y: 12 };
    const p2 = { x: -7, y: 26 };
    const p3 = { x: -8, y: 40 };
    const numLinks = 9;
    for (let i = 0; i <= numLinks; i++) {
      const t = i / numLinks;
      const invT = 1 - t;
      const x = invT * invT * invT * p0.x + 3 * invT * invT * t * p1.x + 3 * invT * t * t * p2.x + t * t * t * p3.x;
      const y = invT * invT * invT * p0.y + 3 * invT * invT * t * p1.y + 3 * invT * t * t * p2.y + t * t * t * p3.y;
      staticNodes.push({ x, y });
    }
    drawPhysicsChain(ctx, staticNodes);
  }

  // 2. Solid Gold Ring (Butt of the handle at X=0)
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#D4AF37';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner hole of the ring
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();

  // 3. Brown Ribbed Handle (X=7 to X=34)
  ctx.fillStyle = '#4A2311'; // Dark wood/leather brown
  ctx.fillRect(7, -4.5, 27, 9);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(7, -4.5, 27, 9);

  // Draw 3D Ribbed Rings on Handle
  const ribCount = 7;
  const ribWidth = 27 / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const rx = 7 + i * ribWidth;
    ctx.fillStyle = (i % 2 === 0) ? '#5C2D17' : '#3B1A0C';
    ctx.beginPath();
    ctx.roundRect(rx, -5, ribWidth - 0.5, 10, 1);
    ctx.fill();
  }

  // 3.5. Single hand gripping the dagger handle (Anime accurate 1-handed assassin grip)
  ctx.save();
  ctx.beginPath();
  ctx.arc(22, 1, getHandSize(6.0), 0, Math.PI * 2);
  ctx.fillStyle = handColor || '#E8BD9B';
  ctx.fill();
  ctx.strokeStyle = '#0E0E12';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // 4. Golden Collar / Habaki (X=34 to X=38)
  ctx.fillStyle = '#E5C158';
  ctx.fillRect(34, -6, 4, 12);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(34, -6, 4, 12);

  // 5. Dark Metal Tsuba / Guard (X=38 to X=44)
  ctx.fillStyle = '#303438';
  ctx.beginPath();
  ctx.roundRect(38, -13, 6, 26, 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Highlight on Guard
  ctx.fillStyle = '#525860';
  ctx.fillRect(39, -12, 2, 24);

  // 6. BLADE RENDERING (X=44 to X=118)
  // Silver Metallic Gradient colors
  const mainBladeColor = '#D8DDE2';
  const shadowColor = '#9DA4AC';
  const bevelHighlight = '#FFFFFF';
  const outlineColor = '#000000';

  ctx.fillStyle = mainBladeColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.8;

  // Outer path: Straight spine on top (-Y), U-Slot and Short Blade Prong on bottom (+Y)
  ctx.beginPath();
  ctx.moveTo(44, -7); // Top guard join

  // Stepped shoulder top (-Y)
  ctx.lineTo(48, -7);
  ctx.lineTo(48, -9);
  ctx.lineTo(54, -9);
  ctx.lineTo(54, -7);

  // Straight Top Spine extending to the tip
  ctx.lineTo(104, -7);

  // Tanto Front Tip
  ctx.lineTo(118, 1);  // Sharp front point
  ctx.lineTo(106, 7);  // Bottom bevel cut

  // Main Blade bottom cutting edge (+Y)
  ctx.lineTo(80, 7);

  // Entrance to U-Slot (going backwards toward hilt)
  ctx.lineTo(80, 2);   // Step into slot channel
  ctx.lineTo(58, 2);   // Slot upper wall
  ctx.arc(58, 4, 2, -Math.PI / 2, Math.PI / 2, true); // Rounded U-bottom
  ctx.lineTo(74, 6);   // Slot lower wall (inner edge of short prong)

  // Short Blade / Hook Prong tip (pointing forward)
  ctx.lineTo(80, 14);  // Sharp tip of short blade

  // Short Blade outer edge (going back to guard)
  ctx.lineTo(66, 16);  // Outer slanted edge of short blade
  ctx.lineTo(52, 11);  // Base of short blade

  // Stepped shoulder bottom (+Y)
  ctx.lineTo(48, 11);
  ctx.lineTo(48, 8);
  ctx.lineTo(44, 8);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // 7. Dark Metal Inscription / Talisman Markings on Base (X=45 to X=54)
  ctx.fillStyle = '#22262A';
  ctx.fillRect(46, -4, 7, 8);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, -4, 7, 8);

  // Tiny rune details
  ctx.fillStyle = '#888';
  ctx.fillRect(47, -2, 2, 4);
  ctx.fillRect(50, -2, 2, 4);

  // 8. Blade Bevel Lines & Shading
  // Central ridge line along main blade
  ctx.beginPath();
  ctx.moveTo(58, 0);
  ctx.lineTo(116, 0);
  ctx.strokeStyle = shadowColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight along straight top spine (inset slightly by 0.8px so it sits inside the black outline)
  ctx.beginPath();
  ctx.moveTo(54, -6.2);
  ctx.lineTo(103, -6.2);
  ctx.lineTo(116.5, 1);
  ctx.strokeStyle = bevelHighlight;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Highlight on short blade prong (inset slightly so it sits inside the black outline)
  ctx.beginPath();
  ctx.moveTo(53, 10.2);
  ctx.lineTo(66, 15);
  ctx.lineTo(79, 13.2);
  ctx.strokeStyle = bevelHighlight;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 9. FINAL OUTER BLACK STROKE (Guaranteed on top of all fills & highlights)
  ctx.beginPath();
  ctx.moveTo(44, -7);
  ctx.lineTo(48, -7);
  ctx.lineTo(48, -9);
  ctx.lineTo(54, -9);
  ctx.lineTo(54, -7);
  ctx.lineTo(104, -7);
  ctx.lineTo(118, 1);
  ctx.lineTo(106, 7);
  ctx.lineTo(80, 7);
  ctx.lineTo(80, 2);
  ctx.lineTo(58, 2);
  ctx.arc(58, 4, 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(74, 6);
  ctx.lineTo(80, 14);
  ctx.lineTo(66, 16);
  ctx.lineTo(52, 11);
  ctx.lineTo(48, 11);
  ctx.lineTo(48, 8);
  ctx.lineTo(44, 8);
  ctx.closePath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Toji's Split Soul Katana (Accurate slender curved Katana reference)
 */
export function drawSplitSoulKatana(ctx, cx, cy, angle, r = 25, handColor = '#242722', baseAngle = null) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const flipAngle = baseAngle !== null ? baseAngle : angle;
  const normAngle = Math.atan2(Math.sin(flipAngle), Math.cos(flipAngle));
  if (Math.abs(normAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position weapon relative to fighter radius
  ctx.translate(r - 2, 0);

  const scale = 0.95; // Increased scale for grand imposing Katana proportions!
  ctx.scale(scale, scale);

  // 1. Red & Silver Pommel Cap (X=0 to X=6)
  ctx.fillStyle = '#8E1B1B'; // Deep Red
  ctx.fillRect(0, -3, 6, 6);
  ctx.fillStyle = '#CCCCCC'; // Silver End Band
  ctx.fillRect(0, -3, 2, 6);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(0, -3, 6, 6);

  // 2. Slim Dark Wrapped Handle (X=6 to X=40)
  ctx.fillStyle = '#32342E';
  ctx.fillRect(6, -2.5, 34, 5);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(6, -2.5, 34, 5);

  // Wrap Texture
  ctx.strokeStyle = '#111210';
  ctx.lineWidth = 1.8;
  for (let i = 9; i < 39; i += 3.5) {
    ctx.beginPath();
    ctx.moveTo(i, -2.5);
    ctx.lineTo(i + 2, 2.5);
    ctx.stroke();
  }

  // Hand gripping Katana handle
  ctx.save();
  ctx.beginPath();
  ctx.arc(24, 0, getHandSize(5.8), 0, Math.PI * 2);
  ctx.fillStyle = handColor || '#E8BD9B';
  ctx.fill();
  ctx.strokeStyle = '#0E0E12';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // Dark Metal Habaki / Collar (X=40 to X=44)
  ctx.fillStyle = '#4D5159';
  ctx.fillRect(40, -8, 4, 16);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(40, -8, 4, 16);

  // 3. BROAD CURVED BLADE WITH SMOOTH CRESCENT TIP (X=44 to X=164)
  const darkSpineColor = '#2A2D34';
  const silverEdgeColor = '#E2E6EC';
  const highlightColor = '#FFFFFF';

  const bStart = 44;
  const bLen = 120; // total X to 164
  const bWidth = 16;
  const curveY = -35;

  // Key control points for Crescent Blade geometry (Smooth C1 tangent matching)
  const spineStartX = bStart;
  const spineStartY = -bWidth / 2;
  const tipX = bStart + bLen;
  const tipY = -bWidth / 2 + curveY;

  const T_body = 0.82;
  const bodyEndX = bStart + bLen * T_body;
  const bodyEndY = bWidth / 2 + T_body * T_body * curveY;
  const bodyStartX = bStart;
  const bodyStartY = bWidth / 2;

  const tipCtrlX = 153.2;
  const tipCtrlY = -21.2;

  // Base Blade Fill (Dark Charcoal)
  ctx.beginPath();
  ctx.moveTo(spineStartX, spineStartY);
  ctx.quadraticCurveTo(bStart + bLen * 0.5, spineStartY, tipX, tipY);
  ctx.quadraticCurveTo(tipCtrlX, tipCtrlY, bodyEndX, bodyEndY);
  ctx.quadraticCurveTo(bStart + (bodyEndX - bStart) * 0.5, bodyStartY, bodyStartX, bodyStartY);
  ctx.closePath();
  ctx.fillStyle = darkSpineColor;
  ctx.fill();

  // Draw Silver Cutting Edge & Crescent Tip (Silver Hamon)
  const silverWidth = 5.5;
  const hamonStartX = bStart;
  const hamonStartY = bWidth / 2 - silverWidth;
  const hamonBodyEndX = bodyEndX;
  const hamonBodyEndY = bodyEndY - silverWidth * 0.6;

  ctx.beginPath();
  ctx.moveTo(hamonStartX, hamonStartY);
  ctx.quadraticCurveTo(bStart + (bodyEndX - bStart) * 0.5, hamonStartY, hamonBodyEndX, hamonBodyEndY);
  ctx.quadraticCurveTo(tipCtrlX, tipCtrlY - 3, tipX, tipY);
  ctx.quadraticCurveTo(tipCtrlX, tipCtrlY, bodyEndX, bodyEndY);
  ctx.quadraticCurveTo(bStart + (bodyEndX - bStart) * 0.5, bodyStartY, bodyStartX, bodyStartY);
  ctx.closePath();
  ctx.fillStyle = silverEdgeColor;
  ctx.fill();

  // Add a bright white shine line following the crescent sweep
  ctx.beginPath();
  ctx.moveTo(bStart, bWidth / 4);
  ctx.quadraticCurveTo(bStart + (bodyEndX - bStart) * 0.5, bWidth / 4, bodyEndX, bodyEndY - 1);
  ctx.quadraticCurveTo(tipCtrlX, tipCtrlY - 1.5, tipX - 2, tipY + 1.5);
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. FINAL BOLD BLACK OUTER BLADE OUTLINE STROKE
  ctx.beginPath();
  ctx.moveTo(spineStartX, spineStartY);
  ctx.quadraticCurveTo(bStart + bLen * 0.5, spineStartY, tipX, tipY);
  ctx.quadraticCurveTo(tipCtrlX, tipCtrlY, bodyEndX, bodyEndY);
  ctx.quadraticCurveTo(bStart + (bodyEndX - bStart) * 0.5, bodyStartY, bodyStartX, bodyStartY);
  ctx.closePath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.2; // Bold crisp anime outline!
  ctx.stroke();

  // 5. FLOWING WHITE FUR COLLAR (With crisp black outlines)
  ctx.fillStyle = '#F8F9FB';
  ctx.strokeStyle = '#000000'; // Black stroke for fur edges!
  ctx.lineWidth = 1.8;

  // Streamlined fur locks hugging the broader blade base
  const furLocks = [
    // Top locks
    [{ x: 36, y: -6 }, { x: 48, y: -16 }, { x: 58, y: -13 }, { x: 44, y: -5 }],
    [{ x: 40, y: -4 }, { x: 54, y: -18 }, { x: 66, y: -11 }, { x: 48, y: -3 }],
    [{ x: 38, y: -2 }, { x: 56, y: -8 }, { x: 68, y: -6 }, { x: 46, y: 0 }],
    // Bottom locks
    [{ x: 36, y: 6 }, { x: 48, y: 16 }, { x: 58, y: 13 }, { x: 44, y: 5 }],
    [{ x: 40, y: 4 }, { x: 54, y: 18 }, { x: 66, y: 11 }, { x: 48, y: 3 }],
    [{ x: 38, y: 2 }, { x: 56, y: 8 }, { x: 68, y: 6 }, { x: 46, y: 0 }],
    // Middle overlay locks
    [{ x: 34, y: -3 }, { x: 50, y: -5 }, { x: 60, y: -2 }, { x: 44, y: -1 }],
    [{ x: 34, y: 3 }, { x: 50, y: 5 }, { x: 60, y: 2 }, { x: 44, y: 1 }],
  ];

  furLocks.forEach(pts => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    ctx.quadraticCurveTo(pts[3].x, pts[3].y, pts[0].x, pts[0].y);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Renders Toji's Split Soul Katana rested over his right shoulder/back (Lore Dual-Wield Back Holster Stance).
 */
export function drawRestedKatanaOverShoulder(ctx, cx, cy, angle, r = 25, handColor = '#E8BD9B') {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const isFacingLeft = Math.abs(normAngle) > Math.PI / 2;

  if (isFacingLeft) {
    ctx.rotate(angle + Math.PI * 1.02);
    ctx.translate(-r * 0.30, -r * 0.85);
    ctx.scale(0.85, -0.85);
  } else {
    ctx.rotate(angle - Math.PI * 1.02);
    ctx.translate(-r * 0.30, r * 0.85);
    ctx.scale(0.85, 0.85);
  }

  ctx.rotate(-0.05);
  drawSplitSoulKatana(ctx, 0, 0, 0, 0, handColor);

  ctx.restore();
}

/**
 * Renders Toji's Inverted Spear of Heaven rested at his left hip/back sheath.
 */
export function drawRestedInvertedSpearAtHip(ctx, cx, cy, angle, r = 25, chainNodes = null, handColor = '#E8BD9B') {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(cx, cy);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const isFacingLeft = Math.abs(normAngle) > Math.PI / 2;

  if (isFacingLeft) {
    ctx.rotate(angle - Math.PI * 0.45);
    ctx.translate(-r * 0.4, -r * 0.6);
    ctx.scale(0.60, -0.60);
  } else {
    ctx.rotate(angle + Math.PI * 0.45);
    ctx.translate(-r * 0.4, r * 0.6);
    ctx.scale(0.60, 0.60);
  }

  drawInvertedSpear(ctx, 0, 0, 0, 0, chainNodes, handColor);

  ctx.restore();
}
