import { state } from '../../core/state.js';

/**
 * Voidmaster (Abyssal Sovereign) Pixel Art Engine (P = 2.0px discrete grid)
 * Upright Front POV, Faceless Minimalist Aesthetic (Rule 19 & 35)
 */
export function drawVoidmasterPixelBody(ctx, r, isGhost = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const minX = Math.floor((-r * 1.15) / P) * P;
  const maxX = Math.ceil((r * 1.15) / P) * P;
  const minY = Math.floor((-r * 1.15) / P) * P;
  const maxY = Math.ceil((r * 1.05) / P) * P;

  // Geometric shape: Circle base with twin void horns extending to -r * 1.12
  function isInsideBody(x, y) {
    // Twin Obsidian Void Horns
    if (y < -r * 0.45) {
      const leftHorn = (x <= -r * 0.15 && x >= -r * 0.75) && (y >= -r * 1.12 + Math.abs(x + r * 0.45) * 1.5);
      const rightHorn = (x >= r * 0.15 && x <= r * 0.75) && (y >= -r * 1.12 + Math.abs(x - r * 0.45) * 1.5);
      if (leftHorn || rightHorn) return true;
    }
    // Main circular cosmic silhouette
    return Math.hypot(x, y) <= r;
  }

  // ── PASS 1: 4-Neighbor Attached Manga Ink Outline Shell ──
  const cOutline = isGhost ? '#080212' : '#0B0418';
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

  // ── PASS 2: Stepped Volumetric Shading by Cosmic Zone ──
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

      // ── ZONE 1: Twin Void Horns & Astral Cowl (-r * 1.15 to -r * 0.18) ──
      if (gy < -r * 0.18) {
        if (isGhost) {
          ctx.fillStyle = gy < -r * 0.65 ? '#2E1065' : '#170536';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Horn Tips Specular Glint
        const isHornTip = gy < -r * 0.85 && (Math.abs(gx + r * 0.45) < r * 0.15 || Math.abs(gx - r * 0.45) < r * 0.15);
        if (isHornTip) {
          ctx.fillStyle = gy < -r * 0.98 ? '#F3E8FF' : '#C084FC';
        }
        // Horn Body
        else if (gy < -r * 0.55 && Math.abs(gx) > r * 0.25) {
          ctx.fillStyle = '#3B0764'; // Deep obsidian-violet horn
        }
        // Astral Cowl / Hood
        else {
          if (gy < -r * 0.40 && Math.abs(gx) < r * 0.35) {
            ctx.fillStyle = '#7E22CE'; // Purple cowl rim
          } else if (Math.abs(gx) < r * 0.55) {
            ctx.fillStyle = '#1A0836'; // Void face shadow
          } else {
            ctx.fillStyle = '#0F0324'; // Outer cowl shadow
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 2: Cosmic Mantle & Singularity Conduit (-r * 0.18 to +r * 0.60) ──
      else if (gy < r * 0.60) {
        if (isGhost) {
          ctx.fillStyle = gy < r * 0.20 ? '#3B0764' : '#1A0836';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Central Singularity Event-Horizon Conduit
        const centerDist = Math.hypot(gx, gy - r * 0.18);
        if (centerDist < r * 0.35) {
          if (centerDist < r * 0.10) {
            ctx.fillStyle = '#FFFFFF'; // Pure white singularity core
          } else if (centerDist < r * 0.20) {
            ctx.fillStyle = '#E879F9'; // Neon violet energy rim
          } else if (centerDist < r * 0.28) {
            ctx.fillStyle = '#9333EA'; // Dark matter swirl
          } else {
            ctx.fillStyle = '#4A044E'; // Event horizon perimeter
          }
        }
        // Cosmic Robe Fabric
        else {
          if (Math.abs(gx) < r * 0.60 && gy < r * 0.25) {
            ctx.fillStyle = '#2E1065'; // Robe highlight
          } else if (Math.abs(gx) > r * 0.75 || gy > r * 0.45) {
            ctx.fillStyle = '#0A0218'; // Deep void shadow
          } else {
            ctx.fillStyle = '#180436'; // Base robe
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 3: Astral Sash / Void Crest (+r * 0.60 to +r * 0.75) ──
      else if (gy < r * 0.75) {
        if (isGhost) {
          ctx.fillStyle = '#170536';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Central Void Star Jewel
        if (Math.abs(gx) < r * 0.18) {
          ctx.fillStyle = gy < r * 0.66 ? '#E879F9' : '#9333EA';
        } else {
          ctx.fillStyle = '#3B0764'; // Gilded purple sash
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE 4: Lower Astral Robes (+r * 0.75 to +r * 1.05) ──
      else {
        if (isGhost) {
          ctx.fillStyle = '#080212';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (gy < r * 0.88) {
          ctx.fillStyle = Math.abs(gx) < r * 0.45 ? '#1E0842' : '#0F0324';
        } else {
          ctx.fillStyle = '#070114'; // Abyssal edge
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Standard Voidmaster Skin Renderer with Upright Front POV Transform (Rule 19)
 */
export function drawVoidmasterSkin(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);

  const drawAngle = angle || 0;
  ctx.rotate(drawAngle);

  // Mirror Y-axis vertically so horns stay on top (-Y) and robes on bottom (+Y) when aiming left
  const facingLeft = Math.abs(drawAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  drawVoidmasterPixelBody(ctx, r, false);
  ctx.restore();
}

/**
 * Voidmaster Ghost Model for Dodge / Afterimage Visuals
 */
export function drawVoidmasterGhostModel(ctx, r) {
  drawVoidmasterPixelBody(ctx, r, true);
}

/**
 * Combat Outline Visualizer
 */
export function drawVoidmasterOutline(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#9333EA';
  ctx.stroke();
}

/**
 * Legacy Body Draw Wrapper
 */
export function drawVoidmasterBody(ctx, r, angle) {
  ctx.save();
  const drawAngle = angle || 0;
  ctx.rotate(drawAngle);
  const facingLeft = Math.abs(drawAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  drawVoidmasterPixelBody(ctx, r, false);
  ctx.restore();
}
