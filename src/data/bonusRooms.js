// The bonus levels behind the bonus level doors, played as the area's
// Zebonky (the user, 2026-11-02: "the bonus levels should let them play as
// the z from that biome"). A level with no room here still has the
// placeholder card (scenes/Bonus.js).
//
// A room (scenes/BonusRoom.js) is drawn from this data:
//   islands   ground to roll on: points along its top, left to right, joined
//             by a smooth curve; the rock under it tapers off `under` px
//             below (300 if not given). There is no bottom (the user):
//             falling off goes back to the level.
//   geysers   a hole in the ground that launches the Zebonky straight up,
//             `height` px above the hole
//   falls     an upward waterfall: inside it, the Zebonky is carried up
//   coins     where the coins are: `arc` (a curve over a jump), `line`, or
//             `along` an island's top, `n` of them; or `points`, each one
//             placed (the jumps' coins: taken from the path the test bot
//             actually flies, tools/bonus_bot.js `trace`, so they can be got)
//   door      the door at the end: reach it and the room is done
//
// Shaan's rooms are Dorsal Cove's (docs/bonus-level-ideas.md); Cannonball
// Cove first (the user, 2026-11-02): hills and curves, geysers, upward
// waterfalls, no timer.

export const BONUS_ROOMS = {
  'dorsal-1': {
    name: 'Cannonball Cove',
    artset: 'dorsal_cove',
    width: 18450,
    height: 1700,
    start: [180, 820],
    // Every gap needs a jump (the user, 2026-11-02: holding right alone got
    // through the whole room). Each one leaves from flat or downhill ground,
    // never a ramp (with full speed held, a ramp launched him across), and
    // its far side is a little higher than the near side, so rolling off
    // falls short; a jump at speed clears it.
    islands: [
      // 0. The start: a long roll downhill to a flat edge.
      { top: [[-120, 900], [0, 900], [380, 905], [600, 960], [850, 1110], [1050, 1180], [1250, 1180], [1420, 1180]] },
      // 1. Rolling hills, and the first geyser hole near its end.
      { top: [[1760, 1150], [1900, 1060], [2030, 1000], [2140, 1010], [2250, 1060], [2340, 1030], [2400, 1040], [2440, 1085], [2540, 1085], [2580, 1040], [2640, 1040]] },
      // 2. High up: down into a bowl, and up its steep side to the falls.
      { under: 150, top: [[2580, 560], [2900, 560], [3050, 600], [3250, 760], [3420, 900], [3550, 940], [3680, 900], [3780, 800], [3840, 700]] },
      // 3. Over the top of the falls: a roll down to a gap.
      { top: [[4060, 430], [4300, 430], [4500, 470], [4720, 600]] },
      // 4. Past the gap, a long roll down to a flat edge.
      { top: [[5100, 570], [5300, 620], [5600, 800], [5820, 880], [6000, 880], [6300, 880], [6500, 930], [6700, 990], [6850, 990], [6960, 990]] },
      // 5. The second geyser, its hole against a wall: pushing into the wall
      // sits him in it.
      { top: [[7300, 960], [7450, 960], [7540, 1010], [7580, 1050], [7700, 1050], [7740, 990], [7790, 900], [7810, 790]] },
      // 6. High again: a long slope down to the second falls.
      { under: 150, top: [[7740, 500], [7900, 500], [8200, 560], [8500, 720], [8800, 860], [9000, 880], [9150, 820], [9250, 740]] },
      // 7. The top of the second falls, then three hops, each a step up and
      // one jump long (a full jump at speed flies about 800 px).
      { top: [[9500, 360], [9750, 380], [9950, 420]] },
      { top: [[10200, 390], [10800, 390]] },
      { top: [[11050, 360], [11650, 360]] },
      { top: [[11900, 330], [12500, 330]] },
      // 11. The big one: down into the deep half-pipe, up its far side to a
      // flat edge, and a gap.
      { top: [[12750, 300], [13000, 330], [13300, 650], [13600, 1000], [13800, 1050], [14000, 1000], [14200, 900], [14300, 890], [14400, 890]] },
      // 12. The third geyser, its hole against a wall too.
      { top: [[14650, 860], [14750, 840], [14910, 840], [14950, 880], [15050, 880], [15090, 800], [15120, 680], [15140, 560]] },
      // 13. The highest island: the last long roll, and a gap.
      { under: 150, top: [[15100, 260], [15300, 260], [15650, 330], [15900, 470]] },
      // 14. Past the last gap, the roll down to the door.
      { top: [[16300, 430], [16550, 520], [16850, 700], [17050, 800], [17250, 800], [17950, 800], [18330, 800]] },
    ],
    geysers: [
      { x: 2490, y: 1085, height: 760 },
      { x: 7640, y: 1050, height: 760 },
      { x: 15000, y: 880, height: 800 },
    ],
    falls: [
      { x: 3880, w: 120, top: 360, bottom: 1700 },
      { x: 9330, w: 120, top: 300, bottom: 1700 },
    ],
    coins: [
      // Where a run that jumps actually goes: coins no test run could get
      // were moved onto a winning run's path (tools/bonus_bot.js, `trace`).
      { along: 0, from: 650, to: 1380, n: 7 },
      { points: [[1440, 1120], [1500, 1026], [1560, 965], [1620, 959], [1680, 1008], [1723, 893]] },
      { along: 1, from: 1850, to: 2350, n: 5 },
      { line: [2490, 960, 2490, 400], n: 6 },
      { along: 2, from: 3000, to: 3780, n: 7 },
      { points: [[3869, 457], [3873, 389]] },
      { along: 3, from: 4350, to: 4700, n: 4 },
      { points: [[4920, 420], [5114, 372]] },
      { points: [[5337, 482], [5478, 657], [5656, 756], [5833, 812], [6011, 810], [6189, 806], [6367, 821], [6544, 874], [6722, 923], [6900, 920]] },
      { points: [[6990, 940], [7063, 826], [7135, 775], [7208, 811], [7244, 750]] },
      { line: [7640, 920, 7640, 380], n: 6 },
      { along: 6, from: 7950, to: 9200, n: 9 },
      { points: [[9326, 552], [9390, 460], [9390, 360]] },
      { along: 7, from: 9600, to: 9900, n: 3 },
      { points: [[9940, 329], [10120, 225], [10260, 208], [10400, 330]] },
      { along: 8, from: 10450, to: 10750, n: 3 },
      { points: [[10830, 350], [10970, 195], [11110, 178], [11269, 143]] },
      { points: [[11334, 157], [11450, 290], [11600, 290]] },
      { points: [[11680, 320], [11820, 165], [11960, 148], [12129, 159]] },
      { points: [[12177, 171], [12300, 260], [12450, 260]] },
      { points: [[12530, 290], [12670, 135], [12810, 118], [13006, 81]] },
      { points: [[12845, 54], [13055, 99], [13248, 215], [13425, 383], [13570, 561], [13699, 749], [13805, 980], [13941, 951], [14077, 893], [14214, 825], [14350, 819]] },
      { points: [[14430, 850], [14497, 719], [14563, 709], [14592, 706]] },
      { points: [[14688, 684], [14817, 686]] },
      { points: [[14962, 727], [15000, 683], [15000, 587], [15000, 490], [15000, 393], [15000, 297], [15000, 200]] },
      { along: 13, from: 15350, to: 15880, n: 5 },
      { points: [[15879, 367], [16018, 306], [16105, 255], [16189, 229], [16302, 232]] },
      { along: 14, from: 16650, to: 17750, n: 8 },
    ],
    door: { x: 17900 },
  },
};

export const bonusRoomFor = (levelId) => BONUS_ROOMS[levelId] || null;
