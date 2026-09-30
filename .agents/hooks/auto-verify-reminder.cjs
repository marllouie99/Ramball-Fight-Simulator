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
    process.stdout.write('{}');
    return;
  }

  const toolArgs = (event.toolCall && event.toolCall.args) || {};
  const file = toolArgs.TargetFile || toolArgs.targetFile || '';

  if (/[\\/]scripts[\\/]|[\\/]scratch[\\/]/.test(file)) {
    process.stdout.write(JSON.stringify({
      injectSteps: [{
        ephemeralMessage: "REMINDER: You modified/created a file in scripts/ or scratch/. Remember to DELETE all temporary scratch scripts and run npm run verify before concluding your task."
      }]
    }));
  } else if (/[\\/]js[\\/]/.test(file)) {
    process.stdout.write(JSON.stringify({
      injectSteps: [{
        ephemeralMessage: "REMINDER: You edited a JS source file. Remember to run npm run verify before concluding this task to catch regressions."
      }]
    }));
  } else {
    process.stdout.write('{}');
  }
});
