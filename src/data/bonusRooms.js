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
    width: 17400,
    height: 1700,
    start: [180, 820],
    islands: [
      // 0. The start: a long roll downhill, and a lip to fly off.
      { top: [[-120, 900], [0, 900], [380, 905], [600, 960], [850, 1110], [1050, 1180], [1200, 1170], [1330, 1140], [1420, 1110]] },
      // 1. Rolling hills, and the first geyser hole near its end.
      { top: [[1760, 1060], [1900, 1050], [2030, 1000], [2140, 1010], [2250, 1060], [2340, 1030], [2400, 1040], [2440, 1085], [2540, 1085], [2580, 1040], [2640, 1040]] },
      // 2. High up: down into a bowl, and up its steep side to the falls.
      { under: 150, top: [[2580, 560], [2900, 560], [3050, 600], [3250, 760], [3420, 900], [3550, 940], [3680, 900], [3780, 800], [3840, 700]] },
      // 3. Over the top of the falls: a big roll down, broken by a gap.
      { top: [[4060, 430], [4300, 430], [4500, 470], [4720, 600]] },
      // 4. The long landing after the gap in 3, a dip and a lip.
      { top: [[5000, 860], [5300, 880], [5600, 890], [5820, 895], [6000, 880], [6300, 880], [6500, 930], [6700, 990], [6850, 990], [6960, 965]] },
      // 5. The second geyser, its hole against a wall: pushing into the wall
      // sits him in it.
      { top: [[7220, 1030], [7450, 1010], [7540, 1010], [7580, 1050], [7700, 1050], [7740, 990], [7790, 900], [7810, 790]] },
      // 6. High again: a long slope down to the second falls.
      { under: 150, top: [[7740, 500], [7900, 500], [8200, 560], [8500, 720], [8800, 860], [9000, 880], [9150, 820], [9250, 740]] },
      // 7. The top of the second falls, then three hops down.
      { top: [[9500, 360], [9800, 360], [9950, 390]] },
      { top: [[10140, 450], [10450, 450]] },
      { top: [[10620, 530], [10900, 530]] },
      { top: [[11080, 610], [11460, 610]] },
      // 11. The big one: a roll down to a gap, then the deep half-pipe (15).
      { top: [[11580, 700], [11850, 720], [12100, 880]] },
      // 12. The third geyser, its hole against a wall too.
      { top: [[13220, 900], [13400, 860], [13600, 840], [13760, 840], [13860, 840], [13900, 880], [14000, 880], [14040, 800], [14070, 680], [14090, 560]] },
      // 13. The highest island: the last long roll, and a gap.
      { under: 150, top: [[14050, 260], [14250, 260], [14600, 330], [14850, 470]] },
      // 14. The long landing after the gap in 13, and the door.
      { top: [[15150, 640], [15400, 760], [15700, 810], [16000, 810], [16200, 800], [16900, 800], [17280, 800]] },
      // A little harder (the user, 2026-11-02): gaps cut into the long rolls
      // down in 3, 11 and 13, to jump at full speed. A jump at speed flies
      // about 1,000 px, so each lands on a long stretch (4, 15, 14).
      // 15. After the gap in 11: the deep half-pipe.
      { top: [[12380, 1080], [12600, 1150], [12800, 1110], [13000, 1030], [13100, 990]] },
    ],
    geysers: [
      { x: 2490, y: 1085, height: 760 },
      { x: 7640, y: 1050, height: 760 },
      { x: 13950, y: 880, height: 800 },
    ],
    falls: [
      { x: 3880, w: 120, top: 360, bottom: 1700 },
      { x: 9330, w: 120, top: 300, bottom: 1700 },
    ],
    coins: [
      { along: 0, from: 650, to: 1300, n: 6 },
      { points: [[1450, 964], [1500, 913], [1550, 866], [1600, 838], [1650, 821], [1700, 818]] },
      { along: 1, from: 1850, to: 2350, n: 5 },
      { line: [2490, 960, 2490, 400], n: 6 },
      { along: 2, from: 3000, to: 3780, n: 7 },
      { line: [3940, 470, 3940, 390], n: 2 },
      { along: 3, from: 4350, to: 4700, n: 4 },
      { points: [[4822, 394], [4904, 366], [4986, 355], [5068, 359], [5150, 380]] },
                  { along: 4, from: 5700, to: 6900, n: 8 },
      { points: [[6990, 810], [7053, 744], [7117, 692], [7180, 674]] },
      { line: [7640, 920, 7640, 380], n: 6 },
      { along: 6, from: 7950, to: 9200, n: 9 },
      { line: [9390, 560, 9390, 360], n: 3 },
      { along: 7, from: 9600, to: 9900, n: 3 },
      { points: [[9990, 261], [10085, 205], [10180, 176]] },
      { points: [[10480, 229], [10570, 284], [10660, 349]] },
      { along: 11, from: 11700, to: 12080, n: 4 },
      { points: [[12196, 856], [12272, 917], [12348, 997]] },
      { along: 15, from: 12450, to: 13050, n: 6 },
      { points: [[13110, 839], [13210, 712]] },
      { along: 12, from: 13550, to: 13760, n: 3 },
      { line: [13950, 780, 13950, 200], n: 7 },
      { along: 13, from: 14300, to: 14830, n: 5 },
      { points: [[14956, 273], [15042, 240], [15128, 227], [15214, 231]] },
                  { along: 14, from: 15950, to: 16700, n: 6 },
    ],
    door: { x: 16850 },
  },
};

export const bonusRoomFor = (levelId) => BONUS_ROOMS[levelId] || null;
