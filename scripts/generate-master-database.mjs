#!/usr/bin/env node
/**
 * Grudge Game Data Hub — Master Database Generator
 *
 * Extracts all game data from SPRITE_DATABASE + ObjectStore APIs,
 * assigns GRUDGE UUIDs, maps real ObjectStore icon URLs,
 * and outputs unified master JSON files.
 *
 * Usage: node scripts/generate-master-database.mjs
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const PUBLIC_DATA_DIR = join(ROOT, 'docs', 'data');

// Ensure output dirs exist
[DATA_DIR, PUBLIC_DATA_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

// ============================================================
// GRUDGE UUID GENERATOR
// ============================================================
const PREFIX_MAP = {
  item: 'ITEM', recipe: 'RECP', material: 'MATL', node: 'NODE',
  food: 'FOOD', potion: 'POTN', skill: 'SKIL', attribute: 'ATTR',
  class: 'CLAS', race: 'RACE', consumable: 'CONS',
};

let sequenceCounter = 0;

function fnv1aHash8(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash = hash >>> 0;
  const h2 = (hash ^ (hash >>> 16)) >>> 0;
  return h2.toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

function generateUuid(entityType, metadata = '') {
  const prefix = PREFIX_MAP[entityType] || entityType.slice(0, 4).toUpperCase();
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  sequenceCounter++;
  const seq = sequenceCounter.toString(16).toUpperCase().padStart(6, '0');
  const hashInput = `${prefix}-${ts}-${seq}-${metadata}-${Math.random()}`;
  const hash = fnv1aHash8(hashInput);
  return `${prefix}-${ts}-${seq}-${hash}`;
}

// ============================================================
// OBJECTSTORE CDN BASE
// ============================================================
const CDN = 'https://molochdagod.github.io/ObjectStore';
const ICON = (path) => `${CDN}/icons/${path}`;
const PACK_ICON = (path) => `${CDN}/icons/pack/${path}`;

// ============================================================
// TIER SYSTEM
// ============================================================
const TIERS = [
  { tier: 1, name: 'Bronze',  color: '#8b7355', label: 'Common' },
  { tier: 2, name: 'Silver',  color: '#a8a8a8', label: 'Uncommon' },
  { tier: 3, name: 'Blue',    color: '#4a9eff', label: 'Rare' },
  { tier: 4, name: 'Purple',  color: '#9d4dff', label: 'Epic' },
  { tier: 5, name: 'Red',     color: '#ff4d4d', label: 'Legendary' },
  { tier: 6, name: 'Orange',  color: '#ffaa00', label: 'Mythic' },
  { tier: 7, name: 'Gold',    color: '#d4a84b', label: 'Ancient' },
  { tier: 8, name: 'Shimmer', color: '#f0d890', label: 'Legendary Artifact' },
];

function scaleStat(base, perTier, tier) {
  return Math.round(base + perTier * (tier - 1));
}

// ============================================================
// ICON MAPPING — Real ObjectStore icon paths
// ============================================================
const WEAPON_ICONS = {
  swords:     (i) => PACK_ICON(`weapons/Sword_${String(i).padStart(2, '0')}.png`),
  axes:       (i) => PACK_ICON(`weapons/Axe_${String(i).padStart(2, '0')}.png`),
  daggers:    (i) => PACK_ICON(`weapons/Dagger_${String(i).padStart(2, '0')}.png`),
  hammers:    (i) => PACK_ICON(`weapons/Hammer_${String(i).padStart(2, '0')}.png`),
  greatswords:(i) => PACK_ICON(`weapons/Sword_${String(i + 9).padStart(2, '0')}.png`),
  greataxes:  (i) => PACK_ICON(`weapons/Axe_${String(i + 9).padStart(2, '0')}.png`),
  spears:     (i) => PACK_ICON(`weapons/Spear_${String(i).padStart(2, '0')}.png`),
  maces:      (i) => PACK_ICON(`weapons/Hammer_${String(i + 9).padStart(2, '0')}.png`),
  shields:    (i) => PACK_ICON(`weapons/Shield_${String(i).padStart(2, '0')}.png`),
  bows:       (i) => PACK_ICON(`weapons/Bow_${String(i).padStart(2, '0')}.png`),
  crossbows:  (i) => PACK_ICON(`weapons/Crossbow_${String(i).padStart(2, '0')}.png`),
  guns:       (i) => PACK_ICON(`weapons/Crossbow_${String(i + 9).padStart(2, '0')}.png`),
  fireStaves: (i) => PACK_ICON(`weapons/Staff_${String(i).padStart(2, '0')}.png`),
  frostStaves:(i) => PACK_ICON(`weapons/Staff_${String(i + 4).padStart(2, '0')}.png`),
  holyStaves: (i) => PACK_ICON(`weapons/Staff_${String(i + 8).padStart(2, '0')}.png`),
  lightningStaves: (i) => PACK_ICON(`weapons/Staff_${String(i + 12).padStart(2, '0')}.png`),
  natureStaves:    (i) => PACK_ICON(`weapons/Staff_${String(i + 16).padStart(2, '0')}.png`),
  tomes:      (i) => PACK_ICON(`weapons/Book_${i}.png`),
};

const POTION_ICONS = {
  health:      ICON('consumables/health_potion.png'),
  mana:        ICON('consumables/mana_potion.png'),
  stamina:     ICON('consumables/potion_3.png'),
  antidote:    ICON('consumables/potion_5.png'),
  rage:        ICON('consumables/potion_8.png'),
  speed:       ICON('consumables/potion_12.png'),
  defense:     ICON('consumables/potion_15.png'),
  invisibility:ICON('consumables/potion_18.png'),
  fireResist:  ICON('consumables/potion_22.png'),
  frostResist: ICON('consumables/potion_25.png'),
  focus:       ICON('consumables/potion_28.png'),
  luck:        ICON('consumables/potion_32.png'),
  exp:         ICON('consumables/potion_35.png'),
  flight:      ICON('consumables/potion_38.png'),
  divine:      ICON('consumables/potion_42.png'),
};

// ============================================================
// COMPLETE WEAPON DATA (from SPRITE_DATABASE)
// ============================================================
const WEAPON_DEFINITIONS = {
  swords: {
    profession: 'Miner', category: '1h', items: [
      { name: 'Bloodfeud Blade',  desc: 'Forged in endless clan blood feuds. Vengeful Slash: Builds Grudge Mark stack.', mats: { 'Iron Ingot': 3, 'Leather': 1 }, stats: { damageBase: 50, damagePerTier: 12, speedBase: 100, speedPerTier: 25, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 20, defensePerTier: 6 }, abilities: ['Blood Rush', 'Iron Grudge', 'Clan Charge', 'Heroic Cleave', 'Parry Counter', 'Deep Wound'], signature: 'Crimson Reprisal', passives: ['Bloodlust (5% lifesteal)', 'Swift Vengeance (+15% atk speed)', 'Deep Cuts (+20% bleed dmg)'] },
      { name: 'Wraithfang',       desc: 'Whispers forgotten grudges. Shadow Edge: Dash + Stun.', mats: { 'Steel Ingot': 3, 'Void Dust': 1 }, stats: { damageBase: 55, damagePerTier: 13, speedBase: 80, speedPerTier: 20, critBase: 5, critPerTier: 0.8, blockBase: 3, blockPerTier: 0.8, defenseBase: 15, defensePerTier: 5 }, abilities: ['Shadow Edge', 'Execute', 'Bleed Chain', 'Fatal Strike'], signature: "Night's Judgment", passives: ['Life Leech', 'Aggressive Rush', 'Grudge Bleed'] },
      { name: 'Oathbreaker',      desc: 'Breaks ancient oaths. Lunging Strike: Ranged thrust.', mats: { 'Dark Iron Ingot': 3, 'Obsidian': 1 }, stats: { damageBase: 48, damagePerTier: 11, speedBase: 120, speedPerTier: 30, critBase: 2, critPerTier: 0.4, blockBase: 8, blockPerTier: 1.5, defenseBase: 25, defensePerTier: 7 }, abilities: ['Lunging Strike', 'Shadow Dash', 'Fearful Swipe', 'Hamstring', "Betrayer's Mark", 'Oathbreak'], signature: 'Ancestral Curse', passives: ['Resilience', 'Armor Pen', 'Block Mastery'] },
      { name: 'Kinrend',          desc: 'Rends bonds of kinship. Kin Strike: High single target damage.', mats: { 'Blood Stone': 3, 'Bone': 2 }, stats: { damageBase: 52, damagePerTier: 12, speedBase: 110, speedPerTier: 28, critBase: 4, critPerTier: 0.6, blockBase: 4, blockPerTier: 1, defenseBase: 18, defensePerTier: 6 }, abilities: ['Kin Strike', 'Ancestral Fury', 'Family Grudge', 'Root Bind'], signature: 'Wrath of Kin', passives: ['Bloodlust', 'Swift Vengeance', 'Deep Cuts'] },
      { name: 'Dusksinger',       desc: 'Sings of twilight. Dusk Blade: Invisible dash.', mats: { 'Shadow Ingot': 3, 'Gem': 1 }, stats: { damageBase: 53, damagePerTier: 12, speedBase: 90, speedPerTier: 22, critBase: 6, critPerTier: 1, blockBase: 4, blockPerTier: 0.9, defenseBase: 17, defensePerTier: 5 }, abilities: ['Dusk Blade', 'Twilight Slash', 'Night Strike'], signature: 'Eventide Reckoning', passives: ['Shadow Walk', 'Crit Surge', 'Evasion Master'] },
      { name: 'Emberclad',        desc: 'Clad in flames. Flame Slash: Applies burn.', mats: { 'Fire Essence': 3, 'Steel Ingot': 2 }, stats: { damageBase: 56, damagePerTier: 14, speedBase: 95, speedPerTier: 24, critBase: 4, critPerTier: 0.7, blockBase: 3, blockPerTier: 0.8, defenseBase: 16, defensePerTier: 5 }, abilities: ['Flame Slash', 'Inferno Wave', 'Magma Strike'], signature: 'Solar Annihilation', passives: ['Burn Master', 'Fire Aura', 'Ember Shield'] },
    ]
  },
  axes: {
    profession: 'Miner', category: '1h', items: [
      { name: 'Gorehowl',     desc: 'Howls with gore. Rending Chop: Applies Bleed.', mats: { 'Iron Ingot': 3, 'Wood': 2 }, stats: { damageBase: 55, damagePerTier: 14, speedBase: 90, speedPerTier: 22, critBase: 3, critPerTier: 0.5, blockBase: 4, blockPerTier: 1, defenseBase: 18, defensePerTier: 5 } },
      { name: 'Skullsplitter', desc: 'Splits skulls. Headcracker: Stun + Damage.', mats: { 'Steel Ingot': 3, 'Bone': 2 }, stats: { damageBase: 58, damagePerTier: 15, speedBase: 85, speedPerTier: 20, critBase: 4, critPerTier: 0.6, blockBase: 3, blockPerTier: 0.8, defenseBase: 16, defensePerTier: 5 } },
      { name: 'Veinreaver',    desc: 'Reaves veins. Blood Harvest: AoE Lifesteal.', mats: { 'Dark Iron Ingot': 3, 'Blood': 2 }, stats: { damageBase: 52, damagePerTier: 13, speedBase: 95, speedPerTier: 23, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 20, defensePerTier: 6 } },
      { name: 'Ironmaw',       desc: 'Maw of iron. Iron Bite: Ignores defense.', mats: { 'Iron Ingot': 5, 'Obsidian': 1 }, stats: { damageBase: 60, damagePerTier: 15, speedBase: 80, speedPerTier: 18, critBase: 2, critPerTier: 0.4, blockBase: 6, blockPerTier: 1.2, defenseBase: 22, defensePerTier: 7 } },
      { name: 'Dreadcleaver',  desc: 'Cleaves dread. Frenzied Chop: High burst damage.', mats: { 'Shadow Ingot': 3, 'Void Dust': 2 }, stats: { damageBase: 57, damagePerTier: 14, speedBase: 88, speedPerTier: 21, critBase: 5, critPerTier: 0.7, blockBase: 3, blockPerTier: 0.8, defenseBase: 15, defensePerTier: 5 } },
      { name: 'Bonehew',       desc: 'Hews bone. Bone Break: Reduces armor.', mats: { 'Bone': 5, 'Steel Ingot': 2 }, stats: { damageBase: 54, damagePerTier: 13, speedBase: 92, speedPerTier: 22, critBase: 3, critPerTier: 0.5, blockBase: 4, blockPerTier: 1, defenseBase: 19, defensePerTier: 6 } },
    ]
  },
  daggers: {
    profession: 'Miner', category: '1h', items: [
      { name: 'Nightfang',  desc: 'Fang of night. Shadow Stab: Builds Mark.', mats: { 'Iron Ingot': 2, 'Leather': 1 }, stats: { damageBase: 35, damagePerTier: 9, speedBase: 150, speedPerTier: 35, critBase: 8, critPerTier: 1.2, blockBase: 2, blockPerTier: 0.5, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Bloodshiv',  desc: 'Drips blood. Crimson Stab: High bleed.', mats: { 'Steel Ingot': 2, 'Blood': 1 }, stats: { damageBase: 38, damagePerTier: 10, speedBase: 145, speedPerTier: 33, critBase: 7, critPerTier: 1, blockBase: 2, blockPerTier: 0.5, defenseBase: 7, defensePerTier: 3 } },
      { name: 'Wraithclaw', desc: 'Claw of wraith. Shadow Strike: AoE Silence.', mats: { 'Dark Iron Ingot': 2, 'Void Dust': 1 }, stats: { damageBase: 36, damagePerTier: 9, speedBase: 155, speedPerTier: 36, critBase: 9, critPerTier: 1.3, blockBase: 1, blockPerTier: 0.4, defenseBase: 6, defensePerTier: 2 } },
      { name: 'Emberfang',  desc: 'Burning hate. Flame Dagger: Burn DoT.', mats: { 'Fire Essence': 2, 'Steel Ingot': 1 }, stats: { damageBase: 40, damagePerTier: 10, speedBase: 140, speedPerTier: 32, critBase: 6, critPerTier: 0.9, blockBase: 2, blockPerTier: 0.5, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Ironspike',  desc: 'Unyielding iron. Pinning Stab: Root burst.', mats: { 'Iron Ingot': 4 }, stats: { damageBase: 37, damagePerTier: 9, speedBase: 148, speedPerTier: 34, critBase: 7, critPerTier: 1, blockBase: 3, blockPerTier: 0.6, defenseBase: 10, defensePerTier: 3 } },
      { name: 'Duskblade',  desc: 'Blade of dusk. Frenzied Cuts: Multi burst.', mats: { 'Shadow Ingot': 2, 'Gem': 1 }, stats: { damageBase: 42, damagePerTier: 11, speedBase: 152, speedPerTier: 35, critBase: 10, critPerTier: 1.5, blockBase: 1, blockPerTier: 0.4, defenseBase: 6, defensePerTier: 2 } },
    ]
  },
  hammers: {
    profession: 'Miner', category: '2h', items: [
      { name: 'Titanmaul',    desc: 'Titanic grudge. Earthshatter: AoE Slow.', mats: { 'Iron Ingot': 6, 'Stone': 4 }, stats: { damageBase: 75, damagePerTier: 18, speedBase: 60, speedPerTier: 14, critBase: 2, critPerTier: 0.3, blockBase: 8, blockPerTier: 1.5, defenseBase: 30, defensePerTier: 8 } },
      { name: 'Bloodcrusher', desc: 'Crushes with blood. Crimson Smash: AoE Bleed.', mats: { 'Steel Ingot': 6, 'Blood': 4 }, stats: { damageBase: 78, damagePerTier: 19, speedBase: 55, speedPerTier: 13, critBase: 3, critPerTier: 0.4, blockBase: 6, blockPerTier: 1.2, defenseBase: 25, defensePerTier: 7 } },
      { name: 'Stonebreaker', desc: 'Breaks stone. Shattering Blow: Armor Break.', mats: { 'Mithril Ingot': 6, 'Obsidian': 4 }, stats: { damageBase: 80, damagePerTier: 20, speedBase: 50, speedPerTier: 12, critBase: 2, critPerTier: 0.3, blockBase: 10, blockPerTier: 2, defenseBase: 35, defensePerTier: 9 } },
      { name: 'Oathcrusher', desc: 'Crushes oaths. Oath Shatter: Dispel Buffs.', mats: { 'Dark Iron Ingot': 6, 'Void Dust': 2 }, stats: { damageBase: 72, damagePerTier: 17, speedBase: 58, speedPerTier: 14, critBase: 2, critPerTier: 0.4, blockBase: 7, blockPerTier: 1.4, defenseBase: 28, defensePerTier: 7 } },
      { name: 'Doomhammer',  desc: 'Hammer of doom. Cataclysmic Strike: Stun AoE.', mats: { 'Shadow Ingot': 6, 'Bone': 4 }, stats: { damageBase: 82, damagePerTier: 20, speedBase: 52, speedPerTier: 12, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 22, defensePerTier: 6 } },
      { name: 'Divine Maul', desc: 'Divine judgment. Holy Smash: True Damage.', mats: { 'Divine Ingot': 6, 'Holy Essence': 2 }, stats: { damageBase: 85, damagePerTier: 22, speedBase: 48, speedPerTier: 11, critBase: 4, critPerTier: 0.6, blockBase: 8, blockPerTier: 1.5, defenseBase: 30, defensePerTier: 8 } },
    ]
  },
  greatswords: {
    profession: 'Miner', category: '2h', items: [
      { name: 'Vengeance Blade', desc: 'Blade of vengeance. Grudge Sweep: Builds Mark.', mats: { 'Iron Ingot': 8, 'Leather': 2 }, stats: { damageBase: 70, damagePerTier: 16, speedBase: 70, speedPerTier: 16, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 22, defensePerTier: 6 } },
      { name: 'Bloodwrath',      desc: 'Wrath of blood. Crimson Arc: AoE Lifesteal.', mats: { 'Steel Ingot': 8, 'Blood': 4 }, stats: { damageBase: 74, damagePerTier: 17, speedBase: 65, speedPerTier: 15, critBase: 4, critPerTier: 0.6, blockBase: 4, blockPerTier: 0.9, defenseBase: 20, defensePerTier: 6 } },
      { name: 'Shadowcleave',    desc: 'Cleaves shadows. Shadow Slash: Dash + AoE.', mats: { 'Dark Iron Ingot': 8, 'Void Dust': 2 }, stats: { damageBase: 72, damagePerTier: 17, speedBase: 68, speedPerTier: 16, critBase: 5, critPerTier: 0.7, blockBase: 3, blockPerTier: 0.8, defenseBase: 18, defensePerTier: 5 } },
      { name: 'Kinslayer',       desc: 'Slays kin. Family Grudge: High Single Target.', mats: { 'Blood Stone': 6, 'Bone': 4 }, stats: { damageBase: 76, damagePerTier: 18, speedBase: 62, speedPerTier: 14, critBase: 4, critPerTier: 0.6, blockBase: 4, blockPerTier: 1, defenseBase: 20, defensePerTier: 6 } },
      { name: 'Duskbringer',     desc: 'Brings dusk. Twilight Wave: AoE Blind.', mats: { 'Shadow Ingot': 8, 'Gem': 2 }, stats: { damageBase: 73, damagePerTier: 17, speedBase: 66, speedPerTier: 15, critBase: 6, critPerTier: 0.8, blockBase: 3, blockPerTier: 0.8, defenseBase: 17, defensePerTier: 5 } },
      { name: 'Divine Judgment',  desc: 'Divine judgment. Holy Cleave: True Damage.', mats: { 'Divine Ingot': 10, 'Holy Essence': 3 }, stats: { damageBase: 80, damagePerTier: 20, speedBase: 60, speedPerTier: 14, critBase: 5, critPerTier: 0.7, blockBase: 5, blockPerTier: 1, defenseBase: 24, defensePerTier: 7 } },
    ]
  },
  greataxes: {
    profession: 'Miner', category: '2h', items: [
      { name: 'Skullsunder',   desc: 'Sunders skulls. Brutal Hew: AoE Bleed.', mats: { 'Iron Ingot': 5, 'Wood': 3 }, stats: { damageBase: 72, damagePerTier: 17, speedBase: 65, speedPerTier: 15, critBase: 3, critPerTier: 0.5, blockBase: 4, blockPerTier: 1, defenseBase: 20, defensePerTier: 6 } },
      { name: 'Bloodreaver',   desc: 'Crimson Harvest: AoE Heal.', mats: { 'Steel Ingot': 5, 'Blood': 3 }, stats: { damageBase: 74, damagePerTier: 18, speedBase: 62, speedPerTier: 14, critBase: 4, critPerTier: 0.6, blockBase: 3, blockPerTier: 0.9, defenseBase: 18, defensePerTier: 5 } },
      { name: 'Worldsplitter', desc: 'Cataclysm: Massive AoE.', mats: { 'Mithril Ingot': 8, 'Void Essence': 3 }, stats: { damageBase: 80, damagePerTier: 20, speedBase: 55, speedPerTier: 12, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 22, defensePerTier: 6 } },
      { name: 'Oathcleaver',   desc: "Betrayer's Arc: Bonus vs Allies.", mats: { 'Dark Iron Ingot': 6, 'Obsidian': 2 }, stats: { damageBase: 76, damagePerTier: 18, speedBase: 60, speedPerTier: 13, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 22, defensePerTier: 6 } },
      { name: 'Duskrend',      desc: 'Twilight Cleave: Invisible.', mats: { 'Shadow Ingot': 6, 'Gem': 2 }, stats: { damageBase: 74, damagePerTier: 17, speedBase: 63, speedPerTier: 14, critBase: 5, critPerTier: 0.7, blockBase: 3, blockPerTier: 0.8, defenseBase: 17, defensePerTier: 5 } },
      { name: 'World Breaker', desc: 'Apocalypse: Screen Clear.', mats: { 'Divine Ingot': 8, 'Void Essence': 5 }, stats: { damageBase: 85, damagePerTier: 22, speedBase: 50, speedPerTier: 11, critBase: 4, critPerTier: 0.6, blockBase: 5, blockPerTier: 1, defenseBase: 24, defensePerTier: 7 } },
    ]
  },
  spears: {
    profession: 'Miner', category: '2h', items: [
      { name: 'Iron Pike',      desc: 'Thrust: Long range poke.', mats: { 'Iron Ingot': 4, 'Wood': 3 }, stats: { damageBase: 48, damagePerTier: 12, speedBase: 110, speedPerTier: 26, critBase: 3, critPerTier: 0.5, blockBase: 4, blockPerTier: 1, defenseBase: 15, defensePerTier: 4 } },
      { name: 'Steel Lance',    desc: 'Charge: Gap closer.', mats: { 'Steel Ingot': 4, 'Wood': 3 }, stats: { damageBase: 52, damagePerTier: 13, speedBase: 105, speedPerTier: 25, critBase: 3, critPerTier: 0.5, blockBase: 4, blockPerTier: 1, defenseBase: 16, defensePerTier: 5 } },
      { name: 'Mithril Javelin', desc: 'Hurl: Ranged attack.', mats: { 'Mithril Ingot': 4, 'Leather': 2 }, stats: { damageBase: 50, damagePerTier: 12, speedBase: 115, speedPerTier: 28, critBase: 4, critPerTier: 0.6, blockBase: 3, blockPerTier: 0.8, defenseBase: 12, defensePerTier: 4 } },
      { name: 'Bloodspear',     desc: 'Impale: Lifesteal.', mats: { 'Dark Iron Ingot': 5, 'Blood': 3 }, stats: { damageBase: 55, damagePerTier: 14, speedBase: 100, speedPerTier: 24, critBase: 3, critPerTier: 0.5, blockBase: 4, blockPerTier: 1, defenseBase: 18, defensePerTier: 5 } },
      { name: 'Voidpiercer',    desc: 'Phase Strike: Ignore armor.', mats: { 'Shadow Ingot': 5, 'Void Essence': 2 }, stats: { damageBase: 58, damagePerTier: 14, speedBase: 98, speedPerTier: 23, critBase: 5, critPerTier: 0.7, blockBase: 3, blockPerTier: 0.8, defenseBase: 14, defensePerTier: 4 } },
      { name: 'Divine Trident', desc: 'Trinity Strike: Triple hit.', mats: { 'Divine Ingot': 6, 'Holy Essence': 3 }, stats: { damageBase: 62, damagePerTier: 16, speedBase: 95, speedPerTier: 22, critBase: 4, critPerTier: 0.6, blockBase: 5, blockPerTier: 1, defenseBase: 20, defensePerTier: 6 } },
    ]
  },
  maces: {
    profession: 'Miner', category: '1h', items: [
      { name: 'Iron Cudgel',        desc: 'Bash: Stun chance.', mats: { 'Iron Ingot': 5, 'Wood': 2 }, stats: { damageBase: 45, damagePerTier: 11, speedBase: 95, speedPerTier: 22, critBase: 2, critPerTier: 0.4, blockBase: 6, blockPerTier: 1.2, defenseBase: 24, defensePerTier: 6 } },
      { name: 'Steel Flail',        desc: 'Whirl: AoE damage.', mats: { 'Steel Ingot': 5, 'Chain': 2 }, stats: { damageBase: 48, damagePerTier: 12, speedBase: 90, speedPerTier: 20, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 22, defensePerTier: 6 } },
      { name: 'Spiked Morningstar', desc: 'Crush: Armor break.', mats: { 'Mithril Ingot': 5, 'Iron Ingot': 3 }, stats: { damageBase: 52, damagePerTier: 13, speedBase: 88, speedPerTier: 20, critBase: 3, critPerTier: 0.5, blockBase: 5, blockPerTier: 1, defenseBase: 24, defensePerTier: 7 } },
      { name: 'Bloodbludgeon',      desc: 'Splatter: Bleed AoE.', mats: { 'Dark Iron Ingot': 6, 'Blood': 3 }, stats: { damageBase: 50, damagePerTier: 12, speedBase: 92, speedPerTier: 21, critBase: 3, critPerTier: 0.5, blockBase: 6, blockPerTier: 1.2, defenseBase: 26, defensePerTier: 7 } },
      { name: 'Obsidian Crusher',   desc: 'Shatter: Shield break.', mats: { 'Obsidian': 8, 'Shadow Ingot': 3 }, stats: { damageBase: 55, damagePerTier: 14, speedBase: 85, speedPerTier: 19, critBase: 2, critPerTier: 0.4, blockBase: 7, blockPerTier: 1.4, defenseBase: 28, defensePerTier: 8 } },
      { name: 'Divine Scepter',     desc: 'Judgment: True damage.', mats: { 'Divine Ingot': 6, 'Holy Essence': 2 }, stats: { damageBase: 58, damagePerTier: 15, speedBase: 82, speedPerTier: 18, critBase: 4, critPerTier: 0.6, blockBase: 6, blockPerTier: 1.2, defenseBase: 26, defensePerTier: 7 } },
    ]
  },
  shields: {
    profession: 'Miner', category: 'offhand', items: [
      { name: 'Iron Buckler',         desc: '+10% Block.', mats: { 'Iron Ingot': 3 }, stats: { blockBase: 10, blockPerTier: 2, defenseBase: 30, defensePerTier: 8 } },
      { name: 'Steel Kite Shield',    desc: '+15% Block.', mats: { 'Steel Ingot': 5 }, stats: { blockBase: 15, blockPerTier: 3, defenseBase: 40, defensePerTier: 10 } },
      { name: 'Obsidian Shield',      desc: 'Fire Resist.', mats: { 'Obsidian': 10, 'Iron Ingot': 5 }, stats: { blockBase: 12, blockPerTier: 2.5, defenseBase: 45, defensePerTier: 12 } },
      { name: 'Mithril Tower Shield', desc: '+25% Block.', mats: { 'Mithril Ingot': 8 }, stats: { blockBase: 25, blockPerTier: 5, defenseBase: 55, defensePerTier: 14 } },
      { name: 'Void Aegis',           desc: 'Spell Reflect.', mats: { 'Shadow Ingot': 6, 'Void Essence': 3 }, stats: { blockBase: 18, blockPerTier: 3.5, defenseBase: 50, defensePerTier: 13 } },
      { name: 'Divine Bulwark',       desc: 'Immunity Proc.', mats: { 'Divine Ingot': 10, 'Holy Essence': 5 }, stats: { blockBase: 30, blockPerTier: 6, defenseBase: 65, defensePerTier: 16 } },
    ]
  },
  bows: {
    profession: 'Forester', category: '2h', items: [
      { name: 'Wraithbone Bow', desc: 'Shadow Arrow: Builds Mark.', mats: { 'Wood': 4, 'Bone': 2, 'String': 2 }, stats: { damageBase: 45, damagePerTier: 11, speedBase: 120, speedPerTier: 28, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Bloodstring',    desc: 'Crimson Shot: Bleed.', mats: { 'Hardwood': 4, 'Blood': 2, 'Sinew': 2 }, stats: { damageBase: 48, damagePerTier: 12, speedBase: 115, speedPerTier: 27, critBase: 6, critPerTier: 0.9, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Shadowflight',   desc: 'Shadow Volley: AoE.', mats: { 'Darkwood': 4, 'Void Dust': 2 }, stats: { damageBase: 46, damagePerTier: 11, speedBase: 125, speedPerTier: 30, critBase: 7, critPerTier: 1, blockBase: 0, blockPerTier: 0, defenseBase: 4, defensePerTier: 2 } },
      { name: 'Emberthorn',     desc: 'Flame Arrow: DoT.', mats: { 'Ashwood': 4, 'Fire Essence': 2 }, stats: { damageBase: 50, damagePerTier: 12, speedBase: 118, speedPerTier: 28, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Ironvine',       desc: 'Root Shot: Snare.', mats: { 'Ironwood': 4, 'Vine': 3 }, stats: { damageBase: 44, damagePerTier: 11, speedBase: 122, speedPerTier: 29, critBase: 4, critPerTier: 0.7, blockBase: 0, blockPerTier: 0, defenseBase: 6, defensePerTier: 2 } },
      { name: 'Duskreaver',     desc: 'Twilight Volley: Pierce.', mats: { 'Worldtree Wood': 6, 'Shadow Essence': 3 }, stats: { damageBase: 52, damagePerTier: 13, speedBase: 112, speedPerTier: 26, critBase: 8, critPerTier: 1.2, blockBase: 0, blockPerTier: 0, defenseBase: 6, defensePerTier: 2 } },
    ]
  },
  crossbows: {
    profession: 'Engineer', category: '2h', items: [
      { name: 'Ironveil Repeater', desc: 'Heavy Bolt: Builds Mark.', mats: { 'Iron': 3, 'Wood': 2 }, stats: { damageBase: 55, damagePerTier: 13, speedBase: 100, speedPerTier: 24, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Skullpiercer',      desc: 'Headshot: Silence.', mats: { 'Steel': 3, 'Bone': 2 }, stats: { damageBase: 58, damagePerTier: 14, speedBase: 95, speedPerTier: 22, critBase: 5, critPerTier: 0.7, blockBase: 0, blockPerTier: 0, defenseBase: 7, defensePerTier: 3 } },
      { name: 'Bloodreaver XB',    desc: 'Explosive Round: AoE.', mats: { 'Dark Iron': 3, 'Blood': 2 }, stats: { damageBase: 56, damagePerTier: 13, speedBase: 98, speedPerTier: 23, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Wraithspike',       desc: 'Shadow Trap: Slow.', mats: { 'Void Dust': 3, 'Wood': 2 }, stats: { damageBase: 54, damagePerTier: 13, speedBase: 102, speedPerTier: 24, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 6, defensePerTier: 2 } },
      { name: 'Emberbolt',         desc: 'Firestorm Bolt: DoT.', mats: { 'Fire Essence': 3, 'Steel': 2 }, stats: { damageBase: 60, damagePerTier: 15, speedBase: 92, speedPerTier: 21, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 7, defensePerTier: 3 } },
      { name: 'Ironshard',         desc: 'Shrapnel: Armor break.', mats: { 'Iron': 5, 'Obsidian': 1 }, stats: { damageBase: 62, damagePerTier: 15, speedBase: 90, speedPerTier: 20, critBase: 3, critPerTier: 0.5, blockBase: 0, blockPerTier: 0, defenseBase: 9, defensePerTier: 3 } },
    ]
  },
  guns: {
    profession: 'Engineer', category: '2h', items: [
      { name: 'Blackpowder Blaster', desc: 'Grudge Shot: Mark.', mats: { 'Iron': 3, 'Powder': 2 }, stats: { damageBase: 65, damagePerTier: 16, speedBase: 75, speedPerTier: 18, critBase: 6, critPerTier: 0.9, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Ironstorm Gun',       desc: 'Sniper Round: Range.', mats: { 'Steel': 3, 'Iron': 2 }, stats: { damageBase: 68, damagePerTier: 17, speedBase: 70, speedPerTier: 16, critBase: 7, critPerTier: 1, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Bloodcannon',         desc: 'Crimson Blast: Lifesteal.', mats: { 'Dark Iron': 3, 'Blood': 2 }, stats: { damageBase: 70, damagePerTier: 17, speedBase: 72, speedPerTier: 17, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 6, defensePerTier: 2 } },
      { name: 'Wraithbarrel',        desc: 'Shadow Shot: Silence.', mats: { 'Void Dust': 3, 'Steel': 2 }, stats: { damageBase: 66, damagePerTier: 16, speedBase: 74, speedPerTier: 17, critBase: 6, critPerTier: 0.9, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Emberrifle',          desc: 'Flame Burst: DoT AoE.', mats: { 'Fire Essence': 3, 'Iron': 2 }, stats: { damageBase: 72, damagePerTier: 18, speedBase: 68, speedPerTier: 16, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
      { name: 'Duskblaster',         desc: 'Shrapnel Spray: Pierce.', mats: { 'Shadow Ingot': 3, 'Gem': 1 }, stats: { damageBase: 75, damagePerTier: 19, speedBase: 65, speedPerTier: 15, critBase: 7, critPerTier: 1, blockBase: 0, blockPerTier: 0, defenseBase: 5, defensePerTier: 2 } },
    ]
  },
  fireStaves: {
    profession: 'Mystic', category: '2h', items: [
      { name: 'Emberwrath Staff', desc: 'Fire Bolt: Builds Burn stacks.', mats: { 'Pine Log': 3, 'Minor Fire Essence': 2 }, stats: { damageBase: 42, damagePerTier: 10, speedBase: 100, speedPerTier: 24, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Sunfire Staff',    desc: 'Solar Flare: AoE Burn.', mats: { 'Oak Log': 3, 'Fire Essence': 2 }, stats: { damageBase: 45, damagePerTier: 11, speedBase: 95, speedPerTier: 22, critBase: 5, critPerTier: 0.7, blockBase: 0, blockPerTier: 0, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Inferno Spire',   desc: 'Inferno Wave: Line AoE.', mats: { 'Maple Log': 4, 'Greater Fire Essence': 3 }, stats: { damageBase: 48, damagePerTier: 12, speedBase: 90, speedPerTier: 21, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 9, defensePerTier: 3 } },
      { name: 'Phoenix Staff',   desc: 'Rebirth: Self-resurrect proc.', mats: { 'Ash Log': 5, 'Phoenix Feather': 1 }, stats: { damageBase: 52, damagePerTier: 13, speedBase: 85, speedPerTier: 20, critBase: 6, critPerTier: 0.9, blockBase: 0, blockPerTier: 0, defenseBase: 10, defensePerTier: 3 } },
    ]
  },
  frostStaves: {
    profession: 'Mystic', category: '2h', items: [
      { name: 'Glacial Spire',    desc: 'Frost Bolt: Applies Chill.', mats: { 'Pine Log': 3, 'Minor Frost Essence': 2 }, stats: { damageBase: 40, damagePerTier: 10, speedBase: 105, speedPerTier: 25, critBase: 3, critPerTier: 0.5, blockBase: 0, blockPerTier: 0, defenseBase: 10, defensePerTier: 3 } },
      { name: "Winter's Grudge",   desc: 'Blizzard: AoE Slow.', mats: { 'Oak Log': 3, 'Frost Essence': 2 }, stats: { damageBase: 43, damagePerTier: 11, speedBase: 100, speedPerTier: 24, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 12, defensePerTier: 4 } },
      { name: 'Frostbite Staff',   desc: 'Deep Freeze: Stun.', mats: { 'Maple Log': 4, 'Greater Frost Essence': 3 }, stats: { damageBase: 46, damagePerTier: 12, speedBase: 95, speedPerTier: 22, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 14, defensePerTier: 4 } },
      { name: 'Absolute Zero',     desc: 'Time Stop: Ultimate frost.', mats: { 'Worldtree Log': 8, 'Void Ice': 5 }, stats: { damageBase: 50, damagePerTier: 13, speedBase: 88, speedPerTier: 20, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 16, defensePerTier: 5 } },
    ]
  },
  holyStaves: {
    profession: 'Mystic', category: '2h', items: [
      { name: 'Dawnspire',         desc: 'Holy Light: Heals allies.', mats: { 'Pine Log': 3, 'Minor Holy Essence': 2 }, stats: { damageBase: 35, damagePerTier: 8, speedBase: 110, speedPerTier: 26, critBase: 3, critPerTier: 0.5, blockBase: 0, blockPerTier: 0, defenseBase: 12, defensePerTier: 4 } },
      { name: 'Redemption Staff',  desc: 'Cleanse: Remove debuffs.', mats: { 'Oak Log': 3, 'Holy Essence': 2 }, stats: { damageBase: 38, damagePerTier: 9, speedBase: 105, speedPerTier: 25, critBase: 3, critPerTier: 0.5, blockBase: 0, blockPerTier: 0, defenseBase: 14, defensePerTier: 4 } },
      { name: 'Sacred Light',      desc: 'Divine Shield: Immunity.', mats: { 'Maple Log': 4, 'Greater Holy Essence': 3 }, stats: { damageBase: 40, damagePerTier: 10, speedBase: 100, speedPerTier: 24, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 16, defensePerTier: 5 } },
      { name: 'Divine Judgment Staff', desc: 'Smite Evil: Ultimate holy.', mats: { 'Worldtree Log': 8, 'Divine Essence': 5 }, stats: { damageBase: 45, damagePerTier: 11, speedBase: 95, speedPerTier: 22, critBase: 5, critPerTier: 0.7, blockBase: 0, blockPerTier: 0, defenseBase: 18, defensePerTier: 5 } },
    ]
  },
  lightningStaves: {
    profession: 'Mystic', category: '2h', items: [
      { name: 'Stormwrath',        desc: 'Thunder Bolt: Chain lightning.', mats: { 'Pine Log': 3, 'Minor Storm Essence': 2 }, stats: { damageBase: 48, damagePerTier: 12, speedBase: 95, speedPerTier: 22, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 7, defensePerTier: 2 } },
      { name: 'Tempest Spire',     desc: 'Thunder Clap: AoE Stun.', mats: { 'Oak Log': 3, 'Storm Essence': 2 }, stats: { damageBase: 50, damagePerTier: 13, speedBase: 92, speedPerTier: 21, critBase: 5, critPerTier: 0.8, blockBase: 0, blockPerTier: 0, defenseBase: 8, defensePerTier: 3 } },
      { name: 'Thunderlord Staff', desc: 'Lightning Strike: Burst dmg.', mats: { 'Maple Log': 4, 'Greater Storm Essence': 3 }, stats: { damageBase: 54, damagePerTier: 14, speedBase: 88, speedPerTier: 20, critBase: 6, critPerTier: 0.9, blockBase: 0, blockPerTier: 0, defenseBase: 8, defensePerTier: 3 } },
      { name: "Zeus's Fury",       desc: 'Godly Thunder: Ultimate.', mats: { 'Worldtree Log': 8, 'Divine Storm': 5 }, stats: { damageBase: 58, damagePerTier: 15, speedBase: 85, speedPerTier: 19, critBase: 7, critPerTier: 1, blockBase: 0, blockPerTier: 0, defenseBase: 9, defensePerTier: 3 } },
    ]
  },
  natureStaves: {
    profession: 'Mystic', category: '2h', items: [
      { name: 'Verdant Wrath',  desc: "Nature's Touch: HoT.", mats: { 'Pine Log': 3, 'Minor Nature Essence': 2 }, stats: { damageBase: 38, damagePerTier: 9, speedBase: 108, speedPerTier: 26, critBase: 3, critPerTier: 0.5, blockBase: 0, blockPerTier: 0, defenseBase: 10, defensePerTier: 3 } },
      { name: 'Thorn Grudge',   desc: 'Thorns: Reflect damage.', mats: { 'Oak Log': 3, 'Nature Essence': 2 }, stats: { damageBase: 40, damagePerTier: 10, speedBase: 105, speedPerTier: 25, critBase: 3, critPerTier: 0.5, blockBase: 0, blockPerTier: 0, defenseBase: 12, defensePerTier: 4 } },
      { name: 'Grove Guardian', desc: 'Entangle: Root AoE.', mats: { 'Maple Log': 4, 'Greater Nature Essence': 3 }, stats: { damageBase: 42, damagePerTier: 10, speedBase: 100, speedPerTier: 24, critBase: 4, critPerTier: 0.6, blockBase: 0, blockPerTier: 0, defenseBase: 14, defensePerTier: 4 } },
      { name: 'World Tree',     desc: 'Life Bloom: Ultimate heal.', mats: { 'Worldtree Log': 8, 'Divine Nature': 5 }, stats: { damageBase: 46, damagePerTier: 11, speedBase: 95, speedPerTier: 22, critBase: 5, critPerTier: 0.7, blockBase: 0, blockPerTier: 0, defenseBase: 16, defensePerTier: 5 } },
    ]
  },
  tomes: {
    profession: 'Mystic', category: 'offhand', items: [
      { name: 'Fire Tome',      desc: 'Allows Fire spell selection.', mats: { 'Paper': 5, 'Fire Essence': 3 }, stats: {} },
      { name: 'Frost Tome',     desc: 'Allows Frost spell selection.', mats: { 'Paper': 5, 'Frost Essence': 3 }, stats: {} },
      { name: 'Holy Tome',      desc: 'Allows Holy spell selection.', mats: { 'Paper': 5, 'Holy Essence': 3 }, stats: {} },
      { name: 'Lightning Tome', desc: 'Allows Storm spell selection.', mats: { 'Paper': 5, 'Storm Essence': 3 }, stats: {} },
      { name: 'Nature Tome',    desc: 'Allows Nature spell selection.', mats: { 'Paper': 5, 'Nature Essence': 3 }, stats: {} },
      { name: 'Arcane Tome',    desc: 'Allows Arcane spell selection.', mats: { 'Paper': 5, 'Arcane Essence': 3 }, stats: {} },
      { name: 'Spellbook',      desc: 'Multi-school spell selection.', mats: { 'Enchanted Paper': 10, 'All Essence': 2 }, stats: {} },
      { name: 'Arcane Book',    desc: 'Advanced spell recipes.', mats: { 'Divine Paper': 15, 'Soul Core': 1 }, stats: {} },
    ]
  },
};

// ============================================================
// FOOD DATA
// ============================================================
const FOOD_DATA = {
  red: [
    { name: 'Burnt Skewer', lvl: 1, buff: '+2% Attack', mats: { 'Scrap Meat': 1, 'Twig': 1 } },
    { name: 'Roasted Rabbit', lvl: 5, buff: '+4% Attack', mats: { 'Rabbit Meat': 1, 'Salt': 1 } },
    { name: 'Grilled Sausage', lvl: 10, buff: '+6% Attack', mats: { 'Ground Meat': 2, 'Casing': 1 } },
    { name: 'Smoked Haunch', lvl: 15, buff: '+8% Damage', mats: { 'Prime Meat': 1, 'Salt': 2 } },
    { name: 'Grilled Steak', lvl: 20, buff: '+10% Damage', mats: { 'Beef': 2, 'Pepper': 1 } },
    { name: 'Bacon Strips', lvl: 22, buff: '+11% Attack', mats: { 'Pork Belly': 2, 'Salt': 1 } },
    { name: "Warrior's Jerky", lvl: 25, buff: '+12% Attack', mats: { 'Beef': 3, 'Salt': 2 } },
    { name: 'Spiced Ribs', lvl: 30, buff: '+14% Damage', mats: { 'Ribs': 3, 'Spice': 2 } },
    { name: 'Venison Cutlet', lvl: 35, buff: '+16% Attack', mats: { 'Deer Meat': 2, 'Herbs': 2 } },
    { name: 'Wild Boar Roast', lvl: 40, buff: '+18% Damage', mats: { 'Boar Meat': 2, 'Herbs': 3 } },
    { name: 'Braised Lamb', lvl: 45, buff: '+20% Attack', mats: { 'Lamb': 3, 'Wine': 1 } },
    { name: 'Berserker Steak', lvl: 48, buff: '+21% Crit', mats: { 'Prime Beef': 3, 'Blood Spice': 2 } },
    { name: 'Inferno Curry', lvl: 50, buff: '+22% Fire Dmg', mats: { 'Spicy Herb': 5, 'Meat': 2 } },
    { name: 'Rage Ribs', lvl: 52, buff: '+23% Damage', mats: { 'Demon Ribs': 3, 'Fire Herb': 2 } },
    { name: 'Flame-Seared Boar', lvl: 55, buff: '+24% Damage', mats: { 'Boar Meat': 3, 'Fire Spice': 2 } },
    { name: 'Fury Feast', lvl: 58, buff: '+25% Attack Speed', mats: { 'Beast Meat': 4, 'Rage Spice': 2 } },
    { name: 'Orcish BBQ Platter', lvl: 60, buff: '+26% Attack', mats: { 'Mixed Meats': 5, 'Fire Spice': 3 } },
    { name: 'Bloodlust Burger', lvl: 62, buff: '+27% Lifesteal', mats: { 'Ground Beast': 3, 'Blood': 1 } },
    { name: 'Bear Roast', lvl: 65, buff: '+28% Damage', mats: { 'Bear Meat': 3, 'Honey': 2 } },
    { name: 'Carnage Chops', lvl: 68, buff: '+29% Damage', mats: { 'Monster Chops': 3, 'Gore Spice': 2 } },
    { name: 'Wyvern Wings', lvl: 70, buff: '+30% Attack', mats: { 'Wyvern Meat': 2, 'Hot Sauce': 3 } },
    { name: 'Slaughter Stew', lvl: 72, buff: '+31% Attack', mats: { 'Mixed Monster': 5, 'Blood Broth': 2 } },
    { name: 'Hellfire Steak', lvl: 75, buff: '+32% Fire Dmg', mats: { 'Demon Beef': 2, 'Hellfire Salt': 1 } },
    { name: 'Massacre Meal', lvl: 78, buff: '+33% All Damage', mats: { 'Elite Meat': 4, 'War Spice': 3 } },
    { name: 'Chimera Kebab', lvl: 80, buff: '+34% Damage', mats: { 'Chimera Meat': 3, 'Exotic Spice': 2 } },
    { name: 'Annihilation Roast', lvl: 82, buff: '+35% Crit Damage', mats: { 'Boss Meat': 3, 'Chaos Salt': 2 } },
    { name: 'Dragon Steak', lvl: 85, buff: '+36% Attack', mats: { 'Dragon Flank': 1, 'Liquid Fire': 1 } },
    { name: 'Armageddon Feast', lvl: 88, buff: '+37% Total Damage', mats: { 'Legendary Meat': 5, 'Divine Fire': 2 } },
    { name: 'Phoenix Roast', lvl: 90, buff: '+38% Fire Dmg', mats: { 'Phoenix Meat': 2, 'Eternal Flame': 1 } },
    { name: "Titan's Feast", lvl: 95, buff: '+40% All Damage', mats: { 'Giant Meat': 3, 'Divine Salt': 1 } },
  ],
  green: [
    { name: 'Simple Salad', lvl: 1, buff: '+2 HP/s', mats: { 'Lettuce': 2, 'Tomato': 1 } },
    { name: 'Vegetable Soup', lvl: 5, buff: '+4 HP/s', mats: { 'Carrot': 1, 'Potato': 1, 'Water': 1 } },
    { name: 'Herb Bundle', lvl: 10, buff: '+6 HP/s', mats: { 'Herbs': 3 } },
    { name: 'Stuffed Mushroom', lvl: 15, buff: '+8 HP/s', mats: { 'Large Mushroom': 2, 'Cheese': 1 } },
    { name: 'Garden Medley', lvl: 20, buff: '+10 HP/s', mats: { 'Carrot': 2, 'Celery': 2, 'Onion': 1 } },
    { name: 'Soothing Broth', lvl: 22, buff: '+11 HP/s', mats: { 'Calm Herbs': 3, 'Broth': 1 } },
    { name: 'Cucumber Rolls', lvl: 25, buff: '+12 HP/s', mats: { 'Cucumber': 3, 'Rice': 2 } },
    { name: 'Healing Wrap', lvl: 28, buff: '+13 HP/s', mats: { 'Bandage Leaf': 2, 'Herbs': 2 } },
    { name: 'Elven Greens', lvl: 30, buff: '+14 HP/s', mats: { 'Forest Herbs': 3, 'Moonpetal': 1 } },
    { name: 'Recovery Soup', lvl: 32, buff: '+15 HP/s', mats: { 'Recovery Herb': 3, 'Vegetable': 2 } },
    { name: 'Healing Herb Tea', lvl: 35, buff: '+16 HP/s', mats: { 'Healing Herb': 3, 'Hot Water': 1 } },
    { name: 'Rejuvenation Tea', lvl: 38, buff: '+17 HP/s', mats: { 'Rejuv Leaf': 3, 'Honey': 1 } },
    { name: 'Vitality Wrap', lvl: 40, buff: '+18 HP/s', mats: { 'Leaf Wrap': 2, 'Healing Herb': 3 } },
    { name: 'Restoration Salad', lvl: 42, buff: '+19 HP/s', mats: { 'Life Greens': 4, 'Dewdrop': 2 } },
    { name: 'Forest Stew', lvl: 45, buff: '+20 HP/s', mats: { 'Wild Vegetables': 4, 'Broth': 2 } },
    { name: 'Renewal Stew', lvl: 48, buff: '+21 HP/s', mats: { 'Renewal Herb': 4, 'Broth': 2 } },
    { name: "Druid's Feast", lvl: 50, buff: '+22 HP/s', mats: { 'Sacred Vegetables': 5, 'Dew': 2 } },
    { name: 'Rebirth Bowl', lvl: 52, buff: '+23 HP/s', mats: { 'Phoenix Herb': 3, 'Life Water': 2 } },
    { name: 'Regeneration Salve', lvl: 55, buff: '+24 HP/s', mats: { 'Regen Herb': 4, 'Aloe': 2 } },
    { name: 'Immortality Greens', lvl: 58, buff: '+25 HP/s', mats: { 'Immortal Plant': 4, 'Dew': 3 } },
    { name: 'Treant Bark Tea', lvl: 60, buff: '+26 HP/s', mats: { 'Living Bark': 2, 'Spring Water': 1 } },
    { name: 'Eternal Salad', lvl: 62, buff: '+27 HP/s', mats: { 'Eternal Herb': 5, 'Star Water': 2 } },
    { name: "Nature's Blessing", lvl: 65, buff: '+28 HP/s', mats: { 'World Tree Fruit': 2, 'Life Essence': 1 } },
    { name: 'Divine Greens Platter', lvl: 68, buff: '+29 HP/s', mats: { 'God Herb': 5, 'Holy Dew': 3 } },
    { name: 'Fairy Ring Salad', lvl: 70, buff: '+30 HP/s', mats: { 'Fairy Mushroom': 3, 'Dewdrops': 2 } },
    { name: 'Life Blossom Soup', lvl: 75, buff: '+32 HP/s', mats: { 'Life Blossom': 3, 'Pure Water': 2 } },
    { name: 'Ambrosia Salad', lvl: 80, buff: '+34 HP/s', mats: { 'Divine Greens': 3, 'Starfruit': 2 } },
    { name: 'Eternal Spring Mix', lvl: 85, buff: '+36 HP/s', mats: { 'Eternal Petals': 4, 'Lifewater': 2 } },
    { name: 'World Tree Nectar', lvl: 90, buff: '+38 HP/s', mats: { 'World Tree Sap': 2, 'Divine Pollen': 1 } },
    { name: 'Divine Restoration', lvl: 95, buff: '+40 HP/s', mats: { 'Divine Herbs': 5, 'Holy Water': 2 } },
  ],
  blue: [
    { name: 'Basic Broth', lvl: 1, buff: '+2 MP/s', mats: { 'Water': 2, 'Salt': 1 } },
    { name: 'Wheat Bread', lvl: 5, buff: '+4 MP/s', mats: { 'Flour': 2, 'Water': 1 } },
    { name: 'Stamina Brew', lvl: 10, buff: '+20 Max Mana', mats: { 'Grain': 2, 'Hops': 1 } },
    { name: "Warrior's Bread", lvl: 15, buff: '+8 MP/s', mats: { 'Grain': 3, 'Water': 1 } },
    { name: 'Fish Stew', lvl: 20, buff: '+10 MP/s', mats: { 'Fish': 2, 'Potato': 2, 'Broth': 1 } },
    { name: 'Mana Biscuit', lvl: 22, buff: '+11 MP/s', mats: { 'Magic Flour': 2, 'Mana Honey': 1 } },
    { name: 'Hearty Stew', lvl: 25, buff: '+12 MP/s', mats: { 'Meat': 2, 'Potato': 3, 'Broth': 1 } },
    { name: 'Arcane Toast', lvl: 28, buff: '+13 MP/s', mats: { 'Enchanted Bread': 2, 'Spell Butter': 1 } },
    { name: 'Honey Bread', lvl: 30, buff: '+14 MP/s', mats: { 'Flour': 3, 'Honey': 2 } },
    { name: 'Mystic Muffin', lvl: 32, buff: '+15 MP/s', mats: { 'Arcane Flour': 3, 'Mana Cream': 1 } },
    { name: 'Mana Soup', lvl: 35, buff: '+16 MP/s', mats: { 'Magic Mushroom': 3, 'Arcane Water': 1 } },
    { name: "Spellcaster's Soup", lvl: 38, buff: '+17 MP/s', mats: { 'Magic Noodle': 3, 'Spell Broth': 2 } },
    { name: "Sailor's Chowder", lvl: 40, buff: '+18 MP/s', mats: { 'Shellfish': 3, 'Cream': 2 } },
    { name: "Wizard's Pie", lvl: 42, buff: '+19 MP/s', mats: { 'Arcane Fruit': 3, 'Magic Crust': 2 } },
    { name: 'Mystic Gumbo', lvl: 45, buff: '+20 MP/s', mats: { 'Seafood': 3, 'Spellwort': 2, 'Broth': 2 } },
    { name: "Sorcerer's Stew", lvl: 48, buff: '+21 MP/s', mats: { 'Enchanted Meat': 3, 'Spell Water': 2 } },
    { name: 'Arcane Pastry', lvl: 50, buff: '+22 MP/s', mats: { 'Magic Flour': 3, 'Mana Butter': 2 } },
    { name: "Mage's Feast", lvl: 52, buff: '+23 MP/s', mats: { 'Arcane Dish': 4, 'Mana Sauce': 2 } },
    { name: 'Grog of Courage', lvl: 55, buff: '+24 MP/s', mats: { 'Strong Grain': 4, 'Fire Water': 1 } },
    { name: "Enchanter's Bread", lvl: 58, buff: '+25 MP/s', mats: { 'Divine Flour': 4, 'Star Honey': 2 } },
    { name: "Wizard's Stew", lvl: 60, buff: '+26 MP/s', mats: { 'Magic Ingredients': 4, 'Mana Crystal': 1 } },
    { name: "Archmage's Cake", lvl: 62, buff: '+27 MP/s', mats: { 'Celestial Flour': 4, 'Moon Cream': 3 } },
    { name: 'Enchanted Pie', lvl: 65, buff: '+28 MP/s', mats: { 'Enchanted Fruit': 3, 'Magic Crust': 2 } },
    { name: 'Divine Mana Feast', lvl: 68, buff: '+29 MP/s', mats: { 'God Ingredients': 5, 'Holy Mana': 3 } },
    { name: 'Astral Soup', lvl: 70, buff: '+30 MP/s', mats: { 'Star Essence': 2, 'Void Mushroom': 3 } },
    { name: 'Void Bisque', lvl: 75, buff: '+32 MP/s', mats: { 'Void Crab': 2, 'Shadow Cream': 2 } },
    { name: 'Celestial Cake', lvl: 80, buff: '+34 MP/s', mats: { 'Starlight Flour': 4, 'Moon Sugar': 3 } },
    { name: 'Cosmic Brew', lvl: 85, buff: '+36 MP/s', mats: { 'Cosmic Hops': 3, 'Starwater': 2 } },
    { name: 'Eternal Cake', lvl: 90, buff: '+38 MP/s', mats: { 'Divine Flour': 5, 'Eternal Sugar': 3 } },
    { name: 'Nectar of Gods', lvl: 95, buff: '+40 MP/s', mats: { 'Astral Fruit': 10, 'Holy Water': 1 } },
  ]
};

// ============================================================
// POTION DATA
// ============================================================
const POTION_DATA = [
  { name: 'Minor Health Potion', effect: 'Restores 50 HP', icon: 'health', mats: { 'Red Herb': 2, 'Water': 1 } },
  { name: 'Minor Mana Potion', effect: 'Restores 50 MP', icon: 'mana', mats: { 'Blue Herb': 2, 'Water': 1 } },
  { name: 'Minor Stamina Potion', effect: 'Restores 50 Stamina', icon: 'stamina', mats: { 'Yellow Herb': 2, 'Water': 1 } },
  { name: 'Antidote', effect: 'Cures poison', icon: 'antidote', mats: { 'Antitoxin Herb': 3, 'Pure Water': 1 } },
  { name: 'Health Potion', effect: 'Restores 150 HP', icon: 'health', mats: { 'Blood Moss': 3, 'Distilled Water': 1 } },
  { name: 'Mana Potion', effect: 'Restores 150 MP', icon: 'mana', mats: { 'Mana Bloom': 3, 'Distilled Water': 1 } },
  { name: 'Rage Potion', effect: '+30% Damage, 30s', icon: 'rage', mats: { 'Berserker Root': 3, 'Fire Essence': 1 } },
  { name: 'Speed Potion', effect: '+30% Speed, 30s', icon: 'speed', mats: { 'Swift Herb': 3, 'Wind Essence': 1 } },
  { name: 'Defense Potion', effect: '+30% Defense, 30s', icon: 'defense', mats: { 'Ironbark': 3, 'Earth Essence': 1 } },
  { name: 'Greater Health Potion', effect: 'Restores 300 HP', icon: 'health', mats: { 'Heart Blossom': 4, 'Life Essence': 1 } },
  { name: 'Greater Mana Potion', effect: 'Restores 300 MP', icon: 'mana', mats: { 'Mana Crystal Dust': 4, 'Arcane Water': 1 } },
  { name: 'Invisibility Potion', effect: 'Invisible 20s', icon: 'invisibility', mats: { 'Ghost Orchid': 4, 'Shadow Essence': 2 } },
  { name: 'Fire Resistance', effect: '+50% Fire Resist', icon: 'fireResist', mats: { 'Firebloom': 4, 'Ice Essence': 2 } },
  { name: 'Frost Resistance', effect: '+50% Frost Resist', icon: 'frostResist', mats: { 'Frostleaf': 4, 'Fire Essence': 2 } },
  { name: 'Super Health Potion', effect: 'Restores 500 HP', icon: 'health', mats: { 'Dragon Blood Herb': 5, 'Life Crystal': 1 } },
  { name: 'Super Mana Potion', effect: 'Restores 500 MP', icon: 'mana', mats: { 'Arcane Lotus': 5, 'Mana Crystal': 1 } },
  { name: 'Berserker Elixir', effect: '+50% Damage, 60s', icon: 'rage', mats: { 'Rage Flower': 5, 'Blood Essence': 2 } },
  { name: 'Titan Strength', effect: '+100 Strength, 60s', icon: 'defense', mats: { "Giant's Blood": 3, 'Power Crystal': 1 } },
  { name: 'Divine Health', effect: 'Full HP restore', icon: 'divine', mats: { 'Phoenix Tear': 2, 'Divine Essence': 1 } },
  { name: 'Elixir of Immortality', effect: 'Revive on death', icon: 'divine', mats: { "Philosopher's Stone": 1, 'Dragon Blood': 3 } },
  { name: 'Lightning Resistance', effect: '+50% Lightning Resist', icon: 'exp', mats: { 'Storm Leaf': 4, 'Earth Essence': 2 } },
  { name: 'Nature Resistance', effect: '+50% Nature Resist', icon: 'luck', mats: { 'Ironbark': 4, 'Fire Essence': 2 } },
  { name: 'Shadow Resistance', effect: '+50% Shadow Resist', icon: 'frostResist', mats: { 'Lightbloom': 4, 'Holy Essence': 2 } },
  { name: 'Holy Resistance', effect: '+50% Holy Resist', icon: 'invisibility', mats: { 'Shadowleaf': 4, 'Dark Essence': 2 } },
  { name: 'Focus Potion', effect: '+30% Accuracy, 30s', icon: 'focus', mats: { 'Focus Herb': 3, 'Mind Crystal': 1 } },
  { name: 'Luck Potion', effect: '+20% Drop Rate, 60s', icon: 'luck', mats: { 'Lucky Clover': 5, 'Star Dust': 2 } },
  { name: 'Experience Potion', effect: '+50% EXP, 30min', icon: 'exp', mats: { 'Wisdom Herb': 5, 'Soul Dust': 2 } },
  { name: "Giant's Potion", effect: '+50% Size, 60s', icon: 'defense', mats: { 'Giant Root': 3, 'Growth Essence': 2 } },
  { name: 'Shrinking Potion', effect: '-50% Size, 60s', icon: 'focus', mats: { 'Tiny Mushroom': 5, 'Void Dust': 2 } },
  { name: 'Flight Potion', effect: 'Fly for 60s', icon: 'flight', mats: { 'Angel Feather': 3, 'Wind Essence': 3 } },
];

// ============================================================
// ATTRIBUTES DATA
// ============================================================
const ATTRIBUTES = [
  { id: 'strength',  name: 'Strength',  emoji: '💪', color: '#ef4444', description: 'Increases physical attack damage. Warriors and Barbarians benefit most.', formula: 'Physical Damage = Base × (1 + STR × 0.05)' },
  { id: 'intellect', name: 'Intellect', emoji: '🧠', color: '#8b5cf6', description: 'Increases magical damage and max mana pool. Essential for Mage Priests.', formula: 'Magic Damage = Base × (1 + INT × 0.05)' },
  { id: 'vitality',  name: 'Vitality',  emoji: '❤️', color: '#22c55e', description: 'Increases maximum HP. Important for all frontline fighters.', formula: 'Max HP = 100 + (VIT × 12)' },
  { id: 'dexterity', name: 'Dexterity', emoji: '🎯', color: '#f59e0b', description: 'Increases critical hit chance and ranged damage. Key stat for Rangers.', formula: 'Crit Chance = 5% + (DEX × 1.5%)' },
  { id: 'endurance', name: 'Endurance', emoji: '🛡️', color: '#6366f1', description: 'Increases physical defense and max stamina. Dwarves excel here.', formula: 'Defense = 2 + (END × 2)' },
  { id: 'wisdom',    name: 'Wisdom',    emoji: '✨', color: '#06b6d4', description: 'Increases magical defense, heal power, and mana regeneration.', formula: 'Heal Power = Base × (1 + WIS × 0.04)' },
  { id: 'agility',   name: 'Agility',   emoji: '⚡', color: '#10b981', description: 'Increases evasion chance and turn speed. Determines action order.', formula: 'Evasion = AGI × 1.2%, Speed = 50 + AGI × 2' },
  { id: 'tactics',   name: 'Tactics',   emoji: '📜', color: '#f97316', description: 'Increases buff/debuff effectiveness and ability damage modifiers.', formula: 'Ability Bonus = TAC × 2%' },
];

// ============================================================
// GENERATE MASTER DATABASE
// ============================================================
console.log('🔨 Generating Grudge Game Data Hub master database...\n');

const allItems = [];
const allRecipes = [];
const materialUuids = new Map(); // material name -> uuid

// --- Helper: get or create material UUID ---
function getMaterialUuid(name) {
  if (!materialUuids.has(name)) {
    materialUuids.set(name, generateUuid('material', name));
  }
  return materialUuids.get(name);
}

// --- Process Weapons ---
let weaponCount = 0;
for (const [weaponType, def] of Object.entries(WEAPON_DEFINITIONS)) {
  const iconFn = WEAPON_ICONS[weaponType];
  def.items.forEach((item, idx) => {
    const baseUuid = generateUuid('item', `${weaponType}-${item.name}`);
    const recipeUuid = generateUuid('recipe', `recipe-${item.name}`);

    // Generate recipe
    const recipeMaterials = Object.entries(item.mats).map(([matName, qty]) => ({
      uuid: getMaterialUuid(matName),
      name: matName,
      quantity: qty,
    }));

    allRecipes.push({
      uuid: recipeUuid,
      name: `Craft ${item.name}`,
      resultItemId: baseUuid,
      resultName: item.name,
      profession: def.profession,
      category: weaponType,
      materials: recipeMaterials,
    });

    // Generate tiered items
    for (let tier = 1; tier <= 8; tier++) {
      const tierUuid = tier === 1 ? baseUuid : generateUuid('item', `${weaponType}-${item.name}-T${tier}`);
      const tierData = TIERS[tier - 1];
      const stats = {};
      if (item.stats) {
        for (const [key, val] of Object.entries(item.stats)) {
          if (key.endsWith('Base')) {
            const statName = key.replace('Base', '');
            const perTier = item.stats[`${statName}PerTier`] || 0;
            stats[statName] = scaleStat(val, perTier, tier);
          }
        }
      }

      allItems.push({
        uuid: tierUuid,
        baseUuid,
        name: tier === 1 ? item.name : `${item.name} T${tier}`,
        baseName: item.name,
        category: weaponType,
        type: 'weapon',
        subCategory: def.category,
        tier,
        tierLabel: tierData.label,
        tierColor: tierData.color,
        iconUrl: iconFn ? iconFn(idx + 1) : '',
        description: item.desc,
        stats,
        craftedBy: def.profession,
        recipeUuid,
        abilities: item.abilities || [],
        signature: item.signature || '',
        passives: item.passives || [],
      });
      weaponCount++;
    }
  });
}
console.log(`  ⚔️  ${weaponCount} weapon items (${weaponCount / 8} base × 8 tiers)`);

// --- Process Foods ---
let foodCount = 0;
const foodIcons = {
  red: ICON('consumables/food_steak_cooked.png'),
  green: ICON('consumables/food_grapes.png'),
  blue: ICON('consumables/food_fish_red.png'),
};

for (const [color, foods] of Object.entries(FOOD_DATA)) {
  foods.forEach((food) => {
    const foodUuid = generateUuid('food', `food-${color}-${food.name}`);
    const recipeUuid = generateUuid('recipe', `recipe-food-${food.name}`);

    const recipeMaterials = Object.entries(food.mats).map(([matName, qty]) => ({
      uuid: getMaterialUuid(matName),
      name: matName,
      quantity: qty,
    }));

    allRecipes.push({
      uuid: recipeUuid,
      name: `Cook ${food.name}`,
      resultItemId: foodUuid,
      resultName: food.name,
      profession: 'Chef',
      category: `food-${color}`,
      materials: recipeMaterials,
    });

    allItems.push({
      uuid: foodUuid,
      name: food.name,
      category: `food-${color}`,
      type: 'food',
      tier: Math.ceil(food.lvl / 12),
      requiredLevel: food.lvl,
      iconUrl: foodIcons[color],
      description: food.buff,
      buff: food.buff,
      craftedBy: 'Chef',
      recipeUuid,
    });
    foodCount++;
  });
}
console.log(`  🍖 ${foodCount} food items`);

// --- Process Potions ---
let potionCount = 0;
POTION_DATA.forEach((potion) => {
  const potionUuid = generateUuid('potion', `potion-${potion.name}`);
  const recipeUuid = generateUuid('recipe', `recipe-potion-${potion.name}`);

  const recipeMaterials = Object.entries(potion.mats).map(([matName, qty]) => ({
    uuid: getMaterialUuid(matName),
    name: matName,
    quantity: qty,
  }));

  allRecipes.push({
    uuid: recipeUuid,
    name: `Brew ${potion.name}`,
    resultItemId: potionUuid,
    resultName: potion.name,
    profession: 'Mystic',
    category: 'potion',
    materials: recipeMaterials,
  });

  allItems.push({
    uuid: potionUuid,
    name: potion.name,
    category: 'potion',
    type: 'potion',
    tier: 1,
    iconUrl: POTION_ICONS[potion.icon] || ICON('consumables/health_potion.png'),
    description: potion.effect,
    effect: potion.effect,
    craftedBy: 'Mystic',
    recipeUuid,
  });
  potionCount++;
});
console.log(`  🧪 ${potionCount} potions`);

// --- Build materials list ---
const allMaterials = [];
for (const [name, uuid] of materialUuids) {
  allMaterials.push({
    uuid,
    name,
    type: 'material',
    iconUrl: ICON(`materials/${name.toLowerCase().replace(/\s+/g, '_')}.png`),
  });
}
console.log(`  📦 ${allMaterials.length} unique materials`);

// --- Attributes with UUIDs ---
const masterAttributes = ATTRIBUTES.map(attr => ({
  ...attr,
  uuid: generateUuid('attribute', attr.id),
}));

// ============================================================
// WRITE OUTPUT FILES
// ============================================================

const masterItems = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  source: 'grudge-game-data-hub/generate-master-database.mjs',
  totalItems: allItems.length,
  totalRecipes: allRecipes.length,
  totalMaterials: allMaterials.length,
  items: allItems,
};

const masterRecipes = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  totalRecipes: allRecipes.length,
  recipes: allRecipes,
};

const masterMaterials = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  totalMaterials: allMaterials.length,
  materials: allMaterials,
};

const masterAttrs = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  total: masterAttributes.length,
  attributes: masterAttributes,
};

// Write to data/ and public/data/
const outputs = [
  ['master-items.json', masterItems],
  ['master-recipes.json', masterRecipes],
  ['master-materials.json', masterMaterials],
  ['master-attributes.json', masterAttrs],
];

for (const [filename, data] of outputs) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(join(DATA_DIR, filename), json);
  writeFileSync(join(PUBLIC_DATA_DIR, filename), json);
}

console.log(`\n✅ Master database generated!`);
console.log(`   📁 data/master-items.json      — ${allItems.length} items`);
console.log(`   📁 data/master-recipes.json     — ${allRecipes.length} recipes`);
console.log(`   📁 data/master-materials.json   — ${allMaterials.length} materials`);
console.log(`   📁 data/master-attributes.json  — ${masterAttributes.length} attributes`);
console.log(`   📁 Files also copied to public/data/`);
