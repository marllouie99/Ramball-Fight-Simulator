// crimsonsniperWeaponGraphics.js
//  - Use this file for Crimson Sniper-specific weapon graphics (red sniper rifle).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Crimson Sniper weapon visuals, edit the palette or drawRedSniperGun() below.

import { getHandSize } from '../../core/config.js';

export const CRIMSON_SNIPER_WEAPON_GRAPHICS = {
  colors: {
    // 1:1 Reference Artwork Color Palette
    outline: '#0f121a',         // Deep dark pixel ink outline

    // White / Platinum Armor Plating
    whiteShine: '#ffffff',      // Specular highlight / glint cuts
    whiteLight: '#eef2f8',      // Main white armor shell
    whiteMid: '#c5cee0',        // Mid silver bevel
    whiteDark: '#8a9ab5',       // Armor panel shadow
    whiteDeep: '#54637d',       // Deepest armor crease

    // Titanium / Gunmetal Chassis & Barrel
    metalGlint: '#8a9bbd',      // Top bevel glint
    metalLight: '#5d6d8a',      // Highlight metal
    metalMid: '#3d485e',        // Mid gunmetal body
    metalDark: '#262d3d',       // Dark metal base
    metalDeep: '#181c26',       // Shadowed receiver plate
    metalBlack: '#0d0f15',      // Deepest recess / barrel core

    // Carbon Fiber / Hex Mesh Textures
    meshBg: '#1b1f2b',          // Dark mesh base
    meshDot1: '#2f374a',        // Mesh weave dot 1
    meshDot2: '#45506b',        // Mesh weave dot 2

    // Neon Energy Conduits & Glowing Ammo Nodes (Matching Reference Gold/Amber + Crimson)
    glowCore: '#ffffff',        // White-hot center
    glowBright: '#ffe033',      // Blinding neon gold/yellow
    glowMid: '#ff9e00',         // Vibrant amber glow
    glowDark: '#d9480f',        // Deep orange/crimson conduit trench
    glowOff: '#191d26',         // Dimmed spent node slot
    triggerOrange: '#ff8800',   // Curved amber trigger

    // Scope Optics & Accents
    lensGlint: '#ffffff',       // Lens glass glint
    lensCyanLight: '#7dd3fc',   // Optic lens highlight
    lensCyanDark: '#0284c7',    // Deep optic chamber
  },
  positioning: {
    scale: 0.65,
    baseX: -4,
  }
};

export function drawRedSniperGun(
  ctx,
  x,
  y,
  gunAngle,
  r,
  recoil = 0,
  ammo = 4,
  maxAmmo = 4,
  reloadTimer = 0,
  isReloading = false,
  flashTimer = 0,
  tensionIntensity = 0,
  fighterColor = '#ff1111'
) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  ctx.save();
  ctx.translate(x, y);

  // Recoil kick rotation & backward displacement
  const kickAngle = Math.sin((recoil * Math.PI) / 2) * -0.13;
  ctx.rotate(gunAngle + kickAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  const cfg = CRIMSON_SNIPER_WEAPON_GRAPHICS;
  const s = cfg.positioning.scale;
  const bx = r + cfg.positioning.baseX;

  const kickback = Math.sin((recoil * Math.PI) / 2) * 12;
  ctx.translate(bx - kickback, 0);

  const C = cfg.colors;
  const now = Date.now();
  const pulse = Math.sin(now / 130) * 0.5 + 0.5; // 0 to 1

  // ═══════════════════════════════════════════════════════════════════
  // HIGH-PRECISION PIXEL GRID ENGINE
  // ═══════════════════════════════════════════════════════════════════
  const P = 1.05 * s; // Fine pixel block unit matching the reference resolution

  const px = (gx, gy, fill) => {
    if (!fill) return;
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(P), Math.round(P));
  };

  const pxRect = (gx, gy, gw, gh, fill) => {
    if (!fill) return;
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // Draw carbon fiber / hex mesh pattern
  const pxMesh = (gx, gy, gw, gh) => {
    pxRect(gx, gy, gw, gh, C.meshBg);
    for (let my = 0; my < gh; my++) {
      for (let mx = 0; mx < gw; mx++) {
        if ((mx + my) % 2 === 0) {
          px(gx + mx, gy + my, C.meshDot1);
        } else if ((mx + my) % 4 === 1) {
          px(gx + mx, gy + my, C.meshDot2);
        }
      }
    }
  };

  // Draw glowing energy conduit node (on barrel & receiver)
  const drawCapsuleNode = (gx, gy, isLit) => {
    // 6x3 capsule node
    pxRect(gx - 1, gy - 1, 8, 5, C.outline);
    if (isLit) {
      pxRect(gx, gy, 6, 3, C.glowDark);
      pxRect(gx + 1, gy, 4, 3, C.glowMid);
      pxRect(gx + 1, gy + 1, 4, 1, C.glowBright);
      px(gx + 2, gy + 1, C.glowCore);
      px(gx + 3, gy + 1, C.glowCore);
    } else {
      pxRect(gx, gy, 6, 3, C.glowOff);
      pxRect(gx + 1, gy + 1, 4, 1, C.metalDeep);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // 1. TENSION AURA (Enhanced Execution Shot Ready)
  // ═══════════════════════════════════════════════════════════════════
  if (tensionIntensity > 0) {
    const t = now / 110;
    for (let i = 0; i < 9; i++) {
      const pTime = (t * 0.7 + i * 1.6) % 4.5;
      const pX = -10 + i * 11 + Math.sin(t + i) * 3;
      const pY = -12 - pTime * 3.5;
      const pSize = Math.max(1, 3 - Math.floor(pTime * 0.7));
      ctx.fillStyle = i % 2 === 0 ? C.glowBright : C.glowMid;
      ctx.globalAlpha = Math.max(0, (1 - pTime / 4.5) * tensionIntensity);
      ctx.fillRect(Math.round(pX * P), Math.round(pY * P), Math.round(pSize * P), Math.round(pSize * P));
    }
    ctx.globalAlpha = 1.0;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. BUTTSTOCK, CARBON MESH & SOLID THUMBHOLE (Exact 1:1 Reference)
  // ═══════════════════════════════════════════════════════════════════
  // ── 2.1 Angled White & Dark Buttpad with Sharp Toe (Leftmost) ──
  // Outer angled white frame
  pxRect(-58, -6, 6, 20, C.outline);
  pxRect(-57, -5, 4, 18, C.whiteMid);
  pxRect(-57, -5, 2, 18, C.whiteShine); // Rear glint
  pxRect(-54, -4, 2, 16, C.whiteDark);

  // Lower pointed toe extending down-left
  pxRect(-59, 10, 5, 5, C.outline);
  pxRect(-58, 11, 3, 3, C.whiteShine);
  pxRect(-55, 12, 2, 2, C.whiteMid);

  // Recessed dark rubber cushion core inside buttpad
  pxRect(-54, -3, 6, 12, C.outline);
  pxRect(-53, -2, 4, 10, C.metalDeep);
  pxRect(-53, -2, 2, 10, C.metalDark);

  // Undercut shadow notch above bottom toe
  pxRect(-53, 8, 6, 4, C.metalBlack);

  // ── 2.2 White Armor Cheek-Crest & Inset Circular Port (Top) ──
  // Sweeping top white armor shell
  pxRect(-54, -8, 28, 8, C.outline);
  pxRect(-53, -7, 26, 6, C.whiteLight);
  pxRect(-53, -7, 26, 1, C.whiteShine); // Pure specular top edge
  pxRect(-53, -4, 26, 2, C.whiteMid);
  pxRect(-53, -2, 26, 1, C.whiteDark);

  // Forward sloping crest bevel
  pxRect(-28, -6, 6, 4, C.outline);
  pxRect(-27, -5, 4, 2, C.whiteShine);

  // Circular Port / Socket Inset in the white armor (X = -44, Y = -3)
  pxRect(-46, -5, 6, 6, C.outline);
  pxRect(-45, -4, 4, 4, C.whiteMid);
  pxRect(-45, -4, 2, 2, C.whiteShine);
  pxRect(-44, -3, 2, 2, C.metalDeep); // Dark socket core

  // ── 2.3 Continuous Carbon Fiber / Honeycomb Mesh Body ──
  // Flows across the entire cheek and upper stock section
  pxRect(-50, -1, 32, 10, C.outline);
  pxMesh(-49, 0, 30, 8);

  // Upper stock horizontal titanium beam
  pxRect(-34, -2, 18, 4, C.outline);
  pxRect(-33, -1, 16, 2, C.metalDark);
  pxRect(-33, -1, 16, 1, C.metalGlint);

  // ── 2.4 Solid Sculpted Triangular Thumbhole Loop ──
  // Solid thick diagonal titanium plate running from bottom buttstock to grip base
  // Rendered as a continuous solid 6px-wide diagonal armor bridge
  for (let s = 0; s < 18; s++) {
    const sx = -48 + s * 1.6;
    const sy = 6 + s * 0.75;
    pxRect(Math.round(sx), Math.round(sy), 6, 5, C.outline);
    pxRect(Math.round(sx + 1), Math.round(sy + 1), 4, 3, C.metalDark);
    pxRect(Math.round(sx + 1), Math.round(sy + 1), 4, 1, C.metalGlint); // Top edge glint
    pxRect(Math.round(sx + 1), Math.round(sy + 3), 4, 1, C.metalBlack); // Underside shadow
  }

  // Inner Bronze/Slate Bevel Arch around the triangular cutout
  pxRect(-32, 2, 14, 2, '#4d4436');
  pxRect(-26, 4, 8, 2, '#5e5443');
  pxRect(-20, 6, 4, 2, '#4d4436');

  // Interior Organic Triangular Cutout Shadow Window
  pxRect(-30, 4, 12, 5, 'rgba(10, 12, 18, 0.85)');
  pxRect(-26, 9, 6, 3, 'rgba(10, 12, 18, 0.85)');

  // ═══════════════════════════════════════════════════════════════════
  // 3. ERGONOMIC SCULPTED PISTOL GRIP & FOREGUARD FIN
  // ═══════════════════════════════════════════════════════════════════
  // ── Sculpted White Armor Grip Frame with Undulating Finger Grooves ──
  pxRect(-18, 4, 9, 18, C.outline);
  pxRect(-17, 5, 7, 16, C.whiteLight);
  pxRect(-17, 5, 2, 16, C.whiteShine);

  // Undulating Finger Grooves on front edge of grip
  px(-19, 7, C.whiteShine);
  px(-19, 12, C.whiteShine);
  px(-19, 17, C.whiteShine);

  // Dark textured inner grip panel
  pxRect(-14, 7, 3, 12, C.metalDeep);
  pxRect(-13, 8, 1, 10, C.metalDark);

  // Bottom Grip Heel Cap
  pxRect(-19, 21, 9, 3, C.outline);
  pxRect(-18, 22, 7, 1, C.whiteMid);

  // ── Curved Bright Orange Trigger & Guard ──
  pxRect(-10, 4, 3, 8, C.outline);
  pxRect(-10, 10, 8, 3, C.outline);
  pxRect(-4, 6, 3, 6, C.outline);

  // Curved bright orange trigger blade
  pxRect(-6, 6, 3, 4, C.triggerOrange);
  px(-5, 6, C.glowCore);
  px(-4, 9, C.triggerOrange);

  // ── Circular Pivot Medallion on Receiver ──
  pxRect(-6, 2, 6, 6, C.outline);
  pxRect(-5, 3, 4, 4, C.metalMid);
  pxRect(-4, 4, 2, 2, C.metalGlint);
  px(-4, 4, C.glowCore);

  // ── Forward-Slanted Carbon-Mesh Foreguard Fin ──
  // Sweeps down and forward in front of the trigger
  for (let fin = 0; fin < 14; fin++) {
    const fx = -7 + fin * 1.5;
    const fy = 9 + fin * 1.4;
    pxRect(Math.round(fx), Math.round(fy), 6, 4, C.outline);
    pxMesh(Math.round(fx + 1), Math.round(fy + 1), 4, 2);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. MAIN RECEIVER, HEAT FIN SLITS & SWEEPING LOWER HULL
  // ═══════════════════════════════════════════════════════════════════
  // Central titanium receiver housing
  pxRect(-18, -6, 60, 10, C.outline);
  pxRect(-17, -5, 58, 8, C.metalDark);
  pxRect(-17, -5, 58, 1, C.metalGlint);
  pxRect(-17, -4, 58, 4, C.metalMid);

  // ── 4 Angled/Ribbed Heatsink Cooling Vents (Top of Receiver) ──
  for (let i = 0; i < 4; i++) {
    const rx = 10 + i * 5;
    pxRect(rx, -9, 3, 4, C.outline);
    pxRect(rx + 1, -8, 2, 3, C.metalLight);
    px(rx + 1, -8, C.metalGlint);
  }

  // ── Sweeping White/Silver Lower Armor Hull ──
  pxRect(-2, 4, 52, 7, C.outline);
  pxRect(-1, 5, 50, 5, C.whiteLight);
  pxRect(-1, 5, 50, 1, C.whiteShine); // Specular top edge
  pxRect(-1, 8, 50, 1, C.whiteMid);
  pxRect(-1, 9, 50, 1, C.whiteDark);  // Underside shadow

  // Forward aerodynamic hull beak
  pxRect(48, 6, 8, 4, C.outline);
  pxRect(49, 7, 6, 2, C.whiteLight);
  px(49, 7, C.whiteShine);

  // ── 3 Diagonal Specular Glint Cuts (/// on Lower Hull) ──
  // Glint 1
  px(32, 6, C.whiteShine); px(31, 7, C.whiteShine); px(30, 8, C.whiteShine);
  // Glint 2
  px(36, 6, C.whiteShine); px(35, 7, C.whiteShine); px(34, 8, C.whiteShine);
  // Glint 3
  px(40, 6, C.whiteShine); px(39, 7, C.whiteShine); px(38, 8, C.whiteShine);

  // ── Flowing Glowing Neon Circuit Conduit (Receiver Seam) ──
  const recGlow = pulse > 0.5 ? C.glowBright : C.glowMid;
  pxRect(4, 0, 16, 2, recGlow);
  px(8, 0, C.glowCore);
  px(16, 0, C.glowCore);

  // ═══════════════════════════════════════════════════════════════════
  // 5. MODULAR ARMORED SNIPER SCOPE (Exact 1:1 Reference Match)
  // ═══════════════════════════════════════════════════════════════════
  // ── 5.1 Central Angled Cantilever Mounting Strut (Bottom) ──
  pxRect(-2, -10, 10, 4, C.outline);
  pxRect(-1, -9, 8, 3, C.metalDeep);
  pxRect(4, -11, 6, 5, C.outline);
  pxRect(5, -10, 4, 3, C.metalDark);
  // Strut hinge bolt
  pxRect(6, -9, 2, 2, C.metalGlint);
  px(6, -9, C.glowCore);

  // ── 5.2 Rear Ocular Section & Sharp Visor Fin (Left) ──
  // Sharp white top visor fin overhanging to the left
  pxRect(-26, -18, 10, 4, C.outline);
  pxRect(-25, -17, 8, 2, C.whiteLight);
  pxRect(-25, -17, 8, 1, C.whiteShine);
  pxRect(-27, -19, 4, 2, C.outline); // Sharp rearward tip
  pxRect(-26, -18, 3, 1, C.whiteShine);

  // Angled Rear Eyepiece Housing (Slanted forward)
  pxRect(-23, -16, 8, 7, C.outline);
  pxRect(-22, -15, 6, 5, C.metalDeep);

  // Angled Yellow Glowing Ocular Slit on Rear Face
  pxRect(-24, -17, 2, 3, C.outline);
  px(-23, -16, C.glowBright);
  px(-23, -15, C.glowCore);
  px(-22, -14, C.glowBright);
  px(-21, -13, C.glowMid);

  // ── 5.3 Main Scope Center Body & Armored Roof ──
  // Scope dark titanium body tube
  pxRect(-16, -16, 28, 6, C.outline);
  pxRect(-15, -15, 26, 4, C.metalDark);
  pxRect(-15, -15, 26, 1, C.metalLight);

  // Main White Armor Top Shroud
  pxRect(-16, -21, 28, 6, C.outline);
  pxRect(-15, -20, 26, 4, C.whiteLight);
  pxRect(-15, -20, 26, 1, C.whiteShine); // Pure specular top edge
  pxRect(-15, -17, 26, 1, C.whiteDark);

  // Front slope of center white armor
  pxRect(10, -19, 4, 4, C.outline);
  pxRect(10, -18, 2, 2, C.whiteMid);

  // ── 5.4 Dual Circular Metallic Dials (Side of Scope) ──
  // Dial 1 (Left - Large Dial) centered at X = -5, Y = -14
  pxRect(-8, -17, 7, 7, C.outline);
  pxRect(-7, -16, 5, 5, C.metalLight);
  pxRect(-6, -15, 3, 3, C.metalDeep);
  px(-5, -14, C.whiteShine); // Center bolt glint

  // Dial 2 (Right - Smaller Dial) centered at X = 2, Y = -14
  pxRect(0, -16, 5, 5, C.outline);
  pxRect(1, -15, 3, 3, C.metalLight);
  px(2, -14, C.whiteShine);

  // ── 5.5 Wavy Glowing Neon Yellow Power Conduit Line ──
  // Loops under Dial 1, curves up between the dials, loops under Dial 2, and extends forward
  const scopeGlow = pulse > 0.5 ? C.glowBright : C.glowMid;
  // Under Dial 1:
  pxRect(-12, -12, 4, 2, scopeGlow);
  pxRect(-8, -10, 7, 2, scopeGlow);
  px(-5, -10, C.glowCore);
  // Curve up between dials:
  pxRect(-1, -12, 2, 3, scopeGlow);
  px(-1, -13, C.glowCore);
  // Under Dial 2:
  pxRect(1, -11, 5, 2, scopeGlow);
  px(3, -11, C.glowCore);
  // Straight forward bridge to front objective bell:
  pxRect(6, -12, 14, 2, scopeGlow);
  px(12, -12, C.glowCore);
  px(17, -12, C.glowCore);

  // ── 5.6 Elevated Front Objective Bell (Right) ──
  // Connecting energy tube/bridge
  pxRect(12, -14, 8, 4, C.outline);
  pxRect(13, -13, 6, 2, C.metalDeep);

  // Front Objective Housing (Raised & Forward)
  pxRect(18, -18, 14, 8, C.outline);
  pxRect(19, -17, 12, 6, C.metalDark);
  pxRect(19, -17, 12, 1, C.metalLight);

  // Elevated White/Platinum Angled Armor Hood
  pxRect(16, -21, 16, 5, C.outline);
  pxRect(17, -20, 14, 3, C.whiteLight);
  pxRect(17, -20, 14, 1, C.whiteShine); // Top glint
  pxRect(17, -18, 14, 1, C.whiteMid);
  // Front overhang tip
  pxRect(30, -22, 4, 3, C.outline);
  pxRect(30, -21, 2, 1, C.whiteShine);

  // Front Angled Objective Aperture (Slanted face with glowing amber/yellow lens slit)
  pxRect(28, -19, 4, 10, C.outline);
  pxRect(31, -18, 3, 8, C.outline);
  pxRect(32, -17, 1, 6, C.glowBright); // Glowing front lens slit
  px(32, -16, C.glowCore);
  px(32, -15, C.glowCore);
  px(31, -13, C.glowMid);

  // ═══════════════════════════════════════════════════════════════════
  // 6. PRECISION RAIL BARREL, AMMO NODES & UNDERBARREL RAIL
  // ═══════════════════════════════════════════════════════════════════
  // ── Heavy Cylindrical Barrel Base ──
  pxRect(38, -6, 52, 6, C.outline);
  pxRect(38, -5, 52, 4, C.metalDark);
  pxRect(38, -5, 52, 1, C.metalGlint); // Cylindrical top specular line
  pxRect(38, -2, 52, 1, C.metalBlack); // Underside shadow

  // Continuous Glowing Energy Conduit on Barrel
  const bGlow = pulse > 0.5 ? C.glowBright : C.glowMid;
  pxRect(38, -4, 52, 1, bGlow);

  // ── Dynamic Glowing Power Nodes (Ammo Counter: Lights 1 to 4) ──
  // Capsule node 1
  drawCapsuleNode(44, -5, ammo >= 1);
  // Capsule node 2
  drawCapsuleNode(56, -5, ammo >= 2);
  // Capsule node 3
  drawCapsuleNode(68, -5, ammo >= 3);
  // Capsule node 4 (near muzzle)
  drawCapsuleNode(80, -5, ammo >= 4);

  // ── Underbarrel Handguard / Bipod Rail with Ergonomic Grooves ──
  pxRect(64, 0, 24, 6, C.outline);
  pxRect(65, 1, 22, 4, C.metalDark);
  pxRect(65, 1, 22, 1, C.metalLight);

  // 3 Ergonomic Grip Grooves on Underbarrel Block
  pxRect(68, 3, 3, 2, C.metalBlack);
  pxRect(74, 3, 3, 2, C.metalBlack);
  pxRect(80, 3, 3, 2, C.metalBlack);

  // ── Top-Mounted Front Rail Guide / Loop ──
  pxRect(76, -10, 10, 5, C.outline);
  pxRect(77, -9, 8, 3, C.metalMid);
  pxRect(79, -8, 4, 1, C.metalBlack); // Loop cutout

  // ── Angular Heavy Precision Muzzle Compensator ──
  pxRect(90, -7, 5, 8, C.outline);
  pxRect(91, -6, 3, 6, C.metalDark);
  pxRect(91, -6, 3, 1, C.whiteShine);
  pxRect(94, -6, 3, 6, C.outline);
  pxRect(95, -5, 1, 4, C.metalBlack); // Muzzle exit port

  // ═══════════════════════════════════════════════════════════════════
  // 7. DOTTED PIXEL LASER SIGHT
  // ═══════════════════════════════════════════════════════════════════
  const laserLen = 140;
  const laserAlpha = 0.35 + pulse * 0.35;
  ctx.fillStyle = `rgba(255, 30, 60, ${laserAlpha})`;
  for (let lx = 97; lx < 97 + laserLen; lx += 4) {
    ctx.fillRect(Math.round(lx * P), Math.round(-4 * P), Math.round(2.5 * P), Math.round(1.5 * P));
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. RETRO PIXEL MUZZLE BLAST & SHOCKWAVE (On Recoil Fire)
  // ═══════════════════════════════════════════════════════════════════
  if (recoil > 0) {
    const shockProg = 1.0 - recoil;
    const blastX = 98 + shockProg * 26;
    const blastH = Math.round(4 + shockProg * 14);
    const blastW = Math.round(2 + shockProg * 7);

    // Pixel Shockwave Diamond Rings
    ctx.fillStyle = `rgba(255, 180, 0, ${recoil * 0.9})`;
    for (let dy = -blastH; dy <= blastH; dy += 2) {
      const dx = Math.round((1 - Math.abs(dy) / blastH) * blastW);
      ctx.fillRect(Math.round((blastX + dx) * P), Math.round(dy * P), Math.round(2 * P), Math.round(2 * P));
      ctx.fillRect(Math.round((blastX - dx * 0.4) * P), Math.round(dy * P), Math.round(2 * P), Math.round(2 * P));
    }

    // Muzzle Star Flare
    if (recoil > 0.4) {
      const starS = (recoil - 0.4) * 2;
      ctx.fillStyle = C.glowCore;
      pxRect(97, -4, Math.round(7 * starS), 2, C.glowCore);
      pxRect(99, Math.round(-4 - 3 * starS), 2, Math.round(7 * starS), C.glowCore);
    }
  }

  // ── Reload Finish Flash (Pixel Spark Burst) ──
  if (flashTimer > 0) {
    const fP = flashTimer / 20;
    const fS = Math.round(fP * 6);
    pxRect(12 - fS, 1, fS * 2 + 1, 1, C.glowCore);
    pxRect(12, 1 - fS, 1, fS * 2 + 1, C.glowCore);
    pxRect(11, 0, 3, 3, C.glowBright);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 9. PROPORTIONAL PIXEL GLOVE GRIP (Subtle ~4px Hand)
  // ═══════════════════════════════════════════════════════════════════
  const hx = -14;
  const hy = 11;
  pxRect(hx - 2, hy - 2, 5, 5, C.outline);
  pxRect(hx - 1, hy - 1, 3, 3, fighterColor);
  px(hx - 1, hy - 1, C.whiteShine); // Knuckle highlight
  px(hx + 1, hy + 1, C.metalDeep);  // Palm shadow

  ctx.restore();
}

/**
 * Draws a Crimson Sniper's sci-fi energy projectile with a laser trail effect.
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} p - The projectile object
 * @param {boolean} isEnhanced - Whether this is the final, massively boosted execute shot
 * @param {boolean} isRubbick - Whether this is stolen by Rubbick (turns green)
 */
export function drawCrimsonSniperBullet(ctx, p, isEnhanced = false, isRubbick = false) {
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;
  const prevGlobalAlpha = ctx.globalAlpha;
  const prevCompositeOperation = ctx.globalCompositeOperation;

  // Calculate direction for elongated shape
  let angle = 0;
  if (p.history && p.history.length > 0) {
    const prev = p.history[p.history.length - 1];
    angle = Math.atan2(p.y - prev.y, p.x - prev.x);
  }

  // Draw high-speed wind/smoke trail using history array
  if (p.history && p.history.length > 1) {
    ctx.save();
    
    // Use last few points for the trail
    const startIdx = Math.max(0, p.history.length - (isEnhanced ? 12 : 8));
    
    // Create gradient for trail (dark red to black/transparent)
    const lastPt = p.history[p.history.length - 1];
    const gradient = ctx.createLinearGradient(
      p.history[startIdx].x, p.history[startIdx].y,
      lastPt.x, lastPt.y
    );
    
    if (isEnhanced) {
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(0.7, isRubbick ? 'rgba(0, 150, 0, 0.9)' : 'rgba(150, 0, 0, 0.9)');
      gradient.addColorStop(1, isRubbick ? 'rgba(0, 255, 0, 1)' : 'rgba(255, 0, 0, 1)');
    } else {
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.5, 'rgba(100, 0, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(180, 0, 0, 0.8)');
    }
    
    // Draw thick trail line
    ctx.beginPath();
    ctx.moveTo(p.history[startIdx].x, p.history[startIdx].y);
    for (let i = startIdx + 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = p.r * (isEnhanced ? 3.0 : 1.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // If enhanced, draw chaotic lightning trails
    if (isEnhanced) {
      ctx.beginPath();
      ctx.moveTo(p.history[startIdx].x, p.history[startIdx].y);
      for (let i = startIdx + 1; i < p.history.length; i++) {
        const offset = (Math.random() - 0.5) * p.r * 5;
        ctx.lineTo(p.history[i].x + offset, p.history[i].y - offset);
      }
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Draw the main projectile
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  
  if (isEnhanced) {
    // ═══════════════════════════════════════════════════════
    // ENHANCED EXECUTE SHOT — Crackling Crimson Energy Bolt
    // Inspired by violent lightning: jagged, branching, alive
    // ═══════════════════════════════════════════════════════
    const s = p.r * 0.8;
    
    // 1. Dark smoky haze removed per user request
    
    // Helper: draw a single jagged lightning tendril
    const drawLightningBranch = (startX, startY, endX, endY, width, color, segments) => {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const dx = (endX - startX) / segments;
      const dy = (endY - startY) / segments;
      for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * s * 6;
        const jitterY = (Math.random() - 0.5) * s * 8;
        ctx.lineTo(startX + dx * i + jitterX, startY + dy * i + jitterY);
      }
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    
    // 1.5 Flowing dark & white realistic flames
    // Using bezier curves for an organic, wavy fire look
    for (let i = 0; i < 7; i++) {
      const startX = -s * 10 + Math.random() * s * 25;
      const startY = (Math.random() - 0.5) * s * 4;
      const length = s * 15 + Math.random() * s * 25;
      const width = s * 4 + Math.random() * s * 6;
      
      // Control points for the flowing flame curves
      const cp1X = startX - length * 0.3;
      const cp1Y = startY - width * 1.5;
      const cp2X = startX - length * 0.7;
      const cp2Y = startY + width * 0.5;
      
      const cp3X = startX - length * 0.6;
      const cp3Y = startY + width * 1.5;
      const cp4X = startX - length * 0.2;
      const cp4Y = startY - width * 0.2;
      
      // Draw smooth flowing dark/black outer flame
      ctx.fillStyle = `rgba(${Math.random() * 20}, ${Math.random() * 20}, ${Math.random() * 20}, ${0.8 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Top curve backwards
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, startX - length, startY);
      // Bottom curve coming back to start
      ctx.bezierCurveTo(cp3X, cp3Y, cp4X, cp4Y, startX, startY);
      ctx.closePath();
      ctx.fill();
      
      // Draw smooth white/grey inner core flame
      const innerLength = length * 0.7;
      const innerWidth = width * 0.5;
      
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${0.7 + Math.random() * 0.3})` : `rgba(200, 200, 200, ${0.6 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(startX + s * 2, startY);
      ctx.bezierCurveTo(
        startX - innerLength * 0.3, startY - innerWidth * 1.5,
        startX - innerLength * 0.7, startY + innerWidth * 0.5,
        startX - innerLength, startY
      );
      ctx.bezierCurveTo(
        startX - innerLength * 0.6, startY + innerWidth * 1.5,
        startX - innerLength * 0.2, startY - innerWidth * 0.2,
        startX + s * 2, startY
      );
      ctx.closePath();
      ctx.fill();
    }
    
    // 2. Outer dark crimson lightning tendrils (many, chaotic, thin)
    for (let i = 0; i < 8; i++) {
      const spreadY = (Math.random() - 0.5) * s * 5;
      const r = isRubbick ? 0 : 120 + Math.random() * 60;
      const g = isRubbick ? 120 + Math.random() * 60 : 0;
      drawLightningBranch(
        -s * 35 + Math.random() * s * 6, spreadY,
        s * 18 + Math.random() * s * 5, (Math.random() - 0.5) * s * 4,
        1 + Math.random() * 1.5,
        `rgba(${r}, ${g}, 0, ${0.5 + Math.random() * 0.4})`,
        8 + Math.floor(Math.random() * 5)
      );
    }
    
    // 3. Mid-layer: Bright crimson main bolt branches
    for (let i = 0; i < 5; i++) {
      const spreadY = (Math.random() - 0.5) * s * 2;
      const r = isRubbick ? Math.random() * 30 : 255;
      const g = isRubbick ? 255 : 20 + Math.random() * 40;
      const b = isRubbick ? 20 + Math.random() * 40 : Math.random() * 30;
      drawLightningBranch(
        -s * 30, spreadY,
        s * 15, (Math.random() - 0.5) * s * 1.5,
        2 + Math.random() * 2.5,
        `rgba(${r}, ${g}, ${b}, ${0.7 + Math.random() * 0.3})`,
        10 + Math.floor(Math.random() * 4)
      );
    }
    
    // 4. Forking side branches (perpendicular tendrils splitting off the main bolt)
    for (let i = 0; i < 7; i++) {
      const branchX = -s * 25 + Math.random() * s * 38;
      const branchY = (Math.random() - 0.5) * s * 2;
      const forkEndY = branchY + (Math.random() > 0.5 ? 1 : -1) * (s * 5 + Math.random() * s * 10);
      const forkEndX = branchX + (Math.random() - 0.5) * s * 8;
      const r = isRubbick ? Math.random() * 20 : 200;
      const g = isRubbick ? 200 : Math.random() * 30;
      const b = isRubbick ? Math.random() * 30 : Math.random() * 20;
      drawLightningBranch(
        branchX, branchY,
        forkEndX, forkEndY,
        0.8 + Math.random(),
        `rgba(${r}, ${g}, ${b}, ${0.4 + Math.random() * 0.4})`,
        3 + Math.floor(Math.random() * 3)
      );
    }
    
    // 5. Inner core glow (bright crimson-white hottest center)
    const coreGrad = ctx.createLinearGradient(-s * 28, 0, s * 15, 0);
    if (isRubbick) {
      coreGrad.addColorStop(0, 'rgba(80, 255, 80, 0)');
      coreGrad.addColorStop(0.15, 'rgba(120, 255, 120, 0.6)');
      coreGrad.addColorStop(0.5, 'rgba(200, 255, 200, 0.9)');
      coreGrad.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(1, 'rgba(200, 255, 200, 0.5)');
    } else {
      coreGrad.addColorStop(0, 'rgba(255, 80, 80, 0)');
      coreGrad.addColorStop(0.15, 'rgba(255, 120, 120, 0.6)');
      coreGrad.addColorStop(0.5, 'rgba(255, 200, 200, 0.9)');
      coreGrad.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(1, 'rgba(255, 200, 200, 0.5)');
    }
    drawLightningBranch(
      -s * 28, 0,
      s * 15, 0,
      3.5 + Math.random() * 2,
      coreGrad,
      14
    );
    
    // 6. White-hot piercing core (the absolute brightest center line)
    drawLightningBranch(
      -s * 24, 0,
      s * 13, 0,
      1.5 + Math.random(),
      `rgba(255, 255, 255, ${0.8 + Math.random() * 0.2})`,
      16
    );
    
    // 7. Leading tip flash (sharp bright point at the front)
    const tipGrad = ctx.createRadialGradient(s * 12, 0, 0, s * 12, 0, s * 6);
    tipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    tipGrad.addColorStop(0.3, isRubbick ? 'rgba(80, 255, 80, 0.6)' : 'rgba(255, 80, 80, 0.6)');
    tipGrad.addColorStop(1, isRubbick ? 'rgba(0, 150, 0, 0)' : 'rgba(150, 0, 0, 0)');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(s * 12, 0, s * 6, 0, Math.PI * 2);
    ctx.fill();
    
  } else {
    // ═══════════════════════════════════════════════════════
    // NORMAL BULLET — Sleek armor-piercing tracer slug
    // ═══════════════════════════════════════════════════════
    const scale = p.r * 0.55;
    
    // Aerodynamic shock cone / red blast front
    ctx.beginPath();
    ctx.moveTo(scale * 5, 0);
    ctx.lineTo(-scale * 8, scale * 2.5);
    ctx.lineTo(-scale * 5, 0);
    ctx.lineTo(-scale * 8, -scale * 2.5);
    ctx.fillStyle = 'rgba(200, 20, 20, 0.8)';
    ctx.fill();

    // Elongated thick tracer body (Deep red) - Smooth tapered ellipse
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.ellipse(-scale * 3, 0, scale * 7, scale * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Solid black inner core - Sleek aerodynamic shape
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(-scale * 2, 0, scale * 6, scale * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Blinding white piercing needle - Sharp thin ellipse
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-scale * 1, 0, scale * 5, scale * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mach rings (shock diamonds) traveling with the bullet
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-scale * 2 - i * (scale * 3.5), 0, scale * 0.5, scale * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();

  // Restore context state
  ctx.shadowColor = prevShadowColor;
  ctx.shadowBlur = prevShadowBlur;
  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
  ctx.globalAlpha = prevGlobalAlpha;
  ctx.globalCompositeOperation = prevCompositeOperation;
}
