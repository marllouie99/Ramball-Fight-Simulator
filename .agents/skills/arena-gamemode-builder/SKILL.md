---
name: arena-gamemode-builder
description: Scaffold and configure new battle modes, tournament rulesets, team assignments, round win conditions, and UI selector cards.
---

# Arena Game Mode Scaffolder Playbook

Use this skill when implementing new combat game modes, tournament rules, tag relays, or custom battle rulesets.

## Phase 1: Mode Configuration & Registry
1. **Define Mode Constants in `js/core/modeConfig.js`**:
   - Add mode constant to `GAME_MODES`:
     ```javascript
     export const GAME_MODES = {
       ...
       MY_NEW_MODE: 'My New Mode',
     };
     ```
   - Configure mode properties in `MODE_SETTINGS`:
     ```javascript
     [GAME_MODES.MY_NEW_MODE]: {
       rounds: 3,
       hpMultiplier: 1.0,
       speedMultiplier: 1.0,
       allowTagRelay: false,
       fixedHp: null,
       playerFixedHp: null,
       soloFixedHp: null
     },
     ```

## Phase 2: Team Resolution & Win Condition Engines
1. **Team Assignment in `js/core/state.js`**:
   - Update `state.getFighterTeam(fighterIndex)` with team logic for the new mode (e.g. 1v1, 2v2 duo, 3v3 tag, FFA).
2. **Win Threshold & Score Engine in `js/systems/physics.js` & `js/graphics/ui/GameOverScreen.js`**:
   - Configure round victory determination, score increments, and match completion triggers.

## Phase 3: Menu UI & Tactical Selector Wiring
1. **Add Card to `index.html`**:
   - Add a `.tactical-card.system-card` with `data-action="mode-mynewmode"` in `#menu-view-battle` or `#menu-view-tactical-battle`.
2. **Wire Action in `js/core/main.js`**:
   - Map `action === 'mode-mynewmode'` inside `executeTacticalAction()` to set `state.mode = GAME_MODES.MY_NEW_MODE` and launch `startGame()`.

## Phase 4: HUD & Verification
1. Ensure `hudManager.js` properly formats round counters and score badges.
2. Run `npm run verify` to test mode stability.
