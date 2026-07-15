import { NormalFighter } from '../fighters/NormalFighter.js';
import { AimbotFighter } from '../fighters/AimbotFighter.js';
import { MeleeFighter } from '../fighters/MeleeFighter.js';
import { GrenadierFighter } from '../fighters/GrenadierFighter.js';
import { LaserFighter } from '../fighters/LaserFighter.js';
import { KnightFighter } from '../fighters/KnightFighter.js';
import { BlackFighter } from '../fighters/BlackFighter.js';
import { DarkSlateGrayFighter } from '../fighters/DarkSlateGrayFighter.js';
import { OrangeFighter } from '../fighters/OrangeFighter.js';
import { BerserkerFighter } from '../fighters/BerserkerFighter.js';
import { CronosFighter } from '../fighters/CronosFighter.js';
import { BomberFighter } from '../fighters/BomberFighter.js';
import { GunSlingerFighter } from '../fighters/GunSlingerFighter.js';
import { DopplegangerFighter } from '../fighters/DopplegangerFighter.js';
import { EngineerFighter } from '../fighters/EngineerFighter.js';
import { TargetDummyFighter } from '../fighters/TargetDummyFighter.js';

export const FIGHTER_CLASS_MAP = {
  'normal':    NormalFighter,
  'aimbot':    AimbotFighter,
  'melee':     MeleeFighter,
  'grenadier': GrenadierFighter,
  'laser':     LaserFighter,
  'knight':    KnightFighter,
  'black':     BlackFighter,
  'darkslategray': DarkSlateGrayFighter,
  'orange':    OrangeFighter,
  'berserker': BerserkerFighter,
  'cronos':    CronosFighter,
  'bomber':    BomberFighter,
  'gunslinger': GunSlingerFighter,
  'doppleganger': DopplegangerFighter,
  'Engineer': EngineerFighter,
  'targetdummy': TargetDummyFighter,
};

