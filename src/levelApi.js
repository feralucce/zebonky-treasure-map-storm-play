// The contract between a level and the rest of the game.
//
// A side-scrolling level (scenes/Platformer.js) is a Phaser scene that receives { levelId }
// in init(). It uses two calls:
//
//   startQuiz(scene, levelId, itemIndex, onDone)
//     Call when the player touches quiz item number `itemIndex` (0, 1 or 2).
//     The level pauses and the quiz card opens. Wrong answers show a hint and
//     the child tries again, so onDone(true) comes once they find the right
//     one, with the treasure already saved.
//
//   finishLevel(scene, levelId, exit)
//     Call when the player reaches an exit: 'normal' for the goal,
//     'secret' for a hidden exit. Saves progress and returns to the map,
//     where any newly opened paths draw themselves in.
//
//   leaveLevel(scene, levelId)
//     Back to the map without clearing the level.
//
// Use state.hasTreasure(levelId, itemId) when the level loads to skip
// spawning items the player already owns.

import { state } from './state.js?v=d6b4b18';

export function startQuiz(scene, levelId, itemIndex, onDone) {
  scene.scene.pause();
  scene.scene.launch('Quiz', {
    levelId,
    itemIndex,
    parentKey: scene.scene.key,
    onDone: (correct) => {
      scene.scene.resume();
      onDone && onDone(correct);
    },
  });
}

export function finishLevel(scene, levelId, exit) {
  state.completeLevel(levelId, exit);
  backToMap(scene, levelId);
}

export function leaveLevel(scene, levelId) {
  backToMap(scene, levelId);
}

function backToMap(scene, levelId) {
  state.data.at = levelId;
  state.save();
  scene.cameras.main.fadeOut(300, 43, 29, 18);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start('Overworld'));
}
