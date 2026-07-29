# Aoi Todo - Boogie Woogie Brawler

Todo is a highly mobile, mix-up focused melee fighter who excels at confusing and disorienting opponents using his signature cursed technique: **Boogie Woogie**.

## Core Mechanics

### 1. Boogie Woogie (The Clap)
When Todo claps his hands, he swaps positions with a target. This creates immense confusion and allows him to instantly close gaps or escape dangerous situations.
- **Priority Target - Cursed Rocks**: If Todo has thrown any Cursed Rocks on the field, Boogie Woogie will prioritize swapping him with the oldest active rock. This allows for long-range, unpredictable repositioning.
- **Secondary Target - Enemy Fighters**: If there are no rocks, Todo swaps positions with the closest enemy fighter.
- **Aim Alignment**: Immediately after swapping, Todo automatically adjusts his facing direction to aim at the closest enemy, ensuring he is always ready to strike.
- **The Fake Clap**: If Todo claps but there are no valid targets (no rocks and no enemies), he performs a "Fake Clap". The sound plays to mind-game the opponent, but the cooldown is halved!

### 2. Cursed Rocks
Todo can throw imbued rocks that act as anchors for his Boogie Woogie.
- The rocks bounce off the arena walls, creating dynamic and moving swap points.
- Throwing a rock and then immediately swapping with it allows Todo to ambush enemies from unexpected angles.

### 3. Black Flash Window
The true strength of Boogie Woogie lies in the follow-up. 
- Immediately after successfully swapping positions, Todo gains a brief buff window (`justSwappedTimer`).
- If he lands a melee punch during this tight window, it triggers a devastating **Black Flash**!

### 4. Melee Combat
As a brawler, Todo relies on close-range punches. His attack speed and range require him to be right in the enemy's face, making Boogie Woogie essential for his offensive pressure.
