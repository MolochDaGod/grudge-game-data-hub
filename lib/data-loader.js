/**
 * Grudge Game Data Hub — Data Loader
 * Fetches and caches master JSON data from local or ObjectStore CDN.
 */

const CACHE = {};
const BASE_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? '' : 'https://molochdagod.github.io/ObjectStore';

export async function loadJSON(path) {
  if (CACHE[path]) return CACHE[path];
  const localPath = `/data/${path}`;
  const remotePath = `${BASE_URL}/api/v1/${path}`;
  try {
    let res = await fetch(localPath);
    if (!res.ok) res = await fetch(remotePath);
    const data = await res.json();
    CACHE[path] = data;
    return data;
  } catch (err) {
    console.error(`[DataLoader] Failed to load ${path}:`, err);
    return null;
  }
}

export async function loadMasterItems() { return loadJSON('master-items.json'); }
export async function loadMasterRecipes() { return loadJSON('master-recipes.json'); }
export async function loadMasterMaterials() { return loadJSON('master-materials.json'); }
export async function loadMasterAttributes() { return loadJSON('master-attributes.json'); }

export function clearCache() { Object.keys(CACHE).forEach(k => delete CACHE[k]); }
