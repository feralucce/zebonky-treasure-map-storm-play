// Gold and silver times per level, in seconds (bronze is finishing).
// PROVISIONAL (the user, 2026-11-05): made by tools/make_level_times.mjs from
// each level's fastest route; adjust any by hand (and stop re-running the
// tool over them, or move the hand-set ones into HAND below).
// The level's timer only runs while she plays: quizzes and the bonus room
// pause it.

const MADE = {
  'dorsal-1': { gold: 215, silver: 350 },   // route 126.4 s
  'dorsal-2': { gold: 230, silver: 375 },   // route 136.2 s
  'dorsal-3': { gold: 230, silver: 380 },   // route 137.1 s
  'dorsal-4': { gold: 270, silver: 435 },   // route 159.6 s
  'dorsal-5': { gold: 275, silver: 450 },   // route 163.6 s
  'seafoam-1': { gold: 230, silver: 380 },   // route 136.7 s
  'seafoam-2': { gold: 245, silver: 400 },   // route 145.8 s
  'seafoam-3': { gold: 260, silver: 425 },   // route 155 s
  'seafoam-4': { gold: 240, silver: 395 },   // route 142.5 s
  'seafoam-5': { gold: 270, silver: 445 },   // route 162.2 s
  'magenta-1': { gold: 225, silver: 370 },   // route 133.4 s
  'magenta-2': { gold: 235, silver: 385 },   // route 138.7 s
  'magenta-3': { gold: 265, silver: 430 },   // route 157.4 s
  'magenta-4': { gold: 255, silver: 420 },   // route 152.6 s
  'magenta-5': { gold: 315, silver: 515 },   // route 189 s
  'cumulus-1': { gold: 220, silver: 360 },   // route 129.1 s
  'cumulus-2': { gold: 230, silver: 380 },   // route 136.8 s
  'cumulus-3': { gold: 255, silver: 415 },   // route 151.2 s
  'cumulus-4': { gold: 270, silver: 440 },   // route 159.8 s
  'cumulus-5': { gold: 190, silver: 315 },   // route 112.4 s
  'squvannahs-1': { gold: 225, silver: 370 },   // route 134 s
  'squvannahs-2': { gold: 245, silver: 400 },   // route 145.5 s
  'squvannahs-3': { gold: 240, silver: 390 },   // route 141.1 s
  'squvannahs-4': { gold: 275, silver: 445 },   // route 163.4 s
  'squvannahs-5': { gold: 260, silver: 420 },   // route 153.2 s
};

// Hand-set times win over the made ones.
const HAND = {};

export const DEFAULT_TIMES = { gold: 90, silver: 150 };
export const timesFor = (id) => HAND[id] || MADE[id] || DEFAULT_TIMES;
