/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SURVIVOR MOB BATCH RENDERER
 * Cached sprite stamp renderer for survivor horde mobs. Pre-renders each mob
 * character type to an offscreen canvas ONCE, then blits with a single
 * ctx.drawImage() per mob — replacing the full per-pixel drawKnightPixelBody()
 * + hair + status overlays + weapon graphics pipeline for 50+ mobs per frame.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RULE COMPLIANCE:
 *   - Rule 2.2: NO ctx.shadowBlur anywhere
 *   - Rule 2.4: Every ctx.save() matched by ctx.restore()
 *   - Rule 3.5: ctx.imageSmoothingEnabled = false for pixel art fidelity
 *   - Rule 20:  Canonical hand positions (±r*0.82, +r*0.38), handR = r*0.30
 *
 * Usage:
 *   import { drawSurvivorMobsFast } from './survivorMobRenderer.js';
 *   drawSurvivorMobsFast(ctx, aliveMobs, frameTimer);
 */

import { drawKnightPixelBody, _drawKnightHair } from '../fighters/knightSkin.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawGrayShield, drawGraySword } from '../weapons/knightWeaponGraphics.js';

// ─── Stamp Cache ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MobStamp
 * @property {OffscreenCanvas|HTMLCanvasElement} canvas - Cached sprite stamp
 * @property {number} halfW  - Half width of stamp canvas
 * @property {number} halfH  - Half height of stamp canvas
 * @property {number} radius - Body radius this stamp was rendered for
 */

/** @type {Map<string, MobStamp>} */
const _stampCache = new Map();

// ─── Constants ───────────────────────────────────────────────────────────────

const HAND_COLOR_KNIGHT  = '#94A3B8'; // Steel gauntlet color
const HAND_OUTLINE_COLOR = '#0E0F14'; // Manga ink outline
const HIT_FLASH_FRAMES   = 2;        // Frames of white flash on hit

// ─── Canvas Factory ──────────────────────────────────────────────────────────

/**
 * Create an offscreen canvas (prefer OffscreenCanvas where available).
 * @param {number} w
 * @param {number} h
 * @returns {OffscreenCanvas|HTMLCanvasElement}
 */
function _createCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(w, h);
    }
    const c = document.createElement('canvas');
    c.width  = w;
    c.height = h;
    return c;
}

// ─── Hand Drawing (Inline Fallback) ─────────────────────────────────────────

/**
 * Draw a single hand circle. Uses imported drawPixelHand if available,
 * otherwise draws a simple filled+stroked arc.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {string} color
 */
function _drawHand(ctx, cx, cy, radius, color) {
    if (typeof drawPixelHand === 'function') {
        drawPixelHand(ctx, cx, cy, radius, color, HAND_OUTLINE_COLOR);
        return;
    }
    // Fallback: simple filled circle with outline
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = HAND_OUTLINE_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
}

// ─── Stamp Rendering ────────────────────────────────────────────────────────

/**
 * Render a mob stamp canvas for a given character type including weapons and hands.
 * @param {object} mob - The mob entity instance
 * @param {string} characterId
 * @param {number} r - Body radius
 * @returns {MobStamp}
 */
function _renderStamp(mob, characterId, r) {
    // Generous padding so upright sword (~75px), plume, and shield (~38x66px) never clip
    const padding = Math.max(95, Math.ceil(r * 4.5));
    const size    = Math.ceil((r + padding) * 2);
    const halfW   = size / 2;
    const halfH   = size / 2;

    const canvas = _createCanvas(size, size);
    const offCtx = canvas.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    offCtx.translate(halfW, halfH);

    // ── 1. BODY RENDERING ──
    let bodyRendered = false;
    if (mob && typeof mob.drawBody === 'function') {
        const oldX = mob.x, oldY = mob.y, oldAngle = mob.gunAngle;
        mob.x = 0; mob.y = 0; mob.gunAngle = 0; mob.angle = 0;
        try {
            mob.drawBody(offCtx);
            bodyRendered = true;
        } catch (_) {
            bodyRendered = false;
        } finally {
            mob.x = oldX; mob.y = oldY; mob.gunAngle = oldAngle; mob.angle = oldAngle;
        }
    }

    if (!bodyRendered) {
        if (characterId === 'knight') {
            // Full knight pixel body & anime helmet plume
            drawKnightPixelBody(offCtx, r, false);
            _drawKnightHair(offCtx, r, false);
        } else {
            // Generic fallback: colored circle body
            _drawGenericBody(offCtx, r, characterId);
        }
    }

    // ── 2. WEAPON & HAND RENDERING ──
    let weaponRendered = false;

    // Try fighter instance drawGun first (draws authentic weapons & hands)
    if (mob && typeof mob.drawGun === 'function') {
        const oldX = mob.x, oldY = mob.y, oldAngle = mob.gunAngle;
        const oldSwipe = mob.swipeActive, oldSwing = mob.swordSwingTimer;
        mob.x = 0; mob.y = 0; mob.gunAngle = 0; mob.angle = 0;
        mob.swipeActive = false; mob.swordSwingTimer = 0;
        try {
            mob.drawGun(offCtx);
            weaponRendered = true;
        } catch (_) {
            weaponRendered = false;
        } finally {
            mob.x = oldX; mob.y = oldY; mob.gunAngle = oldAngle; mob.angle = oldAngle;
            mob.swipeActive = oldSwipe; mob.swordSwingTimer = oldSwing;
        }
    }

    // Explicit fallback for Knight: draw Shield (right) & Sword (left) with hands
    if (!weaponRendered && characterId === 'knight') {
        // Draw Shield on right flank (+X)
        drawGrayShield(offCtx, 0, 0, 0, 0, null, r, 0, 0, false);
        // Shield Hand under grip
        _drawHand(offCtx, r + 4, 0, 6, HAND_COLOR_KNIGHT);

        // Draw Upright Sword on left flank (-X)
        drawGraySword(offCtx, 0, 0, 0, r, null, false, false, false);
        // Sword Hand holding hilt along left hip
        offCtx.save();
        offCtx.translate(-(r + 10), 4);
        offCtx.rotate(-Math.PI / 2);
        offCtx.translate(-13, 0);
        _drawHand(offCtx, 0, 0, 6, HAND_COLOR_KNIGHT);
        offCtx.restore();

        weaponRendered = true;
    }

    // Generic fallback hands if no weapons were drawn
    if (!weaponRendered) {
        const handR = r * 0.30;
        const handColor = (characterId === 'knight') ? HAND_COLOR_KNIGHT : '#FFE0BD';
        _drawHand(offCtx, -r * 0.82, r * 0.38, handR, handColor);
        _drawHand(offCtx,  r * 0.82, r * 0.38, handR, handColor);
    }

    offCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

    return { canvas, halfW, halfH, radius: r };
}

/**
 * Draw a simple generic colored circle body for unknown character types.
 * @param {CanvasRenderingContext2D} ctx - Already translated to center
 * @param {number} r
 * @param {string} characterId
 */
function _drawGenericBody(ctx, r, characterId) {
    // Simple hash to pick a hue from characterId string
    let hash = 0;
    for (let i = 0; i < characterId.length; i++) {
        hash = ((hash << 5) - hash + characterId.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;

    // Body circle
    ctx.fillStyle = `hsl(${hue}, 45%, 50%)`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Manga ink outline
    ctx.strokeStyle = HAND_OUTLINE_COLOR;
    ctx.lineWidth   = 2.0;
    ctx.stroke();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get or create a cached stamp for the given mob.
 * Returns immediately if cache is fresh; re-renders only if radius changed.
 * Keyed by `${id}_${r}` to prevent cache thrashing between normal horde mobs and boss mobs.
 * @param {object} mob - Must have `characterId` and `r` (radius) properties
 * @returns {MobStamp}
 */
function ensureMobStamp(mob) {
    const id     = mob.characterId || 'generic';
    const r      = mob.r || mob.radius || 15;
    const key    = `${id}_${r}`;
    const cached = _stampCache.get(key);

    if (cached) {
        return cached;
    }

    // Render fresh stamp
    const stamp = _renderStamp(mob, id, r);
    _stampCache.set(key, stamp);
    return stamp;
}

/**
 * Clear the entire stamp cache. Call when mob pool is reset or character
 * assets change at runtime.
 */
function clearMobStampCache() {
    _stampCache.clear();
}

/**
 * Batch-draw all survivor mobs using cached sprite stamps.
 * Handles facing direction, hit-flash, floor shadows, and boss HP bars.
 *
 * @param {CanvasRenderingContext2D} ctx   - Main game canvas context
 * @param {Array}  mobs  - Array of mob entities
 * @param {number} timer - Frame timer (used for hit-flash timing)
 */
function drawSurvivorMobsFast(ctx, mobs, timer) {
    if (!mobs || mobs.length === 0) return;

    const PI_HALF = Math.PI / 2;

    for (let i = 0; i < mobs.length; i++) {
        const mob = mobs[i];

        // Skip dead mobs
        if (mob.hp <= 0 || mob.isDead) continue;

        const stamp = ensureMobStamp(mob);
        const r     = mob.r || mob.radius || 15;
        const angle = mob.gunAngle || 0;
        const facingLeft = Math.abs(angle) > PI_HALF;

        // ── Floor shadow (drawn at world position, no rotation) ──
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(mob.x, mob.y + r * 0.8, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── HoloCure Elite & Boss Floor Auras (Rule 2.2 compliant — NO shadowBlur) ──
        if (mob.isElite || mob.isMiniBoss || mob.isFinalBoss) {
            ctx.save();
            if (mob.isFinalBoss) {
                const pulse = Math.sin((timer || 0) * 0.1) * 3;
                ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
                ctx.strokeStyle = '#EF4444';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(mob.x, mob.y, r * 1.35 + pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (mob.isMiniBoss) {
                const pulse = Math.sin((timer || 0) * 0.12) * 2;
                ctx.fillStyle = 'rgba(168, 85, 247, 0.20)';
                ctx.strokeStyle = '#A855F7';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.arc(mob.x, mob.y, r * 1.3 + pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (mob.isElite) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.20)';
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(mob.x, mob.y, r * 1.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Draw mob stamp (rotated to gunAngle, Rule 19 compliant) ──
        ctx.save();
        ctx.translate(mob.x, mob.y);
        ctx.rotate(angle);
        if (facingLeft) {
            ctx.scale(1, -1);
        }
        ctx.imageSmoothingEnabled = false;

        // Hit-flash: reduce alpha and tint white for HIT_FLASH_FRAMES
        const isHitFlashing = mob.hitStunTimer > 0 && mob.hitStunTimer > (mob._hitStunDuration || 6) - HIT_FLASH_FRAMES;

        if (isHitFlashing) {
            ctx.globalAlpha = 0.7;
        }

        ctx.drawImage(stamp.canvas, -stamp.halfW, -stamp.halfH);

        // White flash overlay using source-atop composite
        if (isHitFlashing) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.fillRect(-stamp.halfW, -stamp.halfH, stamp.halfW * 2, stamp.halfH * 2);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        // ── Dynamic attack visual slash & sword cleave on contact ──
        if (mob.slashSwingTimer > 0) {
            const swingP = mob.slashSwingTimer / 16;
            ctx.save();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(r * 0.7, 0, r * 1.3, -0.7 * swingP, 0.7 * swingP);
            ctx.stroke();

            // Draw forward thrusting sword blade cleaving forward into strike plane
            if (mob.characterId === 'knight') {
                drawGraySword(ctx, 0, 0, 0, r, null, false, true, false);
            }
            ctx.restore();
        }

        ctx.restore();

        // ── Mini HP bar for bosses only ──
        if (mob.isMiniBoss || mob.isFinalBoss) {
            _drawBossHPBar(ctx, mob, r);
        }
    }
}

/**
 * Draw a simple mini health bar above a boss mob.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} mob
 * @param {number} r
 */
function _drawBossHPBar(ctx, mob, r) {
    const barW   = r * 2.4;
    const barH   = 4;
    const barX   = mob.x - barW / 2;
    const barY   = mob.y - r - 14;
    const hpFrac = Math.max(0, Math.min(1, mob.hp / (mob.maxHp || 1)));

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // HP fill — red for low, orange for mid, green for high
    if (hpFrac > 0.5) {
        ctx.fillStyle = '#4ADE80';
    } else if (hpFrac > 0.25) {
        ctx.fillStyle = '#FB923C';
    } else {
        ctx.fillStyle = '#EF4444';
    }
    ctx.fillRect(barX, barY, barW * hpFrac, barH);

    ctx.restore();
}

export { ensureMobStamp, drawSurvivorMobsFast, clearMobStampCache };
