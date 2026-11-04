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
//   falls     an upward waterfall: inside it, the Zebonky is carried up;
//             out of its top he's tossed `toss` px a step (6 if not given)
//   coins     where the coins are: `arc` (a curve over a jump), `line`, or
//             `along` an island's top, `n` of them; or `points`, each one
//             placed (the jumps' coins: taken from the path the test bot
//             actually flies, tools/bonus_bot.js `trace`, so they can be got)
//   rocks     cracked rocks on the ground at `x` (on island `on`), radius `r`: roll
//             into one at a run and it smashes (his Wrecking Ball), `coins`
//             spilling out ahead; too slow, he bounces off
//   pools     deep water over a basin in an island: `x`, `y` (its surface),
//             `w`, `h`. In it he swims as a shark, any way the arrows say
//   rings     hoops at `x`, `y`: touch one to claim it (one
//             each, or `coins`). With no coins in the room, rings are the score
//   walls     rock walls, `x`, `y`, `w`, `h` (Roll Run's cliffs)
//   bumpers   round pads on island `on` at `x` (or at `x`, `y`), radius `r`:
//             touch one and it bounces him away
//   mist      false: no mist at the bottom (a room with a floor)
//   intro     the line shown as it starts
//   power     the Z-Power's name, shown as it fires (Wrecking Ball, on
//             smashing a rock, or Hyper Dash in a runner room, if not given)
//   door      the door at the end: reach it and the room is done
//
// Shaan's rooms are Dorsal Cove's (docs/bonus-level-ideas.md); Cannonball
// Cove first (the user, 2026-11-02): hills and curves, geysers, upward
// waterfalls, no timer.

export const BONUS_ROOMS = {
  'dorsal-1': {
    name: 'Cannonball Cove',
    artset: 'dorsal_cove',
    // Its islands painted by MOSS (the user, 2026-11-03: "Send it to moss";
    // seed 1 for all): assets/artsets/<set>/bonus/<id>-island-<i>.png, made
    // by tools/moss_bonus_islands.py, shown in place of the drawn ones.
    // true for all, or a list of the islands painted (one reshaped since
    // comes off it until it is repainted).
    painted: true,
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
      // 2. High up: down into a bowl, and up its steep side to the falls,
      // ending in a short lip (a point looked bad, the user 2026-11-03).
      { under: 150, top: [[2580, 560], [2900, 560], [3050, 600], [3250, 760], [3420, 900], [3550, 940], [3680, 900], [3780, 800], [3816, 728], [3836, 712], [3852, 710]] },
      // 3. Over the top of the falls: a roll down to a gap.
      { top: [[4060, 430], [4300, 430], [4500, 470], [4720, 600]] },
      // 4. Past the gap, a long roll down to a flat edge.
      { top: [[5040, 570], [5300, 620], [5600, 800], [5820, 880], [6000, 880], [6300, 880], [6500, 930], [6700, 990], [6850, 990], [6960, 990]] },
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
      // 14. Past the last gap, the roll down to the door, and a wall behind
      // it (at speed he rolled past the door and off the end): a block of
      // rock with a flat top (a thin spike looked bad, the user 2026-11-03).
      { top: [[16300, 430], [16550, 520], [16850, 700], [17050, 800], [17250, 800], [17950, 800], [18200, 800], [18240, 780], [18262, 700], [18272, 600], [18292, 556], [18320, 548], [18400, 548]] },
    ],
    geysers: [
      { x: 2490, y: 1085, height: 760 },
      { x: 7640, y: 1050, height: 760 },
      { x: 15000, y: 880, height: 800 },
    ],
    falls: [
      { x: 3880, w: 120, top: 360, bottom: 1700 },
      { x: 9330, w: 120, top: 300, bottom: 1700, toss: 9 },
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

  // Shaan's second: Shell Bust (the user, 2026-11-02, picked from
  // docs/bonus-level-ideas.md). Cracked rocks in the way: smash them at
  // speed for the coins inside. Same rules as Cannonball Cove: every gap
  // needs a jump (flat or downhill edge, far side a little higher).
  'dorsal-2': {
    name: 'Shell Bust',
    artset: 'dorsal_cove',
    // Its islands painted by MOSS (seed 2 for all, the user 2026-11-03).
    painted: true,
    width: 13300,
    height: 1700,
    start: [180, 820],
    intro: 'Smash the cracked rocks!\nWrecking Ball: roll right through them.',
    islands: [
      // 0. A long roll down to the first rock, and a flat edge.
      { top: [[-120, 900], [0, 900], [300, 905], [600, 1000], [900, 1140], [1200, 1200], [1700, 1200], [2200, 1200]] },
      // 1. Down into a dip, a big rock on the way down.
      { top: [[2480, 1170], [2700, 1170], [2950, 1260], [3200, 1300], [3500, 1300], [3700, 1240], [3800, 1240]] },
      // 2. The geyser, its hole against a wall: a block of rock with a flat
      // top (a thin spike looked bad, the user 2026-11-03).
      { top: [[4080, 1210], [4380, 1210], [4420, 1250], [4560, 1250], [4590, 1200], [4606, 1100], [4616, 1000], [4636, 956], [4664, 948], [4710, 948]] },
      // 3. Up top: a slope down to a small rock, and a flat edge.
      { under: 150, top: [[4600, 600], [4800, 620], [5100, 720], [5300, 760], [5600, 760], [5800, 760]] },
      // 4. A long roll down to two rocks in a row.
      { top: [[6080, 730], [6300, 740], [6700, 950], [7100, 1150], [7500, 1200], [8000, 1200], [8300, 1200]] },
      // 5. Over the falls: down to the biggest rock, and a flat edge.
      { top: [[8700, 450], [9000, 450], [9300, 520], [9600, 700], [9900, 820], [10200, 820]] },
      // 6. Down to the last rock, and a flat edge.
      { top: [[10480, 790], [10700, 790], [11000, 900], [11300, 1000], [11600, 1000], [11700, 1000]] },
      // 7. The end, with the door and a wall behind it: a block of rock
      // with a flat top, not a spike.
      { top: [[11980, 970], [12200, 950], [12800, 950], [13180, 950], [13212, 920], [13230, 850], [13238, 760], [13254, 716], [13276, 708], [13296, 708]] },
    ],
    geysers: [{ x: 4490, y: 1250, height: 760 }],
    falls: [{ x: 8440, w: 120, top: 400, bottom: 1700 }],
    // Each rock has a good run of ground after it: after a slow break, or a
    // bounce and a back-up, there's room to get going before the next jump.
    rocks: [
      { x: 1500, r: 70, coins: 5 },
      { x: 3100, r: 90, coins: 6 },
      { x: 5180, r: 60, coins: 4 },
      { x: 7650, r: 70, coins: 5 },
      { x: 7980, r: 70, coins: 5 },
      { x: 9650, r: 90, coins: 6 },
      { x: 11100, r: 60, coins: 4 },
    ],
    coins: [
      // Coins no test run could get were moved onto a winning run's path
      // (tools/bonus_bot.js, `trace`).
      { along: 0, from: 500, to: 1300, n: 6 },
      { points: [[2230, 1150], [2307, 1019], [2383, 1009], [2452, 998]] },
      { points: [[2622, 1014], [2790, 944], [2900, 1174], [3050, 1212], [3200, 1230]] },
      { points: [[3830, 1190], [3907, 1059], [3983, 1049], [4009, 1028]] },
      { line: [4490, 1150, 4490, 520], n: 6 },
      { along: 3, from: 4700, to: 5050, n: 4 },
      { points: [[5830, 710], [5907, 579], [5983, 569], [6044, 534]] },
      { points: [[6452, 530], [6662, 644], [6686, 873], [6829, 950], [6971, 1027], [7114, 1084], [7257, 1113], [7400, 1125]] },
      { points: [[8500, 700], [8500, 580], [8524, 491]] },
      { along: 5, from: 8800, to: 9800, n: 8 },
      { points: [[10230, 770], [10307, 639], [10383, 629], [10411, 586]] },
      { points: [[10549, 570], [10807, 560], [11038, 649], [11125, 877], [11300, 930]] },
      { points: [[11730, 950], [11807, 819], [11883, 809], [11893, 782]] },
      { points: [[12086, 730], [12310, 750], [12433, 879], [12600, 879]] },
    ],
    door: { x: 12750 },
  },

  // Shaan's third: Shark Dash Rings (the user's pick, 2026-11-02). Three
  // deep pools to swim as a shark, rings to claim by swimming through (the
  // score; a dash until 2026-11-04, when Shaan lost his dash);
  // swim up hard at a pool's edge to leap out onto the bank. Every gap
  // between the pools needs a jump.
  'dorsal-3': {
    name: 'Shark Dash Rings',
    artset: 'dorsal_cove',
    // Its islands painted by MOSS (seed 2 for all, the user 2026-11-03).
    painted: true,
    width: 12100,
    height: 2000,
    start: [180, 620],
    intro: 'Claim the rings!\nSwim through them, up and down to steer.',
    islands: [
      // 0. A roll down into the first pool, and out up its far bank.
      { top: [[-120, 700], [0, 700], [400, 710], [700, 800], [1000, 820], [1060, 1000], [1091, 1350], [1096, 1410], [1100, 1450], [1107, 1486], [1122, 1514], [1143, 1534], [1173, 1546], [1209, 1550], [1249, 1550], [1309, 1550], [2889, 1550], [2949, 1550], [2989, 1550], [3025, 1546], [3055, 1534], [3077, 1514], [3092, 1486], [3100, 1450], [3104, 1410], [3111, 1351], [3150, 1000], [3200, 820], [3500, 820], [3700, 820]] },
      // 1. The second pool.
      { top: [[3980, 790], [4300, 790], [4360, 1000], [4390, 1300], [4396, 1360], [4400, 1400], [4408, 1436], [4422, 1464], [4444, 1484], [4474, 1496], [4510, 1500], [4550, 1500], [4610, 1500], [6088, 1500], [6148, 1500], [6188, 1500], [6224, 1496], [6254, 1484], [6276, 1464], [6292, 1436], [6300, 1400], [6305, 1360], [6312, 1301], [6350, 1000], [6400, 790], [6700, 790], [6900, 790]] },
      // 2. The third and deepest.
      { top: [[7180, 760], [7500, 760], [7560, 1000], [7596, 1450], [7601, 1510], [7604, 1550], [7611, 1586], [7625, 1614], [7647, 1634], [7676, 1646], [7712, 1650], [7752, 1650], [7812, 1650], [9685, 1650], [9745, 1650], [9785, 1650], [9821, 1646], [9851, 1634], [9873, 1614], [9887, 1586], [9895, 1550], [9899, 1510], [9905, 1450], [9950, 1000], [10000, 760], [10300, 760], [10500, 760]] },
      // 3. The end, with the door and a wall behind it: a block of rock
      // with a flat top, not a spike.
      { top: [[10780, 730], [11000, 720], [11600, 720], [11680, 720], [11720, 716], [11744, 700], [11756, 670], [11762, 600], [11766, 530], [11774, 498], [11796, 482], [11830, 478], [12016, 478]] },
    ],
    pools: [
      { x: 1030, y: 860, w: 2140, h: 700 },
      { x: 4330, y: 830, w: 2040, h: 680 },
      { x: 7530, y: 800, w: 2440, h: 860 },
    ],
    rings: [
      { x: 1500, y: 1100 }, { x: 1950, y: 1350 }, { x: 2400, y: 1000 }, { x: 2800, y: 1300 },
      { x: 4800, y: 1200 }, { x: 5250, y: 950 }, { x: 5650, y: 1350 }, { x: 6050, y: 1100 },
      { x: 8000, y: 1100 }, { x: 8450, y: 1500 }, { x: 8900, y: 1200 }, { x: 9300, y: 1500 }, { x: 9650, y: 1050 },
    ],
    // No coins: the rings are the score (the user, 2026-11-02), one each;
    // touch one to claim it.
    coins: [],
    door: { x: 11550 },
  },

  // Shaan's fourth: Tide Pool Tour (the user's pick, 2026-11-02). All his
  // moves: roll along the shore, swim five tide pools (a ring in each),
  // roll through cracked rocks at a run, jump the gaps.
  'dorsal-4': {
    name: 'Tide Pool Tour',
    artset: 'dorsal_cove',
    // Its islands painted by MOSS (seed 2 for all, the user 2026-11-03).
    painted: true,
    width: 11500,
    height: 2000,
    start: [180, 620],
    intro: 'Tour the tide pools!\nRoll, swim and jump.',
    islands: [
      // 0. The shore, the first pool, a rock, and a flat edge.
      { top: [[-120, 700], [0, 700], [400, 710], [600, 760], [700, 780], [740, 900], [750, 952], [762, 1011], [770, 1050], [781, 1086], [799, 1114], [823, 1134], [853, 1146], [890, 1150], [930, 1150], [990, 1150], [1260, 1150], [1320, 1150], [1360, 1150], [1397, 1146], [1427, 1134], [1451, 1114], [1469, 1086], [1480, 1050], [1488, 1011], [1500, 952], [1510, 900], [1550, 780], [2000, 780], [2300, 800], [2400, 800]] },
      // 1. Two pools, a small rock between them.
      { top: [[2680, 770], [2900, 770], [3000, 780], [3040, 900], [3056, 1001], [3066, 1061], [3072, 1100], [3082, 1136], [3098, 1164], [3121, 1184], [3151, 1196], [3188, 1200], [3228, 1200], [3288, 1200], [3662, 1200], [3722, 1200], [3762, 1200], [3799, 1196], [3829, 1184], [3852, 1164], [3868, 1136], [3878, 1100], [3884, 1061], [3894, 1001], [3910, 900], [3950, 780], [4300, 780], [4400, 790], [4440, 900], [4450, 952], [4462, 1011], [4470, 1050], [4481, 1086], [4499, 1114], [4523, 1134], [4553, 1146], [4590, 1150], [4630, 1150], [4690, 1150], [4960, 1150], [5020, 1150], [5060, 1150], [5097, 1146], [5127, 1134], [5151, 1114], [5169, 1086], [5180, 1050], [5188, 1011], [5200, 952], [5210, 900], [5250, 790], [5700, 790], [5800, 800]] },
      // 2. The deepest pool, then the big rock.
      { top: [[6080, 770], [6400, 770], [6500, 780], [6540, 900], [6567, 1101], [6575, 1160], [6580, 1200], [6589, 1236], [6605, 1264], [6627, 1284], [6657, 1296], [6693, 1300], [6733, 1300], [6793, 1300], [7357, 1300], [7417, 1300], [7457, 1300], [7493, 1296], [7523, 1284], [7545, 1264], [7561, 1236], [7570, 1200], [7575, 1160], [7583, 1101], [7610, 900], [7650, 780], [8100, 780], [8400, 800], [8600, 800]] },
      // 3. The last pool, the door and a wall behind it: a block of rock
      // with a flat top, not a spike.
      { top: [[8880, 770], [9200, 770], [9300, 780], [9340, 900], [9350, 952], [9362, 1011], [9370, 1050], [9381, 1086], [9399, 1114], [9423, 1134], [9453, 1146], [9490, 1150], [9530, 1150], [9590, 1150], [9960, 1150], [10020, 1150], [10060, 1150], [10097, 1146], [10127, 1134], [10151, 1114], [10169, 1086], [10180, 1050], [10188, 1011], [10200, 952], [10210, 900], [10250, 780], [10700, 780], [11000, 770], [11080, 770], [11120, 766], [11144, 750], [11156, 720], [11162, 650], [11166, 580], [11174, 548], [11196, 532], [11230, 528], [11416, 528]] },
    ],
    pools: [
      { x: 720, y: 820, w: 810, h: 340 },
      { x: 3020, y: 820, w: 910, h: 390 },
      { x: 4420, y: 830, w: 810, h: 330 },
      { x: 6520, y: 820, w: 1110, h: 490 },
      { x: 9320, y: 820, w: 910, h: 340 },
    ],
    rings: [
      { x: 1120, y: 1000 }, { x: 3470, y: 1060 }, { x: 4820, y: 1010 },
      { x: 6850, y: 960 }, { x: 7250, y: 1180 }, { x: 9780, y: 1010 },
    ],
    rocks: [
      { x: 1750, r: 70, coins: 4 },
      { x: 4100, r: 60, coins: 3 },
      { x: 7880, r: 90, coins: 5 },
    ],
    coins: [
      { along: 0, from: 250, to: 650, n: 4 },
      { line: [850, 1100, 1400, 1100], n: 5 },
      { along: 0, from: 2050, to: 2350, n: 3 },
      { arc: [2430, 750, 2503, 640], peak: 0, n: 2 },
      { line: [3150, 1150, 3750, 1150], n: 5 },
      { line: [4550, 1100, 5100, 1100], n: 5 },
      { along: 1, from: 5300, to: 5750, n: 4 },
      { arc: [5830, 750, 5903, 640], peak: 0, n: 2 },
      { line: [6700, 1250, 7450, 1250], n: 6 },
      { along: 2, from: 8250, to: 8550, n: 3 },
      { arc: [8630, 750, 8703, 640], peak: 0, n: 2 },
      { line: [9450, 1100, 10100, 1100], n: 5 },
      { along: 3, from: 10300, to: 10750, n: 4 },
    ],
    door: { x: 10950 },
  },

  // Shaan's fifth: Roll Run (the user's pick, 2026-11-02). A descent: six
  // switchback ramps between two cliff walls, rolling right, then left, and
  // dropping through the gap at each ramp's low end onto the next. A hole
  // down the middle of every ramp and the floor, lined up, open at the
  // bottom (the user: "there is no way to fail it"): fall in and he drops,
  // onto a lower ramp or out of the bottom, the only way to fail (the
  // user, 2026-11-03: "if they fall, let them fall"). Bumpers knock him
  // back hard (jump them); two cracked rocks.
  'dorsal-5': {
    name: 'Roll Run',
    artset: 'dorsal_cove',
    // Its islands painted by MOSS (seed 2 for all, the user 2026-11-03).
    painted: true,
    width: 2400,
    height: 5300,
    start: [260, 420],
    mist: false,
    intro: 'Roll down the switchbacks!\nJump the holes and the bumpers.',
    walls: [
      { x: 0, y: 0, w: 120, h: 5300 },
      { x: 2280, y: 0, w: 120, h: 5300 },
    ],
    // Each ramp in two, either side of the shaft (x 1150 to 1390); the far
    // side of each hole is a little higher than the edge he leaves from,
    // and the last 150 px before each edge are nearly flat (a curve there
    // threw him into the air just as he needed to jump).
    islands: [
      // 0, 1: ramp one, down to the right.
      { under: 130, top: [[120, 500], [600, 560], [1000, 680], [1150, 690]] },
      { under: 130, top: [[1390, 660], [1800, 800], [2100, 860]] },
      // 2, 3: ramp two, down to the left.
      { under: 130, top: [[300, 1700], [900, 1560], [1150, 1390]] },
      { under: 130, top: [[1390, 1420], [1540, 1412], [2000, 1320], [2280, 1300]] },
      // 4, 5: ramp three, right.
      { under: 130, top: [[120, 1900], [700, 1960], [1000, 2050], [1150, 2060]] },
      { under: 130, top: [[1390, 2030], [1900, 2200], [2100, 2260]] },
      // 6, 7: ramp four, left.
      { under: 130, top: [[300, 3100], [900, 2960], [1150, 2830]] },
      { under: 130, top: [[1390, 2860], [1540, 2852], [2000, 2720], [2280, 2700]] },
      // 8, 9: ramp five, right.
      { under: 130, top: [[120, 3300], [700, 3360], [1000, 3450], [1150, 3460]] },
      { under: 130, top: [[1390, 3430], [1900, 3600], [2100, 3660]] },
      // 10, 11: ramp six, left.
      { under: 130, top: [[300, 4500], [900, 4360], [1150, 4270]] },
      { under: 130, top: [[1390, 4300], [1540, 4292], [2000, 4120], [2280, 4100]] },
      // 12, 13: the floor, the shaft through it too, and the door.
      { under: 160, top: [[120, 4900], [700, 4900], [1150, 4900]] },
      { under: 160, top: [[1390, 4870], [1900, 4870], [2280, 4870]] },
    ],
    bumpers: [
      // One a ramp, past its hole: before it, the jump over the bumper
      // carried him over the hole too. And not right where he lands from a
      // drop: with no run-up he bounced back into the wall again and again.
      { on: 1, x: 1700 }, { on: 2, x: 900 }, { on: 5, x: 1700 },
      { on: 6, x: 850 }, { on: 9, x: 1650 }, { on: 10, x: 800 },
    ],
    rocks: [
      { on: 2, x: 550, r: 70, coins: 4 },
      { on: 9, x: 1950, r: 70, coins: 4 },
    ],
    coins: [
      // Coins the test run flew past after jumping a bumper were moved onto
      // its path (tools/bonus_bot.js, `trace`).
      { along: 0, from: 300, to: 700, n: 4 },
      { along: 0, from: 900, to: 1100, n: 3 },
      { points: [[1146, 570], [1270, 485], [1360, 487]] },
      { points: [[1468, 490], [1661, 555], [1806, 650], [1900, 754], [2050, 781]] },
      { line: [2190, 1000, 2190, 1200], n: 3 },
      { along: 3, from: 2200, to: 1900, n: 3 },
      { along: 3, from: 1700, to: 1450, n: 3 },
      { points: [[1405, 1308], [1270, 1215], [1176, 1216]] },
      { points: [[1083, 1217], [890, 1275], [761, 1353], [665, 1433]] },
      { line: [210, 1780, 210, 1840], n: 2 },
      { along: 4, from: 300, to: 680, n: 4 },
      { along: 4, from: 880, to: 1100, n: 2 },
      { points: [[1144, 1949], [1270, 1855], [1353, 1860]] },
      { points: [[1465, 1856], [1658, 1908]] },
      { points: [[1852, 2032], [1925, 2138], [2050, 2176]] },
      { points: [[2190, 2400], [2121, 2476], [2088, 2559]] },
      { points: [[2007, 2680], [2050, 2641], [1900, 2675]] },
      { along: 7, from: 1700, to: 1450, n: 3 },
      { points: [[1397, 2753], [1270, 2655], [1199, 2667]] },
      { points: [[1086, 2659], [844, 2727], [667, 2849], [575, 2970], [400, 3008]] },
      { along: 8, from: 300, to: 680, n: 4 },
      { along: 8, from: 880, to: 1100, n: 2 },
      { points: [[1144, 3339], [1270, 3255], [1356, 3256]] },
      { points: [[1479, 3262], [1640, 3315]] },
      { points: [[2190, 3800], [2136, 3871], [2099, 3972]] },
      { points: [[2006, 4080], [2050, 4039], [1900, 4083]] },
      { along: 11, from: 1700, to: 1450, n: 3 },
      { points: [[1404, 4193], [1270, 4095], [1187, 4102]] },
      { points: [[1093, 4100], [900, 4152], [739, 4250]] },
      { along: 12, from: 300, to: 1100, n: 5 },
      { points: [[1146, 4779], [1270, 4695], [1358, 4696]] },
      { points: [[1466, 4699], [1625, 4800], [1800, 4800]] },
    ],
    door: { x: 2000, on: 13 },
  },

  // Charlie's first: Chimpanzeetah Speedway (the user, 2026-11-03; the
  // design in docs/charlie-bonus-notes.md). A runner room: the player
  // drives him (right to speed up, on to a sprint; left to brake; jump);
  // fruit gives a boost (double tap right); launch pads throw him high,
  // always the same. He starts on the lowest of three paths; the higher
  // ones are one way (up through, not down). Rocks stop him: jump them.
  // Fall through a gap and he's back just before it, the clock running.
  // No coins: the medal is for his time. Third layout (the user: "this is
  // boring to play"), made by a script: six 6000 px sections that get
  // harder (rolling ground; three gaps a section, wider each section; rock
  // pairs, rocks before gaps and on landings; breaks in the higher paths;
  // fruit on gaps' lips). Pads are kept 250 px or more from an edge (they
  // overhung gaps).
  'cumulus-1': {
    name: 'Chimpanzeetah Speedway',
    artset: 'cumulus_floor',
    runner: true,
    // Provisional: the test bot takes 54 s with three falls (silver). The
    // user's to set once played.
    medalTimes: { gold: 45, silver: 58 },
    width: 37320,
    height: 2150,
    start: [180, 1699],
    intro: 'Run, Charlie, run! Hold \u2192 to speed up.\nGrab fruit, then double tap \u2192 to Hyper Dash.',
    islands: [
      // The lowest path: rolling, three gaps a section, each section's wider.
      { top: [[-120, 1763], [180, 1779], [480, 1781], [780, 1773], [1080, 1766], [1380, 1767], [1680, 1765], [1980, 1750], [2070, 1750]] },  // 0
      { top: [[2330, 1750], [2630, 1760], [2930, 1750], [3230, 1721], [3530, 1719], [3830, 1748], [3970, 1750]] },  // 1
      { top: [[4230, 1750], [4530, 1744], [4830, 1742], [5130, 1740], [5430, 1743], [5730, 1750], [5770, 1750]] },  // 2
      { top: [[6030, 1750], [6330, 1756], [6630, 1790], [6930, 1808], [7230, 1807], [7530, 1784], [7830, 1754], [8055, 1750]] },  // 3
      { top: [[8345, 1750], [8645, 1743], [8945, 1739], [9245, 1742], [9545, 1741], [9845, 1750], [9955, 1750]] },  // 4
      { top: [[10245, 1750], [10545, 1730], [10845, 1716], [11145, 1743], [11445, 1759], [11745, 1750], [11755, 1750]] },  // 5
      { top: [[12045, 1750], [12345, 1763], [12645, 1770], [12945, 1765], [13245, 1769], [13545, 1773], [13845, 1756], [14040, 1750]] },  // 6
      { top: [[14360, 1750], [14660, 1740], [14960, 1703], [15260, 1692], [15560, 1720], [15860, 1750], [15940, 1750]] },  // 7
      { top: [[16260, 1750], [16560, 1751], [16860, 1751], [17160, 1747], [17460, 1749], [17740, 1750]] },  // 8
      { top: [[18060, 1750], [18360, 1772], [18660, 1808], [18960, 1797], [19260, 1772], [19560, 1746], [19860, 1746], [20025, 1750]] },  // 9
      { top: [[20375, 1750], [20675, 1742], [20975, 1735], [21275, 1729], [21575, 1732], [21875, 1750], [21925, 1750]] },  // 10
      { top: [[22275, 1750], [22575, 1744], [22875, 1767], [23175, 1790], [23475, 1768], [23725, 1750]] },  // 11
      { top: [[24075, 1750], [24375, 1757], [24675, 1759], [24975, 1762], [25275, 1768], [25575, 1762], [25875, 1750], [26010, 1750]] },  // 12
      { top: [[26390, 1750], [26690, 1722], [26990, 1692], [27290, 1709], [27590, 1742], [27890, 1750], [27910, 1750]] },  // 13
      { top: [[28290, 1750], [28590, 1756], [28890, 1758], [29190, 1760], [29490, 1757], [29710, 1750]] },  // 14
      { top: [[30090, 1750], [30390, 1773], [30690, 1779], [30990, 1750], [31290, 1723], [31590, 1721], [31890, 1745], [31995, 1750]] },  // 15
      { top: [[32405, 1750], [32705, 1742], [33005, 1730], [33305, 1721], [33605, 1734], [33895, 1750]] },  // 16
      { top: [[34305, 1750], [34605, 1769], [34905, 1805], [35205, 1799], [35505, 1762], [35695, 1750]] },  // 17
      // The last stretch: the door, and a block of rock behind it.
      { top: [[36105, 1750], [36405, 1749], [36705, 1752], [37005, 1755], [37160, 1754], [37192, 1724], [37210, 1654], [37218, 1564], [37234, 1520], [37256, 1512], [37276, 1512], [37300, 1512]] },  // 18
      // Section 1: the middle path (breaks in it) and the top path.
      { under: 50, top: [[1700, 1300], [2150, 1294], [2600, 1300]] },  // 19
      { under: 50, top: [[2950, 1300], [3425, 1294], [3900, 1300]] },  // 20
      { under: 50, top: [[4300, 1300], [4900, 1294], [5500, 1300]] },  // 21
      { under: 50, top: [[5850, 1300], [6125, 1294], [6400, 1300]] },  // 22
      { under: 50, top: [[5300, 850], [5900, 844], [6500, 850]] },  // 23
      // Section 2: the middle path (breaks in it) and the top path.
      { under: 50, top: [[7700, 1300], [8150, 1294], [8600, 1300]] },  // 24
      { under: 50, top: [[8950, 1300], [9425, 1294], [9900, 1300]] },  // 25
      { under: 50, top: [[10300, 1300], [10900, 1294], [11500, 1300]] },  // 26
      { under: 50, top: [[11850, 1300], [12125, 1294], [12400, 1300]] },  // 27
      { under: 50, top: [[11300, 850], [11900, 844], [12500, 850]] },  // 28
      // Section 3: the middle path (breaks in it) and the top path.
      { under: 50, top: [[13700, 1300], [14150, 1294], [14600, 1300]] },  // 29
      { under: 50, top: [[14950, 1300], [15425, 1294], [15900, 1300]] },  // 30
      { under: 50, top: [[16300, 1300], [16900, 1294], [17500, 1300]] },  // 31
      { under: 50, top: [[17850, 1300], [18125, 1294], [18400, 1300]] },  // 32
      { under: 50, top: [[17300, 850], [17900, 844], [18500, 850]] },  // 33
      // Section 4: the middle path (breaks in it) and the top path.
      { under: 50, top: [[19700, 1300], [20150, 1294], [20600, 1300]] },  // 34
      { under: 50, top: [[20950, 1300], [21425, 1294], [21900, 1300]] },  // 35
      { under: 50, top: [[22300, 1300], [22900, 1294], [23500, 1300]] },  // 36
      { under: 50, top: [[23850, 1300], [24125, 1294], [24400, 1300]] },  // 37
      { under: 50, top: [[23300, 850], [23900, 844], [24500, 850]] },  // 38
      // Section 5: the middle path (breaks in it) and the top path.
      { under: 50, top: [[25700, 1300], [26150, 1294], [26600, 1300]] },  // 39
      { under: 50, top: [[26950, 1300], [27425, 1294], [27900, 1300]] },  // 40
      { under: 50, top: [[28300, 1300], [28900, 1294], [29500, 1300]] },  // 41
      { under: 50, top: [[29850, 1300], [30125, 1294], [30400, 1300]] },  // 42
      { under: 50, top: [[29300, 850], [29900, 844], [30500, 850]] },  // 43
      // Section 6: the middle path (breaks in it) and the top path.
      { under: 50, top: [[31700, 1300], [32150, 1294], [32600, 1300]] },  // 44
      { under: 50, top: [[32950, 1300], [33425, 1294], [33900, 1300]] },  // 45
      { under: 50, top: [[34300, 1300], [34900, 1294], [35500, 1300]] },  // 46
      { under: 50, top: [[35850, 1300], [36125, 1294], [36400, 1300]] },  // 47
      { under: 50, top: [[35300, 850], [35900, 844], [36500, 850]] },  // 48
    ],
    pads: [
      { x: 1100, on: 0 }, { x: 3500, on: 1 }, { x: 4600, on: 21 },
      { x: 7100, on: 3 }, { x: 9500, on: 4 }, { x: 10600, on: 26 },
      { x: 13100, on: 6 }, { x: 15500, on: 7 }, { x: 16600, on: 31 },
      { x: 19100, on: 9 }, { x: 21500, on: 10 }, { x: 22600, on: 36 },
      { x: 25100, on: 12 }, { x: 27500, on: 13 }, { x: 28600, on: 41 },
      { x: 31100, on: 15 }, { x: 33500, on: 16 }, { x: 34600, on: 46 },
    ],
    fruit: [
      { x: 900, on: 0 }, { x: 2000, on: 19 }, { x: 4950, on: 21 }, { x: 5800, on: 23 },
      { x: 6900, on: 3 }, { x: 8000, on: 24 }, { x: 10950, on: 26 }, { x: 11800, on: 28 },
      { x: 12900, on: 6 }, { x: 14000, on: 29 }, { x: 16950, on: 31 }, { x: 17800, on: 33 },
      { x: 15890, on: 7 }, { x: 18900, on: 9 }, { x: 20000, on: 34 }, { x: 22950, on: 36 },
      { x: 23800, on: 38 }, { x: 21875, on: 10 }, { x: 24900, on: 12 }, { x: 26000, on: 39 },
      { x: 28950, on: 41 }, { x: 29800, on: 43 }, { x: 27860, on: 13 }, { x: 30900, on: 15 },
      { x: 32000, on: 44 }, { x: 34950, on: 46 }, { x: 35800, on: 48 }, { x: 33845, on: 16 },
    ],
    stumbles: [
      { x: 1500, on: 0 }, { x: 3200, on: 1 }, { x: 4900, on: 2 }, { x: 2300, on: 19 }, { x: 3550, on: 20 }, { x: 5100, on: 21 },
      { x: 7500, on: 3 }, { x: 9200, on: 4 }, { x: 10900, on: 5 }, { x: 7455, on: 3 }, { x: 8300, on: 24 }, { x: 9550, on: 25 },
      { x: 11100, on: 26 }, { x: 13500, on: 6 }, { x: 15200, on: 7 }, { x: 16900, on: 8 }, { x: 13440, on: 6 }, { x: 16680, on: 8 },
      { x: 14300, on: 29 }, { x: 15550, on: 30 }, { x: 17100, on: 31 }, { x: 19500, on: 9 }, { x: 21200, on: 10 }, { x: 22900, on: 11 },
      { x: 19425, on: 9 }, { x: 22695, on: 11 }, { x: 23250, on: 11 }, { x: 20300, on: 34 }, { x: 21550, on: 35 }, { x: 23100, on: 36 },
      { x: 24050, on: 38 }, { x: 25500, on: 12 }, { x: 27200, on: 13 }, { x: 28900, on: 14 }, { x: 25410, on: 12 }, { x: 28710, on: 14 },
      { x: 29250, on: 14 }, { x: 29110, on: 14 }, { x: 26300, on: 39 }, { x: 27550, on: 40 }, { x: 29100, on: 41 }, { x: 30050, on: 43 },
      { x: 31500, on: 15 }, { x: 33200, on: 16 }, { x: 34900, on: 17 }, { x: 31395, on: 15 }, { x: 34725, on: 17 }, { x: 35250, on: 17 },
      { x: 35095, on: 17 }, { x: 32850, on: 16 }, { x: 32300, on: 44 }, { x: 33550, on: 45 }, { x: 35100, on: 46 }, { x: 36050, on: 48 },
    ],
    logs: [
      { x: 2650, on: 1 }, { x: 6200, on: 23 }, { x: 8650, on: 4 }, { x: 12200, on: 28 },
      { x: 14650, on: 7 }, { x: 18200, on: 33 }, { x: 20650, on: 10 }, { x: 24200, on: 38 },
      { x: 26650, on: 13 }, { x: 30200, on: 43 }, { x: 32550, on: 16 }, { x: 36200, on: 48 },
    ],
    coins: [],
    door: { x: 37000, on: 18 },
  },
};

export const bonusRoomFor = (levelId) => BONUS_ROOMS[levelId] || null;
