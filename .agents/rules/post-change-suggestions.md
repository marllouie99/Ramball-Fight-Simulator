---
description: Mandatory post-change actionable suggestions section required after code changes.
alwaysApply: true
---

# Post-Change Suggestions Standard

This provider-neutral project instruction applies to any chat-based AI coding assistant working in this repository, regardless of IDE, extension, model, or provider, whenever the instruction is loaded. After completing any code modification, update, or fix, the agent MUST conclude the final response with a **"💡 Suggestions"** section. Each actionable follow-up must include **Why**, **Pros**, **Cons**, **Don't**, and a concrete **Example Scenario**.

This is an always-on instruction, not an on-demand skill. There is no single instruction file that every IDE automatically discovers; tools that do not load the repository's root `AGENTS.md` must be configured to include it as project context. The root file contains the concise mandatory rule; this file contains its detailed rubric and examples.

VS Code's Local agent harness has an additional hook at `.github/hooks/post-change-suggestions.json`. It snapshots Git state at prompt submission and blocks once at Stop only when tracked or untracked project files changed during that prompt. This avoids extra turns on unchanged prompts; provider-hosted harnesses and other IDEs need their own compatible hook configuration. Ignored files are not included in the Git snapshot.

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
  - **Example Scenario**: [A concise, realistic situation demonstrating when this follow-up would help]

2. **[Another Suggestion Title]**
   - **Why**: ...
   - **Pros**: ...
   - **Cons**: ...
   - **Don't**: ...
  - **Example Scenario**: ...

3. **[Optional Third Suggestion]**
   - **Why**: ...
   - **Pros**: ...
   - **Cons**: ...
   - **Don't**: ...
  - **Example Scenario**: ...
```

## Example Scenario

If a change updates team-aware projectile targeting, a useful follow-up could be:

```markdown
1. **Add a teammate-owned projectile regression test**
  - **Why**: Ownership and team filtering can differ for summons compared with their owner fighter.
  - **Pros**: Catches friendly-fire regressions in `scripts/testInteractions.mjs`.
  - **Cons**: Requires a small two-team fixture with a summon and opposing target.
  - **Don't**: Don't make all summons ignore every fighter; opposing targets must remain hittable.
  - **Example Scenario**: In a 2v2 match, Rika's projectile crosses an ally before hitting an opponent; verify the ally takes no damage and the opponent still does.
```

## What Qualifies as a Good Suggestion

Suggestions MUST be **specific, actionable, and relevant** to what was just changed, evaluating benefits, trade-offs, and cautionary boundaries:

### Performance & Optimization
- **Suggestion**: "Migrate the recurring domain slash particle trails to WebGL hybrid sprites."
  - **Why**: Prevents frame drops during high-frequency screen recording by offloading GPU drawing.
  - **Pros**: Maintains stable 60 FPS under heavy particle density; integrates with existing PixiJS render layers.
  - **Cons**: Requires managing WebGL texture lifecycle and handling Canvas 2D fallback gracefully.
  - **Don't**: Don't use HTML5 Canvas `ctx.shadowBlur` or re-instantiate `PIXI.Text` objects inside the render loop (Rules 10, 11, 12).
  - **Example Scenario**: During a screen-recorded domain fight, slash trails stay smooth while multiple effects are active.

### Visual & UX Polish
- **Suggestion**: "Add directional speed lines trailing behind the dash attack."
  - **Why**: Visually conveys supersonic velocity and impact momentum in classic anime manga style.
  - **Pros**: Substantially increases visceral combat feel with low performance cost.
  - **Cons**: Increases visual density on screen if overused on basic punches.
  - **Don't**: Don't use uniform stroke lines; always draw 4-point filled needle polygons aligned strictly behind the fighter's aim angle (Rule 16).
  - **Example Scenario**: During Zenitsu's dash, trailing speed lines make his direction and momentum clear to the player.

### Gameplay & Balance
- **Suggestion**: "Expose knockback force and cooldown multipliers in `fighter-balance-sheet.json`."
  - **Why**: Enables instant live testing via the `F2` overlay without hardcoding arbitrary magic numbers.
  - **Pros**: Designers and testers can tweak combat pacing in real time without recompiling code.
  - **Cons**: Expanding the JSON schema requires updating accessor tests in `balanceManager.js`.
  - **Don't**: Don't scale damage or cooldowns directly inside projectile constructors; route through `BalanceManager` to preserve global scaling.
  - **Example Scenario**: A designer adjusts knockback in the F2 overlay and immediately compares two fighter matchups.

### Testing & Reliability
- **Suggestion**: "Add an interaction test in `scripts/testInteractions.mjs`."
  - **Why**: Permanently guards against future regressions during refactors.
  - **Pros**: Runs in under 50ms inside `npm run verify` and detects cross-fighter edge cases headlessly.
  - **Cons**: Requires mocking entity states if abilities depend on complex visual animations.
  - **Don't**: Don't run manual console logs or rely on browser observation alone; ensure tests run headlessly in `npm run verify`.
  - **Example Scenario**: A later refactor changes team filtering and the test catches friendly fire from a teammate-owned summon.

## Rules for Suggestions

1. **Always provide 2–4 suggestions** — never skip the section, never provide more than 5.
2. **Mandatory 5-Part Structure** — Every single suggestion MUST include all 5 bold sub-bullets: **Why**, **Pros**, **Cons**, **Don't**, and **Example Scenario**.
3. **Be specific** — name exact files, functions, mechanics, or repository rules.
4. **Be relevant** — suggestions must directly relate to the code that was just modified.
5. **Prioritize by impact** — list the highest-impact suggestion first.
6. **Don't repeat completed work** — never suggest something that was already implemented in the current response.
7. **Keep it concise** — each sub-bullet should be 1–2 sentences max; the example scenario should be one sentence.


