// The explorers a player can be, and the parts of a look they will be able
// to change (the character selector on the map, scenes/CharacterMenu.js).
//
// Each character is one set of animation strips with a manifest in the
// same layout as the explorer's (assets/player/explorer.json: frame size,
// then idle, walk, jump and crouch strips). Their textures are keyed
// `<id>-<anim>`, so the explorer keeps her `explorer-idle` and so on.
//
// Stand-ins (`standin: true`) are TEMPORARY art from a free side-view pack
// (tools/make_standin_characters.py), shown with a note saying so. They are
// removed before the game ships, when Chris draws the cast.

// The rig explorers (`rig: true` in the manifest, the user, 2026-10-29: "Put
// the boy and girl animations in the actual game"): a strip for every move
// (idle, walk, run, jump, crouch, climb with its background layer, swim,
// tread), each with its own frame rate and, where it differs, frame width.
export const CHARACTERS = [
  { id: 'girl', name: 'Girl', manifest: 'assets/player/explorer_walk_v2/girl.json', base: 'assets/player/explorer_walk_v2/' },
  { id: 'boy', name: 'Boy', manifest: 'assets/player/explorer_walk_v2/boy.json', base: 'assets/player/explorer_walk_v2/' },
  { id: 'explorer', name: 'Explorer', manifest: 'assets/player/explorer.json', base: 'assets/player/' },
  { id: 'standin_1', name: 'Stand-in 1', manifest: 'assets/player/standin_1/explorer.json', base: 'assets/player/standin_1/', standin: true },
  { id: 'standin_2', name: 'Stand-in 2', manifest: 'assets/player/standin_2/explorer.json', base: 'assets/player/standin_2/', standin: true },
  { id: 'standin_3', name: 'Stand-in 3', manifest: 'assets/player/standin_3/explorer.json', base: 'assets/player/standin_3/', standin: true },
];

export const DEFAULT_CHARACTER = 'girl';

export function characterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

// The parts of a look, in the order the selector shows them. Only the
// character itself can be chosen so far; the rest are ready for Chris's
// layered frames (body, hair and hat apart) and for gift-box items.
export const LOOK_SLOTS = [
  { id: 'character', name: 'Explorer', ready: true },
  { id: 'companion', name: 'Companion', ready: true },
  { id: 'hair', name: 'Hair', ready: false },
  { id: 'hat', name: 'Hat', ready: false },
  { id: 'outfit', name: 'Outfit', ready: false },
  { id: 'shoes', name: 'Shoes', ready: false },
];

export const STANDIN_NOTE = 'These three explorers are temporary stand-ins while our artist draws the real cast. '
  + 'They will be replaced before the game is finished.';
