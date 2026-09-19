# Post-Change Suggestions Standard

After completing ANY code modification, update, or fix in the project, the agent MUST always conclude with a **"💡 Suggestions"** section. This section provides actionable follow-up ideas, improvements, and architectural steps the user might want to consider — structured with a 4-dimensional assessment: **Why**, **Pros**, **Cons**, and **Don't**.

## Format

After every response that involves code changes or recommendations, append:

```markdown
---

### 💡 Suggestions

1. **[Actionable Suggestion Title]**
   - **Why**: [Clear technical, gameplay, or performance rationale explaining the core problem it solves]
   - **Pros**: [Key benefits, capabilities unlocked, developer or gameplay improvements]
   - **Cons**: [Trade-offs, limitations, added complexity, or maintenance considerations]
   - **Don't**: [Specific anti-pattern, common trap, or breaking mistake to strictly avoid when implementing this]

2. **[Another Suggestion Title]**
   - **Why**: ...
   - **Pros**: ...
   - **Cons**: ...
   - **Don't**: ...

3. **[Optional Third Suggestion]**
   - **Why**: ...
   - **Pros**: ...
   - **Cons**: ...
   - **Don't**: ...
```

## What Qualifies as a Good Suggestion

Suggestions MUST be **specific, actionable, and relevant** to what was just changed, evaluating benefits, trade-offs, and cautionary boundaries:

### Performance & Optimization
- **Suggestion**: "Migrate the recurring domain slash particle trails to WebGL hybrid sprites."
  - **Why**: Prevents frame drops during high-frequency screen recording by offloading GPU drawing.
  - **Pros**: Maintains stable 60 FPS under heavy particle density; integrates with existing PixiJS render layers.
  - **Cons**: Requires managing WebGL texture lifecycle and handling Canvas 2D fallback gracefully.
  - **Don't**: Don't use HTML5 Canvas `ctx.shadowBlur` or re-instantiate `PIXI.Text` objects inside the render loop (Rules 10, 11, 12).

### Visual & UX Polish
- **Suggestion**: "Add directional speed lines trailing behind the dash attack."
  - **Why**: Visually conveys supersonic velocity and impact momentum in classic anime manga style.
  - **Pros**: Substantially increases visceral combat feel with low performance cost.
  - **Cons**: Increases visual density on screen if overused on basic punches.
  - **Don't**: Don't use uniform stroke lines; always draw 4-point filled needle polygons aligned strictly behind the fighter's aim angle (Rule 16).

### Gameplay & Balance
- **Suggestion**: "Expose knockback force and cooldown multipliers in `fighter-balance-sheet.json`."
  - **Why**: Enables instant live testing via the `F2` overlay without hardcoding arbitrary magic numbers.
  - **Pros**: Designers and testers can tweak combat pacing in real time without recompiling code.
  - **Cons**: Expanding the JSON schema requires updating accessor tests in `balanceManager.js`.
  - **Don't**: Don't scale damage or cooldowns directly inside projectile constructors; route through `BalanceManager` to preserve global scaling.

### Testing & Reliability
- **Suggestion**: "Add an interaction test in `scripts/testInteractions.mjs`."
  - **Why**: Permanently guards against future regressions during refactors.
  - **Pros**: Runs in under 50ms inside `npm run verify` and detects cross-fighter edge cases headlessly.
  - **Cons**: Requires mocking entity states if abilities depend on complex visual animations.
  - **Don't**: Don't run manual console logs or rely on browser observation alone; ensure tests run headlessly in `npm run verify`.

## Rules for Suggestions

1. **Always provide 2–4 suggestions** — never skip the section, never provide more than 5.
2. **Mandatory 4-Part Structure** — Every single suggestion MUST include all 4 bold sub-bullets: **Why**, **Pros**, **Cons**, and **Don't**.
3. **Be specific** — name exact files, functions, mechanics, or repository rules.
4. **Be relevant** — suggestions must directly relate to the code that was just modified.
5. **Prioritize by impact** — list the highest-impact suggestion first.
6. **Don't repeat completed work** — never suggest something that was already implemented in the current response.
7. **Keep it concise** — each sub-bullet should be 1–2 sentences max.


