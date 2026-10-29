import { state } from '../../core/state.js';

/**
 * Foreground FX Pass
 * ------------------
 * Some fighter skill visuals must render ABOVE every fighter body, illusion and minion
 * (e.g. Gojo's Red / Blue / Hollow Purple mixing orbs). Fighters draw in Y-sorted order and
 * illusions/minions draw after fighters, so those visuals can be overlaid by enemy bodies.
 *
 * renderSystem opens a deferral window before drawing fighters; renderers push
 * `{ fighter, draw(ctx, fighter) }` entries into `state._deferredForegroundFx`, and the queue
 * is flushed after fighters, illusions and projectiles have been drawn.
 * Outside the window (previews, champion screens, offscreen renders) renderers draw inline.
 */
export function beginForegroundFxPass() {
  if (!Array.isArray(state._deferredForegroundFx)) state._deferredForegroundFx = [];
  state._deferredForegroundFx.length = 0;
  state._deferFighterForegroundFx = true;
}

export function flushForegroundFxPass(ctx) {
  state._deferFighterForegroundFx = false;
  const queue = state._deferredForegroundFx;
  if (!ctx || !Array.isArray(queue) || queue.length === 0) return;
  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    if (!entry || typeof entry.draw !== 'function') continue;
    try {
      entry.draw(ctx, entry.fighter);
    } catch (err) {
      console.error('[ForegroundFxPass] Failed to draw deferred FX:', err);
    }
  }
  queue.length = 0;
}

export function endForegroundFxPass() {
  state._deferFighterForegroundFx = false;
  if (Array.isArray(state._deferredForegroundFx)) state._deferredForegroundFx.length = 0;
}

