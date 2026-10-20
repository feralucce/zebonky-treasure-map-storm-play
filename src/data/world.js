// Overworld layout for the Zebonkia map (assets/z_map.png, 1180 x 787).
// Node x/y are in map pixels. Paths unlock when their `from` level is
// cleared through the named exit ('normal' or 'secret'), like Super Mario World.

export const MAP_W = 1180;
export const MAP_H = 787;

export const START_NODE = 'dorsal';

export const LEVELS = {
  dorsal: {
    name: 'Dorsal Cove',
    guide: 'Shaan Sharmadillo',
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
    guide: 'Ricky Raccatoo',
    x: 612, y: 432,
    kind: 'level',
    hasSecret: false,
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
    guide: 'Axel Axolotter',
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
    guide: 'Charlie Chimpanzeetah',
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
    guide: 'Sofia Squffalo',
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
    guide: 'Unity Unicorpion',
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
    guide: 'The whole Cuddleherd',
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
    guide: 'Unity Unicorpion',
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
    guide: 'Charlie Chimpanzeetah',
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

// `bend` pushes the curve's midpoint sideways (in px) so routes arc
// across the parchment instead of running ruler-straight.
export const PATHS = [
  { from: 'dorsal', to: 'cumulus', exit: 'normal', bend: 40 },
  { from: 'cumulus', to: 'seafoam', exit: 'normal', bend: 30 },
  { from: 'seafoam', to: 'bamboo', exit: 'normal', bend: 190 },
  { from: 'bamboo', to: 'squvannahs', exit: 'normal', bend: 30 },
  { from: 'bamboo', to: 'unchartedE', exit: 'secret', bend: 25 },
  { from: 'squvannahs', to: 'magenta', exit: 'normal', bend: -30 },
  { from: 'magenta', to: 'volcano', exit: 'normal', bend: -70 },
  { from: 'magenta', to: 'unchartedW', exit: 'secret', bend: 25 },
];
