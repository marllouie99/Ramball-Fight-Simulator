import { state, saveSkinCustomizations } from '../../core/state.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { drawIchigoSkin, _drawIchigoHair, _getIchigoHairImage } from '../fighters/ichigoSkin.js';
import { drawGojoBody, _drawGojoHair, _getGojoHairImage } from '../fighters/gojoSkin.js';
import { drawMakimaSkin, _drawMakimaHair, _getMakimaHairImage } from '../fighters/makimaSkin.js';
import { drawRezeSkin, _drawRezeHair, _getRezeHairImage } from '../fighters/rezeSkin.js';
import { drawSukunaBody, _drawSukunaHair, _getSukunaHairImage } from '../fighters/sukunaSkin.js';
import { drawYujiSkin, _drawYujiHair, _getYujiHairImage } from '../fighters/yujiSkin.js';
import { drawYutaSkin, _drawYutaHair, _getYutaHairImage } from '../fighters/yutaSkin.js';
import { drawTojiSkin, _drawTojiHair, _getTojiHairImage } from '../fighters/tojiSkin.js';
import { drawTanjiroSkin } from '../fighters/tanjiroSkin.js';
import { drawZenitsuSkin } from '../fighters/zenitsuSkin.js';
import { drawNezukoSkin } from '../fighters/nezukoSkin.js';
import { drawPowerSkin } from '../fighters/powerSkin.js';
import { drawZeusSkin } from '../fighters/zeusSkin.js';
import { drawCronosSkin } from '../fighters/cronosSkin.js';
import { drawBomberPixelBody } from '../fighters/bomberSkin.js';
import { drawVoidmasterPixelBody } from '../fighters/voidmasterSkin.js';
import { drawKnightPixelBody } from '../fighters/knightSkin.js';
import { drawNanamiSkin, _drawNanamiHair, _getNanamiHairImage } from '../fighters/nanamiSkin.js';
import { drawMahitoSkin, _drawMahitoHair, _getMahitoHairImage } from '../fighters/mahitoSkin.js';
import { drawGenosSkin, drawGenosHands, _drawGenosHair, _getGenosHairImage } from '../fighters/genosSkin.js';
import { drawEscanorSkin, _drawEscanorHair, _getEscanorHairImage } from '../fighters/escanorSkin.js';

// Studio State Initializers
if (state.studioSelectedSkinFighter === undefined) state.studioSelectedSkinFighter = 'ichigo';
if (state.studioSkinPreviewScale === undefined) state.studioSkinPreviewScale = 2.4;
if (state.studioSkinFacing === undefined) state.studioSkinFacing = 'right';
if (state.studioSkinForm === undefined) state.studioSkinForm = 'default';
if (state.studioSkinBg === undefined) state.studioSkinBg = 'white';
if (state.studioSkinShowBody === undefined) state.studioSkinShowBody = true;
if (state.studioSkinShowGuides === undefined) state.studioSkinShowGuides = true;
if (state.studioSkinDetailTab === undefined) state.studioSkinDetailTab = 'scale';
if (state.studioSkinModalOpen === undefined) state.studioSkinModalOpen = false;
if (state.studioSkinModalPage === undefined) state.studioSkinModalPage = 0;
if (state.studioSkinCategory === undefined) state.studioSkinCategory = 'ALL';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 6.0;
const ZOOM_STEP = 0.3;
const ZOOM_DEFAULT = 2.4;

// Interactive Drag States
let isDraggingHairCenter = false;
let isDraggingHairScale = false;
let isDraggingHairRotate = false;
let _copyToastText = '';
let _copyToastTimer = 0;

// Fighter Category Tabs in Skin Studio Modal
export const SKIN_STUDIO_CATEGORIES = [
  { id: 'ALL', label: 'ALL (21)', filter: () => true },
  { id: 'JJK', label: 'JJK (8)', filter: (f) => ['ichigo', 'gojo', 'sukuna', 'yuji', 'yuta', 'toji', 'nanami', 'mahito'].includes(f.key) },
  { id: 'CHAINSAW', label: 'CSM (3)', filter: (f) => ['makima', 'reze', 'power'].includes(f.key) },
  { id: 'SLAYER', label: 'SLAYER (3)', filter: (f) => ['tanjiro', 'zenitsu', 'nezuko'].includes(f.key) },
  { id: 'ARCADE', label: 'ARCADE (7)', filter: (f) => ['genos', 'escanor', 'zeus', 'cronus', 'bomber', 'black', 'knight'].includes(f.key) }
];

// Fighter Definitions in Skin Studio
export const SKIN_STUDIO_FIGHTERS = [
  {
    key: 'ichigo',
    label: 'ICHIGO',
    asset: 'Ichigo-hair.png',
    assetDims: '1448 x 1086',
    baseW: 2.92,
    baseH: 1.76,
    baseCrownY: -1.30,
    visW: 951,
    visH: 819,
    centerX: 705,
    topY: 105,
    themeColor: '#f97316',
    forms: [
      { id: 'shikai', label: 'SHIKAI' },
      { id: 'bankai', label: 'BANKAI' },
      { id: 'mask', label: 'HOLLOW MASK' }
    ]
  },
  {
    key: 'gojo',
    label: 'GOJO',
    asset: 'Gojo-hair.png',
    assetDims: '1254 x 1254',
    baseW: 3.10,
    baseH: 1.80,
    baseCrownY: -1.42,
    visW: 968,
    visH: 779,
    centerX: 620,
    topY: 203,
    themeColor: '#00d4ff',
    forms: [
      { id: 'normal', label: 'BLINDFOLD' },
      { id: 'unmasked', label: 'UNMASKED' }
    ]
  },
  {
    key: 'makima',
    label: 'MAKIMA',
    asset: 'Makima-hair.png',
    assetDims: '522 x 478',
    baseW: 2.30,
    baseH: 2.25,
    baseCrownY: -1.28,
    visW: 322,
    visH: 408,
    centerX: 249.5,
    topY: 43,
    themeColor: '#f43f5e',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'reze',
    label: 'REZE',
    asset: 'Reze-hair.png',
    assetDims: '500 x 500',
    baseW: 2.30,
    baseH: 1.95,
    baseCrownY: -1.20,
    visW: 260,
    visH: 288,
    centerX: 246,
    topY: 80,
    themeColor: '#a855f7',
    forms: [
      { id: 'human', label: 'HUMAN BOB' },
      { id: 'bomb', label: 'BOMB DEVIL' }
    ]
  },
  {
    key: 'sukuna',
    label: 'SUKUNA',
    asset: 'Sukuna-hair.png',
    assetDims: '1254 x 1254',
    baseW: 2.90,
    baseH: 2.25,
    baseCrownY: -1.70,
    visW: 925,
    visH: 749,
    centerX: 626,
    topY: 226,
    themeColor: '#ef4444',
    forms: [
      { id: 'normal', label: 'YUJI VESSEL' },
      { id: 'megumi', label: 'MEGUMI VESSEL' }
    ]
  },
  {
    key: 'yuji',
    label: 'YUJI',
    asset: 'Yuji-hair.png',
    assetDims: '1345 x 1170',
    baseW: 2.85,
    baseH: 2.05,
    baseCrownY: -1.45,
    visW: 1042,
    visH: 860,
    centerX: 668.5,
    topY: 140,
    themeColor: '#d95c7e',
    forms: [
      { id: 'normal', label: 'STANDARD' },
      { id: 'sukuna', label: 'SOUL SWAP' }
    ]
  },
  {
    key: 'yuta',
    label: 'YUTA',
    asset: 'Yuta-hair.png',
    assetDims: '577 x 433',
    baseW: 2.40,
    baseH: 1.80,
    baseCrownY: -1.25,
    visW: 421,
    visH: 327,
    centerX: 282,
    topY: 82,
    themeColor: '#ec4899',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'toji',
    label: 'TOJI',
    asset: 'toji-hair.png',
    assetDims: '1345 x 1170',
    baseW: 2.45,
    baseH: 1.85,
    baseCrownY: -1.30,
    visW: 1274,
    visH: 960,
    centerX: 677.5,
    topY: 86,
    themeColor: '#7D3224',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'tanjiro',
    label: 'TANJIRO',
    asset: 'TANJRO-HAIR-MODEL.png',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#10b981',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'zenitsu',
    label: 'ZENITSU',
    asset: 'zenitsu-hair.png',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#eab308',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'nezuko',
    label: 'NEZUKO',
    asset: 'Nezuko-hair.png',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#f472b6',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'power',
    label: 'POWER',
    asset: 'Power-hair.png',
    assetDims: 'Procedural / PNG',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#fb923c',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'zeus',
    label: 'ZEUS',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#00bfff',
    forms: [
      { id: 'default', label: 'OLYMPIAN' },
      { id: 'storm', label: 'DIVINE WRATH' }
    ]
  },
  {
    key: 'cronos',
    label: 'CRONUS',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#00F3FF',
    forms: [
      { id: 'default', label: 'TITAN KING' },
      { id: 'sphere', label: 'TIME STOP' }
    ]
  },
  {
    key: 'bomber',
    label: 'BOMBER',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#F59E0B',
    forms: [
      { id: 'default', label: 'DEMOLITIONIST' }
    ]
  },
  {
    key: 'black',
    label: 'VOIDMASTER',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#9333EA',
    forms: [
      { id: 'default', label: 'ABYSSAL SOVEREIGN' }
    ]
  },
  {
    key: 'knight',
    label: 'KNIGHT',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#94A3B8',
    forms: [
      { id: 'default', label: 'ROYAL PALADIN' }
    ]
  },
  {
    key: 'nanami',
    label: 'NANAMI',
    asset: 'Nanami-hair.png',
    assetDims: '1345 x 1170',
    baseW: 2.45,
    baseH: 1.55,
    baseCrownY: -1.15,
    visW: 1252,
    visH: 797,
    centerX: 698.5,
    topY: 250,
    themeColor: '#eab308',
    forms: [
      { id: 'default', label: 'STANDARD' },
      { id: 'overtime', label: 'OVERTIME (120%)' }
    ]
  },
  {
    key: 'mahito',
    label: 'MAHITO',
    asset: 'Mahito-hair.png',
    assetDims: '536 x 466',
    baseW: 2.35,
    baseH: 2.64,
    baseCrownY: -1.25,
    visW: 408,
    visH: 458,
    centerX: 267.5,
    topY: 6,
    themeColor: '#d946ef',
    forms: [
      { id: 'default', label: 'STANDARD' },
      { id: 'distorted', label: 'ISBODK CARAPACE' }
    ]
  },
  {
    key: 'genos',
    label: 'GENOS',
    asset: 'Genos-hair.png',
    assetDims: '500 x 500',
    baseW: 2.80,
    baseH: 2.10,
    baseCrownY: -1.35,
    visW: 405,
    visH: 328,
    centerX: 253,
    topY: 81,
    themeColor: '#ff7700',
    forms: [
      { id: 'default', label: 'DEMON CYBORG' }
    ]
  },
  {
    key: 'escanor',
    label: 'ESCANOR',
    asset: 'Escanor-hair.png',
    assetDims: '500 x 500',
    baseW: 2.30,
    baseH: 1.80,
    baseCrownY: -1.15,
    visW: 280,
    visH: 220,
    centerX: 251.5,
    topY: 122,
    themeColor: '#f59e0b',
    forms: [
      { id: 'default', label: 'DAY FORM' },
      { id: 'theOne', label: 'THE ONE' }
    ]
  }
];

function ensureFighterCustom(key) {
  if (!state.skinCustomizations) state.skinCustomizations = {};
  if (!state.skinCustomizations[key]) {
    state.skinCustomizations[key] = {
      widthScale: 1.0,
      heightScale: 1.0,
      offsetX: 0,
      offsetY: 0,
      angleOffset: 0,
      flipX: false
    };
  }
  return state.skinCustomizations[key];
}

/**
 * Generates copy-pasteable JavaScript code block reflecting current customizations.
 */
function generateJsCode(fDef, custom) {
  const wMult = (custom.widthScale ?? 1.0).toFixed(2);
  const hMult = (custom.heightScale ?? 1.0).toFixed(2);
  const offX = Math.round(custom.offsetX ?? 0);
  const offY = Math.round(custom.offsetY ?? 0);
  const rot = (custom.angleOffset ?? 0).toFixed(2);

  const targetW = (fDef.baseW * (custom.widthScale ?? 1.0)).toFixed(2);
  const targetH = (fDef.baseH * (custom.heightScale ?? 1.0)).toFixed(2);
  const crownY = fDef.baseCrownY ? fDef.baseCrownY.toFixed(2) : '-1.30';

  if (fDef.key === 'ichigo') {
    return `// Calibrated Hair for Ichigo (Assets/model/Ichigo-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 951;\n` +
           `const scaleY = targetHairHeight / 819;\n` +
           `const drawW = 1448 * scaleX;\n` +
           `const drawH = 1086 * scaleY;\n` +
           `const drawX = -705 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 105 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'gojo') {
    return `// Calibrated Hair for Gojo (Assets/model/Gojo-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 968;\n` +
           `const scaleY = targetHairHeight / 779;\n` +
           `const drawW = 1254 * scaleX;\n` +
           `const drawH = 1254 * scaleY;\n` +
           `const drawX = -620 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 203 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'makima') {
    return `// Calibrated Hair for Makima (Assets/model/Makima-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const scaleX = targetHairWidth / 322;\n` +
           `const scaleY = scaleX * 0.98 * ${hMult};\n` +
           `const drawW = 522 * scaleX;\n` +
           `const drawH = 478 * scaleY;\n` +
           `const drawX = -249.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 43 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'reze') {
    return `// Calibrated Hair for Reze (Assets/model/Reze-hair.png)\n` +
           `const targetDomeWidth = r * ${targetW};\n` +
           `const scaleX = targetDomeWidth / 260;\n` +
           `const scaleY = ((r * ${targetH}) / 260);\n` +
           `const drawW = 500 * scaleX;\n` +
           `const drawH = 500 * scaleY;\n` +
           `const drawX = -246 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 80 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'sukuna') {
    return `// Calibrated Hair for Sukuna (Assets/model/Sukuna-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 925;\n` +
           `const scaleY = targetHairHeight / 749;\n` +
           `const drawW = 1254 * scaleX;\n` +
           `const drawH = 1254 * scaleY;\n` +
           `const drawX = -626 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 226 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'yuji') {
    return `// Calibrated Hair for Yuji (Assets/model/Yuji-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1042;\n` +
           `const scaleY = targetHairHeight / 860;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -668.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 140 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'yuta') {
    return `// Calibrated Hair for Yuta (Assets/model/Yuta-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 421;\n` +
           `const scaleY = targetHairHeight / 327;\n` +
           `const drawW = 577 * scaleX;\n` +
           `const drawH = 433 * scaleY;\n` +
           `const drawX = -282 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 82 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'toji') {
    return `// Calibrated Hair for Toji (Assets/model/toji-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1123;\n` +
           `const scaleY = targetHairHeight / 908;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -686 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 136 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'nanami') {
    return `// Calibrated Hair for Nanami (Assets/model/Nanami-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1252;\n` +
           `const scaleY = targetHairHeight / 797;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -698.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 250 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'mahito') {
    return `// Calibrated Hair for Mahito (Assets/model/Mahito-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 408;\n` +
           `const scaleY = targetHairHeight / 458;\n` +
           `const drawW = 536 * scaleX;\n` +
           `const drawH = 466 * scaleY;\n` +
           `const drawX = -267.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 6 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'escanor') {
    return `// Calibrated Hair for Escanor (Assets/model/Escanor-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 280;\n` +
           `const scaleY = targetHairHeight / 220;\n` +
           `const drawW = 500 * scaleX;\n` +
           `const drawH = 500 * scaleY;\n` +
           `const drawX = -251.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 122 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  }
  return `// Skin Customization Parameters\n` +
         `widthScale: ${wMult},\n` +
         `heightScale: ${hMult},\n` +
         `offsetX: ${offX},\n` +
         `offsetY: ${offY},\n` +
         `angleOffset: ${rot}`;
}

export function drawSkinStudioScreen() {
  const { ctx, canvas } = state;

  // 1. Reset Context
  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Gunmetal Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#07080c');
  bgGrad.addColorStop(0.5, '#10131c');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activeKey = state.studioSelectedSkinFighter || 'ichigo';
  const fDef = SKIN_STUDIO_FIGHTERS.find(f => f.key === activeKey) || SKIN_STUDIO_FIGHTERS[0];
  const themeColor = fDef.themeColor || '#f97316';
  const custom = ensureFighterCustom(fDef.key);

  // ── Tier 1: Header Section ──
  ctx.fillStyle = '#64748b';
  ctx.font = '900 10px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CIRCLE BATTLE // SKIN & HAIR STUDIO // SYS.v2.5', canvas.width / 2, 40);

  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 18px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText('[ SKIN & HAIR STUDIO ]', canvas.width / 2, 58);
  ctx.restore();

  // Prominent Fighter Selector Pill Button (Click to open Fighter Modal)
  const selBtnW = 380;
  const selBtnH = 30;
  const selBtnX = (canvas.width - selBtnW) / 2;
  const selBtnY = 68;

  ctx.save();
  ctx.fillStyle = 'rgba(16, 20, 28, 0.94)';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.6;
  drawChamferedRect(ctx, selBtnX, selBtnY, selBtnW, selBtnH, 5);
  ctx.fill();
  ctx.stroke();

  // Fighter Theme Color Accent Dot
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.arc(selBtnX + 16, selBtnY + selBtnH / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Selected Fighter Label
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 12px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`EDITING: ${fDef.label}`, selBtnX + 28, selBtnY + selBtnH / 2);

  // Asset subtitle
  const displayAsset = fDef.asset.length > 22 ? fDef.asset.slice(0, 20) + '…' : fDef.asset;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 9px "Rajdhani", monospace';
  const nameW = ctx.measureText(`EDITING: ${fDef.label}`).width;
  ctx.fillText(`(${displayAsset})`, selBtnX + 28 + nameW + 8, selBtnY + selBtnH / 2);

  // Modal Open Prompt on right
  ctx.fillStyle = themeColor;
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SELECT FIGHTER ▾', selBtnX + selBtnW - 12, selBtnY + selBtnH / 2);
  ctx.restore();

  _registerButton(selBtnX, selBtnY, selBtnW, selBtnH, () => {
    state.studioSkinModalOpen = true;
  });

  // ── Tier 2: Viewport Stage ──
  const viewportX = 16;
  const viewportY = 110;
  const viewportW = canvas.width - 32; // 508px
  const viewportH = 372;
  const heroX = canvas.width / 2;
  const heroY = viewportY + viewportH / 2 + 10;

  // Viewport Container Panel
  drawPanel(viewportX, viewportY, viewportW, viewportH, 0.94, 8);

  // Background inside Viewport
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(ctx, viewportX + 1, viewportY + 1, viewportW - 2, viewportH - 2, 7);
  ctx.clip();

  // Background Fill (White / Dark Grid / Magenta)
  if (state.studioSkinBg === 'dark') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH);
    // Draw subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let gx = viewportX; gx < viewportX + viewportW; gx += 20) {
      ctx.beginPath(); ctx.moveTo(gx, viewportY); ctx.lineTo(gx, viewportY + viewportH); ctx.stroke();
    }
    for (let gy = viewportY; gy < viewportY + viewportH; gy += 20) {
      ctx.beginPath(); ctx.moveTo(viewportX, gy); ctx.lineTo(viewportX + viewportW, gy); ctx.stroke();
    }
  } else if (state.studioSkinBg === 'magenta') {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH);
  } else {
    // Default Clean White Review Stage
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH);
    // Faint grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    for (let gx = viewportX; gx < viewportX + viewportW; gx += 20) {
      ctx.beginPath(); ctx.moveTo(gx, viewportY); ctx.lineTo(gx, viewportY + viewportH); ctx.stroke();
    }
    for (let gy = viewportY; gy < viewportY + viewportH; gy += 20) {
      ctx.beginPath(); ctx.moveTo(viewportX, gy); ctx.lineTo(viewportX + viewportW, gy); ctx.stroke();
    }
  }

  // Crosshair / Alignment Guide Lines
  if (state.studioSkinShowGuides) {
    ctx.strokeStyle = state.studioSkinBg === 'white' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // Center X
    ctx.beginPath(); ctx.moveTo(heroX, viewportY); ctx.lineTo(heroX, viewportY + viewportH); ctx.stroke();
    // Center Y
    ctx.beginPath(); ctx.moveTo(viewportX, heroY); ctx.lineTo(viewportX + viewportW, heroY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Render Hero Fighter / Hair Preview ──
  const currentScale = state.studioSkinPreviewScale;
  ctx.save();
  ctx.translate(heroX, heroY);
  ctx.scale(currentScale, currentScale);

  const baseRadius = 25;
  const isFacingLeft = state.studioSkinFacing === 'left';
  const aimAngle = isFacingLeft ? Math.PI : 0;

  // Render Base Body if toggled on
  if (state.studioSkinShowBody) {
    const dummyFighter = {
      x: 0,
      y: 0,
      r: baseRadius,
      gunAngle: aimAngle,
      angle: aimAngle,
      _isWinnerReveal: true, // Clean upright presentation
      characterId: fDef.key,
      type: fDef.key,
      color: themeColor,
      hideFrontHand: true,
      hideBackHand: true,
      isShikai: state.studioSkinForm === 'shikai',
      isBankai: state.studioSkinForm === 'bankai' || state.studioSkinForm === 'mask',
      isHybridModeActive: state.studioSkinForm === 'bomb',
      isUnmasked: state.studioSkinForm === 'unmasked',
      isMegumiForm: state.studioSkinForm === 'megumi'
    };

    try {
      if (fDef.key === 'ichigo') {
        const origMask = state.showHollowMask;
        state.showHollowMask = (state.studioSkinForm === 'mask');
        drawIchigoSkin(ctx, dummyFighter);
        state.showHollowMask = origMask;
      } else if (fDef.key === 'gojo') {
        drawGojoBody(ctx, dummyFighter);
      } else if (fDef.key === 'makima') {
        drawMakimaSkin(ctx, dummyFighter);
      } else if (fDef.key === 'reze') {
        drawRezeSkin(ctx, dummyFighter);
      } else if (fDef.key === 'sukuna') {
        drawSukunaBody(ctx, dummyFighter);
      } else if (fDef.key === 'yuji') {
        const origSoulSwap = dummyFighter.soulSwapActive;
        dummyFighter.soulSwapActive = (state.studioSkinForm === 'sukuna');
        drawYujiSkin(ctx, dummyFighter);
        dummyFighter.soulSwapActive = origSoulSwap;
      } else if (fDef.key === 'yuta') {
        drawYutaSkin(ctx, dummyFighter);
      } else if (fDef.key === 'toji') {
        drawTojiSkin(ctx, dummyFighter);
      } else if (fDef.key === 'tanjiro') {
        drawTanjiroSkin(ctx, dummyFighter);
      } else if (fDef.key === 'zenitsu') {
        drawZenitsuSkin(ctx, dummyFighter);
      } else if (fDef.key === 'nezuko') {
        drawNezukoSkin(ctx, dummyFighter);
      } else if (fDef.key === 'power') {
        drawPowerSkin(ctx, dummyFighter);
      } else if (fDef.key === 'zeus') {
        const origStorm = dummyFighter.stormActive;
        dummyFighter.stormActive = (state.studioSkinForm === 'storm');
        drawZeusSkin(ctx, dummyFighter);
        dummyFighter.stormActive = origStorm;
      } else if (fDef.key === 'cronos') {
        const origSphere = dummyFighter.sphereActive;
        const origTimer = dummyFighter.sphereTimer;
        dummyFighter.sphereActive = (state.studioSkinForm === 'sphere');
        dummyFighter.sphereTimer = (state.studioSkinForm === 'sphere') ? 300 : 0;
        drawCronosSkin(ctx, dummyFighter);
        dummyFighter.sphereActive = origSphere;
        dummyFighter.sphereTimer = origTimer;
      } else if (fDef.key === 'bomber') {
        drawBomberPixelBody(ctx, baseRadius, false);
      } else if (fDef.key === 'black') {
        drawVoidmasterPixelBody(ctx, baseRadius, false);
      } else if (fDef.key === 'knight') {
        drawKnightPixelBody(ctx, baseRadius, false);
      } else if (fDef.key === 'nanami') {
        dummyFighter.isOvertimeActive = (state.studioSkinForm === 'overtime');
        drawNanamiSkin(ctx, dummyFighter);
      } else if (fDef.key === 'mahito') {
        dummyFighter.isTransformed = (state.studioSkinForm === 'distorted');
        drawMahitoSkin(ctx, dummyFighter);
      } else if (fDef.key === 'genos') {
        drawGenosSkin(ctx, dummyFighter);
        drawGenosHands(ctx, dummyFighter);
      } else if (fDef.key === 'escanor') {
        dummyFighter.isTheOneActive = (state.studioSkinForm === 'theOne');
        drawEscanorSkin(ctx, dummyFighter);
      }
    } catch (renderErr) {
      console.error('Skin render error in studio:', renderErr);
    }
  } else {
    // If body is hidden, isolate hair alone
    ctx.save();
    if (isFacingLeft) ctx.scale(1, -1);
    if (fDef.key === 'ichigo') _drawIchigoHair(ctx, baseRadius, isFacingLeft);
    else if (fDef.key === 'gojo') _drawGojoHair(ctx, baseRadius, isFacingLeft);
    else if (fDef.key === 'makima') _drawMakimaHair(ctx, baseRadius, isFacingLeft);
    else if (fDef.key === 'reze') _drawRezeHair(ctx, baseRadius, isFacingLeft);
    else if (fDef.key === 'sukuna') _drawSukunaHair(ctx, baseRadius, isFacingLeft);
    else if (fDef.key === 'yuji') {
      if (state.studioSkinForm === 'sukuna') {
        _drawSukunaHair(ctx, baseRadius, isFacingLeft);
      } else {
        _drawYujiHair(ctx, baseRadius, isFacingLeft);
      }
    } else if (fDef.key === 'yuta') {
      _drawYutaHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'toji') {
      _drawTojiHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'nanami') {
      _drawNanamiHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'mahito') {
      _drawMahitoHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'genos') {
      _drawGenosHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'escanor') {
      _drawEscanorHair(ctx, baseRadius, isFacingLeft);
    }
    ctx.restore();
  }

  // Interactive Drag Handles & Guide Overlays on Hero Hair
  if (state.studioSkinShowGuides) {
    const handleCenterX = custom.offsetX;
    const handleCenterY = (fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3) + custom.offsetY;

    // Center Anchor Drag Handle (Cyan Diamond)
    ctx.save();
    ctx.translate(handleCenterX, handleCenterY);
    ctx.fillStyle = '#06b6d4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / currentScale;
    ctx.beginPath();
    const handleSize = 6 / currentScale;
    ctx.moveTo(0, -handleSize);
    ctx.lineTo(handleSize, 0);
    ctx.lineTo(0, handleSize);
    ctx.lineTo(-handleSize, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Scale Drag Handle (Amber Circle on top right)
    const scaleHandleX = handleCenterX + (baseRadius * 1.4 * (custom.widthScale ?? 1.0));
    const scaleHandleY = handleCenterY - (baseRadius * 0.8 * (custom.heightScale ?? 1.0));
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / currentScale;
    ctx.beginPath();
    ctx.arc(scaleHandleX, scaleHandleY, 5 / currentScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // Exit Viewport transform
  ctx.restore(); // Exit Viewport clip

  // ── Viewport Control Bar Overlay (Top of Viewport) ──
  const topBarY = viewportY + 10;
  let topBarX = viewportX + 12;

  // Facing Toggle Button
  const facingLabel = `FACING: ${state.studioSkinFacing.toUpperCase()}`;
  drawButton(facingLabel, topBarX + 45, topBarY + 10, () => {
    state.studioSkinFacing = (state.studioSkinFacing === 'right') ? 'left' : 'right';
  }, 90, 20, null, 3);
  topBarX += 98;

  // Form Selector Button (if fighter has multiple forms)
  if (fDef.forms && fDef.forms.length > 1) {
    const currentFormDef = fDef.forms.find(fm => fm.id === state.studioSkinForm) || fDef.forms[0];
    drawButton(`FORM: ${currentFormDef.label}`, topBarX + 55, topBarY + 10, () => {
      const idx = fDef.forms.findIndex(fm => fm.id === state.studioSkinForm);
      const nextIdx = (idx + 1) % fDef.forms.length;
      state.studioSkinForm = fDef.forms[nextIdx].id;
    }, 110, 20, null, 3);
    topBarX += 118;
  }

  // Body Toggle Button
  const bodyLabel = state.studioSkinShowBody ? 'BODY: ON' : 'BODY: OFF';
  drawButton(bodyLabel, topBarX + 40, topBarY + 10, () => {
    state.studioSkinShowBody = !state.studioSkinShowBody;
  }, 80, 20, null, 3);
  topBarX += 88;

  // Background Theme Toggle Button
  const bgLabel = `BG: ${state.studioSkinBg.toUpperCase()}`;
  drawButton(bgLabel, topBarX + 35, topBarY + 10, () => {
    if (state.studioSkinBg === 'white') state.studioSkinBg = 'dark';
    else if (state.studioSkinBg === 'dark') state.studioSkinBg = 'magenta';
    else state.studioSkinBg = 'white';
  }, 70, 20, null, 3);
  topBarX += 78;

  // Guides Toggle Button
  const guidesLabel = state.studioSkinShowGuides ? 'GUIDES: ON' : 'GUIDES: OFF';
  drawButton(guidesLabel, topBarX + 40, topBarY + 10, () => {
    state.studioSkinShowGuides = !state.studioSkinShowGuides;
  }, 80, 20, null, 3);

  // ── Viewport Zoom Controls (Bottom of Viewport) ──
  const zoomY = viewportY + viewportH - 22;
  const zoomCenterX = heroX;
  const zoomPct = Math.round((currentScale / ZOOM_DEFAULT) * 100);

  drawButton('−', zoomCenterX - 85, zoomY, () => {
    state.studioSkinPreviewScale = Math.max(ZOOM_MIN, state.studioSkinPreviewScale - ZOOM_STEP);
  }, 26, 18, null, 3);

  // Zoom track bar
  const trackW = 90;
  const trackH = 6;
  const trackX = zoomCenterX - trackW / 2;
  const trackY = zoomY - 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, trackX, trackY, trackW, trackH, 2);
  ctx.fill();
  ctx.stroke();

  const zoomFrac = (currentScale - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  const fillW = Math.max(4, zoomFrac * trackW);
  ctx.fillStyle = themeColor;
  drawChamferedRect(ctx, trackX, trackY, fillW, trackH, 2);
  ctx.fill();

  drawButton('+', zoomCenterX + 85, zoomY, () => {
    state.studioSkinPreviewScale = Math.min(ZOOM_MAX, state.studioSkinPreviewScale + ZOOM_STEP);
  }, 26, 18, null, 3);

  drawButton('⟲', zoomCenterX + 120, zoomY, () => {
    state.studioSkinPreviewScale = ZOOM_DEFAULT;
  }, 22, 18, null, 3);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 9.5px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`ZOOM: ${zoomPct}%`, zoomCenterX, zoomY - 7);

  // ── Tier 3: Dual Parameter Console ──
  const consoleY = viewportY + viewportH + 10; // 500
  const consoleH = 345;
  const consoleGap = 12;
  const leftConsoleW = Math.floor((viewportW - consoleGap) * 0.44); // 218px
  const rightConsoleW = viewportW - leftConsoleW - consoleGap; // 278px
  const leftConsoleX = viewportX; // 16px
  const rightConsoleX = leftConsoleX + leftConsoleW + consoleGap; // 246px

  // Left Console Panel (Navigation Tabs)
  drawPanel(leftConsoleX, consoleY, leftConsoleW, consoleH, 0.92, 8);
  // Right Console Panel (Precision Metric Controls)
  drawPanel(rightConsoleX, consoleY, rightConsoleW, consoleH, 0.92, 8);

  // Console Headers
  ctx.fillStyle = themeColor;
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ASSET CALIBRATION TABS //', leftConsoleX + 12, consoleY + 12);
  ctx.fillText('PRECISION PARAMETERS //', rightConsoleX + 12, consoleY + 12);

  // Auto-save indicator badge
  ctx.fillStyle = '#059669';
  ctx.font = '900 8.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('● AUTO-SAVED', rightConsoleX + rightConsoleW - 12, consoleY + 12);

  // CRITICAL: Always reset text alignment to 'left' and 'top' to prevent coordinates overflow
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const tabs = [
    { id: 'scale', label: '1. HAIR SCALE / SIZE', desc: 'Width & Height multipliers' },
    { id: 'position', label: '2. POSITION & SHIFT', desc: 'X/Y & Crown elevation offsets' },
    { id: 'rotation', label: '3. ROTATION & ANGLE', desc: 'Tilt, sweep & orientation' },
    { id: 'export', label: '4. LIVE CODE EXPORT', desc: 'Copy ready-to-paste JS code' }
  ];

  // Left Console: Tab Cards
  tabs.forEach((tab, idx) => {
    const cardY = consoleY + 32 + idx * 54;
    const cardW = leftConsoleW - 20;
    const cardH = 46;
    const cardX = leftConsoleX + 10;
    const isSelected = state.studioSkinDetailTab === tab.id;

    ctx.save();
    if (isSelected) {
      ctx.fillStyle = `${themeColor}28`;
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.4;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 32, 0.90)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 1;
    }
    drawChamferedRect(ctx, cardX, cardY, cardW, cardH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.fillText(tab.label, cardX + 8, cardY + 8);

    ctx.fillStyle = isSelected ? `${themeColor}` : '#64748b';
    ctx.font = '700 8.5px "Rajdhani", sans-serif';
    ctx.fillText(tab.desc, cardX + 8, cardY + 24);

    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.studioSkinDetailTab = tab.id;
    });
  });

  // Fighter Info Box in Left Console Bottom
  const infoCardX = leftConsoleX + 10;
  const infoCardY = consoleY + 252;
  const infoCardW = leftConsoleW - 20;
  const infoCardH = 80;

  ctx.save();
  ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, infoCardX, infoCardY, infoCardW, infoCardH, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748b';
  ctx.font = '900 8.5px "Rajdhani", monospace';
  ctx.fillText(`MODEL: ${fDef.label}`, infoCardX + 8, infoCardY + 8);
  ctx.fillText(`ASSET: ${fDef.asset}`, infoCardX + 8, infoCardY + 24);
  ctx.fillText(`DIMS: ${fDef.assetDims || 'Standard'}`, infoCardX + 8, infoCardY + 40);
  ctx.fillText(`BASE: ${fDef.baseW}r W | ${fDef.baseH}r H`, infoCardX + 8, infoCardY + 56);

  // Right Console: Parameter Controls
  let curY = consoleY + 32;
  const rowX = rightConsoleX + 10;
  const rowW = rightConsoleW - 20;
  const rowH = 40;

  if (state.studioSkinDetailTab === 'scale') {
    // ── WIDTH SCALE ROW ──
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const curW = (fDef.baseW * (custom.widthScale ?? 1.0)).toFixed(2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`WIDTH: ${(custom.widthScale ?? 1.0).toFixed(2)}x (${curW}r)`, rowX + 8, curY + rowH / 2);

    // Fine [-] [+] and Coarse [--] [++]
    const btnSize = 18;
    const btnY = curY + rowH / 2;
    drawButton('−−', rowX + rowW - 74, btnY, () => {
      custom.widthScale = Math.max(0.2, Number(((custom.widthScale ?? 1.0) - 0.10).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('−', rowX + rowW - 52, btnY, () => {
      custom.widthScale = Math.max(0.2, Number(((custom.widthScale ?? 1.0) - 0.02).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('+', rowX + rowW - 30, btnY, () => {
      custom.widthScale = Math.min(3.5, Number(((custom.widthScale ?? 1.0) + 0.02).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('++', rowX + rowW - 8, btnY, () => {
      custom.widthScale = Math.min(3.5, Number(((custom.widthScale ?? 1.0) + 0.10).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    curY += 46;

    // ── HEIGHT SCALE ROW ──
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const curH = (fDef.baseH * (custom.heightScale ?? 1.0)).toFixed(2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`HEIGHT: ${(custom.heightScale ?? 1.0).toFixed(2)}x (${curH}r)`, rowX + 8, curY + rowH / 2);

    drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
      custom.heightScale = Math.max(0.2, Number(((custom.heightScale ?? 1.0) - 0.10).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
      custom.heightScale = Math.max(0.2, Number(((custom.heightScale ?? 1.0) - 0.02).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
      custom.heightScale = Math.min(3.5, Number(((custom.heightScale ?? 1.0) + 0.02).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
      custom.heightScale = Math.min(3.5, Number(((custom.heightScale ?? 1.0) + 0.10).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    curY += 46;

    // ── UNIFORM PROPORTIONAL SCALE ROW ──
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.fillText(`UNIFORM (BOTH)`, rowX + 8, curY + rowH / 2);

    drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
      custom.widthScale = Math.max(0.2, Number(((custom.widthScale ?? 1.0) - 0.10).toFixed(2)));
      custom.heightScale = Math.max(0.2, Number(((custom.heightScale ?? 1.0) - 0.10).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
      custom.widthScale = Math.max(0.2, Number(((custom.widthScale ?? 1.0) - 0.02).toFixed(2)));
      custom.heightScale = Math.max(0.2, Number(((custom.heightScale ?? 1.0) - 0.02).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
      custom.widthScale = Math.min(3.5, Number(((custom.widthScale ?? 1.0) + 0.02).toFixed(2)));
      custom.heightScale = Math.min(3.5, Number(((custom.heightScale ?? 1.0) + 0.02).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
      custom.widthScale = Math.min(3.5, Number(((custom.widthScale ?? 1.0) + 0.10).toFixed(2)));
      custom.heightScale = Math.min(3.5, Number(((custom.heightScale ?? 1.0) + 0.10).toFixed(2)));
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    curY += 46;

    // Scale Reset button & Tip
    drawButton('RESET SCALE (1.0x, 1.0x)', rowX + rowW / 2, curY + 12, () => {
      custom.widthScale = 1.0;
      custom.heightScale = 1.0;
      saveSkinCustomizations();
    }, rowW, 22, null, 3);
    curY += 34;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.fillText('TIP: DRAG AMBER HANDLE IN VIEWPORT', rowX, curY + 4);
    ctx.fillText('FOR REAL-TIME VISUAL SCALING', rowX, curY + 18);

  } else if (state.studioSkinDetailTab === 'position') {
    // ── OFFSET X ROW ──
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`SHIFT (X): ${Math.round(custom.offsetX ?? 0)}px`, rowX + 8, curY + rowH / 2);

    const btnSize = 18;
    drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
      custom.offsetX = (custom.offsetX ?? 0) - 5;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
      custom.offsetX = (custom.offsetX ?? 0) - 1;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
      custom.offsetX = (custom.offsetX ?? 0) + 1;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
      custom.offsetX = (custom.offsetX ?? 0) + 5;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    curY += 46;

    // ── OFFSET Y ROW ──
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`SHIFT (Y): ${Math.round(custom.offsetY ?? 0)}px`, rowX + 8, curY + rowH / 2);

    drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
      custom.offsetY = (custom.offsetY ?? 0) - 5;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
      custom.offsetY = (custom.offsetY ?? 0) - 1;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
      custom.offsetY = (custom.offsetY ?? 0) + 1;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
      custom.offsetY = (custom.offsetY ?? 0) + 5;
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    curY += 46;

    // Quick Reset Position Button
    drawButton('CENTER POSITION (0, 0)', rowX + rowW / 2, curY + 12, () => {
      custom.offsetX = 0;
      custom.offsetY = 0;
      saveSkinCustomizations();
    }, rowW, 22, null, 3);
    curY += 38;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.fillText('TIP: DRAG CYAN HANDLE IN VIEWPORT', rowX, curY + 4);
    ctx.fillText('TO FREELY TRANSLATE HAIR POSITION', rowX, curY + 18);

  } else if (state.studioSkinDetailTab === 'rotation') {
    // ── ROTATION ANGLE ROW ──
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const deg = Math.round((custom.angleOffset ?? 0) * (180 / Math.PI));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`ANGLE: ${deg}°`, rowX + 8, curY + rowH / 2);

    const btnSize = 18;
    drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
      custom.angleOffset = (custom.angleOffset ?? 0) - (5 * Math.PI / 180);
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
      custom.angleOffset = (custom.angleOffset ?? 0) - (1 * Math.PI / 180);
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
      custom.angleOffset = (custom.angleOffset ?? 0) + (1 * Math.PI / 180);
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
      custom.angleOffset = (custom.angleOffset ?? 0) + (5 * Math.PI / 180);
      saveSkinCustomizations();
    }, 18, btnSize, null, 2);
    curY += 46;

    // Reset Angle
    drawButton('RESET ANGLE (0°)', rowX + rowW / 2, curY + 12, () => {
      custom.angleOffset = 0;
      saveSkinCustomizations();
    }, rowW, 22, null, 3);
    curY += 38;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.fillText('USE STEPPERS TO FINE-TUNE SWEEP ANGLE', rowX, curY + 4);
    ctx.fillText('TO PERFECTLY MATCH HEAD PROFILE', rowX, curY + 18);

  } else if (state.studioSkinDetailTab === 'export') {
    // ── LIVE JS CODE EXPORT ──
    const jsCode = generateJsCode(fDef, custom);

    // Code Box
    const codeBoxX = rowX;
    const codeBoxY = curY;
    const codeBoxW = rowW;
    const codeBoxH = 195;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 16, 0.95)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Render formatted code lines
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = jsCode.split('\n');
    lines.forEach((line, lIdx) => {
      if (codeBoxY + 8 + lIdx * 14 < codeBoxY + codeBoxH - 8) {
        ctx.fillText(line, codeBoxX + 8, codeBoxY + 8 + lIdx * 14);
      }
    });

    curY += codeBoxH + 10;

    // Single click Copy Code Button
    const halfBtnW = Math.floor((rowW - 8) / 2);
    drawButton('📋 COPY JS', rowX + halfBtnW / 2, curY + 10, () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(jsCode).then(() => {
          _copyToastText = '✓ COPIED JS CODE!';
          _copyToastTimer = 90;
        }).catch(() => {
          _copyToastText = 'COPIED!';
          _copyToastTimer = 60;
        });
      }
    }, halfBtnW, 22, null, 3);

    drawButton('📋 COPY JSON', rowX + halfBtnW + 8 + halfBtnW / 2, curY + 10, () => {
      const jsonStr = JSON.stringify(custom, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(jsonStr).then(() => {
          _copyToastText = '✓ COPIED JSON CONFIG!';
          _copyToastTimer = 90;
        }).catch(() => {
          _copyToastText = 'COPIED!';
          _copyToastTimer = 60;
        });
      }
    }, halfBtnW, 22, null, 3);
  }

  // Toast Notification Overlay if active
  if (_copyToastTimer > 0) {
    _copyToastTimer--;
    const toastW = 240;
    const toastH = 28;
    const toastX = (canvas.width - toastW) / 2;
    const toastY = viewportY + viewportH / 2 - toastH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    drawChamferedRect(ctx, toastX, toastY, toastW, toastH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = '900 11px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(_copyToastText, toastX + toastW / 2, toastY + toastH / 2);
    ctx.restore();
  }

  // ── Tier 4: Bottom Action Deck ──
  const bottomY = canvas.height - 30;

  drawButton('RESET DEFAULTS', 75, bottomY, () => {
    if (confirm(`Reset ${fDef.label} skin customizations to code defaults?`)) {
      custom.widthScale = 1.0;
      custom.heightScale = 1.0;
      custom.offsetX = 0;
      custom.offsetY = 0;
      custom.angleOffset = 0;
      custom.flipX = false;
      saveSkinCustomizations();
      _copyToastText = '✓ RESET TO DEFAULTS!';
      _copyToastTimer = 75;
    }
  }, 105, 26, null, 4);

  drawButton('💾 SAVE EDITS', 195, bottomY, () => {
    saveSkinCustomizations();
    _copyToastText = '✓ EDITS SAVED PERMANENTLY!';
    _copyToastTimer = 90;
  }, 110, 26, '#10b981', 4);

  drawButton('COPY CODE', 315, bottomY, () => {
    const code = generateJsCode(fDef, custom);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        _copyToastText = '✓ COPIED JS CODE TO CLIPBOARD!';
        _copyToastTimer = 90;
      });
    }
  }, 100, 26, null, 4);

  drawButton('⌂ BACK TO MENU', 445, bottomY, () => {
    state.gameState = 'title';
  }, 125, 26, null, 4);

  // ── Tier 5: Fighter Selection Modal Overlay ──
  if (state.studioSkinModalOpen) {
    // 1. Dim background backdrop
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 12, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Backdrop click closes modal
    _registerButton(0, 0, canvas.width, canvas.height, () => {
      state.studioSkinModalOpen = false;
    });

    // 2. Filter and Pagination Calculations
    const activeCategoryDef = SKIN_STUDIO_CATEGORIES.find(c => c.id === state.studioSkinCategory) || SKIN_STUDIO_CATEGORIES[0];
    const filteredFighters = SKIN_STUDIO_FIGHTERS.filter(activeCategoryDef.filter);
    const PAGE_SIZE = 6;
    const totalPages = Math.max(1, Math.ceil(filteredFighters.length / PAGE_SIZE));
    if (state.studioSkinModalPage >= totalPages) {
      state.studioSkinModalPage = 0;
    }
    const currentPage = Math.max(0, Math.min(state.studioSkinModalPage, totalPages - 1));
    const pageFighters = filteredFighters.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    // 3. Modal Window Box (Framed cleanly on screen)
    const modalW = canvas.width - 32; // 508px
    const modalH = 428;
    const modalX = 16;
    const modalY = Math.max(16, Math.floor((canvas.height - modalH) / 2));

    // Blocker on modal window area to prevent clicks bleeding to backdrop
    _registerButton(modalX, modalY, modalW, modalH, () => {});

    drawPanel(modalX, modalY, modalW, modalH, 0.98, 8, '#2d080c');

    // Header Title
    ctx.save();
    ctx.fillStyle = '#b81c3b';
    ctx.font = '700 8px "Silkscreen", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ASSET CALIBRATION // FIGHTER SELECTION ROSTER', modalX + 16, modalY + 13);

    ctx.fillStyle = '#21050c';
    ctx.font = '900 15px "Outfit", "Rajdhani", sans-serif';
    ctx.fillText('SELECT FIGHTER MODEL TO EDIT', modalX + 16, modalY + 24);

    // Header accent divider line
    ctx.fillStyle = 'rgba(45, 8, 12, 0.35)';
    ctx.fillRect(modalX + 16, modalY + 44, modalW - 32, 1.5);
    ctx.restore();

    // Close Button [✕ CLOSE]
    drawButton('✕ CLOSE', modalX + modalW - 44, modalY + 24, () => {
      state.studioSkinModalOpen = false;
    }, 66, 22, '#e11d48', 3);

    // 4. Category Filter Tabs
    const catY = modalY + 50;
    const catBtnH = 20;
    const catGap = 5;
    const catBtnW = Math.floor((modalW - 32 - catGap * (SKIN_STUDIO_CATEGORIES.length - 1)) / SKIN_STUDIO_CATEGORIES.length);
    const catStartX = modalX + 16;

    SKIN_STUDIO_CATEGORIES.forEach((cat, cIdx) => {
      const bx = catStartX + cIdx * (catBtnW + catGap);
      const by = catY;
      const isCatActive = (state.studioSkinCategory === cat.id);

      ctx.save();
      if (isCatActive) {
        ctx.fillStyle = '#21050c';
        ctx.strokeStyle = '#b81c3b';
        ctx.lineWidth = 1.6;
      } else {
        ctx.fillStyle = 'rgba(45, 8, 12, 0.08)';
        ctx.strokeStyle = 'rgba(45, 8, 12, 0.22)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, bx, by, catBtnW, catBtnH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isCatActive ? '#ffffff' : '#4a121a';
      ctx.font = isCatActive ? '900 9px "Rajdhani", sans-serif' : '700 8.5px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cat.label, bx + catBtnW / 2, by + catBtnH / 2);
      ctx.restore();

      _registerButton(bx, by, catBtnW, catBtnH, () => {
        state.studioSkinCategory = cat.id;
        state.studioSkinModalPage = 0;
      });
    });

    // 5. Fighter Grid (2 Columns × 3 Rows = 6 Cards Max per Page)
    const gridCols = 2;
    const gridGapX = 10;
    const gridGapY = 7;
    const cardW = Math.floor((modalW - 32 - gridGapX) / gridCols); // 233px
    const cardH = 78;
    const gridStartX = modalX + 16;
    const gridStartY = modalY + 76;

    pageFighters.forEach((f, idx) => {
      const col = idx % gridCols;
      const row = Math.floor(idx / gridCols);
      const cx = gridStartX + col * (cardW + gridGapX);
      const cy = gridStartY + row * (cardH + gridGapY);
      const isSelected = (activeKey === f.key);

      ctx.save();
      // Card Box Body
      if (isSelected) {
        ctx.fillStyle = `${f.themeColor}28`;
        ctx.strokeStyle = f.themeColor;
        ctx.lineWidth = 1.8;
      } else {
        ctx.fillStyle = 'rgba(18, 22, 32, 0.94)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, cx, cy, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();

      // Mini Avatar Circle
      const avatarR = 19;
      const avatarX = cx + 27;
      const avatarY = cy + cardH / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = isSelected ? f.themeColor : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.clip();

      const fIndex = FIGHTER_DEFS.findIndex(d => d.type === f.key);
      const previewCanvas = (fIndex >= 0) ? getFighterPreview(fIndex) : null;
      if (previewCanvas) {
        ctx.drawImage(previewCanvas, 0, 0, 128, 128, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
      } else {
        ctx.fillStyle = f.themeColor;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Fighter Info Text Block
      const textX = cx + 54;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Fighter Name
      ctx.fillStyle = isSelected ? '#ffffff' : '#f1f5f9';
      ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
      ctx.fillText(f.label, textX, cy + 10);

      // Asset Tag (truncated cleanly if needed)
      const maxAssetLen = 22;
      const cardAsset = f.asset.length > maxAssetLen ? f.asset.slice(0, 20) + '…' : f.asset;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 8.5px "Rajdhani", monospace';
      ctx.fillText(`ASSET: ${cardAsset}`, textX, cy + 26);

      // Forms count tag
      const formCount = f.forms ? f.forms.length : 1;
      ctx.fillStyle = isSelected ? f.themeColor : '#64748b';
      ctx.font = '900 8.5px "Rajdhani", sans-serif';
      ctx.fillText(`⚡ ${formCount} ${formCount > 1 ? 'FORMS' : 'FORM'}`, textX, cy + 42);

      // Status Pill on bottom right
      if (isSelected) {
        ctx.fillStyle = f.themeColor;
        ctx.font = '900 8px "Rajdhani", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('● ACTIVE', cx + cardW - 10, cy + cardH - 12);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '700 8px "Rajdhani", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('SELECT ➔', cx + cardW - 10, cy + cardH - 12);
      }

      ctx.restore();

      _registerButton(cx, cy, cardW, cardH, () => {
        state.studioSelectedSkinFighter = f.key;
        state.studioSkinForm = f.forms?.[0]?.id || 'default';
        state.studioSkinModalOpen = false;
        isDraggingHairCenter = false;
        isDraggingHairScale = false;
        isDraggingHairRotate = false;
      });
    });

    // 6. Pagination Controls Bar
    const pagY = modalY + 338;
    const pagH = 24;

    // Prev Button
    const prevW = 68;
    const prevH = 22;
    const prevX = modalX + 16 + prevW / 2;
    const prevY = pagY + pagH / 2;
    if (currentPage > 0) {
      drawButton('◀ PREV', prevX, prevY, () => {
        state.studioSkinModalPage = Math.max(0, state.studioSkinModalPage - 1);
      }, prevW, prevH, '#b81c3b', 3);
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(45, 8, 12, 0.05)';
      ctx.strokeStyle = 'rgba(45, 8, 12, 0.14)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, prevX - prevW / 2, prevY - prevH / 2, prevW, prevH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a88990';
      ctx.font = '700 9px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◀ PREV', prevX, prevY);
      ctx.restore();
    }

    // Next Button
    const nextW = 68;
    const nextH = 22;
    const nextX = modalX + modalW - 16 - nextW / 2;
    const nextY = pagY + pagH / 2;
    if (currentPage < totalPages - 1) {
      drawButton('NEXT ▶', nextX, nextY, () => {
        state.studioSkinModalPage = Math.min(totalPages - 1, state.studioSkinModalPage + 1);
      }, nextW, nextH, '#b81c3b', 3);
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(45, 8, 12, 0.05)';
      ctx.strokeStyle = 'rgba(45, 8, 12, 0.14)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, nextX - nextW / 2, nextY - nextH / 2, nextW, nextH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a88990';
      ctx.font = '700 9px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEXT ▶', nextX, nextY);
      ctx.restore();
    }

    // Center Page Indicator
    const centerX = modalX + modalW / 2;
    ctx.save();
    ctx.fillStyle = '#21050c';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PAGE ${currentPage + 1} OF ${totalPages}  (${filteredFighters.length} FIGHTERS)`, centerX, pagY + pagH / 2);
    ctx.restore();

    // 7. Modal Footer Hint Container
    const footerY = modalY + 368;
    const footerH = 24;
    const footerW = modalW - 32;
    const footerX = modalX + 16;

    ctx.save();
    ctx.fillStyle = 'rgba(45, 8, 12, 0.06)';
    ctx.strokeStyle = 'rgba(45, 8, 12, 0.14)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, footerX, footerY, footerW, footerH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a121a';
    ctx.font = '700 9px "Rajdhani", sans-serif';
    ctx.fillText('💡 Click any fighter card to live-edit hair scales, positions, and rotation angles.', footerX + footerW / 2, footerY + footerH / 2);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// MOUSE & TOUCH INTERACTION LISTENERS
// ─────────────────────────────────────────────
if (typeof window !== 'undefined') {
  const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
  if (eventTarget && typeof eventTarget.addEventListener === 'function') {
    eventTarget.addEventListener('mousedown', (e) => {
      if (state.gameState !== 'skinStudio' || state.studioSkinModalOpen) return;

      const rect = eventTarget.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const currentScale = state.studioSkinPreviewScale;
      const viewportY = 110;
      const viewportH = 372;
      const heroX = state.canvas.width / 2;
      const heroY = viewportY + viewportH / 2 + 10;
      const baseRadius = 25;

      const activeKey = state.studioSelectedSkinFighter || 'ichigo';
      const fDef = SKIN_STUDIO_FIGHTERS.find(f => f.key === activeKey) || SKIN_STUDIO_FIGHTERS[0];
      const custom = ensureFighterCustom(fDef.key);

      // Local hero coordinate space
      const localX = (mx - heroX) / currentScale;
      const localY = (my - heroY) / currentScale;

      const handleCenterX = custom.offsetX;
      const handleCenterY = (fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3) + custom.offsetY;

      // Check center handle click (radius ~14px screen space)
      if (Math.hypot(localX - handleCenterX, localY - handleCenterY) < 14 / currentScale) {
        isDraggingHairCenter = true;
        return;
      }

      // Check scale handle click
      const scaleHandleX = handleCenterX + (baseRadius * 1.4 * (custom.widthScale ?? 1.0));
      const scaleHandleY = handleCenterY - (baseRadius * 0.8 * (custom.heightScale ?? 1.0));
      if (Math.hypot(localX - scaleHandleX, localY - scaleHandleY) < 14 / currentScale) {
        isDraggingHairScale = true;
        return;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (state.gameState !== 'skinStudio' || state.studioSkinModalOpen) return;

      const rect = eventTarget.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const currentScale = state.studioSkinPreviewScale;
      const viewportY = 110;
      const viewportH = 372;
      const heroX = state.canvas.width / 2;
      const heroY = viewportY + viewportH / 2 + 10;
      const baseRadius = 25;

      const activeKey = state.studioSelectedSkinFighter || 'ichigo';
      const fDef = SKIN_STUDIO_FIGHTERS.find(f => f.key === activeKey) || SKIN_STUDIO_FIGHTERS[0];
      const custom = ensureFighterCustom(fDef.key);

      const localX = (mx - heroX) / currentScale;
      const localY = (my - heroY) / currentScale;

      if (isDraggingHairCenter) {
        const baseCrownY = fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3;
        custom.offsetX = Math.round(localX);
        custom.offsetY = Math.round(localY - baseCrownY);
      } else if (isDraggingHairScale) {
        const handleCenterX = custom.offsetX;
        const handleCenterY = (fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3) + custom.offsetY;
        const dx = Math.abs(localX - handleCenterX);
        const dy = Math.abs(localY - handleCenterY);
        custom.widthScale = Math.max(0.2, Math.min(3.5, Number((dx / (baseRadius * 1.4)).toFixed(2))));
        custom.heightScale = Math.max(0.2, Math.min(3.5, Number((dy / (baseRadius * 0.8)).toFixed(2))));
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingHairCenter || isDraggingHairScale || isDraggingHairRotate) {
        saveSkinCustomizations();
      }
      isDraggingHairCenter = false;
      isDraggingHairScale = false;
      isDraggingHairRotate = false;
    });

    // Mouse Wheel Zoom
    eventTarget.addEventListener('wheel', (e) => {
      if (state.gameState !== 'skinStudio' || state.studioSkinModalOpen) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP * 0.5 : ZOOM_STEP * 0.5;
      state.studioSkinPreviewScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.studioSkinPreviewScale + delta));
    }, { passive: false });
  }
}
