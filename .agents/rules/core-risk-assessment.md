# Core Changes Risk Assessment Standard

Whenever the agent modifies or refactors any **core engine or shared systems file**, the agent MUST include a **"⚠️ Risk Assessment"** section in its response to outline the potential blast radius, identify vulnerable downstream components, and detail the verification taken.

---

## Targeted Core Files (High-Impact Surface)

Any edits touching the following files (or similar shared core subsystems) trigger a mandatory Risk Assessment:
- `js/entities/fighter.js` (Base fighter class & physics/CC hooks)
- `js/core/state.js` (Global state, canvas/PixiJS layers, late-bound dependencies)
- `js/systems/projectileSystem.js` / `tacticalProjectileSystem.js` (Shared projectile lifecycle & pooling)
- `js/systems/physics.js` (Collision resolution, knockback physics, boundary clamping)
- `js/systems/renderSystem.js` / `draw.js` (Global render loops, WebGL texture syncing)
- `js/graphics/hudManager.js` (HUD rendering, skill providers, DOM caches)
- `js/systems/updateSystem.js` / `gameLoop.js` / `js/core/main.js` (Core game loops & initialization)

---

## Required Format

When modifying any core file above, append this block before the Suggestions section:

```markdown
---

⚠️ **Risk Assessment:**
- **Blast Radius**: [High / Medium / Low] — [List affected subsystems, game modes, or fighter classes]
- **Potential Collateral Impact**: [Identify specific regression risks, e.g., CC time-stop leaks, collision stasis, DOM reflows, WebGL texture desyncs]
- **Mitigation & Verification**: [Specific automated tests or manual test scenarios executed to guarantee zero regressions]
```

---

## Risk Assessment Guidelines

1. **Explicit Downstream Mapping**: Identify specifically which fighters or systems inherit or interact with the modified logic (e.g., "All 53 fighters rely on `applyMovementPhysics()`").
2. **Flag Specific Invariants**: Check against known repository rules in `AGENTS.md` (e.g., Rule 1 Freeze Guards, Rule 5 Flurry Attacker Freezes, Rule 11 shadowBlur, Rule 15 Ambush Physics).
3. **Actionable Verification**: State clearly how the risk was mitigated (e.g., `npm run verify`, `testAllFighters.mjs`, or tag mode test).
4. **Keep it Concise**: 3–5 bullet points highlighting actual technical risks, not generic boilerplate.
