// ─────────────────────────────────────────────
// Ramball Fight Simulator — Automated Patch Notes Generator
// ─────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CONFIGS_DIR = path.join(process.cwd(), 'js', 'configs');
const CHAR_CONFIGS_DIR = path.join(CONFIGS_DIR, 'characters');

function getGitDiff() {
  try {
    // 1. Check unstaged + staged working changes
    let diff = execSync('git diff HEAD -- js/configs/', { encoding: 'utf8' }).trim();
    let source = 'Working Directory (Uncommitted Changes)';

    // 2. If working directory is clean, inspect latest commit
    if (!diff) {
      diff = execSync('git diff HEAD~1 HEAD -- js/configs/', { encoding: 'utf8' }).trim();
      source = 'Latest Commit (HEAD~1 ➔ HEAD)';
    }

    return { diff, source };
  } catch (err) {
    return { diff: '', source: 'No Git diff available' };
  }
}

function parseConfigDiff(rawDiff) {
  const fileChunks = rawDiff.split('diff --git ');
  const characterChanges = [];

  for (const chunk of fileChunks) {
    if (!chunk.trim()) continue;

    const fileMatch = chunk.match(/b\/js\/configs\/(characters\/)?([a-zA-Z0-9_-]+Config\.js|fighter-balance-sheet\.json)/);
    if (!fileMatch) continue;

    const fileName = fileMatch[2];
    const characterName = fileName.replace('Config.js', '').replace('fighter-balance-sheet.json', 'Global Balance Sheet');

    const lines = chunk.split('\n');
    const deltas = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('-') && !line.startsWith('---')) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.startsWith('+') && !nextLine.startsWith('+++')) {
          const oldMatch = line.slice(1).match(/([a-zA-Z0-9_]+)\s*:\s*([^,\n\r]+)/);
          const newMatch = nextLine.slice(1).match(/([a-zA-Z0-9_]+)\s*:\s*([^,\n\r]+)/);

          if (oldMatch && newMatch && oldMatch[1] === newMatch[1]) {
            const key = oldMatch[1];
            const oldValRaw = oldMatch[2].trim().replace(/['";,]/g, '');
            const newValRaw = newMatch[2].trim().replace(/['";,]/g, '');

            const oldNum = parseFloat(oldValRaw);
            const newNum = parseFloat(newValRaw);

            if (!isNaN(oldNum) && !isNaN(newNum) && String(oldNum) === oldValRaw && String(newNum) === newValRaw) {
              if (oldNum !== newNum) {
                const diffVal = newNum - oldNum;
                const pct = oldNum !== 0 ? ((diffVal / oldNum) * 100).toFixed(1) : '0';
                const sign = diffVal > 0 ? '+' : '';

                const isCooldown = key.toLowerCase().includes('cooldown') || key.toLowerCase().includes('timer') || key.toLowerCase().includes('lag');
                let type = 'ADJUST';
                if (diffVal > 0) {
                  type = isCooldown ? 'NERF' : 'BUFF';
                } else if (diffVal < 0) {
                  type = isCooldown ? 'BUFF' : 'NERF';
                }

                deltas.push({
                  key,
                  oldVal: oldNum,
                  newVal: newNum,
                  pct: `${sign}${pct}%`,
                  type
                });
              }
            } else if (oldValRaw !== newValRaw) {
              deltas.push({
                key,
                oldVal: oldValRaw,
                newVal: newValRaw,
                pct: 'Mod',
                type: 'ADJUST'
              });
            }
          }
        }
      }
    }

    if (deltas.length > 0) {
      characterChanges.push({
        character: characterName.toUpperCase(),
        fileName,
        deltas
      });
    }
  }

  return characterChanges;
}

function generateMarkdownChangelog(changes, source) {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  let md = `# ⚔️ Ramball Fight Simulator — Balance Patch Notes\n`;
  md += `**Generated:** ${dateStr} | **Source:** ${source}\n\n`;
  md += `---\n\n`;

  if (changes.length === 0) {
    md += `*No balance parameter modifications detected in \`js/configs/\`.*\n`;
    return md;
  }

  md += `## 🥊 Fighter Stat Modifications\n\n`;

  for (const c of changes) {
    md += `### ${c.character}\n`;
    for (const d of c.deltas) {
      const tag = d.type === 'BUFF' ? '🟢 BUFF' : d.type === 'NERF' ? '🔴 NERF' : '🔄 ADJUST';
      md += `* **${tag}** \`${d.key}\`: \`${d.oldVal}\` ➔ \`${d.newVal}\` (${d.pct})\n`;
    }
    md += `\n`;
  }

  return md;
}

const DEFAULT_HIGHLIGHTS = [
  {
    tag: 'NEW',
    type: 'new',
    title: 'Ender Dragon Articulated Tail & Flight Animation',
    desc: 'Added 6-frame articulated tail sprite sheet with rear spine socket anchoring, dynamic swishing physics, and swooping afterimages.'
  },
  {
    tag: 'REWORK',
    type: 'rework',
    title: 'Modular Katana Assembly (Weapon Studio)',
    desc: "Granular sub-part tuning for Zenitsu's Nichirin blade across Nagasa (Blade), Tsuba (Guard), Habaki (Collar), Tsuka (Handle), and grip spacing."
  },
  {
    tag: 'VFX',
    type: 'vfx',
    title: 'Escanor Cruel Sun & Solar Poise',
    desc: '6-frame sprite animations, ambient arena floor lighting, and total immunity to gravitational vortexes and suction fields while channeling.'
  }
];

const DEFAULT_ENGINE_NOTES = [
  {
    tag: 'PERF',
    type: 'perf',
    title: 'Zero Layout Thrashing (Weapon & Skin Studio)',
    desc: 'Cached DOM bounding rects during dragging; fixed 13px vertical discrepancy in drag handle registration for butter-smooth 60 FPS live tuning.'
  },
  {
    tag: 'SYSTEM',
    type: 'ai',
    title: 'AI Agent Design & Quality Skills',
    desc: 'Configured workspace playbooks: <code>improve-ui</code>, <code>fixing-motion-performance</code>, <code>baseline-ui</code>, and <code>patch-notes-generator</code>.'
  }
];

function updatePatchNotesDataFile(changes) {
  const targetPath = path.join(process.cwd(), 'js', 'configs', 'patchNotesData.js');

  const balanceChanges = changes.map(c => ({
    character: c.character,
    deltas: c.deltas.map(d => ({
      type: d.type,
      key: d.key,
      oldVal: d.oldVal,
      newVal: d.newVal,
      pct: d.pct
    }))
  }));

  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const now = new Date();
  const dateStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const jsContent = `// ─────────────────────────────────────────────
// Ramball Fight Simulator — Live Patch Notes Data Store
// Automatically updated by: npm run patch-notes
// ─────────────────────────────────────────────

export const patchNotesData = {
  version: 'v2.5.0',
  date: '${dateStr}',
  title: 'VOID TITAN & LIVE BALANCE UPDATES',
  description: 'Ender Dragon Boss Battle, modular Katana assembly, Escanor Cruel Sun VFX, and live combat tuning.',
  highlights: ${JSON.stringify(DEFAULT_HIGHLIGHTS, null, 4)},
  balanceChanges: ${JSON.stringify(balanceChanges, null, 4)},
  engineNotes: ${JSON.stringify(DEFAULT_ENGINE_NOTES, null, 4)}
};
`;

  fs.writeFileSync(targetPath, jsContent, 'utf8');
  console.log(`✅ Live patch notes store successfully written to js/configs/patchNotesData.js`);
}

function updateIndexHtmlCards(changes) {
  const indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let htmlContent = fs.readFileSync(indexPath, 'utf8');

  // 1. Pre-render Highlights
  const highlightsHtml = DEFAULT_HIGHLIGHTS.map(h => {
    const tagClass = `tag-${h.type || 'new'}`;
    return `                      <div class="patchnote-item">\n                        <span class="patchnote-tag ${tagClass}">${h.tag || 'NEW'}</span>\n                        <div class="patchnote-content">\n                          <strong class="patchnote-heading">${h.title}</strong>\n                          <p class="patchnote-desc">${h.desc}</p>\n                        </div>\n                      </div>`;
  }).join('\n');

  const hRegex = /(<div id="patchnotes-highlights-card" class="patchnotes-card">)([\s\S]*?)(<\/div>\s*<\/div>\s*<!-- Section 2:)/;
  if (hRegex.test(htmlContent)) {
    htmlContent = htmlContent.replace(hRegex, `$1\n${highlightsHtml}\n                    </div>\n                  </div>\n\n                  <!-- Section 2:`);
  }

  // 2. Pre-render Balance
  let balanceItemsHtml = '';
  if (changes.length === 0) {
    balanceItemsHtml = `                      <div class="patchnote-item">\n                        <span class="patchnote-tag tag-adj">INFO</span>\n                        <div class="patchnote-content">\n                          <strong class="patchnote-heading">No Active Balance Tweaks</strong>\n                          <p class="patchnote-desc">All fighter configuration attributes are currently at default baseline.</p>\n                        </div>\n                      </div>`;
  } else {
    balanceItemsHtml = changes.map(c => {
      return c.deltas.map(d => {
        const tagClass = d.type === 'BUFF' ? 'tag-buff' : d.type === 'NERF' ? 'tag-nerf' : 'tag-adj';
        return `                      <div class="patchnote-item">\n                        <span class="patchnote-tag ${tagClass}">${d.type}</span>\n                        <div class="patchnote-content">\n                          <strong class="patchnote-heading">${c.character}</strong>\n                          <p class="patchnote-desc"><code>${d.key}</code>: <code>${d.oldVal}</code> ➔ <code>${d.newVal}</code> (${d.pct})</p>\n                        </div>\n                      </div>`;
      }).join('\n');
    }).join('\n');
  }

  const cardRegex = /(<div id="patchnotes-balance-card" class="patchnotes-card">)([\s\S]*?)(<\/div>\s*<\/div>\s*<!-- Section 3:)/;
  if (cardRegex.test(htmlContent)) {
    htmlContent = htmlContent.replace(cardRegex, `$1\n${balanceItemsHtml}\n                    </div>\n                  </div>\n\n                  <!-- Section 3:`);
  }

  fs.writeFileSync(indexPath, htmlContent, 'utf8');
  console.log(`✅ Static HTML pre-rendered in index.html`);
}

// ─────────────────────────────────────────────
// CLI Execution
// ─────────────────────────────────────────────
console.log('🔍 [Patch Notes Generator] Inspecting configuration diffs in js/configs/...\n');

const { diff, source } = getGitDiff();
const changes = parseConfigDiff(diff);

console.log(`📌 Source: ${source}`);
console.log(`📊 Detected Modified Characters / Configs: ${changes.length}\n`);

if (changes.length > 0) {
  for (const c of changes) {
    console.log(`🥊 [${c.character}] (${c.fileName})`);
    for (const d of c.deltas) {
      const colorTag = d.type === 'BUFF' ? '\x1b[32m[BUFF]\x1b[0m' : d.type === 'NERF' ? '\x1b[31m[NERF]\x1b[0m' : '\x1b[33m[ADJUST]\x1b[0m';
      console.log(`   ${colorTag} ${d.key}: ${d.oldVal} -> ${d.newVal} (${d.pct})`);
    }
    console.log('');
  }
} else {
  console.log('ℹ️ No character config numerical deltas detected in current diff.');
}

const changelogMd = generateMarkdownChangelog(changes, source);
const outPath = path.join(process.cwd(), 'CHANGELOG.md');
fs.writeFileSync(outPath, changelogMd, 'utf8');
console.log(`✅ Changelog successfully written to CHANGELOG.md`);

// Always sync in-game live data store and HTML
updatePatchNotesDataFile(changes);
updateIndexHtmlCards(changes);
