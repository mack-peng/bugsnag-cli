import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bugsnag-cli-config-'));

let loadConfig: typeof import('../src/config/config').loadConfig;
let rcFilePath: string;

function clearRc(): void {
  fs.rmSync(rcFilePath, { force: true });
}

function writeRc(profiles: Record<string, unknown>, active = 'default'): void {
  fs.writeFileSync(rcFilePath, JSON.stringify({ active, profiles }, null, 2));
  const future = new Date(Date.now() + Math.random() * 100000);
  fs.utimesSync(rcFilePath, future, future);
}

before(async () => {
  process.env.HOME = home;
  delete process.env.BUGSNAG_AUTH_TOKEN;
  delete process.env.BUGSNAG_BASE_URL;
  delete process.env.BUGSNAG_PROFILE;
  const mod = await import('../src/config/config');
  loadConfig = mod.loadConfig;
  rcFilePath = mod.rcFilePath;
});

after(() => {
  delete process.env.BUGSNAG_AUTH_TOKEN;
  delete process.env.BUGSNAG_BASE_URL;
  delete process.env.BUGSNAG_PROFILE;
  fs.rmSync(home, { recursive: true, force: true });
});

describe('config', () => {
  it('uses --auth-token without an existing profile', () => {
    clearRc();
    const config = loadConfig({ _: [], 'auth-token': 'flag-token' });
    assert.strictEqual(config['auth-token'], 'flag-token');
    assert.strictEqual(config['base-url'], 'https://api.bugsnag.com');
  });

  it('uses BUGSNAG_AUTH_TOKEN without an existing profile', () => {
    clearRc();
    process.env.BUGSNAG_AUTH_TOKEN = 'env-token';
    const config = loadConfig({ _: [] });
    assert.strictEqual(config['auth-token'], 'env-token');
    delete process.env.BUGSNAG_AUTH_TOKEN;
  });

  it('throws Missing required config when no profile and no token', () => {
    clearRc();
    assert.throws(() => loadConfig({ _: [] }), /Missing required config/);
  });

  it('allows display-only config without a token', () => {
    clearRc();
    const config = loadConfig({ _: [] }, { requireAuth: false });
    assert.strictEqual(config['auth-token'], '');
    assert.strictEqual(config['base-url'], 'https://api.bugsnag.com');
  });

  it('prefers CLI flag over env and profile', () => {
    writeRc({ default: { 'auth-token': 'profile-token', 'base-url': 'https://profile.example' } });
    process.env.BUGSNAG_AUTH_TOKEN = 'env-token';
    const config = loadConfig({ _: [], 'auth-token': 'flag-token' });
    assert.strictEqual(config['auth-token'], 'flag-token');
    assert.strictEqual(config['base-url'], 'https://profile.example');
    delete process.env.BUGSNAG_AUTH_TOKEN;
  });
});
