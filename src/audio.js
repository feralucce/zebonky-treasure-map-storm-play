// Music and sound effects.
//
// Levels play music (the map is quiet for now); it carries on from one level
// to the next and only restarts when a scene asks for a different track. Tracks load in the background the first
// time they're wanted, so they never hold up the game starting. Browsers keep
// sound locked until the first tap or key press; anything asked for before
// then starts as soon as it unlocks.
//
// Two buttons: music on/off (musicButton) and sound effects on/off
// (soundButton). The choices are kept in this browser, apart from the saved
// game, so resetting progress doesn't change them.

const MUSIC_KEY = 'zebonky-tms-music-v1';
const SFX_KEY = 'zebonky-tms-sfx-v1';
const OLD_KEY = 'zebonky-tms-sound-v1'; // the earlier single switch

// Music, by name. Free Fall by TAD (opengameart.org, CC0).
export const MUSIC = {
  main: 'assets/audio/music/free-fall.mp3',
};
const MUSIC_VOLUME = 0.25;
const FADE_MS = 1200;

// Sound effects, by name: { url, volume }. Each comes as OGG with an MP3
// copy; the browser takes the first it can play. All CC0: footsteps (carpet),
// jump and toss (cloth), paw (zap up), hint and right answer from Kenney's
// packs. From OpenGameArt: splash by rubberduck, swimming by jcpmcdonald, food pickup
// twinkle by Bobjt, eating crunch by StarNinjas, secret door and level end
// chimes by JaggedStone, crate opening by Oiboo.
const fx = (name, volume) => ({ url: [`assets/audio/sfx/${name}.ogg`, `assets/audio/sfx/${name}.mp3`], volume });
export const SFX = {
  'step-0': fx('step-0', 0.16),
  'step-1': fx('step-1', 0.16),
  'step-2': fx('step-2', 0.16),
  'step-3': fx('step-3', 0.16),
  'step-4': fx('step-4', 0.16),
  jump: fx('jump', 0.2),
  toss: fx('toss', 0.6),
  splash: fx('splash', 0.7),
  swim: fx('swim', 0.22), // a paddling loop, about as loud as the steps
  food: fx('pickup', 0.6),
  eat: fx('eat', 0.7),
  energy: fx('energy', 0.55),
  door: fx('door', 0.6),
  'level-end': fx('level-end', 0.6),
  crate: fx('crate', 0.35),
  hint: fx('hint', 0.15), // loud files: kept soft
  correct: fx('correct', 0.18),
};

function readPref(key) {
  try {
    const v = localStorage.getItem(key) ?? localStorage.getItem(OLD_KEY);
    return v !== 'off';
  } catch (e) {
    return true; // Storage blocked: on for this visit.
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(key, value ? 'on' : 'off');
  } catch (e) {
    // Not saved; still applies for this visit.
  }
}

let musicOn = readPref(MUSIC_KEY);
let sfxOn = readPref(SFX_KEY);

let current = null; // { key, sound }
const loops = {};   // looping sound effects playing now, by name

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
  get musicOn() {
    return musicOn;
  },

  get sfxOn() {
    return sfxOn;
  },

  // Nothing to set up any more; kept so main.js can call it.
  init() {},

  toggleMusic() {
    musicOn = !musicOn;
    savePref(MUSIC_KEY, musicOn);
    if (current && current.sound) current.sound.setMute(!musicOn);
    return musicOn;
  },

  toggleSfx() {
    sfxOn = !sfxOn;
    savePref(SFX_KEY, sfxOn);
    if (!sfxOn) Object.values(loops).forEach((snd) => snd.isPlaying && snd.stop());
    return sfxOn;
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
        const sound = scene.sound.add(key, { loop: true, volume: 0, mute: !musicOn });
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
    if (!sfxOn) return;
    if (scene.cache.audio.exists(key)) {
      scene.sound.play(key, { volume: s.volume ?? 1, ...config });
    } else {
      // First time: load it now for next time (and play it if it's quick).
      ensure(scene, key, s.url, () => {});
    }
  },

  // A sound effect that loops for as long as it's wanted (swimming): call
  // every frame with on true or false; it starts and stops as that changes.
  loop(scene, name, on) {
    const s = SFX[name];
    if (!s) return;
    let snd = loops[name];
    if (on && sfxOn) {
      if (snd && snd.isPlaying) return;
      const key = cacheKey('sfx', name);
      if (!scene.cache.audio.exists(key)) return ensure(scene, key, s.url, () => {});
      if (!snd || !snd.manager) snd = loops[name] = scene.sound.add(key, { loop: true, volume: s.volume ?? 1 });
      snd.play();
    } else if (snd && snd.isPlaying) {
      snd.stop();
    }
  },

  // Load every sound effect in the background so the first use plays.
  preloadSfx(scene) {
    Object.entries(SFX).forEach(([name, s]) => ensure(scene, cacheKey('sfx', name), s.url, () => {}));
  },
};

const INK = 0x2b1d12;
const OFF = 0x8a6a4a;

// A round parchment button, fixed to the screen. drawIcon(g, on) draws the
// picture; a soft cross marks it off.
function roundToggle(scene, x, y, depth, isOn, toggle, drawIcon) {
  const c = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);
  const g = scene.add.graphics();
  c.add(g);
  const draw = () => {
    const on = isOn();
    g.clear();
    g.fillStyle(INK, 1);
    g.fillCircle(0, 3, 24);
    g.fillStyle(0xf3dfb3, 1);
    g.fillCircle(0, 0, 24);
    g.lineStyle(3, INK, 1);
    g.strokeCircle(0, 0, 24);
    drawIcon(g, on);
    if (!on) {
      g.lineStyle(3, OFF, 1);
      g.lineBetween(8, -7, 16, 3);
      g.lineBetween(16, -7, 8, 3);
    }
  };
  draw();
  c.setSize(52, 52);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerup', () => {
    toggle();
    draw();
  });
  return c;
}

// Music on and off: a pair of notes.
export function musicButton(scene, x, y, depth = 21) {
  return roundToggle(scene, x, y, depth, () => musicOn, () => audio.toggleMusic(), (g, on) => {
    const col = on ? INK : OFF;
    g.fillStyle(col, 1);
    g.fillEllipse(-9, 8, 9, 7);
    g.fillEllipse(3, 5, 9, 7);
    g.fillRect(-6, -10, 3, 18);
    g.fillRect(6, -13, 3, 18);
    g.fillRect(-6, -13, 15, 4);
  });
}

// Sound effects on and off: a speaker.
export function soundButton(scene, x, y, depth = 21) {
  return roundToggle(scene, x, y, depth, () => sfxOn, () => audio.toggleSfx(), (g, on) => {
    const col = on ? INK : OFF;
    g.fillStyle(col, 1);
    g.fillRect(-13, -5, 6, 10);
    g.fillTriangle(-8, 0, 1, -11, 1, 11);
    g.fillRect(-8, -5, 9, 10);
    if (on) {
      g.lineStyle(3, INK, 1);
      g.beginPath();
      g.arc(3, 0, 6, -0.9, 0.9);
      g.strokePath();
      g.beginPath();
      g.arc(3, 0, 11, -0.9, 0.9);
      g.strokePath();
    }
  });
}
