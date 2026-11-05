import { MAP_W, MAP_H } from './data/world.js?v=236af4d';
import { state } from './state.js?v=236af4d';
import { audio } from './audio.js?v=236af4d';
import { BootScene } from './scenes/Boot.js?v=236af4d';
import { OverworldScene } from './scenes/Overworld.js?v=236af4d';
import { PlatformerScene } from './scenes/Platformer.js?v=236af4d';
import { QuizScene } from './scenes/Quiz.js?v=236af4d';
import { BonusScene } from './scenes/Bonus.js?v=236af4d';
import { BonusRoomScene } from './scenes/BonusRoom.js?v=236af4d';
import { SaveMenuScene } from './scenes/SaveMenu.js?v=236af4d';
import { CharacterMenuScene } from './scenes/CharacterMenu.js?v=236af4d';
import { LevelEndScene } from './scenes/LevelEnd.js?v=236af4d';
import { takeLinkSave } from './savecode.js?v=236af4d';

state.load();
// Opened from a save link: the map asks before loading it.
state.pendingLoad = takeLinkSave();

async function start() {
  // Make sure the brand fonts are ready before Phaser draws any text.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 24px Nunito'),
        document.fonts.load('800 24px Poppins'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (e) {
    // Fall back to system fonts.
  }

  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: MAP_W,
    height: MAP_H,
    backgroundColor: '#2b1d12',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 3 },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 1900 }, debug: false },
    },
    scene: [BootScene, OverworldScene, PlatformerScene, QuizScene, BonusScene, BonusRoomScene, SaveMenuScene, CharacterMenuScene, LevelEndScene],
  });
  audio.init(window.game);
}

start();
