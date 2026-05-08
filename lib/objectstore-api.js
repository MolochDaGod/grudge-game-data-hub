/**
 * Grudge Game Data Hub — ObjectStore API
 *
 * Canonical URL builders for all Grudge assets on Cloudflare R2.
 * Every game client should import from here instead of hardcoding CDN paths.
 *
 * Usage:
 *   import { getRaceCharacterUrl, getRaceManifest } from '../lib/objectstore-api.js';
 *   const url = getRaceCharacterUrl('orc');
 *   // → https://assets.grudge-studio.com/asset-packs/toon-rts-characters/glb/characters/orc.glb
 */

const CDN = 'https://assets.grudge-studio.com';
const PACK_BASE = `${CDN}/asset-packs/toon-rts-characters`;

// ═══════════════════════════════════════════════════════════════════
// Race Character Models (pre-baked GLBs, textures baked in, ~955KB)
// ═══════════════════════════════════════════════════════════════════

const RACES = ['human', 'orc', 'elf', 'dwarf', 'undead', 'barbarian'];

const RACE_META = {
  human:     { name: 'Human',     displayName: 'Western Kingdoms', prefix: 'WK_',  faction: 'crusade', factionColor: '#c9a04e', mountType: 'horse' },
  orc:       { name: 'Orc',       displayName: 'Orcs',             prefix: 'ORC_', faction: 'legion',  factionColor: '#8b2020', mountType: 'wolf' },
  elf:       { name: 'Elf',       displayName: 'Elves',            prefix: 'ELF_', faction: 'fabled',  factionColor: '#7ec8e3', mountType: 'stag' },
  dwarf:     { name: 'Dwarf',     displayName: 'Dwarves',          prefix: 'DWF_', faction: 'fabled',  factionColor: '#7ec8e3', mountType: 'boar' },
  undead:    { name: 'Undead',     displayName: 'Undead',           prefix: 'UD_',  faction: 'legion',  factionColor: '#8b2020', mountType: 'skeletal_horse' },
  barbarian: { name: 'Barbarian',  displayName: 'Barbarians',       prefix: 'BRB_', faction: 'crusade', factionColor: '#c9a04e', mountType: 'warhorse' },
};

/**
 * Get the pre-baked GLB URL for a race character (textures baked in).
 * @param {string} race - One of: human, orc, elf, dwarf, undead, barbarian
 * @returns {string} Full CDN URL to the .glb file
 */
export function getRaceCharacterUrl(race) {
  return `${PACK_BASE}/glb/characters/${race.toLowerCase()}.glb`;
}

/**
 * Get the GLB URL for a race's cavalry/mounted unit.
 * @param {string} race
 * @returns {string}
 */
export function getRaceCavalryUrl(race) {
  return `${PACK_BASE}/glb/cavalry/${race.toLowerCase()}.glb`;
}

/**
 * Get the GLB URL for a race's siege unit (human/orc catapult, elf bolt thrower).
 * @param {string} race
 * @returns {string|null} null if the race has no siege unit
 */
export function getRaceSiegeUrl(race) {
  const hasSiege = ['human', 'orc', 'elf'];
  if (!hasSiege.includes(race.toLowerCase())) return null;
  return `${PACK_BASE}/glb/siege/${race.toLowerCase()}.glb`;
}

/**
 * Get metadata for a race (name, faction, prefix, mount type, etc.)
 * @param {string} race
 * @returns {object|null}
 */
export function getRaceMeta(race) {
  return RACE_META[race.toLowerCase()] || null;
}

/**
 * Get all available race IDs.
 * @returns {string[]}
 */
export function getRaceIds() {
  return [...RACES];
}

/**
 * Get all race metadata objects.
 * @returns {object[]}
 */
export function getAllRaces() {
  return RACES.map(id => ({ id, ...RACE_META[id] }));
}

// ═══════════════════════════════════════════════════════════════════
// Race Pack Manifest (full customizable FBX data, equipment slots)
// ═══════════════════════════════════════════════════════════════════

let _manifestCache = null;

/**
 * Fetch the full toon-rts-characters manifest from CDN.
 * Cached after first call.
 * @returns {Promise<object|null>}
 */
export async function getRaceManifest() {
  if (_manifestCache) return _manifestCache;
  try {
    const res = await fetch(`${PACK_BASE}/manifest.json`);
    if (!res.ok) return null;
    _manifestCache = await res.json();
    return _manifestCache;
  } catch { return null; }
}

/**
 * Get equipment slot definitions from the manifest.
 * @returns {Promise<object|null>}
 */
export async function getEquipmentSlots() {
  const m = await getRaceManifest();
  return m?.meta?.sharedEquipmentSlots || null;
}

/**
 * Get bone container mappings for attaching weapons/shields.
 * @returns {Promise<object|null>}
 */
export async function getBoneContainers() {
  const m = await getRaceManifest();
  return m?.meta?.boneContainers || null;
}

/**
 * Get animation pack info (shared across all races).
 * @returns {Promise<object|null>}
 */
export async function getAnimationPacks() {
  const m = await getRaceManifest();
  return m?.animationPacks?.packs || null;
}

/**
 * Get race-specific data from the manifest (models, textures, extra weapons, animations).
 * @param {string} race
 * @returns {Promise<object|null>}
 */
export async function getRaceData(race) {
  const m = await getRaceManifest();
  return m?.races?.[race.toLowerCase()] || null;
}

// ═══════════════════════════════════════════════════════════════════
// Generic Asset URL Builders
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a CDN URL for any asset path on R2.
 * @param {string} path - Relative path within the R2 bucket
 * @returns {string}
 */
export function assetUrl(path) {
  return `${CDN}/${path.replace(/^\//, '')}`;
}

/** Icon URL builder */
export function iconUrl(path) {
  return `${CDN}/icons/${path}`;
}

/** Icon pack URL builder */
export function packIconUrl(path) {
  return `${CDN}/icons/pack/${path}`;
}

/** 3D model URL builder */
export function modelUrl(path) {
  return `${CDN}/models/${path}`;
}

/** 3D VFX texture URL builder */
export function effectUrl(path) {
  return `${CDN}/effects/${path}`;
}

/** Shader URL builder */
export function shaderUrl(path) {
  return `${CDN}/api/v1/shader-lab/${path}`;
}

/** Animation URL builder (shared Mixamo packs) */
export function animationUrl(pack, clip) {
  return `${CDN}/animations/weapons/${pack}/${clip}`;
}

/** Audio URL builder */
export function audioUrl(path) {
  return `${CDN}/audio/${path}`;
}

/** Background/skybox URL builder */
export function backgroundUrl(path) {
  return `${CDN}/backgrounds/${path}`;
}

/** Sprite URL builder (2D character/NPC sprites) */
export function spriteUrl(path) {
  return `${CDN}/sprites/${path}`;
}

/** Texture URL builder (terrain, materials) */
export function textureUrl(path) {
  return `${CDN}/textures/${path}`;
}

/** UI asset URL builder */
export function uiUrl(path) {
  return `${CDN}/ui/${path}`;
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

export { CDN, PACK_BASE, RACES, RACE_META };
