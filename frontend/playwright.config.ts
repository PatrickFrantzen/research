// Playwright-Konfiguration für die E2E- und AXE-Tests (Issues #54, #62).
// Läuft gegen den echten lokalen Stack (e2e/stack.sh): Backend mit frischer
// Datenbank, das auch den Production-Build des Frontends ausliefert.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['E2E_PORT'] ?? 3000);
const istCi = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  // Login ist serverseitig auf 5 Versuche pro Minute und IP begrenzt, Tests
  // teilen sich außerdem eine Datenbank: seriell ist deterministisch.
  workers: 1,
  fullyParallel: false,
  forbidOnly: istCi,
  // Keine Retries: jeder weitere Lauf zählt gegen das Login-Rate-Limit, und
  // ein Flake soll auffallen statt verdeckt zu werden.
  retries: 0,
  reporter: istCi ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    // Der Service Worker (Issue #7) würde gecachte Bundles ausliefern und
    // Requests an page.route() vorbei abwickeln.
    serviceWorkers: 'block',
    // Artefakte nur bei Fehlern (Issue #62).
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      // Optional ein vorinstalliertes Chromium statt der zur Version
      // passenden Playwright-Browser (z. B. in Cloud-Umgebungen).
      executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'] || undefined,
    },
  },
  projects: [
    { name: 'setup', testMatch: /testdaten\.setup\.ts/ },
    {
      name: 'desktop',
      dependencies: ['setup'],
      testIgnore: /mobil\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobil',
      dependencies: ['setup'],
      testMatch: /mobil\.spec\.ts/,
      // Pixel 7 statt iPhone: gleiches Chromium wie Desktop, kein WebKit nötig.
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'bash e2e/stack.sh',
    url: `http://localhost:${PORT}/api/v1/health`,
    // Der Stack setzt die Datenbank zurück: nie einen fremden Server
    // wiederverwenden, sonst sind die Seed-Daten nicht deterministisch.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
