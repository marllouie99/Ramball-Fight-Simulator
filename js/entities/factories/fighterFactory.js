import { Fighter } from '../fighter.js';
import { drawSketchyCircle } from '../../graphics/renderers/fighterRenderer.js';
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
import { RubyFighter } from '../fighters/RubyFighter.js';
import { MusashiFighter } from '../fighters/MusashiFighter.js';
import { TricksterFighter } from '../fighters/TricksterFighter.js';
import { ZeusFighter } from '../fighters/ZeusFighter.js';
import { HydraFighter } from '../fighters/HydraFighter.js';
import { GojoFighter } from '../fighters/GojoFighter.js';
import { SukunaFighter } from '../fighters/SukunaFighter.js';
import { YutaFighter } from '../fighters/YutaFighter.js';
import { TojiFighter } from '../fighters/TojiFighter.js';
import { MahoragaFighter } from '../fighters/MahoragaFighter.js';
import { TodoFighter } from '../fighters/TodoFighter.js';
import { YujiFighter } from '../fighters/YujiFighter.js';
import { LaylaFighter } from '../fighters/LaylaFighter.js';
import { SaitamaFighter } from '../fighters/SaitamaFighter.js';
import { GenosFighter } from '../fighters/GenosFighter.js';
import { IchigoFighter } from '../fighters/IchigoFighter.js';
import { MahitoFighter } from '../fighters/MahitoFighter.js';
import { NanamiFighter } from '../fighters/NanamiFighter.js';
import { NobaraFighter } from '../fighters/NobaraFighter.js';
import { JohnWickFighter } from '../fighters/JohnWickFighter.js';

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
  'ruby': RubyFighter,
  'musashi': MusashiFighter,
  'trickster': TricksterFighter,
  'zeus': ZeusFighter,
  'hydra': HydraFighter,
  'gojo': GojoFighter,
  'sukuna': SukunaFighter,
  'yuta': YutaFighter,
  'toji': TojiFighter,
  'mahoraga': MahoragaFighter,
  'todo': TodoFighter,
  'yuji': YujiFighter,
  'layla': LaylaFighter,
  'saitama': SaitamaFighter,
  'genos': GenosFighter,
  'ichigo': IchigoFighter,
  'mahito': MahitoFighter,
  'nanami': NanamiFighter,
  'nobara': NobaraFighter,
  'john_wick': JohnWickFighter,
  'johnwick':  JohnWickFighter,
};

// Helper to wrap a class's draw method with the sketchy circle decorator globally
function wrapFighterDraw(FighterClass) {
  const originalDraw = FighterClass.prototype.draw;
  if (!originalDraw) return;
  
  FighterClass.prototype.draw = function(ctx, opponent) {
    const originalArc = ctx.arc;
    const originalStroke = ctx.stroke;
    const originalBeginPath = ctx.beginPath;
    const originalFill = ctx.fill;
    const originalClip = ctx.clip;
    
    let arcCalled = false;
    let arcX = 0, arcY = 0, arcR = 0;
    
    const fighter = this;
    
    ctx.beginPath = function() {
      arcCalled = false;
      originalBeginPath.call(ctx);
    };
    
    ctx.fill = function() {
      arcCalled = false;
      originalFill.call(ctx);
    };
    
    ctx.clip = function() {
      arcCalled = false;
      originalClip.call(ctx);
    };
    
    ctx.arc = function(x, y, radius, startAngle, endAngle, counterclockwise) {
      const safeRadius = Math.max(0, radius || 0);
      originalArc.call(ctx, x, y, safeRadius, startAngle, endAngle, counterclockwise);
      if (Math.abs(safeRadius - fighter.r) < 3) {
        arcCalled = true;
        arcX = x;
        arcY = y;
        arcR = safeRadius;
      }
    };
    
    ctx.stroke = function() {
      if (arcCalled && !fighter.suppressSketchyOutline) {
        let seed = 0;
        const idStr = String(fighter.id || 'fighter');
        for (let i = 0; i < idStr.length; i++) {
          seed += idStr.charCodeAt(i);
        }
        drawSketchyCircle(ctx, arcX, arcY, arcR, seed, ctx.strokeStyle, ctx.lineWidth || 2.5);
        arcCalled = false;
      } else {
        originalStroke.call(ctx);
      }
    };
    
    try {
      originalDraw.call(this, ctx, opponent);
    } finally {
      ctx.arc = originalArc;
      ctx.stroke = originalStroke;
      ctx.beginPath = originalBeginPath;
      ctx.fill = originalFill;
      ctx.clip = originalClip;
    }
  };
}

// Apply sketchy outlines globally to Fighter base class and all subclasses
wrapFighterDraw(Fighter);
for (const key in FIGHTER_CLASS_MAP) {
  wrapFighterDraw(FIGHTER_CLASS_MAP[key]);
}
