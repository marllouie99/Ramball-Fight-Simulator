export function drawGojoWeapon(ctx, fighter) {
    const z = fighter.z || 0;
    ctx.save();
    ctx.translate(fighter.x, fighter.y - z);
    ctx.rotate(fighter.gunAngle);

    const r = fighter.r;
    
    // Draw glowing hands/orbs instead of a gun
    const handRadius = 6;
    const handDistance = r + 10;
    const handSpread = 14;

    const transition = fighter.orbTransition !== undefined ? fighter.orbTransition : (fighter.isMeleeMode ? 0 : 1);

    if (fighter.isChannelingPurple) {
        // Red orb on right hand, Blue orb on left hand merging in the center
        const mergeProgress = fighter.getPurpleChargeProgress(); // 0 to 1
        
        const rightY = handSpread * (1 - mergeProgress);
        const leftY = -handSpread * (1 - mergeProgress);
        
        // Red Orb
        const redR = handRadius * (1 + mergeProgress * 0.5);
        drawGojoOrb(ctx, handDistance, rightY, redR, Date.now(), 'red', 0);

        // Blue Orb
        const blueR = handRadius * (1 + mergeProgress * 0.5);
        drawGojoOrb(ctx, handDistance, leftY, blueR, Date.now(), 'blue', 0);
        
        if (mergeProgress > 0.5) {
            // Smooth fade-in progress for lens flare as Red & Blue fuse
            const flareP = (mergeProgress - 0.5) / 0.5; // 0.0 to 1.0
            
            // Purple flash in center
            if (mergeProgress > 0.75) {
                const pScale = (mergeProgress - 0.75) / 0.25; // 0 to 1
                drawGojoOrb(ctx, handDistance, 0, handRadius * 2.5 * pScale, Date.now(), 'purple', pScale * 5);
            }

            // Draw Anamorphic Blue Lens Flare Beam (fades in smoothly as orbs fuse)
            drawAnamorphicLensFlare(ctx, handDistance, 0, flareP);
        }
    } else {
        // Melee Mode - Draw fists instead of blue orb
        if (transition < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - transition;
            const fistRadius = 8;
            
            // Calculate punch animation extension
            let punchProgress = 0;
            if (fighter.meleePunchCooldown > 0) {
                // Assuming max cooldown is around 8 frames
                punchProgress = Math.min(1, fighter.meleePunchCooldown / 8.0); 
            }
            // Math.sin creates a curve that goes from 0 up to 1 and back to 0
            const punchExtension = Math.sin(punchProgress * Math.PI) * 20; 
            const fistDistance = r + 5 + punchExtension;
            
            // Pulsing effect for fists
            const pulse = Math.sin(Date.now() / 100) * 2;
            const glowIntensity = 8 + pulse;
            
            // Single centered fist with punching animation
            ctx.save();
            ctx.shadowColor = '#00BFFF';
            ctx.shadowBlur = glowIntensity;
            ctx.fillStyle = '#4488AA';
            ctx.beginPath();
            ctx.arc(fistDistance, 0, fistRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            
            ctx.restore();
        }
        
        // Normal stance - Floating Blue orb in front with intense Bloom & prep charge
        if (transition > 0) {
            ctx.save();
            ctx.globalAlpha = transition;
            
            let attackFlash = 0;
            let attackPush = 0;
            let chargeScale = 1.0;
            let chargePull = 0;
            let chargeRings = false;

            if (fighter.shootCooldown > 0 && fighter.shootCooldownMax > 0) {
                const progress = fighter.shootCooldown / fighter.shootCooldownMax;
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
                ctx.shadowColor = '#00F0C0';
                ctx.shadowBlur = 10;
                
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
        aura0 = [150, 0, 255];
        aura1 = [100, 0, 200];
        aura2 = [50, 0, 100];
        ring1 = [180, 50, 255];
        ring2 = [200, 100, 255];
        spark = [220, 150, 255];
        coreBase = 'rgba(20, 0, 40, 0.4)'; // Reduced opacity to show fighters inside
        plasma1 = [200, 100, 255];
        plasma2 = [230, 200, 255];
        overlay = [210, 150, 255];
    } else { // blue
        aura0 = [0, 100, 255];
        aura1 = [0, 50, 255];
        aura2 = [0, 20, 200];
        ring1 = [20, 100, 255];
        ring2 = [100, 150, 255];
        spark = [100, 200, 255];
        coreBase = 'rgba(0, 10, 40, 1)'; // Nearly pitch black blue for high contrast
        plasma1 = [100, 180, 255];
        plasma2 = [255, 255, 255];
        overlay = [150, 220, 255];
    }

    // 1. Massive Aura (reduced opacity for purple to show fighters inside)
    const auraOpacity = colorType === 'purple' ? 0.3 : (0.8 + attackFlash * 0.2);
    const glow = ctx.createRadialGradient(0, 0, baseR * 0.2, 0, 0, baseR * 6);
    glow.addColorStop(0, `rgba(${aura0.join(',')}, ${auraOpacity})`);
    glow.addColorStop(0.2, `rgba(${aura1.join(',')}, ${auraOpacity * 0.75})`);
    glow.addColorStop(0.5, `rgba(${aura2.join(',')}, ${auraOpacity * 0.25})`);
    glow.addColorStop(1, `rgba(${aura2.join(',')}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Soft, cloudy aura rings (Optimized)
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        ctx.rotate(time / (200 + i * 50));
        const ringR = baseR * (1.5 + i * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * (1.5 + i * 0.1));
        
        ctx.lineWidth = baseR * (0.6 - i * 0.1);
        ctx.strokeStyle = `rgba(${ring1.join(',')}, ${0.4 - i * 0.08})`;
        ctx.stroke();
        
        ctx.lineWidth = baseR * (0.3 - i * 0.05);
        ctx.strokeStyle = `rgba(${ring2.join(',')}, ${0.2 - i * 0.04})`;
        ctx.stroke();
    }
    ctx.restore();

    // 3. Small particle sparks (Optimized)
    ctx.save();
    for (let i = 0; i < 15; i++) {
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

    // 4. Boiling Plasma Core Texture (Optimized)
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = coreBase;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 1.4, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.globalCompositeOperation = 'lighter';
    
    for (let i = 0; i < 15; i++) {
        const seed = i * 999.99;
        
        const angle = time / (200 + (seed % 100)) + seed;
        const dist = baseR * ((seed % 10) / 7); 
        
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        
        const blobR = baseR * (0.4 + (seed % 5) / 10 + Math.sin(time / 150 + seed) * 0.2);
        
        // Seamless radial gradient to perfectly simulate noise texture without distinct shapes
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
    
    // Overlay a final soft white glow
    const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 1.6);
    centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); 
    centerGlow.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)'); 
    centerGlow.addColorStop(0.6, `rgba(${overlay.join(',')}, 0.2)`); 
    centerGlow.addColorStop(1, `rgba(${aura0.join(',')}, 0)`);
    
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 1.6, 0, Math.PI * 2);
    // Removed expensive shadowBlur, using a thick stroke for edge glow
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    ctx.stroke();
    
    // Final Bloom Shine Effect (Fast, no shadowBlur)
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(0, 0, baseR * 0.5, 0, 0, baseR * 3.5);
    bloom.addColorStop(0, `rgba(${overlay.join(',')}, 0.6)`);
    bloom.addColorStop(0.4, `rgba(${aura1.join(',')}, 0.25)`);
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 3.5, 0, Math.PI * 2);
    ctx.fill();

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
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw trail as a glowing line with particles
    for (let i = 1; i < p.history.length; i++) {
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
        const particleCount = 3 + Math.floor(distance / 15);
        for (let j = 0; j < particleCount; j++) {
            const t = j / particleCount;
            const px = prev.x + dx * t;
            const py = prev.y + dy * t;
            
            // Swirl offset
            const swirl = Math.sin(time * 0.003 + i * 0.5 + j) * 15;
            const px2 = px + Math.cos(angle + Math.PI/2) * swirl;
            const py2 = py + Math.sin(angle + Math.PI/2) * swirl;
            
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
    
    // Add a central vortex effect at the orb's current position
    // Use p.x and p.y directly since that's the current position
    const centerX = p.x;
    const centerY = p.y;
    
    // Draw swirling vortex rings
    const vortexRadius = 20 + Math.sin(time * 0.003) * 5;
    const vortexCount = 8;
    
    for (let i = 0; i < vortexCount; i++) {
        const baseAngle = (i / vortexCount) * Math.PI * 2 + time * 0.002;
        const radius = vortexRadius * (0.6 + Math.sin(time * 0.005 + i * 0.5) * 0.4);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, baseAngle, baseAngle + Math.PI * 0.5);
        ctx.strokeStyle = `rgba(220, 100, 255, 0.8)`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    
    // Add a final purple glow at the end of the trail
    // Use p.x and p.y directly since that's the current position
    const glowRadius = 40 + Math.sin(time * 0.002) * 10;
    
    const trailGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
    trailGlow.addColorStop(0, 'rgba(255, 180, 255, 0.8)');
    trailGlow.addColorStop(0.5, 'rgba(200, 100, 255, 0.5)');
    trailGlow.addColorStop(1, 'rgba(150, 0, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = trailGlow;
    ctx.fill();
    
    ctx.restore();
}

/**
 * Render a cinematic horizontal anamorphic lens flare beam when Red + Blue merge into Purple.
 * Matches the reference image style (hot white core, cyan-blue horizontal streak lines).
 */
export function drawAnamorphicLensFlare(ctx, x, y, flareP) {
    ctx.save();
    ctx.translate(x, y);
    
    // Smooth S-curve alpha fade-in
    const alpha = Math.sin(flareP * Math.PI * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;

    // 1. Long Horizontal Anamorphic Red + Blue -> Purple Fusion Streak Beam
    const streakLength = 280 * alpha;
    const streakHeight = 4.0;
    
    // Red on left (-X), Blue on right (+X), Purple & White in center!
    const beamGrad = ctx.createLinearGradient(-streakLength, 0, streakLength, 0);
    beamGrad.addColorStop(0, 'rgba(255, 0, 80, 0)');
    beamGrad.addColorStop(0.2, 'rgba(255, 30, 90, 0.6)');
    beamGrad.addColorStop(0.42, 'rgba(220, 50, 255, 0.9)');  // Vibrant Purple
    beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');  // Hot White Fusion Core
    beamGrad.addColorStop(0.58, 'rgba(180, 70, 255, 0.9)');  // Vibrant Purple
    beamGrad.addColorStop(0.8, 'rgba(0, 170, 255, 0.6)');    // Blue
    beamGrad.addColorStop(1, 'rgba(0, 140, 255, 0)');

    // Draw main horizontal beam line
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-streakLength, -streakHeight * 0.5, streakLength * 2, streakHeight);

    // Secondary wider soft horizontal glow beam (Red to Purple to Blue)
    const softHeight = 16 * alpha;
    const softGrad = ctx.createLinearGradient(-streakLength * 0.7, 0, streakLength * 0.7, 0);
    softGrad.addColorStop(0, 'rgba(255, 0, 60, 0)');
    softGrad.addColorStop(0.25, 'rgba(255, 20, 80, 0.35)');
    softGrad.addColorStop(0.5, 'rgba(180, 0, 255, 0.5)'); // Deep Purple center
    softGrad.addColorStop(0.75, 'rgba(0, 150, 255, 0.35)');
    softGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');

    ctx.fillStyle = softGrad;
    ctx.fillRect(-streakLength * 0.7, -softHeight * 0.5, streakLength * 1.4, softHeight);

    // 2. Bright Central White/Magenta-Purple Star Core
    ctx.shadowBlur = 28 * alpha;
    ctx.shadowColor = '#D033FF';

    const coreR = 8.5 * alpha;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2.5);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.35, 'rgba(255, 100, 220, 0.9)');
    coreGrad.addColorStop(0.7, 'rgba(160, 0, 255, 0.5)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
