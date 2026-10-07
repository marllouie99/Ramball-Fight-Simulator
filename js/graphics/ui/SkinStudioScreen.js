import {
  state,
  saveSkinCustomizations,
  loadSkinCustomizations,
  setFighterCustomAsDefault,
  resetFighterToDefault,
  resetAllFightersToDefault,
  SKIN_CUSTOMIZATIONS_DATABASE,
  DEFAULT_SKIN_CUSTOMIZATIONS,
  getDatabaseDefault,
  getAllDatabaseDefaults,
  generateDatabaseModuleCode
} from '../../core/state.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { drawIchigoSkin, _drawIchigoHair, _getIchigoHairImage } from '../fighters/ichigoSkin.js';
import { drawGojoBody, _drawGojoHair, _getGojoHairImage } from '../fighters/gojoSkin.js';
import { drawMakimaSkin, _drawMakimaHair, _getMakimaHairImage } from '../fighters/makimaSkin.js';
import { drawMeguminSkin, _drawMeguminHair, _getMeguminHairImage } from '../fighters/meguminSkin.js';
import { drawCrazyDaveSkin, _drawCrazyDaveHair, _getCrazyDaveHairImage } from '../fighters/crazyDaveSkin.js';
import { drawPekkaSkin } from '../fighters/pekkaSkin.js';
import { drawSansSkin } from '../fighters/sansSkin.js';
import { drawRezeSkin, _drawRezeHair, _getRezeHairImage } from '../fighters/rezeSkin.js';
import { drawSukunaBody, _drawSukunaHair, _getSukunaHairImage } from '../fighters/sukunaSkin.js';
import { drawYujiSkin, _drawYujiHair, _getYujiHairImage } from '../fighters/yujiSkin.js';
import { drawYutaSkin, _drawYutaHair, _getYutaHairImage } from '../fighters/yutaSkin.js';
import { drawTojiSkin, _drawTojiHair, _getTojiHairImage } from '../fighters/tojiSkin.js';
import { drawTanjiroSkin } from '../fighters/tanjiroSkin.js';
import { drawZenitsuSkin } from '../fighters/zenitsuSkin.js';
import { drawNezukoSkin } from '../fighters/nezukoSkin.js';
import { drawPowerSkin } from '../fighters/powerSkin.js';
import { drawZeusSkin, _drawZeusHair, _getZeusHairImage, _drawZeusCrown, _getZeusCrownImage } from '../fighters/zeusSkin.js';
import { drawCronosSkin } from '../fighters/cronosSkin.js';
import { drawBomberPixelBody } from '../fighters/bomberSkin.js';
import { drawVoidmasterPixelBody } from '../fighters/voidmasterSkin.js';
import { drawKnightPixelBody } from '../fighters/knightSkin.js';
import { drawNanamiSkin, _drawNanamiHair, _getNanamiHairImage } from '../fighters/nanamiSkin.js';
import { drawMahitoSkin, _drawMahitoHair, _getMahitoHairImage } from '../fighters/mahitoSkin.js';
import { drawNaoyaSkin, _drawNaoyaHair, _getNaoyaHairImage } from '../fighters/naoyaSkin.js';
import { drawMakiSkin, _drawMakiHair, _getMakiHairImage } from '../fighters/makiSkin.js';
import { drawGenosSkin, drawGenosHands, _drawGenosHair, _getGenosHairImage } from '../fighters/genosSkin.js';
import { drawEscanorSkin, _drawEscanorHair, _getEscanorHairImage } from '../fighters/escanorSkin.js';
import { drawEngineerSkin, _drawEngineerHair, _getEngineerHairImage } from '../fighters/engineerSkin.js';
import { drawJohnWickSkin, _drawJohnWickHair, _getJohnWickHairImage } from '../fighters/johnWickSkin.js';
import { drawTodoSkin, _drawTodoHair, _getTodoHairImage } from '../fighters/todoSkin.js';
import { drawMusashiSkin, _drawMusashiHair } from '../fighters/musashiSkin.js';
import { drawGunslingerSkin, _drawGunslingerHair, _getGunslingerHairImage } from '../fighters/gunSlingerSkin.js';
import { drawDoppelgangerSkin, drawDoppelgangerPixelBody } from '../fighters/doppelgangerSkin.js';
import { drawEmberSkin } from '../fighters/flamewardenSkin.js';
import { drawEyeOfCthulhuSkin } from '../fighters/eyeOfCthulhuSkin.js';
import { drawNamelessDeitySkin, NAMELESS_DEITY_DEFAULT_CONFIGS, NAMELESS_DEITY_SKIN2_DEFAULT_CONFIGS } from '../fighters/namelessDeitySkin.js';
import { drawAvatarOfEmptinessSkin, AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS } from '../fighters/avatarOfEmptinessSkin.js';



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
if (state.studioSkinNamelessPart === undefined) state.studioSkinNamelessPart = 'overall';
if (state.studioSkinAvatarPart === undefined) state.studioSkinAvatarPart = 'overall';

export const NAMELESS_DEITY_PARTS = [
  { id: 'overall', label: '⭐ ALL', fullLabel: 'ALL / OVERALL', asset: 'Body + Antlers + Cicada + Censor + Vines + Flowers + Wings + Halo + Wheel + Limbs', desc: 'Overall model scale & shift' },
  { id: 'body', label: '🫀 BODY', shortLabel: 'BODY', fullLabel: 'DIVINE BODY TORSO', asset: 'Assets/model/NamelessDeity/DivineBody.png', desc: 'Torso scale, shift & angle' },
  { id: 'antlers', label: '🦌 ANTLERS', shortLabel: 'ANTLERS', fullLabel: 'SACRED DEITY ANTLERS', asset: 'Assets/model/NamelessDeity/antlers9.png', desc: 'Antler crown scale, shift & angle' },
  { id: 'antler_vines', label: '🌿 A-VINES', shortLabel: 'A-VINES', fullLabel: 'ANTLER HANGING VINES', asset: 'Assets/model/NamelessDeity/Vines1.png', desc: 'Vines draped from antler branches' },
  { id: 'cicada', label: '🪲 CICADA', shortLabel: 'CICADA', fullLabel: 'CICADA CROWN / BROOCH', asset: 'Assets/model/NamelessDeity/Cicada.png', desc: 'Head crown / chest cicada moth' },
  { id: 'censor', label: '📜 CENSOR', shortLabel: 'CENSOR', fullLabel: 'TAPED CENSOR SKETCH', asset: 'Assets/model/NamelessDeity/Censor.png', desc: 'Face/torso taped censor paper note' },
  { id: 'vines', label: '🌿 VINES', shortLabel: 'VINES', fullLabel: 'HANGING VINES / ROBES', asset: 'Assets/model/NamelessDeity/Vines.png', desc: 'Lower vines scale, shift & angle' },
  { id: 'flowers', label: '🩶 FLOWERS', shortLabel: 'FLOWERS', fullLabel: 'GRAY CELESTIAL FLOWERS', asset: 'Assets/model/NamelessDeity/SideFlower2.png', desc: 'Dual gray flanking lotus flowers' },
  { id: 'wings', label: '🪽 WINGS', fullLabel: 'WINGS', asset: 'Assets/model/NamelessDeity/Wings.png', desc: 'Wing span & flap attachment' },
  { id: 'halo', label: '☀️ HALO', shortLabel: 'HALO', fullLabel: 'COSMIC LIGHT HALO', asset: 'Assets/model/NamelessDeity/CosmicLightCircleCenter1.png', desc: 'Back starburst halo ring' },
  { id: 'wheel', label: '☸️ WHEEL', shortLabel: 'WHEEL', fullLabel: 'CELESTIAL CLOCK WHEEL', asset: 'Assets/model/NamelessDeity/Wheel.png', desc: 'Back clockwork wheel' },
  { id: 'arm', label: '💪 ARM', fullLabel: 'UPPER ARM', asset: 'Assets/model/NamelessDeity/Arm.png', desc: 'Upper arm length & shoulder shift' },
  { id: 'forearm', label: '🦾 FOREARM', fullLabel: 'FOREARM', asset: 'Assets/model/NamelessDeity/Forearm.png', desc: 'Forearm length, elbow & wrist alignment' },
  { id: 'hand', label: '✋ HAND', fullLabel: 'HAND', asset: 'Assets/model/NamelessDeity/Hand.png', desc: 'Hand size, wrist angle & offset' }
];

export const AVATAR_OF_EMPTINESS_PARTS = [
  { id: 'overall', label: '⭐ ALL', fullLabel: 'ALL / OVERALL', asset: 'Body Circle + Left/Right Arms + Forearms', desc: 'Overall model scale & shift' },
  { id: 'body', label: '🫀 BODY', shortLabel: 'BODY', fullLabel: 'VOID CORE BODY', asset: 'Procedural Void Core Circle & Aura', desc: 'Body scale, shift & event horizon' },
  { id: 'arm_left', label: '💪 L-ARM', shortLabel: 'L-ARM', fullLabel: 'FRONT LEFT ARM', asset: 'Assets/model/Avatar/FrontArmLeft.png', desc: 'Left arm scale, shoulder shift & angle' },
  { id: 'arm_right', label: '💪 R-ARM', shortLabel: 'R-ARM', fullLabel: 'FRONT RIGHT ARM', asset: 'Assets/model/Avatar/FrontArmRight.png', desc: 'Right arm scale, shoulder shift & angle' },
  { id: 'forearm_left', label: '🦾 L-FORE', shortLabel: 'L-FORE', fullLabel: 'FRONT LEFT FOREARM', asset: 'Assets/model/Avatar/FrontForearmLeft.png', desc: 'Left forearm scale, elbow shift & angle' },
  { id: 'forearm_right', label: '🦾 R-FORE', shortLabel: 'R-FORE', fullLabel: 'FRONT RIGHT FOREARM', asset: 'Assets/model/Avatar/FrontForearmRight.png', desc: 'Right forearm scale, elbow shift & angle' }
];

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 6.0;
const ZOOM_STEP = 0.3;
const ZOOM_DEFAULT = 2.4;

// Interactive Drag States
let isDraggingHairCenter = false;
let isDraggingHairScale = false;
let isDraggingHairWidth = false;
let isDraggingHairHeight = false;
let isDraggingHairRotate = false;
let _copyToastText = '';
let _copyToastTimer = 0;

// Fighter Category Tabs in Skin Studio Modal
export const SKIN_STUDIO_CATEGORIES = [
  { id: 'ALL', label: 'ALL', filter: () => true },
  { id: 'JJK', label: 'JJK', filter: (f) => ['ichigo', 'gojo', 'sukuna', 'yuji', 'yuta', 'toji', 'todo', 'nanami', 'mahito', 'naoya', 'maki'].includes(f.key) },
  { id: 'CHAINSAW', label: 'CSM', filter: (f) => ['makima', 'reze', 'power'].includes(f.key) },
  { id: 'SLAYER', label: 'SLAYER', filter: (f) => ['tanjiro', 'zenitsu', 'nezuko'].includes(f.key) },
  { id: 'ARCADE', label: 'ARCADE', filter: (f) => ['genos', 'escanor', 'engineer', 'zeus', 'cronus', 'bomber', 'black', 'knight', 'john_wick', 'gunslinger', 'doppleganger', 'orange', 'megumin', 'crazydave', 'pekka', 'sans', 'nameless_deity', 'avatar_of_emptiness', 'avatarofemptiness', 'eye_of_cthulhu'].includes(f.key) }
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
    key: 'megumin',
    label: 'MEGUMIN',
    asset: 'Procedural Pixel Art',
    assetDims: 'Procedural Model',
    baseW: 2.85,
    baseH: 2.20,
    baseCrownY: -1.75,
    visW: 300,
    visH: 300,
    centerX: 250,
    topY: 60,
    themeColor: '#c81d25',
    forms: [
      { id: 'default', label: 'WIZARD ROBES' }
    ]
  },
  {
    key: 'crazydave',
    label: 'CRAZY DAVE',
    asset: 'crazydave-hair.png',
    assetDims: '1536 x 1024',
    baseW: 2.25,
    baseH: 1.30,
    baseCrownY: -1.15,
    visW: 855,
    visH: 514,
    centerX: 611,
    topY: 301,
    themeColor: '#84cc16',
    forms: [
      { id: 'default', label: 'COOKING POT' }
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
    baseW: 3.19,
    baseH: 1.96,
    baseCrownY: -1.30,
    visW: 1123,
    visH: 908,
    centerX: 686,
    topY: 136,
    themeColor: '#7D3224',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'todo',
    label: 'TODO',
    asset: 'Todo-hair.png',
    assetDims: '1345 x 1170',
    baseW: 3.30,
    baseH: 2.25,
    baseCrownY: -1.55,
    visW: 1207,
    visH: 1081,
    centerX: 712,
    topY: 28,
    themeColor: '#7C3AED',
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
    asset: 'Zenitsu-hair.png',
    assetDims: '516 x 484',
    baseW: 2.82,
    baseH: 1.83,
    baseCrownY: -1.25,
    visW: 407,
    visH: 356,
    centerX: 258,
    topY: 54,
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
    baseW: 3.43,
    baseH: 1.92,
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
    baseW: 2.82,
    baseH: 2.22,
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
    key: 'naoya',
    label: 'NAOYA',
    asset: 'Naoya_hair.png',
    assetDims: '1506 x 1045',
    baseW: 2.50,
    baseH: 1.80,
    baseCrownY: -1.25,
    visW: 1289,
    visH: 913,
    centerX: 740,
    topY: 30,
    themeColor: '#76E042',
    forms: [
      { id: 'default', label: 'PROJECTION SORCERY' }
    ]
  },
  {
    key: 'maki',
    label: 'MAKI',
    asset: 'Maki-hair.png',
    assetDims: '1024 x 1024',
    baseW: 2.85,
    baseH: 2.20,
    baseCrownY: -1.40,
    visW: 882,
    visH: 809,
    centerX: 511.5,
    topY: 92,
    themeColor: '#014913ff',
    forms: [
      { id: 'default', label: 'AWAKENED' }
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
    baseW: 2.29,
    baseH: 1.49,
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
  },
  {
    key: 'john_wick',
    label: 'JOHN WICK',
    asset: 'Johnwick-hair.png',
    assetDims: '1254 x 1254',
    baseW: 2.85,
    baseH: 2.40,
    baseCrownY: -1.30,
    visW: 924,
    visH: 912,
    centerX: 626.5,
    topY: 209,
    themeColor: '#475569',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'engineer',
    label: 'ENGINEER',
    asset: 'Hair/Engineer-Hair.png',
    assetDims: '1280 x 1229',
    baseW: 2.60,
    baseH: 1.55,
    baseCrownY: -1.15,
    visW: 1039,
    visH: 775,
    centerX: 639.5,
    topY: 234,
    themeColor: '#EA580C',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  },
  {
    key: 'gunslinger',
    label: 'GUNSLINGER',
    asset: 'Hair/Gunslinger-hair.png',
    assetDims: '1536 x 1024',
    baseW: 3.36,
    baseH: 1.85,
    baseCrownY: -1.32,
    visW: 1517,
    visH: 1017,
    centerX: 758,
    topY: 7,
    themeColor: '#D97706',
    forms: [
      { id: 'default', label: 'COWBOY' }
    ]
  },
  {
    key: 'doppleganger',
    label: 'DOPPELGANGER',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#9b59b6',
    forms: [
      { id: 'default', label: 'MIRROR PHANTOM' }
    ]
  },
  {
    key: 'orange',
    label: 'EMBER',
    asset: 'Procedural Pixel Art',
    assetDims: '56 x 56 Pixel Model',
    baseW: 2.30,
    baseH: 2.00,
    baseCrownY: -1.20,
    themeColor: '#f97316',
    forms: [
      { id: 'default', label: 'FLAMEWARDEN' }
    ]
  },
  {
    key: 'eye_of_cthulhu',
    label: 'EYE OF CTHULHU',
    category: 'boss',
    asset: 'Eye of Cthulhu.png',
    assetDims: '1774 x 887 (6-Frame Sprite Strip)',
    baseW: 2.20,
    baseH: 2.20,
    baseCrownY: -1.00,
    themeColor: '#e11d48',
    forms: [
      { id: 'default', label: 'PHASE 1 (OCULAR)' },
      { id: 'phase2', label: 'PHASE 2 (FANGED MAW)' }
    ]
  },
  {
    key: 'pekka',
    label: 'P.E.K.K.A',
    asset: 'Procedural Pixel Art',
    assetDims: '60 x 60 Discrete Armor Model',
    baseW: 2.40,
    baseH: 2.20,
    baseCrownY: -1.25,
    themeColor: '#8B5CF6',
    forms: [
      { id: 'default', label: 'HEAVY JUGGERNAUT' }
    ]
  },
  {
    key: 'nameless_deity',
    label: 'NAMELESS DEITY',
    category: 'boss',
    asset: 'NamelessDeity (Wings/Arm/Forearm/Hand)',
    assetDims: 'Paper Collage Multi-Limb Model',
    baseW: 2.40,
    baseH: 2.40,
    baseCrownY: -1.20,
    themeColor: '#00F0FF',
    forms: [
      { id: 'default', label: 'DIVINE FORM' }
    ]
  },
  {
    key: 'avatar_of_emptiness',
    label: 'AVATAR OF EMPTINESS',
    category: 'boss',
    asset: 'Avatar (ArmLeft/ArmRight/Forearms/Hands)',
    assetDims: 'Paper Collage Multi-Limb Model',
    baseW: 2.40,
    baseH: 2.40,
    baseCrownY: -1.20,
    themeColor: '#9D4EDD',
    forms: [
      { id: 'default', label: 'STANDARD' }
    ]
  }
];


const NAMELESS_KEY_MAP = {
  nameless_deity: 'overall',
  nameless_deity_body: 'body',
  nameless_deity_antlers: 'antlers',
  nameless_deity_antler_vines: 'antler_vines',
  nameless_deity_antlerVines: 'antler_vines',
  nameless_deity_cicada: 'cicada',
  nameless_deity_censor: 'censor',
  nameless_deity_vines: 'vines',
  nameless_deity_flowers: 'flowers',
  nameless_deity_wings: 'wings',
  nameless_deity_halo: 'halo',
  nameless_deity_wheel: 'wheel',
  nameless_deity_arm: 'arm',
  nameless_deity_forearm: 'forearm',
  nameless_deity_hand: 'hand'
};

const AVATAR_KEY_MAP = {
  avatar_of_emptiness: 'overall',
  avatarofemptiness: 'overall',
  avatar_of_emptiness_body: 'body',
  avatarofemptiness_body: 'body',
  avatar_of_emptiness_arm_left: 'arm_left',
  avatarofemptiness_arm_left: 'arm_left',
  avatar_of_emptiness_arm_right: 'arm_right',
  avatarofemptiness_arm_right: 'arm_right',
  avatar_of_emptiness_forearm_left: 'forearm_left',
  avatarofemptiness_forearm_left: 'forearm_left',
  avatar_of_emptiness_forearm_right: 'forearm_right',
  avatarofemptiness_forearm_right: 'forearm_right'
};

export function getFighterDefaultCustom(key, useFactory = false) {
  const isSkin2 = (state.selectedNamelessDeitySkin === 'skin2');
  const configMap = isSkin2 ? NAMELESS_DEITY_SKIN2_DEFAULT_CONFIGS : NAMELESS_DEITY_DEFAULT_CONFIGS;
  const deityPart = NAMELESS_KEY_MAP[key];
  const avatarPart = AVATAR_KEY_MAP[key];

  if (deityPart && configMap[deityPart]) return { ...configMap[deityPart] };
  if (avatarPart && AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS[avatarPart]) return { ...AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS[avatarPart] };

  if (!useFactory && state.defaultSkinCustomizations && state.defaultSkinCustomizations[key]) {
    return { ...state.defaultSkinCustomizations[key] };
  }

  return getDatabaseDefault(key);
}

function ensureFighterCustom(key) {
  if (!state.skinCustomizations) state.skinCustomizations = {};
  if (!state.skinCustomizations[key]) {
    state.skinCustomizations[key] = getFighterDefaultCustom(key);
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
  const flipX = Boolean(custom.flipX);
  const flipY = Boolean(custom.flipY);

  const targetW = (fDef.baseW * (custom.widthScale ?? 1.0)).toFixed(2);
  const targetH = (fDef.baseH * (custom.heightScale ?? 1.0)).toFixed(2);
  const crownY = fDef.baseCrownY ? fDef.baseCrownY.toFixed(2) : '-1.30';

  if (fDef.key === 'ichigo') {
    return `// Calibrated Hair for Ichigo (Assets/model/ichigo/ichigo-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 951;\n` +
           `const scaleY = targetHairHeight / 819;\n` +
           `const drawW = 1448 * scaleX;\n` +
           `const drawH = 1086 * scaleY;\n` +
           `const drawX = -705 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 105 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'gojo') {
    return `// Calibrated Hair for Gojo (Assets/model/gojo/gojo-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 968;\n` +
           `const scaleY = targetHairHeight / 779;\n` +
           `const drawW = 1254 * scaleX;\n` +
           `const drawH = 1254 * scaleY;\n` +
           `const drawX = -620 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 203 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'makima') {
    return `// Calibrated Hair for Makima (Assets/model/makima/Makima-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 322;\n` +
           `const scaleY = targetHairHeight / 322;\n` +
           `const drawW = 522 * scaleX;\n` +
           `const drawH = 478 * scaleY;\n` +
           `const drawX = -249.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 43 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'megumin') {
    return `// Calibrated Hair for Megumin (Assets/model/Megumin-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 300;\n` +
           `const scaleY = targetHairHeight / 300;\n` +
           `const drawW = 500 * scaleX;\n` +
           `const drawH = 500 * scaleY;\n` +
           `const drawX = -250 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 60 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'crazydave') {
    return `// Calibrated Hair/Pan for Crazy Dave (Assets/model/crazyDave/crazydave-hair.png)\n` +
           `const targetDomeWidth = r * ${targetW};\n` +
           `const targetDomeHeight = r * ${targetH};\n` +
           `const scaleX = targetDomeWidth / 855;\n` +
           `const scaleY = targetDomeHeight / 514;\n` +
           `const drawW = 1536 * scaleX;\n` +
           `const drawH = 1024 * scaleY;\n` +
           `const drawX = -611 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 301 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'reze') {
    return `// Calibrated Hair for Reze (Assets/model/reze/Reze-hair.png)\n` +
           `const targetDomeWidth = r * ${targetW};\n` +
           `const scaleX = targetDomeWidth / 260;\n` +
           `const scaleY = ((r * ${targetH}) / 260);\n` +
           `const drawW = 500 * scaleX;\n` +
           `const drawH = 500 * scaleY;\n` +
           `const drawX = -246 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 80 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'sukuna') {
    return `// Calibrated Hair for Sukuna (Assets/model/sukuna/Sukuna-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 925;\n` +
           `const scaleY = targetHairHeight / 749;\n` +
           `const drawW = 1254 * scaleX;\n` +
           `const drawH = 1254 * scaleY;\n` +
           `const drawX = -626 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 226 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'yuji') {
    return `// Calibrated Hair for Yuji (Assets/model/yuji/Yuji-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1042;\n` +
           `const scaleY = targetHairHeight / 860;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -668.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 140 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'yuta') {
    return `// Calibrated Hair for Yuta (Assets/model/yuta/Yuta-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 421;\n` +
           `const scaleY = targetHairHeight / 327;\n` +
           `const drawW = 577 * scaleX;\n` +
           `const drawH = 433 * scaleY;\n` +
           `const drawX = -282 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 82 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'toji') {
    return `// Calibrated Hair for Toji (Assets/model/toji/toji-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1123;\n` +
           `const scaleY = targetHairHeight / 908;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -686 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 136 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'nanami') {
    return `// Calibrated Hair for Nanami (Assets/model/nanami/Nanami-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1252;\n` +
           `const scaleY = targetHairHeight / 797;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -698.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 250 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'mahito') {
    return `// Calibrated Hair for Mahito (Assets/model/mahito/Mahito-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 408;\n` +
           `const scaleY = targetHairHeight / 458;\n` +
           `const drawW = 536 * scaleX;\n` +
           `const drawH = 466 * scaleY;\n` +
           `const drawX = -267.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 6 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'maki') {
    return `// Calibrated Hair for Maki (Assets/model/maki/Maki-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 882;\n` +
           `const scaleY = targetHairHeight / 809;\n` +
           `const drawW = 1024 * scaleX;\n` +
           `const drawH = 1024 * scaleY;\n` +
           `const drawX = -511.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 92 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'escanor') {
    return `// Calibrated Hair for Escanor (Assets/model/escanor/Escanor-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 280;\n` +
           `const scaleY = targetHairHeight / 220;\n` +
           `const drawW = 500 * scaleX;\n` +
           `const drawH = 500 * scaleY;\n` +
           `const drawX = -251.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 122 * scaleY + 4${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'todo') {
    return `// Calibrated Hair for Todo (Assets/model/todo/Todo-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1207;\n` +
           `const scaleY = targetHairHeight / 1081;\n` +
           `const drawW = 1345 * scaleX;\n` +
           `const drawH = 1170 * scaleY;\n` +
           `const drawX = -712 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 28 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'engineer') {
    return `// Calibrated Hard Hat for Engineer (Assets/model/engineer/Engineer-Hair.png)\n` +
           `const targetHatWidth = r * ${targetW};\n` +
           `const targetHatHeight = r * ${targetH};\n` +
           `const scaleX = targetHatWidth / 1039;\n` +
           `const scaleY = targetHatHeight / 775;\n` +
           `const drawW = 1280 * scaleX;\n` +
           `const drawH = 1229 * scaleY;\n` +
           `const drawX = -639.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 234 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'gunslinger') {
    return `// Calibrated Cowboy Hat for Gunslinger (Assets/model/gunslinger/Gunslinger-hair.png)\n` +
           `const targetHatWidth = r * ${targetW};\n` +
           `const targetHatHeight = r * ${targetH};\n` +
           `const scaleX = targetHatWidth / 1517;\n` +
           `const scaleY = targetHatHeight / 1017;\n` +
           `const drawW = 1536 * scaleX;\n` +
           `const drawH = 1024 * scaleY;\n` +
           `const drawX = -758 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 7 * scaleY - 10${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'zenitsu') {
    return `// Calibrated Hair for Zenitsu (Assets/model/zenitsu/Zenitsu-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 407;\n` +
           `const scaleY = targetHairHeight / 356;\n` +
           `const drawW = 516 * scaleX;\n` +
           `const drawH = 484 * scaleY;\n` +
           `const drawX = -258 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 54 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'naoya') {
    return `// Calibrated Hair for Naoya (Assets/model/naoya/Naoya_hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1289;\n` +
           `const scaleY = targetHairHeight / 913;\n` +
           `const drawW = 1506 * scaleX;\n` +
           `const drawH = 1045 * scaleY;\n` +
           `const drawX = -740 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 30 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'genos') {
    return `// Calibrated Hair for Genos (Assets/model/genos/Genos-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 405;\n` +
           `const scaleY = targetHairHeight / 328;\n` +
           `const drawW = 500 * scaleX;\n` +
           `const drawH = 500 * scaleY;\n` +
           `const drawX = -253 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 81 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'john_wick') {
    return `// Calibrated Hair for John Wick (Assets/model/johnWick/Johnwick-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 924;\n` +
           `const scaleY = targetHairHeight / 912;\n` +
           `const drawW = 1254 * scaleX;\n` +
           `const drawH = 1254 * scaleY;\n` +
           `const drawX = -626.5 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 209 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'zeus') {
    return `// Calibrated Hair for Zeus (Assets/model/zeus/Zeus-hair.png)\n` +
           `const targetHairWidth = r * ${targetW};\n` +
           `const targetHairHeight = r * ${targetH};\n` +
           `const scaleX = targetHairWidth / 1195;\n` +
           `const scaleY = targetHairHeight / 1223;\n` +
           `const drawW = 1254 * scaleX;\n` +
           `const drawH = 1254 * scaleY;\n` +
           `const drawX = -638 * scaleX${offX !== 0 ? (offX > 0 ? ` + ${offX}` : ` - ${Math.abs(offX)}`) : ''};\n` +
           `const drawY = -r * ${Math.abs(Number(crownY)).toFixed(2)} - 31 * scaleY${offY !== 0 ? (offY > 0 ? ` + ${offY}` : ` - ${Math.abs(offY)}`) : ''};`;
  } else if (fDef.key === 'nameless_deity') {
    const part = state.studioSkinNamelessPart || 'overall';
    const activeKey = (part !== 'overall') ? `nameless_deity_${part}` : 'nameless_deity';
    return `// Calibrated Nameless Deity Asset [${part.toUpperCase()}]\n` +
           `// Storage Key: state.skinCustomizations.${activeKey}\n` +
           `widthScale: ${(custom.widthScale ?? 1.0).toFixed(2)},\n` +
           `heightScale: ${(custom.heightScale ?? 1.0).toFixed(2)},\n` +
           `offsetX: ${Math.round(custom.offsetX ?? 0)},\n` +
           `offsetY: ${Math.round(custom.offsetY ?? 0)},\n` +
           `angleOffset: ${((custom.angleOffset ?? 0) * (180 / Math.PI)).toFixed(1)}° (${(custom.angleOffset ?? 0).toFixed(4)} rad)`;
  } else if (fDef.key === 'avatar_of_emptiness' || fDef.key === 'avatarofemptiness') {
    const part = state.studioSkinAvatarPart || 'overall';
    const activeKey = (part !== 'overall') ? `avatar_of_emptiness_${part}` : 'avatar_of_emptiness';
    return `// Calibrated Avatar of Emptiness Asset [${part.toUpperCase()}]\n` +
           `// Storage Key: state.skinCustomizations.${activeKey}\n` +
           `widthScale: ${(custom.widthScale ?? 1.0).toFixed(2)},\n` +
           `heightScale: ${(custom.heightScale ?? 1.0).toFixed(2)},\n` +
           `offsetX: ${Math.round(custom.offsetX ?? 0)},\n` +
           `offsetY: ${Math.round(custom.offsetY ?? 0)},\n` +
           `angleOffset: ${((custom.angleOffset ?? 0) * (180 / Math.PI)).toFixed(1)}° (${(custom.angleOffset ?? 0).toFixed(4)} rad)`;
  }
  return `// Skin Customization Parameters\n` +
         `widthScale: ${wMult},\n` +
         `heightScale: ${hMult},\n` +
         `offsetX: ${offX},\n` +
         `offsetY: ${offY},\n` +
         `angleOffset: ${rot}`;
}

/**
 * Triggers a file download of all current fighter skin customizations as a JSON file.
 */
export function exportBulkPresetsToFile() {
  try {
    const data = state.skinCustomizations || {};
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circle_mini_battle_skin_presets_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  } catch (e) {
    console.error('Failed to export presets to file:', e);
    return false;
  }
}

/**
 * Triggers a file download of the full skinCustomizationsDatabase.js code module.
 */
export function downloadDatabaseFile() {
  try {
    const code = generateDatabaseModuleCode(state.skinCustomizations);
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skinCustomizationsDatabase.js`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  } catch (e) {
    console.error('Failed to download database file:', e);
    return false;
  }
}

/**
 * Validates, sanitizes, and merges an imported JSON object into state.skinCustomizations.
 * @param {Object} importedObj
 * @returns {number} Number of successfully imported fighter presets.
 */
export function validateAndMergeSkinPresets(importedObj) {
  if (!importedObj || typeof importedObj !== 'object' || Array.isArray(importedObj)) {
    throw new Error('Invalid JSON: Expected an object of fighter customizations.');
  }

  if (!state.skinCustomizations) state.skinCustomizations = {};
  let count = 0;

  for (const [key, val] of Object.entries(importedObj)) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;

    const sanitized = {
      widthScale: (typeof val.widthScale === 'number' && isFinite(val.widthScale)) ? Number(val.widthScale.toFixed(2)) : 1.0,
      heightScale: (typeof val.heightScale === 'number' && isFinite(val.heightScale)) ? Number(val.heightScale.toFixed(2)) : 1.0,
      offsetX: (typeof val.offsetX === 'number' && isFinite(val.offsetX)) ? Math.round(val.offsetX) : 0,
      offsetY: (typeof val.offsetY === 'number' && isFinite(val.offsetY)) ? Math.round(val.offsetY) : 0,
      angleOffset: (typeof val.angleOffset === 'number' && isFinite(val.angleOffset)) ? Number(val.angleOffset.toFixed(4)) : 0,
      flipX: Boolean(val.flipX),
      flipY: Boolean(val.flipY)
    };

    if (typeof val.gap === 'number' && isFinite(val.gap)) {
      sanitized.gap = Math.round(val.gap);
    }

    state.skinCustomizations[key] = {
      ...(state.skinCustomizations[key] || {}),
      ...sanitized
    };
    count++;
  }

  saveSkinCustomizations();
  return count;
}

/**
 * Triggers file picker to import presets from a JSON file.
 */
export function importBulkPresetsFromFile(onSuccess, onError) {
  if (typeof document === 'undefined') return;
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        if (input.parentNode) document.body.removeChild(input);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          const count = validateAndMergeSkinPresets(parsed);
          if (typeof onSuccess === 'function') onSuccess(count);
        } catch (err) {
          if (typeof onError === 'function') onError(err);
        } finally {
          if (input.parentNode) document.body.removeChild(input);
        }
      };
      reader.onerror = (err) => {
        if (typeof onError === 'function') onError(err);
        if (input.parentNode) document.body.removeChild(input);
      };
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
  } catch (e) {
    if (typeof onError === 'function') onError(e);
  }
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

  const isNamelessDeity = (fDef.key === 'nameless_deity');
  const activePartId = isNamelessDeity ? (state.studioSkinNamelessPart || 'overall') : 'overall';
  const activePartDef = isNamelessDeity ? (NAMELESS_DEITY_PARTS.find(p => p.id === activePartId) || NAMELESS_DEITY_PARTS[0]) : null;

  const isAvatarOfEmptiness = (fDef.key === 'avatar_of_emptiness' || fDef.key === 'avatarofemptiness');
  const activeAvatarPartId = isAvatarOfEmptiness ? (state.studioSkinAvatarPart || 'overall') : 'overall';
  const activeAvatarPartDef = isAvatarOfEmptiness ? (AVATAR_OF_EMPTINESS_PARTS.find(p => p.id === activeAvatarPartId) || AVATAR_OF_EMPTINESS_PARTS[0]) : null;

  const activeCustomKey = (isNamelessDeity && activePartId !== 'overall')
    ? `nameless_deity_${activePartId}`
    : (isAvatarOfEmptiness && activeAvatarPartId !== 'overall')
      ? `avatar_of_emptiness_${activeAvatarPartId}`
      : fDef.key;
  const custom = ensureFighterCustom(activeCustomKey);

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

  const dummyFighter = {
    x: 0,
    y: 0,
    r: baseRadius,
    radius: baseRadius,
    gunAngle: aimAngle,
    angle: aimAngle,
    _isWinnerReveal: true, // Clean upright presentation
    _isStudioDummy: true,
    characterId: fDef.key,
    type: fDef.key,
    color: themeColor,
    hideFrontHand: true,
    hideBackHand: true,
    isShikai: state.studioSkinForm === 'shikai',
    isBankai: state.studioSkinForm === 'bankai' || state.studioSkinForm === 'mask',
    isHybridModeActive: state.studioSkinForm === 'bomb',
    isUnmasked: state.studioSkinForm === 'unmasked',
    isMegumiForm: state.studioSkinForm === 'megumi',
    skinVariant: (typeof state !== 'undefined' ? state.selectedNamelessDeitySkin : 'skin1') || 'skin1'
  };

  // Render Base Body if toggled on
  if (state.studioSkinShowBody) {
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
      } else if (fDef.key === 'megumin') {
        drawMeguminSkin(ctx, dummyFighter);
      } else if (fDef.key === 'crazydave') {
        drawCrazyDaveSkin(ctx, dummyFighter);
      } else if (fDef.key === 'pekka') {
        drawPekkaSkin(ctx, dummyFighter);
      } else if (fDef.key === 'sans') {
        drawSansSkin(ctx, dummyFighter);
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
      } else if (fDef.key === 'naoya') {
        drawNaoyaSkin(ctx, dummyFighter);
      } else if (fDef.key === 'maki') {
        drawMakiSkin(ctx, dummyFighter);
      } else if (fDef.key === 'genos') {
        drawGenosSkin(ctx, dummyFighter);
        drawGenosHands(ctx, dummyFighter);
      } else if (fDef.key === 'escanor') {
        dummyFighter.isTheOneActive = (state.studioSkinForm === 'theOne');
        drawEscanorSkin(ctx, dummyFighter);
      } else if (fDef.key === 'john_wick') {
        drawJohnWickSkin(ctx, dummyFighter);
      } else if (fDef.key === 'todo') {
        drawTodoSkin(ctx, dummyFighter);
      } else if (fDef.key === 'engineer') {
        drawEngineerSkin(ctx, dummyFighter);
      } else if (fDef.key === 'musashi') {
        drawMusashiSkin(ctx, dummyFighter);
      } else if (fDef.key === 'gunslinger') {
        drawGunslingerSkin(ctx, dummyFighter);
      } else if (fDef.key === 'doppleganger') {
        drawDoppelgangerSkin(ctx, dummyFighter);
      } else if (fDef.key === 'orange') {
        drawEmberSkin(ctx, dummyFighter);
      } else if (fDef.key === 'eye_of_cthulhu') {
        dummyFighter.isPhase2 = (state.studioSkinForm === 'phase2');
        dummyFighter._isPhase2 = (state.studioSkinForm === 'phase2');
        drawEyeOfCthulhuSkin(ctx, dummyFighter);
      } else if (fDef.key === 'nameless_deity') {
        dummyFighter.skinVariant = (typeof state !== 'undefined' ? state.selectedNamelessDeitySkin : 'skin1') || 'skin1';
        drawNamelessDeitySkin(ctx, dummyFighter);
      } else if (fDef.key === 'avatar_of_emptiness' || fDef.key === 'avatarofemptiness') {
        dummyFighter._isStudioDummy = true;
        drawAvatarOfEmptinessSkin(ctx, dummyFighter);
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
    else if (fDef.key === 'megumin') _drawMeguminHair(ctx, baseRadius, isFacingLeft);
    else if (fDef.key === 'crazydave') _drawCrazyDaveHair(ctx, baseRadius, isFacingLeft);
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
    } else if (fDef.key === 'naoya') {
      _drawNaoyaHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'maki') {
      _drawMakiHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'genos') {
      _drawGenosHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'escanor') {
      _drawEscanorHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'john_wick') {
      _drawJohnWickHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'todo') {
      _drawTodoHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'engineer') {
      _drawEngineerHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'musashi') {
      _drawMusashiHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'gunslinger') {
      _drawGunslingerHair(ctx, baseRadius, isFacingLeft);
    } else if (fDef.key === 'nameless_deity') {
      drawNamelessDeitySkin(ctx, dummyFighter);
    } else if (fDef.key === 'avatar_of_emptiness' || fDef.key === 'avatarofemptiness') {
      dummyFighter._isStudioDummy = true;
      drawAvatarOfEmptinessSkin(ctx, dummyFighter);
    } else if (fDef.key === 'zeus') {
      _drawZeusHair(ctx, baseRadius, state.studioSkinForm === 'storm', isFacingLeft);
      _drawZeusCrown(ctx, baseRadius, state.studioSkinForm === 'storm', isFacingLeft);
    }

    ctx.restore();
  }

  // Interactive Drag Handles & Guide Overlays on Hero Hair
  if (state.studioSkinShowGuides) {
    const baseCrownY = (isNamelessDeity && activePartId !== 'overall')
      ? 0
      : (fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3);
    const handleCenterX = custom.offsetX;
    const handleCenterY = baseCrownY + custom.offsetY;

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

    // Width-Only Drag Handle (Emerald Circle on right edge)
    const widthHandleX = handleCenterX + (baseRadius * 1.4 * (custom.widthScale ?? 1.0));
    const widthHandleY = handleCenterY;
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / currentScale;
    ctx.beginPath();
    ctx.arc(widthHandleX, widthHandleY, 4.5 / currentScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Height-Only Drag Handle (Violet Circle on top edge)
    const heightHandleX = handleCenterX;
    const heightHandleY = handleCenterY - (baseRadius * 0.8 * (custom.heightScale ?? 1.0));
    ctx.save();
    ctx.fillStyle = '#8b5cf6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / currentScale;
    ctx.beginPath();
    ctx.arc(heightHandleX, heightHandleY, 4.5 / currentScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Dual/Uniform Scale Drag Handle (Amber Circle on top right)
    const scaleHandleX = widthHandleX;
    const scaleHandleY = heightHandleY;
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / currentScale;
    ctx.beginPath();
    ctx.arc(scaleHandleX, scaleHandleY, 5 / currentScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Rotation Angle Drag Handle (Rose Circle on orbit stalk)
    const curAngle = custom.angleOffset ?? 0;
    const rotStalkLen = baseRadius * 1.6;
    const rotHandleX = handleCenterX + Math.cos(curAngle - Math.PI / 2) * rotStalkLen;
    const rotHandleY = handleCenterY + Math.sin(curAngle - Math.PI / 2) * rotStalkLen;

    ctx.save();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.2 / currentScale;
    ctx.setLineDash([2 / currentScale, 2 / currentScale]);
    ctx.beginPath();
    ctx.moveTo(handleCenterX, handleCenterY);
    ctx.lineTo(rotHandleX, rotHandleY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / currentScale;
    ctx.beginPath();
    ctx.arc(rotHandleX, rotHandleY, 4.5 / currentScale, 0, Math.PI * 2);
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
  drawButton(facingLabel, topBarX + 42, topBarY + 10, () => {
    state.studioSkinFacing = (state.studioSkinFacing === 'right') ? 'left' : 'right';
  }, 84, 20, null, 3);
  topBarX += 88;

  // Quick Flip X & Flip Y Buttons for the Active Asset
  const flipXLabel = custom.flipX ? 'FLIP X: ↔ ON' : 'FLIP X: ↔';
  drawButton(flipXLabel, topBarX + 40, topBarY + 10, () => {
    custom.flipX = !custom.flipX;
    saveSkinCustomizations();
  }, 80, 20, custom.flipX ? '#10b981' : null, 3);
  topBarX += 86;

  const flipYLabel = custom.flipY ? 'FLIP Y: ↕ ON' : 'FLIP Y: ↕';
  drawButton(flipYLabel, topBarX + 40, topBarY + 10, () => {
    custom.flipY = !custom.flipY;
    saveSkinCustomizations();
  }, 80, 20, custom.flipY ? '#10b981' : null, 3);
  topBarX += 86;

  // Form Selector Button (if fighter has multiple forms)
  if (fDef.key === 'eye_of_cthulhu') {
    const isP2 = state.studioSkinForm === 'phase2';
    drawButton('👁️ PHASE 1', topBarX + 44, topBarY + 10, () => {
      state.studioSkinForm = 'default';
    }, 88, 20, !isP2 ? '#e11d48' : null, 3);
    topBarX += 94;

    drawButton('🦷 PHASE 2', topBarX + 44, topBarY + 10, () => {
      state.studioSkinForm = 'phase2';
    }, 88, 20, isP2 ? '#e11d48' : null, 3);
    topBarX += 94;
  } else if (fDef.key === 'nameless_deity') {
    const isSkin2 = (state.selectedNamelessDeitySkin === 'skin2');
    drawButton('🌌 COSMIC', topBarX + 44, topBarY + 10, () => {
      state.selectedNamelessDeitySkin = 'skin1';
      try { localStorage.setItem('selectedNamelessDeitySkin', 'skin1'); } catch (e) {}
    }, 88, 20, !isSkin2 ? '#00F0FF' : null, 3);
    topBarX += 94;

    drawButton('👑 GOLDEN', topBarX + 44, topBarY + 10, () => {
      state.selectedNamelessDeitySkin = 'skin2';
      try { localStorage.setItem('selectedNamelessDeitySkin', 'skin2'); } catch (e) {}
    }, 88, 20, isSkin2 ? '#FFD700' : null, 3);
    topBarX += 94;
  } else if (fDef.forms && fDef.forms.length > 1) {
    const currentFormDef = fDef.forms.find(fm => fm.id === state.studioSkinForm) || fDef.forms[0];
    const btnLabel = `FORM: ${currentFormDef.label}`;
    const btnW = Math.max(110, btnLabel.length * 7.5 + 16);
    drawButton(btnLabel, topBarX + btnW / 2, topBarY + 10, () => {
      const idx = fDef.forms.findIndex(fm => fm.id === state.studioSkinForm);
      const nextIdx = (idx + 1) % fDef.forms.length;
      state.studioSkinForm = fDef.forms[nextIdx].id;
    }, btnW, 20, null, 3);
    topBarX += btnW + 8;
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

  // ── Nameless Deity Multi-Asset Part Selector Bar (Inside Viewport) ──
  if (isNamelessDeity) {
    const totalParts = NAMELESS_DEITY_PARTS.length;
    const maxCols = 7;
    const partBtnH = 19;
    const partGapX = 5;
    const partGapY = 3;
    const partStartX = viewportX + 10;
    const availableW = viewportW - 20;
    const partBtnW = Math.floor((availableW - (partGapX * (maxCols - 1))) / maxCols);
    const startY = viewportY + 34;

    NAMELESS_DEITY_PARTS.forEach((part, idx) => {
      const isPartSelected = (activePartId === part.id);
      const row = Math.floor(idx / maxCols);
      const col = idx % maxCols;
      const bx = partStartX + col * (partBtnW + partGapX);
      const by = startY + row * (partBtnH + partGapY);

      ctx.save();
      if (isPartSelected) {
        ctx.fillStyle = '#21050c';
        ctx.strokeStyle = '#FFE259';
        ctx.lineWidth = 1.8;
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, bx, by, partBtnW, partBtnH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPartSelected ? '#FFE259' : '#94a3b8';
      ctx.font = isPartSelected ? '900 9.5px "Rajdhani", sans-serif' : '700 9px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(part.label, bx + partBtnW / 2, by + partBtnH / 2);
      ctx.restore();

      _registerButton(bx, by, partBtnW, partBtnH, () => {
        state.studioSkinNamelessPart = part.id;
      });
    });
  }

  // ── Avatar of Emptiness Multi-Asset Part Selector Bar (Inside Viewport) ──
  if (isAvatarOfEmptiness) {
    const totalParts = AVATAR_OF_EMPTINESS_PARTS.length;
    const maxCols = 7;
    const partBtnH = 19;
    const partGapX = 5;
    const partGapY = 3;
    const partStartX = viewportX + 10;
    const availableW = viewportW - 20;
    const partBtnW = Math.floor((availableW - (partGapX * (maxCols - 1))) / maxCols);
    const startY = viewportY + 34;

    AVATAR_OF_EMPTINESS_PARTS.forEach((part, idx) => {
      const isPartSelected = (activeAvatarPartId === part.id);
      const row = Math.floor(idx / maxCols);
      const col = idx % maxCols;
      const bx = partStartX + col * (partBtnW + partGapX);
      const by = startY + row * (partBtnH + partGapY);

      ctx.save();
      if (isPartSelected) {
        ctx.fillStyle = '#1A0B2E';
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 1.8;
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, bx, by, partBtnW, partBtnH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPartSelected ? '#00F5D4' : '#94a3b8';
      ctx.font = isPartSelected ? '900 9.5px "Rajdhani", sans-serif' : '700 9px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(part.label, bx + partBtnW / 2, by + partBtnH / 2);
      ctx.restore();

      _registerButton(bx, by, partBtnW, partBtnH, () => {
        state.studioSkinAvatarPart = part.id;
      });
    });
  }

  // ── Viewport Zoom Controls (Bottom of Viewport) ──
  const zoomY = viewportY + viewportH - 22;
  const zoomCenterX = heroX;
  const zoomPct = Math.round((currentScale / ZOOM_DEFAULT) * 100);

  // Viewport "Make Adjustments Default" quick-action button
  drawButton('💾 MAKE ADJUSTMENTS DEFAULT', viewportX + 90, zoomY, () => {
    setFighterCustomAsDefault(activeCustomKey, custom);
    _copyToastText = `✓ SAVED ${fDef.label} AS PERMANENT DEFAULT!`;
    _copyToastTimer = 90;
  }, 170, 20, '#10b981', 3);

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

  // Save as default button in header
  drawButton('💾 SAVE AS DEFAULT', rightConsoleX + rightConsoleW - 62, consoleY + 12, () => {
    setFighterCustomAsDefault(activeCustomKey, custom);
    _copyToastText = `✓ SAVED ${fDef.label} AS PERMANENT DEFAULT!`;
    _copyToastTimer = 90;
  }, 114, 18, '#10b981', 3);

  // CRITICAL: Always reset text alignment to 'left' and 'top' to prevent coordinates overflow
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const tabs = [
    { id: 'scale', label: '1. HAIR SCALE / SIZE', desc: 'Width & Height multipliers' },
    { id: 'position', label: '2. POSITION & SHIFT', desc: 'X/Y & Crown elevation offsets' },
    { id: 'rotation', label: '3. ROTATION & FLIP', desc: 'Tilt, angle & horizontal/vertical flip' },
    { id: 'export', label: '4. CODE & BULK PRESETS', desc: 'Export JS & Bulk JSON Presets' },
    { id: 'assets', label: '5. ASSET REGISTRY', desc: 'Skins, weapons & active assets' }
  ];

  // Left Console: Tab Cards
  tabs.forEach((tab, idx) => {
    const cardY = consoleY + 28 + idx * 44;
    const cardW = leftConsoleW - 20;
    const cardH = 38;
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
    ctx.font = '900 9.5px "Rajdhani", sans-serif';
    ctx.fillText(tab.label, cardX + 8, cardY + 6);

    ctx.fillStyle = isSelected ? `${themeColor}` : '#64748b';
    ctx.font = '700 8px "Rajdhani", sans-serif';
    ctx.fillText(tab.desc, cardX + 8, cardY + 20);

    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.studioSkinDetailTab = tab.id;
    });
  });

  // Fighter Info Box in Left Console Bottom
  const infoCardX = leftConsoleX + 10;
  const infoCardY = consoleY + 254;
  const infoCardW = leftConsoleW - 20;
  const infoCardH = 78;

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
  if (isNamelessDeity && activePartDef) {
    ctx.fillText(`MODEL: ${fDef.label}`, infoCardX + 8, infoCardY + 8);
    ctx.fillStyle = '#FFE259';
    ctx.fillText(`ACTIVE ASSET: [ ${activePartDef.fullLabel} ]`, infoCardX + 8, infoCardY + 24);
    ctx.fillStyle = '#94a3b8';
    const displayPartAsset = activePartDef.asset.length > 22 ? activePartDef.asset.slice(0, 20) + '…' : activePartDef.asset;
    ctx.fillText(`ASSET: ${displayPartAsset}`, infoCardX + 8, infoCardY + 40);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`TARGET: ${activeCustomKey}`, infoCardX + 8, infoCardY + 56);
  } else if (isAvatarOfEmptiness && activeAvatarPartDef) {
    ctx.fillText(`MODEL: ${fDef.label}`, infoCardX + 8, infoCardY + 8);
    ctx.fillStyle = '#00F5D4';
    ctx.fillText(`ACTIVE ASSET: [ ${activeAvatarPartDef.fullLabel} ]`, infoCardX + 8, infoCardY + 24);
    ctx.fillStyle = '#94a3b8';
    const displayPartAsset = activeAvatarPartDef.asset.length > 22 ? activeAvatarPartDef.asset.slice(0, 20) + '…' : activeAvatarPartDef.asset;
    ctx.fillText(`ASSET: ${displayPartAsset}`, infoCardX + 8, infoCardY + 40);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`TARGET: ${activeCustomKey}`, infoCardX + 8, infoCardY + 56);
  } else {
    ctx.fillText(`MODEL: ${fDef.label}`, infoCardX + 8, infoCardY + 8);
    ctx.fillText(`ASSET: ${fDef.asset}`, infoCardX + 8, infoCardY + 24);
    ctx.fillText(`DIMS: ${fDef.assetDims || 'Standard'}`, infoCardX + 8, infoCardY + 40);
    ctx.fillText(`BASE: ${fDef.baseW}r W | ${fDef.baseH}r H`, infoCardX + 8, infoCardY + 56);
  }

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

    if (isNamelessDeity && activePartId === 'antlers') {
      // ── ANTLER GAP / SPREAD ROW ──
      ctx.save();
      ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
      ctx.strokeStyle = 'rgba(255, 226, 89, 0.35)';
      ctx.lineWidth = 1.2;
      drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFE259';
      ctx.font = '900 10.5px "Rajdhani", sans-serif';
      ctx.fillText(`ANTLER GAP: ${Math.round(custom.gap ?? 0)}px`, rowX + 8, curY + rowH / 2);

      drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
        custom.gap = Math.max(-50, (custom.gap ?? 0) - 5);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
        custom.gap = Math.max(-50, (custom.gap ?? 0) - 1);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
        custom.gap = Math.min(120, (custom.gap ?? 0) + 1);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
        custom.gap = Math.min(120, (custom.gap ?? 0) + 5);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      curY += 46;
    }

    // Scale Reset button & Save Default
    const halfW = Math.floor((rowW - 6) / 2);
    drawButton('RESET SCALE', rowX + halfW / 2, curY + 12, () => {
      const def = getFighterDefaultCustom(activeCustomKey);
      custom.widthScale = def.widthScale ?? 1.0;
      custom.heightScale = def.heightScale ?? 1.0;
      if (custom.gap !== undefined) custom.gap = def.gap ?? 0;
      saveSkinCustomizations();
      _copyToastText = `✓ RESET SCALE TO DEFAULT (${custom.widthScale}x, ${custom.heightScale}x)!`;
      _copyToastTimer = 90;
    }, halfW, 22, null, 3);

    drawButton('💾 SET DEFAULT', rowX + halfW + 6 + halfW / 2, curY + 12, () => {
      setFighterCustomAsDefault(activeCustomKey, custom);
      _copyToastText = `✓ SAVED ${fDef.label} AS PERMANENT DEFAULT!`;
      _copyToastTimer = 90;
    }, halfW, 22, '#10b981', 3);
    curY += 34;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.fillText('TIP: DRAG GREEN/VIOLET HANDLES FOR WIDTH/HEIGHT', rowX, curY + 4);
    ctx.fillText('OR DRAG AMBER HANDLE FOR DUAL SCALING', rowX, curY + 18);

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

    if (isNamelessDeity && activePartId === 'antlers') {
      // ── ANTLER GAP / SPREAD ROW (Position Tab) ──
      ctx.save();
      ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
      ctx.strokeStyle = 'rgba(255, 226, 89, 0.35)';
      ctx.lineWidth = 1.2;
      drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFE259';
      ctx.font = '900 10.5px "Rajdhani", sans-serif';
      ctx.fillText(`ANTLER GAP: ${Math.round(custom.gap ?? 0)}px`, rowX + 8, curY + rowH / 2);

      drawButton('−−', rowX + rowW - 74, curY + rowH / 2, () => {
        custom.gap = Math.max(-50, (custom.gap ?? 0) - 5);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      drawButton('−', rowX + rowW - 52, curY + rowH / 2, () => {
        custom.gap = Math.max(-50, (custom.gap ?? 0) - 1);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      drawButton('+', rowX + rowW - 30, curY + rowH / 2, () => {
        custom.gap = Math.min(120, (custom.gap ?? 0) + 1);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      drawButton('++', rowX + rowW - 8, curY + rowH / 2, () => {
        custom.gap = Math.min(120, (custom.gap ?? 0) + 5);
        saveSkinCustomizations();
      }, 18, btnSize, null, 2);
      curY += 46;
    }

    // Quick Reset Position & Save Default Buttons
    const halfPosW = Math.floor((rowW - 6) / 2);
    drawButton('RESET POSITION', rowX + halfPosW / 2, curY + 12, () => {
      const def = getFighterDefaultCustom(activeCustomKey);
      custom.offsetX = def.offsetX ?? 0;
      custom.offsetY = def.offsetY ?? 0;
      if (custom.gap !== undefined) custom.gap = def.gap ?? 0;
      saveSkinCustomizations();
      _copyToastText = `✓ RESET POSITION TO DEFAULT (${custom.offsetX}X, ${custom.offsetY}Y)!`;
      _copyToastTimer = 90;
    }, halfPosW, 22, null, 3);

    drawButton('💾 SET DEFAULT', rowX + halfPosW + 6 + halfPosW / 2, curY + 12, () => {
      setFighterCustomAsDefault(activeCustomKey, custom);
      _copyToastText = `✓ SAVED ${fDef.label} AS PERMANENT DEFAULT!`;
      _copyToastTimer = 90;
    }, halfPosW, 22, '#10b981', 3);
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

    // ── FLIP HORIZONTAL (X) ROW ──
    ctx.save();
    ctx.fillStyle = custom.flipX ? 'rgba(16, 185, 129, 0.15)' : 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = custom.flipX ? '#10b981' : 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = custom.flipX ? 1.4 : 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = custom.flipX ? '#34d399' : '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`FLIP X (HORIZONTAL): ${custom.flipX ? 'ON' : 'OFF'}`, rowX + 8, curY + rowH / 2);

    drawButton(custom.flipX ? '✓ FLIP X: ON' : 'FLIP X: OFF', rowX + rowW - 48, curY + rowH / 2, () => {
      custom.flipX = !custom.flipX;
      saveSkinCustomizations();
    }, 84, btnSize + 2, custom.flipX ? '#10b981' : null, 2);
    curY += 46;

    // ── FLIP VERTICAL (Y) ROW ──
    ctx.save();
    ctx.fillStyle = custom.flipY ? 'rgba(16, 185, 129, 0.15)' : 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = custom.flipY ? '#10b981' : 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = custom.flipY ? 1.4 : 1;
    drawChamferedRect(ctx, rowX, curY, rowW, rowH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = custom.flipY ? '#34d399' : '#ffffff';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`FLIP Y (VERTICAL): ${custom.flipY ? 'ON' : 'OFF'}`, rowX + 8, curY + rowH / 2);

    drawButton(custom.flipY ? '✓ FLIP Y: ON' : 'FLIP Y: OFF', rowX + rowW - 48, curY + rowH / 2, () => {
      custom.flipY = !custom.flipY;
      saveSkinCustomizations();
    }, 84, btnSize + 2, custom.flipY ? '#10b981' : null, 2);
    curY += 46;

    // Reset Angle & Flip Buttons
    const halfRotW = Math.floor((rowW - 6) / 2);
    drawButton('RESET ANGLE', rowX + halfRotW / 2, curY + 12, () => {
      const def = getFighterDefaultCustom(activeCustomKey);
      custom.angleOffset = def.angleOffset ?? 0;
      saveSkinCustomizations();
      _copyToastText = '✓ RESET ANGLE TO DEFAULT!';
      _copyToastTimer = 90;
    }, halfRotW, 22, null, 3);

    drawButton('RESET FLIP', rowX + halfRotW + 6 + halfRotW / 2, curY + 12, () => {
      const def = getFighterDefaultCustom(activeCustomKey);
      custom.flipX = def.flipX ?? false;
      custom.flipY = def.flipY ?? false;
      saveSkinCustomizations();
      _copyToastText = '✓ RESET FLIP TO DEFAULT!';
      _copyToastTimer = 90;
    }, halfRotW, 22, null, 3);
    curY += 34;

    drawButton('💾 MAKE ADJUSTMENTS DEFAULT', rowX + rowW / 2, curY + 10, () => {
      setFighterCustomAsDefault(activeCustomKey, custom);
      _copyToastText = `✓ SAVED ${fDef.label} AS PERMANENT DEFAULT!`;
      _copyToastTimer = 90;
    }, rowW, 22, '#10b981', 3);
    curY += 38;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.fillText('TIP: FLIP X/Y TO MIRROR ASSETS ACROSS THEIR AXIS', rowX, curY + 4);
    ctx.fillText('CLICK BUTTONS TO INSTANTLY TOGGLE LIVE PREVIEW', rowX, curY + 18);

  } else if (state.studioSkinDetailTab === 'export') {
    // ── SUB-HEADER: SINGLE VS BULK TOGGLE ──
    const exportMode = state.studioSkinExportSubTab || 'single';
    const subTabBtnW = Math.floor((rowW - 6) / 2);
    const subTabH = 20;

    drawButton(exportMode === 'single' ? '● SINGLE FIGHTER' : 'SINGLE FIGHTER', rowX + subTabBtnW / 2, curY + subTabH / 2, () => {
      state.studioSkinExportSubTab = 'single';
    }, subTabBtnW, subTabH, exportMode === 'single' ? themeColor : null, 3);

    drawButton(exportMode === 'bulk' ? '● 📦 BULK PRESETS' : '📦 BULK PRESETS', rowX + subTabBtnW + 6 + subTabBtnW / 2, curY + subTabH / 2, () => {
      state.studioSkinExportSubTab = 'bulk';
    }, subTabBtnW, subTabH, exportMode === 'bulk' ? '#10b981' : null, 3);

    curY += subTabH + 8;

    if (exportMode === 'single') {
      // ── SINGLE FIGHTER LIVE JS CODE EXPORT ──
      const jsCode = generateJsCode(fDef, custom);
      const codeBoxX = rowX;
      const codeBoxY = curY;
      const codeBoxW = rowW;
      const codeBoxH = 175;

      ctx.save();
      ctx.fillStyle = 'rgba(7, 10, 16, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

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

      curY += codeBoxH + 8;

      const halfBtnW = Math.floor((rowW - 8) / 2);
      if (isNamelessDeity) {
        const allDeityParts = {
          overall: state.skinCustomizations?.nameless_deity || {},
          body: state.skinCustomizations?.nameless_deity_body || {},
          cicada: state.skinCustomizations?.nameless_deity_cicada || {},
          censor: state.skinCustomizations?.nameless_deity_censor || {},
          vines: state.skinCustomizations?.nameless_deity_vines || {},
          flowers: state.skinCustomizations?.nameless_deity_flowers || {},
          wings: state.skinCustomizations?.nameless_deity_wings || {},
          halo: state.skinCustomizations?.nameless_deity_halo || {},
          wheel: state.skinCustomizations?.nameless_deity_wheel || {},
          arm: state.skinCustomizations?.nameless_deity_arm || {},
          forearm: state.skinCustomizations?.nameless_deity_forearm || {},
          hand: state.skinCustomizations?.nameless_deity_hand || {}
        };
        const allPartsJson = JSON.stringify(allDeityParts, null, 2);

        drawButton(`📋 COPY ${activePartDef?.shortLabel || 'PART'}`, rowX + halfBtnW / 2, curY + 10, () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(jsCode).then(() => {
              _copyToastText = `✓ COPIED ${activePartDef?.shortLabel || 'PART'}!`;
              _copyToastTimer = 90;
            });
          }
        }, halfBtnW, 22, null, 3);

        drawButton('📋 ALL PARTS JSON', rowX + halfBtnW + 8 + halfBtnW / 2, curY + 10, () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(allPartsJson).then(() => {
              _copyToastText = '✓ COPIED ALL 12 PARTS JSON!';
              _copyToastTimer = 90;
            });
          }
        }, halfBtnW, 22, '#FFE259', 3);
      } else if (isAvatarOfEmptiness) {
        const allAvatarParts = {
          overall: state.skinCustomizations?.avatar_of_emptiness || {},
          body: state.skinCustomizations?.avatar_of_emptiness_body || {},
          arm_left: state.skinCustomizations?.avatar_of_emptiness_arm_left || {},
          arm_right: state.skinCustomizations?.avatar_of_emptiness_arm_right || {},
          forearm_left: state.skinCustomizations?.avatar_of_emptiness_forearm_left || {},
          forearm_right: state.skinCustomizations?.avatar_of_emptiness_forearm_right || {}
        };
        const allPartsJson = JSON.stringify(allAvatarParts, null, 2);

        drawButton(`📋 COPY ${activeAvatarPartDef?.shortLabel || 'PART'}`, rowX + halfBtnW / 2, curY + 10, () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(jsCode).then(() => {
              _copyToastText = `✓ COPIED ${activeAvatarPartDef?.shortLabel || 'PART'}!`;
              _copyToastTimer = 90;
            });
          }
        }, halfBtnW, 22, null, 3);

        drawButton('📋 ALL PARTS JSON', rowX + halfBtnW + 8 + halfBtnW / 2, curY + 10, () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(allPartsJson).then(() => {
              _copyToastText = '✓ COPIED ALL AVATAR PARTS JSON!';
              _copyToastTimer = 90;
            });
          }
        }, halfBtnW, 22, '#00F5D4', 3);
      } else {
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

      curY += 26;
      drawButton(`💾 MAKE ADJUSTMENTS DEFAULT (${fDef.label})`, rowX + rowW / 2, curY + 10, () => {
        setFighterCustomAsDefault(activeCustomKey, custom);
        _copyToastText = `✓ SAVED ${fDef.label} AS PERMANENT DEFAULT!`;
        _copyToastTimer = 90;
      }, rowW, 22, '#10b981', 3);

      curY += 26;
      const resetHalfW = Math.floor((rowW - 6) / 2);
      drawButton(`🔄 RESET SAVED`, rowX + resetHalfW / 2, curY + 10, () => {
        const def = getFighterDefaultCustom(activeCustomKey, false);
        Object.assign(custom, def);
        saveSkinCustomizations();
        _copyToastText = `✓ RESTORED ${fDef.label} SAVED DEFAULT!`;
        _copyToastTimer = 90;
      }, resetHalfW, 22, '#ef4444', 3);

      drawButton(`🏭 RESTORE FACTORY`, rowX + resetHalfW + 6 + resetHalfW / 2, curY + 10, () => {
        const factoryDef = getFighterDefaultCustom(activeCustomKey, true);
        Object.assign(custom, factoryDef);
        saveSkinCustomizations();
        _copyToastText = `✓ RESTORED ${fDef.label} FACTORY PRESET!`;
        _copyToastTimer = 90;
      }, resetHalfW, 22, '#f59e0b', 3);
    } else {
      // ── BULK PRESETS (ALL FIGHTERS) MODE ──
      const allPresets = state.skinCustomizations || {};
      const presetCount = Object.keys(allPresets).length;
      const bulkJson = JSON.stringify(allPresets, null, 2);

      // Info badge
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, rowX, curY, rowW, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#34d399';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText(`📦 ALL FIGHTER PRESETS (${presetCount} REGISTERED)`, rowX + 8, curY + 11);

      curY += 26;

      // Bulk JSON Preview Box
      const codeBoxX = rowX;
      const codeBoxY = curY;
      const codeBoxW = rowW;
      const codeBoxH = 140;

      ctx.save();
      ctx.fillStyle = 'rgba(7, 10, 16, 0.95)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '700 8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const bulkLines = bulkJson.split('\n');
      bulkLines.forEach((line, lIdx) => {
        if (codeBoxY + 6 + lIdx * 12 < codeBoxY + codeBoxH - 6) {
          ctx.fillText(line, codeBoxX + 8, codeBoxY + 6 + lIdx * 12);
        }
      });

      curY += codeBoxH + 6;

      // Action Deck 1: Copy All JSON & Export JSON File
      const halfBtnW = Math.floor((rowW - 8) / 2);
      drawButton('📋 COPY ALL JSON', rowX + halfBtnW / 2, curY + 10, () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(bulkJson).then(() => {
            _copyToastText = `✓ COPIED ALL ${presetCount} PRESETS JSON!`;
            _copyToastTimer = 90;
          });
        }
      }, halfBtnW, 22, '#10b981', 3);

      drawButton('💾 EXPORT JSON FILE', rowX + halfBtnW + 8 + halfBtnW / 2, curY + 10, () => {
        const ok = exportBulkPresetsToFile();
        if (ok) {
          _copyToastText = '✓ EXPORTED PRESETS FILE!';
          _copyToastTimer = 90;
        }
      }, halfBtnW, 22, '#06b6d4', 3);

      curY += 26;

      // Action Deck 2: Copy Database JS Module Code & Download Database JS File
      drawButton('📋 COPY DATABASE JS', rowX + halfBtnW / 2, curY + 10, () => {
        const dbCode = generateDatabaseModuleCode(state.skinCustomizations);
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(dbCode).then(() => {
            _copyToastText = '✓ COPIED FULL DATABASE JS CODE!';
            _copyToastTimer = 90;
          });
        }
      }, halfBtnW, 22, '#8b5cf6', 3);

      drawButton('💾 DOWNLOAD DATABASE.JS', rowX + halfBtnW + 8 + halfBtnW / 2, curY + 10, () => {
        const ok = downloadDatabaseFile();
        if (ok) {
          _copyToastText = '✓ DOWNLOADED skinCustomizationsDatabase.js!';
          _copyToastTimer = 90;
        }
      }, halfBtnW, 22, '#ec4899', 3);

      curY += 26;

      // Action Deck 3: Import File & Paste JSON / Reset
      drawButton('📥 IMPORT FILE', rowX + halfBtnW / 2, curY + 10, () => {
        importBulkPresetsFromFile((count) => {
          _copyToastText = `✓ IMPORTED ${count} FIGHTER PRESETS!`;
          _copyToastTimer = 90;
        }, (err) => {
          alert(`Import failed: ${err?.message || err}`);
        });
      }, halfBtnW, 22, '#3b82f6', 3);

      drawButton('📋 PASTE / IMPORT', rowX + halfBtnW + 8 + halfBtnW / 2, curY + 10, () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then((clipText) => {
            if (clipText && clipText.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(clipText);
                const count = validateAndMergeSkinPresets(parsed);
                _copyToastText = `✓ IMPORTED ${count} PRESETS FROM CLIPBOARD!`;
                _copyToastTimer = 90;
                return;
              } catch (e) {}
            }
            const manual = prompt('Paste your Bulk Skin Customizations JSON here:');
            if (manual) {
              try {
                const parsed = JSON.parse(manual);
                const count = validateAndMergeSkinPresets(parsed);
                _copyToastText = `✓ IMPORTED ${count} PRESETS!`;
                _copyToastTimer = 90;
              } catch (e) {
                alert(`Invalid JSON: ${e?.message || e}`);
              }
            }
          }).catch(() => {
            const manual = prompt('Paste your Bulk Skin Customizations JSON here:');
            if (manual) {
              try {
                const parsed = JSON.parse(manual);
                const count = validateAndMergeSkinPresets(parsed);
                _copyToastText = `✓ IMPORTED ${count} PRESETS!`;
                _copyToastTimer = 90;
              } catch (e) {
                alert(`Invalid JSON: ${e?.message || e}`);
              }
            }
          });
        } else {
          const manual = prompt('Paste your Bulk Skin Customizations JSON here:');
          if (manual) {
            try {
              const parsed = JSON.parse(manual);
              const count = validateAndMergeSkinPresets(parsed);
              _copyToastText = `✓ IMPORTED ${count} PRESETS!`;
              _copyToastTimer = 90;
            } catch (e) {
              alert(`Invalid JSON: ${e?.message || e}`);
            }
          }
        }
      }, halfBtnW, 22, '#059669', 3);

      curY += 26;

      // Action Deck 4: Reset All to Clean Defaults
      drawButton('🏭 RESTORE ALL FACTORY DATABASE DEFAULTS', rowX + rowW / 2, curY + 10, () => {
        if (confirm('Reset ALL fighter customizations to their factory calibrated database presets?')) {
          resetAllFightersToDefault(true);
          _copyToastText = '✓ ALL PRESETS RESTORED TO FACTORY DATABASE DEFAULTS!';
          _copyToastTimer = 90;
        }
      }, rowW, 22, '#ef4444', 3);
    }
  } else if (state.studioSkinDetailTab === 'assets') {
    // ── ASSETS & VARIANTS REGISTRY ──
    const charAssets = CONFIG[fDef.key]?.assets || {};
    const assetEntries = Object.entries(charAssets);

    // Header / Stats card
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rowX, curY, rowW, 36, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = themeColor;
    ctx.font = '900 11px "Rajdhani", sans-serif';
    ctx.fillText(`⚡ ${fDef.label} ASSET REGISTRY (${assetEntries.length} REGISTERED)`, rowX + 10, curY + 18);
    curY += 42;

    if (assetEntries.length === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(12, 16, 24, 0.90)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, rowX, curY, rowW, 50, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 9.5px "Rajdhani", sans-serif';
      ctx.fillText('Pure procedural pixel art engine model.', rowX + 10, curY + 16);
      ctx.fillStyle = '#64748b';
      ctx.font = '700 8.5px "Rajdhani", monospace';
      ctx.fillText('No external PNG/JPG raster dependencies.', rowX + 10, curY + 34);
      curY += 56;
    } else {
      const maxRows = 5;
      assetEntries.slice(0, maxRows).forEach(([key, assetPath], aIdx) => {
        const itemY = curY + aIdx * 40;
        const itemH = 34;
        ctx.save();
        ctx.fillStyle = 'rgba(12, 16, 24, 0.90)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        drawChamferedRect(ctx, rowX, itemY, rowW, itemH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.font = '900 9.5px "Rajdhani", sans-serif';
        ctx.fillText(`● ${key.toUpperCase()}`, rowX + 8, itemY + 5);

        ctx.fillStyle = '#64748b';
        ctx.font = '700 8px "Rajdhani", monospace';
        const displayP = assetPath.length > 36 ? '…' + assetPath.slice(-34) : assetPath;
        ctx.fillText(displayP, rowX + 8, itemY + 19);

        // Copy / Inspect button on right
        const btnW = 55;
        const btnH = 20;
        const btnX = rowX + rowW - btnW - 6;
        const btnY = itemY + 7;
        drawButton('📋 COPY', btnX + btnW / 2, btnY, () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(assetPath).then(() => {
              _copyToastText = `✓ COPIED ${key.toUpperCase()} PATH!`;
              _copyToastTimer = 90;
            });
          }
        }, btnW, btnH, themeColor, 3);
      });
      curY += Math.min(assetEntries.length, maxRows) * 40 + 6;
    }
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
    const targetDesc = isNamelessDeity
      ? `Nameless Deity [${activePartDef?.fullLabel || 'Overall'}]`
      : (isAvatarOfEmptiness ? `Avatar of Emptiness [${activeAvatarPartDef?.fullLabel || 'Overall'}]` : fDef.label);
    if (confirm(`Reset ${targetDesc} customizations to code defaults?`)) {
      let def = {
        widthScale: 1.0,
        heightScale: 1.0,
        offsetX: 0,
        offsetY: 0,
        angleOffset: 0,
        flipX: false,
        flipY: false
      };
      if (isNamelessDeity) {
        const deityPart = NAMELESS_KEY_MAP[activeCustomKey];
        if (deityPart) def = NAMELESS_DEITY_DEFAULT_CONFIGS[deityPart] || def;
      } else if (isAvatarOfEmptiness) {
        const avatarPart = AVATAR_KEY_MAP[activeCustomKey];
        if (avatarPart) def = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS[avatarPart] || def;
      }
      custom.widthScale = def.widthScale;
      custom.heightScale = def.heightScale;
      custom.offsetX = def.offsetX;
      custom.offsetY = def.offsetY;
      custom.angleOffset = def.angleOffset;
      custom.flipX = def.flipX ?? false;
      custom.flipY = def.flipY ?? false;
      saveSkinCustomizations();
      _copyToastText = `✓ RESET ${isNamelessDeity ? activePartDef?.fullLabel : (isAvatarOfEmptiness ? activeAvatarPartDef?.fullLabel : 'DEFAULTS')}!`;
      _copyToastTimer = 75;
    }
  }, 105, 26, null, 4);

  drawButton('💾 SAVE EDITS', 195, bottomY, () => {
    saveSkinCustomizations();
    _copyToastText = '✓ EDITS SAVED PERMANENTLY!';
    _copyToastTimer = 90;
  }, 110, 26, '#10b981', 4);

  drawButton((isNamelessDeity || isAvatarOfEmptiness) ? 'COPY ALL JSON' : 'COPY CODE', 315, bottomY, () => {
    let code = '';
    if (isNamelessDeity) {
      const allDeityParts = {
        overall: state.skinCustomizations?.nameless_deity || {},
        body: state.skinCustomizations?.nameless_deity_body || {},
        cicada: state.skinCustomizations?.nameless_deity_cicada || {},
        censor: state.skinCustomizations?.nameless_deity_censor || {},
        vines: state.skinCustomizations?.nameless_deity_vines || {},
        flowers: state.skinCustomizations?.nameless_deity_flowers || {},
        wings: state.skinCustomizations?.nameless_deity_wings || {},
        halo: state.skinCustomizations?.nameless_deity_halo || {},
        wheel: state.skinCustomizations?.nameless_deity_wheel || {},
        arm: state.skinCustomizations?.nameless_deity_arm || {},
        forearm: state.skinCustomizations?.nameless_deity_forearm || {},
        hand: state.skinCustomizations?.nameless_deity_hand || {}
      };
      code = JSON.stringify(allDeityParts, null, 2);
    } else if (isAvatarOfEmptiness) {
      const allAvatarParts = {
        overall: state.skinCustomizations?.avatar_of_emptiness || {},
        body: state.skinCustomizations?.avatar_of_emptiness_body || {},
        arm_left: state.skinCustomizations?.avatar_of_emptiness_arm_left || {},
        arm_right: state.skinCustomizations?.avatar_of_emptiness_arm_right || {},
        forearm_left: state.skinCustomizations?.avatar_of_emptiness_forearm_left || {},
        forearm_right: state.skinCustomizations?.avatar_of_emptiness_forearm_right || {}
      };
      code = JSON.stringify(allAvatarParts, null, 2);
    } else {
      code = generateJsCode(fDef, custom);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        _copyToastText = isNamelessDeity ? '✓ COPIED ALL 12 PARTS JSON!' : (isAvatarOfEmptiness ? '✓ COPIED ALL AVATAR PARTS JSON!' : '✓ COPIED JS CODE!');
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
        if (f.key === 'nameless_deity' && !state.studioSkinNamelessPart) {
          state.studioSkinNamelessPart = 'overall';
        }
        if ((f.key === 'avatar_of_emptiness' || f.key === 'avatarofemptiness') && !state.studioSkinAvatarPart) {
          state.studioSkinAvatarPart = 'overall';
        }
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
let _cachedSkinStudioRect = null;
function invalidateSkinStudioRect() {
  _cachedSkinStudioRect = null;
}
function getSkinStudioRect(target) {
  if (!_cachedSkinStudioRect) {
    _cachedSkinStudioRect = target.getBoundingClientRect();
  }
  return _cachedSkinStudioRect;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', invalidateSkinStudioRect);
  window.addEventListener('scroll', invalidateSkinStudioRect, { passive: true });

  const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
  if (eventTarget && typeof eventTarget.addEventListener === 'function') {
    eventTarget.addEventListener('mousedown', (e) => {
      if (state.gameState !== 'skinStudio' || state.studioSkinModalOpen) return;

      invalidateSkinStudioRect();
      const rect = getSkinStudioRect(eventTarget);
      const scaleX = state.canvas.width / (rect.width || state.canvas.width);
      const scaleY = state.canvas.height / (rect.height || state.canvas.height);
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
      const isNamelessDeity = (fDef.key === 'nameless_deity');
      const activePartId = isNamelessDeity ? (state.studioSkinNamelessPart || 'overall') : 'overall';
      const isAvatarOfEmptiness = (fDef.key === 'avatar_of_emptiness' || fDef.key === 'avatarofemptiness');
      const activeAvatarPartId = isAvatarOfEmptiness ? (state.studioSkinAvatarPart || 'overall') : 'overall';
      const activeCustomKey = (isNamelessDeity && activePartId !== 'overall')
        ? `nameless_deity_${activePartId}`
        : (isAvatarOfEmptiness && activeAvatarPartId !== 'overall')
          ? `avatar_of_emptiness_${activeAvatarPartId}`
          : fDef.key;
      const custom = ensureFighterCustom(activeCustomKey);

      // Local hero coordinate space
      const localX = (mx - heroX) / currentScale;
      const localY = (my - heroY) / currentScale;

      const baseCrownY = ((isNamelessDeity && activePartId !== 'overall') || (isAvatarOfEmptiness && activeAvatarPartId !== 'overall'))
        ? 0
        : (fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3);
      const handleCenterX = custom.offsetX;
      const handleCenterY = baseCrownY + custom.offsetY;

      // Check center handle click (radius ~14px screen space)
      if (Math.hypot(localX - handleCenterX, localY - handleCenterY) < 14 / currentScale) {
        isDraggingHairCenter = true;
        return;
      }

      // Check width-only handle click (right edge, emerald)
      const widthHandleX = handleCenterX + (baseRadius * 1.4 * (custom.widthScale ?? 1.0));
      const widthHandleY = handleCenterY;
      if (Math.hypot(localX - widthHandleX, localY - widthHandleY) < 14 / currentScale) {
        isDraggingHairWidth = true;
        return;
      }

      // Check height-only handle click (top edge, violet)
      const heightHandleX = handleCenterX;
      const heightHandleY = handleCenterY - (baseRadius * 0.8 * (custom.heightScale ?? 1.0));
      if (Math.hypot(localX - heightHandleX, localY - heightHandleY) < 14 / currentScale) {
        isDraggingHairHeight = true;
        return;
      }

      // Check dual scale handle click (top right, amber)
      const scaleHandleX = widthHandleX;
      const scaleHandleY = heightHandleY;
      if (Math.hypot(localX - scaleHandleX, localY - scaleHandleY) < 14 / currentScale) {
        isDraggingHairScale = true;
        return;
      }

      // Check rotation handle click (rose stalk knob)
      const curAngle = custom.angleOffset ?? 0;
      const rotStalkLen = baseRadius * 1.6;
      const rotHandleX = handleCenterX + Math.cos(curAngle - Math.PI / 2) * rotStalkLen;
      const rotHandleY = handleCenterY + Math.sin(curAngle - Math.PI / 2) * rotStalkLen;
      if (Math.hypot(localX - rotHandleX, localY - rotHandleY) < 14 / currentScale) {
        isDraggingHairRotate = true;
        return;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (state.gameState !== 'skinStudio' || state.studioSkinModalOpen) return;
      if (!isDraggingHairCenter && !isDraggingHairWidth && !isDraggingHairHeight && !isDraggingHairScale && !isDraggingHairRotate) {
        return;
      }

      const rect = getSkinStudioRect(eventTarget);
      const scaleX = state.canvas.width / (rect.width || state.canvas.width);
      const scaleY = state.canvas.height / (rect.height || state.canvas.height);
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
      const isNamelessDeity = (fDef.key === 'nameless_deity');
      const activePartId = isNamelessDeity ? (state.studioSkinNamelessPart || 'overall') : 'overall';
      const isAvatarOfEmptiness = (fDef.key === 'avatar_of_emptiness' || fDef.key === 'avatarofemptiness');
      const activeAvatarPartId = isAvatarOfEmptiness ? (state.studioSkinAvatarPart || 'overall') : 'overall';
      const activeCustomKey = (isNamelessDeity && activePartId !== 'overall')
        ? `nameless_deity_${activePartId}`
        : (isAvatarOfEmptiness && activeAvatarPartId !== 'overall')
          ? `avatar_of_emptiness_${activeAvatarPartId}`
          : fDef.key;
      const custom = ensureFighterCustom(activeCustomKey);

      const localX = (mx - heroX) / currentScale;
      const localY = (my - heroY) / currentScale;
      const baseCrownY = ((isNamelessDeity && activePartId !== 'overall') || (isAvatarOfEmptiness && activeAvatarPartId !== 'overall'))
        ? 0
        : (fDef.baseCrownY ? fDef.baseCrownY * baseRadius : -baseRadius * 1.3);

      if (isDraggingHairCenter) {
        custom.offsetX = Math.round(localX);
        custom.offsetY = Math.round(localY - baseCrownY);
      } else if (isDraggingHairWidth) {
        const handleCenterX = custom.offsetX;
        const dx = Math.abs(localX - handleCenterX);
        custom.widthScale = Math.max(0.2, Math.min(3.5, Number((dx / (baseRadius * 1.4)).toFixed(2))));
      } else if (isDraggingHairHeight) {
        const handleCenterY = baseCrownY + custom.offsetY;
        const dy = Math.abs(localY - handleCenterY);
        custom.heightScale = Math.max(0.2, Math.min(3.5, Number((dy / (baseRadius * 0.8)).toFixed(2))));
      } else if (isDraggingHairScale) {
        const handleCenterX = custom.offsetX;
        const handleCenterY = baseCrownY + custom.offsetY;
        const dx = Math.abs(localX - handleCenterX);
        const dy = Math.abs(localY - handleCenterY);
        custom.widthScale = Math.max(0.2, Math.min(3.5, Number((dx / (baseRadius * 1.4)).toFixed(2))));
        custom.heightScale = Math.max(0.2, Math.min(3.5, Number((dy / (baseRadius * 0.8)).toFixed(2))));
      } else if (isDraggingHairRotate) {
        const handleCenterX = custom.offsetX;
        const handleCenterY = baseCrownY + custom.offsetY;
        const dragAngle = Math.atan2(localY - handleCenterY, localX - handleCenterX) + Math.PI / 2;
        let normAng = Math.atan2(Math.sin(dragAngle), Math.cos(dragAngle));
        custom.angleOffset = Number(normAng.toFixed(3));
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingHairCenter || isDraggingHairScale || isDraggingHairWidth || isDraggingHairHeight || isDraggingHairRotate) {
        saveSkinCustomizations();
      }
      isDraggingHairCenter = false;
      isDraggingHairScale = false;
      isDraggingHairWidth = false;
      isDraggingHairHeight = false;
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
