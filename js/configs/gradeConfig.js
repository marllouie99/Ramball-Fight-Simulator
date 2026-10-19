// ─────────────────────────────────────────────────────────────────────────────
// Fighter Grade Registry — Cosmetic Tier Labels (B < A < S < SS < SSR)
// ─────────────────────────────────────────────────────────────────────────────
// Grades are purely cosmetic: they drive roster / select / HUD badges and never
// modify combat stats. Each fighter config declares `grade: 'B' | 'A' | 'S' | 'SS' | 'SSR'`.
// ─────────────────────────────────────────────────────────────────────────────

/** Ordered list of valid grades (lowest → highest). */
export const GRADES = Object.freeze(['B', 'A', 'S', 'SS', 'SSR']);

/** Grade assigned when a config omits or mistypes its grade. */
export const DEFAULT_GRADE = 'B';

/** Badge palette & sort order per grade. */
export const GRADE_META = Object.freeze({
  B:   Object.freeze({ label: 'B',   order: 0, color: '#10B981', rim: '#065F46', text: '#022C22' }), // Emerald Green
  A:   Object.freeze({ label: 'A',   order: 1, color: '#A855F7', rim: '#581C87', text: '#FAF5FF' }), // Royal Purple
  S:   Object.freeze({ label: 'S',   order: 2, color: '#FFD700', rim: '#B45309', text: '#1A0F02' }), // Radiant 24K Gold
  SS:  Object.freeze({ label: 'SS',  order: 3, color: '#F43F5E', rim: '#FCD34D', text: '#FFFFFF' }), // Crimson Red + Gold Rim
  SSR: Object.freeze({ label: 'SSR', order: 4, color: '#050609', rim: '#FFFFFF', text: '#FFFFFF' }), // Abyss Black + Crisp Silver/White Rim & Text
});

/**
 * Normalizes any grade input into a valid grade string.
 * @param {unknown} grade
 * @returns {'B'|'A'|'S'|'SS'|'SSR'}
 */
export function normalizeGrade(grade) {
  const g = typeof grade === 'string' ? grade.trim().toUpperCase() : '';
  return GRADES.includes(g) ? g : DEFAULT_GRADE;
}

/**
 * Resolves a fighter def / config grade safely.
 * @param {{ grade?: string }|null|undefined} defOrConfig
 * @returns {'B'|'A'|'S'|'SS'}
 */
export function getFighterGrade(defOrConfig) {
  if (!defOrConfig) return DEFAULT_GRADE;
  if (defOrConfig.grade) return normalizeGrade(defOrConfig.grade);
  if (defOrConfig._def?.grade) return normalizeGrade(defOrConfig._def.grade);
  if (defOrConfig.config?.grade) return normalizeGrade(defOrConfig.config.grade);
  return DEFAULT_GRADE;
}

/**
 * Returns the badge palette for a grade.
 * @param {unknown} grade
 * @returns {{ label: string, order: number, color: string, rim: string, text: string }}
 */
export function getGradeMeta(grade) {
  return GRADE_META[normalizeGrade(grade)];
}

/**
 * Comparator for sorting fighter defs by grade (highest first).
 * @param {{ grade?: string }} a
 * @param {{ grade?: string }} b
 * @returns {number}
 */
export function compareByGradeDesc(a, b) {
  return getGradeMeta(b?.grade).order - getGradeMeta(a?.grade).order;
}

/**
 * Renders a compact tactical chamfered grade plate (B / A / S / SS).
 * Single source of truth for all UI screens (CharacterSelectScreen, FighterIndexScreen, etc.)
 * Balanced save/restore, no shadowBlur (Rule 2.2).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Left coordinate
 * @param {number} y Top coordinate
 * @param {string} grade 'B' | 'A' | 'S' | 'SS'
 * @param {{ scale?: number, w?: number, h?: number, showShadow?: boolean }} [options]
 * @returns {{ w: number, h: number }}
 */
export function drawGradeBadge(ctx, x, y, grade, options = {}) {
  const meta = getGradeMeta(grade);
  const scale = options.scale || 1.0;
  const baseW = (meta.label.length > 2 ? 36 : (meta.label.length > 1 ? 28 : 20)) * scale;
  const w = options.w ? options.w * scale : baseW;
  const h = (options.h || 16) * scale;
  const c = Math.max(2, Math.round(3.5 * scale)); // chamfer cut size

  ctx.save();

  // Crisp dark drop shadow for high contrast across any backdrop
  if (options.showShadow !== false) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.moveTo(x + c + 1, y + 1.5);
    ctx.lineTo(x + w + 1, y + 1.5);
    ctx.lineTo(x + w + 1, y + h - c + 1.5);
    ctx.lineTo(x + w - c + 1, y + h + 1.5);
    ctx.lineTo(x + 1, y + h + 1.5);
    ctx.lineTo(x + 1, y + c + 1.5);
    ctx.closePath();
    ctx.fill();
  }

  // Base Plate with Grade Color
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + c);
  ctx.closePath();
  ctx.fillStyle = meta.color;
  ctx.fill();

  // Tactical Rim Outline
  ctx.lineWidth = Math.max(1, 1.4 * scale);
  ctx.strokeStyle = meta.rim;
  ctx.stroke();

  // Grade Label Text
  ctx.fillStyle = meta.text;
  const fontSize = Math.max(8, Math.round(10.5 * scale));
  ctx.font = `900 ${fontSize}px "Outfit", "Rajdhani", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.label, x + w / 2, y + h / 2 + 0.5 * scale);

  ctx.restore();
  return { w, h };
}
