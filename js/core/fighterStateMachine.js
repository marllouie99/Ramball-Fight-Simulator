// ─────────────────────────────────────────────
// FIGHTER STATE MACHINE SYSTEM
// ─────────────────────────────────────────────
//
// This module provides a Finite State Machine (FSM) framework for fighter behaviors.
// It separates state logic from rendering and physics, making behaviors cleaner and
// preventing state conflicts (e.g., attacking while frozen).
//
// PATTERN: State Machine
// Each state is a class with `enter()`, `update()`, and `exit()` methods.
// Transitions are explicit and controlled by conditions checked in the update loop.
//
// ─────────────────────────────────────────────

/**
 * Base class for all fighter states.
 * Subclass this to create specific behaviors (e.g., IdleState, DashState, etc.)
 */
export class FighterState {
  constructor(fighter) {
    this.fighter = fighter;
    this.name = 'State';
    this.timer = 0;
  }

  /** Called when entering this state. Override to initialize state-specific data. */
  enter(prevState, ...args) {
    this.timer = 0;
  }

  /** Called every frame while in this state. Return a new state to transition, or null to stay. */
  update(dt) {
    this.timer++;
    return null; // Stay in current state
  }

  /** Called when exiting this state. Override for cleanup. */
  exit(nextState) {
    this.timer = 0;
  }

  /** Check if this state can be interrupted by another state. */
  canBeInterrupted() {
    return true;
  }

  /** Check if this state allows taking damage. */
  canTakeDamage() {
    return true;
  }

  /** Check if this state allows movement. */
  canMove() {
    return true;
  }

  /** Check if this state allows attacking. */
  canAttack() {
    return true;
  }
}

/**
 * Base class for the fighter state machine.
 * Manages state transitions and delegates updates to the current state.
 */
export class FighterStateMachine {
  constructor(fighter) {
    this.fighter = fighter;
    this.states = {};
    this.currentState = null;
    this.previousState = null;
  }

  /**
   * Register a state with the state machine.
   * @param {string} name - Unique identifier for the state
   * @param {FighterState} stateClass - The state class (not an instance)
   */
  addState(name, stateClass) {
    this.states[name] = stateClass;
    return this;
  }

  /**
   * Transition to a new state.
   * @param {string} stateName - Name of the state to transition to
   * @param {...any} args - Arguments to pass to the state's enter() method
   */
  setState(stateName, ...args) {
    const newStateClass = this.states[stateName];
    if (!newStateClass) {
      console.warn(`State "${stateName}" not found in state machine`);
      return;
    }

    const prevState = this.currentState;
    const prevStateName = prevState ? prevState.name : null;

    // Exit current state
    if (prevState) {
      prevState.exit(this._createStateInstance(stateName));
    }

    // Create and enter new state
    const newState = this._createStateInstance(stateName);
    this.previousState = prevState;
    this.currentState = newState;
    newState.enter(prevState, ...args);

    return newState;
  }

  /**
   * Check if currently in a specific state.
   * @param {string} stateName - Name of the state to check
   */
  isInState(stateName) {
    return this.currentState && this.currentState.name === stateName;
  }

  /**
   * Check if can transition to a new state (respects interruption rules).
   * @param {string} stateName - Name of the state to transition to
   */
  canTransitionTo(stateName) {
    if (!this.currentState) return true;
    return this.currentState.canBeInterrupted();
  }

  /**
   * Update the current state. Called every frame.
   * @param {number} dt - Delta time
   */
  update(dt) {
    if (!this.currentState) return;

    // Let current state update and potentially return a new state
    const newState = this.currentState.update(dt);
    if (newState) {
      // newState can be a state name (string) or a state instance
      if (typeof newState === 'string') {
        this.setState(newState);
      } else if (newState instanceof FighterState) {
        this.setState(newState.name);
      }
    }
  }

  /**
   * Create a new instance of a state class.
   * @private
   */
  _createStateInstance(stateName) {
    const StateClass = this.states[stateName];
    if (!StateClass) return null;
    return new StateClass(this.fighter);
  }

  /**
   * Get the name of the current state.
   */
  getCurrentStateName() {
    return this.currentState ? this.currentState.name : null;
  }
}

// ─────────────────────────────────────────────
// COMMON BASE STATES
// ─────────────────────────────────────────────

/**
 * Default idle state - fighter can move and attack freely.
 */
export class IdleState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'Idle';
  }

  canMove() { return true; }
  canAttack() { return true; }
  canTakeDamage() { return true; }
}

/**
 * State for when the fighter is stunned/frozen.
 */
export class StunnedState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'Stunned';
  }

  enter(prevState, duration = 60) {
    super.enter(prevState);
    this.duration = duration;
  }

  update(dt) {
    this.timer++;
    if (this.timer >= this.duration) {
      return 'Idle'; // Return state name to transition
    }
    return null;
  }

  canMove() { return false; }
  canAttack() { return false; }
  canTakeDamage() { return true; } // Still take damage, but can't react
}

/**
 * State for dashing/instant movement abilities.
 */
export class DashState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'Dashing';
  }

  enter(prevState, targetX, targetY, speed, duration) {
    super.enter(prevState);
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = speed;
    this.duration = duration;
    this.timer = 0;
    
    // Calculate direction
    const dx = targetX - this.fighter.x;
    const dy = targetY - this.fighter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      this.dirX = dx / dist;
      this.dirY = dy / dist;
    } else {
      this.dirX = Math.cos(this.fighter.gunAngle);
      this.dirY = Math.sin(this.fighter.gunAngle);
    }
  }

  update(dt) {
    this.timer++;
    
    // Move the fighter
    this.fighter.x += this.dirX * this.speed;
    this.fighter.y += this.dirY * this.speed;
    
    // Check if dash is complete
    if (this.timer >= this.duration) {
      return 'Idle';
    }
    return null;
  }

  canMove() { return false; } // Movement is controlled by dash
  canAttack() { return false; }
  canTakeDamage() { return false; } // Invulnerable during dash
  canBeInterrupted() { return false; } // Cannot be interrupted
}

/**
 * State for charging an ability before executing.
 */
export class ChargingState extends FighterState {
  constructor(fighter) {
    super(fighter);
    this.name = 'Charging';
  }

  enter(prevState, duration, onComplete) {
    super.enter(prevState);
    this.duration = duration;
    this.onComplete = onComplete; // Callback when charging completes
  }

  update(dt) {
    this.timer++;
    if (this.timer >= this.duration) {
      if (this.onComplete) {
        this.onComplete();
      }
      return 'Idle';
    }
    return null;
  }

  canMove() { return false; }
  canAttack() { return false; }
  canTakeDamage() { return true; }
  canBeInterrupted() { return false; }
}