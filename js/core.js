'use strict';
/* Utilitaires, sauvegarde, statistiques du vaisseau, achats. */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/* La police d'arcade dessine mal les capitales accentuées : on les retire, comme sur les bornes. */
const arcade = s => s.replace(/[À-ÝŒ]/g, c => (c === 'Œ' ? 'OE' : c.normalize('NFD')[0]));

const SUFFIX = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a < 1000) {
    if (a < 100 && n % 1 !== 0) return (Math.round(n * 10) / 10).toString().replace('.', ',');
    return Math.round(n).toString();
  }
  const idx = Math.floor(Math.log10(a) / 3);
  if (idx >= SUFFIX.length) return n.toExponential(2).replace('.', ',').replace('e+', 'e');
  const v = n / Math.pow(10, idx * 3);
  const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0);
  return s.replace('.', ',') + SUFFIX[idx];
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/* ---------- Sauvegarde ---------- */
const SAVE_KEY = 'spacex.save.v1';
const defaultSave = () => ({
  v: 1,
  units: 0, cores: 0, dm: 0,
  ranks: {},
  best: 1,          // meilleur secteur atteint (toutes vies confondues depuis le dernier hypersaut)
  bestEver: 1,
  ascUnits: 0,      // unités gagnées depuis le dernier hypersaut
  lifeUnits: 0,
  kills: 0, runs: 0, ascensions: 0,
  startSector: 1,
  autoBuy: false,
  seenHelp: false,
  lastSeen: Date.now(),
  set: { sound: true, music: true, aim: 'auto', shake: true, crt: true, nums: true },
});

let S = defaultSave();

const Save = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const def = defaultSave();
        S = Object.assign(def, data);
        S.set = Object.assign(defaultSave().set, data.set || {});
      }
    } catch (err) {
      console.warn('Sauvegarde illisible, nouvelle partie.', err);
      S = defaultSave();
    }
  },
  write() {
    S.lastSeen = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (err) {
      console.warn('Sauvegarde impossible.', err);
    }
  },
  wipe() {
    S = defaultSave();
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* navigation privée */ }
  },
};

/* ---------- Statistiques ---------- */
let STATS = null;

function computeStats() {
  const t = {};
  for (const n of NODES) {
    const r = S.ranks[n.id] | 0;
    if (!r) continue;
    for (const k in n.eff) t[k] = (t[k] || 0) + n.eff[k] * r;
  }
  const v = k => t[k] || 0;
  const pct = k => 1 + v(k) / 100;
  const cdMul = k => Math.max(0.2, (1 - v(k) / 100) * (1 - v('gCdP') / 100));

  const all = pct('allDmgP') * pct('gDmgP') * (v('glass') ? 2 : 1);
  const threat = v('threatP') / 100;

  const st = {
    raw: t,
    allMul: all,
    // canon
    cannonDmg: 4 * pct('dmgP') * all,
    rate: 3 * (1 + (v('rateP') + v('gRateP')) / 100),
    salvo: 1 + v('proj'),
    pierce: v('pierce'),
    ricochet: v('ricochet'),
    bulletSpeed: 340 * pct('bulletSpeedP'),
    range: 180 * pct('rangeP'),
    critC: clamp((5 + v('critC') + v('gCritC')) / 100, 0, 1),
    critM: 1.5 + v('critM') / 100,
    rear: v('rear') > 0, side: v('side') > 0,
    homing: v('homing') > 0,
    exec: v('execP') / 100,
    elite: v('eliteP') / 100,
    boss: v('bossP') / 100,
    cryo: clamp(v('cryo') / 100, 0, 0.6),
    explosive: v('explosive') / 100,
    // missiles
    missile: v('missile') > 0,
    missileDmg: 14 * pct('missileDmgP') * all,
    missileCd: 3 * cdMul('missileCdP'),
    missileRad: 28 * pct('missileRadP'),
    missileN: 1 + v('missileN'),
    missileSpeed: 170 * pct('missileSpeedP'),
    cluster: v('cluster') > 0 ? 3 + v('clusterN') : 0,
    nuke: v('nuke') / 100,
    plasma: v('plasma') > 0,
    droneMissile: v('droneMissile') > 0,
    // mines
    mine: v('mine') > 0,
    mineDmg: 22 * pct('mineDmgP') * all,
    mineCd: 2.5 * cdMul('mineCdP'),
    mineRad: 40 * pct('mineRadP'),
    mineN: 1 + v('mineN'),
    // arc
    arc: v('arc') > 0,
    arcDmg: 8 * pct('arcDmgP') * all,
    arcCd: 1.6 * cdMul('arcCdP'),
    arcChain: 2 + v('arcChain'),
    arcBolts: 1 + v('arcBolts'),
    arcSlow: clamp(v('arcSlow') / 100, 0, 0.6),
    // nova
    nova: v('nova') > 0,
    novaDmg: 18 * pct('novaDmgP') * all,
    novaCd: 6 * cdMul('novaCdP'),
    novaRad: 80 * pct('novaRadP'),
    novaKnock: 140 * pct('novaKnock'),
    // rayon
    beam: v('beam') > 0,
    beamDps: 14 * pct('beamDmgP') * all,
    beamLen: 120 * pct('beamLenP'),
    beamW: 3 + v('beamW') * 2,
    // drones
    drones: v('drones'),
    droneDmg: 3 * pct('droneDmgP') * all,
    droneRate: 1.4 * pct('droneRateP'),
    droneRange: 140 * pct('droneRangeP'),
    droneRam: v('droneRam') * 0.5,
    droneCollect: v('droneCollect') > 0,
    droneCrit: v('droneCrit') > 0,
    droneBlock: v('droneBlock') > 0,
    droneArc: v('droneArc') > 0,
    // coque
    maxHull: 50 * pct('hullP') * pct('gHullP') * (v('glass') ? 0.65 : 1),
    regen: (v('regen') + v('gRegen') + v('droneRegen') * v('drones')) / 100,
    armor: v('armor') + v('gArmor'),
    armorMul: 100 / (100 + v('armor') + v('gArmor')),
    shield: v('shield') > 0,
    shieldMul: 0.3 * pct('shieldP'),
    shieldRegen: 0.12 * pct('shieldRegenP'),
    shieldNova: v('shieldNova') > 0,
    thorns: v('thornsP') / 100,
    invuln: 0.5 * pct('invulnP'),
    dodge: clamp(v('dodge') / 100, 0, 0.5),
    repairKill: v('repairKill') / 100,
    reflect: clamp(v('reflect') / 100, 0, 0.5),
    revive: v('revive') + v('gRevive'),
    lastStand: v('lastStand') > 0,
    ram: v('ram') > 0,
    // propulsion
    speed: 125 * Math.min(pct('speedP') * pct('gSpeedP'), 2.4),
    accel: 620 * pct('accelP'),
    dash: v('dash') > 0,
    dashCd: 4 * cdMul('dashCdP'),
    dashLen: 0.18 * pct('dashLenP'),
    dashCharges: 1 + v('dashCharges'),
    dashDmg: v('dashDmg') > 0 ? 3 * pct('dashDmgP') : 0,
    dashNova: v('dashNova') > 0,
    dashReset: v('dashReset') / 100,
    trail: v('trail') > 0,
    trailDmg: 0.8 * pct('trailDmgP'),
    speedDmg: v('speedDmg') / 100,
    // collecte
    magnet: 42 * pct('magnetP') * pct('gMagnetP'),
    gainMul: pct('gainP') * pct('gGainP') * (1 + threat),
    combo: v('combo') > 0,
    comboMax: 0.5 * pct('comboMaxP'),
    jackpot: v('jackpot') / 100,
    jackpotMul: 10 + v('jackpotM'),
    coreC: (6 + v('coreC')) / 100,
    coreBoss: v('coreBoss'),
    coreMul: pct('gCoreP'),
    cargoMul: pct('cargoP'),
    interest: v('interest') / 100,
    bounty: v('bountyP') / 100,
    vacuum: v('vacuum') > 0,
    income: v('income') * pct('incomeP') * pct('gIncomeP') * pct('gGainP'),
    offlineH: 2 + v('offlineH'),
    // tactique
    slowAura: clamp(v('slowAura') / 100, 0, 0.6),
    frenzy: v('frenzy') > 0,
    frenzyMax: Math.round(20 * pct('frenzyMaxP')),
    spawnMul: 1 + threat,
    dilate: v('dilate') > 0,
    sectorDur: 60 * clamp(1 - v('sectorShort') / 100, 0.4, 1),
    portal: v('portal') > 0 || v('gStart') > 0,
    portalMul: 0.5 + v('portalP') / 100,
    gStart: v('gStart'),
    eliteC: (3 + v('eliteC')) / 100,
    dmMul: pct('dmP'),
    discount: clamp(v('discount') / 100, 0, 0.75),
    autoBuy: v('autoBuy') > 0,
    startUnits: v('startUnits'),
    startCores: v('startCores'),
  };
  STATS = st;
  return st;
}

/* Revenu passif réel : croît avec le meilleur secteur pour rester utile. */
function incomePerSec() {
  return STATS.income * Math.pow(1.22, Math.max(0, S.best - 1));
}

/* ---------- Secteur de départ ---------- */
const CHECKPOINT_EVERY = 5; // un point de passage tous les 5 secteurs atteints

/* Dernier secteur que le portail de saut permet de choisir librement. */
function portalMaxSector() {
  let start = 1;
  if (STATS.portal) start = Math.max(1, Math.floor(S.best * STATS.portalMul));
  return Math.min(Math.max(1, S.best), start + STATS.gStart);
}

/* Départs possibles : le secteur 1, chaque point de passage atteint (5, 10, 15…),
   et tout ce que le portail ouvre. Le record repart à 1 après un hypersaut. */
function startOptions() {
  const options = new Set([1]);
  for (let s = CHECKPOINT_EVERY; s <= S.best; s += CHECKPOINT_EVERY) options.add(s);
  for (let s = 2; s <= portalMaxSector(); s++) options.add(s);
  return [...options].sort((a, b) => a - b);
}
function maxStartSector() {
  const options = startOptions();
  return options[options.length - 1];
}
/* Le départ choisi, ramené au plus proche départ autorisé en dessous. */
function validStartSector() {
  const options = startOptions();
  let best = 1;
  for (const s of options) if (s <= S.startSector) best = s;
  S.startSector = best;
  return best;
}
function stepStartSector(direction) {
  const options = startOptions();
  const i = options.indexOf(validStartSector());
  S.startSector = options[clamp(i + direction, 0, options.length - 1)];
}

/* Nouveau record : un point de passage atteint devient le départ proposé. */
function noteSectorReached(sector) {
  if (sector > S.bestEver) S.bestEver = sector;
  if (sector <= S.best) return false;
  S.best = sector;
  if (sector % CHECKPOINT_EVERY !== 0) return false;
  S.startSector = sector;
  return true;
}

/* ---------- Achats ---------- */
function rank(n) { return S.ranks[n.id] | 0; }

function nodeCost(n, r = rank(n)) {
  let c = n.cost * Math.pow(n.g, r);
  if (n.cur === 'u') c *= 1 - STATS.discount;
  return Math.max(1, Math.ceil(c));
}
function wallet(cur) { return cur === 'u' ? S.units : cur === 'c' ? S.cores : S.dm; }
function spend(cur, amount) {
  if (cur === 'u') S.units -= amount;
  else if (cur === 'c') S.cores -= amount;
  else S.dm -= amount;
}
function isUnlocked(n) {
  if (n.asc && S.ascensions < n.asc) return false;
  if (!n.parents.length) return true;
  return n.all ? n.parents.every(p => rank(p) > 0) : n.parents.some(p => rank(p) > 0);
}
function isMaxed(n) { return n.max !== 0 && rank(n) >= n.max; }
function canBuy(n) {
  return isUnlocked(n) && !isMaxed(n) && wallet(n.cur) >= nodeCost(n);
}
function buyNode(n) {
  if (!canBuy(n)) return false;
  spend(n.cur, nodeCost(n));
  S.ranks[n.id] = rank(n) + 1;
  computeStats();
  return true;
}
function buyMax(n) {
  let count = 0;
  while (count < 500 && buyNode(n)) count++;
  return count;
}
function affordableCount(tree = 'ship') {
  let c = 0;
  for (const n of NODES) if (n.tree === tree && canBuy(n)) c++;
  return c;
}

/* Auto-achat : la moins chère des améliorations en unités. */
function autoBuyTick() {
  if (!STATS.autoBuy || !S.autoBuy) return 0;
  let bought = 0;
  for (let i = 0; i < 40; i++) {
    let best = null;
    let bestCost = Infinity;
    for (const n of NODES) {
      if (n.tree !== 'ship' || n.cur !== 'u' || n.noAuto || !canBuy(n)) continue;
      const c = nodeCost(n);
      if (c < bestCost) { bestCost = c; best = n; }
    }
    if (!best) break;
    buyNode(best);
    bought++;
  }
  return bought;
}

/* ---------- Hypersaut ---------- */
const HYPER_BOSS_SECTOR = 3; // il faut avoir vaincu le boss de ce secteur
const HYPER_SECTOR = HYPER_BOSS_SECTOR + 1;
function hyperReady() { return S.best >= HYPER_SECTOR; }
function hyperGain() {
  if (!hyperReady()) return 0;
  const base = Math.sqrt(S.ascUnits / 4000) + (S.best - HYPER_SECTOR) * 1.5;
  // Au moins 2 ✦ : de quoi toujours acheter une première case de la Constellation.
  return Math.max(2, Math.floor(base * STATS.dmMul));
}
function doHyper() {
  const gain = hyperGain();
  if (!gain) return 0;
  S.dm += gain;
  for (const n of NODES) if (n.tree === 'ship') delete S.ranks[n.id];
  computeStats();
  S.units = STATS.startUnits;
  S.cores = STATS.startCores;
  S.best = 1;
  S.startSector = 1;
  S.ascUnits = 0;
  S.ascensions++;
  Save.write();
  return gain;
}

/* Rembourse tout l'arbre du vaisseau (hors constellation). */
function respec() {
  for (const n of NODES) {
    if (n.tree !== 'ship') continue;
    const r = rank(n);
    for (let i = 0; i < r; i++) {
      const c = n.cost * Math.pow(n.g, i);
      if (n.cur === 'u') S.units += Math.ceil(c * (1 - STATS.discount));
      else S.cores += Math.ceil(c);
    }
    delete S.ranks[n.id];
  }
  computeStats();
  Save.write();
}

/* Revenu accumulé pendant l'absence. */
function claimOffline() {
  const elapsed = (Date.now() - S.lastSeen) / 1000;
  if (elapsed < 60) return 0;
  const cap = STATS.offlineH * 3600;
  const gain = incomePerSec() * Math.min(elapsed, cap);
  if (gain < 1) return 0;
  S.units += gain;
  S.lifeUnits += gain;
  S.ascUnits += gain;
  return gain;
}
