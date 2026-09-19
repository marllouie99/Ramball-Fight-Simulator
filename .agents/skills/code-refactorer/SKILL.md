---
name: code-refactorer
description: Enforce clean architecture, eliminate spaghetti code, and automatically refactor complex functions into modular, decoupled units with zero regressions.
---

# Code Refactoring & Clean Architecture Playbook

Use this skill whenever auditing, writing, or refactoring game systems, fighters, UI, or rendering pipelines to eliminate spaghetti code and maintain a clean, maintainable architecture.

## Phase 1: Code Smell Audit
Identify any of the following anti-patterns in the target file(s):
1. **Monolithic Functions**: Any method or function exceeding 50–60 lines.
2. **Deeply Nested Control Flow**: `if/else` ladders nested 3+ levels deep.
3. **Mixed Concerns**: Physics/combat updates mixed with Canvas 2D `ctx.draw` calls, or UI rendering mixed with audio state.
4. **Duplicate Logic (WET code)**: Repeated distance/angle calculations, duplicate projectile configurations, or copy-pasted skill handlers.
5. **Direct State Pollution**: Direct mutations of unrelated global state without clear ownership.
6. **Per-Frame DOM Queries**: `document.getElementById` or `document.querySelector` executed inside `update()` or `render()` loops.

## Phase 2: Systematic Refactoring Strategy
1. **Extract Helper Sub-Methods**:
   - Break large update or draw methods into focused, descriptive helper functions (e.g., `_updateSkillChanneling()`, `_resolveWallCollisions()`, `_drawAuraEffects()`).
2. **Flatten Control Flow with Guard Clauses**:
   - Replace nested `if (conditionA) { if (conditionB) { ... } }` with early returns (`if (!conditionA || !conditionB) return;`).
3. **Decouple Module Responsibilities**:
   - Move fighter combat/skill logic into `js/entities/fighters/<fighterName>/<fighterName>Combat.js` or `*Skills.js`.
   - Move complex fighter skin and weapon visuals into `js/graphics/skins/` or `js/graphics/weapons/`.
4. **Utilize Centralized Utilities**:
   - Delegate angle wrapping, distance checks, and vector math to shared helpers in `js/utils/`.
   - Inherit physics and wall collisions via `super.update()` or `this.applyMovementPhysics()` and `this.resolveWallBounce()`.
5. **Cache References**:
   - Ensure all DOM elements and WebGL texture references are initialized once and cached at the top of the module.

## Phase 3: Post-Refactor Verification & Safety
1. **Canvas Stack Balance Check**:
   - Ensure every `ctx.save()` has an exact matching `ctx.restore()` in the same execution path.
2. **Run Automated Test Suite**:
   - Execute `npm run verify` to test all 53 characters, UI stacks, and tag matches.
   - Confirm all tests pass with exit code `0`.
