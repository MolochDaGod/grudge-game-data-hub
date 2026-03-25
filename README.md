# Grudge Warlords — Game Data Hub

Unified game data API and UI for Grudge Warlords. Consolidates all items, crafting recipes, stats, attributes, skill trees, and character data into a single standardized system with GRUDGE UUIDs and real ObjectStore icons.

**Live:** [info.grudge-studio.com](https://info.grudge-studio.com)
**ObjectStore:** [molochdagod.github.io/ObjectStore](https://molochdagod.github.io/ObjectStore)

## Features

- **Master Item Database** — All 816+ weapons, 432 armor, 90 foods, 42 potions, 132 consumables with GRUDGE UUIDs
- **Recipe System** — Every craftable item linked to materials, profession requirements, and skill tree unlocks
- **Real Icons** — All items use verified ObjectStore icon URLs (7,400+ icons)
- **Tier System** — T1-T8 color-coded items with proper stat scaling
- **Account Integration** — Connect to Grudge backend for player data, inventory, and crafting
- **4 Integrated Pages:**
  - **Sprite Database** — Browse all items with real icons, UUIDs, and crafting info
  - **Character Builder** — Build characters with attributes, classes, races
  - **Main Panel** — Full game UI with equipment, inventory, skills, crafting
  - **Stats Guide** — Attribute and stat system reference

## Quick Start

```bash
# Generate master database from all sources
npm run generate

# Start local dev server
npm run dev
```

## Data Files

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
