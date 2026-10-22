import { defineConfig } from '@playwright/test';
import { spawnSync } from 'node:child_process';

process.env.TRACEBRIDGE_HEADED ??= process.env.DISPLAY && !spawnSync('xdotool', ['--version']).error ? '1' : '0';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: '.artifacts/browser',
  reporter: [['list'], ['json', { outputFile: '.artifacts/e2e.json' }]],
});
