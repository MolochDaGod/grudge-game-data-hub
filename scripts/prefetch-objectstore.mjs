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

const OBJECT_STORE = 'https://molochdagod.github.io/ObjectStore/api/v1';
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
  try {
    const res = await fetch(`${OBJECT_STORE}/${name}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    writeFileSync(join(OUT_DIR, name), body);
    console.log(`[prefetch] ok  ${name} (${body.length} bytes)`);
  } catch (err) {
    console.warn(`[prefetch] skip ${name} - ${err.message}; keeping committed copy`);
  }
}

for (const f of FILES) await pull(f);
console.log('[prefetch] done');
