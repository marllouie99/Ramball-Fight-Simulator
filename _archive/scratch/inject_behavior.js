const fs = require('fs');

let content = fs.readFileSync('js/systems/projectileSystem.js', 'utf8');

// 1. Add import
if (!content.includes("import { ProjectileBehaviorManager }")) {
  content = content.replace(
    "import { spatialGrid } from './physics.js';",
    "import { spatialGrid } from './physics.js';\nimport { ProjectileBehaviorManager } from './projectiles/ProjectileBehaviorManager.js';"
  );
}

// 2. Add behavior fallback in update()
// We will find `if (p.isExplosion) {` and inject our behavior manager right above it.
if (!content.includes("if (ProjectileBehaviorManager.update(p, fighters, this, { ownerHasEnemyInHole })) {")) {
  const injection = `
      // --- MODULAR BEHAVIOR ROUTING ---
      if (p.behaviorType) {
        const handled = ProjectileBehaviorManager.update(p, fighters, this, { ownerHasEnemyInHole });
        if (handled) continue; 
      }
`;
  content = content.replace("if (p.isExplosion) {", injection + "\n      if (p.isExplosion) {");
}

// 3. Remove Black Hole chunk from update()
const blackHoleStart = content.indexOf("if (p.isBlackHole) {");
if (blackHoleStart !== -1) {
  // Find the end of this block by looking for "if (p.isFlame) {" which comes next.
  const flameStart = content.indexOf("if (p.isFlame) {", blackHoleStart);
  if (flameStart !== -1) {
    // Cut out from blackHoleStart up to (but not including) `// Normal projectile behavior\n      if (p.isFlame)`
    const chunkToRemove = content.substring(blackHoleStart, flameStart - 50); // back up a bit to catch the comments
    // Just to be safe, replace with empty string
    // Let's use a regex that matches from `if (p.isBlackHole)` to just before `if (p.isFlame)`
    const regex = /if\s*\(p\.isBlackHole\)\s*\{[\s\S]*?(?=\/\/\s*Normal projectile behavior)/s;
    content = content.replace(regex, "");
  }
}

// 4. Update fireBlackHole to use the behavior manager
const fireBlackHoleRegex = /fireBlackHole\(x, y, ownerIndex, damage\)\s*\{[\s\S]*?this\.projectiles\.push\(proj\);\s*\}/s;
const newFireBlackHole = `fireBlackHole(x, y, ownerIndex, damage) {
    const proj = this._getProjectile();
    // Delegate initialization to the behavior manager (which delegates to the behavior instance if registered)
    // For now we can just hardcode the initialization call or do it manually, but we should import BlackHoleBehavior in ProjectileBehaviorManager
    
    // We'll just call the init function if it existed, or we can just set behaviorType and let the system handle it
    proj.behaviorType = 'blackHole';
    // The manager's init could be called here, but to avoid circular deps we'll do:
    proj.x = x;
    proj.y = y;
    proj.vx = 0;
    proj.vy = 0;
    proj.r = CONFIG.black.blackHoleRadius;
    proj.life = CONFIG.black.blackHoleDuration;
    proj.maxLife = CONFIG.black.blackHoleDuration;
    proj.color = 'rgba(153,0,255,0.9)';
    proj.owner = ownerIndex;
    proj.damage = damage || CONFIG.black.blackHoleDamage;
    proj.isBlackHole = true;
    proj.transformed = true;
    proj.tickTimer = 0;
    proj.indicatorTimer = CONFIG.black.summonIndicatorFrames;
    proj.indicatorLife = CONFIG.black.summonIndicatorFrames;
    
    this.projectiles.push(proj);
  }`;
content = content.replace(fireBlackHoleRegex, newFireBlackHole);

fs.writeFileSync('js/systems/projectileSystem.js', content, 'utf8');
console.log("Updated projectileSystem.js successfully");
