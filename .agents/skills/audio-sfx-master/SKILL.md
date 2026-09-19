---
name: audio-sfx-master
description: Implement and balance Web Audio API sound synthesis, combat SFX, voice channels, BGM looping, and death/interrupt audio cutoffs.
---

# Web Audio & Dynamic Sound Master Playbook

Use this skill when designing, adding, or tuning combat sound effects, procedural Web Audio oscillators, background music tracks, and voice clips.

## Phase 1: Web Audio Context & Auto-Unlock Standards
1. **Audio Context Safety in `js/systems/soundSystem.js` & `audioSystem.js`**:
   - Sound synthesis must safely await `unlockAudio()` triggered by user pointerdown/keydown events.
   - Route all dynamic sound nodes through the master gain and peak limiter to prevent clipping.

## Phase 2: Procedural SFX Synthesis & Triggers
1. **Attack & Hit Impacts**:
   - **Blade Clashes / Slashes**: White noise burst + bandpass filter + fast exponential decay.
   - **Energy Blasts / Beams**: Sawtooth oscillator modulated with LFO pitch ramp down.
   - **Explosions / Thuds**: Low-frequency sine wave pitch-dropped from 120Hz to 30Hz with noise thud.
2. **Dynamic Pitch Variation**:
   - Add slight randomized pitch variation (`0.95` – `1.05`) on repetitive sounds (like basic punches) to prevent auditory fatigue.

## Phase 3: Interruption & Death Audio Guards (CRITICAL)
1. **Active Channeling Cancellation**:
   - When a fighter takes heavy hit-stun or begins dying, ALWAYS invoke `fighter.interruptAttacks()` and stop any active looping oscillators.
2. **Round End & Death Silence**:
   - Ensure `stopAllSounds(false, 0, 0)` is called upon match/round transitions so lingering projectile loops (e.g. beam drones or flame hums) do not persist into the next screen.

## Phase 4: BGM Transitions
1. Synchronize seamless BGM playback across 1v1 rounds via `arenaBgmSystem.js`.
2. Fade out BGM on match conclusion (`youWin` fanfare / match end screens).
