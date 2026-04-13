import 'dotenv/config';
import { spawn } from 'child_process';

const watch = process.env.WATCH === 'true';

console.log(`Starting server (WATCH=${watch})...`);

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

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});