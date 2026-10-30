// The explorers a player can be, and the parts of a look they will be able
// to change (the character selector on the map, scenes/CharacterMenu.js).
//
// Each character is one set of animation strips with a manifest in the
// same layout (frame size, then idle, walk, jump and crouch strips; the rig
// explorers have more). Their textures are keyed `<id>-<anim>`, e.g.
// `girl-idle`. The first explorer was replaced by the girl (the user,
// 2026-10-29); a save that still names her gets the girl.
//
// The three temporary stand-ins were removed (the user, 2026-10-30: the cast
// is the boy and the girl); a save that names one gets the girl.

// The rig explorers (`rig: true` in the manifest, the user, 2026-10-29: "Put
// the boy and girl animations in the actual game"): a strip for every move
// (idle, walk, run, jump, crouch, climb with its background layer, swim,
// tread), each with its own frame rate and, where it differs, frame width.
export const CHARACTERS = [
  { id: 'girl', name: 'Girl', manifest: 'assets/player/explorer_walk_v2/girl.json', base: 'assets/player/explorer_walk_v2/' },
  { id: 'boy', name: 'Boy', manifest: 'assets/player/explorer_walk_v2/boy.json', base: 'assets/player/explorer_walk_v2/' },
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

