const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  let event;
  try {
    event = JSON.parse(input);
  } catch {
    writeOutput({});
    return;
  }

  const eventName = event.hook_event_name;
  if (!event.session_id || !['UserPromptSubmit', 'Stop'].includes(eventName)) {
    writeOutput({});
    return;
  }

  try {
    const snapshot = getWorktreeSnapshot(event.cwd || process.cwd());
    const markerPath = getMarkerPath(event.session_id, snapshot.root);

    if (eventName === 'UserPromptSubmit') {
      fs.mkdirSync(path.dirname(markerPath), { recursive: true });
      fs.writeFileSync(markerPath, JSON.stringify({ digest: snapshot.digest }));
      writeOutput({});
      return;
    }

    if (event.stop_hook_active) {
      fs.rmSync(markerPath, { force: true });
      writeOutput({});
      return;
    }

    let baseline;
    try {
      baseline = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch {
      writeOutput({});
      return;
    }
    fs.rmSync(markerPath, { force: true });

    if (baseline.digest === snapshot.digest) {
      writeOutput({});
      return;
    }

    writeOutput({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        decision: 'block',
        reason: 'Project Git state changed during this prompt. Before finishing, add the required "💡 Suggestions" section with 2–4 relevant follow-ups, each covering Why, Pros, Cons, Don\'t, and a concrete Example Scenario. This hook will allow the next stop.'
      }
    });
  } catch {
    writeOutput({});
  }
});

function getWorktreeSnapshot(cwd) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '-z'], { cwd: root });
  const trackedPaths = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', 'HEAD'], { cwd: root })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const changedPaths = new Set(trackedPaths);

  for (const entry of status.toString('utf8').split('\0')) {
    if (entry.startsWith('?? ')) changedPaths.add(entry.slice(3));
  }

  const hash = createHash('sha256').update(status);
  for (const relativePath of [...changedPaths].sort()) {
    hash.update(relativePath).update('\0');
    const absolutePath = path.join(root, relativePath);
    try {
      const fileStat = fs.statSync(absolutePath);
      hash.update(fileStat.isFile() ? fs.readFileSync(absolutePath) : String(fileStat.size));
    } catch {
      hash.update('<missing>');
    }
  }

  return { root, digest: hash.digest('hex') };
}

function getMarkerPath(sessionId, root) {
  const key = createHash('sha256').update(sessionId).update(root).digest('hex');
  return path.join(os.tmpdir(), 'copilot-post-change-suggestions', `${key}.json`);
}

function writeOutput(value) {
  process.stdout.write(JSON.stringify(value));
}