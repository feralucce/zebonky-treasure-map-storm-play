// The difficulty settings, chosen on the map's Difficulty screen
// (difficultyMenu.js): three bands, by age. `about` is what that screen
// lists for each. The child (or a grown-up) can change it any time; it's
// saved with the game.
//
// - Junior Explorer: falling in a pit lifts you out to the far side; no
//   energy bar (a wild Zebonky's bump only knocks you back).
// - Explorer: the game as it was built.
// - Pioneer: one Z-bolt less; more wild Zebonkies (the e spots in a level);
//   one look at each question's hint; a question answered wrong costs one
//   Z-bolt, once per question, hint or no hint (never the last bolt, so a
//   quiz can't send you back to the start).
//
// Each band draws from its own question bank (src/data/questions*.js). For
// now Junior and Pioneer are copies of the Explorer questions, and the quiz
// card says so (`testingNote`), until each bank is rewritten easier or harder.

export const DIFFICULTIES = [
  {
    id: 'junior',
    name: 'Junior Explorer',
    blurb: 'For our youngest explorers',
    about: [
      '50 questions in each area, the easiest ones',
      'Fall in a pit and you are lifted across to the other side',
      'No energy bar: a wild Zebonky only bumps you back',
      'Hints whenever you want them',
    ],
    energyBar: false,
    maxEnergy: 6,
    pitLift: true,
    extraWild: false,
    hints: Infinity,
    missCostsEnergy: false,
    testingNote: 'Junior Explorer questions will be easier. We are in the testing phase.',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    blurb: 'The adventure as it was made',
    about: [
      '100 questions in each area',
      '6 Z-bolts of energy: a fall or a Zebonky bump costs one',
      'Hints whenever you want them',
    ],
    energyBar: true,
    maxEnergy: 6,
    pitLift: false,
    extraWild: false,
    hints: Infinity,
    missCostsEnergy: false,
    testingNote: null,
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    blurb: 'For explorers who want a challenge',
    about: [
      '200 questions in each area, the hardest ones',
      '5 Z-bolts of energy instead of 6',
      'More wild Zebonkies in every level',
      'One hint per question',
      'A wrong answer costs a Z-bolt',
    ],
    energyBar: true,
    maxEnergy: 5,
    pitLift: false,
    extraWild: true,
    hints: 1,
    missCostsEnergy: true,
    testingNote: 'Pioneer questions will be harder. We are in the testing phase.',
  },
];

export const DEFAULT_DIFFICULTY = 'explorer';

export function difficultyById(id) {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES.find((d) => d.id === DEFAULT_DIFFICULTY);
}
