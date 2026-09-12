// ─────────────────────────────────────────────
// Power (The Blood Fiend) Fighter Skin & Body Model
// Authentic Chainsaw Man Anime & Manga Edition (1:1 Reference Pixel Art)
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands & Discrete Lock Hair Arrays)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _powerSkinImage = null;
let _powerSkinImageLoading = false;

export function _getPowerSkinImage() {
  if (_powerSkinImage && _powerSkinImage.complete && _powerSkinImage.naturalWidth > 0) {
    return _powerSkinImage;
  }
  if (!_powerSkinImageLoading && typeof Image !== 'undefined') {
    _powerSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _powerSkinImage = img;
      _powerSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Power pixel skin image at Assets/model/POWER-MODEL-SKIN.png', e);
      _powerSkinImageLoading = false;
    };
    img.src = 'Assets/model/POWER-MODEL-SKIN.png?v=1';
    _powerSkinImage = img;
  }
  return _powerSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getPowerSkinImage();
}

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

/**
 * Main Skin Renderer for Power (The Blood Fiend)
 * Prioritizes the authentic pixel art model from Assets/model/POWER-MODEL-SKIN.png,
 * with procedural canvas fallback.
 */
export function drawPowerSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Attack & Swing States
  const isHammerSwinging = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isScytheSpinning = !isPodiumPreview && !isSuppressed && Boolean(fighter.isScytheSpinning);
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const animPhase = isHammerSwinging 
    ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 16)))
    : (isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0);
  const comboCycle = fighter.hammerComboCount || fighter.punchComboCount || 0;

  // 3. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand && (isHammerSwinging || isScytheSpinning || isPunching);
  if (showBackHand) {
    _drawPowerBackHand(ctx, fighter, r, isHammerSwinging, isScytheSpinning, isPunching, animPhase, comboCycle, now);
  }

  // 4. LAYER 1: MAIN BODY (POWER-MODEL-SKIN.png or procedural fallback)
  const powerImg = _getPowerSkinImage();
  if (powerImg && powerImg.complete && powerImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Scale factor to map 500x500 sprite content (280px core body diameter) flush with fighter radius r
    const drawW = r * (1000 / 280);
    const drawH = drawW;
    const shiftX = r * (479 / 280);
    const shiftY = r * (506 / 280);
    ctx.drawImage(powerImg, -shiftX, -shiftY, drawW, drawH);
    ctx.restore();
  } else {
    _drawPowerBackHair(ctx, r);
    drawPowerPixelBody(ctx, r, now);
  }

  // 5. LAYER 2: FRONT HAND & BLOOD WEAPON (Front Layer — On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand && (isHammerSwinging || isScytheSpinning || isPunching);
  if (showFrontHand) {
    _drawPowerFrontHand(ctx, fighter, r, isHammerSwinging, isScytheSpinning, isPunching, animPhase, comboCycle, now);
  }

  ctx.restore();
}

/**
 * Draws Power's Blood Fiend Body Circle in Authentic 2D Pixel Art
 * Accurately matching the anime color palette, strawberry-peach hair, horns, and sloppy Public Safety hoodie outfit.
 */
export function drawPowerPixelBody(ctx, r, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  // ── 0. CROWN HAIR TUFTS & SILHOUETTE BREAKERS (Rule 19.1) ──
  _drawPowerCrownTufts(ctx, r);

  // ── 1. MAIN CIRCULAR PIXEL GRID ──
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
        ctx.fillStyle = '#180E0C';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── SIGNATURE LEFT FRONT HAIR LOCK (1:1 with Anime Reference Screenshot) ──
      // Drapes from the left temple/bangs down over the left cheek, white collar, and slate-blue jacket
      const isLeftFrontLock = (
        (gx >= -6 && gx <= -5 && gy >= 1 && gy <= 7) ||
        (gx >= -6 && gx <= -5 && gy === 8) ||
        (gx === -5 && gy === 9) // Tapered sharp needle tip at mid-chest
      );

      if (isLeftFrontLock) {
        let hairCol = '#F0A688'; // Base strawberry peach

        if (gx === -5 && gy >= 2 && gy <= 6) {
          hairCol = '#FBD3C3'; // Specular glint along strand spine
        } else if (gx === -5 && (gy === 1 || gy === 7)) {
          hairCol = '#F4AE92'; // Bright mid-strand peach
        } else if (gx === -6 && gy >= 4 && gy <= 7) {
          hairCol = '#DE8868'; // Outer strand depth shadow
        } else if (gy === 8 && gx === -6) {
          hairCol = '#DC8460'; // Pre-tip taper shadow
        } else if (gy === 9 && gx === -5) {
          hairCol = '#DC8460'; // Tapered needle tip
        }

        ctx.fillStyle = hairCol;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ══════════════════════════════════════════
      // ZONE 1: HAIR & FACE (normY < 0.22, gy < 5)
      // ══════════════════════════════════════════
      if (normY < 0.22 && gy < 5) {
        // ── 1. Discrete Hair & Bangs Masks (Organic Right-Curving Center Lock) ──

        // A. Top Scalp / Crown Dome (gy <= -8)
        const isScalpDome = (gy <= -8);

        // B. Left Cheek Framing Lock (gx <= -8, gy <= 6)
        const isLeftCheekLock = (gx <= -8 && gy <= 6);

        // C. Right Cheek Framing Lock (gx >= 8, gy <= 6)
        const isRightCheekLock = (gx >= 8 && gy <= 6);

        // D. Left Brow Fringe (gx: -7 to -5, sweeping down to connect with left front lock)
        const isLeftBrowFringe = (
          (gx === -7 && gy >= -7 && gy <= 2) ||
          (gx === -6 && gy >= -7 && gy <= 0) ||
          (gx === -5 && gy >= -7 && gy <= 0)
        );

        // E. Right Brow Fringe (gx: 5 to 7, sweeping down to gy = 2)
        const isRightBrowFringe = (
          (gx === 5 && gy >= -7 && gy <= -2) ||
          (gx === 6 && gy >= -7 && gy <= 0)  ||
          (gx === 7 && gy >= -7 && gy <= 2)
        );

        // F. SIGNATURE CENTER STRAND CURVING SLIGHTLY TO THE RIGHT (1:1 with User Feedback)
        // Originates at top center (gx = -1..0, gy = -7..-4)
        // Curves gently down-right: gy = -3..-1 at gx = -1..1, gy = 0..2 at gx = 0..2, ending at tip gx = 2, gy = 4
        const isCurvedCenterBang = (
          (gx >= -1 && gx <= 0 && gy >= -7 && gy <= -4) ||
          (gx >= -1 && gx <= 1 && gy >= -3 && gy <= -1) ||
          (gx >=  0 && gx <= 2 && gy >=  0 && gy <=  2) ||
          (gx >=  1 && gx <= 2 && gy === 3)             ||
          (gx === 2 && gy === 4)
        );

        const isHair = isScalpDome || isLeftCheekLock || isRightCheekLock || isLeftBrowFringe || isRightBrowFringe || isCurvedCenterBang;

        if (isHair) {
          // ── A. POWER'S STRAWBERRY PEACH HAIR (Clean Anime Tones) ──
          let hairCol = '#F0A688'; // Vibrant soft strawberry peach base

          // Top crown highlight
          if (normY < -0.45 && Math.abs(gx) <= 6) {
            hairCol = '#FBD3C3'; // Pale peach-blonde crown luster
          }
          // Curved strand spine glint following the rightward curve
          else if (
            (gx === 0 && gy >= -6 && gy <= -2) ||
            (gx === 1 && gy >= -1 && gy <= 2)
          ) {
            hairCol = '#FBD3C3'; // Specular glint along curved lock spine
          }
          // Mid strand tone
          else if (normY < -0.15 && (Math.abs(gx) <= 2 || Math.abs(gx) === 6)) {
            hairCol = '#F4AE92'; // Bright mid-strand peach
          }
          // Tapered sharp needle tip at gx = 2, gy = 4
          else if (gx === 2 && gy === 4) {
            hairCol = '#DC8460'; // Tapered needle tip
          }
          // Bottom strand edge shadows
          else if (
            (gx === -7 && gy === 1) || (gx === 7 && gy === 2) ||
            (gx === 1 && gy === 3)  || (gx === 0 && gy === 2)
          ) {
            hairCol = '#DE8868'; // Soft bottom strand shadow
          }

          // Depth shading on side flanks
          if (Math.abs(gx) >= 12) {
            hairCol = '#B05C3C'; // Deep flank edge shadow
          } else if (Math.abs(gx) >= 10) {
            hairCol = '#C87452'; // Outer cheek lock shadow
          }

          // Subtle hair notch crevice accents (Single 1px accent at lock origins)
          if (((gx === -4 || gx === 4) && gy === -7) || ((gx === -2 || gx === 2) && gy === -6) || (Math.abs(gx) === 5 && gy === -2)) {
            hairCol = '#8B381C';
          }

          ctx.fillStyle = hairCol;
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // ── B. FAIR PORCELAIN FACE SKIN (High Forehead Windows & Cheeks) ──
        let skinCol = '#FFF2EB'; // Fair porcelain fiend skin tone

        // Soft drop shadows cast directly onto skin underneath hair lock borders
        const isUnderBangShadow = (
          ((gx === -3 || gx === -2 || gx === 3) && gy === -7) ||
          ((gx === -4 || gx === 4) && gy === -6) ||
          (Math.abs(gx) === 5 && gy === -1) ||
          (Math.abs(gx) === 6 && gy === 1)  ||
          (Math.abs(gx) === 7 && gy === 3)  ||
          (gx === -1 && (gy === 0 || gy === 1)) ||
          (gx === 0 && gy === 3) ||
          (gx === 1 && gy === 4) ||
          (gx === 2 && gy === 5)
        );

        if (isUnderBangShadow || (gx === -4 && (gy === 1 || gy === 2)) || (gx === -7 && gy === 2)) {
          skinCol = '#F2C8B8'; // Warm drop shadow under bangs & front lock
        } else if (Math.abs(gx) >= 7 && gy >= 2) {
          skinCol = '#F8CEBA'; // Soft cheek warmth
        } else if (gy === 4 && Math.abs(gx) <= 4 && gx !== -3) {
          skinCol = '#FCE0D2'; // Jawline shadow
        }

        ctx.fillStyle = skinCol;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── CLOTHING: PUBLIC SAFETY IVORY SHIRT, BLACK TIE & SLATE-BLUE HOODIE (normY >= 0.22) ──

      // 1. Pointed Shirt Collar Lapels (normY: 0.22 to 0.36, gx: -4 to 4)
      const isCollarWingLeft = (
        gx >= -4 && gx <= -1 && normY >= 0.22 && normY <= 0.36 &&
        (gx - (-4)) * 0.40 >= (normY - 0.22)
      );
      const isCollarWingRight = (
        gx >= 1 && gx <= 4 && normY >= 0.22 && normY <= 0.36 &&
        (4 - gx) * 0.40 >= (normY - 0.22)
      );

      // 2. Center Solid Black Silk Tie (normY: 0.28 to 0.68)
      const isTieKnot = (Math.abs(gx) <= 1 && normY >= 0.28 && normY <= 0.36);
      const isTieBody = (gx >= -1 && gx <= 0 && normY > 0.36 && normY <= 0.68);
      const isTie = isTieKnot || isTieBody;

      // 3. Exposed Throat V-Neck skin cutout (normY: 0.22 to 0.28, gx: 0)
      const isThroatV = (gx === 0 && normY >= 0.22 && normY < 0.28);

      // 4. Loose Slate-Blue Hoodie / Jacket on Flanks
      const isJacketFlank = (Math.abs(gx) >= 5 && normY < 0.88) || (Math.abs(gx) >= 4 && normY >= 0.38 && normY < 0.88);

      // 5. Signature Untucked Left Shirt Hem (normY: 0.68 to 0.84, gx: -4 to -1)
      const isUntuckedShirtHem = (gx >= -4 && gx <= -1 && normY >= 0.68 && normY <= 0.84);

      // 6. High-Waisted Dark Pants & Waistband (normY >= 0.68)
      const isPants = (normY >= 0.68);

      if (isThroatV) {
        ctx.fillStyle = '#ECC2AB'; // Throat skin
        ctx.fillRect(px, py, P, P);
      } else if (isTie) {
        // Solid matte black silk necktie (Matching Anime Reference Image 3)
        if (isTieKnot && gx === 0 && normY <= 0.32) {
          ctx.fillStyle = '#343A48'; // Silk knot highlight
        } else if (isTieBody && gx === 0) {
          ctx.fillStyle = '#222732'; // Tie center sheen
        } else {
          ctx.fillStyle = '#12141A'; // Solid black tie body
        }
        ctx.fillRect(px, py, P, P);
      } else if (isCollarWingLeft || isCollarWingRight) {
        // Crisp ivory-cream pointed collar wings
        if (gx === -4 && gy >= 3 && gy <= 5) {
          ctx.fillStyle = '#DDD8C8'; // Drop shadow on collar under left front lock
        } else if (normY < 0.26) {
          ctx.fillStyle = '#FFFFFF'; // Top collar highlight
        } else if (normY > 0.32) {
          ctx.fillStyle = '#DDD8C8'; // Collar wing tip shadow
        } else {
          ctx.fillStyle = '#FAF8F2'; // Crisp ivory fabric
        }
        ctx.fillRect(px, py, P, P);
      } else if (isJacketFlank) {
        // Dusty Slate-Blue / Steel Blue Oversized Hoodie Jacket (Reference Image 3)
        if (gx === -7 && gy >= 4 && gy <= 8) {
          ctx.fillStyle = '#253B4E'; // Drop shadow on jacket behind front hair strand
        } else if (normY < 0.42) {
          ctx.fillStyle = '#5A7E9C'; // Upper shoulder highlight
        } else if (normY < 0.65) {
          ctx.fillStyle = '#38556F'; // Base slate-blue jacket
        } else {
          ctx.fillStyle = '#253B4E'; // Lower jacket fold shadow
        }
        ctx.fillRect(px, py, P, P);
      } else if (isUntuckedShirtHem) {
        // Power's signature untucked left shirt hem hanging over pants
        if (gx === -1 || normY > 0.78) {
          ctx.fillStyle = '#DDD8C8'; // Fold shadow & bottom hem rim
        } else {
          ctx.fillStyle = '#FAF8F2'; // Ivory shirt fabric
        }
        ctx.fillRect(px, py, P, P);
      } else if (isPants) {
        // Dark Charcoal / Black Trousers
        if (normY < 0.74 && gx >= 1 && gx <= 4) {
          ctx.fillStyle = '#0F1015'; // Dark waistband
        } else if (gx === 0) {
          ctx.fillStyle = '#0B0C10'; // Trouser center fly seam
        } else {
          ctx.fillStyle = '#1A1C24'; // Matte black trousers
        }
        ctx.fillRect(px, py, P, P);
      } else {
        // Center Ivory Button-Up Dress Shirt Body
        if (normX < -0.15) {
          ctx.fillStyle = '#EBE5D6'; // Left chest fold
        } else if (normX > 0.15) {
          ctx.fillStyle = '#DFD9C8'; // Right chest fold shadow
        } else {
          ctx.fillStyle = '#FAF8F2'; // Front crisp ivory placket
        }
        ctx.fillRect(px, py, P, P);

        // Subtle shirt button at center placket
        if (gx === 0 && (gy === 6 || gy === 8)) {
          ctx.fillStyle = '#4A4D58';
          ctx.fillRect(px, py, P, P);
        }
      }
    }
  }

  // ── Twin Crimson Demon Horns (Protruding from top crown: Rule 19.1) ──
  _drawPowerDemonHorns(ctx, r);

  ctx.restore();
}

/**
 * Draws Power's iconic long strawberry-blonde hair cascading down her back (Rule 19.1)
 * Rendered behind the main body circle:
 * - Visibly streams down the left and right flanks (absX up to 14 at gy = -4..5)
 * - Connects to the top crown/scalp at gy = -12
 * - Strictly capped at gy <= 11 so it never passes her lower part / circle bottom rim
 */
export function _drawPowerBackHair(ctx, r) {
  const backHairPixels = [];

  // Hair spans gx from -14 to +14, gy from -12 to 11 (visible on sides, capped above lower rim)
  for (let gx = -14; gx <= 14; gx++) {
    const absX = Math.abs(gx);
    if (absX < 2) continue; // Neck/spine channel

    // Vertical bounds for each column
    let gyMin = 0;
    let gyMax = 0;

    if (absX === 14) {
      gyMin = -4;
      gyMax = 5;  // Visible side stream
    } else if (absX === 13) {
      gyMin = -7;
      gyMax = 8;  // Visible side stream
    } else if (absX === 12) {
      gyMin = -9;
      gyMax = 10; // Visible side stream
    } else if (absX === 11) {
      gyMin = -11;
      gyMax = 11; // Lower cap (never passes lower rim!)
    } else if (absX === 10) {
      gyMin = -12; // Connects to top crown tufts
      gyMax = 11;
    } else if (absX === 9) {
      gyMin = -12; // Connects to top crown tufts
      gyMax = 11;
    } else if (absX === 8) {
      gyMin = -12; // Connects to top crown tufts
      gyMax = 11;
    } else if (absX === 7) {
      gyMin = -10;
      gyMax = 11;
    } else if (absX === 6) {
      gyMin = -8;
      gyMax = 11;
    } else if (absX === 5) {
      gyMin = -6;
      gyMax = 10;
    } else if (absX === 4) {
      gyMin = -4;
      gyMax = 9;
    } else if (absX === 3) {
      gyMin = -2;
      gyMax = 8;
    } else if (absX === 2) {
      gyMin = 0;
      gyMax = 7;
    }

    for (let gy = gyMin; gy <= gyMax; gy++) {
      let col = '#EE9B79'; // Power's vibrant strawberry-peach blonde

      // Highlight luster along straight vertical strands on sides
      if ((absX === 13 || absX === 10) && gy >= -2 && gy <= 7) {
        col = '#FBD3C3'; // Specular strand shine on visible side hair
      } else if (gy >= -5 && gy <= 8 && (absX === 12 || absX === 8)) {
        col = '#F4AE92'; // Bright mid-strand peach
      } else if (gy <= -9) {
        col = '#FBD3C3'; // Top crown luster connecting to horns
      } else if (gy === gyMax) {
        col = '#C87452'; // Bottom edge shadow
      } else if (absX === 14 || (absX <= 3 && gy >= 6)) {
        col = '#B05C3C'; // Outer flank edge & under-jacket shadow
      }

      backHairPixels.push({ gx, gy, col });
    }
  }

  _drawCardinalPixelCluster(ctx, backHairPixels, '#180E0C');
}

/**
 * Discrete crown hair tufts breaking the top circle silhouette (Rule 19.1)
 */
function _drawPowerCrownTufts(ctx, r) {
  const crownTufts = [
    // Left crown tuft (gx: -8..-6, gy: -13..-12)
    { gx: -7, gy: -13, col: '#F7BEA2' },
    { gx: -8, gy: -12, col: '#EEA581' },
    { gx: -6, gy: -12, col: '#EEA581' },
    // Right crown tuft (gx: 6..8, gy: -13..-12)
    { gx:  7, gy: -13, col: '#F7BEA2' },
    { gx:  6, gy: -12, col: '#EEA581' },
    { gx:  8, gy: -12, col: '#EEA581' },
  ];

  _drawCardinalPixelCluster(ctx, crownTufts, '#180E0C');
}

/**
 * Draws Power's iconic twin bright crimson demon horns with smooth conical taper (Rule 19.1)
 * 1:1 match with official anime reference: wide triangular root base, smooth sloping outer edge,
 * near-vertical inner edge, and slim specular glint streak.
 */
function _drawPowerDemonHorns(ctx, r) {
  // Left Horn (slopes smoothly from gx = -6..-2 at base up to needle tip at gx = -3, gy = -20)
  const leftHornPixels = [
    { gx: -3, gy: -20, col: '#B91C1C' }, // Razor-sharp tip
    { gx: -3, gy: -19, col: '#DC2626' }, // Upper tip body
    { gx: -4, gy: -18, col: '#DC2626' },
    { gx: -3, gy: -18, col: '#FFFFFF' }, // Specular glint
    { gx: -4, gy: -17, col: '#DC2626' },
    { gx: -3, gy: -17, col: '#FED7D7' }, // Specular glint halo
    { gx: -5, gy: -16, col: '#B91C1C' },
    { gx: -4, gy: -16, col: '#EF4444' },
    { gx: -3, gy: -16, col: '#FED7D7' },
    { gx: -5, gy: -15, col: '#991B1B' },
    { gx: -4, gy: -15, col: '#DC2626' },
    { gx: -3, gy: -15, col: '#EF4444' },
    { gx: -6, gy: -14, col: '#7F1D1D' },
    { gx: -5, gy: -14, col: '#991B1B' },
    { gx: -4, gy: -14, col: '#DC2626' },
    { gx: -3, gy: -14, col: '#DC2626' },
    { gx: -6, gy: -13, col: '#450A0A' }, // Wide root anchor
    { gx: -5, gy: -13, col: '#7F1D1D' },
    { gx: -4, gy: -13, col: '#991B1B' },
    { gx: -3, gy: -13, col: '#991B1B' },
    { gx: -2, gy: -13, col: '#450A0A' },
  ];

  // Right Horn (slopes smoothly from gx = 2..6 at base up to needle tip at gx = 3, gy = -20)
  const rightHornPixels = [
    { gx:  3, gy: -20, col: '#B91C1C' }, // Razor-sharp tip
    { gx:  3, gy: -19, col: '#DC2626' }, // Upper tip body
    { gx:  3, gy: -18, col: '#FFFFFF' }, // Specular glint
    { gx:  4, gy: -18, col: '#DC2626' },
    { gx:  3, gy: -17, col: '#FED7D7' }, // Specular glint halo
    { gx:  4, gy: -17, col: '#DC2626' },
    { gx:  3, gy: -16, col: '#FED7D7' },
    { gx:  4, gy: -16, col: '#EF4444' },
    { gx:  5, gy: -16, col: '#B91C1C' },
    { gx:  3, gy: -15, col: '#EF4444' },
    { gx:  4, gy: -15, col: '#DC2626' },
    { gx:  5, gy: -15, col: '#991B1B' },
    { gx:  3, gy: -14, col: '#DC2626' },
    { gx:  4, gy: -14, col: '#DC2626' },
    { gx:  5, gy: -14, col: '#991B1B' },
    { gx:  6, gy: -14, col: '#7F1D1D' },
    { gx:  2, gy: -13, col: '#450A0A' },
    { gx:  3, gy: -13, col: '#991B1B' },
    { gx:  4, gy: -13, col: '#991B1B' },
    { gx:  5, gy: -13, col: '#7F1D1D' },
    { gx:  6, gy: -13, col: '#450A0A' }, // Wide root anchor
  ];

  _drawCardinalPixelCluster(ctx, [...leftHornPixels, ...rightHornPixels], '#180E0C');
}


/**
 * Helper to render pixel clusters with clean 1px cardinal border outlines
 */
function _drawCardinalPixelCluster(ctx, pixels, outlineColor = '#180E0C') {
  ctx.fillStyle = outlineColor;
  for (let p of pixels) {
    const px = snap(p.gx * P);
    const py = snap(p.gy * P);
    ctx.fillRect(px - P, py, P, P);
    ctx.fillRect(px + P, py, P, P);
    ctx.fillRect(px, py - P, P, P);
    ctx.fillRect(px, py + P, P, P);
  }
  for (let p of pixels) {
    ctx.fillStyle = p.col;
    ctx.fillRect(snap(p.gx * P), snap(p.gy * P), P, P);
  }
}

/**
 * Draws Power's Back Hand (Behind Body Circle Layer)
 */
function _drawPowerBackHand(ctx, fighter, r, isHammerSwinging, isScytheSpinning, isPunching, animPhase, comboCycle, now) {
  ctx.save();
  let handX = r * 0.95;
  let handY = -r * 0.15;

  if (isHammerSwinging) {
    const ext = Math.sin(animPhase * Math.PI) * (r * 0.6);
    handX += ext;
  } else if (isPunching) {
    const isBackHit = (comboCycle % 2 === 1);
    if (isBackHit) {
      handX += Math.sin(animPhase * Math.PI) * (r * 0.85);
    }
  }

  drawPixelHand(ctx, handX, handY, getHandSize(5.5), '#FFF1EB', '#1C110F');
  ctx.restore();
}

/**
 * Draws Power's Front Hand & Blood Hammer / Weapon (Front Layer — On Top of Body)
 */
function _drawPowerFrontHand(ctx, fighter, r, isHammerSwinging, isScytheSpinning, isPunching, animPhase, comboCycle, now) {
  ctx.save();
  let handX = r * 0.70;
  let handY = r * 0.15;

  if (isHammerSwinging) {
    const ext = Math.sin(animPhase * Math.PI) * (r * 0.9);
    handX += ext;
    // Draw hammer swing head
    drawPowerBloodHammer(ctx, handX, handY, 0, r, { swingPhase: animPhase });
  } else if (isPunching) {
    const isFrontHit = (comboCycle % 2 === 0);
    if (isFrontHit) {
      handX += Math.sin(animPhase * Math.PI) * (r * 0.95);
    }
  }

  drawPixelHand(ctx, handX, handY, getHandSize(6.0), '#FFF1EB', '#1C110F');
  ctx.restore();
}

/**
 * Draws Power's Gigantic Spiked Blood Hammer in Solid 2D Pixel Art
 */
export function drawPowerBloodHammer(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const hammerW = 28;
  const hammerH = 20;
  const handleLen = 34;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Crystal Blood Handle (Haft)
  ctx.fillStyle = '#1C110F'; // Ink outline
  ctx.fillRect(-P, -P, handleLen + P * 2, 4 + P * 2);

  ctx.fillStyle = '#881313'; // Dark blood handle
  ctx.fillRect(0, 0, handleLen, 4);

  ctx.fillStyle = '#EF4444'; // Core glint
  ctx.fillRect(2, 1, handleLen - 4, 2);

  // 2. Giant Hammer Head
  const headX = handleLen - 6;
  const headY = -hammerH / 2 + 2;

  ctx.fillStyle = '#1C110F'; // Ink outline
  ctx.fillRect(headX - P, headY - P, hammerW + P * 2, hammerH + P * 2);

  // Hammer Body
  ctx.fillStyle = '#DC2626'; // Deep crimson blood mass
  ctx.fillRect(headX, headY, hammerW, hammerH);

  ctx.fillStyle = '#EF4444'; // Gleaming top edge
  ctx.fillRect(headX + 2, headY + 2, hammerW - 4, 3);

  ctx.fillStyle = '#7F1D1D'; // Bottom mass shadow
  ctx.fillRect(headX + 2, headY + hammerH - 5, hammerW - 4, 3);

  // 3. Spiked Blood Teeth
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(headX + hammerW, headY + 3, 4, 4); // Front top spike
  ctx.fillRect(headX + hammerW, headY + hammerH - 7, 4, 4); // Front bottom spike
  ctx.fillRect(headX - 4, headY + hammerH / 2 - 2, 4, 4); // Rear counter-spike

  // 4. Dripping blood drops
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(headX + 8, headY + hammerH + 2, P, P * 2);
  ctx.fillRect(headX + 18, headY + hammerH + 3, P, P * 1.5);

  ctx.restore();
}

/**
 * Draws Power's Curved Blood Scythe in Solid 2D Pixel Art
 */
export function drawPowerBloodScythe(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const shaftLen = 48;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Shaft
  ctx.fillStyle = '#1C110F';
  ctx.fillRect(-P, -P, shaftLen + P * 2, 4 + P * 2);
  ctx.fillStyle = '#881313';
  ctx.fillRect(0, 0, shaftLen, 4);

  // Curved Crescent Scythe Head
  const scytheHeadX = shaftLen - 4;
  ctx.fillStyle = '#1C110F';
  ctx.fillRect(scytheHeadX, -22, 18, 26);

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(scytheHeadX + 2, -20, 14, 22);

  ctx.fillStyle = '#EF4444'; // Cutting edge
  ctx.fillRect(scytheHeadX + 12, -20, 4, 18);

  ctx.restore();
}
