// ─────────────────────────────────────────────
// MIYAMOTO MUSASHI FIGHTER SKIN & BODY MODEL
// Legendary Blade Master (Niten Ichi-ryū)
// Features Authentic Procedural Pixel-Art Body & Upright Front POV:
// 1. Weathered tan samurai skin with battle cheek scar & stubble (Rule 19 Compliant, Faceless)
// 2. High wild spiky samurai topknot ponytail & discrete lock silhouette
// 3. Dark charcoal/navy samurai kimono gi with open V-neck collar & white under-robe
// 4. Earthy rope/leather obi waist sash & dark pleated hakama pants
// 5. Dual Niten Ichi-ryū forward guard (Katana & Wakizashi) in upright anime POV
// Adheres strictly to Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawMusashiWeapons, drawMusashiSheaths } from '../weapons/musashiWeaponGraphics.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

let _cachedMusashiBodyCanvas = null;
let _cachedMusashiBodyR = 0;

/**
 * Procedural Pixel-Art Body for Musashi (Renders once to offscreen cache).
 * - Stepped dark outer circle stroke (#0E0F14)
 * - White forehead hachimaki headband
 * - Weathered tan athletic skin with diagonal battle cheek scar
 * - Open V-neck kimono showing tanned chest & white under-collar
 * - Leather/rope obi sash around waist
 * - Pleated dark hakama trousers
 */
function _renderMusashiPixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);

  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;
      const normY = ry / r;
      const normX = rx / r;

      // 1. 4-neighbor boundary test for clean 1-pixel outer manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Headband & Face (ry < r * 0.22)
      // ──────────────────────────────────────────
      if (normY < 0.22) {
        // Forehead Hachimaki Headband (normY: -0.42 to -0.22)
        if (normY >= -0.42 && normY < -0.22) {
          if (normY < -0.38) {
            destCtx.fillStyle = '#CBD5E1'; // Headband upper shadow
          } else if (Math.abs(normX) < 0.25 && normY >= -0.34 && normY <= -0.26) {
            destCtx.fillStyle = '#FFFFFF'; // Headband highlight center
          } else {
            destCtx.fillStyle = '#E2E8F0'; // White cloth headband
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Weathered Tan Athletic Warrior Skin Face
        let skinCol = '#E0A882';

        // Face Highlight (Forehead & bridge zone)
        if (normY < 0.02 && Math.abs(normX) < 0.40) {
          skinCol = '#F0C09E';
        }

        // Cheek / Jaw Contour Shadows
        if (Math.abs(normX) > 0.65) {
          skinCol = '#C48B68';
        }

        // Battle Stubble / Jaw Shadow on lower chin
        if (normY >= 0.10 && normY < 0.22) {
          if ((gx + gy) % 2 === 0) {
            skinCol = '#B07855'; // Rough stubble texture
          } else {
            skinCol = '#C48B68';
          }
        }

        // Diagonal Combat Cross-Scar on Right Cheek (rx > 0, ry ~ -0.05 to 0.08)
        const isScar = (gx >= 3 && gx <= 7 && gy >= -2 && gy <= 3 && Math.abs((gx - 3) - (gy + 2)) <= 1);
        if (isScar) {
          skinCol = '#8C3830'; // Crimson battle scar
        }

        destCtx.fillStyle = skinCol;
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 2: Samurai Kimono Gi & Collar (0.22 <= normY < 0.58)
      // ──────────────────────────────────────────
      if (normY < 0.58) {
        // Open V-Neck Bare Chest (Center exposed chest/collarbones)
        const vSlope = (normY - 0.22) / (0.58 - 0.22); // 0 at neck, 1 at sternum
        const vWidth = 0.28 * (1.0 - vSlope * 0.75); // V gets narrower at the base

        if (Math.abs(normX) < vWidth && normY < 0.46) {
          // Tan Bare Chest
          if (normY < 0.32) {
            destCtx.fillStyle = '#F0C09E'; // Collarbone highlight
          } else if (normX === 0 && normY >= 0.32) {
            destCtx.fillStyle = '#A06848'; // Center chest crease
          } else {
            destCtx.fillStyle = '#E0A882';
          }
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Inner White Robe Lapel Trim (along the V edge)
        const isWhiteLapel = (Math.abs(normX) >= vWidth && Math.abs(normX) < vWidth + 0.08 && normY < 0.48);
        if (isWhiteLapel) {
          destCtx.fillStyle = '#F1F5F9';
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Deep Slate Navy / Charcoal Kimono Gi Fabric
        if (normY < 0.30) {
          destCtx.fillStyle = '#2C3240'; // Shoulder highlight
        } else if (Math.abs(normX) < 0.45) {
          destCtx.fillStyle = '#1E232E'; // Kimono chest fold
        } else {
          destCtx.fillStyle = '#171B24'; // Kimono dark fabric
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 3: Obi Waist Sash (0.58 <= normY < 0.72)
      // ──────────────────────────────────────────
      if (normY < 0.72) {
        // Center Sash Knot & Hanging Rope Loops
        if (Math.abs(normX) <= 0.16) {
          if (normY <= 0.64) {
            destCtx.fillStyle = '#D27D38'; // Center knot highlight
          } else if (Math.abs(normX) <= 0.04) {
            destCtx.fillStyle = '#5A2C0A'; // Rope split shadow
          } else {
            destCtx.fillStyle = '#8B4513'; // Leather sash rope
          }
        } else if (normY < 0.62) {
          destCtx.fillStyle = '#A0522D'; // Obi upper fold
        } else {
          destCtx.fillStyle = '#783A16'; // Obi dark leather base
        }
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 4: Pleated Hakama Pants (normY >= 0.72)
      // ──────────────────────────────────────────
      const isPleatFold = (Math.abs(gx) === 4 || gx === 0);
      if (isPleatFold) {
        destCtx.fillStyle = '#0B0D12'; // Inseam pleat crease
      } else if (normY < 0.82 && Math.abs(normX) < 0.50) {
        destCtx.fillStyle = '#232834'; // Upper hakama pleat highlight
      } else {
        destCtx.fillStyle = '#141720'; // Deep slate hakama trousers
      }
      destCtx.fillRect(px, py, P, P);
    }
  }

  destCtx.restore();
}

/**
 * Draws Musashi's procedural pixel-art body with offscreen canvas caching.
 */
export function drawMusashiPixelBody(ctx, r) {
  if (typeof document === 'undefined') {
    _renderMusashiPixelBodyToCanvas(ctx, r);
    return;
  }

  const intR = Math.round(r);
  if (!_cachedMusashiBodyCanvas || _cachedMusashiBodyR !== intR) {
    const steps = Math.ceil((intR + P) / P);
    const size = (steps * 2 + 1) * P;
    _cachedMusashiBodyCanvas = document.createElement('canvas');
    _cachedMusashiBodyCanvas.width = size;
    _cachedMusashiBodyCanvas.height = size;
    const cctx = _cachedMusashiBodyCanvas.getContext('2d');
    _renderMusashiPixelBodyToCanvas(cctx, intR);
    _cachedMusashiBodyR = intR;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const size = _cachedMusashiBodyCanvas.width;
  ctx.drawImage(_cachedMusashiBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}

/**
 * Draws Musashi's high wild samurai topknot ponytail & spiky hair silhouette.
 * Defined strictly as discrete lock arrays (Rule 3.4 - No sine waves).
 * Protrudes upward into -Y (crown spikes to -r * 1.30) to create the iconic samurai silhouette.
 */
export function _drawMusashiHair(ctx, r, facingLeft = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Discrete Hair Lock Polygons (in local body coordinates where (0,0) is center, -Y is Up)
  // 1. High Samurai Topknot (Ponytail rising from upper back head)
  const topknotLocks = [
    // Center high topknot brush
    [
      { x: -r * 0.15, y: -r * 0.70 },
      { x: -r * 0.28, y: -r * 1.10 },
      { x: -r * 0.15, y: -r * 1.32 }, // Peak tip
      { x: 0,         y: -r * 1.25 },
      { x: r * 0.12,  y: -r * 0.95 },
      { x: 0,         y: -r * 0.70 }
    ],
    // Right secondary topknot spike
    [
      { x: 0,         y: -r * 0.75 },
      { x: r * 0.15,  y: -r * 1.12 },
      { x: r * 0.28,  y: -r * 1.26 }, // Right tip
      { x: r * 0.22,  y: -r * 0.95 },
      { x: r * 0.08,  y: -r * 0.72 }
    ],
    // Left trailing topknot spike
    [
      { x: -r * 0.10, y: -r * 0.75 },
      { x: -r * 0.35, y: -r * 1.05 },
      { x: -r * 0.42, y: -r * 1.18 }, // Left high tip
      { x: -r * 0.28, y: -r * 0.90 },
      { x: -r * 0.18, y: -r * 0.70 }
    ]
  ];

  // 2. Crown Outer Hair Spikes (Surrounding the upper circle silhouette)
  const crownSpikes = [
    // Far Left Crown Spike
    [
      { x: -r * 0.92, y: -r * 0.35 },
      { x: -r * 1.10, y: -r * 0.65 },
      { x: -r * 0.75, y: -r * 0.68 },
      { x: -r * 0.60, y: -r * 0.45 }
    ],
    // Mid-Left Crown Spike
    [
      { x: -r * 0.70, y: -r * 0.60 },
      { x: -r * 0.85, y: -r * 0.92 },
      { x: -r * 0.50, y: -r * 0.88 },
      { x: -r * 0.40, y: -r * 0.65 }
    ],
    // Top-Left Crown Spike
    [
      { x: -r * 0.50, y: -r * 0.80 },
      { x: -r * 0.45, y: -r * 1.12 },
      { x: -r * 0.20, y: -r * 0.95 },
      { x: -r * 0.25, y: -r * 0.75 }
    ],
    // Top-Right Crown Spike
    [
      { x: r * 0.15,  y: -r * 0.75 },
      { x: r * 0.38,  y: -r * 1.08 },
      { x: r * 0.52,  y: -r * 0.82 },
      { x: r * 0.35,  y: -r * 0.68 }
    ],
    // Far Right Crown Spike
    [
      { x: r * 0.55,  y: -r * 0.50 },
      { x: r * 0.95,  y: -r * 0.72 },
      { x: r * 0.82,  y: -r * 0.40 },
      { x: r * 0.65,  y: -r * 0.32 }
    ]
  ];

  // 3. Side Locks & Forehead Bangs (Framing face & headband)
  const sideBangs = [
    // Left Temple Lock
    [
      { x: -r * 0.88, y: -r * 0.25 },
      { x: -r * 1.02, y: -r * 0.05 },
      { x: -r * 0.75, y: 0 },
      { x: -r * 0.70, y: -r * 0.20 }
    ],
    // Right Temple Lock
    [
      { x: r * 0.88,  y: -r * 0.25 },
      { x: r * 1.02,  y: -r * 0.05 },
      { x: r * 0.75,  y: 0 },
      { x: r * 0.70,  y: -r * 0.20 }
    ],
    // Center-Left Stray Forehead Bang
    [
      { x: -r * 0.35, y: -r * 0.45 },
      { x: -r * 0.25, y: -r * 0.20 },
      { x: -r * 0.15, y: -r * 0.42 }
    ],
    // Center-Right Stray Forehead Bang
    [
      { x: r * 0.12,  y: -r * 0.45 },
      { x: r * 0.22,  y: -r * 0.22 },
      { x: r * 0.32,  y: -r * 0.42 }
    ]
  ];

  const allLocks = [...topknotLocks, ...crownSpikes, ...sideBangs];

  // Pass 1: Outer Dark Ink Shell (#0E0F14)
  ctx.fillStyle = '#0E0F14';
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 3.0;
  ctx.lineJoin = 'miter';

  allLocks.forEach(poly => {
    ctx.beginPath();
    poly.forEach((pt, i) => {
      const sx = snap(pt.x);
      const sy = snap(pt.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Pass 2: Base Dark Obsidian Hair Fill (#161820)
  ctx.fillStyle = '#161820';
  allLocks.forEach(poly => {
    ctx.beginPath();
    poly.forEach((pt, i) => {
      const sx = snap(pt.x);
      const sy = snap(pt.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
  });

  // Pass 3: Mid-Lock Slate Highlights (#282D3B)
  ctx.fillStyle = '#282D3B';
  topknotLocks.forEach(poly => {
    ctx.beginPath();
    const p0 = poly[0];
    const p1 = poly[1];
    const p2 = poly[2];
    ctx.moveTo(snap(p0.x + (p1.x - p0.x) * 0.2), snap(p0.y + (p1.y - p0.y) * 0.2));
    ctx.lineTo(snap(p1.x), snap(p1.y));
    ctx.lineTo(snap(p2.x), snap(p2.y));
    ctx.lineTo(snap(p2.x * 0.7), snap(p2.y * 0.7));
    ctx.closePath();
    ctx.fill();
  });

  // Crown spike mid-tones
  crownSpikes.forEach((poly, idx) => {
    if (idx % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(snap(poly[0].x * 0.8), snap(poly[0].y * 0.8));
      ctx.lineTo(snap(poly[1].x), snap(poly[1].y));
      ctx.lineTo(snap(poly[2].x * 0.9), snap(poly[2].y * 0.9));
      ctx.closePath();
      ctx.fill();
    }
  });

  // Pass 4: Specular Hair Glint (#485268) & Red Hair Tie (#C0392B)
  // Red Hair Tie knot on topknot base
  ctx.fillStyle = '#C0392B';
  ctx.fillRect(snap(-r * 0.20), snap(-r * 0.78), snap(r * 0.35), snap(r * 0.12));
  ctx.fillStyle = '#E74C3C';
  ctx.fillRect(snap(-r * 0.15), snap(-r * 0.76), snap(r * 0.22), snap(r * 0.06));

  // Sharp topknot glint
  ctx.fillStyle = '#485268';
  ctx.fillRect(snap(-r * 0.20), snap(-r * 1.15), 3, 6);
  ctx.fillRect(snap(r * 0.15), snap(-r * 1.05), 3, 5);

  ctx.restore();
}

/**
 * Pixel Art Back Hand (Behind Body Layer)
 * Holds offhand grip or rests at guard.
 */
export function _drawMusashiBackHand(ctx, fighter, r) {
  // When weapons are drawn separately, this can draw the resting/offhand grip
  // Positioned at (r * 0.65, -r * 0.30)
  const handSize = getHandSize(5.4);
  drawPixelHand(ctx, r * 0.65, -r * 0.30, handSize, '#E0A882', '#0E0F14');
}

/**
 * Pixel Art Front Hand (On Top of Body Layer)
 * Positions lead grip at forward guard.
 */
export function _drawMusashiFrontHand(ctx, fighter, r) {
  // Front Hand is drawn with weapon in drawMusashiWeapons
}

/**
 * Main Skin Renderer for Miyamoto Musashi (Authentic Upright Anime Swordsman Edition)
 */
export function drawMusashiSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush ||
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // 2. LAYER 0: SAYA (SHEATHS) on hip (Behind Body)
  if (drawMusashiSheaths) {
    drawMusashiSheaths(ctx, fighter, fighter.isSheathed, true); // true = local coordinate mode
  }

  // 3. LAYER 1: BACK HAND (Behind Body, only if weapons not currently active)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;

  // 4. LAYER 2: PROCEDURAL PIXEL-ART BODY (Headband, Scarred Face, Kimono Gi, Obi, Hakama)
  drawMusashiPixelBody(ctx, r);

  // 5. LAYER 3: WILD SAMURAI TOPKNOT HAIR & discrete spikes
  _drawMusashiHair(ctx, r, facingLeft);

  // 6. LAYER 4: DUAL WEAPONS & HANDS (On Top of Body)
  if (!fighter.isSheathed && !Boolean(state.showSkinOnly)) {
    drawMusashiWeapons(ctx, fighter, true); // true = local coordinate mode
  }

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Renders Musashi's Ghost Model Afterimage with full skin details, stance aura energy, and upright samurai silhouette.
 */
export function drawMusashiGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5, currentStance = 'water') {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  ctx.rotate(angle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Spectral Stance Energy Outer Glow Aura
  let auraCol = 'rgba(50, 180, 255, 0.35)'; // Water default
  if (currentStance === 'earth') auraCol = 'rgba(220, 100, 50, 0.35)';
  if (currentStance === 'fire') auraCol = 'rgba(255, 80, 20, 0.35)';
  if (currentStance === 'wind') auraCol = 'rgba(80, 220, 130, 0.35)';
  if (currentStance === 'void') auraCol = 'rgba(180, 80, 255, 0.35)';

  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = auraCol;
  ctx.fill();

  // 2. Procedural Pixel Body
  drawMusashiPixelBody(ctx, r);

  // 3. Hair Overlay
  _drawMusashiHair(ctx, r, facingLeft);

  // 4. Spectral Body Outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
