import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Royal Paladin (Knight) Pixel Art Engine (P = 2.0px discrete grid)
 * Upright Front POV, Faceless Minimalist Aesthetic (Rule 19 & 35)
 */
export function drawKnightPixelBody(ctx, r, isGhost = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const minX = Math.floor((-r * 1.15) / P) * P;
  const maxX = Math.ceil((r * 1.15) / P) * P;
  const minY = Math.floor((-r * 1.15) / P) * P;
  const maxY = Math.ceil((r * 1.05) / P) * P;

  // Geometry: Circular body with helmet plume extending to -r * 1.14
  function isInsideBody(x, y) {
    // Crimson Helmet Plume on top
    if (y < -r * 0.50) {
      const isPlume = Math.abs(x) < r * 0.28 && y >= -r * 1.14;
      if (isPlume) return true;
    }
    // Main circular steel body & pauldron wings
    return Math.hypot(x, y) <= r;
  }

  // ── PASS 1: 4-Neighbor Attached Manga Ink Outline Shell ──
  const cOutline = isGhost ? '#0A0D14' : '#0E0F14';
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

  // ── PASS 2: Stepped Volumetric Shading by Paladin Armor Zone ──
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

      // ── ZONE 1: Plumed Greathelm & T-Visor (-r * 1.15 to -r * 0.18) ──
      if (gy < -r * 0.18) {
        if (isGhost) {
          ctx.fillStyle = gy < -r * 0.65 ? '#1E293B' : '#0F172A';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Flowing Crimson Plume on Greathelm Crown (-r * 1.15 to -r * 0.72)
        if (gy < -r * 0.72 && Math.abs(gx) < r * 0.26) {
          if (gy < -r * 0.96) {
            ctx.fillStyle = '#F87171'; // Plume tip highlight
          } else if (Math.abs(gx) < r * 0.14) {
            ctx.fillStyle = '#DC2626'; // Vibrant crimson core
          } else {
            ctx.fillStyle = '#991B1B'; // Deep crimson shadow
          }
        }
        // Greathelm Steel Dome (-r * 0.72 to -r * 0.45)
        else if (gy < -r * 0.45) {
          if (gy < -r * 0.60 && Math.abs(gx) < r * 0.40) {
            ctx.fillStyle = '#F1F5F9'; // Polished steel glint
          } else if (Math.abs(gx) > r * 0.65) {
            ctx.fillStyle = '#475569'; // Steel side shadow
          } else {
            ctx.fillStyle = '#94A3B8'; // Base steel
          }
        }
        // T-Shaped Paladin Visor Slit (-r * 0.45 to -r * 0.18)
        else {
          const isHorizontalVisor = gy >= -r * 0.38 && gy <= -r * 0.28 && Math.abs(gx) < r * 0.55;
          const isVerticalVisor = Math.abs(gx) <= r * 0.12 && gy > -r * 0.28;

          if (isHorizontalVisor || isVerticalVisor) {
            ctx.fillStyle = '#0F172A'; // Dark obsidian visor slit
          } else if (Math.abs(gx) < r * 0.65) {
            ctx.fillStyle = gy < -r * 0.25 ? '#CBD5E1' : '#64748B'; // Steel faceplate
          } else {
            ctx.fillStyle = '#334155'; // Pauldron base
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 2: Silver Cuirass & Royal Cross Emblem (-r * 0.18 to +r * 0.60) ──
      else if (gy < r * 0.60) {
        if (isGhost) {
          ctx.fillStyle = gy < r * 0.20 ? '#334155' : '#1E293B';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Royal Gold Cross Emblem at Chest Center
        const isCrossHoriz = gy >= r * 0.10 && gy <= r * 0.22 && Math.abs(gx) < r * 0.38;
        const isCrossVert = Math.abs(gx) <= r * 0.12 && gy >= -r * 0.05 && gy <= r * 0.38;

        if (isCrossHoriz || isCrossVert) {
          if (gy < r * 0.14 && gx > -r * 0.08 && gx < r * 0.08) {
            ctx.fillStyle = '#FEF08A'; // Cross glint
          } else {
            ctx.fillStyle = '#F59E0B'; // Royal gold
          }
        }
        // Gold-Trimmed Pauldron Shoulders (Sides)
        else if (Math.abs(gx) > r * 0.68) {
          ctx.fillStyle = gy < r * 0.15 ? '#FBBF24' : '#B45309'; // Gold pauldron trim
        }
        // Polished Steel Cuirass Plates
        else {
          if (Math.abs(gx) < r * 0.50 && gy < r * 0.08) {
            ctx.fillStyle = '#E2E8F0'; // Breastplate specular highlight
          } else if (Math.abs(gx) > r * 0.60 || gy > r * 0.42) {
            ctx.fillStyle = '#475569'; // Armor shadow
          } else {
            ctx.fillStyle = '#94A3B8'; // Base silver steel
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 3: Gilded Knight Belt & Tassets (+r * 0.60 to +r * 0.75) ──
      else if (gy < r * 0.75) {
        if (isGhost) {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Center Royal Gold Buckle
        if (Math.abs(gx) < r * 0.18) {
          ctx.fillStyle = gy < r * 0.66 ? '#FDE047' : '#D97706';
        } else if (Math.abs(gx) > r * 0.35 && Math.abs(gx) < r * 0.65) {
          ctx.fillStyle = gy < r * 0.68 ? '#CBD5E1' : '#64748B'; // Steel tassets
        } else {
          ctx.fillStyle = '#1E293B'; // Leather belt backing
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 4: Steel Greaves & Armored Sabatons (+r * 0.75 to +r * 1.05) ──
      else {
        if (isGhost) {
          ctx.fillStyle = '#0A0D14';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (gy < r * 0.88) {
          ctx.fillStyle = Math.abs(gx) < r * 0.45 ? '#64748B' : '#334155'; // Chainmail & thigh plates
        } else {
          // Armored Sabaton Boots
          ctx.fillStyle = Math.abs(gx) < r * 0.35 && gy < r * 0.96 ? '#94A3B8' : '#1E293B';
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

let _knightHairImage = null;
let _knightHairImageLoading = false;

export function _getKnightHairImage() {
  if (_knightHairImage && _knightHairImage.complete && _knightHairImage.naturalWidth > 0) {
    return _knightHairImage;
  }
  if (!_knightHairImageLoading && typeof Image !== 'undefined') {
    _knightHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _knightHairImage = img;
      _knightHairImageLoading = false;
    };
    img.onerror = () => {
      if (!img.src.includes('.jpg')) {
        img.src = 'Assets/model/knight/Knight_hair.jpg?v=1';
      } else {
        _knightHairImageLoading = false;
      }
    };
    img.src = 'Assets/model/knight/Knight_hair.png?v=1';
    _knightHairImage = img;
  }
  return _knightHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getKnightHairImage();
}

/**
 * Draws Knight's authentic anime helmet/hair from Assets/model/knight/Knight_hair.jpg (Rule 22 compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawKnightHair(ctx, r, facingLeft = false) {
  const hairImg = _getKnightHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor pixel fidelity

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.knight) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // Knight_hair.png (826x1331). True visible helmet bounding box:
    // Calibrated to seamlessly frame the upper circle with spiky crown crest at -1.35r
    const targetHairWidth = r * 2.40 * wMult;
    const targetHairHeight = r * 2.50 * hMult;
    const drawX = -targetHairWidth / 2 + offX;
    const drawY = -r * 1.35 + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + targetHairWidth / 2, drawY + targetHairHeight / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -targetHairWidth / 2, -targetHairHeight / 2, targetHairWidth, targetHairHeight);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, targetHairWidth, targetHairHeight);
    }
    ctx.restore();
  }
}

/**
 * Standard Knight Skin Renderer with Upright Front POV Transform (Rule 19)
 */
export function drawKnightSkin(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);

  const drawAngle = angle || 0;
  ctx.rotate(drawAngle);

  // Mirror Y-axis vertically so plume stays on top (-Y) and greaves on bottom (+Y) when aiming left
  const facingLeft = Math.abs(drawAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  drawKnightPixelBody(ctx, r, false);
  _drawKnightHair(ctx, r, facingLeft);
  ctx.restore();
}

/**
 * Knight Ghost Model for Dodge / Dash Visuals
 */
export function drawKnightGhostModel(ctx, r) {
  drawKnightPixelBody(ctx, r, true);
}

/**
 * Combat Outline Visualizer
 */
export function drawKnightOutline(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#94A3B8';
  ctx.stroke();
}

/**
 * Legacy Body Draw Wrapper
 */
export function drawKnightBody(ctx, r, angle) {
  ctx.save();
  const drawAngle = angle || 0;
  ctx.rotate(drawAngle);
  const facingLeft = Math.abs(drawAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  drawKnightPixelBody(ctx, r, false);
  _drawKnightHair(ctx, r, facingLeft);
  ctx.restore();
}
