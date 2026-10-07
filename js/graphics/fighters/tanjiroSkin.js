// ─────────────────────────────────────────────
// Tanjiro Kamado Fighter Skin & Body Model (Authentic 1:1 Pixel Art Edition)
// Demon Slayer: Kimetsu no Yaiba
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 19.1 (Proportional Vertical Bands & Swept-Back Anime Hair Spikes)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawTanjiroNichirinKatana } from '../weapons/demonSlayerWeaponGraphics.js';

let _tanjiroSkinImage = null;
let _tanjiroSkinImageLoading = false;

// Authentic 1:1 pixel art data URI matching the reference Demon Slayer art (56x56 sprite matrix, R=18)
const _TANJIRO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAIfElEQVR4nO2Y2W8b1xXG89CiITnD2YfLcGa4icNF4iKKqyxSUgyjLRAURZOgQGOnS1CkqCunXqp4SWM7MgzHseVFm2OkL4kNtI8uCsRWDAR9qQMUaB6MxkryPxQtkIcWEL/mHpKGqji2ZUuWU/AABzOcO6O5v3u+c84dPfFEz3rWs571rGc961nP7mF+ToTfIyLgERHyytjs+ayLtT7+A7que0SUpCAOWoM4ZBdhcDKCvHx7fLPnet+2Emq1+0QFx+JbcDw2jIPhIUwYA9Dcwpfu22yGrzSfR4DuEeDjxPaRXIThVeioub3YEUpjOjGCk84IjkTLdB+Tb4AT4eOExxPSFnWCmLQGsdcqYNJsH1+xBzFpFbHHLOBQuIQD9hDBjGoWTjtNnEuNEiCDPRAtY8LOtiPdyVcfL20+6LZt27DTzOJQuIif+pN43u/gZ6E0ng8msSOYxE+MNPbbRfzGHsThSBnf9kWxTY9g2mniVLKBQdXEqU5EWWQToh9+TqL83BPKoTJU2jxIg5MwGcqTv+hL4zt6FHGvCt3jhd8jQHZxJFMWwdfsIRyNVXE8XsdOu4CzCQbUwLAvQvIcVEN4NVbFD3xxWLyMACfhZWMAiovbHMkGOQkBj4SaamNQNmDwMiaMHHYzYLOA3VYeu0M56O52Lg6pJmqajSHdxBvOFpQ0CzU9jLioI+JVUdFsVDUbb6XHMa5F6Lm9dhG/DZdut5fukUV3wwHZCrOVn4rWMJsaw0KyiT1mHnutPPZZBewKDOB8YgSTZo6Ki06QFsqaRTBvDzyFim7TpGOCRterX/xeyIzjULRCz4Q4meT8erRG73k9VsPxaJWiu34gokKTCPISrSqLFJNehJdxxmliLsngRjGkWQhwMoEwZxNkkdsXyuKXwQxUBun2YoseRUWzcDwxjLJuQ3Hz7QjqFiQXT1GcT40j1JFpv+jDFAOL1TEVr+NErEYpsG6ArLy/GilRFZyKlEkyx+I1nHEaOJNsoq7bnVIv0wJkxAD6pSBSgo9aQ9AjY79VwM/9SQR4GWFBI2nuCg6gqJqQ3V5UVBtRrwaFnWs2Lqa34pTTgOGRCJKNH4vXcbyvDlNQ11+etuzDD30JnIwNY7pvC6b7RjqSClNkKx3pDesR7DKy2BfKYbeZo/xkUWQTbygGfh0aoN91PYK6HqaIMSDmJq9AdfP0d95KjeO5UBoGp8DnFlBWLYR4hdTD/E9X/ri+kLlMP4YUE6fjwzgZH8ZEpEgFIyHq6Bd8+JGRxq8iRbxgZRGjiXqph7FKyuRoe1WMaTZeCKQor6p6hKLIpM4kyaAYQNSr4MdmFhdTY9jmi1JqME9KfnxXi+FpXxzfC/QhxEn46G8frS9kQNOREv3IiH6UVJMKQsyr4qVAGkcTdRxO1HC4r4rngklYvAKTUxDhVcS8GlXQomYh4lUIJCsHUdZMWgCWh0XNhM/DpBrGwXiF2kWf4KM8ZJE1eRn74xW8GR/G0WgFh6NlOIIObT1z8ebNm51iI7dXVVBxNtnAeadJEmMTraoWSqpFUWGLwIqK5uIR9aro82rIy0HKNZtXYHsV1HSbYFlBysgBUkVJM6k6m5yEomygztqHbsP0yMh6dbxkZDFhDqAgBuD9xrfWB3C4WkOAl6gH6S4erMHPOU3MO02UVZNyhEGxisjyqKSYqHWuMfnJLh6Si6NtWk5ikw63F4UWoV1x2cLUtDBMr4KXjX4cjZWwwAqZM0L3VahKS7S4Fq9CdnlgCgoq5crDQ/o9EqQneewM9WMylMOCM4oZp0ERq6hmu/lyEk2Qbb00tsl2CxTBKK/S5NkEKToeiSRb1azOhly8nWusALHx7rU4VVwb55wG9daiEkJZMbHbzONE33B7I78ePTHgFilaTI4LqTGcTzZhcvLtncUeM0f5sdMYoB0Ky7tDmSoOpMtUcJhcWS6xb8DuYlheBa0bl9D6yztYvnEJb0QzmAqncMR24He3vzDYArBcHfaFMZNsYDY9iqralv9sqgmDV0kBawbKhOPUs5gkooKGc8kmZhhgqonZ9BiCnEwRGvNFMZto4EJqDHnZoEmxVWXPXfn+s7jyzLMIEZCIz//8NpZvvIvWh5fpuPzhJSx//B6Wb13Fv67/DvNODrNODuecLE7GMngtkqK/w3K+u81bSI9hPj1OmwqW86eTDaTl4NoBmUwOh4dwLFLGbGqUtmEnE3Vq4nFBh9/N/u2gYMYZpe0Xq5zMWUSnK6OYGmxgccd2LG7fjtZff08Qy0uLWL51Da2la1i+tYjlzrF1axHnE1nMMMBk2+eTWSx/9gFUF9/+suBkGB4ZUU7FhdQ4RbGihxHhNZyI19uVVtHXBsrklJcMvBmrUxHpE3QU/DaeyZQwwiLnjKIomxiUQwQc8LQj/vf9E2jduNwG+fQ6Wp+8j+Wl99H6ZLENtNT5vbTY8Wt0z8VkHnPpPOZSeZwKp9D67Dr+8+kHBFiQQ9gTGiCJD4hBzCbHILg4CE96sNPox7FYDVtVm1R334BM27RyvEwviAkq5Q6T5lxqDOeSDRRkAz53O6dYf2tL7zJFi4A6cHTsni9dv33eoqhexcVUFvOpAi6k8phLFjCXzOFsIofW0lVMO1nqdy+aGbxiFxATdJz4YjcluHmILo6+Rig9PO30WLNcV5rfb2C1f3PuF//jdxrv2srrXWPj4tUjd33+TuMPBfKoAe/1/J3GH0vAO9ljCbjWCd3N7leSq31DAVeCPEhEH2Z8wwH/sXXrpgJ237/hgOsJdD9V9JEBrs6bjY7Y6mvd928Y4Moc6J7/8/N/39Nn3nnvS34/z93pfRsGeDfojQB85DAPA7lWwMcGbqU9aJ98ZG1gPexBq+jXAm61fVV0vlYRW6v9X8H0rGc961nPetazzbX/AuOyAZlg/oTqAAAAAElFTkSuQmCC';

export function _getTanjiroSkinImage() {
  if (_tanjiroSkinImage && _tanjiroSkinImage.complete && _tanjiroSkinImage.naturalWidth > 0) {
    return _tanjiroSkinImage;
  }
  if (!_tanjiroSkinImageLoading && typeof Image !== 'undefined') {
    _tanjiroSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _tanjiroSkinImage = img;
      _tanjiroSkinImageLoading = false;
    };
    img.onerror = () => {
      _tanjiroSkinImageLoading = false;
    };
    img.src = _TANJIRO_DATA_URI;
    _tanjiroSkinImage = img;
  }
  return _tanjiroSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getTanjiroSkinImage();
}

/**
 * Main Skin Renderer for Tanjiro Kamado (Authentic 1:1 Pixel Art Edition)
 */
export function drawTanjiroSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

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

  // 2. Animation & Swing States
  const isKatanaSwinging = !isPodiumPreview && !isSuppressed && (fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
  const isPunching = !isPodiumPreview && !isSuppressed && (fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const animPhase = isKatanaSwinging
    ? Math.min(1.0, 1.0 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 16)))
    : (isPunching ? Math.min(1.0, 1.0 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 14))) : 0);

  // 3. LAYER 0: BACK HAND (Behind Body Layer)
  const showBackHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideBackHand;
  if (showBackHand) {
    _drawTanjiroBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  // 4. LAYER 1: MAIN BODY (Authentic 1:1 Pixel Art Head, Haori & Earrings)
  drawTanjiroPixelBody(ctx, r);

  // 5. LAYER 2: FRONT HAND & NICHIRIN KATANA (On Top of Body)
  const showFrontHand = !isPodiumPreview && !Boolean(state.showSkinOnly) && !fighter.hideFrontHand;
  if (showFrontHand) {
    _drawTanjiroFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase);
  }

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Solid 2D Pixel-Art Body for Tanjiro Kamado (Authentic 1:1 Pixel Art Edition)
 */
export function drawTanjiroPixelBody(ctx, r) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const img = _getTanjiroSkinImage();
  if (img && img.complete && img.naturalWidth > 0) {
    // Exact sprite metrics: 56x56 sprite, circle center (28, 28), circle radius in sprite = 18.0
    const scale = r / 18.0;
    const drawW = 56.0 * scale;
    const drawH = 56.0 * scale;
    const drawX = -28.0 * scale;
    const drawY = -28.0 * scale;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    _drawTanjiroProceduralFallback(ctx, r);
  }

  ctx.restore();
}

/**
 * Procedural Fallback Renderer for Tanjiro
 */
function _drawTanjiroProceduralFallback(ctx, r) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
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
      const absGx = Math.abs(gx);

      // 4-neighbor attached boundary test for solid dark manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 1: Face Dome (ny < 0.30)
      if (normY < 0.30) {
        // Demon Slayer Flame Scar on right forehead (bounded away from perimeter)
        const isScar = (gx >= 2 && gx <= 6 && gy >= -6 && gy <= -1);
        if (isScar) {
          ctx.fillStyle = (gx === 4 && (gy === -4 || gy === -3)) ? '#5A0D15' : (gx >= 5 ? '#D92638' : '#8B1824');
          ctx.fillRect(px, py, P, P);
          continue;
        }

        if (normY < -0.40) {
          ctx.fillStyle = '#FFF2E6'; // Upper forehead highlight
        } else if (normY < 0.10) {
          ctx.fillStyle = '#FEE8D6'; // Fair porcelain skin base
        } else {
          ctx.fillStyle = '#FDD3B2'; // Lower chin & neck shadow
        }
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Zone 2: Collar & Upper Torso (0.30 <= normY < 0.68)
      const isWhiteCollar = absGx <= 2 && gy >= 3 && gy <= 6;
      const isInnerBlackV = absGx <= 1 && gy >= 3 && gy <= 4;
      const isGoldButton = gx === 0 && gy === 6;

      if (isInnerBlackV) {
        ctx.fillStyle = '#242834';
      } else if (isWhiteCollar) {
        ctx.fillStyle = '#FFFFFF';
      } else if (isGoldButton) {
        ctx.fillStyle = '#F59E0B';
      } else if (normY >= 0.68 && normY < 0.78) {
        // Zone 3: White Belt & Buckle
        const isBeltBuckle = absGx <= 2;
        ctx.fillStyle = isBeltBuckle ? '#CBD5E1' : '#F1F5F9';
      } else {
        // Checkered Green & Charcoal Haori Pattern
        const tileX = Math.floor((gx + 12) / 4);
        const tileY = Math.floor((gy - 3) / 3);
        const isGreen = ((tileX + tileY) % 2 === 0);
        ctx.fillStyle = isGreen ? '#059669' : '#242834';
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // Hanafuda Earrings
  [-1, 1].forEach(side => {
    const ex = snap(side * 11 * P);
    const ey = snap(3 * P);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ex - 2, ey + snap(2 * P), 4, 6);
    ctx.fillStyle = '#0E0F14';
    ctx.strokeRect(ex - 2, ey + snap(2 * P), 4, 6);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(ex - 1, ey + snap(3 * P), 2, 2);
  });
}

/**
 * Pixel Art Back Hand
 */
function _drawTanjiroBackHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const handSize = getHandSize(5.8);
  const backX = r * 0.65;
  const backY = -r * 0.35;
  drawPixelHand(ctx, backX, backY, handSize, '#FDE2CE', '#18181B');
}

/**
 * Pixel Art Front Hand & Nichirin Katana
 */
function _drawTanjiroFrontHand(ctx, fighter, r, isKatanaSwinging, isPunching, animPhase) {
  const frontX = r * 0.95 + (isKatanaSwinging ? animPhase * 12 : 0);
  const frontY = 0;

  // Draw Nichirin Katana in Hand
  drawTanjiroNichirinKatana(ctx, 0, 0, isKatanaSwinging ? (animPhase - 0.5) * 1.5 : 0, r);

  // Front Pixel Fist
  const handSize = getHandSize(6.2);
  drawPixelHand(ctx, frontX, frontY, handSize, '#FDE2CE', '#18181B');
}
