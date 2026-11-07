'use strict';
/* Pixel art dessiné à la main : chaque sprite est donné pour sa moitié gauche
   (colonne centrale incluse, à droite de chaque ligne) puis mis en miroir. */

const PAL = {
  a: '#ffffff', b: '#c8f4ff', c: '#4ad6ff', d: '#2a7fd6', e: '#1a3f7a', f: '#0e1f44',
  r: '#ff4a4a', s: '#a81f3e', o: '#ff9d2e', u: '#b85a14', y: '#ffe14a', v: '#c9a11e',
  g: '#6cf06c', h: '#2a9d4a', j: '#14572c',
  p: '#d86cff', q: '#7a3ab0', w: '#3f1c6e',
  m: '#ff6cd0', l: '#b02a8c',
  n: '#a4a4c4', k: '#5c5c80', t: '#30304a',
};

const SHAPES = {
  ship: [
    '.......a',
    '.......a',
    '......cb',
    '......cb',
    '.....dcb',
    '.....dbr',
    '....ddbr',
    'r...ddcc',
    'a..dddcc',
    'c.ddcccb',
    'cddddddc',
    'dddeeedd',
    'de.ee.ed',
    'e.....oo',
    '......yo',
  ],
  gnat: [
    'm...',
    '.m.m',
    '..ll',
    '.lpa',
    'm.ll',
    '...l',
  ],
  scout: [
    '....r',
    '....r',
    '...rs',
    'r..ra',
    'r.rsa',
    'rrrss',
    's.rss',
    '...s.',
  ],
  weaver: [
    '.....p',
    'p...pq',
    'q..pqa',
    'qp.pqa',
    '.qppqq',
    '..qqpq',
    '...q.q',
    '.....q',
  ],
  shooter: [
    '...o..',
    '...o..',
    '..uoou',
    '.uooyy',
    'uooyay',
    'ouooyy',
    'o.uooo',
    'u..uuo',
    '....uu',
  ],
  kami: [
    '....y',
    '....y',
    '...ya',
    '...ya',
    '..yor',
    '..yor',
    '.yoor',
    'yo.or',
    'y..r.',
  ],
  tank: [
    '.....ttkk',
    '...ttkknn',
    '..tkknnnk',
    '.tkknkkkk',
    '.tknksssr',
    'tkknksrrr',
    'tknnksrar',
    'tknnksrrr',
    'tkknkssss',
    'tkknnkkkk',
    '.tkknnnnn',
    '.ttkkkkkk',
    '..t.ttktt',
    '....s.s.r',
    '.......s.',
  ],
  hive: [
    '......hhhh',
    '....hhgggg',
    '...hgghhhh',
    '..hgghjjjj',
    '.hgghjjppj',
    '.hghjjpaap',
    'hgghjppaaq',
    'hghjjpqqqq',
    'hghjjjjjjj',
    'hgghjjpjjp',
    '.hghjpaqjp',
    '.hgghjqqjj',
    '..hgghjjjh',
    '...hggghhg',
    '....hhgggg',
    '......hhhh',
  ],
  cargo: [
    '....kkkk',
    '...knnnn',
    '..knvvvv',
    '.knvyyyy',
    '.knvyaay',
    '.knvyyyy',
    'kknvyvvy',
    'nknvyvvy',
    'kknvyyyy',
    '.knvyyyy',
    '.knnvvvv',
    '..kkkkkk',
    '...o..o.',
  ],
  mine: [
    '..r',
    '.kk',
    'rkr',
  ],
  drone: [
    '...b',
    '..cc',
    '.dca',
    'd.cc',
    '...d',
  ],
  boss1: [
    '........ssrrrrr',
    '......sskkkkkkk',
    '.....skknnnnnnn',
    '....skknkkkkkkk',
    '...skknkttttttt',
    '..skknktsssssss',
    '..sknktssrrrrrr',
    '.sknktssrrooooo',
    '.sknktsrroyyyyy',
    'skknktsroyyaaaa',
    'sknnktsroyaaaaa',
    'sknnktsroyaattt',
    'sknnktsroyaattt',
    'sknnktsroyaaaaa',
    'skknktsroyyaaaa',
    '.sknktsrroyyyyy',
    '.sknktssrrooooo',
    '..sknktssrrrrrr',
    '..skknktsssssss',
    '...skknkttttttt',
    '....skknkkkkkkk',
    '.....skknnnnnnn',
    '......sskkkkkkk',
    '........ssrrrrr',
  ],
  boss2: [
    '.........hhhhhh',
    '.......hhggggjj',
    '.....hhgghhjjpp',
    '...hhgghhjjpqqq',
    'h.hgghjjjppqaaa',
    '.hgghjqqppqaaap',
    '.hghjqaaqqqapqq',
    'hgghjqaapjjqqjj',
    'hghjjjqqjjjjjjj',
    'hghjjjjjjppjjjp',
    'hghjpqjjpaaqjjq',
    'hghpaaqjpaaqjjq',
    'hghpaaqjjqqjjjj',
    'hghjqqjjjjjjpqj',
    'hgghjjjjppjpaaq',
    '.hghjjjpaaqpaaq',
    '.hgghjjpaaqjqqj',
    'h.hgghjjqqjjjjj',
    '...hhgghhjjjjjj',
    '.....hhgghhjjjj',
    '.......hhgggghh',
    '..g...g..hhhhhh',
    '.g...g......g..',
    'g...g......g...',
  ],
  boss3: [
    '...............',
    '.............nn',
    '............nkk',
    '..........nnkkk',
    '.........nkkttt',
    'r.......nkktooo',
    's......nkktoyyy',
    'k.....nkkktoyaa',
    'kk...nkkkktoyaa',
    'nk..nkkttttooyy',
    'nkknkkttsssttoo',
    'nnkkkttsrrrsstt',
    'knkkttsrrrrrrss',
    'kkkkttsrroorrrr',
    '.kkkktsrroayorr',
    '..kkkktsrrayorr',
    '...kkkktsrroorr',
    '....kkkktsrrrrr',
    '...k.kkkktsssss',
    '..kk..kkkkttttt',
    '.kk....kkkkkkkk',
    'kk......nkkknnk',
    'k........o.o.yo',
    '.........o...yy',
  ],
  boss4: [
    '.........wwwwww',
    '......wwwqqqqqq',
    '....wwqqqppppqq',
    '...wqqppppmmmpp',
    '..wqqppmmmmmmmm',
    '.wqqpmmmaaaaaaa',
    '.wqpmmaaaaaaaaa',
    'wqppmaaabbbbbcc',
    'wqpmaaabbccccdd',
    'wqpmaabbccdddee',
    'wqpmaabccddeeff',
    'wqpmaabccdeefff',
    'wqpmaabccdeefff',
    'wqpmaabccddeeff',
    'wqpmaabbccdddee',
    'wqpmaaabbccccdd',
    'wqppmaaabbbbbcc',
    '.wqpmmaaaaaaaaa',
    '.wqqpmmmaaaaaaa',
    '..wqqppmmmmmmmm',
    '...wqqppppmmmpp',
    'q...wwqqqppppqq',
    '.p....wwwqqqqqq',
    '..m......wwwwww',
  ],
};

const Sprites = {};

function buildSprite(rows, recolor) {
  const width = Math.max(...rows.map(r => r.length));
  const fullW = width * 2 - 1;
  const canvas = document.createElement('canvas');
  canvas.width = fullW;
  canvas.height = rows.length;
  const c = canvas.getContext('2d');
  rows.forEach((row, y) => {
    const r = row.padStart(width, '.');
    for (let x = 0; x < width; x++) {
      const ch = r[x];
      if (ch === '.') continue;
      c.fillStyle = recolor ? recolor(ch) : PAL[ch];
      c.fillRect(x, y, 1, 1);
      c.fillRect(fullW - 1 - x, y, 1, 1);
    }
  });
  return canvas;
}

/* Élites : l'ennemi garde sa forme, repeint en or. */
const ELITE_RAMP = { light: '#fff6b0', mid: '#ffd84a', dark: '#b8860b' };
function eliteColor(ch) {
  const hex = PAL[ch];
  const v = parseInt(hex.slice(1, 3), 16) * 0.3 + parseInt(hex.slice(3, 5), 16) * 0.59 + parseInt(hex.slice(5, 7), 16) * 0.11;
  return v > 170 ? ELITE_RAMP.light : v > 90 ? ELITE_RAMP.mid : ELITE_RAMP.dark;
}

function initSprites() {
  for (const name in SHAPES) {
    Sprites[name] = {
      n: buildSprite(SHAPES[name]),
      w: buildSprite(SHAPES[name], () => '#ffffff'),
      e: buildSprite(SHAPES[name], eliteColor),
    };
  }
  // Le second joueur : même vaisseau, en orange, pour se repérer d'un coup d'œil.
  const P2 = { b: '#ffe2a8', c: '#ff9d2e', d: '#d9701c', e: '#7a3a12', r: '#4ad6ff' };
  const recolorP2 = ch => P2[ch] || PAL[ch];
  Sprites.ship2 = {
    n: buildSprite(SHAPES.ship, recolorP2),
    w: Sprites.ship.w,
    e: buildSprite(SHAPES.ship, () => '#5c5c80'),
  };
  Sprites.ship.e = buildSprite(SHAPES.ship, () => '#5c5c80');
  initMiniFont();
}

/* ---------- Petite police 3×5 pour les chiffres en jeu ---------- */
const MINI_GLYPHS = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
  4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001111', ',': '000000000010100', K: '101110100110101',
  M: '101111111101101', G: '111100101101111', T: '111010010010010', P: '111101111100100',
  E: '111100110100111', Z: '111001010100111', Y: '101101010010010', e: '000111111100111',
  '+': '000010111010000', '-': '000000111000000', '!': '010010010000010', '×': '000101010101000',
};
const miniCache = {};
let miniCanvas = null;
const MINI_COLORS = ['#ffffff', '#ffe14a', '#ff5a4a', '#6cf06c', '#4ad6ff', '#ff9d2e'];
const MINI_CHARS = Object.keys(MINI_GLYPHS);

function initMiniFont() {
  miniCanvas = document.createElement('canvas');
  miniCanvas.width = MINI_CHARS.length * 4;
  miniCanvas.height = MINI_COLORS.length * 6;
  const c = miniCanvas.getContext('2d');
  MINI_COLORS.forEach((col, row) => {
    c.fillStyle = col;
    MINI_CHARS.forEach((ch, i) => {
      miniCache[ch] = i;
      const g = MINI_GLYPHS[ch];
      for (let p = 0; p < 15; p++) {
        if (g[p] === '1') c.fillRect(i * 4 + (p % 3), row * 6 + Math.floor(p / 3), 1, 1);
      }
    });
  });
}

function drawMini(ctx, text, x, y, colorIdx) {
  const s = String(text);
  let cx = Math.round(x - (s.length * 4 - 1) / 2);
  const cy = Math.round(y);
  for (let i = 0; i < s.length; i++) {
    const idx = miniCache[s[i]];
    if (idx !== undefined) ctx.drawImage(miniCanvas, idx * 4, colorIdx * 6, 3, 5, cx, cy, 3, 5);
    cx += 4;
  }
}

/* ---------- Icônes 8×8 de l'arbre ---------- */
const ICONS_RAW = {
  dmg: '...#..../#..#..#./.#.#.#../..###.../######../..###.../.#.#.#../#..#..#.',
  rate: '#..#..#./.#..#..#/..#..#../...#..#./..#..#../.#..#..#/#..#..#./........',
  crit: '...##.../..#..#../.#.##.#./#.####.#/#.####.#/.#.##.#./..#..#../...##...',
  speed: '...#..../..###.../.#####../#..#..#./...#..../..###.../.#####../#..#..#.',
  gun: '.#....#./.#....#./.#....#./###..###/###..###/###..###/.#....#./........',
  pierce: '#......./.#....../..#....#/###...##/...#####/###...##/..#....#/.#......',
  rear: '...##.../..####../.######./...##.../...##.../#..##..#/#..##..#/.######.',
  side: '#......#/##....##/.######./..####../..####../.######./##....##/#......#',
  bounce: '#......./.#....#./..#..#../...##.../....#.../...#..../..#...../.#......',
  exec: '..####../.#....#./#.#..#.#/#......#/#..##..#/.#....#./..#..#../..####..',
  elite: '#..##..#/#.####.#/########/########/.######./.#.##.#./........',
  glass: '...#..../..#.#.../.#...#../#..#..#./#.#..#.#/.#.#.#../..#.#.../...#....',
  cryo: '...##.../#..##..#/.#.##.#./..####../..####../.#.##.#./#..##..#/...##...',
  inf: '........./.##..##./#..##..#/#..##..#/#..##..#/.##..##./.........',
  missile: '...##.../..####../..####../..#..#../..####../..####../.#.##.#./#..##..#',
  cd: '..####../.#.#..#./#..#...#/#..###.#/#......#/#......#/.#....#./..####..',
  radius: '..####../.#....#./#..##..#/#.####.#/#.####.#/#..##..#/.#....#./..####..',
  cluster: '##....##/##.##.##/...##.../.##..##./.##..##./...##.../##.##.##/##....##',
  mine: '...##.../.#.##.#./..####../#######/#######/..####../.#.##.#./...##...',
  nuke: '..####../.######./##.##.##/#..##..#/...##.../..####../.######./########',
  arc: '....##../...##.../..##..../.#####../...##.../..##..../.##...../##......',
  chain: '##....../##.#..../...#..../...#.##./.##.##../....#.../..#.#.##/..#...##',
  nova: '#..##..#/.#....#./..#..#../#......#/#......#/..#..#../.#....#./#..##..#',
  beam: '........#/.......##/#######./########/########/#######./.......##/........#',
  stun: '#.#.#.#./.#.#.#.#/...##.../..##..../....##../...##.../.#.#.#.#/#.#.#.#.',
  knock: '#..#.../.#..#../..#..#./...#..#/...#..#/..#..#./.#..#../#..#...',
  drone: '#......#/.#....#./..####../.######./.##..##./.######./..####../.#....#.',
  range: '...##.../...##.../...##.../#..##..#/.#.##.#./..####../...##.../........',
  orbit: '..####../.#....#./#......#/#..##..#/#..##..#/#......##/.#....##/..####..',
  collect: '#......#/##....##/.##..##./..####../...##.../..####../.#.##.#./...##...',
  heal: '...##.../...##.../...##.../########/########/...##.../...##.../...##...',
  shield: '########/#......#/#..##..#/#.####.#/#..##..#/.#....#./..#..#../...##...',
  hull: '.######./#.#..#.#/#......#/#.####.#/#.####.#/#......#/#.#..#.#/.######.',
  regen: '...##.../..####../.#.##.#./...##.../#..##..#/.#.##.#./..####../...##...',
  armor: '########/##.##.##/########/##.##.##/########/.##.##../..####../...##...',
  thorns: '#..#..#./.#.#.#../..###.../####.###/..###.../.#.#.#../#..#..#./........',
  invuln: '.######./##....##/#..##..#/#.####.#/#.####.#/#..##..#/##....##/.######.',
  dodge: '##....../.##...../..##..##/...####./...####./..##..##/.##...../##......',
  repair: '.....##./....##../#..##.../###...../.####.../..####../...####./....###.',
  mirror: '#....#../.#..#.../..##..../...#..../...#.#../...#..#./...#...#/...#....',
  revive: '...##.../..####../.#.##.#./...##.../..####../.######./##.##.##/#..##..#',
  last: '#.#.#.#./.#.#.#.#/...##.../..####../.######./..####../..#..#../.##..##.',
  accel: '#...#.../.#...#../..#...#./...#...#/...#...#/..#...#./.#...#../#...#...',
  dash: '...#.#.#/..#.#.#./.######./#######./#######./.######./..#.#.#./...#.#.#',
  trail: '.....##./....####/....####/...#.##./..#...../.#.#..../#.#...../.#......',
  charge: '#.#.#.#./#.#.#.#./#.#.#.#./#.#.#.#./#.#.#.#./#.#.#.#./#.#.#.#./........',
  time: '########/.#....#./..#..#../...##.../...##.../..#..#../.#.##.#./########',
  magnet: '.##..##./.##..##./.##..##./.##..##./.##..##./.######./..####../........',
  gain: '..####../.#.##.#./#.####.#/#.##...#/#..##..#/#...##.#/.#.##.#./..####..',
  income: '...##.../...##.../.#.##.#./..####../...##.../#......#/#......#/########',
  combo: '#...#.../.#.#..../..#...../.#.#.##./#...#..#/.....##./....#.../....####',
  lucky: '.##..##./########/########/.######./..####../...##.../........',
  core: '...##.../..#..#../.#.##.#./#.####.#/#.####.#/.#.##.#./..#..#../...##...',
  offline: '..####../.#.#..#./#..#...#/#..#...#/#...#..#/#....#.#/.#....#./..####..',
  cargo: '.######./#......#/########/#..##..#/#..##..#/#......#/########/........',
  interest: '##....##/##...##./....##../...##.../..##..../.##...../##...##/#....##.',
  vacuum: '#.#..#.#/.#....#./#.#..#.#/...##.../...##.../#.#..#.#/.#....#./#.#..#.#',
  analyze: '..####../.#....#./#..#...#/#.###..#/#..#...#/.#....#./..#####./......##',
  slow: '.#.##.#./#..##..#/..#..#../........./........./..#..#../#..##..#/.#.##.#.',
  frenzy: '...#..../..##..../..###.#./.#####../.######./########/########/.######.',
  boss: '.######./#.#..#.#/#.#..#.#/########/###..###/.#.##.#./.######./.#.##.#.',
  threat: '...##.../...##.../..####../..#..#../.#.##.#./.#.##.#./#......#/########',
  portal: '..####../.##..##./##....##/#..##..#/#..##..#/##....##/.##..##./..####..',
  sector: '#..#..#./........./#..#..#./.###...../#..#..#./.....###/#..#..#./........',
  hyper: '...##.../..####../.#.##.#./...##.../#.####.#/.######./..####../...##...',
};
const Icons = {};
function initIcons() {
  for (const name in ICONS_RAW) {
    const rows = ICONS_RAW[name].split('/').filter(r => r.replace(/\./g, '').length > 0 || true);
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const c = canvas.getContext('2d');
    c.fillStyle = '#fff';
    rows.slice(0, 8).forEach((row, y) => {
      for (let x = 0; x < 8; x++) if (row[x] === '#') c.fillRect(x, y, 1, 1);
    });
    Icons[name] = canvas;
  }
}
