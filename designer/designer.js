import { TILE_PX, TERRAIN, MARKERS, DOOR, WAIT, CRATES } from './legend.js';
import { readDrawing } from './read-drawing.js';
import { ARTSETS } from '../src/data/artsets.js';
import { LEVELS } from '../src/data/world.js';
import { TEST_LAYOUT_KEY } from '../src/data/levels.js';

const $ = (id) => document.getElementById(id);
const PREVIEW_SCALE = 0.4;   // 64 px tile -> about 26 px on screen

let result = null;      // what readDrawing returned
let drawingImg = null;  // the drawing itself, for the "Your drawing" view
let view = 'read';

// ---------- set up the pickers ----------

ARTSETS.forEach((name) => $('artset').add(new Option(name, name)));
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
  ['play', 'save', 'download'].forEach((id) => { $(id).disabled = false; });
  showWarnings(result.warnings);
  $('out').textContent = JSON.stringify(layout(), null, 1);
  draw();
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

function play() {
  try {
    localStorage.setItem(TEST_LAYOUT_KEY, JSON.stringify(layout()));
  } catch (e) {
    showWarnings(['This browser blocked storage, so the test level could not be handed to the game.']);
    return;
  }
  $('game').src = `../index.html?test=1&level=${$('level').value}&t=${Date.now()}`;
  $('playbox').classList.add('open');
  $('game').focus();
}

function closePlay() {
  $('playbox').classList.remove('open');
  $('game').src = 'about:blank';
}

async function save() {
  const id = $('level').value;
  const name = LEVELS[id].name;
  try {
    const res = await fetch(`/api/levels/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout()),
    });
    if (!res.ok) throw new Error(res.status);
    const { saved } = await res.json();
    $('status').textContent = `Saved as ${name}: ${saved}. Play it from the map.`;
  } catch (e) {
    // Not running on the local dev server (node server.js): download instead.
    download();
    $('status').textContent = `Can't save from here, so it downloaded instead. Put ${id}.json in assets/levels/.`;
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
$('artset').addEventListener('change', () => { if (result) $('out').textContent = JSON.stringify(layout(), null, 1); });
$('play').addEventListener('click', play);
$('save').addEventListener('click', save);
$('download').addEventListener('click', download);
$('close').addEventListener('click', closePlay);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('playbox').classList.contains('open') && document.activeElement !== $('game')) closePlay(); });

// For quick checks: designer/?open=<path to an svg on this server>
const q = new URLSearchParams(location.search).get('open');
if (q) fetch(q).then((r) => r.blob()).then((b) => open(new File([b], q.split('/').pop())));
