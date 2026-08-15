# Mahito (Jujutsu Kaisen) - Fighter Design Document

> [!NOTE]
> This is a conceptual design for Mahito, adhering strictly to the `Ramball Fight Simulator` engine guidelines, rules, and rendering standards.

## 🎨 Theme & Visuals
- **Palette**: Deep grungy cyan (`#00A8CC`), pale fleshy greys, and stark blacks.
- **Manga Speed Lines**: During his rapid strikes, he utilizes the game's standard 4-point needle polygons streaming behind him (colored cyan/grey/white).
- **Particle Cleanliness**: His soul effects avoid `shadowBlur` to preserve FPS. Instead, they use stacked semi-transparent filled circles or PixiJS sprites with `ADD` blend modes.
- **HUD Integration**: All of his HUD elements (Skill bars, cooldowns) strictly use his exact `themeColor` without mismatched accent colors.

## 🛡️ Passive: Soul Durability & Shape-shifting
Mahito possesses high natural damage mitigation against standard physical attacks (bullets, normal punches).
- **The Soul Exception**: Fighters capable of striking the "soul" (e.g., **Toji** wielding the Split Soul Katana, or **Yuji** with Black Flash) bypass this mitigation and deal true damage.
- **Evasion**: When his health drops below a certain threshold, his dash ability temporarily shrinks his hurtbox radius (morphing into a small creature) to slip out of combos.

## ⚔️ Basic Attack: Idle Transfiguration (Melee Morph)
Mahito morphs his arms into giant blades or spiked maces.
- **Melee Arc Standard**: This attack casts a 120°–160° frontal arc that hits *all* targets (fighters and illusions) within reach, applying hit-stun and physical knockback.
- **Soul Disfigurement**: Each hit applies a stack of "Soul Disfigurement". At max stacks, the target takes a burst of true damage, representing their soul being violently reshaped.

## 🧟 Skill 1: Soul Multiplicity (Transfigured Humans)
Mahito summons 2–3 Transfigured Humans to swarm the battlefield.
- **AI Decoupling**: These minions have their own independent update loops and status timers. Even if Mahito gets hit-stunned, the transfigured humans will continue rushing the target to bite and apply flinch pressure.
- **Alt Cast (Body Repel)**: Mahito consolidates the souls and fires them as a high-speed, high-knockback projectile (rendered via PixiJS off-screen canvas for performance).

## 👹 Skill 2: Polymorphic Soul Isomer
Mahito vomits out a massive, elite transfigured beast.
- Unlike the swarm, this is a single high-HP bruiser minion.
- It excels at tracking the enemy and landing heavy blows that cause massive physical pushback and hit-pause. *(Hit-pause is applied only to the target, never the attacker).*

## 🦋 Transformation (High-Cost Skill): Instant Spirit Body of Distorted Killing
A high-cost, gauge-dependent special move where Mahito undergoes a horrifying metamorphosis into his ultimate, armored insect-like form.
- **Stat Changes**: Drastically increases his defense (armor value) and attack power (base damage and knockback on his basic attacks).
- **Drawback**: His movement speed and dash distance are significantly reduced, forcing him to rely on his overwhelming presence and minions to close the gap.
- **Visuals**: His Sprite/Canvas rendering shifts to a heavily armored, blade-armed silhouette, radiating a dense cyan aura.

## 🌌 Ultimate: Domain Expansion — Self-Embodiment of Perfection
- **Classification**: Paralyzing / Time-Stop Domain (Closed Barrier).
- **Activation**: The game container darkens (using a strict `div.game-box` overlay, preserving the `body` background), and giant disembodied hands assemble from the edges of the screen.
- **Effect**: Any enemy caught in the radius instantly receives a massive `timeStopTimer`, completely freezing their `update()` loop.
- **Execution**: While the enemy is frozen in stasis, Mahito's next basic attack is guaranteed to land as an execution strike, triggering a special Canvas 2D cinematic slash/burst that obliterates the target's HP bar.
