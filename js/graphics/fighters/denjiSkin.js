// ─────────────────────────────────────────────
// Denji (The Chainsaw Devil Hybrid) Fighter Skin & Body Model
// Authentic Chainsaw Man Anime & Manga Edition (1:1 Reference Pixel Art)
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose in Human Form)
// - Rule 19.1 (Proportional Vertical Bands & Discrete Lock Hair Arrays)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _denjiDevilSkinImage = null;
let _denjiDevilSkinImageLoading = false;

export function _getDenjiDevilSkinImage() {
  if (_denjiDevilSkinImage && _denjiDevilSkinImage.complete && _denjiDevilSkinImage.naturalWidth > 0) {
    return _denjiDevilSkinImage;
  }
  if (!_denjiDevilSkinImageLoading && typeof Image !== 'undefined') {
    _denjiDevilSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _denjiDevilSkinImage = img;
      _denjiDevilSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Denji devil form pixel skin image at Assets/model/denji-devilform-model-skin.png', e);
      _denjiDevilSkinImageLoading = false;
    };
    img.src = 'Assets/model/denji-devilform-model-skin.png?v=1';
    _denjiDevilSkinImage = img;
  }
  return _denjiDevilSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getDenjiDevilSkinImage();
}

/**
 * Main Skin Renderer for Denji (Human Form & Chainsaw Devil Hybrid Form)
 */
export function drawDenjiSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  const isHybrid = (fighter.isHybridModeActive !== false) || Boolean(fighter.isExecutingMassacre);
  const hideChainsaws = Boolean(fighter.hideChainsaws || fighter.hideChainsaw || (typeof state !== 'undefined' && (state.hideDenjiChainsaws || state.showSkinOnly)));
  const hideHands = Boolean(fighter.hideHands || fighter.hideFrontHand || fighter.hideBackHand || hideChainsaws || (typeof state !== 'undefined' && state.showSkinOnly));

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Punch & Saw Animation States
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isSawing = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isLunge = !isPodiumPreview && !isSuppressed && Boolean(fighter.isEngineLunging);
  const animPhase = isPunching 
    ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14)))
    : (isSawing ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 14))) : 0);
  const comboCycle = fighter.punchComboCount || fighter.sawComboCount || 0;

  // 3. LAYER 1: BACK HAND / LEFT ARM CHAINSAW (Behind Body Circle Layer)
  // In Hybrid Devil form, always display the left arm chainsaw on the left flank!
  const showBackArm = isHybrid 
    ? (!hideHands && !hideChainsaws && !fighter.hideBackHand)
    : (!isPodiumPreview && !hideHands && !fighter.hideBackHand && (isPunching || isSawing || isLunge));

  if (showBackArm) {
    _drawDenjiBackArm(ctx, fighter, r, isHybrid, isPunching, isSawing, animPhase, comboCycle, isLunge, isPodiumPreview, now);
  }

  // 4. LAYER 2: MAIN BODY CIRCLE (Permanently Chainsaw Devil Form)
  const devilImg = _getDenjiDevilSkinImage();
  if (devilImg && devilImg.complete && devilImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const drawW = r * (1150 / 368);
    const drawH = r * (1150 / 368);
    const shiftX = r * (600 / 368);
    const shiftY = r * (620 / 368);
    ctx.drawImage(devilImg, -shiftX, -shiftY, drawW, drawH);
    ctx.restore();

    // Central Forehead Chainsaw Blade (Protruding Forward along Top Crest)
    if (!hideChainsaws && !(typeof state !== 'undefined' && state.showSkinOnly)) {
      _drawDenjiForeheadChainsaw(ctx, r, now);
    }
  } else {
    drawDenjiChainsawHybridBody(ctx, r, now, hideChainsaws);
  }

  // 5. LAYER 3: FRONT HAND / RIGHT ARM CHAINSAW (Front Layer — On Top of Body)
  // In Hybrid Devil form, always display the right arm chainsaw on the right flank!
  const showFrontArm = isHybrid 
    ? (!hideHands && !hideChainsaws && !fighter.hideFrontHand)
    : (!isPodiumPreview && !hideHands && !fighter.hideFrontHand && (isPunching || isSawing || isLunge));

  if (showFrontArm) {
    _drawDenjiFrontArm(ctx, fighter, r, isHybrid, isPunching, isSawing, animPhase, comboCycle, isLunge, isPodiumPreview, now);
  }

  ctx.restore();
}

/**
 * Discrete Pixel-Art Hairline & Bangs Grid for Denji's Messy Spiked Anime Hair
 * 27 columns total (gx = -13 to +13, index = gx + 13)
 * Features messy, staggered spikes characteristic of Denji's unkempt blonde hair.
 */
const DENJI_HAIRLINE_GY = [
   1,  2,  1,  0, -1, -3, -4, -3, -2,  0,  1,  2,  2,  1,  0, -2, -4, -3, -1,  0,  1,  2,  1,  2,  2,  1,  1
];

/**
 * Draws Denji's Human Body Circle in Solid 2D Pixel Art (Rule 19 & 19.1)
 */
export function drawDenjiHumanPixelBody(ctx, r, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);
      const normY = ry / r;
      const normX = rx / r;

      // ── Outer Dark Manga Ink Shell (1px boundary) ──
      const isInkOutline = dist >= r - P;
      if (isInkOutline) {
        ctx.fillStyle = '#18181B';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 1. HAIR LAYER (Crown Spikes & Bangs: normY <= 0.0) ──
      const hairIdx = Math.max(0, Math.min(26, gx + 13));
      const hairCutoffGy = DENJI_HAIRLINE_GY[hairIdx];
      const isHair = gy <= hairCutoffGy;

      if (isHair) {
        // Top-left specular golden highlight
        if (normY < -0.45 && normX < 0.2) {
          ctx.fillStyle = '#FEF08A'; // Pale blonde highlight
        } else if (normY < -0.15) {
          ctx.fillStyle = '#FACC15'; // Vibrant anime blonde
        } else if (normY < 0.05) {
          ctx.fillStyle = '#EAB308'; // Ochre yellow base
        } else {
          ctx.fillStyle = '#CA8A04'; // Hair root shadow
        }
        ctx.fillRect(px, py, P, P);

        // Dark hair crevice shadow accents
        if ((gx === -7 || gx === 0 || gx === 6) && gy === hairCutoffGy) {
          ctx.fillStyle = '#713F12';
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ── 2. FACE ZONE (normY: 0.0 to +0.22) ──
      // Strictly faceless aesthetic (Rule 19)
      if (normY < 0.22) {
        if (normY < 0.08) {
          ctx.fillStyle = '#FFE0BD'; // Warm peach skin base
        } else if (normY < 0.16) {
          ctx.fillStyle = '#F3C99F'; // Mid skin tone
        } else {
          ctx.fillStyle = '#E2B185'; // Jawline shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── 3. SHIRT COLLAR, LOOSE TIE & POCHITA RIPCORD (normY: +0.22 to +0.65) ──
      if (normY < 0.65) {
        const isTie = Math.abs(gx) <= 1 && normY >= 0.26;
        const isShirtCollar = Math.abs(gx) <= 3 && normY >= 0.22 && normY <= 0.32;
        const isRipcordRing = (gx === 2 || gx === 3) && (gy === 4 || gy === 5);
        const isRipcordCord = gx === 2 && (gy === 3 || gy === 4);

        if (isRipcordRing) {
          ctx.fillStyle = '#CBD5E1'; // Metallic pull-ring
          ctx.fillRect(px, py, P, P);
        } else if (isRipcordCord) {
          ctx.fillStyle = '#F97316'; // Orange pull cord
          ctx.fillRect(px, py, P, P);
        } else if (isTie) {
          ctx.fillStyle = '#0F172A'; // Loosened black silk tie
          ctx.fillRect(px, py, P, P);
        } else if (isShirtCollar) {
          ctx.fillStyle = '#FFFFFF'; // Crisp white unbuttoned collar
          ctx.fillRect(px, py, P, P);
        } else {
          // White Public Safety shirt with fabric shading
          if (normX < -0.3) {
            ctx.fillStyle = '#E2E8F0'; // Left flank shadow
          } else if (normX > 0.3) {
            ctx.fillStyle = '#CBD5E1'; // Right flank shadow
          } else {
            ctx.fillStyle = '#FAF7F0'; // Shirt front
          }
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ── 4. LOWER TORSO & CHARCOAL PANTS (normY: +0.65 to +1.00) ──
      if (normY < 0.72) {
        // Belt line
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = '#F59E0B'; // Gold belt buckle
        } else {
          ctx.fillStyle = '#18181B'; // Black leather belt
        }
      } else {
        // Charcoal trousers with subtle center crease
        if (gx === 0) {
          ctx.fillStyle = '#0F172A'; // Fly seam
        } else {
          ctx.fillStyle = '#1E293B'; // Dark slate pants
        }
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // ── Extra Crown Spikes extending beyond circle boundary (Rule 19.1) ──
  _drawDenjiCrownSpikes(ctx, r);

  ctx.restore();
}

/**
 * Extra pixel-art crown hair spikes breaking the top circle boundary (Rule 19.1)
 */
function _drawDenjiCrownSpikes(ctx, r) {
  const spikes = [
    { gx: -8, gy: -15, col: '#FACC15' },
    { gx: -7, gy: -14, col: '#FACC15' },
    { gx: -4, gy: -16, col: '#FEF08A' },
    { gx: -3, gy: -15, col: '#FACC15' },
    { gx:  0, gy: -16, col: '#FEF08A' },
    { gx:  1, gy: -15, col: '#FACC15' },
    { gx:  4, gy: -15, col: '#FACC15' },
    { gx:  5, gy: -14, col: '#EAB308' },
    { gx:  8, gy: -14, col: '#EAB308' },
  ];

  for (let sp of spikes) {
    ctx.fillStyle = '#18181B'; // Ink outline
    ctx.fillRect(snap(sp.gx * P - P), snap(sp.gy * P - P), P * 3, P * 3);
  }
  for (let sp of spikes) {
    ctx.fillStyle = sp.col;
    ctx.fillRect(snap(sp.gx * P), snap(sp.gy * P), P, P);
  }
}

/**
 * Draws Denji's Chainsaw Devil Hybrid Form Body in Solid 2D Pixel Art
 * Authentic 1:1 Chainsaw Man reference design matching official anime close-up:
 * - Fiery orange helmet cowl with 3 concentric black acoustic/exhaust vent ridges
 * - Sharp orange lower jaw/chin guard plate beneath mouth
 * - Interlocking sharp triangular shark teeth in terrifying open grin
 * - Rear mechanical engine gearbox with circular starter axle & exhaust conduits
 * - L-shaped top engine roll-cage handle extending from engine block
 * - Bundled mechanical tendon cables forming the neck
 * - Extended forehead chainsaw blade with hooked teeth and blood streaks
 * - Crisp cream Public Safety shirt, black silk tie, brown belt, dark trousers
 */
export function drawDenjiChainsawHybridBody(ctx, r, now, hideChainsaw = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  // ── 0. L-Shaped Top Engine Roll-Cage Handle (Rule 19.1) ──
  _drawDenjiTopPullHandle(ctx, r);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);
      const normY = ry / r;
      const normX = rx / r;

      // ── Outer Dark Manga Ink Shell ──
      const isInkOutline = dist >= r - P;
      if (isInkOutline) {
        ctx.fillStyle = '#090D16';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 1: CHAINSAW DEVIL HEAD & FACE (normY <= +0.32, gy <= 6)
      // ══════════════════════════════════════════
      if (gy <= 6) {
        // ── A. REAR ENGINE BLOCK & STARTER AXLE (gx <= -5, gy <= 3) ──
        const isRearEngine = (gx <= -5 && gy <= 3);
        if (isRearEngine) {
          // Circular Starter Axle Hub at gx = -9..-7, gy = -6..-4
          const hubDist = Math.hypot(gx - (-8), gy - (-5));
          if (hubDist <= 1.5) {
            ctx.fillStyle = (hubDist < 0.8) ? '#090D16' : '#94A3B8'; // Starter hub pin & chrome rim
          } else if (gx <= -10) {
            ctx.fillStyle = '#090D16'; // Rear casing boundary
          } else if (gy <= -9) {
            ctx.fillStyle = '#334155'; // Upper engine bracket
          } else {
            ctx.fillStyle = '#1E293B'; // Dark gunmetal engine block
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── B. INTERLOCKING SHARK-TEETH OPEN MOUTH (gy = -2..3, gx = -4..7) ──
        const isTeethMouth = (gy >= -2 && gy <= 3 && gx >= -4 && gx <= 7);
        if (isTeethMouth) {
          // Sharp enamel fangs pointing down from upper jaw (even gx) and up from lower jaw (odd gx)
          const isUpperTooth = (gy <= 0 && ((gx % 2 === 0) || gy === -2));
          const isLowerTooth = (gy >= 1 && ((Math.abs(gx) % 2 === 1) || gy === 3));

          if (gx === 7 && gy === -2) {
            ctx.fillStyle = '#FF5722'; // Upper orange visor overhang tip
          } else if (gx === -4 && gy === 3) {
            ctx.fillStyle = '#D84315'; // Lower jaw hinge anchor
          } else if (isUpperTooth || isLowerTooth) {
            ctx.fillStyle = (gy === 0 || gy === 1) ? '#FFFFFF' : '#E2E8F0'; // Sharp white enamel fangs
          } else {
            ctx.fillStyle = '#090D16'; // Hollow black open mouth cavity
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── C. ORANGE LOWER JAW & SHARP CHIN PLATE (gx: -4..6, gy: 4..6) ──
        const isLowerOrangeJaw = (
          (gx >= -4 && gx <= 5 && gy === 4) ||
          (gx >= -2 && gx <= 5 && gy === 5) ||
          (gx >= 3 && gx <= 6 && gy === 6)
        );

        // ── D. EXPOSED BUNDLED TENDON NECK CABLES (gx: -8..2, gy: 4..6) ──
        const isNeckCables = (gx >= -8 && gx <= 2 && gy >= 4 && gy <= 6 && !isLowerOrangeJaw);

        if (isLowerOrangeJaw) {
          if (gx === 6 && gy === 6) {
            ctx.fillStyle = '#090D16'; // Sharp chin tip point
          } else if (gy === 4) {
            ctx.fillStyle = '#FF4500'; // Orange chin plate top rim
          } else if (gy === 5) {
            ctx.fillStyle = '#FF5722'; // Vibrant orange chin plate
          } else {
            ctx.fillStyle = '#D84315'; // Orange chin plate underside shade
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (isNeckCables) {
          // Ribbed vertical mechanical cable strands linking lower jaw/engine to collar
          if (gx === -4 || gx === 0) {
            ctx.fillStyle = '#E2E8F0'; // Light tendon cable sheen
          } else if (gx === -6 || gx === -2) {
            ctx.fillStyle = '#94A3B8'; // Mid gray cable
          } else {
            ctx.fillStyle = '#334155'; // Dark tendon strand shadow
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── E. 3 CONCENTRIC BLACK ACOUSTIC/VENT ARCS ON ORANGE CHEEK (1:1 with Reference) ──
        // Concentric circular arcs centered at (cx = -4, cy = -4) radiating forward
        const ventDist = Math.hypot(gx - (-4), gy - (-4));
        const isVentArc1 = (ventDist >= 1.8 && ventDist <= 2.6 && gx >= -3 && gy <= -2);
        const isVentArc2 = (ventDist >= 3.6 && ventDist <= 4.4 && gx >= -2 && gy <= -1);
        const isVentArc3 = (ventDist >= 5.4 && ventDist <= 6.2 && gx >= -1 && gy <= -1);

        if (isVentArc1 || isVentArc2 || isVentArc3) {
          ctx.fillStyle = '#090D16'; // Deep black acoustic vent arcs
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── F. FIERY ORANGE HELMET COWLS (Top of Head) ──
        if (gy <= -10 && gx >= -2) {
          ctx.fillStyle = '#FFA07A'; // Top curved ridge specular sheen
        } else if (gy <= -4) {
          ctx.fillStyle = '#FF4500'; // Vibrant Chainsaw Man orange base
        } else if (gx >= 6) {
          ctx.fillStyle = '#FF5722'; // Forward brow overhang
        } else {
          ctx.fillStyle = '#D84315'; // Orange lower cheek shade
        }
        ctx.fillRect(px, py, P, P);

        // Splatters of fresh blood on the helmet
        if ((gx === -2 && gy === -7) || (gx === 4 && gy === -5) || (gx === 0 && gy === -3)) {
          ctx.fillStyle = '#991B1B';
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 2: PUBLIC SAFETY WHITE SHIRT & BLACK TIE (gy >= 7, normY <= 0.68)
      // ══════════════════════════════════════════
      if (normY < 0.68) {
        // Pointed collar lapels
        const isCollarWing = (Math.abs(gx) >= 2 && Math.abs(gx) <= 5 && gy >= 7 && gy <= 9);
        const isTie = (Math.abs(gx) <= 1 && gy >= 7);

        if (isTie) {
          // Solid Black Silk Necktie
          ctx.fillStyle = (gx === 0 && gy <= 9) ? '#1E293B' : '#090D16';
          ctx.fillRect(px, py, P, P);
        } else if (isCollarWing) {
          ctx.fillStyle = '#FAF7F0'; // Crisp white pointed collar
          ctx.fillRect(px, py, P, P);
        } else {
          // White button-up shirt with fabric folds & blood splatters
          if ((gx === -4 && gy === 9) || (gx === 3 && gy === 10)) {
            ctx.fillStyle = '#DC2626'; // Fresh crimson blood splatter
          } else if (normX < -0.2) {
            ctx.fillStyle = '#E2E8F0'; // Left fold shadow
          } else if (normX > 0.2) {
            ctx.fillStyle = '#CBD5E1'; // Right fold shadow
          } else {
            ctx.fillStyle = '#FAF7F0'; // Front crisp white shirt
          }
          ctx.fillRect(px, py, P, P);
        }
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 3: BROWN LEATHER BELT & METALLIC BUCKLE (normY: 0.68 to 0.74)
      // ══════════════════════════════════════════
      if (normY < 0.74) {
        if (Math.abs(gx) <= 1) {
          ctx.fillStyle = '#E2E8F0'; // Metallic silver chrome buckle (Reference Image 2)
        } else {
          ctx.fillStyle = '#6B2D0C'; // Brown leather belt (Reference Image 2)
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 4: DARK MATTE TROUSERS (normY >= 0.74)
      // ══════════════════════════════════════════
      if (gx === 0) {
        ctx.fillStyle = '#090D16'; // Center fly seam
      } else {
        ctx.fillStyle = '#18181B'; // Dark tailored trousers
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // ── Central Forehead Chainsaw Blade (Protruding Forward along Top Crest) ──
  if (!hideChainsaw && !(typeof state !== 'undefined' && state.showSkinOnly)) {
    _drawDenjiForeheadChainsaw(ctx, r, now);
  }

  ctx.restore();
}

/**
 * Draws the L-shaped mechanical engine roll-cage handle extending from rear engine block (Matching Reference Image)
 */
function _drawDenjiTopPullHandle(ctx, r) {
  const handlePixels = [
    // Vertical riser from engine block
    { gx: -7, gy: -13, col: '#090D16' },
    { gx: -7, gy: -14, col: '#334155' },
    { gx: -7, gy: -15, col: '#334155' },
    { gx: -7, gy: -16, col: '#090D16' },
    // Horizontal top grip bar extending forward
    { gx: -6, gy: -16, col: '#475569' },
    { gx: -5, gy: -16, col: '#94A3B8' }, // Specular glint
    { gx: -4, gy: -16, col: '#CBD5E1' }, // Specular glint
    { gx: -3, gy: -16, col: '#475569' },
    { gx: -2, gy: -15, col: '#090D16' }, // Forward anchor bend
  ];

  ctx.fillStyle = '#090D16';
  for (let p of handlePixels) {
    const px = snap(p.gx * P);
    const py = snap(p.gy * P);
    ctx.fillRect(px - P, py, P, P);
    ctx.fillRect(px + P, py, P, P);
    ctx.fillRect(px, py - P, P, P);
    ctx.fillRect(px, py + P, P, P);
  }
  for (let p of handlePixels) {
    ctx.fillStyle = p.col;
    ctx.fillRect(snap(p.gx * P), snap(p.gy * P), P, P);
  }
}

/**
 * Draws the iconic high-detail central forehead chainsaw blade protruding forward along the top crest
 * Authentic Chainsaw Man anime & manga edition:
 * - Gunmetal base mounting bracket anchored into skull engine with heavy steel hex bolts
 * - Tapered multi-tone brushed steel guide bar with metallic bevel highlight & underside shadow
 * - Recessed dark center guide slot with internal lightening cutouts and dual rail lines
 * - Circular nose sprocket with 4-rivet circle
 * - High-density rotating hooked razor teeth with leading chisel edges and raker depth gauges
 * - Dynamic arterial blood drips, streaks, and splatters along teeth and center slot
 */
function _drawDenjiForeheadChainsaw(ctx, r, now) {
  const bladeLen = 58;
  const bladeThick = 12;
  const startX = r * 0.42;
  const startY = -r * 0.35; // Brow/forehead level — between teeth and crown

  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(-0.18); // Tilted slightly upward



  // ── 2. Guide Bar Outer Dark Manga Ink Shell (Tapered Nose) ──
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, -bladeThick / 2 - 2, bladeLen - 4, bladeThick + 4);
  // Tapered nose sprocket curve
  ctx.fillRect(bladeLen - 4, -bladeThick / 2 - 1, 4, bladeThick + 2);
  ctx.fillRect(bladeLen, -bladeThick / 2 + 1, 3, bladeThick - 2);

  // ── 3. Guide Bar Solid Steel Body & Bevels ──
  // Top bevel bright highlight
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(2, -bladeThick / 2 - 1, bladeLen - 6, 2);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(bladeLen - 6, -bladeThick / 2, 4, 2);

  // Upper blade face: satin industrial steel
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(1, -bladeThick / 2 + 1, bladeLen - 4, 2);

  // Lower blade face: dark shadowed steel
  ctx.fillStyle = '#475569';
  ctx.fillRect(1, bladeThick / 2 - 3, bladeLen - 4, 2);

  // Bottom bevel shadow edge
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(2, bladeThick / 2 - 1, bladeLen - 6, 2);

  // ── 4. Deep Recessed Center Guide Slot & Lightening Cutouts ──
  ctx.fillStyle = '#090D16';
  ctx.fillRect(4, -1.5, bladeLen - 10, 3);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(4, -1, bladeLen - 10, 0.8);
  ctx.fillRect(4, 0.2, bladeLen - 10, 0.8);



  // ── 5. Nose Sprocket Roller Bearing & Rivets ──
  const noseX = bladeLen - 4;
  ctx.fillStyle = '#334155';
  ctx.fillRect(noseX - 2, -3, 5, 6);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(noseX - 1, -2, 3, 4);
  // Center axle pin
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(noseX, -0.5, 1.5, 1.5);
  // 4 Sprocket Rivets around nose
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(noseX - 2, -2, 1, 1);
  ctx.fillRect(noseX + 1.5, -2, 1, 1);
  ctx.fillRect(noseX - 2, 1, 1, 1);
  ctx.fillRect(noseX + 1.5, 1, 1, 1);

  // ── 6. Rotating Hooked Chainsaw Razor Teeth ──
  const toothStep = 4.5;
  const scrollOffset = (now * 0.09) % toothStep;

  // Top Track Teeth (Raking backward toward motor)
  for (let x = 2; x < bladeLen - 3; x += toothStep) {
    const tx = snap(x + scrollOffset);
    if (tx < bladeLen - 4) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, -bladeThick / 2 - 2, 2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tx + 1, -bladeThick / 2 - 3, 1.5, 1.5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 1, -bladeThick / 2 - 1, 1, 1);
    }
  }

  // Bottom Track Teeth (Pushing forward)
  for (let x = 2; x < bladeLen - 3; x += toothStep) {
    const tx = snap(x - scrollOffset + toothStep);
    if (tx > 2 && tx < bladeLen - 4) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, bladeThick / 2, 2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tx + 1, bladeThick / 2 + 1.5, 1.5, 1.5);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 1, bladeThick / 2, 1, 1);
    }
  }

  // Nose tip rounding teeth
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bladeLen + 1, -2, 2, 4);
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(bladeLen + 2, -1, 1, 2);

  // ── 7. Dynamic Arterial Blood Gore & Splatters ──
  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(snap(6 + (scrollOffset * 0.5)), -1, 6, 2);
  ctx.fillRect(snap(24 + (scrollOffset * 0.5)), -1, 7, 2);

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(snap(8 + scrollOffset), -bladeThick / 2 - 3, 3, 2);
  ctx.fillRect(snap(18 + scrollOffset), -bladeThick / 2 - 2, 4, 2);
  ctx.fillRect(snap(28 + scrollOffset), bladeThick / 2, 4, 3);
  ctx.fillRect(snap(36 + scrollOffset), bladeThick / 2 - 1, 3, 2);
  ctx.fillRect(bladeLen - 1, -2, 2, 3);

  ctx.fillStyle = '#EF4444';
  ctx.fillRect(snap(19 + scrollOffset), -bladeThick / 2 - 2, 2, 1);
  ctx.fillRect(snap(29 + scrollOffset), bladeThick / 2 + 1, 2, 1);
  ctx.fillRect(bladeLen, 0, 2, 1.5);

  // Trailing blood droplets flicking off the nose tip
  const dripPhase = (now * 0.015) % 1.0;
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(bladeLen + 3 + dripPhase * 5, -1 + Math.sin(dripPhase * 3) * 2, 1.5, 1.5);
  ctx.fillRect(bladeLen + 7 + dripPhase * 4, 1 + Math.cos(dripPhase * 2) * 2, 1.5, 1.5);

  ctx.restore();
}

/**
 * Draws Denji's Back Arm / Left Arm Chainsaw (Behind Body Circle Layer)
 * Permanently displayed on the left flank in Chainsaw Devil form.
 */
function _drawDenjiBackArm(ctx, fighter, r, isHybrid, isPunching, isSawing, animPhase, comboCycle, isLunge, isPodiumPreview, now) {
  ctx.save();
  let armX = -r * 0.70;
  let armY = r * 0.20;
  let sawAngle = 1.35; // Extending downwards alongside left flank matching Reference Image

  if (isPunching || isSawing) {
    const isBackArmHit = (comboCycle % 2 === 1);
    if (isBackArmHit) {
      const ext = Math.sin(animPhase * Math.PI) * (r * 1.0);
      armX += ext * 1.2;
      armY -= ext * 0.4;
      sawAngle = 0.15; // Snaps forward during strike
    }
  } else if (isLunge) {
    armX += r * 0.4;
    sawAngle = 0.25;
  }

  if (isHybrid) {
    _drawPixelForearmChainsaw(ctx, armX, armY, sawAngle, now, false);
  } else {
    drawPixelHand(ctx, armX, armY, getHandSize(5.5), '#FFE0BD', '#18181B');
  }
  ctx.restore();
}

/**
 * Draws Denji's Front Arm / Right Arm Chainsaw (Front Layer — On Top of Body)
 * Permanently displayed on the right flank in Chainsaw Devil form.
 */
function _drawDenjiFrontArm(ctx, fighter, r, isHybrid, isPunching, isSawing, animPhase, comboCycle, isLunge, isPodiumPreview, now) {
  ctx.save();
  let armX = r * 0.55;
  let armY = r * 0.42;
  let sawAngle = 1.35; // Extending downwards alongside right flank, keeping chin clear

  if (isPunching || isSawing) {
    const isFrontArmHit = (comboCycle % 2 === 0);
    if (isFrontArmHit) {
      const ext = Math.sin(animPhase * Math.PI) * (r * 1.1);
      armX += ext * 1.2;
      armY -= ext * 0.4;
      sawAngle = -0.10; // Snaps forward during strike
    }
  } else if (isLunge) {
    armX += r * 0.6;
    sawAngle = 0.15;
  }

  if (isHybrid) {
    _drawPixelForearmChainsaw(ctx, armX, armY, sawAngle, now, true);
  } else {
    drawPixelHand(ctx, armX, armY, getHandSize(6.0), '#FFE0BD', '#18181B');
  }
  ctx.restore();
}

/**
 * Draws a forearm-mounted chainsaw blade bursting from Denji's arm in 2D Pixel Art
 * Authentic Chainsaw Man manga/anime edition:
 * - Torn white shirt cuff and bloody ruptured flesh emergence ring
 * - Reinforced gunmetal blade bracket rooted into the dorsal forearm
 * - Tapered multi-tone steel guide bar with center slot and rotating razor hooked teeth
 * - Tight, shaded combat fist tucked below the saw spine with detailed knuckles
 * - Visceral arterial blood splatters and dripping gore
 */
function _drawPixelForearmChainsaw(ctx, cx, cy, angle, now, isFront) {
  const sawLen = 42;
  const sawThick = 9;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // ── 1. Torn Shirt Sleeve Cuff & Flesh Emergence Ring ──
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-7, -sawThick / 2 - 3, 8, sawThick + 6);
  ctx.fillStyle = '#FAF7F0';
  ctx.fillRect(-6, -sawThick / 2 - 2, 6, sawThick + 4);
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(-6, -sawThick / 2 - 1, 2, sawThick + 2);
  // Torn jagged cuff threads
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(-1, -sawThick / 2 - 3, 2, 1.5);
  ctx.fillRect(0, sawThick / 2 + 1.5, 2, 1.5);

  // Bloody ruptured flesh ring where blade bursts through forearm
  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(-2, -sawThick / 2 - 2, 4, sawThick + 4);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-1, -sawThick / 2 - 1, 3, sawThick + 2);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(0, -1, 2, 2);

  // ── 2. Clenched Combat Fist (Tight, shaded, anatomically proportional) ──
  const fistX = -2;
  const fistY = (isFront ? 3.5 : -3.5);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(fistX - 4, fistY - 3, 8, 7);
  ctx.fillStyle = '#FFE0BD';
  ctx.fillRect(fistX - 3, fistY - 2, 6, 5);
  ctx.fillStyle = '#F3C99F';
  ctx.fillRect(fistX - 1, fistY - 1, 4, 3);
  ctx.fillStyle = '#D49B6A';
  ctx.fillRect(fistX - 3, fistY, 2, 3);
  ctx.fillRect(fistX + 1, fistY + 1, 2, 1);

  // ── 3. Gunmetal Guide Bar & Tapered Steel Body ──
  ctx.fillStyle = '#090D16';
  ctx.fillRect(1, -sawThick / 2 - 2, sawLen - 4, sawThick + 4);
  ctx.fillRect(sawLen - 4, -sawThick / 2 - 1, 4, sawThick + 2);
  ctx.fillRect(sawLen, -sawThick / 2 + 1, 2, sawThick - 2);

  // Top bevel highlight
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(3, -sawThick / 2 - 1, sawLen - 6, 1.5);
  // Upper steel face
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(2, -sawThick / 2 + 0.5, sawLen - 4, 1.5);
  // Lower steel shadow
  ctx.fillStyle = '#475569';
  ctx.fillRect(2, sawThick / 2 - 2, sawLen - 4, 1.5);
  // Bottom bevel shadow
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(3, sawThick / 2 - 0.5, sawLen - 6, 1.5);

  // Recessed center guide groove
  ctx.fillStyle = '#090D16';
  ctx.fillRect(4, -1, sawLen - 8, 2);
  ctx.fillStyle = '#334155';
  ctx.fillRect(4, -0.5, sawLen - 8, 1);

  // ── 4. Nose Sprocket on Arm Saw ──
  const noseX = sawLen - 3;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(noseX, -0.5, 1.5, 1);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(noseX - 1, -1.5, 1, 1);
  ctx.fillRect(noseX - 1, 0.5, 1, 1);

  // ── 5. Hooked Razor Teeth (Fast Moving) ──
  const toothStep = 4.0;
  const scrollOffset = (now * 0.09) % toothStep;

  // Top cutting teeth
  for (let x = 3; x < sawLen - 3; x += toothStep) {
    const tx = snap(x + scrollOffset);
    if (tx < sawLen - 3) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, -sawThick / 2 - 2, 1.5, 1.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tx + 1, -sawThick / 2 - 2.5, 1, 1);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 1, -sawThick / 2 - 1, 1, 1);
    }
  }

  // Bottom cutting teeth
  for (let x = 3; x < sawLen - 3; x += toothStep) {
    const tx = snap(x - scrollOffset + toothStep);
    if (tx > 3 && tx < sawLen - 3) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, sawThick / 2 + 0.5, 1.5, 1.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tx + 1, sawThick / 2 + 1.5, 1, 1);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 1, sawThick / 2, 1, 1);
    }
  }

  // Nose tip razor
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(sawLen + 0.5, -1.5, 1.5, 3);

  // ── 6. Visceral Blood Gore & Trailing Splatters ──
  ctx.fillStyle = '#7F1D1D';
  ctx.fillRect(snap(6 + scrollOffset), -0.5, 4, 1);
  ctx.fillRect(snap(16 + scrollOffset), -0.5, 5, 1);

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(snap(8 + scrollOffset), -sawThick / 2 - 2, 2.5, 2);
  ctx.fillRect(snap(18 + scrollOffset), sawThick / 2, 3, 2);
  ctx.fillRect(sawLen - 1, -1, 1.5, 2);

  ctx.fillStyle = '#EF4444';
  ctx.fillRect(snap(9 + scrollOffset), -sawThick / 2 - 1, 1.5, 1);
  ctx.fillRect(sawLen, 0, 1.5, 1);

  ctx.restore();
}
