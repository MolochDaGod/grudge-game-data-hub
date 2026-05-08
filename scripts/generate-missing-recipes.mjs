#!/usr/bin/env node
/**
 * Generate missing recipes for weapons and armor from ObjectStore data.
 *
 * Reads master-weapons.json and master-armor.json, generates a recipe for
 * every T1 base item, assigns GRUDGE UUIDs, and merges with the existing
 * master-recipes.json (which already has consumable recipes).
 *
 * Also patches master-items.json, master-weapons.json, and master-armor.json
 * to set recipeUuid on every tiered variant pointing to the base recipe.
 */
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DATA = join(__dirname, '..', 'docs', 'data');

function read(file) { return JSON.parse(readFileSync(join(DOCS_DATA, file), 'utf8')); }
function write(file, data) { writeFileSync(join(DOCS_DATA, file), JSON.stringify(data, null, 2)); }

// ── UUID Generator (matches lib/uuid-registry.js) ──────────────────
let seq = 0x100000; // start high to avoid collisions with existing UUIDs
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (((h >>> 0) ^ ((h >>> 0) >>> 16)) >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}
function uuid(prefix, meta = '') {
  const ts = '20260508030000'; // fixed timestamp for reproducibility
  const s = (++seq).toString(16).toUpperCase().padStart(6, '0');
  return `${prefix}-${ts}-${s}-${fnv1a(`${prefix}-${ts}-${s}-${meta}-${seq}`)}`;
}

// ── Material requirements by armor material type ────────────────────
const ARMOR_MATS = {
  cloth:   [{ name: 'Linen Cloth', qty: 3 }, { name: 'Thread', qty: 2 }],
  leather: [{ name: 'Cured Leather', qty: 3 }, { name: 'Tanning Agent', qty: 1 }],
  metal:   [{ name: 'Steel Ingot', qty: 4 }, { name: 'Coal', qty: 2 }],
  gem:     [{ name: 'Gem Shard', qty: 3 }, { name: 'Mithril Ingot', qty: 2 }, { name: 'Arcane Dust', qty: 1 }],
};

// Tier multiplier for material quantities
function tierMats(baseMats, tier) {
  const mult = 1 + (tier - 1) * 0.4;
  return baseMats.map(m => ({ ...m, qty: Math.ceil(m.qty * mult) }));
}

// ── Profession mapping ──────────────────────────────────────────────
const WEAPON_PROFESSIONS = {
  swords: 'Miner', axes1h: 'Miner', daggers: 'Miner', hammers1h: 'Miner', hammers2h: 'Miner',
  greatswords: 'Miner', greataxes: 'Miner', spears: 'Miner',
  bows: 'Forester', crossbows: 'Engineer', guns: 'Engineer', tools: 'Engineer',
  fireStaves: 'Mystic', frostStaves: 'Mystic', holyStaves: 'Mystic',
  lightningStaves: 'Mystic', natureStaves: 'Mystic',
};

const ARMOR_PROFESSIONS = {
  cloth: 'Mystic', leather: 'Forester', metal: 'Miner', gem: 'Mystic',
};

// ── Weapon material templates by category ───────────────────────────
const WEAPON_MATS = {
  swords:     [{ name: 'Iron Ingot', qty: 3 }, { name: 'Leather', qty: 1 }],
  axes1h:     [{ name: 'Iron Ingot', qty: 3 }, { name: 'Wood', qty: 2 }],
  daggers:    [{ name: 'Iron Ingot', qty: 2 }, { name: 'Leather', qty: 1 }],
  hammers1h:  [{ name: 'Iron Ingot', qty: 5 }, { name: 'Wood', qty: 2 }],
  hammers2h:  [{ name: 'Iron Ingot', qty: 6 }, { name: 'Stone', qty: 4 }],
  greatswords:[{ name: 'Iron Ingot', qty: 8 }, { name: 'Leather', qty: 2 }],
  greataxes:  [{ name: 'Iron Ingot', qty: 5 }, { name: 'Wood', qty: 3 }],
  spears:     [{ name: 'Iron Ingot', qty: 4 }, { name: 'Wood', qty: 3 }],
  bows:       [{ name: 'Wood', qty: 4 }, { name: 'String', qty: 2 }],
  crossbows:  [{ name: 'Iron Ingot', qty: 3 }, { name: 'Wood', qty: 2 }],
  guns:       [{ name: 'Iron Ingot', qty: 3 }, { name: 'Powder', qty: 2 }],
  tools:      [{ name: 'Iron Ingot', qty: 2 }, { name: 'Wood', qty: 2 }],
  fireStaves: [{ name: 'Wood', qty: 3 }, { name: 'Fire Essence', qty: 2 }],
  frostStaves:[{ name: 'Wood', qty: 3 }, { name: 'Frost Essence', qty: 2 }],
  holyStaves: [{ name: 'Wood', qty: 3 }, { name: 'Holy Essence', qty: 2 }],
  lightningStaves: [{ name: 'Wood', qty: 3 }, { name: 'Storm Essence', qty: 2 }],
  natureStaves:    [{ name: 'Wood', qty: 3 }, { name: 'Nature Essence', qty: 2 }],
};

// ── Material UUID registry ──────────────────────────────────────────
const matUuids = new Map();
function matUuid(name) {
  if (!matUuids.has(name)) matUuids.set(name, uuid('MATL', name));
  return matUuids.get(name);
}

// ── Read existing data ──────────────────────────────────────────────
console.log('Reading ObjectStore data...');
const weapons = read('master-weapons.json');
const armor = read('master-armor.json');
const existingRecipes = read('master-recipes.json');
const masterItems = read('master-items.json');
const existingMats = read('master-materials.json');

console.log(`  Weapons: ${weapons.items.length} (${weapons.items.filter(i => i.tier === 1).length} T1 bases)`);
console.log(`  Armor: ${armor.items.length} (${armor.items.filter(i => i.tier === 1).length} T1 bases)`);
console.log(`  Existing recipes: ${existingRecipes.recipes.length}`);
console.log(`  Existing materials: ${existingMats.materials.length}`);

// ── Generate weapon recipes ─────────────────────────────────────────
const newRecipes = [];
const itemRecipeMap = new Map(); // baseUuid → recipeUuid

const wpnT1 = weapons.items.filter(i => i.tier === 1);
wpnT1.forEach(item => {
  const cat = item.category || item.weaponType || 'swords';
  const baseMats = WEAPON_MATS[cat] || WEAPON_MATS.swords;
  const prof = WEAPON_PROFESSIONS[cat] || 'Miner';
  const recUuid = uuid('RECP', `weapon-${item.name}`);

  newRecipes.push({
    uuid: recUuid,
    name: `Craft ${item.name}`,
    resultItemId: item.uuid,
    resultName: item.name,
    profession: prof,
    category: cat,
    materials: baseMats.map(m => ({ uuid: matUuid(m.name), name: m.name, quantity: m.qty })),
  });

  itemRecipeMap.set(item.baseUuid || item.uuid, recUuid);
});

console.log(`  Generated ${wpnT1.length} weapon recipes`);

// ── Generate armor recipes ──────────────────────────────────────────
const armorT1 = armor.items.filter(i => i.tier === 1);
armorT1.forEach(item => {
  const mat = item.material || 'cloth';
  const baseMats = ARMOR_MATS[mat] || ARMOR_MATS.cloth;
  const prof = ARMOR_PROFESSIONS[mat] || 'Mystic';
  const recUuid = uuid('RECP', `armor-${item.name}`);

  newRecipes.push({
    uuid: recUuid,
    name: `Craft ${item.name}`,
    resultItemId: item.uuid,
    resultName: item.name,
    profession: prof,
    category: `armor-${mat}`,
    slot: item.slotType,
    setName: item.setName,
    materials: baseMats.map(m => ({ uuid: matUuid(m.name), name: m.name, quantity: m.qty })),
  });

  itemRecipeMap.set(item.baseUuid || item.uuid, recUuid);
});

console.log(`  Generated ${armorT1.length} armor recipes`);

// ── Merge recipes ───────────────────────────────────────────────────
const allRecipes = [...existingRecipes.recipes, ...newRecipes];
console.log(`  Total recipes: ${allRecipes.length} (was ${existingRecipes.recipes.length})`);

// ── Patch items with recipeUuid ─────────────────────────────────────
let wpnPatched = 0, armorPatched = 0, itemsPatched = 0;

weapons.items.forEach(item => {
  const base = item.baseUuid || item.uuid;
  if (itemRecipeMap.has(base)) { item.recipeUuid = itemRecipeMap.get(base); wpnPatched++; }
});

armor.items.forEach(item => {
  const base = item.baseUuid || item.uuid;
  if (itemRecipeMap.has(base)) { item.recipeUuid = itemRecipeMap.get(base); armorPatched++; }
});

masterItems.items.forEach(item => {
  const base = item.baseUuid || item.uuid;
  if (itemRecipeMap.has(base) && !item.recipeUuid) { item.recipeUuid = itemRecipeMap.get(base); itemsPatched++; }
});

console.log(`  Patched recipeUuid: ${wpnPatched} weapons, ${armorPatched} armor, ${itemsPatched} master-items`);

// ── Merge new materials ─────────────────────────────────────────────
const existingMatNames = new Set(existingMats.materials.map(m => m.name));
const newMats = [];
for (const [name, muuid] of matUuids) {
  if (!existingMatNames.has(name)) {
    newMats.push({
      uuid: muuid,
      name,
      type: 'material',
      iconUrl: `https://assets.grudge-studio.com/icons/materials/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
    });
  }
}
const allMats = [...existingMats.materials, ...newMats];
console.log(`  New materials: ${newMats.length} (total: ${allMats.length})`);

// ── Write updated files ─────────────────────────────────────────────
write('master-recipes.json', {
  ...existingRecipes,
  total: allRecipes.length,
  totalRecipes: allRecipes.length,
  recipes: allRecipes,
});

write('master-weapons.json', {
  ...weapons,
  items: weapons.items,
});

write('master-armor.json', {
  ...armor,
  items: armor.items,
});

write('master-items.json', {
  ...masterItems,
  totalRecipes: allRecipes.length,
  totalMaterials: allMats.length,
  items: masterItems.items,
});

write('master-materials.json', {
  ...existingMats,
  total: allMats.length,
  totalMaterials: allMats.length,
  materials: allMats,
});

console.log('\n✅ Done! Recipe breakdown:');
const byCategory = {};
allRecipes.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });
for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}
console.log(`  TOTAL: ${allRecipes.length}`);
