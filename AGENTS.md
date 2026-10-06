# AI Coding Agent Instructions

## Canonical Default Model Hand Positioning (Rule 20)

When creating or rendering new characters and model skins, ALWAYS use the approved default hand positioning standard:
- **Symmetrical Lower-Flank Placement**: Both hands are circular elements (`drawPixelHand`) positioned symmetrically at the lower-left and lower-right flanks of the central body circle in local coordinate space:
  - **Left Hand**: `(x: -r * 0.82, y: +r * 0.38)`
  - **Right Hand**: `(x: +r * 0.82, y: +r * 0.38)`
- **Hand Radius**: `handRadius = r * 0.30` (or `getHandSize(r * 0.30)`).
- **Layering & Overlap**: Both hands MUST be rendered on the **front layer** (after rendering the central body circle), overlapping the lower perimeter of the body circle so approximately half of each hand circle overlaps the body edge and half protrudes outward as a distinct side fist.
- **Weapon Wielding**: For weapon users, the main-hand weapon hilt/grip anchors directly at `(x: +r * 0.82, y: +r * 0.38)` during idle/rest, with the hand drawn over the grip.

## Mandatory In-Game Overlay HP & Status Drawing (Rule 21)

Whenever creating, scaffolding, or overriding a fighter's rendering pipeline:
- **Custom `draw(ctx, opponent)` Override**: If the fighter class defines or overrides `draw(ctx, opponent)`, it **MUST ALWAYS** explicitly call `this.drawHealth(ctx);` and `this.drawFreezeTimer(ctx);` at the very end of `draw()` on the top layer.
- **`drawBody(ctx)` Implementation**: The fighter class MUST define `drawBody(ctx)` (e.g. `drawBody(ctx) { draw[Name]Skin(ctx, this); }`) so standard engine render passes and preview hooks function properly.
- **Never Omit `this.drawHealth(ctx)`**: Omitting `this.drawHealth(ctx)` removes the in-game floating HP number underneath/above the fighter during combat. Always ensure overhead HP is rendered.

## Mandatory Hair & Head Asset Model Import (Rule 22)

When creating, scaffolding, or implementing new characters and model skins, the agent **MUST ALWAYS** import and load the character's dedicated hair asset model (`Assets/model/<characterId>/<Name>-hair.png`):
- **Module-Level Image Cache**: Define `let _[name]HairImage = null;` and an exportable `_get[Name]HairImage()` loader function with proactive eager initialization (`if (typeof window !== 'undefined' && typeof Image !== 'undefined') _get[Name]HairImage();`).
- **Hair Renderer Function**: Define `_draw[Name]Hair(ctx, r, facingLeft)` supporting `state.skinCustomizations?.[characterId]` (scale, offsets, rotation, flipping) with nearest-neighbor pixel fidelity (`ctx.imageSmoothingEnabled = false;`).
- **Bounding Box Calibration**: Calibrate hair scale and draw offsets so the crown spikes frame the upper body circle seamlessly at `-1.15r` to `-1.30r`.
- **Directory Structure & Config Reference**: Store all character hair PNGs in `Assets/model/<characterId>/<Name>-hair.png` and register the path under `assets.hair` in `js/configs/characters/<name>Config.js`.

## Mandatory Basic Projectile Suppression (Rule 23)

When creating, scaffolding, or implementing new characters:
- **Suppress Base Projectile Shooting (`shoot(ownerIndex)`)**: Unless the character is explicitly designed as a vanilla generic gun/bullet shooter, the fighter class **MUST ALWAYS** override `shoot(ownerIndex)` with a blank method or dedicated melee/skill action:
  ```javascript
  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles.
   */
  shoot(ownerIndex) {
    // Intentionally empty: Character uses dedicated combat skills, weapons, or melee combos
  }
  ```
- **Why**: Base `Fighter.update()` in `fighter.js` automatically invokes `this.shoot(ownerIndex)` whenever `shootCooldown <= 0`, which spawns unwanted generic bullet/orb projectiles unless explicitly overridden.

## Post-Change Suggestions

This applies to any chat-based AI coding assistant working in this repository, regardless of IDE, extension, model, or provider, whenever these project instructions are loaded.

After making a code change, always conclude the final response with a `### 💡 Suggestions` section containing 2–4 concise, actionable follow-ups relevant to the change. Each suggestion must include:

- **Why**: The problem or opportunity it addresses.
- **Pros**: The concrete benefits.
- **Cons**: The trade-offs or maintenance cost.
- **Don't**: A specific pitfall to avoid.
- **Example Scenario**: A concrete situation where the follow-up would help.

Do not suggest work that was already completed. Keep each part to 1–2 sentences, and make the scenario realistic and directly connected to the suggestion. Follow the detailed standard in `.agents/rules/post-change-suggestions.md`.

This is an always-on project instruction, not an on-demand skill. IDEs and chat agents differ in how they discover project instructions; configure any tool that does not automatically load the root `AGENTS.md` to include it as project context.

VS Code's Local agent harness also runs the Stop reminder in `.github/hooks/post-change-suggestions.json`, gated by Git changes during the current prompt. Other IDEs or hosted agent harnesses need their own supported Stop-hook configuration.