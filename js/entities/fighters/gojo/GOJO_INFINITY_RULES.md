# Gojo Satoru - Limitless Infinity Barrier & Target Freeze Standards

## 1. Universal Fighter & Illusion Infinity Freeze Rule
- ALL existing and future fighters, summoned minions, illusions, Doppelganger clones, turrets, and entities MUST be affected by Gojo's **Limitless Infinity barrier** when striking or approaching Gojo while Infinity is active (`infinityCooldown <= 0`).
- The ONLY explicit lore exception is **Toji Fushiguro** (`characterId === 'toji'` or `type === 'toji'`), who wields the Inverted Spear of Heaven (ISOH) and Heavenly Restriction to bypass Limitless Infinity.
- **Mahoraga** is blocked and frozen initially, but after 2 Infinity freeze exposures, Mahoraga's Eight-Handled Sword Wheel clicks to adapt (`gojoInfinityImmune = true` & `adapted.melee = true`), granting total immunity to Infinity freeze thereafter.

## 2. Multi-Target Proximity & Melee Attack Handling
- **Proximity Contact**: When any enemy fighter or illusion enters close contact radius (`dist <= Gojo.r + entity.r`) while Gojo's Infinity is active, Gojo automatically triggers `triggerInfinityBlock(entity.x, entity.y, entity)`.
- **Melee Hits**: `GojoFighter.takeDamage()` intercepts all incoming melee attacks when Infinity is ready, blocks 100% of incoming damage, and invokes `triggerInfinityBlock`.
- **Target Freeze**: Calling `triggerInfinityBlock` MUST:
  1. Set `entity.isFrozenByInfinity = true`.
  2. Call `entity.applyTimeStop(45)` and set `entity.timeStopTimer = 45`.
  3. Zero out velocity (`entity.vx = 0`, `entity.vy = 0`).
  4. Interrupt any active attack channeling (`entity.interruptAttacks()`).

## 3. Visual Stasis Renderer Requirements
- Whenever an entity (fighter or illusion) has `isFrozenByInfinity = true`:
  - `draw.js` MUST render a deep electric cyan blue fill overlay (`rgba(0, 229, 255, 0.65)`) over the entity's body (matching frozen projectile visuals).
  - `draw.js` MUST render an outer glowing cyan stasis ring (`rgba(224, 255, 255, 0.9)`) and clock-tick particles around the entity.
