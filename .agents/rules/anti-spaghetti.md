# Anti-Spaghetti & Clean Code Standards

All code created, edited, or refactored in this repository MUST strictly follow these clean architecture principles:

## 1. Modular Decomposition (Anti-Monolith Standard)
- **Function Size Limit**: Functions must not exceed 50–60 lines. When a method exceeds this length, extract cohesive logical blocks into dedicated named helper methods.
- **Strict Separation of Concerns**:
  - **Combat & Physics**: Update loops, collision checks, skill channeling, and velocity integration MUST live in `*Combat.js` or entity classes.
  - **Graphics & Rendering**: All Canvas 2D/WebGL drawing (`ctx.beginPath`, `ctx.fill`, `PIXI.Sprite`) MUST live in `*Graphics.js` or renderer modules. NEVER place drawing code inside physics or update loops.
  - **Audio & SFX**: Sound triggers must be routed cleanly through `soundSystem.js` or `audioSystem.js`.
  - **UI & HUD**: DOM manipulation and HUD rendering must remain in `hudRenderer.js`, `hudManager.js`, or screen components.

## 2. Early-Return Guard Clauses (No Deep Nesting)
- **Flatten Control Flow**: Never nest `if` conditions more than 2 levels deep. Use early return statements and guard clauses at the top of methods:
  ```javascript
  // BAD: Deeply nested pyramid of doom
  function updateSkill(fighter) {
    if (fighter.isAlive) {
      if (!fighter.isFrozen) {
        if (fighter.skillTimer > 0) {
          fighter.skillTimer--;
          if (fighter.skillTimer === 0) {
            triggerSkillEffect(fighter);
          }
        }
      }
    }
  }

  // GOOD: Clean guard clauses with flat execution
  function updateSkill(fighter) {
    if (!fighter.isAlive || fighter.isFrozen) return;
    if (fighter.skillTimer <= 0) return;

    fighter.skillTimer--;
    if (fighter.skillTimer === 0) {
      triggerSkillEffect(fighter);
    }
  }
  ```

## 3. Don't Repeat Yourself (DRY Principle)
- **No Copy-Pasted Logic**: If the same math, hit-detection, angle computation, or particle burst is used in multiple places, extract it into a reusable helper function or module in `js/utils/`.
- **Inherit Centralized Physics**: All fighter entities must use `this.applyMovementPhysics()` and `this.resolveWallBounce(arena, opponent)` instead of manually re-implementing coordinate integration (`this.x += this.vx`).

## 4. Performance & DOM Caching Hygiene
- **Zero DOM Queries in Game Loops**: NEVER use `document.getElementById` or `document.querySelector` inside `update()`, `draw()`, `requestAnimationFrame`, or interval callbacks. Cache element references once at the module level.
- **Timer & Listener Cleanup**: Any interval, timeout, or event listener created during gameplay or UI flows must be cleanly cleared upon match reset or state transition.

## 5. Proactive Self-Refactor & Mandatory Verification
- After adding or modifying any feature, proactively review the modified files to eliminate dead code, unused imports, redundant boolean flags, and bloated functions.
- Run `npm run verify` to ensure zero regressions across all 53 fighter classes and UI systems before concluding any task.

## 6. Workspace Hygiene & Temporary Script Cleanup
- **No Lingering Scratch Files**: NEVER leave disposable debug scripts, one-off test harnesses, or temporary scratch files in the repository workspace.
- **Mandatory Immediate Deletion**: As soon as a temporary test or verification script has finished running, the agent MUST immediately delete that file.
- **Use Ephemeral Scratch Storage**: If temporary data or test scripts are needed during analysis, place them in the artifact scratch directory or delete them immediately upon completion. Only permanent test files configured in `package.json` (e.g. `tests/verify-build.js`) may remain in the repo.
