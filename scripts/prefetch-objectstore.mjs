#!/usr/bin/env node
/**
 * D6: build-time prefetch of ObjectStore JSON.
 *
 * Fetches the canonical master JSONs from ObjectStore and writes them into
 * docs/data/ so the Vercel build ships a warm cache. The runtime loader
 * (lib/data-loader.js) then re-fetches fresh data from ObjectStore on page
 * load (revalidate). If the build-time fetch fails, the previous committed
 * copies in data/ are kept so deploys never go out empty-handed.
 *
 * Run during `vercel build` via package.json buildCommand.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs', 'data');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Source precedence:
//   1. raw.githubusercontent.com main branch - always fresh on push, no Pages lag
//   2. Pages CDN (molochdagod.github.io/ObjectStore) - fallback in case raw is rate-limited
// We never let a build go out with stale data: if both remotes fail we keep the
// committed local copy (docs/data/*.json) so Vercel never ships empty.
const SOURCES = [
  'https://raw.githubusercontent.com/MolochDaGod/ObjectStore/main/api/v1',
  'https://molochdagod.github.io/ObjectStore/api/v1',
];
const FILES = [
  'master-items.json',
  'master-weapons.json',
  'master-armor.json',
  'master-consumables.json',
  'master-recipes.json',
  'master-materials.json',
  'master-artifacts.json',
  'master-registry.json',
];

async function pull(name) {
  for (const src of SOURCES) {
    try {
      const res = await fetch(`${src}/${name}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      writeFileSync(join(OUT_DIR, name), body);
      const host = new URL(src).hostname;
      console.log(`[prefetch] ok  ${name} (${body.length} bytes) from ${host}`);
      return;
    } catch (err) {
      console.warn(`[prefetch] ${name} failed from ${src} - ${err.message}`);
    }
  }
  console.warn(`[prefetch] all sources failed for ${name}; keeping committed copy`);
}

for (const f of FILES) await pull(f);
console.log('[prefetch] done');
