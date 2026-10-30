import { TILE_PX, TERRAIN, MARKERS, DOOR, WAIT, CRATES } from './legend.js?v=c6ce4c1';
import { readDrawing } from './read-drawing.js?v=c6ce4c1';
import { ARTSETS, BLOCKS } from '../src/data/artsets.js?v=c6ce4c1';
import { LEVELS } from '../src/data/world.js?v=c6ce4c1';
import { TEST_LAYOUT_KEY } from '../src/data/levels.js?v=c6ce4c1';
import { backgroundGuide, tileSheet, svgToImage } from './guides.js?v=c6ce4c1';
import { readArtistFiles } from './artist.js?v=c6ce4c1';

const $ = (id) => document.getElementById(id);
const PREVIEW_SCALE = 0.4;   // 64 px tile -> about 26 px on screen

let result = null;      // what readDrawing returned
let drawingImg = null;  // the drawing itself, for the "Your drawing" view
let view = 'read';
let levelName = 'level';  // the drawing's file name, for the guides

// ---------- set up the pickers ----------

// Blocks first: a dropped drawing plays as plain coloured blocks, so the
// layout can be tested before any art is applied.
$('artset').add(new Option('Blocks (no dressing)', BLOCKS));
ARTSETS.forEach((name) => $('artset').add(new Option(name, name)));
$('artset').value = BLOCKS;
Object.entries(LEVELS).forEach(([id, l]) => {
  if (l.kind === 'level') $('level').add(new Option(`${l.name} (${id})`, id));
});

$('key').innerHTML = [
  ...TERRAIN.map((t) => `<span><i style="background:${t.hex}"></i>${t.label}</span>`),
  ...MARKERS.map((m) => `<span><i style="background:${m.hex};border-radius:50%"></i>${m.label}</span>`),
  `<span><i style="background:${WAIT.hex};border-radius:50%"></i>${WAIT.label}</span>`,
  `<span><i style="background:${DOOR.hex}"></i>${DOOR.label}</span>`,
].join('');

// ---------- open a drawing ----------

async function open(file) {
  const text = await file.text();
  $('status').textContent = 'Reading the drawing...';
  try {
    result = await readDrawing(text);
  } catch (e) {
    result = null;
    $('status').textContent = '';
    showWarnings([e.message]);
    return;
  }
  // Keep a picture of the drawing (guides hidden) for the comparison view.
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  drawingImg = new Image();
  drawingImg.onload = () => { draw(); URL.revokeObjectURL(url); };
  drawingImg.src = url;

  $('status').textContent = `${file.name}: ${result.cols} x ${result.rowsCount} tiles`;
  ['play', 'save', 'savedemo', 'download'].forEach((id) => { $(id).disabled = false; });
  showWarnings(result.warnings);
  $('out').textContent = JSON.stringify(layout(), null, 1);
  draw();
  levelName = file.name.replace(/\.svg$/i, '');
  forgetArtist();          // the artist's art belongs to the level it was painted for
  startDemo();
  showGuides();
}

function layout() {
  const out = { rows: result.rows, artset: $('artset').value };
  if (result.waits.length) out.waits = result.waits;
  return out;
}

function showWarnings(list) {
  $('warnings').innerHTML = list.length
    ? list.map((w) => `<li>${w}</li>`).join('')
    : `<li class="ok">Looks good: start, exit and ${CRATES} mystery crates found.</li>`;
}

// ---------- preview ----------

const COLOR = Object.fromEntries([...TERRAIN, ...MARKERS].map((t) => [t.char, t.hex]));

function draw() {
  if (!result) return;
  const s = TILE_PX * PREVIEW_SCALE;
  const cv = $('preview');
  cv.width = Math.ceil(result.cols * s);
  cv.height = Math.ceil(result.rowsCount * s);
  const g = cv.getContext('2d');
  g.fillStyle = '#fffaf0';
  g.fillRect(0, 0, cv.width, cv.height);

  if ((view === 'drawing' || view === 'both') && drawingImg && drawingImg.complete) {
    g.globalAlpha = view === 'both' ? 0.35 : 1;
    g.drawImage(drawingImg, 0, 0, cv.width, cv.height);
    g.globalAlpha = 1;
  }
  if (view === 'read' || view === 'both') {
    g.globalAlpha = view === 'both' ? 0.75 : 1;
    result.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const x = c * s;
        const y = r * s;
        if (ch === '=') {
          g.fillStyle = COLOR['='];
          g.fillRect(x, y, s, s * 0.35);
        } else if (ch >= '1' && ch <= '9') {
          g.fillStyle = DOOR.hex;
          g.fillRect(x + s * 0.15, y - s, s * 0.7, s * 2);
          g.fillStyle = '#fff';
          g.font = `800 ${Math.round(s * 0.8)}px Nunito, sans-serif`;
          g.textAlign = 'center';
          g.fillText(ch, x + s / 2, y + s * 0.2);
        } else if ('<>^[]'.includes(ch)) {
          g.fillStyle = COLOR[ch];
          g.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76);
          g.fillStyle = '#2b1d12';
          g.font = `800 ${Math.round(s * 0.6)}px Nunito, sans-serif`;
          g.textAlign = 'center';
          g.fillText({ '<': '\u2190', '>': '\u2192', '^': '\u2191', '[': '\u2196', ']': '\u2197' }[ch], x + s / 2, y + s * 0.72);
        } else if ('PTGSfZEB'.includes(ch)) {
          g.fillStyle = COLOR[ch];
          g.beginPath();
          g.arc(x + s / 2, y + s / 2, s * (ch === 'B' ? 0.5 : 0.42), 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'fZ'.includes(ch) ? '#2b1d12' : '#fff';
          g.font = `800 ${Math.round(s * 0.55)}px Nunito, sans-serif`;
          g.textAlign = 'center';
          g.fillText({ P: 'P', T: '?', G: 'G', S: 'S', f: 'f', Z: '⚡', E: 'E', B: 'B' }[ch], x + s / 2, y + s * 0.7);
        } else if (COLOR[ch]) {
          g.fillStyle = COLOR[ch];
          g.fillRect(x, y, s, s);
        }
      });
    });
    // The guide's route: waiting points joined in order.
    const guide = [];
    result.rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'B') guide.push({ c, r }); }));
    const route = [...guide.slice(-1), ...result.waits];
    g.strokeStyle = WAIT.hex;
    g.lineWidth = 2;
    g.setLineDash([6, 5]);
    g.beginPath();
    route.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.c * s + s / 2, p.r * s + s / 2));
    g.stroke();
    g.setLineDash([]);
    result.waits.forEach((p, i) => {
      g.fillStyle = WAIT.hex;
      g.beginPath();
      g.arc(p.c * s + s / 2, p.r * s + s / 2, s * 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `800 ${Math.round(s * 0.5)}px Nunito, sans-serif`;
      g.textAlign = 'center';
      g.fillText(String(i + 1), p.c * s + s / 2, p.r * s + s * 0.68);
    });
    g.globalAlpha = 1;
  }
  // tile grid
  g.strokeStyle = 'rgba(43,29,18,0.12)';
  g.lineWidth = 1;
  for (let c = 0; c <= result.cols; c++) { g.beginPath(); g.moveTo(c * s + 0.5, 0); g.lineTo(c * s + 0.5, cv.height); g.stroke(); }
  for (let r = 0; r <= result.rowsCount; r++) { g.beginPath(); g.moveTo(0, r * s + 0.5); g.lineTo(cv.width, r * s + 0.5); g.stroke(); }
}

// ---------- hand it to the game ----------

// The game reads the test layout from storage when it starts.
function handOff() {
  try {
    localStorage.setItem(TEST_LAYOUT_KEY, JSON.stringify(layout()));
    return true;
  } catch (e) {
    showWarnings(['This browser blocked storage, so the test level could not be handed to the game.']);
    return false;
  }
}
const gameUrl = () => `../index.html?test=1&level=${$('level').value}&t=${Date.now()}`;

// Dropping a drawing starts it straight away, on the page.
function startDemo() {
  if (!result || !handOff()) return;
  $('demo').hidden = false;
  $('inline').src = gameUrl();
  $('inline').onload = () => $('inline').focus();
}

function play() {
  if (!handOff()) return;
  $('inline').src = 'about:blank';   // one game at a time
  $('game').src = gameUrl();
  $('playbox').classList.add('open');
  $('game').focus();
}

function closePlay() {
  $('playbox').classList.remove('open');
  $('game').src = 'about:blank';
  startDemo();
}

// ---------- guides for the artist ----------

const thumbs = {};
function showThumb(id, svg) {
  if (thumbs[id]) URL.revokeObjectURL(thumbs[id]);
  thumbs[id] = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  $(id).src = thumbs[id];
}

function showGuides() {
  if (!result) return;
  $('guides').hidden = false;
  const bg = backgroundGuide(result.rows, $('bgmode').value, levelName);
  showThumb('bgthumb', bg.svg);
  $('bgcap').textContent = `${$('bgmode').selectedOptions[0].text}: ${bg.w} x ${bg.h} px`;
  const sheet = tileSheet(result.rows, levelName);
  showThumb('sheetthumb', sheet.svg);
  $('sheetcap').textContent = `Tile and dressing sheet: ${sheet.w} x ${sheet.h} px`;
}

async function saveGuide(guide, base) {
  const type = $('gfmt').value;
  $('gstatus').textContent = 'Making the file...';
  try {
    const blob = await svgToImage(guide.svg, guide.w, guide.h, type);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.${type}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    $('gstatus').textContent = `Saved ${a.download} (${guide.w} x ${guide.h} px).`;
  } catch (e) {
    $('gstatus').textContent = e.message;
  }
}

// The artist's art (when it's shown in test play) goes up with the level:
// each picture to assets/levels/art/<id>/, and the layout says where.
async function uploadArt(id) {
  if (!artistReady || !$('useart').checked) return null;
  const put = async (name, url) => {
    const blob = await fetch(url).then((r) => r.blob());
    const res = await fetch(`/api/levels/${id}/art/${name}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob });
    if (!res.ok) throw new Error(res.status);
    return name;
  };
  const art = { dir: `assets/levels/art/${id}/` };
  if (artistReady.background) {
    const b = artistReady.background;
    art.background = { w: b.w, pieces: [] };
    for (const [i, p] of b.pieces.entries()) art.background.pieces.push({ file: await put(`background-${i}.png`, p.url), x: p.x });
  }
  art.dressing = [];
  for (const [i, d] of artistReady.dressing.entries()) {
    art.dressing.push({ file: await put(`dressing-${i}.png`, d.url), x: d.x });
  }
  return art;
}

async function saveAs(id, extra) {
  const out = { ...layout(), ...extra };
  const art = await uploadArt(id);
  if (art) out.art = art;
  const res = await fetch(`/api/levels/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(out),
  });
  if (!res.ok) throw new Error(res.status);
  const { saved } = await res.json();
  return { saved, art: !!art };
}

async function save() {
  const id = $('level').value;
  const name = LEVELS[id].name;
  $('status').textContent = 'Saving...';
  try {
    const { saved, art } = await saveAs(id);
    $('status').textContent = `Saved as ${name}: ${saved}${art ? ", with the artist's art" : ''}. Play it from the map.`;
  } catch (e) {
    // Not running on the local dev server (node server.js): download instead.
    download();
    $('status').textContent = `Can't save from here, so it downloaded instead (without the artist's art). Put ${id}.json in assets/levels/.`;
  }
}

// A demo: the drawing saved under its own name, not on the map. It borrows
// the picked level's name and questions, and plays at index.html?demo=<name>.
async function saveDemo() {
  const id = levelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'demo';
  $('status').textContent = 'Saving...';
  try {
    const { saved, art } = await saveAs(id, { level: $('level').value });
    $('status').innerHTML = `Saved demo ${saved}${art ? ", with the artist's art" : ''}. <a href="../index.html?demo=${id}" target="_blank">Play it</a>`;
  } catch (e) {
    $('status').textContent = "Demos can only be saved from the local dev server (node server.js).";
  }
}

function download() {
  const id = $('level').value;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(layout(), null, 1) + '\n'], { type: 'application/json' }));
  a.download = `${id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- the artist's files ----------

let artist = {};           // { background, dressing } as read by artist.js
let artistReady = null;    // the same, as picture URLs for the game

const blobUrl = (cv) => new Promise((resolve, reject) => {
  cv.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('Could not keep the picture.'))), 'image/png');
});

function forgetUrls(ready) {
  [...((ready.background && ready.background.pieces) || []), ...(ready.dressing || [])].forEach((p) => URL.revokeObjectURL(p.url));
}

function forgetArtist() {
  if (artistReady) forgetUrls(artistReady);
  artist = {};
  artistReady = null;
  window.tmsArtistArt = null;
  $('useart').checked = false;
  $('useart').disabled = true;
  $('artnotes').innerHTML = '';
  $('artthumbs').hidden = true;
}

// The game (in the test-play frame) reads window.tmsArtistArt when it starts.
function publishArtist() {
  window.tmsArtistArt = $('useart').checked ? artistReady : null;
}

async function openArtist(files) {
  if (!result) {
    $('artstatus').textContent = 'Drop the level drawing first: the dressing is matched to its guide.';
    return;
  }
  $('artstatus').textContent = "Reading the artist's files (big pictures take a few seconds)...";
  try {
    const got = await readArtistFiles([...files], result.rows, levelName);
    if (got.background) artist.background = got.background;
    if (got.dressing) artist.dressing = got.dressing;
    const old = artistReady;
    const bg = artist.background;
    const asUrls = (pieces) => Promise.all(pieces.map(async (p) => ({ url: await blobUrl(p.canvas), x: p.x, w: p.canvas.width, h: p.canvas.height })));
    artistReady = {
      background: bg ? { pieces: await asUrls(bg.pieces), w: bg.w, h: bg.h } : null,
      dressing: artist.dressing ? await asUrls(artist.dressing.pieces) : [],
    };
    if (old) forgetUrls(old);
    $('artnotes').innerHTML = [artist.background, artist.dressing].filter(Boolean).map((x) => `<li>${x.note}</li>`).join('');
    showArtistThumbs();
    $('useart').disabled = false;
    $('useart').checked = true;
    // The artist's art goes with the pixel ground, not the plain blocks.
    if ($('artset').value === BLOCKS && ARTSETS.includes('rainforest_floor')) $('artset').value = 'rainforest_floor';
    $('artstatus').textContent = '';
    publishArtist();
    startDemo();
  } catch (e) {
    $('artstatus').textContent = e.message;
  }
}

// Small previews: the background repeated twice, the dressing laid out
// along the level.
function showArtistThumbs() {
  $('artthumbs').hidden = false;
  const bg = artist.background;
  if (bg) {
    const s = 0.15;
    const cv = Object.assign(document.createElement('canvas'), { width: Math.round(bg.w * s), height: Math.round(bg.h * s) });
    const g = cv.getContext('2d');
    bg.pieces.forEach((p) => g.drawImage(p.canvas, p.x * s, 0, p.canvas.width * s, bg.h * s));
    $('artbg').src = cv.toDataURL('image/jpeg', 0.85);
  }
  const d = artist.dressing;
  if (d) {
    const s = 0.15;
    const total = d.pieces.reduce((w, p) => Math.max(w, p.x + p.canvas.width), 0);
    const h = d.pieces[0].canvas.height;
    const cv = Object.assign(document.createElement('canvas'), { width: Math.round(total * s), height: Math.round(h * s) });
    const g = cv.getContext('2d');
    d.pieces.forEach((p) => g.drawImage(p.canvas, p.x * s, 0, p.canvas.width * s, h * s));
    $('artdress').src = cv.toDataURL('image/png');
  }
}

// ---------- wiring ----------

const drop = $('drop');
$('file').addEventListener('change', (e) => e.target.files[0] && open(e.target.files[0]));
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  if (e.dataTransfer.files[0]) open(e.dataTransfer.files[0]);
});
$('views').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  view = b.dataset.view;
  document.querySelectorAll('#views button').forEach((x) => x.classList.toggle('on', x === b));
  draw();
});
$('artset').addEventListener('change', () => { if (result) { $('out').textContent = JSON.stringify(layout(), null, 1); startDemo(); } });
$('level').addEventListener('change', startDemo);
$('restart').addEventListener('click', startDemo);
const artDrop = $('artdrop');
$('artfiles').addEventListener('change', (e) => e.target.files.length && openArtist(e.target.files));
artDrop.addEventListener('dragover', (e) => { e.preventDefault(); artDrop.classList.add('over'); });
artDrop.addEventListener('dragleave', () => artDrop.classList.remove('over'));
artDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  artDrop.classList.remove('over');
  if (e.dataTransfer.files.length) openArtist(e.dataTransfer.files);
});
$('useart').addEventListener('change', () => { publishArtist(); startDemo(); });
$('bgmode').addEventListener('change', showGuides);
$('bgsave').addEventListener('click', () => {
  const mode = $('bgmode').value;
  saveGuide(backgroundGuide(result.rows, mode, levelName), `${levelName}-background-${{ whole: 'whole', tile: 'tiling', mirror: 'reverse-tiling', foreground: 'foreground' }[mode]}`);
});
$('sheetsave').addEventListener('click', () => saveGuide(tileSheet(result.rows, levelName), `${levelName}-tile-sheet`));
$('play').addEventListener('click', play);
$('save').addEventListener('click', save);
$('savedemo').addEventListener('click', saveDemo);
$('download').addEventListener('click', download);
$('close').addEventListener('click', closePlay);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('playbox').classList.contains('open') && document.activeElement !== $('game')) closePlay(); });

// For quick checks: designer/?open=<path to an svg on this server>
const q = new URLSearchParams(location.search).get('open');
if (q) fetch(q).then((r) => r.blob()).then((b) => open(new File([b], q.split('/').pop())));
