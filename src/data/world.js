// Overworld layout for the Zebonkia map (assets/z_map.png, 1180 x 787).
// Node x/y are in map pixels. Paths unlock when their `from` level is
// cleared through the named exit ('normal' or 'secret'), like Super Mario World.
// Each biome has five levels (assets/levels/<biome>-<n>.json) in a chain;
// the chain's last level opens the next biomes, so every level in a biome
// has been played before the next one opens. See docs/guides/map.md.

export const MAP_W = 1180;
export const MAP_H = 787;

export const START_NODE = 'dorsal-1';

export const BIOMES = {
  dorsal: {
    name: 'Dorsal Cove',
    x: 232, y: 545,
    kind: 'level',
    hasSecret: false,
    color: 0x3d8fb5,
    items: [
      { id: 'pearl', name: 'Fin-Rock Pearl' },
      { id: 'shell', name: 'Waterfall Shell' },
      { id: 'basket', name: 'Grubberry Basket' },
      { id: 'tooth', name: 'Shark Tooth' },
      { id: 'starfish', name: 'Sandy Starfish' },
    ],
  },
  cumulus: {
    name: 'Cumulus Rainforest',
    x: 612, y: 432,
    kind: 'level',
    // Plays this saved drawing (assets/levels/<layout>.json) from the map.
    layout: 'long-test-level',
    hasSecret: true, // the door at the top of the waterfall
    color: 0x4d9e76,
    items: [
      { id: 'feather', name: 'Cloud Feather' },
      { id: 'spark', name: 'Static Spark' },
      { id: 'leaf', name: 'Canopy Leaf' },
      { id: 'blossom', name: 'Cloud Blossom' },
      { id: 'raindrop', name: 'Raindrop Gem' },
    ],
  },
  seafoam: {
    name: 'Seafoam Shores',
    x: 950, y: 455,
    kind: 'level',
    hasSecret: false,
    color: 0x5cc2b0,
    items: [
      { id: 'bubble', name: 'Foam Bubble' },
      { id: 'glowstone', name: 'Tide Glowstone' },
      { id: 'pawprint', name: 'Mystery Paw Print' },
      { id: 'otterstone', name: 'Otter Stone' },
      { id: 'kelp', name: 'Kelp Ribbon' },
    ],
  },
  bamboo: {
    name: 'Bamboo Dunes',
    x: 945, y: 236,
    kind: 'level',
    hasSecret: true,
    color: 0xd9a441,
    items: [
      { id: 'flask', name: 'Oasis Flask' },
      { id: 'diamond', name: 'Diamond Sand' },
      { id: 'starchart', name: 'Star Chart' },
      { id: 'flute', name: 'Bamboo Flute' },
      { id: 'sunstone', name: 'Sunstone' },
    ],
  },
  squvannahs: {
    name: 'Squvannahs',
    x: 528, y: 340,
    kind: 'level',
    hasSecret: false,
    color: 0x9bb84a,
    items: [
      { id: 'haycorn', name: 'Golden Haycorn' },
      { id: 'seed', name: 'Loosestrife Seed' },
      { id: 'riverstone', name: 'Royal River Stone' },
      { id: 'acorn', name: 'Acorn Cap' },
      { id: 'prairiefeather', name: 'Prairie Feather' },
    ],
  },
  magenta: {
    name: 'Magenta Mountains',
    x: 272, y: 240,
    kind: 'level',
    hasSecret: true,
    color: 0x8a5cc2,
    items: [
      { id: 'tanzanite', name: 'Tanzanite Shard' },
      { id: 'moonflower', name: 'Moonflower' },
      { id: 'healing', name: 'Healing Crystal' },
      { id: 'glowpebble', name: 'Glow Pebble' },
      { id: 'mountainmap', name: 'Mountain Map' },
    ],
  },
  volcano: {
    name: 'Z-Cave Volcano',
    x: 668, y: 232,
    kind: 'final',
    hasSecret: false,
    color: 0xc8553d,
    items: [
      { id: 'zstone1', name: 'Z-Stone Piece' },
      { id: 'zstone2', name: 'Z-Stone Piece' },
      { id: 'zstone3', name: 'Z-Stone Piece' },
      { id: 'zstone4', name: 'Z-Stone Piece' },
      { id: 'zstone5', name: 'Z-Stone Piece' },
    ],
  },
  unchartedW: {
    name: 'Uncharted West',
    x: 150, y: 420,
    kind: 'bonus',
    hasSecret: false,
    color: 0x7a6a55,
    items: [
      { id: 'scrapW1', name: 'Map Scrap' },
      { id: 'scrapW2', name: 'Map Scrap' },
      { id: 'scrapW3', name: 'Map Scrap' },
      { id: 'scrapW4', name: 'Map Scrap' },
      { id: 'scrapW5', name: 'Map Scrap' },
    ],
  },
  unchartedE: {
    name: 'Uncharted East',
    x: 1100, y: 215,
    kind: 'bonus',
    hasSecret: false,
    color: 0x7a6a55,
    items: [
      { id: 'scrapE1', name: 'Map Scrap' },
      { id: 'scrapE2', name: 'Map Scrap' },
      { id: 'scrapE3', name: 'Map Scrap' },
      { id: 'scrapE4', name: 'Map Scrap' },
      { id: 'scrapE5', name: 'Map Scrap' },
    ],
  },
};

// The five levels of each playable biome: title (from its level file) and
// where its dot sits on the map, in play order. Bamboo Dunes, the volcano
// and Uncharted East are off limits for now.
const CHAINS = {
  dorsal: [
    ['First Steps', 128, 515], ['Tide Pools', 180, 560], ['Cliff Steps', 240, 565],
    ['Ride the Falls', 300, 545], ['Fin Rock', 345, 500],
  ],
  magenta: [
    ['Foothills', 420, 260], ['Crystal Ledges', 345, 240], ['Mountain Stream', 275, 230],
    ['Switchback', 200, 265], ['Mt. Tanzan', 235, 345],
  ],
  squvannahs: [
    ['Tall Grass', 620, 385], ['Royal River', 560, 350], ['Bison Plains', 500, 355],
    ['Flood Season', 440, 335], ['Loosestrife Bloom', 420, 400],
  ],
  seafoam: [
    ['Sandbar Hop', 865, 595], ['Shell Cove Swim', 925, 575], ['Driftwood', 990, 585],
    ['Foam Mounds', 1050, 555], ['Low Tide', 960, 450],
  ],
  cumulus: [
    ['Forest Floor', 440, 505], ['Canopy', 520, 550], ['Misty Falls', 610, 555],
    ['Cloud Trees', 700, 545], ['Storm Canopy', 650, 450],
  ],
};

export const LEVELS = {};
Object.entries(CHAINS).forEach(([biome, chain]) => {
  const b = BIOMES[biome];
  chain.forEach(([title, x, y], i) => {
    const n = i + 1;
    const id = `${biome}-${n}`;
    LEVELS[id] = {
      biome, n, title, x, y,
      name: `${b.name} ${n}`,
      kind: 'level',
      layout: id,
      hasSecret: n === 5, // each biome's last level hides a secret door
      color: b.color,
      items: b.items,
    };
  });
});
LEVELS.unchartedW = { ...BIOMES.unchartedW, biome: 'unchartedW', x: 110, y: 300 };

// `bend` pushes the curve's midpoint sideways (in px) so routes arc
// across the parchment instead of running ruler-straight.
export const PATHS = [];
Object.entries(CHAINS).forEach(([biome, chain]) => {
  for (let n = 1; n < chain.length; n++) {
    PATHS.push({ from: `${biome}-${n}`, to: `${biome}-${n + 1}`, exit: 'normal', bend: n % 2 ? 10 : -10 });
  }
});
PATHS.push(
  // The cove leads into the rainforest; the rainforest's last level fans
  // out to the other three biomes, in any order.
  { from: 'dorsal-5', to: 'cumulus-1', exit: 'normal', bend: 15 },
  { from: 'cumulus-5', to: 'squvannahs-1', exit: 'normal', bend: 10 },
  { from: 'cumulus-5', to: 'magenta-1', exit: 'normal', bend: 130 },
  { from: 'cumulus-5', to: 'seafoam-1', exit: 'normal', bend: -30 },
  // The secret door at the top of Mt. Tanzan.
  { from: 'magenta-5', to: 'unchartedW', exit: 'secret', bend: 30 },
);
