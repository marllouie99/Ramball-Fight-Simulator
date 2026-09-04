# Rubbick - Combat Mechanics

Rubbick is an **Arcane Magic and Spell Steal Fighter** who floats above the battlefield, wielding a magical staff and surrounded by orbiting arcane debris. Their playstyle focuses on disruption, crowd control, and adapting to the enemy's strengths by stealing their abilities.

## Core Mechanics
* **Hovering:** Rubbick floats above the ground, maintaining a distance from enemies while utilizing their spells.
* **Basic Attack (Arcane Bolt):** Rubbick fires a magical bolt of arcane energy. Upon hitting an enemy, the bolt can bounce to additional nearby targets up to 3 times, with the damage slightly reduced on each subsequent bounce.

## Active Abilities

### Telekinesis (Skill 1)
* **Mechanic:** A powerful crowd-control ability that manipulates the enemy's position.
* **Effect:** Rubbick targets an enemy within range, lifting them helplessly into the air, instantly cutting off any active skill/channeling audios, and applying a hard **Paralyze Debuff** (halting update loops and rendering 3D orbiting stun rings). The target is then carried through the air towards a predetermined drop location.
* **Impact:** Upon reaching the drop point, the enemy is slammed into the ground, creating an arcane crater and a shockwave. This impact causes a localized AoE (Area of Effect) Paralyze stun, incapacitating the target and any other enemies caught in the blast radius.

### Spell Steal (Ultimate)
* **Mechanic:** Rubbick's signature ability, allowing them to turn the enemy's strength against them.
* **Effect:** Rubbick drains magical energy from a nearby opponent, temporarily stealing their core ability or attack for a significant duration (up to 7 seconds). 
* **Adaptability:** While Spell Steal is active, Rubbick's own attacks are replaced by the stolen ability. The nature of the stolen spell depends entirely on the enemy's class:
  * **Spammable Spells:** If stealing from rapid-fire fighters (e.g., Ninja's shurikens, Gunslinger's bullets, Flame Warden's flamethrower), Rubbick can cast these frequently, sometimes with unique arcane visual flair (like cyan flames).
  * **Empowered Base Attacks:** If stealing from fighters like the Berserker, Rubbick retains their Arcane Bolts but permanently enters an empowered state for the duration (gaining the Blood Rage buffs, movement speed, attack speed, and visual weapon trails).
  * **Heavy Spells:** If stealing powerful abilities (e.g., Bomber's grenades, Cronos's time sphere, Ruby's hook, Musashi's Phantom Flurry, or Gojo's Hollow Purple with custom green theme after Gojo fires his first Purple), Rubbick must perform a brief wind-up animation before unleashing the devastating attack.
* Once the duration expires, Rubbick returns to using their standard Arcane Bolts.

