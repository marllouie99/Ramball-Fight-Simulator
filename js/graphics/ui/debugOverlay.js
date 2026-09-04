// ─────────────────────────────────────────────
// DEBUG & PERFORMANCE OVERLAY RENDERER WITH FIGHTER CONSOLE
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { getAudioLatencyMs } from '../../systems/soundSystem.js';

export function renderFpsDebugOverlay(ctx) {
  if (!state) return;

  ctx.save();

  // 1. FPS & Quality Top-Right Display
  if (state.fps && !state.hideFpsLogs) {
    ctx.font = 'bold 12px Consolas, monospace';
    ctx.fillStyle = state.fps < 45 ? '#ff4444' : '#00ff66';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const audioLat = getAudioLatencyMs();
    const latStr = audioLat > 0 ? ` | A: ${audioLat}ms` : '';
    const text = `FPS: ${Math.round(state.fps)} | Q: ${Math.round((state.qualityLevel || 1) * 100)}%${latStr}`;
    ctx.fillText(text, (state.canvas?.width || 540) - 15, 15);
  }

  // 2. Real-Time Fighter Debug Console Panel (Top Left)
  if (state.gameState === 'playing' || state.gameState === 'countdown') {
    const yuta = state.fighters ? state.fighters.find(f => f && (f.characterId === 'yuta' || f.type === 'yuta')) : null;
    const gojo = state.fighters ? state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo')) : null;

    const boxX = 10;
    const boxY = 35;
    const boxW = 310;
    const boxH = 210;

    // Semi-transparent dark background card
    ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Header
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillStyle = '#00E5FF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('=== DEBUG CONSOLE: GOJO vs YUTA ===', boxX + 8, boxY + 6);

    let curY = boxY + 22;

    // YUTA LIVE METRICS
    if (yuta) {
      const gunDeg = Math.round((((yuta.gunAngle || 0) * 180 / Math.PI) % 360 + 360) % 360);
      const isFrz = (yuta.timeStopTimer || 0) > 0 || yuta.isFrozenByInfinity;
      
      ctx.fillStyle = '#FF69B4';
      ctx.fillText(`[YUTA] HP:${Math.round(yuta.hp)} GunAng:${gunDeg}°`, boxX + 8, curY);
      curY += 13;
      ctx.fillStyle = '#E0E0E0';
      ctx.fillText(`       PoseTmr:${yuta.blockPoseTimer||0} Parry:${yuta.parryCount||0} FlurryHits:${yuta.flurryHitsLeft||0}`, boxX + 8, curY);
      curY += 13;
      ctx.fillText(`       Frozen:${isFrz} TStop:${yuta.timeStopTimer||0} Vx:${(yuta.vx||0).toFixed(1)} Vy:${(yuta.vy||0).toFixed(1)}`, boxX + 8, curY);
      curY += 15;
    }

    // GOJO LIVE METRICS
    if (gojo) {
      ctx.fillStyle = '#00FFFF';
      ctx.fillText(`[GOJO] HP:${Math.round(gojo.hp)} RedTimer:${gojo.redEffectTimer||0} Buildup:${gojo.redBuildupPhase||false}`, boxX + 8, curY);
      curY += 13;
      ctx.fillStyle = '#E0E0E0';
      ctx.fillText(`       RedDetonated:${gojo.redDetonated||false} Vx:${(gojo.vx||0).toFixed(1)} Vy:${(gojo.vy||0).toFixed(1)}`, boxX + 8, curY);
      curY += 15;
    }

    // REAL-TIME EVENT LOG TRAIL (Last 5 events)
    ctx.fillStyle = '#FFD700';
    ctx.fillText('--- RECENT DEBUG LOGS ---', boxX + 8, curY);
    curY += 13;

    ctx.font = '10px Consolas, monospace';
    const logs = state.debugLogs || [];
    const recentLogs = logs.slice(-5);
    recentLogs.forEach(logLine => {
      ctx.fillStyle = logLine.includes('RED') ? '#FF4444' : (logLine.includes('SPIN') || logLine.includes('FLURRY') ? '#FF00FF' : '#00FF66');
      ctx.fillText(logLine.length > 46 ? logLine.substring(0, 44) + '..' : logLine, boxX + 8, curY);
      curY += 12;
    });
  }

  ctx.restore();
}
