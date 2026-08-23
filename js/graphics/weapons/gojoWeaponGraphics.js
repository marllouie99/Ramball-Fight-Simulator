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
            // 200% Hollow Purple Custom Animation Sequence:
            // 1. Red & Blue float high near top boundary of Limitless Infinity (-r * 2.8) with wide gap (r * 2.8)
            const headX = -r * 2.8;

            if (mergeProgress < 0.70) {
                // Red & Blue float high with wide gap and move inward toward center above head
                const moveP = mergeProgress / 0.70; // 0.0 -> 1.0
                const easeMove = Math.sin(moveP * Math.PI * 0.5);
                const handSpreadY = r * 2.8;
                const spreadY = handSpreadY * (1 - easeMove);
                const t = Date.now();

                // Smooth fade-in (0.0 -> 0.22 of mergeProgress)
                const fadeInP = Math.min(1.0, mergeProgress / 0.22);
                const orbAlpha = Math.sin(fadeInP * Math.PI * 0.5);

                // Smooth size transition from small concentrated energy spark to full-sized massive orb (0.0 -> 0.35)
                const growP = Math.min(1.0, mergeProgress / 0.35);
                const easeGrow = Math.sin(growP * Math.PI * 0.5);
                const scale = 0.15 + 0.85 * easeGrow;
                const surgeScale = 1.0 + Math.sin(moveP * Math.PI) * 0.15;
                const currentOrbR = handRadius * 2.8 * scale * surgeScale;

                ctx.save();
                ctx.globalAlpha *= orbAlpha;

                // Red Orb (floating high above right side - scaled up smoothly)
                drawGojoOrb(ctx, headX, spreadY, currentOrbR, t, 'red', 0);
                // Blue Orb (floating high above left side - scaled up smoothly)
                drawGojoOrb(ctx, headX, -spreadY, currentOrbR, t, 'blue', 0);

                ctx.restore();

                // Electric energy arcs between Red and Blue orbs (intensify smoothly as they approach)
                if (moveP > 0.10) {
                    const arcIntensity = Math.min(1.0, (moveP - 0.10) / 0.60) * orbAlpha;
                    const arcCount = 3 + Math.floor(arcIntensity * 3);
                    ctx.save();
                    ctx.lineWidth = 1.2 + arcIntensity * 1.0;
                    ctx.lineCap = 'round';
                    for (let a = 0; a < arcCount; a++) {
                        const seed = a * 3141.59;
                        const alpha = (0.25 + arcIntensity * 0.45 + Math.sin(t * 0.02 + seed) * 0.15) * orbAlpha;
                        // Alternate red-purple and blue-purple arcs
                        ctx.strokeStyle = a % 2 === 0
                            ? `rgba(255, 120, 200, ${alpha})`
                            : `rgba(120, 180, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(headX, spreadY);
                        // Jagged midpoint with jitter
                        const midX = headX + Math.sin(t * 0.015 + seed) * 6;
                        const midY = (Math.sin(t * 0.012 + seed * 0.7) * 12) * (a / arcCount - 0.5);
                        ctx.quadraticCurveTo(midX, midY, headX, -spreadY);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            } else {
                // Fused into massive 200% Purple orb above head — stays suspended high above head!
                const t = Date.now();
                const orbX = headX; // Stays locked high above head at headX (-r * 2.8)!
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
                // Second smaller vertical flare for cross-flare effect
                drawAnamorphicLensFlare(ctx, orbX, 0, 0.5, 'red');
            }
        } else {
            // Standard 100% Purple Animation
            const rightY = handSpread * (1 - mergeProgress);
            const leftY = -handSpread * (1 - mergeProgress);

            // Red Orb
            const redR = handRadius * (1 + mergeProgress * 0.5);
            drawGojoOrb(ctx, handDistance, rightY, redR, Date.now(), 'red', 0);

            // Blue Orb
            const blueR = handRadius * (1 + mergeProgress * 0.5);
            drawGojoOrb(ctx, handDistance, leftY, blueR, Date.now(), 'blue', 0);

            if (mergeProgress > 0.5) {
                const flareP = (mergeProgress - 0.5) / 0.5;
                if (mergeProgress > 0.75) {
                    const pScale = (mergeProgress - 0.75) / 0.25;
                    drawGojoOrb(ctx, handDistance, 0, handRadius * 2.5 * pScale, Date.now(), 'purple', pScale * 5);
                }
                drawAnamorphicLensFlare(ctx, handDistance, 0, flareP);
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

        // Normal stance - Floating Blue orb in front with intense Bloom & prep charge
        if (transition > 0) {
            ctx.save();
            ctx.globalAlpha = transition * recoveryFade;
            
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
            const effectiveRadius = handRadius * Math.sqrt(transition) * chargeScale;
            
            // Draw Lapse Blue Orb
            drawLapseBlueOrb(ctx, currentDist, 0, effectiveRadius, Date.now(), attackFlashValue * transition);

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
                    ctx.globalAlpha = (1 - rPhase) * transition * 0.75;
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
 * Draws an advanced, highly detailed Gojo orb (Blue, Red, or Purple).
 */
export function drawGojoOrb(ctx, x, y, r, time, colorType = 'blue', attackFlash = 0) {
    // Performance check for low-quality mode
    const isLowQuality = (typeof state !== 'undefined' && 
                          (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 45)) &&
                          state.gameState !== 'matchEnd' && state.gameState !== 'roundEnd');

    // Quantize time to 30 FPS to give the animation a stepped, stylized anime feel
    const msPerFrame = 1000 / 30;
    time = Math.floor(time / msPerFrame) * msPerFrame;

    ctx.save();
    ctx.translate(x, y);

    const pulse = Math.sin(time / 150) * 0.1;
    const baseR = r * (1 + pulse) + attackFlash * 0.5;

    let aura0, aura1, aura2;
    let ring1, ring2;
    let spark;
    let coreBase;
    let plasma1, plasma2;
    let overlay;

    if (colorType === 'red') {
        aura0 = [255, 30, 30];
        aura1 = [200, 10, 10];
        aura2 = [100, 0, 0];
        ring1 = [255, 50, 50];
        ring2 = [255, 100, 100];
        spark = [255, 150, 150];
        coreBase = 'rgba(20, 0, 0, 1)'; // Nearly pitch black red for high contrast
        plasma1 = [255, 100, 100];
        plasma2 = [255, 200, 200];
        overlay = [255, 150, 150];
    } else if (colorType === 'purple') {
        aura0 = [180, 0, 255];
        aura1 = [130, 0, 240];
        aura2 = [60, 0, 140];
        ring1 = [200, 80, 255];
        ring2 = [220, 140, 255];
        spark = [240, 180, 255];
        coreBase = 'rgba(15, 0, 30, 0.40)'; // Semi-transparent void core so trapped enemies remain visible inside!
        plasma1 = [210, 120, 255];
        plasma2 = [255, 220, 255];
        overlay = [225, 170, 255];
    } else { // blue
        aura0 = [0, 100, 255];
        aura1 = [0, 50, 255];
        aura2 = [0, 20, 200];
        ring1 = [20, 100, 255];
        ring2 = [100, 150, 255];
        spark = [100, 200, 255];
        coreBase = 'rgba(0, 10, 40, 0.40)'; // Semi-transparent blue core so sucked enemies remain visible!
        plasma1 = [100, 180, 255];
        plasma2 = [255, 255, 255];
        overlay = [150, 220, 255];
    }

    // 1. Massive Aura
    const auraOpacity = 0.8 + attackFlash * 0.2;
    if (isLowQuality) {
        ctx.fillStyle = `rgba(${aura1.join(',')}, ${auraOpacity * 0.35})`;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 4.5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const glow = ctx.createRadialGradient(0, 0, baseR * 0.2, 0, 0, baseR * 6);
        glow.addColorStop(0, `rgba(${aura0.join(',')}, ${auraOpacity})`);
        glow.addColorStop(0.2, `rgba(${aura1.join(',')}, ${auraOpacity * 0.75})`);
        glow.addColorStop(0.5, `rgba(${aura2.join(',')}, ${auraOpacity * 0.25})`);
        glow.addColorStop(1, `rgba(${aura2.join(',')}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. Soft, cloudy aura rings
    ctx.save();
    ctx.lineCap = 'round';
    const ringCount = isLowQuality ? 2 : 4;
    for (let i = 0; i < ringCount; i++) {
        ctx.rotate(time / (200 + i * 50));
        const ringR = baseR * (1.5 + i * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * (1.5 + i * 0.1));
        
        ctx.lineWidth = Math.max(0.75, baseR * (0.35 - i * 0.05));
        ctx.strokeStyle = `rgba(${ring1.join(',')}, ${0.4 - i * 0.08})`;
        ctx.stroke();
        
        ctx.lineWidth = Math.max(0.5, baseR * (0.18 - i * 0.02));
        ctx.strokeStyle = `rgba(${ring2.join(',')}, ${0.2 - i * 0.04})`;
        ctx.stroke();
    }
    ctx.restore();

    // 3. Small particle sparks
    ctx.save();
    const sparkCount = isLowQuality ? 4 : 15;
    for (let i = 0; i < sparkCount; i++) {
        const seed = i * 1337.7331;
        const angle = time / (80 + (seed % 100)) + seed;
        const dist = baseR * (1.2 + (seed % 10) / 5);
        
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        const sparkR = baseR * (0.05 + (seed % 5) / 20);
        
        ctx.beginPath();
        ctx.arc(px, py, sparkR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${spark.join(',')}, 0.4)`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(px, py, sparkR, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }
    ctx.restore();

    // 4. Boiling Plasma Core Texture (5 loops with clipping for sharp high-detail containment)
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = coreBase;
    ctx.fill();

    if (!isLowQuality) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.4, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.globalCompositeOperation = 'lighter';
        
        for (let i = 0; i < 5; i++) {
            const seed = i * 999.99;
            
            const angle = time / (200 + (seed % 100)) + seed;
            const dist = baseR * ((seed % 10) / 7); 
            
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            const blobR = baseR * (0.4 + (seed % 5) / 10 + Math.sin(time / 150 + seed) * 0.2);
            
            const blobGlow = ctx.createRadialGradient(px, py, 0, px, py, blobR);
            blobGlow.addColorStop(0, `rgba(${plasma2.join(',')}, ${0.5 + (seed % 4) / 10})`);
            blobGlow.addColorStop(0.4, `rgba(${plasma1.join(',')}, ${0.3 + (seed % 4) / 10})`);
            blobGlow.addColorStop(1, `rgba(${plasma1.join(',')}, 0)`);
            
            ctx.beginPath();
            ctx.arc(px, py, blobR, 0, Math.PI * 2);
            ctx.fillStyle = blobGlow;
            ctx.fill();
        }
        ctx.restore();
    }
    
    // Overlay a final soft white glow
    if (isLowQuality) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.3, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.stroke();
    } else {
        const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 1.6);
        centerGlow.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); 
        centerGlow.addColorStop(0.4, 'rgba(255, 255, 255, 0.85)'); // Extended white core for higher contrast and pop at small scale
        centerGlow.addColorStop(0.65, `rgba(${overlay.join(',')}, 0.35)`); 
        centerGlow.addColorStop(1, `rgba(${aura0.join(',')}, 0)`);
        
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.6, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1.0, baseR * 0.22); // Dynamic line width instead of hardcoded 3px
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; // Brighter stroke outline
        ctx.fill();
        ctx.stroke();
    }
    
    // Final Bloom Shine Effect (Fast, no shadowBlur)
    if (isLowQuality) {
        ctx.fillStyle = `rgba(${overlay.join(',')}, 0.18)`;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 2.2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.globalCompositeOperation = 'lighter';
        const bloom = ctx.createRadialGradient(0, 0, baseR * 0.5, 0, 0, baseR * 3.5);
        bloom.addColorStop(0, `rgba(${overlay.join(',')}, 0.6)`);
        bloom.addColorStop(0.4, `rgba(${aura1.join(',')}, 0.25)`);
        bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}


/**
 * Draws the Hollow Purple trail effect for Gojo's ultimate - swirling vortex with red/blue/purple particles
 * @param {Object} ctx - Canvas context
 * @param {Object} p - Projectile object with x, y, history
 * @param {number} time - Current time in ms
 */
export function drawPurpleOrbTrail(ctx, p, time) {
    // Only draw trail if we have history
    if (!p.history || p.history.length < 2) {
        return;
    }
    
    // Quantize time to 30 FPS to give the animation a stepped, stylized anime feel
    const msPerFrame = 1000 / 30;
    time = Math.floor(time / msPerFrame) * msPerFrame;
    
    // Performance: check if we should run in optimized low-quality mode (e.g. FPS < 52 or performance mode active)
    const isLowQuality = (typeof state !== 'undefined' && 
                          (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 45)) &&
                          state.gameState !== 'matchEnd' && state.gameState !== 'roundEnd');
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw trail as a glowing line with particles
    for (let i = 1; i < p.history.length; i++) {
        // Optimize: Draw only alternate trail segments in low quality mode to save CPU draw calls
        if (isLowQuality && i % 2 === 0) continue;
        
        const prev = p.history[i - 1];
        const curr = p.history[i];
        
        // Calculate trail segment properties
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        // Trail opacity based on position in history (older = more transparent)
        const trailAlpha = 0.5 + (i / p.history.length) * 0.5; // Much brighter trail
        
        // Draw main trail line with glow
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(180, 50, 255, ${trailAlpha})`;
        ctx.lineWidth = 12 + (i / p.history.length) * 18; // Much thicker trail
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Inner bright line
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(255, 220, 255, ${trailAlpha})`;
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Draw swirling particles along the trail
        // OPTIMIZATION: Only draw particles on every 4th segment in low quality (every 3rd in high quality)
        const modCheck = isLowQuality ? 4 : 3;
        if (i % modCheck === 0) {
            const particleCount = isLowQuality ? 1 : (2 + Math.floor(distance / 25));
            for (let j = 0; j < particleCount; j++) {
                const t = j / particleCount;
                const px = prev.x + dx * t;
                const py = prev.y + dy * t;
                
                // Swirl offset
                const swirl = Math.sin(time * 0.003 + i * 0.5 + j) * 15;
                const px2 = px + Math.cos(angle + Math.PI/2) * swirl;
                const py2 = py + Math.sin(angle + Math.PI/2) * swirl;
                
                if (isLowQuality) {
                    // Single flat fill particle to avoid concentric fills
                    ctx.beginPath();
                    ctx.arc(px2, py2, 7, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(220, 180, 255, ${trailAlpha * 0.8})`;
                    ctx.fill();
                } else {
                    // Outer glow
                    ctx.beginPath();
                    ctx.arc(px2, py2, 12, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(180, 50, 255, ${trailAlpha * 0.7})`;
                    ctx.fill();
                    
                    // Inner bright particle
                    ctx.beginPath();
                    ctx.arc(px2, py2, 6, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 220, 255, ${trailAlpha})`;
                    ctx.fill();
                }
            }
        }
    }
    
    // Add a central vortex effect at the orb's current position
    const centerX = p.x;
    const centerY = p.y;
    
    // Draw swirling vortex rings
    const vortexRadius = 20 + Math.sin(time * 0.003) * 5;
    const vortexCount = isLowQuality ? 3 : 8; // Fewer rings in low quality mode
    
    for (let i = 0; i < vortexCount; i++) {
        const baseAngle = (i / vortexCount) * Math.PI * 2 + time * 0.002;
        const radius = vortexRadius * (0.6 + Math.sin(time * 0.005 + i * 0.5) * 0.4);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, baseAngle, baseAngle + Math.PI * 0.5);
        ctx.strokeStyle = `rgba(220, 100, 255, 0.8)`;
        ctx.lineWidth = isLowQuality ? 2.5 : 4;
        ctx.stroke();
    }
    
    // Add a final purple glow at the end of the trail
    const glowRadius = 40 + Math.sin(time * 0.002) * 10;
    
    if (isLowQuality) {
        // Fast flat fill to avoid CPU-intensive radial gradient generation
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 50, 255, ${0.25 + Math.sin(time * 0.002) * 0.05})`;
        ctx.fill();
    } else {
        const trailGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
        trailGlow.addColorStop(0, 'rgba(255, 180, 255, 0.8)');
        trailGlow.addColorStop(0.5, 'rgba(200, 100, 255, 0.5)');
        trailGlow.addColorStop(1, 'rgba(150, 0, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = trailGlow;
        ctx.fill();
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
