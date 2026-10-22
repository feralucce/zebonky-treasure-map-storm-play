// Music and sound effects.
//
// Levels play music (the map is quiet for now); it carries on from one level
// to the next and only restarts when a scene asks for a different track. Tracks load in the background the first
// time they're wanted, so they never hold up the game starting. Browsers keep
// sound locked until the first tap or key press; anything asked for before
// then starts as soon as it unlocks.
//
// The speaker button (soundButton) turns all sound on or off. The choice is
// kept in this browser, apart from the saved game, so resetting progress
// doesn't change it.

const PREF_KEY = 'zebonky-tms-sound-v1';

// Music, by name. Free Fall by TAD (opengameart.org, CC0).
export const MUSIC = {
  main: 'assets/audio/music/free-fall.mp3',
};
const MUSIC_VOLUME = 0.25;
const FADE_MS = 1200;

// Sound effects, by name: { url, volume }. Each comes as OGG with an MP3
// copy; the browser takes the first it can play. All CC0: footsteps (carpet),
// jump (cloth) and paw (zap up) from Kenney's packs; splash by rubberduck and
// food crunch by StarNinjas, both on OpenGameArt.
const fx = (name, volume) => ({ url: [`assets/audio/sfx/${name}.ogg`, `assets/audio/sfx/${name}.mp3`], volume });
export const SFX = {
  'step-0': fx('step-0', 0.35),
  'step-1': fx('step-1', 0.35),
  'step-2': fx('step-2', 0.35),
  'step-3': fx('step-3', 0.35),
  'step-4': fx('step-4', 0.35),
  jump: fx('jump', 0.6),
  splash: fx('splash', 0.7),
  food: fx('food', 0.7),
  energy: fx('energy', 0.55),
};

let on = true;
try {
  on = localStorage.getItem(PREF_KEY) !== 'off';
} catch (e) {
  // Storage blocked: sound stays on for this visit.
}

let current = null; // { key, sound }

const cacheKey = (kind, name) => `${kind}:${name}`;

// Load one file through this scene's loader, then call done. Waits if the
// scene is already loading something else.
function ensure(scene, key, url, done) {
  if (scene.cache.audio.exists(key)) return done();
  const go = () => {
    // Skip if the scene has closed since (it may still be starting up).
    if (scene.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
    if (scene.cache.audio.exists(key)) return done();
    scene.load.audio(key, url);
    scene.load.once(`filecomplete-audio-${key}`, done);
    scene.load.start();
  };
  if (scene.load.isLoading()) scene.load.once('complete', go);
  else go();
}

// Raise or lower a sound's volume over time. A plain timer, so it carries on
// even if the scene that started it closes.
function fade(sound, to, ms, then) {
  const from = sound.volume;
  const t0 = performance.now();
  const id = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    if (!sound.manager) return clearInterval(id);
    sound.setVolume(from + (to - from) * k);
    if (k >= 1) {
      clearInterval(id);
      then && then();
    }
  }, 40);
}

export const audio = {
  get on() {
    return on;
  },

  // Call once the game exists, so the saved choice applies from the start.
  init(game) {
    game.sound.mute = !on;
  },

  toggle(game) {
    on = !on;
    game.sound.mute = !on;
    try {
      localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
    } catch (e) {
      // Not saved; still applies for this visit.
    }
    return on;
  },

  music(scene, name = 'main') {
    const url = MUSIC[name];
    if (!url) return;
    const key = cacheKey('music', name);
    if (current && current.key === key) return;
    const old = current;
    current = { key, sound: null };
    if (old && old.sound) fade(old.sound, 0, FADE_MS / 2, () => old.sound.destroy());
    ensure(scene, key, url, () => {
      if (!current || current.key !== key || current.sound) return;
      const start = () => {
        if (!current || current.key !== key || current.sound) return;
        const sound = scene.sound.add(key, { loop: true, volume: 0 });
        current.sound = sound;
        sound.play();
        fade(sound, MUSIC_VOLUME, FADE_MS);
      };
      if (scene.sound.locked) scene.sound.once('unlocked', start);
      else start();
    });
  },

  stopMusic() {
    const old = current;
    current = null;
    if (old && old.sound) fade(old.sound, 0, FADE_MS / 2, () => old.sound.destroy());
  },

  sfx(scene, name, config = {}) {
    const s = SFX[name];
    if (!s) return;
    const key = cacheKey('sfx', name);
    if (scene.cache.audio.exists(key)) {
      scene.sound.play(key, { volume: s.volume ?? 1, ...config });
    } else {
      // First time: load it now for next time (and play it if it's quick).
      ensure(scene, key, s.url, () => {});
    }
  },

  // Load every sound effect in the background so the first use plays.
  preloadSfx(scene) {
    Object.entries(SFX).forEach(([name, s]) => ensure(scene, cacheKey('sfx', name), s.url, () => {}));
  },
};

// A round speaker button that turns sound on and off. Fixed to the screen.
export function soundButton(scene, x, y, depth = 21) {
  const c = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);
  const g = scene.add.graphics();
  c.add(g);
  const draw = () => {
    g.clear();
    g.fillStyle(0x2b1d12, 1);
    g.fillCircle(0, 3, 24);
    g.fillStyle(0xf3dfb3, 1);
    g.fillCircle(0, 0, 24);
    g.lineStyle(3, 0x2b1d12, 1);
    g.strokeCircle(0, 0, 24);
    // Speaker.
    g.fillStyle(0x2b1d12, 1);
    g.fillRect(-12, -5, 6, 10);
    g.fillTriangle(-7, 0, 2, -11, 2, 11);
    g.fillRect(-7, -5, 9, 10);
    if (on) {
      g.lineStyle(3, 0x2b1d12, 1);
      g.beginPath();
      g.arc(4, 0, 6, -0.9, 0.9);
      g.strokePath();
      g.beginPath();
      g.arc(4, 0, 11, -0.9, 0.9);
      g.strokePath();
    } else {
      g.lineStyle(3, 0x8a6a4a, 1);
      g.lineBetween(7, -6, 15, 6);
      g.lineBetween(15, -6, 7, 6);
    }
  };
  draw();
  c.setSize(52, 52);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerup', () => {
    audio.toggle(scene.game);
    draw();
  });
  return c;
}
