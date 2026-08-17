import { ProjectileBehaviorManager } from './ProjectileBehaviorManager.js';
import { BlackHoleBehavior } from './behaviors/BlackHoleBehavior.js';
import { SukunaFurnaceBehavior } from './behaviors/SukunaFurnaceBehavior.js';
import { GojoPurpleBehavior } from './behaviors/GojoPurpleBehavior.js';
import { GojoBlueBehavior } from './behaviors/GojoBlueBehavior.js';
import { YutaPureLoveBeamBehavior } from './behaviors/YutaPureLoveBeamBehavior.js';

export function registerProjectileBehaviors() {
  ProjectileBehaviorManager.register('black_hole', BlackHoleBehavior);
  ProjectileBehaviorManager.register('sukuna_furnace', SukunaFurnaceBehavior);
  ProjectileBehaviorManager.register('gojo_purple', GojoPurpleBehavior);
  ProjectileBehaviorManager.register('gojo_blue', GojoBlueBehavior);
  ProjectileBehaviorManager.register('yuta_pure_love_beam', YutaPureLoveBeamBehavior);
}
