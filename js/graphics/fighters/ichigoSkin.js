import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

export function drawIchigoSkin(ctx, fighter) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();
  const r = fighter.r;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // ── 1. Spiritual Pressure (Reiatsu) Aura ──
  const isVL = fighter.vastoLordeActive;
  const isMask = fighter.hollowMaskActive;
  const auraOpacity = isVL ? 0.85 : (isMask ? 0.65 : 0.25);
  
  if (!isLowQuality) {
    const pulse = 1.0 + Math.sin(now * 0.015) * 0.15;
    const grad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * (isVL ? 2.5 : 1.8) * pulse);
    
    if (isVL) {
      // Vasto Lorde: Dark crimson & black void aura
      grad.addColorStop(0, 'rgba(139, 0, 0, 0.7)');
      grad.addColorStop(0.4, 'rgba(30, 0, 0, 0.6)');
      grad.addColorStop(0.8, 'rgba(15, 10, 10, 0.4)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else if (isMask) {
      // Hollow Mask: Black & red flame-like aura
      grad.addColorStop(0, 'rgba(255, 30, 0, 0.6)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else {
      // Base Bankai: Deep electric blue & black reiatsu
      grad.addColorStop(0, 'rgba(0, 191, 255, 0.45)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    }
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * (isVL ? 2.5 : 1.8) * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 2. Facing / Rotation Setup ──
  const angle = fighter.gunAngle || 0;
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  const isSlashing = fighter.slashSwingTimer > 0;
  let rawSlashProg = 0;
  if (isSlashing) {
    const maxT = fighter.slashSwingMaxTimer || 22;
    rawSlashProg = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));
  }
  
  const isCountdownOrPreview = (typeof state !== 'undefined' && (
    state.gameState === 'countdown' || 
    state.gameState === 'weaponIndex' || 
    state.gameState === 'characterSelect' || 
    state.gameState === 'indexDetail' || 
    state.gameState === 'matchEnd' || 
    state.gameState === 'roundEnd'
  )) || fighter.isDemoFighter || fighter._isWinnerReveal;

  const isShikai = fighter.skin === 'shikai';

  const renderZangetsu = () => {
    const hideWeapon = fighter.hideWeapon || (typeof state !== 'undefined' && state.showSkinOnly);
    if (hideWeapon) return;

    // Sword rotation and extension based on slash state vs countdown stance vs combat stance
    ctx.save();
    if (isSlashing) {
      const swingEase = Math.sin(rawSlashProg * Math.PI);
      const swingAngle = -Math.PI * 0.4 + swingEase * (Math.PI * 1.3);
      ctx.rotate(swingAngle);
    } else if (isCountdownOrPreview) {
      // Countdown / Preview back-slung pose: handle behind head (upper-left), blade tip sweeping down-right
      ctx.rotate(Math.PI / 4);
    } else {
      // Active combat pose: pointing sword forward at the enemy target
      ctx.rotate(-Math.PI / 16);
    }

    if (isShikai && !isVL) {
      // ── Shikai Zangetsu (Accurate Silver Blade + Black Spine + Trailing Ribbons) ──
      const swordStartX = (isSlashing || !isCountdownOrPreview) ? (r * 0.68) : (-r * 0.68);

      ctx.save();
      ctx.translate(swordStartX, 0);
      ctx.scale(0.85, 0.85);

      const handleLen = 32;
      const handleThick = 6.0;
      const hiltX = -handleLen;

      // 1. Draw Trailing White Cloth Ribbons from the Pommel (Dynamic 2-Pass White Cloth Ribbons)
      if (fighter.ribbonStrands && fighter.ribbonStrands.length === 3) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const strandColors = ['#FFFFFF', '#F5F5F5', '#EAEAEA'];
        const strandWidths = [3.6, 3.0, 2.4];

        const pommel = getZangetsuPommelWorldPos(fighter);

        for (let s = 0; s < 3; s++) {
          const strand = fighter.ribbonStrands[s];
          if (!strand || strand.length < 2) continue;

          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Pass 1: Dark Outer Border
          ctx.beginPath();
          ctx.moveTo(strand[0].x, strand[0].y);
          for (let i = 1; i < strand.length - 1; i++) {
            const xc = (strand[i].x + strand[i + 1].x) / 2;
            const yc = (strand[i].y + strand[i + 1].y) / 2;
            ctx.quadraticCurveTo(strand[i].x, strand[i].y, xc, yc);
          }
          ctx.lineTo(strand[strand.length - 1].x, strand[strand.length - 1].y);
          ctx.strokeStyle = '#111111';
          ctx.lineWidth = strandWidths[s] + 1.8;
          ctx.stroke();

          // Pass 2: White Cloth Ribbon Core
          ctx.beginPath();
          ctx.moveTo(strand[0].x, strand[0].y);
          for (let i = 1; i < strand.length - 1; i++) {
            const xc = (strand[i].x + strand[i + 1].x) / 2;
            const yc = (strand[i].y + strand[i + 1].y) / 2;
            ctx.quadraticCurveTo(strand[i].x, strand[i].y, xc, yc);
          }
          ctx.lineTo(strand[strand.length - 1].x, strand[strand.length - 1].y);
          ctx.strokeStyle = strandColors[s];
          ctx.lineWidth = strandWidths[s];
          ctx.stroke();
        }

        // Fabric Pommel Wrap Knot in World Space
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(pommel.x, pommel.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      } else {
        // Fallback: Static 3 Bezier Ribbons for UI preview cards
        ctx.save();

        // Ribbon Strand 3 (Deepest downward loop, weaving behind)
        ctx.fillStyle = '#EAEAEA';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(hiltX - 1, 1);
        ctx.bezierCurveTo(hiltX - 10, 8, hiltX - 12, 20, hiltX - 2, 23);
        ctx.bezierCurveTo(hiltX + 8, 25, hiltX + 18, 18, hiltX + 32, 17);
        ctx.lineTo(hiltX + 30, 14);
        ctx.bezierCurveTo(hiltX + 18, 16, hiltX + 8, 22, hiltX - 2, 20);
        ctx.bezierCurveTo(hiltX - 8, 18, hiltX - 6, 8, hiltX - 1, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ribbon Strand 2 (Middle strand crossing under Strand 1)
        ctx.fillStyle = '#F5F5F5';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(hiltX - 1, 1);
        ctx.bezierCurveTo(hiltX - 6, 5, hiltX - 6, 15, hiltX + 2, 17);
        ctx.bezierCurveTo(hiltX + 12, 19, hiltX + 23, 14, hiltX + 38, 19);
        ctx.lineTo(hiltX + 36, 16);
        ctx.bezierCurveTo(hiltX + 23, 11, hiltX + 12, 16, hiltX + 2, 14);
        ctx.bezierCurveTo(hiltX - 4, 12, hiltX - 4, 4, hiltX, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ribbon Strand 1 (Front strand crossing over middle and waving to top tail)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(hiltX - 1, 1);
        ctx.bezierCurveTo(hiltX - 8, 7, hiltX - 9, 18, hiltX - 1, 20);
        ctx.bezierCurveTo(hiltX + 8, 22, hiltX + 18, 10, hiltX + 32, 11);
        ctx.bezierCurveTo(hiltX + 38, 12, hiltX + 42, 13, hiltX + 45, 11);
        ctx.lineTo(hiltX + 43, 8);
        ctx.bezierCurveTo(hiltX + 40, 10, hiltX + 36, 9, hiltX + 30, 8);
        ctx.bezierCurveTo(hiltX + 18, 7, hiltX + 8, 18, hiltX - 1, 17);
        ctx.bezierCurveTo(hiltX - 6, 16, hiltX - 5, 6, hiltX, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fabric Pommel Wrap Knot
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(hiltX - 1.5, 0, 2.5, 3.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // 2. Draw Handle (white wrapped directly around hilt, NO handguard/collar!)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hiltX, -handleThick / 2, handleLen, handleThick);

      ctx.strokeStyle = '#D8D8D8';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let px = hiltX + 3; px < 0; px += 4) {
        ctx.moveTo(px, -handleThick / 2);
        ctx.lineTo(px + 2, handleThick / 2);
        ctx.moveTo(px + 2, -handleThick / 2);
        ctx.lineTo(px, handleThick / 2);
      }
      ctx.stroke();

      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(hiltX, -handleThick / 2, handleLen, handleThick);

      // Draw hand holding the handle in active fight
      if (!isCountdownOrPreview) {
        ctx.fillStyle = '#FFE0BD';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(hiltX + 16, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 3. Blade Geometry
      const tipX = 120, tipY = -10;
      const cutoutR = 5.5;
      const cutoutCenterX = cutoutR, cutoutCenterY = 3.0;
      const heelX = cutoutR * 2, heelY = 18;

      // A) Black Back Spine Region
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath();
      ctx.moveTo(0, -3.0);
      ctx.lineTo(tipX, tipY);
      ctx.quadraticCurveTo(60, -2, heelX, cutoutCenterY);
      ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
      ctx.lineTo(0, 5.0);
      ctx.lineTo(0, -3.0);
      ctx.closePath();
      ctx.fill();

      // B) Silver Steel Blade Body
      ctx.fillStyle = '#F5F5F5';
      ctx.beginPath();
      ctx.moveTo(heelX, heelY);
      ctx.quadraticCurveTo(65, 15, tipX, tipY);
      ctx.quadraticCurveTo(60, -2, heelX, cutoutCenterY);
      ctx.lineTo(heelX, heelY);
      ctx.closePath();
      ctx.fill();

      // C) Outer Outline
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -3.0);
      ctx.lineTo(tipX, tipY);
      ctx.quadraticCurveTo(65, 15, heelX, heelY);
      ctx.lineTo(heelX, cutoutCenterY);
      ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
      ctx.lineTo(0, 5.0);
      ctx.lineTo(0, -3.0);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    } else {
      // ── Tensa Zangetsu (Bankai daito) ──
      const swordLen = isVL ? 62 : 52;
      const swordStartX = r * 0.7;
      
      // Guard / Tsuba (Manji / cross shape)
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(swordStartX - 2, -7, 4, 14);
      ctx.fillRect(swordStartX - 7, -2, 14, 4);

      // Blade Body (Slender black daito blade)
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(swordStartX, -2);
      ctx.lineTo(swordStartX + swordLen - 8, -1.8);
      ctx.lineTo(swordStartX + swordLen, 0); // Tip
      ctx.lineTo(swordStartX + swordLen - 8, 1.8);
      ctx.lineTo(swordStartX, 2);
      ctx.closePath();
      ctx.fill();

      // Sword outline / edge highlight
      ctx.strokeStyle = isVL ? '#FF1E00' : (isMask ? '#FF5500' : '#00E5FF');
      ctx.lineWidth = isVL || isMask ? 1.5 : 1.0;
      ctx.stroke();

      // Hilt Pommel Red/Black Chain
      ctx.strokeStyle = isVL || isMask ? '#990000' : '#111111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(swordStartX - 2, 0);
      ctx.bezierCurveTo(swordStartX - 10, -5, swordStartX - 15, 5, swordStartX - 22, -2);
      ctx.stroke();
    }

    ctx.restore(); // end sword translate/rotate
  };

  // Render sword BEHIND body during countdown/preview
  if (isCountdownOrPreview) {
    renderZangetsu();
  }

  // ── 4. Main Body Circle Clip ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  if (isVL) {
    // ── Vasto Lorde Form Aesthetics ──
    // Base bone-white skin
    ctx.fillStyle = '#EDEDED';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Chest hollow hole (centered bottom)
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(0, r * 0.5, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Crimson red facial marks (representing hollow lines)
    ctx.fillStyle = '#C00000';
    // Left eye stripe
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.3);
    ctx.lineTo(-r * 0.35, r * 0.1);
    ctx.lineTo(-r * 0.25, r * 0.1);
    ctx.lineTo(-r * 0.35, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Right eye stripe
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.3);
    ctx.lineTo(r * 0.35, r * 0.1);
    ctx.lineTo(r * 0.25, r * 0.1);
    ctx.lineTo(r * 0.35, -r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Wild spiky long orange hair
    ctx.fillStyle = '#E55B00';
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(r, -r);
    // spiky fringe
    ctx.lineTo(r, -r * 0.3);
    ctx.lineTo(r * 0.85, -r * 0.35);
    ctx.lineTo(r * 0.7, -r * 0.45);
    ctx.lineTo(r * 0.55, -r * 0.22);
    ctx.lineTo(r * 0.45, -r * 0.4);
    ctx.lineTo(r * 0.3, -r * 0.3);
    ctx.lineTo(r * 0.2, -r * 0.45);
    ctx.lineTo(r * 0.05, -r * 0.12);
    ctx.lineTo(-r * 0.1, -r * 0.35);
    ctx.lineTo(-r * 0.12, -r * 0.22);
    ctx.lineTo(-r * 0.25, -r * 0.4);
    ctx.lineTo(-r * 0.3, -r * 0.28);
    ctx.lineTo(-r * 0.4, -r * 0.35);
    ctx.lineTo(-r * 0.48, -r * 0.32);
    ctx.lineTo(-r * 0.7, -r * 0.3);
    ctx.lineTo(-r * 0.78, -r * 0.38);
    ctx.lineTo(-r, -r * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.stroke();

  } else {
    // ── Base Bankai & Hollow Mask Aesthetics ──
    // Peach skin base
    ctx.fillStyle = '#FFE0BD';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Orange hair (Standard spiky)
    ctx.fillStyle = '#FF7F00';
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(r, -r);
    // Draw spiky non-uniform crown fringe from right to left:
    ctx.lineTo(r, -r * 0.35);
    ctx.lineTo(r * 0.85, -r * 0.45);
    ctx.lineTo(r * 0.88, -r * 0.35);    // Spike 1 (leans right/outward)
    ctx.lineTo(r * 0.72, -r * 0.48);
    ctx.lineTo(r * 0.62, -r * 0.28);   // Spike 2 (leans right/outward)
    ctx.lineTo(r * 0.5, -r * 0.42);
    ctx.lineTo(r * 0.45, -r * 0.46);
    ctx.lineTo(r * 0.4, -r * 0.35);    // Spike 3 (leans left/inward)
    ctx.lineTo(r * 0.35, -r * 0.48);
    ctx.lineTo(r * 0.2, -r * 0.25);   // Spike 4 (leans left/inward)
    ctx.lineTo(r * 0.15, -r * 0.42);
    ctx.lineTo(r * 0.05, -r * 0.32);   // Spike 5 (center, vertical)
    ctx.lineTo(-r * 0.05, -r * 0.45);
    ctx.lineTo(-r * 0.12, -r * 0.25);  // Spike 6 (leans right/inward)
    ctx.lineTo(-r * 0.25, -r * 0.42);
    ctx.lineTo(-r * 0.32, -r * 0.35); // Spike 7 (leans right/inward)
    ctx.lineTo(-r * 0.45, -r * 0.45);
    ctx.lineTo(-r * 0.52, -r * 0.28);   // Spike 8 (leans right/inward)
    ctx.lineTo(-r * 0.7, -r * 0.42);
    ctx.lineTo(-r * 0.78, -r * 0.35); // Spike 9 (leans right/inward)
    ctx.lineTo(-r, -r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    const isShikai = fighter.skin === 'shikai';

    if (isShikai) {
      // ── Standard Shikai robes: black robes covering from y = 0.1 ──
      ctx.fillStyle = '#111111';
      ctx.fillRect(-r, r * 0.1, r * 2, r * 0.95);

      // White collar inner lining (forming a V-neck)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.lineTo(r * 0.25, r * 0.1);
      ctx.closePath();
      ctx.fill();

      // Wrap collar fold outlines (black robe wrap lines)
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.moveTo(r * 0.25, r * 0.1);
      ctx.lineTo(-r * 0.12, r * 0.49);
      ctx.stroke();

      // Diagonal Red Ribbon/Chain Strap (for holding Zangetsu on his back)
      ctx.save();
      // 1. Dark red shadow backing line
      ctx.strokeStyle = '#700c0f';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(r * 0.25, r * 0.55);
      ctx.stroke();

      // 2. Red core line
      ctx.strokeStyle = '#E31B23';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(r * 0.25, r * 0.55);
      ctx.stroke();

      // 3. Small red beads along the strap
      ctx.fillStyle = '#FF4D52';
      for (let t = 0.05; t <= 0.95; t += 0.16) {
        const px = -r * 0.35 * (1 - t) + (r * 0.25) * t;
        const py = r * 0.1 * (1 - t) + (r * 0.55) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a0002';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // Flat white obi sash wrapped around waist
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-r * 0.75, r * 0.55, r * 1.5, r * 0.15);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-r * 0.75, r * 0.55, r * 1.5, r * 0.15);

      // Central sash tie knot
      ctx.fillStyle = '#EBEBEB';
      ctx.beginPath();
      ctx.roundRect(-r * 0.08, r * 0.53, r * 0.16, r * 0.18, 3);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Hanging sash ribbons (tied tails hanging down)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      // Left ribbon tail
      ctx.moveTo(-r * 0.06, r * 0.68);
      ctx.lineTo(-r * 0.18, r * 0.95);
      ctx.lineTo(-r * 0.02, r * 0.95);
      ctx.lineTo(0, r * 0.68);
      ctx.closePath();
      // Right ribbon tail
      ctx.moveTo(0, r * 0.68);
      ctx.lineTo(r * 0.02, r * 0.95);
      ctx.lineTo(r * 0.18, r * 0.95);
      ctx.lineTo(r * 0.06, r * 0.68);
      ctx.closePath();
      ctx.fill();

      // Outlines for hanging ribbons
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      // Left tail outline
      ctx.moveTo(-r * 0.06, r * 0.68);
      ctx.lineTo(-r * 0.18, r * 0.95);
      ctx.lineTo(-r * 0.02, r * 0.95);
      ctx.lineTo(0, r * 0.68);
      // Right tail outline
      ctx.moveTo(0, r * 0.68);
      ctx.lineTo(r * 0.02, r * 0.95);
      ctx.lineTo(r * 0.18, r * 0.95);
      ctx.lineTo(r * 0.06, r * 0.68);
      ctx.stroke();
    } else {
      // ── Current Bankai robes with deep V-neck and split obi coat ──
      // Shihakusho (Black robe chest area)
      ctx.fillStyle = '#111111';
      ctx.fillRect(-r, r * 0.1, r * 2, r * 0.95);

      // Peach skin insert for the chest exposure inside the V-neck
      ctx.fillStyle = '#FFE0BD';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(0, r * 0.45);
      ctx.lineTo(r * 0.35, r * 0.1);
      ctx.closePath();
      ctx.fill();

      // White collar border trim
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.lineTo(r * 0.32, r * 0.1);
      ctx.stroke();

      // Thin black outlines to frame the white collar border cleanly
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      
      // Outer black line against black robes
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(0, r * 0.45);
      ctx.lineTo(r * 0.35, r * 0.1);
      ctx.stroke();

      // Inner black line against chest skin
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r * 0.1);
      ctx.lineTo(0, r * 0.39);
      ctx.lineTo(r * 0.28, r * 0.1);
      ctx.stroke();

      // ── Shihakusho Coat Split & White Obi Belt ──
      // 1. White sash/belt base inside the inverted V split
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.65);
      ctx.lineTo(-r * 0.28, r);
      ctx.lineTo(r * 0.28, r);
      ctx.closePath();
      ctx.fill();

      // 2. Grey details for obi belt fabric layers
      ctx.strokeStyle = '#D5D5D5';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, r * 0.78);
      ctx.lineTo(r * 0.12, r * 0.78);
      ctx.moveTo(-r * 0.18, r * 0.88);
      ctx.lineTo(r * 0.18, r * 0.88);
      ctx.stroke();

      // 3. Central black sash tie knot detail
      ctx.fillStyle = '#111111';
      ctx.fillRect(-r * 0.04, r * 0.72, r * 0.08, r * 0.28);

      // 4. White outer border lines for the split coat edges
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(r * 0.28, r);
      ctx.stroke();

      // 5. Thin black outline to separate white split edges from black robes cleanly
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(r * 0.28, r);
      ctx.stroke();
    }

    // ── Hollow Mask Overlay ──
    if (isMask) {
      ctx.fillStyle = '#FFFFFF'; // White mask base on left side of face
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.9, -Math.PI * 0.1, false);
      ctx.lineTo(0, r);
      ctx.closePath();
      ctx.fill();

      // Red/Black jagged mask lines
      ctx.strokeStyle = '#B00000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Jagged lines stretching across mask
      ctx.moveTo(-r * 0.4, -r * 0.4);
      ctx.lineTo(-r * 0.1, -r * 0.1);
      ctx.moveTo(-r * 0.6, -r * 0.2);
      ctx.lineTo(-r * 0.2, 0);
      ctx.moveTo(-r * 0.5, 0.1);
      ctx.lineTo(-r * 0.1, r * 0.3);
      ctx.stroke();

      // Hollow yellow eye iris details
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore(); // end main body circle clip

  // ── 5. Vasto Lorde Horns (Drawn on top of outline) ──
  if (isVL) {
    ctx.fillStyle = '#EDEDED';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.95);
    ctx.bezierCurveTo(r * 0.5, -r * 1.5, r * 0.8, -r * 1.2, r * 0.9, -r * 0.7);
    ctx.bezierCurveTo(r * 0.75, -r * 0.9, r * 0.4, -r * 1.1, r * 0.1, -r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left Horn
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.95);
    ctx.bezierCurveTo(-r * 0.5, -r * 1.5, -r * 0.8, -r * 1.2, -r * 0.9, -r * 0.7);
    ctx.bezierCurveTo(-r * 0.75, -r * 0.9, -r * 0.4, -r * 1.1, -r * 0.1, -r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ── 6. Outer Body Stroke ──
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Render sword ON TOP of body circle during active fight
  if (!isCountdownOrPreview) {
    renderZangetsu();
  }

  ctx.restore(); // end translation
}

export function getZangetsuPommelWorldPos(fighter) {
  const r = fighter.r || 25;
  const angle = fighter.gunAngle || 0;
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const isSlashing = fighter.slashSwingTimer > 0;
  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawSlashProg = isSlashing ? Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT))) : 0;

  const isCountdownOrPreview = (typeof state !== 'undefined' && (
    state.gameState === 'countdown' || 
    state.gameState === 'weaponIndex' || 
    state.gameState === 'characterSelect' || 
    state.gameState === 'indexDetail' || 
    state.gameState === 'matchEnd' || 
    state.gameState === 'roundEnd'
  )) || fighter.isDemoFighter || fighter._isWinnerReveal;

  let localSwordAngle = 0;
  if (isSlashing) {
    const swingEase = Math.sin(rawSlashProg * Math.PI);
    localSwordAngle = -Math.PI * 0.4 + swingEase * (Math.PI * 1.3);
  } else if (isCountdownOrPreview) {
    localSwordAngle = Math.PI / 4;
  } else {
    localSwordAngle = -Math.PI / 16;
  }

  const swordStartX = (isSlashing || !isCountdownOrPreview) ? (r * 0.68) : (-r * 0.68);
  const scale = 0.85;
  const localPommelX = swordStartX + (-33.5 * scale);
  const localPommelY = 0;

  // Apply local sword rotation
  const cosS = Math.cos(localSwordAngle);
  const sinS = Math.sin(localSwordAngle);
  let rotX = localPommelX * cosS - localPommelY * sinS;
  let rotY = localPommelX * sinS + localPommelY * cosS;

  // Apply facing flip
  if (facingLeft) {
    rotY = -rotY;
  }

  // Apply fighter body angle
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const worldX = fighter.x + (rotX * cosA - rotY * sinA);
  const worldY = fighter.y + (rotX * sinA + rotY * cosA);

  return { x: worldX, y: worldY };
}

export function updateZangetsuRibbonPhysics(fighter) {
  if (!fighter) return;
  const pommel = getZangetsuPommelWorldPos(fighter);

  if (!fighter.ribbonStrands || fighter.ribbonStrands.length !== 3) {
    fighter.ribbonStrands = [];
    const strandNodeCounts = [7, 6, 5];
    const strandSpreads = [-0.15, 0.0, 0.15];

    for (let s = 0; s < 3; s++) {
      const numNodes = strandNodeCounts[s];
      const nodes = [];
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          x: pommel.x - i * 5,
          y: pommel.y + i * 4 + strandSpreads[s] * 6,
          vx: 0,
          vy: 0
        });
      }
      fighter.ribbonStrands.push(nodes);
    }
  }

  const linkDist = 5.2;

  // Update each strand physics
  for (let s = 0; s < fighter.ribbonStrands.length; s++) {
    const strand = fighter.ribbonStrands[s];
    strand[0].x = pommel.x;
    strand[0].y = pommel.y;

    for (let i = 1; i < strand.length; i++) {
      const node = strand[i];
      const dragX = -(fighter.vx || 0) * 0.06;
      const dragY = -(fighter.vy || 0) * 0.06;
      const wave = Math.sin(Date.now() * 0.007 + i * 0.6 + s * 1.2) * 0.18;

      node.vx = (node.vx + dragX) * 0.84;
      node.vy = (node.vy + dragY + 0.22 + wave) * 0.84;

      node.x += node.vx;
      node.y += node.vy;
    }

    // Constraint relaxation
    for (let iter = 0; iter < 10; iter++) {
      for (let i = 1; i < strand.length; i++) {
        const prev = strand[i - 1];
        const node = strand[i];
        const dx = node.x - prev.x;
        const dy = node.y - prev.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        if (dist !== linkDist) {
          const delta = (dist - linkDist) / dist;
          if (i === 1) {
            node.x -= dx * delta;
            node.y -= dy * delta;
          } else {
            node.x -= dx * delta * 0.5;
            node.y -= dy * delta * 0.5;
            prev.x += dx * delta * 0.5;
            prev.y += dy * delta * 0.5;
          }
        }
      }
    }
  }
}
