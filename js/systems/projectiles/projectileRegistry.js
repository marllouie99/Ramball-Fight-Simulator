import { ProjectileBehaviorManager } from './ProjectileBehaviorManager.js';
import { BlackHoleBehavior } from './behaviors/BlackHoleBehavior.js';
import { SukunaFurnaceBehavior } from './behaviors/SukunaFurnaceBehavior.js';
import { GojoPurpleBehavior } from './behaviors/GojoPurpleBehavior.js';

export function registerProjectileBehaviors() {
  ProjectileBehaviorManager.register('black_hole', BlackHoleBehavior);
  ProjectileBehaviorManager.register('sukuna_furnace', SukunaFurnaceBehavior);
  ProjectileBehaviorManager.register('gojo_purple', GojoPurpleBehavior);
}
