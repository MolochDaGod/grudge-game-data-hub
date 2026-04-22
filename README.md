# Grudge Warlords — Game Data Hub
The **Grudge Warlords game data/systems page**. One of several Grudge Studio games, each with its own hub that consumes the shared `ObjectStore` backend. This repo owns the UI and lore for Grudge Warlords specifically; it does not own the item data itself.
**Live:** [info.grudge-studio.com](https://info.grudge-studio.com)
**Master backend:** [ObjectStore](https://molochdagod.github.io/ObjectStore) — single source of truth for all games.
## Architecture (One-Truth / D1 + D6)
- ObjectStore owns every canonical item, icon, recipe, material, and UUID.
- This hub fetches from ObjectStore at deploy (build-time prefetch) and re-fetches at runtime to pick up edits without redeploying (runtime revalidate).
- **No static `data/*.json` will be committed here once migration completes.** The current files are a transition artifact that tracks the old generator until the ObjectStore-consumer loader ships.
- **No generator lives here long-term.** `scripts/generate-master-database.mjs` is scheduled for deletion per plan D6.
## Features (from ObjectStore)
- Full master item database with GRUDGE UUIDs (weapons + armor + consumables + artifacts + tomes)
- Recipe system with materials, profession requirements, and skill-tree unlocks
- One-icon-per-item policy (audit-enforced in ObjectStore)
- Tier system T1-T8 with D5 labels (see below)
- Account integration with Grudge backend
- 4 integrated pages: Sprite Database · Character Builder · Main Panel · Stats Guide
## Tier Labels (D5)
| Tier | Color | Label |
| --- | --- | --- |
| T1 | Bronze | Common |
| T2 | Silver | Uncommon |
| T3 | Blue | Rare |
| T4 | Purple | Epic |
| T5 | Red | **Heroic** (was "Legendary") |
| T6 | Orange | Mythic |
| T7 | Gold | Ancient |
| T8 | Shimmer | **Legendary** (was "Legendary Artifact") |
"Legendary" refers to the T8 tier label only. **Artifact** is a separate weapon category (see ObjectStore AGENTS.md, D3) for end-game world-found items.
## Quick Start
```bash
# (transition) regenerate static data locally - will be removed once the ObjectStore-consumer loader ships
npm run generate
# Start local dev server
npm run dev
```
## Data Files (transition)
These files mirror the current ObjectStore output and will be replaced by runtime fetches.
| File | Description |
|------|-------------|
| `data/master-items.json` | All items with UUIDs, icon URLs, stats, recipe links |
| `data/master-recipes.json` | Crafting recipes with material UUIDs and skill requirements |
| `data/master-attributes.json` | 8 attributes with stat formulas |
| `data/master-skill-trees.json` | Profession, class, and weapon skill trees |

## SDK Usage

```javascript
import { GameDataClient } from './sdk/game-data-client.js';

const client = new GameDataClient();
await client.init();

// Get all T5 swords
const swords = client.search('sword', { tier: 5, type: 'weapon' });

// Get recipe for an item
const recipe = client.getRecipe(item.recipeUuid);

// Connect to Grudge backend
await client.connectAccount(token);
const inventory = await client.getInventory();
```

## UUID Format

All entities use GRUDGE UUIDs: `{PREFIX}-{TIMESTAMP}-{SEQUENCE}-{HASH}`

| Prefix | Entity |
|--------|--------|
| `ITEM` | Weapons, armor, consumables |
| `RECP` | Crafting recipes |
| `MATL` | Materials and resources |
| `NODE` | Skill tree nodes |
| `FOOD` | Food items |
| `POTN` | Potions |

---

Created by Racalvin The Pirate King
Co-Authored-By: Oz <oz-agent@warp.dev>
