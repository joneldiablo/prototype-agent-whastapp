import 'dotenv/config';
import { spawn, execSync } from 'child_process';

const watch = process.env.WATCH === 'true';
const opencodePort = process.env.OPENCODE_PORT || '4099';

function cleanup() {
  try {
    execSync('pkill -f chrome || pkill -f chromium || true', { stdio: 'ignore' });
  } catch {}
}

function cleanupWhatsAppSessions() {
  try {
    execSync('rm -rf ./data/whatsapp-sessions/session/lockfile 2>/dev/null || true', { stdio: 'ignore' });
  } catch {}
}

function killOpenCode() {
  try {
    execSync(`fuser -k ${opencodePort}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`pkill -f "opencode serve.*port=${opencodePort}" || true`, { stdio: 'ignore' });
  } catch {}
}

console.log(`Starting server (WATCH=${watch})...`);

let restartCount = 0;

const server = spawn(
  'bun',
  watch 
    ? ['run', '--watch', 'backend/src/index.ts']
    : ['run', 'backend/src/index.ts'],
  { 
    stdio: 'inherit',
    shell: true
  }
);

if (watch) {
  server.on('spawn', () => {
    restartCount++;
    if (restartCount > 1) {
      console.log(`[Watch] Reinicio #${restartCount - 1},清理...`);
      killOpenCode();
      cleanup();
      cleanupWhatsAppSessions();
    }
  });
}

server.on('close', (code) => {
  if (watch && code !== 0) {
    console.log('[Watch] Servidor cayó, cleanup...');
    killOpenCode();
    cleanup();
    cleanupWhatsAppSessions();
  }
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});