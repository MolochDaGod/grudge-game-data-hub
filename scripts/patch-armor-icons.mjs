#!/usr/bin/env node
/**
 * Patch Armor Icons + Merge Armor into Master Items + Fix Registry
 *
 * 1. Assigns CDN icon URLs to all 1200 armor items based on slotType + material
 * 2. Merges armor into master-items.json (combined catalog)
 * 3. Fixes master-registry.json totals
 *
 * Usage: node scripts/patch-armor-icons.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const DOCS_DATA = join(ROOT, 'docs', 'data');

const CDN = 'https://assets.grudge-studio.com';

// ═══════════════════════════════════════════════════════════════
// SLOT TYPE → ICON FILE PREFIX MAPPING
// ═══════════════════════════════════════════════════════════════
// Maps our armor slotType to the icon file prefix on CDN/GH Pages.
// Available icon counts from ObjectStore: Helm(72), Shoulder(70), Chest(83),
// Boots(56), Gloves(28), Ring(57), necklace(36), Back(16), Belt(36), Bracer(7), Pants(42)

const SLOT_TO_ICON = {
  Helm:     { prefix: 'Helm',     max: 72 },
  Shoulder: { prefix: 'Shoulder', max: 70 },
  Chest:    { prefix: 'Chest',    max: 83 },
  Hands:    { prefix: 'Gloves',   max: 28 },
  Feet:     { prefix: 'Boots',    max: 56 },
  Ring:     { prefix: 'Ring',     max: 57 },
  Necklace: { prefix: 'necklace', max: 36 },
  Relic:    { prefix: 'Back',     max: 16 },
  Offhand:  { prefix: 'Belt',     max: 36 },
};

// Material → icon index offset so each material looks visually distinct
const MATERIAL_OFFSET = { cloth: 0, leather: 1, metal: 2, gem: 3 };

// Set → additional offset so each set within a material looks different
const SET_NAMES = ['Bloodfeud', 'Dusksinger', 'Emberclad', 'Kinrend', 'Oathbreaker', 'Wraithfang'];

function getArmorIconUrl(slotType, material, setName) {
  const mapping = SLOT_TO_ICON[slotType];
  if (!mapping) return '';

  const matOffset = MATERIAL_OFFSET[material] || 0;
  const setIdx = SET_NAMES.indexOf(setName);
  const setOffset = setIdx >= 0 ? setIdx : 0;

  // Unique index per material×set combo, cycling within available icon count
  const rawIdx = matOffset * SET_NAMES.length + setOffset;
  const iconNum = (rawIdx % mapping.max) + 1;
  const padded = String(iconNum).padStart(2, '0');

  return `${CDN}/icons/armor/${mapping.prefix}_${padded}.png`;
}

// ═══════════════════════════════════════════════════════════════
// PATCH ARMOR
// ═══════════════════════════════════════════════════════════════

console.log('🛡️  Patching armor icons...\n');

// Read armor data
const armorPath = join(DOCS_DATA, 'master-armor.json');
const armorData = JSON.parse(readFileSync(armorPath, 'utf8'));

let patched = 0;
for (const item of armorData.items) {
  const url = getArmorIconUrl(item.slotType, item.material, item.setName);
  if (url) {
    item.iconUrl = url;
    patched++;
  }
}
console.log(`  ✅ Patched ${patched}/${armorData.items.length} armor icons`);

// Write armor back
const armorJson = JSON.stringify(armorData, null, 2);
writeFileSync(armorPath, armorJson);
writeFileSync(join(DATA, 'master-armor.json'), armorJson);
console.log('  📁 Written master-armor.json');

// ═══════════════════════════════════════════════════════════════
// MERGE ARMOR INTO MASTER-ITEMS
// ═══════════════════════════════════════════════════════════════

console.log('\n📦 Merging armor into master-items.json...');

const itemsPath = join(DOCS_DATA, 'master-items.json');
const itemsData = JSON.parse(readFileSync(itemsPath, 'utf8'));

// Remove any existing armor items to avoid duplicates
const nonArmorItems = itemsData.items.filter(i => i.type !== 'armor');
console.log(`  Existing non-armor items: ${nonArmorItems.length}`);

// Merge
const allItems = [...nonArmorItems, ...armorData.items];
console.log(`  After merge: ${allItems.length} total items (${nonArmorItems.length} + ${armorData.items.length} armor)`);

// Read recipes and consumables for accurate totals
const recipesData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-recipes.json'), 'utf8'));
const consumablesData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-consumables.json'), 'utf8'));
const materialsData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-materials.json'), 'utf8'));
const artifactsData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-artifacts.json'), 'utf8'));

const weaponCount = allItems.filter(i => i.type === 'weapon').length;
const armorCount = armorData.items.length;
const consumableCount = consumablesData.totalConsumables || consumablesData.total;
const totalRecipes = recipesData.recipes.length;
const totalMaterials = materialsData.materials?.length || materialsData.totalMaterials || 0;
const totalArtifacts = artifactsData.artifacts?.length || artifactsData.total || 0;

itemsData.items = allItems;
itemsData.totalItems = allItems.length;
itemsData.totalWeapons = weaponCount;
itemsData.totalArmor = armorCount;
itemsData.totalConsumables = consumableCount;
itemsData.totalRecipes = totalRecipes;
itemsData.totalMaterials = totalMaterials;
itemsData.totalArtifacts = totalArtifacts;
itemsData.version = '4.0.0';
itemsData.generated = new Date().toISOString();
itemsData.source = 'Derived from api/v1/{weapons,armor,materials,consumables}.json';

const itemsJson = JSON.stringify(itemsData, null, 2);
writeFileSync(itemsPath, itemsJson);
writeFileSync(join(DATA, 'master-items.json'), itemsJson);
console.log('  📁 Written master-items.json');

// ═══════════════════════════════════════════════════════════════
// FIX REGISTRY TOTALS
// ═══════════════════════════════════════════════════════════════

console.log('\n📊 Fixing master-registry.json totals...');

const regPath = join(DOCS_DATA, 'master-registry.json');
const regData = JSON.parse(readFileSync(regPath, 'utf8'));

// Read skill tree and weapon skill data for accurate totals
const skillTreesData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-skillTrees.json'), 'utf8'));
const weaponSkillsData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-weaponSkills.json'), 'utf8'));
const professionsData = JSON.parse(readFileSync(join(DOCS_DATA, 'master-professions.json'), 'utf8'));

regData.totals = {
  weapons: weaponCount,
  armor: armorCount,
  consumables: consumableCount,
  materials: totalMaterials,
  recipes: totalRecipes,
  artifacts: totalArtifacts,
  professions: (professionsData.totalCrafting || 5),
  professionNodes: (professionsData.totalNodes || 148),
  classSkills: (skillTreesData.totalSkills || 69),
  weaponSkills: (weaponSkillsData.totalSkills || 207),
};
regData.version = '4.0.0';
regData.generated = new Date().toISOString();

// Add armor entries to byUuid index (just first 20 as samples)
const sampleArmor = armorData.items.slice(0, 20);
for (const item of sampleArmor) {
  regData.byUuid[item.uuid] = {
    kind: 'armor',
    name: item.name,
    category: `${item.material}-${item.slotType}`,
    tier: item.tier,
  };
}

const regJson = JSON.stringify(regData, null, 2);
writeFileSync(regPath, regJson);
writeFileSync(join(DATA, 'master-registry.json'), regJson);
console.log('  📁 Written master-registry.json');

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('\n✅ Patch complete!');
console.log(`   🛡️  Armor icons patched: ${patched}`);
console.log(`   📦 Total items: ${allItems.length} (${weaponCount} weapons + ${armorCount} armor + ${consumableCount} consumables)`);
console.log(`   📜 Total recipes: ${totalRecipes}`);
console.log(`   📊 Registry updated with correct totals`);
