// ─────────────────────────────────────────────
// TACTICAL FORCE — DESERT EAGLE WEAPON GRAPHICS (.50 AE)
// Authentic Magnum Research Desert Eagle .50 AE silhouette:
// Monolithic fluted barrel, integrated top/bottom rails, cocked spur hammer,
// smooth beavertail, ergonomic wrap-around grip, and animated slide blowback
// ─────────────────────────────────────────────

export function drawDesertEagleWeapon(ctx, x, y, gunAngle, r, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const isPreview = options.isPreview || false;
  const themeColor = options.themeColor || '#f59e0b';

  ctx.save();
  if (isPreview) {
    ctx.translate(x, y);
    ctx.rotate(gunAngle);
  }

  const isReloading = options.isReloading || false;
  const reloadProgress = options.reloadProgress || 0;

  let reloadTilt = 0;
  let reloadOffset = 0;

  if (isReloading) {
    const tiltSine = Math.sin(reloadProgress * Math.PI);
    reloadTilt = -tiltSine * 0.26; // Tilts gun up into workspace
    reloadOffset = -tiltSine * 4.5;
    ctx.rotate(reloadTilt);
  }

  // Recoil & Muzzle Flip
  const recoilX = -recoil * 5.0 + reloadOffset;
  const recoilRot = -recoil * 0.20; // Punchy .50 AE muzzle flip
  ctx.rotate(recoilRot);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const totalScale = 1.05 * sizeRatio * (options.scale || 1.0);
  ctx.scale(totalScale, totalScale);

  const slideBlowback = -recoil * 5.0;
  let slideLockBack = slideBlowback;
  if (isReloading) {
    if (reloadProgress < 0.72) {
      slideLockBack = -6.5; // Locked back open
    } else {
      const slapProgress = (reloadProgress - 0.72) / 0.28;
      slideLockBack = -Math.max(0, 6.5 * (1 - Math.min(1.0, slapProgress * 4.0))); // Snaps forward into battery!
    }
  }

  const originX = (r * 0.40 + recoilX) / totalScale;
  const originY = 0;

  // ─────────────────────────────────────────────
  // 1. LOWER RECEIVER FRAME & ERGONOMIC GRIP
  // ─────────────────────────────────────────────

  // Grip Body (Single unified ergonomic polygon)
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(originX - 4, -1);          // Top rear tang / under beavertail
  ctx.lineTo(originX - 10, 0);          // Beavertail spur rear
  ctx.quadraticCurveTo(originX - 7, 3, originX - 5, 5); // Beavertail underside
  ctx.lineTo(originX - 10, 20);         // Rear backstrap curve
  ctx.lineTo(originX - 9, 23);          // Heel
  ctx.lineTo(originX + 1, 23);          // Baseplate bottom
  ctx.lineTo(originX + 3, 21);          // Front toe
  ctx.lineTo(originX + 4, 7);           // Front strap
  ctx.lineTo(originX + 13, 7);          // Trigger guard bottom
  ctx.lineTo(originX + 14, 4);          // Trigger guard front corner
  ctx.lineTo(originX + 14, 0);          // Trigger guard front junction
  ctx.lineTo(originX + 31, 0);          // Dust cover lower front
  ctx.lineTo(originX + 33, -3);         // Frame front bevel
  ctx.lineTo(originX + 33, -5);         // Frame front top
  ctx.lineTo(originX - 4, -5);          // Frame top rail junction
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rubberized Grip Panel Overlay (Textured side panel)
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(originX - 3, 4);
  ctx.lineTo(originX - 8, 19);
  ctx.lineTo(originX - 1, 20);
  ctx.lineTo(originX + 1, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Grip Medallion Silhouette & Screws
  ctx.fillStyle = '#1f2937';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(originX - 4, 12, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.arc(originX - 4, 12, 1.0, 0, Math.PI * 2);
  ctx.arc(originX - 6, 17, 0.7, 0, Math.PI * 2);
  ctx.arc(originX - 1, 6.5, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Dropping / Inserting Magazine (Tactical Speed Reload with witness holes)
  if (isReloading && reloadProgress >= 0.18 && reloadProgress <= 0.78) {
    const insertT = Math.min(1.0, (reloadProgress - 0.18) / 0.48); // 0 to 1
    const magSlideY = (1.0 - insertT) * 18;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.roundRect(originX - 7, 8 + magSlideY, 8, 14, 1.2);
    ctx.fill();
    ctx.stroke();

    // Steel witness holes (.50 AE rounds visible)
    ctx.fillStyle = '#f59e0b';
    for (let w = 11; w <= 19; w += 3.5) {
      ctx.beginPath();
      ctx.arc(originX - 3, w + magSlideY, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy baseplate bumper
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(originX - 8.5, 22 + magSlideY, 11, 3.0);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(originX - 8.5, 22 + magSlideY, 11, 3.0);
    ctx.restore();
  }

  // Trigger Guard Aperture Cutout & Trigger
  ctx.fillStyle = '#050811';
  ctx.beginPath();
  ctx.moveTo(originX + 2, 0);
  ctx.lineTo(originX + 1, 6);
  ctx.lineTo(originX + 11, 6);
  ctx.lineTo(originX + 12, 0);
  ctx.closePath();
  ctx.fill();

  // Curved Steel Trigger
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX + 4, 1);
  ctx.quadraticCurveTo(originX + 7, 3.5, originX + 4.5, 5.5);
  ctx.stroke();

  // Under-Barrel Picatinny Accessory Rail Notches
  ctx.fillStyle = themeColor;
  for (let rIdx = 0; rIdx < 5; rIdx++) {
    ctx.fillRect(originX + 16 + rIdx * 3.0, 0, 1.2, 1.4);
  }

  // ─────────────────────────────────────────────
  // 2. FIXED BARREL & EJECTION PORT CHAMBER
  // ─────────────────────────────────────────────
  // Fixed Massive Polygonal Barrel
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX + 11, -9);         // Barrel top rear
  ctx.lineTo(originX + 34, -9);         // Barrel top front
  ctx.lineTo(originX + 36, -6);         // Muzzle upper chamfer
  ctx.lineTo(originX + 36, -3);         // Muzzle face
  ctx.lineTo(originX + 33, -3);         // Muzzle bottom step
  ctx.lineTo(originX + 11, -3);         // Barrel lower junction
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Longitudinal Barrel Side Chamfer Flat
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(originX + 13, -7.5, 19, 3.0);

  // Top Integrated Picatinny Rail Slots on Barrel
  ctx.fillStyle = themeColor;
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    ctx.fillRect(originX + 14 + sIdx * 3.2, -9.8, 1.2, 1.0);
  }

  // Exposed Fixed Chrome Chamber & .50 AE Brass Case (Visible when slide blows back)
  if (Math.abs(slideLockBack) > 1.0) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(originX + 6, -8, 6, 4.5);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(originX + 7.5, -5.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─────────────────────────────────────────────
  // 3. MAGNUM REAR SLIDE ASSEMBLY (Blows back on recoil)
  // ─────────────────────────────────────────────
  const slideX = originX + slideLockBack;

  // Rear Slide Body
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(slideX - 8, -9);          // Slide top rear
  ctx.lineTo(slideX + 11, -9);         // Slide top front (at chamber)
  ctx.lineTo(slideX + 11, -3);         // Chamber front vertical
  ctx.lineTo(slideX - 4, -3);          // Slide bottom rail
  ctx.lineTo(slideX - 8, -1);          // Slide rear lower
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear Slide Angled Cocking Serrations
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.0;
  for (let c = 0; c < 4; c++) {
    ctx.beginPath();
    ctx.moveTo(slideX - 5 + c * 2.0, -8.5);
    ctx.lineTo(slideX - 6.5 + c * 2.0, -3.5);
    ctx.stroke();
  }

  // Cocked Combat Spur Hammer (At rear of slide)
  ctx.save();
  ctx.translate(slideX - 7, -3.5);
  ctx.rotate(-0.4 + (recoil > 0.1 ? -0.3 : 0));
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.rect(-1.2, -3.5, 2.4, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Ambidextrous Safety Selector Teardrop Lever
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(slideX - 2, -6, 2.0, 1.2, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Red Fire Indicator Dot
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(slideX - 3.5, -4.8, 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Front Blade Sight Post (On fixed barrel tip)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(originX + 32, -9);
  ctx.lineTo(originX + 33.5, -11.5);
  ctx.lineTo(originX + 35, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear Combat Notch Sight (On rear of slide)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.9;
  ctx.fillRect(slideX - 8, -11, 2.8, 2.2);
  ctx.strokeRect(slideX - 8, -11, 2.8, 2.2);

  // ─────────────────────────────────────────────
  // 5. MUZZLE FLASH
  // ─────────────────────────────────────────────
  if (isFiring) {
    drawTacticalPistolMuzzleFlash(ctx, originX + 37, -4.5, 1.15, themeColor);
  }

  // ─────────────────────────────────────────────
  // 6. TACTICAL TWO-HANDED COMBAT GRIP (Rule 20)
  // ─────────────────────────────────────────────
  if (options.showHands && !options.hideFrontHand) {
    const handRadius = 7.5;
    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.8;

    // A. Primary Trigger Grip Hand (Locked on upper/mid grip tang)
    const trigX = originX - 1.5;
    const trigY = 11.5;
    ctx.beginPath();
    ctx.arc(trigX, trigY, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // B. Secondary Support Hand (Two-Handed Combat Wrap & Dynamic Speed Reload)
    let suppX = originX + 2.5;
    let suppY = 13.5;

    if (isReloading) {
      if (reloadProgress < 0.20) {
        // Drop down to belt mag pouch
        const p1 = reloadProgress / 0.20;
        suppX = originX - 6 + p1 * 2;
        suppY = 13.5 + p1 * 14;
      } else if (reloadProgress < 0.68) {
        // Guiding and plunging fresh mag up into magwell
        const p2 = (reloadProgress - 0.20) / 0.48;
        suppX = originX - 3 + p2 * 2;
        const magSlideY = (1.0 - p2) * 18;
        suppY = 18 + magSlideY * 0.7;
      } else if (reloadProgress < 0.82) {
        // Slapping basepad firmly into magwell
        suppX = originX - 1;
        suppY = 16.5;
      } else {
        // Recovering back to two-handed combat stance
        const p4 = (reloadProgress - 0.82) / 0.18;
        suppX = (originX - 1) + p4 * 3.5;
        suppY = 16.5 - p4 * 3.0;
      }
    }

    ctx.beginPath();
    ctx.arc(suppX, suppY, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawTacticalPistolMuzzleFlash(ctx, x, y, scale = 1.1, themeColor = '#f59e0b') {
  ctx.save();
  ctx.translate(x, y);

  // White-hot plasma core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 3.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Forward blast cone
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.moveTo(0, -4.5 * scale);
  ctx.lineTo(12 * scale, 0);
  ctx.lineTo(0, 4.5 * scale);
  ctx.closePath();
  ctx.fill();

  // Top & bottom angled muzzle vent flares
  ctx.fillStyle = themeColor;
  ctx.globalAlpha = 0.90;
  ctx.beginPath();
  ctx.moveTo(1 * scale, -7 * scale);
  ctx.lineTo(6 * scale, -2 * scale);
  ctx.lineTo(2 * scale, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(1 * scale, 7 * scale);
  ctx.lineTo(6 * scale, 2 * scale);
  ctx.lineTo(2 * scale, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export const drawTacticalPistolWeapon = drawDesertEagleWeapon;
