import { CONFIG, getHandSize } from '../../core/config.js';
import {
  drawSlowEffect,
  drawElectricStunEffect,
  drawDubstepStunEffect,
  drawCrimsonElectrifiedEffect,
  drawPoisonEffect,
  drawSilenceEffect,
  drawThunderRootsEffect
} from '../statusEffects.js';

export class FighterRenderer {
  static drawBody(ctx, fighter) {
    ctx.save();
    let tremorX = 0;
    let tremorY = 0;
    const currentShake = (typeof state !== 'undefined' && state.screenShake) ? (state.screenShake.intensity || 0) : 0;
    const isAnyFighterChanneling = (typeof state !== 'undefined' && state.fighters) ? state.fighters.some(f => f && (f.isChannelingDomain || f.isChannelingDomainExpansion)) : false;
    
    if (currentShake > 0 || isAnyFighterChanneling) {
      const shakeAmt = isAnyFighterChanneling ? 4.0 : Math.min(6, currentShake * 0.6);
      tremorX = (Math.random() - 0.5) * shakeAmt;
      tremorY = (Math.random() - 0.5) * shakeAmt;
    }
    ctx.translate(fighter.x + tremorX, fighter.y + tremorY);
    ctx.rotate(fighter.angle);
    
    // Flip vertically if facing left to prevent being upside-down
    if (Math.abs(fighter.angle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }

    ctx.beginPath();
    ctx.arc(0, 0, fighter.r, 0, Math.PI * 2);
    ctx.fillStyle = fighter.color;
    ctx.fill();

    this.drawStatusOverlays(ctx, fighter);

    ctx.restore();
  }

  static drawStatusOverlays(ctx, fighter) {
    const baseRadius = fighter.r;
    
    if (fighter.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${fighter.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
    }

    if (fighter.statusEffects && fighter.statusEffects.fighter.slowTimer > 0 || fighter.slowTimer > 0) {
      // Suppress the generic slow visual if they are currently trapped in Toji's cinematic ultimate
      const trappedInTojiUltimate = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
        f && f.ultimateActive && f.ultimateTarget === fighter && (f.type === 'toji' || f.characterId === 'toji')
      );
      if (!trappedInTojiUltimate) {
        drawSlowEffect(ctx, baseRadius);
      }
    }

    if (fighter.electricStunTimer > 0) {
      drawElectricStunEffect(ctx, baseRadius, false);
    }
    
    if (fighter.dubstepStunVisualTimer > 0) {
      drawDubstepStunEffect(ctx, baseRadius, fighter.dubstepStunVisualTimer);
    }
    
    if (fighter.crimsonElectrifiedTimer > 0) {
      drawCrimsonElectrifiedEffect(ctx, baseRadius, fighter.crimsonElectrifiedTrickster);
    }

    if (fighter.poisonTicks > 0) {
      drawPoisonEffect(ctx, baseRadius);
    }
    
    if (fighter.silenceTimer > 0) {
      drawSilenceEffect(ctx, baseRadius);
    }
    
    if (fighter.thunderRootsTimer > 0) {
      drawThunderRootsEffect(ctx, baseRadius);
    }

    if (fighter.burnTimer > 0) {
      const offset = baseRadius * 0.15;
      const grad = ctx.createRadialGradient(-offset, -offset, 0, 0, 0, baseRadius);
      const pulse = 0.05 * Math.sin(Date.now() / 100);
      grad.addColorStop(0, 'rgba(255, 255, 220, 0.65)'); // Hot-white/yellow center
      grad.addColorStop(0.35, `rgba(255, 130, 0, ${0.5 + pulse})`);
      grad.addColorStop(0.75, `rgba(200, 30, 0, ${0.35 + pulse})`);
      grad.addColorStop(1, 'rgba(100, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  static drawOutline(ctx, fighter) {
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.stroke();
  }

  static drawGun(ctx, fighter) {
    if (fighter.isTargetOfAmbush) return;
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.rotate(fighter.gunAngle);
    
    if (Math.abs(fighter.gunAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    ctx.translate(fighter.r + CONFIG.gun.baseOffset, 0);
    ctx.fillStyle = '#444';
    ctx.fillRect(-3, -5, 14, 10);
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2.5, 10, 5);
    
    // Draw Hand holding the gun
    ctx.beginPath();
    ctx.arc(0, 3, getHandSize(6, fighter), 0, Math.PI * 2);
    ctx.fillStyle = fighter.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    
    ctx.restore();
  }

  static drawHealth(ctx, fighter) {
    if (fighter.hp <= 0 || fighter._isWinnerReveal || fighter.hideHpText) return;

    ctx.save();
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hpText = Math.floor(fighter.hp).toString();
    const drawY = fighter.y - (fighter.z || 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(hpText, fighter.x, drawY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, fighter.x, drawY);
    ctx.restore();
  }

  static drawFreezeTimer(ctx, fighter) {
    if (fighter._suppressFreezeTimer) return;
    if (!fighter._timeStopStartTime || !fighter._timeStopOriginalDuration) return;
    
    ctx.save();
    const elapsedMs = performance.now() - fighter._timeStopStartTime;
    const elapsedFrames = (elapsedMs / 1000) * 60;
    const remainingFrames = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
    const seconds = Math.ceil(remainingFrames / 60);
    const text = `⏳ ${seconds}s`;
    
    const drawY = (fighter.y - (fighter.z || 0)) - (fighter.r + 18);
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(text, fighter.x, drawY);
    ctx.fillStyle = '#00F3FF';
    ctx.fillText(text, fighter.x, drawY);
    ctx.restore();
  }

  static draw(ctx, fighter) {
    const scale = fighter.visualScale !== undefined ? fighter.visualScale : 1.0;
    const zOffset = fighter.z || 0;
    const hasScale = scale !== 1.0 && scale > 0;
    const hasZ = zOffset > 0;

    if (hasZ) {
      ctx.save();
      ctx.translate(fighter.x, fighter.y);
      ctx.scale(1, 0.5); 
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r * scale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.6 - (zOffset / 150))})`;
      ctx.fill();
      ctx.restore();
    }

    if (hasScale || hasZ) {
      ctx.save();
      ctx.translate(fighter.x, fighter.y - zOffset);
      if (hasScale) ctx.scale(scale, scale);
      ctx.translate(-fighter.x, -fighter.y);
    }

    fighter.drawBody(ctx);
    fighter.drawOutline(ctx);

    // Universal dark stroke
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.r, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    fighter.drawGun(ctx);
    fighter.drawHealth(ctx);
    fighter.drawFreezeTimer(ctx);

    if (hasScale || hasZ) {
      ctx.restore();
    }
  }
}
