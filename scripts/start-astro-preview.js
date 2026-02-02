// This script starts the Astro app in the background for the custom server to proxy to.
import { spawn } from 'child_process';

const astroProcess = spawn('npx', ['astro', 'preview', '--port', '4321'], {
  stdio: 'inherit',
  shell: true,
});

astroProcess.on('close', (code) => {
  process.exit(code);
});
