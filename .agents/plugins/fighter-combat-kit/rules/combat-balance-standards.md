# Combat Balance & Frame Data Standards

## 1. Baseline Health & Effective HP Pools
- Standard Baseline HP: **1000 - 1500 HP**.
- Tank Archetypes (e.g. Mahoraga): May have scaling damage reduction, armor, or adaptation mechanisms rather than inflated raw HP (> 2500).
- Glass Cannons / Speedsters (e.g. Toji, Genos): Keep within 900 - 1100 HP with higher mobility or defensive i-frames/dodges.

## 2. Damage Scaling & DPS Brackets
- **Light Pokes / Basic Melee**: 15 - 35 dmg per hit.
- **Ranged Projectiles / Single Shots**: 30 - 65 dmg per shot (balanced with cooldown/reload).
- **Secondary Skills / Multi-Hit Combos**: 60 - 130 cumulative damage across the sequence.
- **Ultimate / Finisher Skills**: 160 - 300 maximum burst damage. Must require significant charge time, super meter build-up, or high cooldown.

## 3. Hit-Stun & Status Effect Limits
- **Flinch / Light Hit-Stun**: 6 - 12 frames (0.1 - 0.2s). Allows combo stringing without infinite stunlock.
- **Heavy Launch / Knockback**: Decay multiplier should be 0.85 - 0.92 for smooth slide and wall ricochet.
- **High-Frequency Hazards**: Hazards ticking faster than every 15 frames MUST NOT apply hit-stun CC (to prevent permanent freeze locks).

## 4. Universal Defense & Stasis Interactivity
- All combatants must respect global time-stops (`_handleTimeStop()`).
- All fighters must implement Frontal Arc AOE for melee/brawler attacks to handle multiple opponents and illusions consistently.
- Ensure Gojo Infinity interactions and Mahoraga adaptation counters are maintained.
