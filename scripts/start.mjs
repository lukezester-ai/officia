import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const host = process.env.HOST || '0.0.0.0';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`));
    });
  });
}

if (process.env.SKIP_STARTUP_MIGRATIONS === 'true') {
  console.log('Skipping startup migrations because SKIP_STARTUP_MIGRATIONS=true.');
} else {
  console.log('Running database migrations before starting the web server...');
  await run('node', ['scripts/run-migrate.mjs']);
}

console.log('Checking critical auth user columns...');
await run('node', ['scripts/ensure-auth-users.mjs']);

console.log(`Starting Next.js on ${host}:${port}`);
await run(npx, ['next', 'start', '-H', host, '-p', port]);
