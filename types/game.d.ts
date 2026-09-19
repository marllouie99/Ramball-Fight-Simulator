/**
 * Fight of Larpers 101 - Core Game Type Definitions
 * Used by IDE language services and AI agents for autocompletion, type contracts, and static safety.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface ArenaBounds {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius?: number;
  shape?: 'circle' | 'rectangle';
  isInside: (x: number, y: number, r?: number) => boolean;
}

export interface DamageOptions {
  source?: string;
  isBleed?: boolean;
  isCurse?: boolean;
  isPoison?: boolean;
  isBurn?: boolean;
  isFlame?: boolean;
  isElectrified?: boolean;
  isZeusShock?: boolean;
  isRatioCrit?: boolean;
  isNanamiPause?: boolean;
  isSureKill?: boolean;
  isSaitamaCounter?: boolean;
  isCounter?: boolean;
  isDivineFlame?: boolean;
  isFuga?: boolean;
  isPureUnscaled?: boolean;
  isTrueDamage?: boolean;
  bypassShield?: boolean;
  bypassEvade?: boolean;
  isGuaranteedHit?: boolean;
  damageAngle?: number;
  projectile?: Projectile;
  knockbackForce?: number;
  hitStunDuration?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  type?: 'basic' | 'secondary' | 'ultimate' | 'passive';
  cooldownKey?: string;
  cooldownMax?: number | (() => number);
  durationKey?: string;
  durationMax?: number | (() => number);
  activeKey?: string;
  icon?: string;
  color?: string;
  onActivate?: (fighter: Fighter, opponent?: Fighter) => void;
  onTick?: (fighter: Fighter, opponent?: Fighter) => void;
  onExpire?: (fighter: Fighter) => void;
}

export interface HudSkillBar {
  name: string;
  progress: number;
  color: string;
  isReady: boolean;
  timerText?: string;
}

export interface FighterDefinition {
  id: string;
  name: string;
  type: string;
  color?: string;
  themeColor?: string;
  hp?: number;
  speed?: number;
  range?: number;
  damage?: number;
  archetype?: 'brawler' | 'swordsman' | 'ranged' | 'sorcerer' | 'specialist';
}

export interface Fighter {
  // Coordinates & Physics
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  r: number;
  gunAngle: number;
  angle?: number;
  speed: number;
  baseSpeed: number;
  knockbackVx: number;
  knockbackVy: number;
  isImmovable?: boolean;
  isDodging?: boolean;
  isSpinning?: boolean;
  isKnockedDown?: boolean;

  // Identity & Stats
  id: string;
  characterId: string;
  type: string;
  color: string;
  themeColor: string;
  damageNumberColor?: string;
  hp: number;
  maxHp: number;
  ownerIndex?: number;
  _def?: FighterDefinition;

  // States & Entities
  isIllusion?: boolean;
  isTurret?: boolean;
  isDispenser?: boolean;
  isTransfiguredHuman?: boolean;
  isTargetOfAmbush?: boolean;
  isDraggedByGetsuga?: boolean;
  isWallPinnedByMakima?: boolean;
  isWallPinnedBySaitama?: boolean;

  // Timers & Combat CC (Rule 1, 5, 17)
  timeStopTimer: number;
  hitStunTimer: number;
  paralyzeTimer?: number;
  electricStunTimer?: number;
  slowTimer?: number;
  slowMultiplier?: number;
  hitFlashTimer?: number;
  ratioHitPauseTimer?: number;
  nanamiArmorFractureTimer?: number;
  nanamiArmorFractureAmount?: number;

  // Animations & Attacks (Rule 2, 15)
  punchAnimTimer: number;
  slashSwingTimer: number;
  katanaSlashTimer?: number;
  shootCooldown: number;
  shootCooldownMax: number;
  hideFrontHand?: boolean;
  hideBackHand?: boolean;

  // Core Methods
  update: (opponent?: Fighter | null, ownerIndex?: number, arena?: ArenaBounds) => void;
  takeDamage: (amount: number, attacker?: Fighter | null, opts?: DamageOptions) => boolean;
  shoot: (ownerIndex?: number) => void;
  aim: (target?: Fighter | Point | null) => void;
  applyMovementPhysics: (speedMultiplier?: number) => void;
  resolveWallBounce: (arena?: ArenaBounds, opponent?: Fighter | null) => boolean;
  applySlow: (duration: number, multiplier: number) => void;
  applyHitStun: (duration: number) => void;
  applyTimeStop: (duration: number) => void;
  interruptAttacks: () => void;
  handleStatusEffects: () => void;
  _handleTimeStop: () => boolean;
  _tickCooldowns: () => void;
  isCaughtInBeam: () => boolean;
  hasActiveInfinity: () => boolean;
  getSkillProgress: () => HudSkillBar[];
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  owner: number | Fighter;
  color?: string;
  behaviorType?: string;
  active: boolean;
  piercing?: boolean;
  ttl?: number;
  shotPairId?: string;
  isSukunaFurnace?: boolean;
  draw?: (ctx: CanvasRenderingContext2D) => void;
  update?: () => void;
}

export interface GlobalMultipliers {
  damageScale: number;
  knockbackScale: number;
  speedScale: number;
  cooldownScale: number;
}

export interface BalanceManagerType {
  getGlobalMultipliers: () => GlobalMultipliers;
  setGlobalMultiplier: (key: keyof GlobalMultipliers, value: number) => void;
  resetGlobalMultipliers: () => void;
  getFighterConfig: (id: string) => FighterDefinition | undefined;
  subscribe: (fn: (multipliers: GlobalMultipliers) => void) => () => void;
  audit: () => void;
}

export interface AudioSystemType {
  playSFX: (name: string, volume?: number) => void;
  stopSFX: (name: string) => void;
  stopAllSFX: () => void;
}

export interface GameState {
  fighters: Fighter[];
  projectiles: Projectile[];
  illusions: Fighter[];
  turrets: Fighter[];
  arena: ArenaBounds;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pixiApp?: any;
  pixiLayers?: {
    environment?: any;
    projectiles?: any;
    fighters?: any;
    ui?: any;
  };
  winner: number | null;
  matchOver: boolean;
  gameMode: string;
}
