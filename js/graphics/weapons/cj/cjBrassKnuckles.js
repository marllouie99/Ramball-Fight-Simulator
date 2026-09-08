// ─────────────────────────────────────────────
// CJ Brass Knuckles Graphics
// ─────────────────────────────────────────────

let _brassKnuckleImg = null;
let _brassKnuckleImgLoading = false;

/**
 * Preloads and returns the authentic Brass Knuckle PNG image
 */
export function getBrassKnuckleImage() {
  if (_brassKnuckleImg && _brassKnuckleImg.complete && _brassKnuckleImg.naturalWidth > 0) {
    return _brassKnuckleImg;
  }
  if (!_brassKnuckleImgLoading && typeof Image !== 'undefined') {
    _brassKnuckleImgLoading = true;
    const img = new Image();
    img.onload = () => {
      _brassKnuckleImg = img;
      _brassKnuckleImgLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Brass Knuckle image at Assets/weapon/brassknuckle.png', e);
      _brassKnuckleImgLoading = false;
    };
    img.src = 'Assets/weapon/brassknuckle.png';
    _brassKnuckleImg = img;
  }
  return _brassKnuckleImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getBrassKnuckleImage();
}

/**
 * Draws CJ's vintage cast-brass knuckles overlay on fingers (Zero stretching, 100% natural aspect ratio)
 */
export function drawAuthenticBrassKnucklesShape(ctx, scale = 1.0, opts = {}) {
  const img = getBrassKnuckleImage();
  ctx.save();
  ctx.scale(scale, scale);

  if (img && img.complete && img.naturalWidth > 0) {
    // Preserve 100% natural aspect ratio without any stretching
    const aspect = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : (1065 / 1531);
    const baseH = 26;
    const baseW = baseH * aspect;
    ctx.drawImage(img, -baseW * 0.5, -baseH * 0.5, baseW, baseH);
  } else {
    // Vector fallback while loading
    const brassGrad = ctx.createLinearGradient(-4, -8, 6, 8);
    brassGrad.addColorStop(0, '#F59E0B');
    brassGrad.addColorStop(0.35, '#FEF08A');
    brassGrad.addColorStop(0.70, '#D97706');
    brassGrad.addColorStop(1, '#92400E');

    ctx.fillStyle = brassGrad;
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 0.9;

    const fingerHoles = [
      { x: 3.2 * 0.85, y: -7.2 * 0.85, r: 3.4 },
      { x: 4.9 * 0.85, y: -2.3 * 0.85, r: 3.6 },
      { x: 4.9 * 0.85, y:  2.3 * 0.85, r: 3.6 },
      { x: 3.2 * 0.85, y:  7.2 * 0.85, r: 3.4 },
    ];

    ctx.beginPath();
    ctx.roundRect(-5, -10, 12, 20, 3.0);
    ctx.fill();
    ctx.stroke();

    fingerHoles.forEach((h) => {
      ctx.beginPath();
      ctx.arc(h.x + 2.5, h.y, 2.0, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = '#3E2114';
    fingerHoles.forEach(h => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }

  ctx.restore();
}

/**
 * Standalone Brass Knuckles renderer for Weapon Studio / UI screens
 */
export function drawCjBrassKnuckles(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.75);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.85;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  ctx.translate(posX, posY);
  ctx.rotate(angle);
  drawAuthenticBrassKnucklesShape(ctx, scale, opts);
  ctx.restore();
}
