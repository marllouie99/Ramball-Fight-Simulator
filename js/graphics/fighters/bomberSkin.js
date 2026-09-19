import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawBomberGrenade } from '../weapons/bomberWeaponGraphics.js';
import { drawPixelHand } from '../draw.js';

/**
 * Tactical Demolitionist Pixel Art Engine (P = 2.0px discrete grid)
 * Upright Front POV, Faceless Minimalist Aesthetic (Rule 19 & 35)
 */
export function drawBomberPixelBody(ctx, r, isGhost = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const minX = Math.floor((-r * 1.15) / P) * P;
  const maxX = Math.ceil((r * 1.15) / P) * P;
  const minY = Math.floor((-r * 1.15) / P) * P;
  const maxY = Math.ceil((r * 1.05) / P) * P;

  // Geometry test: Circular base with helmet crest and shoulder pads
  function isInsideBody(x, y) {
    // Helmet dome extends to -r * 1.10
    if (y < -r * 0.35) {
      const hx = x;
      const hy = y - (-r * 0.25);
      return Math.hypot(hx, hy) <= r * 0.88;
    }
    // Main circular torso & legs
    return Math.hypot(x, y) <= r;
  }

  // ── PASS 1: 4-Neighbor Attached Manga Ink Outline Shell ──
  const cOutline = isGhost ? '#0A0D14' : '#111114';
  ctx.fillStyle = cOutline;
  for (let gy = minY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideBody(gx, gy)) continue;

      const isBorder =
        !isInsideBody(gx + P, gy) ||
        !isInsideBody(gx - P, gy) ||
        !isInsideBody(gx, gy + P) ||
        !isInsideBody(gx, gy - P);

      if (isBorder) {
        ctx.fillRect(snap(gx), snap(gy), P, P);
      }
    }
  }

  // ── PASS 2: Stepped Volumetric Shading by Tactical Zone ──
  for (let gy = minY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideBody(gx, gy)) continue;

      const isBorder =
        !isInsideBody(gx + P, gy) ||
        !isInsideBody(gx - P, gy) ||
        !isInsideBody(gx, gy + P) ||
        !isInsideBody(gx, gy - P);

      if (isBorder) continue;

      const px = snap(gx);
      const py = snap(gy);

      // ── ZONE 1: Helmet & Blast Visor (-r * 1.15 to -r * 0.18) ──
      if (gy < -r * 0.18) {
        if (isGhost) {
          ctx.fillStyle = gy < -r * 0.65 ? '#1E293B' : '#0F172A';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Helmet Dome Top Highlight
        if (gy < -r * 0.75) {
          ctx.fillStyle = Math.abs(gx) < r * 0.35 ? '#5A6E48' : '#3E4D32';
        }
        // Helmet Mid-Rim with steel rivets
        else if (gy < -r * 0.48) {
          if (Math.abs(gx) === snap(r * 0.4) || gx === 0) {
            ctx.fillStyle = '#CBD5E1'; // Steel rivet glint
          } else {
            ctx.fillStyle = '#3E4D32';
          }
        }
        // Amber Blast Goggles / Visor (-r * 0.48 to -r * 0.18)
        else {
          if (Math.abs(gx) < r * 0.68) {
            // Lens Specular Shine
            if (gy < -r * 0.38 && gx > -r * 0.35 && gx < -r * 0.05) {
              ctx.fillStyle = '#FFFFFF';
            } else if (gy < -r * 0.32) {
              ctx.fillStyle = '#F59E0B'; // Amber visor
            } else {
              ctx.fillStyle = '#B45309'; // Shadowed lens
            }
          } else {
            ctx.fillStyle = '#22281E'; // Goggle strap & ear frame
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 2: Flak Vest & TNT Harness (-r * 0.18 to +r * 0.60) ──
      else if (gy < r * 0.60) {
        if (isGhost) {
          ctx.fillStyle = gy < r * 0.20 ? '#1E293B' : '#0F172A';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Center Webbing Harness with 3 Strapped TNT Dynamite Sticks
        const isCenterWebbing = Math.abs(gx) < r * 0.52;
        if (isCenterWebbing && gy > -r * 0.08 && gy < r * 0.42) {
          // Dynamite Fuse Caps on top
          if (gy < r * 0.04) {
            ctx.fillStyle = '#FCD34D'; // Gold fuse caps
          }
          // Red TNT Dynamite Sticks
          else if (gy < r * 0.32) {
            const isFuseBand = gy >= r * 0.16 && gy <= r * 0.20;
            if (isFuseBand) {
              ctx.fillStyle = '#1E293B'; // Black holding strap
            } else {
              // 3 separate sticks: left, center, right
              const stickSlot = Math.floor((gx + r * 0.52) / (r * 0.35));
              if (stickSlot % 2 === 0) {
                ctx.fillStyle = '#EF4444'; // Bright explosive red
              } else {
                ctx.fillStyle = '#B91C1C'; // Dark explosive crimson
              }
            }
          }
          // Bottom dynamite base
          else {
            ctx.fillStyle = '#991B1B';
          }
        }
        // Heavy Olive Flak Vest Jacket
        else {
          if (Math.abs(gx) < r * 0.55 && gy < r * 0.15) {
            ctx.fillStyle = '#4B5E3C'; // Vest highlight
          } else if (Math.abs(gx) > r * 0.72 || gy > r * 0.42) {
            ctx.fillStyle = '#2A3522'; // Vest shadow
          } else {
            ctx.fillStyle = '#3A4A2F'; // Standard vest tone
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 3: Tactical Utility Belt (+r * 0.60 to +r * 0.75) ──
      else if (gy < r * 0.75) {
        if (isGhost) {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Center Steel Buckle
        if (Math.abs(gx) < r * 0.18) {
          ctx.fillStyle = gy < r * 0.66 ? '#E2E8F0' : '#94A3B8';
        }
        // Ammo Pouches
        else if (Math.abs(gx) > r * 0.30 && Math.abs(gx) < r * 0.65) {
          ctx.fillStyle = gy < r * 0.68 ? '#57534E' : '#292524';
        }
        // Heavy Utility Strap
        else {
          ctx.fillStyle = '#1C1917';
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 4: Cargo Trousers & Combat Boots (+r * 0.75 to +r * 1.05) ──
      else {
        if (isGhost) {
          ctx.fillStyle = '#090D16';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (gy < r * 0.88) {
          ctx.fillStyle = Math.abs(gx) < r * 0.45 ? '#44403C' : '#292524'; // Camo dark khaki
        } else {
          // Steel-toed boots
          ctx.fillStyle = Math.abs(gx) < r * 0.35 && gy < r * 0.96 ? '#334155' : '#0F172A';
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Standard Bomber Skin Renderer with Upright Front POV Transform (Rule 19)
 */
export function drawBomberSkin(ctx, x, y, r, angle, skinColor, skinAccentColor) {
  ctx.save();
  ctx.translate(x, y);

  const drawAngle = angle || 0;
  ctx.rotate(drawAngle);

  // Mirror Y-axis vertically so helmet stays on top (-Y) and boots on bottom (+Y) when aiming left
  const facingLeft = Math.abs(drawAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  drawBomberPixelBody(ctx, r, false);
  ctx.restore();
}

/**
 * Bomber Ghost Model for Dodge / Afterimage Visuals
 */
export function drawBomberGhostModel(ctx, r) {
  drawBomberPixelBody(ctx, r, true);
}

/**
 * Combat Outline & Throw Range Visualizer
 */
export function drawBomberOutline(ctx, x, y, r, skinColor) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = skinColor || '#F59E0B';
  ctx.stroke();

  // Draw throw radius (max range — emerald dashed)
  const throwRadius = CONFIG.bomber?.throwRadius || 280;
  ctx.beginPath();
  ctx.arc(x, y, throwRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw restrict radius (min range — crimson dashed)
  const restrictRadius = CONFIG.bomber?.restrictRadius || 80;
  ctx.beginPath();
  ctx.arc(x, y, restrictRadius, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.30)';
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Legacy Body Draw Wrapper for Backward Compatibility
 */
export function drawBomberBody(ctx, r, angle, skinColor, skinAccentColor) {
  ctx.save();
  const drawAngle = angle || 0;
  ctx.rotate(drawAngle);
  const facingLeft = Math.abs(drawAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  drawBomberPixelBody(ctx, r, false);
  ctx.restore();
}

/**
 * Held Grenade Renderer with drawPixelHand Layering (Rule 20)
 */
export function drawBomberHeldGrenade(ctx, x, y, r, gunAngle) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const handOffset = r + (CONFIG.gun?.baseOffset || 6) + 4;
  const handX = x + Math.cos(gunAngle) * handOffset;
  const handY = y + Math.sin(gunAngle) * handOffset;

  const perpX = -Math.sin(gunAngle);
  const perpY = Math.cos(gunAngle);
  const grenadeRadius = Math.max(5, r * 0.38);
  const sideOffset = grenadeRadius * 0.75;
  const forwardOffset = -4;
  const gx = handX + Math.cos(gunAngle) * forwardOffset + perpX * sideOffset;
  const gy = handY + Math.sin(gunAngle) * forwardOffset + perpY * sideOffset;

  // Draw the stepped pixel grenade
  drawBomberGrenade(ctx, gx, gy, grenadeRadius, {
    rotation: gunAngle,
    isSticky: false,
    sparkPhase: Date.now() / 100,
    trailPoints: [],
    shadowAlpha: 0.15,
    zHeight: 0,
    isHeld: true,
  });

  // Draw holding hand with pixel hand engine
  drawPixelHand(ctx, handX, handY, 4.5, '#D4A373', '#111114');
}
