import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

export function drawGojoWeapon(ctx, fighter) {
    if (fighter.isGrabbedByMahoraga || fighter.isParalyzedByMahoraga || (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideWeapon || fighter._isFaceOff || (typeof state !== 'undefined' && state.gameState === 'faceoff')) {
        return;
    }
    const z = fighter.z || 0;
    ctx.save();
    ctx.translate(fighter.x, fighter.y - z);
    ctx.rotate(fighter.gunAngle);

    const r = fighter.r;
    
    // Draw glowing hands/orbs instead of a gun
    const handRadius = getHandSize(6);
    const handDistance = r + 10;
    const handSpread = 14;

    const transition = fighter.orbTransition !== undefined ? fighter.orbTransition : (fighter.isMeleeMode ? 0 : 1);

    if (fighter.isChannelingPurple) {
        const mergeProgress = fighter.getPurpleChargeProgress(); // 0 to 1
        const is200 = !!(fighter.is200PercentChannel || fighter.purpleUseCount === 1);

        if (is200) {
            // ── 200% HOLLOW PURPLE RITUAL (High Sky Floating Orbs) ──
            const headX = -r * 2.8;

            if (mergeProgress < 0.70) {
                const moveP = mergeProgress / 0.70; // 0.0 -> 1.0
                const easeMove = Math.sin(moveP * Math.PI * 0.5);
                const handSpreadY = r * 2.8;
                const spreadY = handSpreadY * (1 - easeMove);
                const t = Date.now();

                const fadeInP = Math.min(1.0, mergeProgress / 0.22);
                const orbAlpha = Math.sin(fadeInP * Math.PI * 0.5);

                const growP = Math.min(1.0, mergeProgress / 0.35);
                const easeGrow = Math.sin(growP * Math.PI * 0.5);
                const scale = 0.15 + 0.85 * easeGrow;
                const surgeScale = 1.0 + Math.sin(moveP * Math.PI) * 0.15;
                const currentOrbR = handRadius * 2.8 * scale * surgeScale;

                ctx.save();
                ctx.globalAlpha *= orbAlpha;

                // Red Orb (high on right side)
                drawGojoOrb(ctx, headX, spreadY, currentOrbR, t, 'red', 0);
                // Blue Orb (high on left side)
                drawGojoOrb(ctx, headX, -spreadY, currentOrbR, t, 'blue', 0);

                ctx.restore();

                // Electric energy arcs between high floating Red and Blue orbs
                if (moveP > 0.10) {
                    const arcIntensity = Math.min(1.0, (moveP - 0.10) / 0.60) * orbAlpha;
                    const arcCount = 3 + Math.floor(arcIntensity * 3);
                    ctx.save();
                    ctx.lineWidth = 1.2 + arcIntensity * 1.0;
                    ctx.lineCap = 'round';
                    for (let a = 0; a < arcCount; a++) {
                        const seed = a * 3141.59;
                        const alpha = (0.25 + arcIntensity * 0.45 + Math.sin(t * 0.02 + seed) * 0.15) * orbAlpha;
                        ctx.strokeStyle = a % 2 === 0
                            ? `rgba(255, 120, 200, ${alpha})`
                            : `rgba(120, 180, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(headX, spreadY);
                        const midX = headX + Math.sin(t * 0.015 + seed) * 6;
                        const midY = (Math.sin(t * 0.012 + seed * 0.7) * 12) * (a / arcCount - 0.5);
                        ctx.quadraticCurveTo(midX, midY, headX, -spreadY);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            } else {
                // Fused into colossal 200% Purple orb above head
                const t = Date.now();
                const orbX = headX;
                const purpleGrowP = Math.min(1.0, (mergeProgress - 0.70) / 0.12);
                const easePurpleGrow = Math.sin(purpleGrowP * Math.PI * 0.5);
                const baseFusionR = handRadius * 2.8;
                const maxEmpoweredR = handRadius * 4.2;
                const orbR = baseFusionR + (maxEmpoweredR - baseFusionR) * easePurpleGrow;

                // Pulsating energy ring around 200% Purple orb
                ctx.save();
                ctx.translate(orbX, 0);
                ctx.rotate(t * 0.004);
                ctx.strokeStyle = `rgba(200, 100, 255, 0.45)`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, orbR * 1.8 * (1.0 + Math.sin(t * 0.007) * 0.06), 0, Math.PI * 1.5);
                ctx.stroke();
                ctx.restore();

                drawGojoOrb(ctx, orbX, 0, orbR, t, 'purple', 5);
                drawAnamorphicLensFlare(ctx, orbX, 0, 1.0);
                drawAnamorphicLensFlare(ctx, orbX, 0, 0.5, 'red');
            }
        } else {
            // ── 100% HOLLOW PURPLE (Hands-Level Red & Blue Mixing) ──
            const handDistance = r + 10;
            const t = Date.now();

            if (mergeProgress < 0.70) {
                const moveP = mergeProgress / 0.70; // 0.0 -> 1.0
                const easeMove = Math.sin(moveP * Math.PI * 0.5);
                const handSpread = 22 * (1 - easeMove);
                const rightY = handSpread;
                const leftY = -handSpread;

                const fadeInP = Math.min(1.0, mergeProgress / 0.22);
                const orbAlpha = Math.sin(fadeInP * Math.PI * 0.5);
                const redR = handRadius * (1.0 + moveP * 0.4);
                const blueR = handRadius * (1.0 + moveP * 0.4);

                ctx.save();
                ctx.globalAlpha *= orbAlpha;

                // Red Orb on right hand
                drawGojoOrb(ctx, handDistance, rightY, redR, t, 'red', 0);
                // Blue Orb on left hand
                drawGojoOrb(ctx, handDistance, leftY, blueR, t, 'blue', 0);

                ctx.restore();

                // Electric energy arcs between Red & Blue in hands
                if (moveP > 0.15) {
                    const arcIntensity = Math.min(1.0, (moveP - 0.15) / 0.55) * orbAlpha;
                    ctx.save();
                    ctx.lineWidth = 1.0 + arcIntensity * 0.8;
                    ctx.lineCap = 'round';
                    for (let a = 0; a < 3; a++) {
                        const seed = a * 1337.42;
                        const alpha = (0.25 + arcIntensity * 0.45 + Math.sin(t * 0.02 + seed) * 0.15) * orbAlpha;
                        ctx.strokeStyle = a % 2 === 0
                            ? `rgba(255, 120, 200, ${alpha})`
                            : `rgba(120, 180, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(handDistance, rightY);
                        const midX = handDistance + Math.sin(t * 0.015 + seed) * 3;
                        const midY = (Math.sin(t * 0.012 + seed * 0.7) * 8) * (a / 3 - 0.5);
                        ctx.quadraticCurveTo(midX, midY, handDistance, leftY);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            } else {
                // Fused into 100% Purple orb between hands with lens flares
                const purpleGrowP = Math.min(1.0, (mergeProgress - 0.70) / 0.30);
                const pScale = purpleGrowP;
                const orbR = handRadius * 2.6 * (0.8 + 0.2 * pScale);
                drawGojoOrb(ctx, handDistance, 0, orbR, t, 'purple', pScale * 4);
                drawAnamorphicLensFlare(ctx, handDistance, 0, pScale);
            }
        }
    } else {
        // Melee Mode - Hands are drawn with full punch animation in GojoFighter._drawHandCursedEnergy
        // Suppress the Blue Orb during countdown, showoff screen, Reversal Red, Domain Expansion, victory screen, or active Purple travel
        const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
        const isFaceOff = fighter._isFaceOff || (typeof state !== 'undefined' && state.gameState === 'faceoff');
        const recoveryTimer = fighter.purpleRecoveryTimer || 0;
        if ((fighter.redEffectTimer || 0) > 0 || fighter.isChannelingDomainExpansion || fighter.domainActive || fighter._isWinnerReveal || isCountdown || isFaceOff || recoveryTimer > 30) {
            ctx.restore();
            return;
        }

        // Smoothly fade blue orb back in when Purple is about to expire (final 30 frames of recovery)
        const recoveryFade = (recoveryTimer > 0 && recoveryTimer <= 30) ? (1.0 - (recoveryTimer / 30)) : 1.0;

        // Dynamic cooldown manifestation & fade logic:
        // Hide Gojo's blue projectile/orb while on cooldown, and smoothly fade it in as Blue CD is about to be ready
        const currentCd = Math.max(0, (fighter.shootCooldown !== undefined && fighter.shootCooldown !== null) ? fighter.shootCooldown : (fighter.cooldown || 0));
        const maxCd = fighter.shootCooldownMax || fighter.cooldownMax || CONFIG.gojo?.blueCooldown || CONFIG.gojo?.cooldown || 60;
        const readyThreshold = Math.max(22, Math.round(maxCd * 0.55)); // Start smooth manifestation in the last 55% of cooldown (~33 frames before shot)

        let targetAlpha = 0.0;
        if (!fighter.isMeleeMode && transition > 0) {
            if (currentCd <= 0) {
                targetAlpha = 1.0;
            } else if (currentCd <= readyThreshold) {
                // Smooth sine-eased curve from 0.0 to 1.0 as cooldown counts down to 0
                const progress = Math.min(1.0, Math.max(0, (readyThreshold - currentCd) / readyThreshold));
                targetAlpha = Math.sin(progress * Math.PI * 0.5);
            } else {
                targetAlpha = 0.0;
            }
        }

        // Smooth persistent lerp so fade in and fade out are continuous, visible, and buttery smooth
        if (fighter._blueOrbDisplayAlpha === undefined) {
            fighter._blueOrbDisplayAlpha = targetAlpha;
        }
        const fadeSpeed = (targetAlpha > fighter._blueOrbDisplayAlpha) ? 0.10 : 0.22;
        fighter._blueOrbDisplayAlpha += (targetAlpha - fighter._blueOrbDisplayAlpha) * fadeSpeed;
        if (fighter._blueOrbDisplayAlpha < 0.005) {
            fighter._blueOrbDisplayAlpha = 0;
        }

        const effectiveOrbAlpha = transition * recoveryFade * fighter._blueOrbDisplayAlpha;

        // Normal stance - Floating Blue orb in front with intense Bloom & prep charge
        if (effectiveOrbAlpha > 0.005) {
            ctx.save();
            ctx.globalAlpha = effectiveOrbAlpha;
            
            let attackFlash = 0;
            let attackPush = 0;
            let chargeScale = 1.0;
            let chargePull = 0;
            let chargeRings = false;

            if (fighter.shootCooldown > 0 && fighter.shootCooldownMax > 0) {
                const progress = Math.min(1.0, Math.max(0, fighter.shootCooldown / fighter.shootCooldownMax));
                // progress goes from 1.0 down to 0.0
                if (progress > 0.7) {
                    // Just fired! Peak flash & push
                    const p = (progress - 0.7) / 0.3; // 1.0 down to 0.0
                    attackFlash = p * 12; // Orb expands
                    attackPush = p * 15;  // Orb shoots forward slightly
                } else if (progress < 0.4) {
                    // Preparing to shoot! (Charge up phase: 40% down to 0%)
                    const chargeP = (0.4 - progress) / 0.4; // 0.0 up to 1.0
                    chargeScale = 1.0 + Math.sin(chargeP * Math.PI) * 0.4; // Smooth pulse expansion
                    chargePull = Math.sin(chargeP * Math.PI) * -6; // Pulled back toward palm
                    attackFlash = chargeP * 8; // Glowing charge flash
                    chargeRings = true;
                }
            }

            const currentDist = handDistance + 5 + attackPush + chargePull;
            const attackFlashValue = attackFlash > 0 ? attackFlash : 0;
            const scaleGrowth = 0.4 + 0.6 * Math.sin((fighter._blueOrbDisplayAlpha || 0) * Math.PI * 0.5);
            const effectiveRadius = handRadius * Math.sqrt(transition) * chargeScale * scaleGrowth;
            
            // Draw Lapse Blue Orb with firing launch spin
            ctx.save();
            ctx.translate(currentDist, 0);
            const shootSpin = (fighter.shootCooldown > 0) ? (Date.now() * 0.02) : 0;
            ctx.rotate(shootSpin);
            drawLapseBlueOrb(ctx, 0, 0, effectiveRadius, Date.now(), attackFlashValue * transition);
            ctx.restore();

            // Draw preparing suction rings / spatial distortion wisps while charging
            if (chargeRings) {
                const chargeP = Math.max(0, 1 - (fighter.shootCooldown / (fighter.shootCooldownMax * 0.4)));
                ctx.save();
                ctx.translate(currentDist, 0);
                ctx.strokeStyle = '#00F0C0';
                ctx.lineWidth = 1.5;
                
                // Draw 3 imploding suction rings collapsing into the blue orb
                for (let rIdx = 0; rIdx < 3; rIdx++) {
                    const rPhase = (chargeP * 2.5 + rIdx * 0.33) % 1.0;
                    const rRadius = effectiveRadius * (2.8 - rPhase * 1.8);
                    ctx.globalAlpha = (1 - rPhase) * effectiveOrbAlpha * 0.75;
                    ctx.beginPath();
                    ctx.arc(0, 0, Math.max(1, rRadius), 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            ctx.restore();
        }
    }

    ctx.restore();
}

/**
 * Wrapper for backward compatibility.
 */
export function drawLapseBlueOrb(ctx, x, y, r, time, attackFlash = 0) {
    drawGojoOrb(ctx, x, y, r, time, 'blue', attackFlash);
}

/**
 * Draws an authentic, radiant Anime Pixel Art Gojo orb (Blue, Red, or Purple) matching Image 2.
 */
export function drawGojoOrb(ctx, x, y, r, time, colorType = 'blue', attackFlash = 0) {
    // Quantize time to 30 FPS for stepped retro anime feel
    const msPerFrame = 1000 / 30;
    time = Math.floor(time / msPerFrame) * msPerFrame;

    ctx.save();
    ctx.translate(x, y);

    const pulse = Math.sin(time / 130) * 0.08;
    const baseR = r * 1.50 * (1 + pulse) + attackFlash * 0.5;
    const px = Math.max(1.8, Math.min(4.5, baseR / 8.5)); // Snapped pixel unit

    let cDeep, cSaturated, cBright, cTint, cWhite, cAura;

    if (colorType === 'red') {
        cDeep       = '#3b0008'; // Deep burgundy rim
        cSaturated  = '#e60026'; // Rich crimson body
        cBright     = '#ff3860'; // Vibrant scarlet plasma
        cTint       = '#ffc2cc'; // Soft peach-pink tint
        cWhite      = '#ffffff'; // White-hot core
        cAura       = 'rgba(255, 30, 60, 0.28)';
    } else if (colorType === 'purple') {
        cDeep       = '#20003b'; // Deep void violet rim
        cSaturated  = '#8d00e6'; // Rich electric purple body
        cBright     = '#d438ff'; // Vibrant magenta plasma
        cTint       = '#f3c4ff'; // Soft lavender tint
        cWhite      = '#ffffff'; // White-hot core
        cAura       = 'rgba(180, 40, 255, 0.28)';
    } else { // blue
        cDeep       = '#00143b'; // Deep navy rim
        cSaturated  = '#0059e6'; // Rich electric blue body
        cBright     = '#00c8ff'; // Vibrant cyan plasma
        cTint       = '#b3f0ff'; // Soft cyan tint
        cWhite      = '#ffffff'; // White-hot core
        cAura       = 'rgba(0, 180, 255, 0.28)';
    }

    // ── 1. Stepped Atmosphere Pixel Halo (Radiant Outer Glow) ──
    const auraR = baseR * 1.35;
    ctx.fillStyle = cAura;
    for (let a = 0; a < 360; a += 2.0) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * auraR) / px) * px;
        const by = Math.round((Math.sin(rad) * auraR) / px) * px;
        ctx.fillRect(bx, by, px, px);
    }

    // ── 2. Stepped Circular Perimeter Outline (Deep High-Contrast Edge) ──
    ctx.fillStyle = cDeep;
    for (let a = 0; a < 360; a += 0.8) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * baseR) / px) * px;
        const by = Math.round((Math.sin(rad) * baseR) / px) * px;
        ctx.fillRect(bx, by, px, px);
    }

    // ── 3. Multi-Tier Radiant Concentric Plasma Matrix ──
    const maxGrid = Math.ceil(baseR / px) * px;
    for (let gy = -maxGrid; gy <= maxGrid; gy += px) {
        for (let gx = -maxGrid; gx <= maxGrid; gx += px) {
            const dist = Math.sqrt(gx * gx + gy * gy);
            if (dist < baseR - px * 0.5) {
                const ratio = dist / baseR; // 0 (center) to 1 (edge)

                // Multi-tiered radiant color zones
                if (ratio < 0.38) {
                    ctx.fillStyle = cWhite; // Blazing white-hot sun core
                } else if (ratio < 0.56) {
                    ctx.fillStyle = cTint;  // High-luminosity glowing transition
                } else if (ratio < 0.76) {
                    ctx.fillStyle = cBright; // Saturated electric plasma
                } else {
                    ctx.fillStyle = cSaturated; // Rich deep energy rim
                }
                ctx.fillRect(Math.round(gx), Math.round(gy), px, px);
            }
        }
    }

    // ── 4. Dynamic Swirling Pixel Spiral Vortex Arms (2 Inward Swirls) ──
    const swirlSpeed = time * 0.006;
    for (let arm = 0; arm < 2; arm++) {
        const baseAngle = swirlSpeed + arm * Math.PI;
        for (let step = 0; step < 16; step++) {
            const progress = step / 16;
            const swirlR = (baseR * 0.25) + progress * (baseR * 0.60);
            const swirlAngle = baseAngle + progress * 2.2;
            const sx = Math.round((Math.cos(swirlAngle) * swirlR) / px) * px;
            const sy = Math.round((Math.sin(swirlAngle) * swirlR) / px) * px;

            ctx.fillStyle = progress < 0.5 ? cWhite : cTint;
            ctx.fillRect(sx, sy, px, px);
        }
    }

    // ── 5. Instantaneous Stroboscopic Anime Lightning Discharges ──
    // Discrete frame changes every 50ms for authentic electrical snap & crackle
    const flashFrame = Math.floor(time / 50);
    for (let b = 0; b < 6; b++) {
        const hash = Math.sin(flashFrame * 127.1 + b * 311.7) * 43758.5453;
        const rand = hash - Math.floor(hash);

        // Stroboscopic flicker: bolts flash unpredictably on discrete frames
        if (rand > 0.38) {
            const boltAngle = (b / 6) * Math.PI * 2 + (rand - 0.5) * 0.9;
            const startDist = baseR * 0.85;

            let lx = Math.round((Math.cos(boltAngle) * startDist) / px) * px;
            let ly = Math.round((Math.sin(boltAngle) * startDist) / px) * px;

            // Sharp stepped lightning steps (sharp 45°/90° discrete pixel kinks)
            const steps = 3 + Math.floor(rand * 3);
            for (let s = 0; s < steps; s++) {
                const segP = s / steps;
                ctx.fillStyle = segP < 0.4 ? cWhite : (segP < 0.75 ? cTint : cBright);
                ctx.fillRect(lx, ly, px, px);

                const kink = (Math.sin(flashFrame * 7.3 + b * 13.1 + s * 17.7) > 0 ? 1 : -1) * px;
                lx += Math.round((Math.cos(boltAngle) * px * 1.5 + (-Math.sin(boltAngle) * kink)) / px) * px;
                ly += Math.round((Math.sin(boltAngle) * px * 1.5 + (Math.cos(boltAngle) * kink)) / px) * px;
            }
        }
    }

    ctx.restore();
}


/**
 * Draws the Hollow Purple trail effect for Gojo's ultimate - stepped pixel art trail with particles
 */
export function drawPurpleOrbTrail(ctx, p, time) {
    if (!p.history || p.history.length < 2) {
        return;
    }
    
    // Quantize time to 30 FPS for stepped retro anime feel
    const msPerFrame = 1000 / 30;
    time = Math.floor(time / msPerFrame) * msPerFrame;
    
    ctx.save();
    const px = 3.0; // Snapped pixel unit
    
    // Draw stepped pixel trail segments
    for (let i = 1; i < p.history.length; i++) {
        const prev = p.history[i - 1];
        const curr = p.history[i];
        
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.floor(dist / px));
        const trailAlpha = 0.3 + (i / p.history.length) * 0.7;
        
        // Stepped trail blocks
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const sx = Math.round((prev.x + dx * t) / px) * px;
            const sy = Math.round((prev.y + dy * t) / px) * px;
            
            // Outer purple pixel block
            ctx.fillStyle = `rgba(180, 40, 255, ${(trailAlpha * 0.7).toFixed(2)})`;
            ctx.fillRect(sx - px * 1.5, sy - px * 1.5, px * 3, px * 3);
            
            // Inner white-hot pixel core
            ctx.fillStyle = `rgba(255, 255, 255, ${(trailAlpha * 0.9).toFixed(2)})`;
            ctx.fillRect(sx - px * 0.5, sy - px * 0.5, px, px);
        }
        
        // Trailing stepped diamond sparkles (every 2nd history node)
        if (i % 2 === 0) {
            const sAngle = (i * 1.3) + time * 0.005;
            const offset = (Math.sin(sAngle) * 12);
            const sx = Math.round((curr.x + Math.cos(sAngle) * offset) / px) * px;
            const sy = Math.round((curr.y + Math.sin(sAngle) * offset) / px) * px;
            
            ctx.fillStyle = i % 4 === 0 ? '#FFFFFF' : '#df66ff';
            ctx.fillRect(sx - px, sy, px * 3, px);
            ctx.fillRect(sx, sy - px, px, px * 3);
        }
    }
    
    ctx.restore();
}

/**
 * Render a cinematic horizontal anamorphic lens flare beam when Red + Blue merge into Purple.
 * Matches the reference image style (hot white core, cyan-blue horizontal streak lines).
 */
export function drawAnamorphicLensFlare(ctx, x, y, flareP, colorType = 'purple') {
    ctx.save();
    ctx.translate(x, y);
    
    // Smooth S-curve alpha fade-in
    const alpha = Math.sin(flareP * Math.PI * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;

    // 1. Long Horizontal Anamorphic Lens Flare Beam
    const streakLength = 280 * alpha;
    const streakHeight = 4.0;
    
    const beamGrad = ctx.createLinearGradient(-streakLength, 0, streakLength, 0);
    if (colorType === 'red') {
        beamGrad.addColorStop(0, 'rgba(255, 0, 50, 0)');
        beamGrad.addColorStop(0.25, 'rgba(255, 20, 60, 0.7)');
        beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');  // Hot White Core
        beamGrad.addColorStop(0.75, 'rgba(255, 20, 60, 0.7)');
        beamGrad.addColorStop(1, 'rgba(255, 0, 50, 0)');
    } else {
        // Red on left (-X), Blue on right (+X), Purple & White in center!
        beamGrad.addColorStop(0, 'rgba(255, 0, 80, 0)');
        beamGrad.addColorStop(0.2, 'rgba(255, 30, 90, 0.6)');
        beamGrad.addColorStop(0.42, 'rgba(220, 50, 255, 0.9)');  // Vibrant Purple
        beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');  // Hot White Fusion Core
        beamGrad.addColorStop(0.58, 'rgba(180, 70, 255, 0.9)');  // Vibrant Purple
        beamGrad.addColorStop(0.8, 'rgba(0, 170, 255, 0.6)');    // Blue
        beamGrad.addColorStop(1, 'rgba(0, 140, 255, 0)');
    }

    // Draw main horizontal beam line
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-streakLength, -streakHeight * 0.5, streakLength * 2, streakHeight);

    // Secondary wider soft horizontal glow beam
    const softHeight = 16 * alpha;
    const softGrad = ctx.createLinearGradient(-streakLength * 0.7, 0, streakLength * 0.7, 0);
    if (colorType === 'red') {
        softGrad.addColorStop(0, 'rgba(255, 0, 40, 0)');
        softGrad.addColorStop(0.3, 'rgba(255, 20, 50, 0.45)');
        softGrad.addColorStop(0.5, 'rgba(255, 0, 30, 0.7)');
        softGrad.addColorStop(0.7, 'rgba(255, 20, 50, 0.45)');
        softGrad.addColorStop(1, 'rgba(255, 0, 40, 0)');
    } else {
        softGrad.addColorStop(0, 'rgba(255, 0, 60, 0)');
        softGrad.addColorStop(0.25, 'rgba(255, 20, 80, 0.35)');
        softGrad.addColorStop(0.5, 'rgba(180, 0, 255, 0.5)'); // Deep Purple center
        softGrad.addColorStop(0.75, 'rgba(0, 150, 255, 0.35)');
        softGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');
    }

    ctx.fillStyle = softGrad;
    ctx.fillRect(-streakLength * 0.7, -softHeight * 0.5, streakLength * 1.4, softHeight);

    // 2. Bright Central White/Core Star Core
    // ctx.shadowColor = colorType === 'red' ? '#FF0033' : '#D033FF'; // Removed for performance

    const coreR = 8.5 * alpha;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2.5);
    if (colorType === 'red') {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.35, 'rgba(255, 100, 120, 0.95)');
        coreGrad.addColorStop(0.7, 'rgba(220, 0, 40, 0.6)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.35, 'rgba(255, 100, 220, 0.9)');
        coreGrad.addColorStop(0.7, 'rgba(160, 0, 255, 0.5)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
