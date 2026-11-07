'use strict';
/* =====================================================================
   ARBRE DE COMPÉTENCES — données uniquement.
   Chaque compétence : position polaire (r, lat), icône, nom, effets.
   Les effets s'additionnent par rang ; computeStats() (core.js) les lit.
   ===================================================================== */

const BRANCHES = [
  { id: 'arm', name: 'ARMEMENT',   color: '#ff5a4a', angle: -90  },
  { id: 'mis', name: 'MISSILES',   color: '#ff9d2e', angle: -45  },
  { id: 'ene', name: 'ÉNERGIE',    color: '#7ff0ff', angle: 0    },
  { id: 'dro', name: 'DRONES',     color: '#6cf06c', angle: 45   },
  { id: 'bli', name: 'BLINDAGE',   color: '#5a9cff', angle: 90   },
  { id: 'pro', name: 'PROPULSION', color: '#ff6cd0', angle: 135  },
  { id: 'col', name: 'COLLECTE',   color: '#ffd84a', angle: 180  },
  { id: 'tac', name: 'TACTIQUE',   color: '#b07cff', angle: -135 },
];

const CONS_BRANCHES = [
  { id: 'cf', name: 'FORCE',           color: '#ff7a6a', angle: -90  },
  { id: 'cc', name: 'COQUE',           color: '#6aa8ff', angle: -30  },
  { id: 'cg', name: 'FORTUNE',         color: '#ffd84a', angle: 30   },
  { id: 'cv', name: 'VÉLOCITÉ',        color: '#ff7ad8', angle: 90   },
  { id: 'ca', name: 'AUTOMATISATION',  color: '#7af0a0', angle: 150  },
  { id: 'cs', name: 'SAVOIR',          color: '#c09aff', angle: -150 },
];

/* Libellé de chaque effet : (valeur) => texte. */
const STAT_LABELS = {
  dmgP: v => `+${v}% dégâts du canon`,
  rateP: v => `+${v}% cadence de tir`,
  proj: v => `+${v} projectile par salve`,
  pierce: v => `Les obus traversent ${v} ennemi${v > 1 ? 's' : ''} de plus`,
  bulletSpeedP: v => `+${v}% vitesse des obus`,
  rangeP: v => `+${v}% portée du canon`,
  critC: v => `+${v}% chance de critique`,
  critM: v => `+${v}% dégâts critiques`,
  ricochet: v => `Les obus rebondissent ${v} fois de plus`,
  execP: v => `+${v}% de dégâts sur les ennemis sous 30% de vie`,
  eliteP: v => `+${v}% de dégâts contre les élites`,
  cryo: v => `Les obus ralentissent les cibles de ${v}%`,
  explosive: v => `${v}% de chance qu'un obus explose à l'impact`,

  missileDmgP: v => `+${v}% dégâts des missiles`,
  missileCdP: v => `-${v}% temps de recharge des missiles`,
  missileRadP: v => `+${v}% rayon d'explosion des missiles`,
  missileN: v => `+${v} missile par salve`,
  missileSpeedP: v => `+${v}% vitesse des missiles`,
  clusterN: v => `+${v} sous-munition à l'explosion`,
  nuke: v => `${v}% de chance d'ogive thermique (dégâts ×5, rayon ×2)`,
  mineDmgP: v => `+${v}% dégâts des mines`,
  mineCdP: v => `-${v}% temps de pose des mines`,
  mineRadP: v => `+${v}% rayon d'explosion des mines`,
  mineN: v => `+${v} mine à chaque pose`,

  arcDmgP: v => `+${v}% dégâts de l'arc`,
  arcCdP: v => `-${v}% temps de recharge de l'arc`,
  arcChain: v => `L'arc saute sur ${v} cible${v > 1 ? 's' : ''} de plus`,
  arcSlow: v => `L'arc ralentit les cibles de ${v}%`,
  arcBolts: v => `+${v} éclair simultané`,
  novaDmgP: v => `+${v}% dégâts de la nova`,
  novaCdP: v => `-${v}% temps de recharge de la nova`,
  novaRadP: v => `+${v}% rayon de la nova`,
  novaKnock: v => `+${v}% de recul infligé par la nova`,
  beamDmgP: v => `+${v}% dégâts du rayon`,
  beamLenP: v => `+${v}% portée du rayon`,
  beamW: v => `+${v} largeur du rayon`,

  drones: v => `+${v} drone en orbite`,
  droneDmgP: v => `+${v}% dégâts des drones`,
  droneRateP: v => `+${v}% cadence des drones`,
  droneRangeP: v => `+${v}% portée des drones`,
  droneRam: v => `Les drones blessent au contact (${v * 50}% des dégâts du canon)`,
  droneRegen: v => `+${v}% de coque/s par drone`,

  hullP: v => `+${v}% coque`,
  regen: v => `+${v}% de coque réparée par seconde`,
  armor: v => `+${v} blindage (réduction décroissante)`,
  shieldP: v => `+${v}% capacité du bouclier`,
  shieldRegenP: v => `+${v}% recharge du bouclier`,
  thornsP: v => `Le contact renvoie ${v}% des dégâts du canon`,
  invulnP: v => `+${v}% de durée d'invulnérabilité après un coup`,
  dodge: v => `+${v}% de chance d'esquive`,
  repairKill: v => `+${v}% de coque par élimination`,
  reflect: v => `${v}% de chance de renvoyer les tirs ennemis`,
  revive: v => `+${v} résurrection par vol`,

  speedP: v => `+${v}% vitesse`,
  accelP: v => `+${v}% accélération`,
  dashCdP: v => `-${v}% temps de recharge du saut`,
  dashLenP: v => `+${v}% durée du saut`,
  dashDmgP: v => `+${v}% dégâts de l'éperon`,
  dashCharges: v => `+${v} charge de saut`,
  dashReset: v => `${v}% de chance par élimination de recharger le saut`,
  trailDmgP: v => `+${v}% dégâts de la traînée`,
  speedDmg: v => `+${v}% de dégâts par tranche de 50 de vitesse`,

  magnetP: v => `+${v}% rayon de l'aimant`,
  gainP: v => `+${v}% unités gagnées`,
  income: v => `+${v} unité/s de revenu passif (croît avec ton record)`,
  incomeP: v => `+${v}% de revenu passif`,
  comboMaxP: v => `+${v}% plafond du combo`,
  jackpot: v => `${v}% de chance de jackpot sur chaque ennemi`,
  jackpotM: v => `Jackpot +×${v}`,
  coreC: v => `+${v}% de chance de noyau sur les élites`,
  coreBoss: v => `+${v} noyau par boss`,
  offlineH: v => `+${v} h de revenu hors ligne stocké`,
  cargoP: v => `+${v}% de cargos`,
  interest: v => `+${v}% d'unités bonus à la fin du vol`,
  bountyP: v => `+${v}% d'unités sur les élites et les boss`,

  allDmgP: v => `+${v}% tous les dégâts`,
  slowAura: v => `Ralentit de ${v}% les ennemis proches`,
  bossP: v => `+${v}% de dégâts contre les boss`,
  frenzyMaxP: v => `+${v}% de cumuls de frénésie`,
  threatP: v => `+${v}% d'ennemis et +${v}% d'unités`,
  sectorShort: v => `-${v}% de durée des secteurs`,
  portalP: v => `+${v}% de portée du portail de saut`,
  eliteC: v => `+${v}% de chance d'apparition d'élites`,
  dmP: v => `+${v}% de matière noire à l'hypersaut`,

  gDmgP: v => `+${v}% tous les dégâts`,
  gRateP: v => `+${v}% cadence de tir`,
  gHullP: v => `+${v}% coque`,
  gGainP: v => `+${v}% unités gagnées`,
  gSpeedP: v => `+${v}% vitesse`,
  gCritC: v => `+${v}% chance de critique`,
  gArmor: v => `+${v} blindage`,
  gRegen: v => `+${v}% de coque réparée par seconde`,
  gMagnetP: v => `+${v}% rayon de l'aimant`,
  gCdP: v => `-${v}% tous les temps de recharge`,
  discount: v => `-${v}% sur le coût en unités de l'arbre`,
  startUnits: v => `+${v} unités de départ après un hypersaut`,
  startCores: v => `+${v} noyaux de départ après un hypersaut`,
  gCoreP: v => `+${v}% de noyaux gagnés`,
  gIncomeP: v => `+${v}% de revenu passif`,
  gStart: v => `Portail : +${v} secteurs de départ`,
  gRevive: v => `+${v} résurrection par vol`,
};

const NODES = [];
const NODE_BY_ID = {};

function polar(r, lat, angleDeg, base, step) {
  const R = base + r * step;
  const a = (angleDeg * Math.PI) / 180 + (lat * 80) / R;
  return { x: Math.cos(a) * R, y: Math.sin(a) * R };
}

/* N(branche, id, r, lat, icône, nom, options)
   options : max (rangs, 0 = infini), eff, req, all, kind ('k' clé de voûte, 'n' notable),
             core (coût en noyaux), c (multiplicateur de coût), g (croissance),
             desc (texte libre), noAuto (exclu de l'auto-achat), asc (hypersauts requis) */
function N(b, id, r, lat, icon, name, o) {
  const branch = BRANCHES[b];
  const pos = polar(r, lat, branch.angle, 120, 105);
  pushNode({ tree: 'ship', id, b: branch, r, x: pos.x, y: pos.y, icon, name, o });
}
function bridge(bA, bB, id, r, icon, name, o) {
  const A = BRANCHES[bA].angle;
  let Bx = BRANCHES[bB].angle;
  if (Math.abs(Bx - A) > 180) Bx += Bx < A ? 360 : -360;
  const pos = polar(r, 0, (A + Bx) / 2, 120, 105);
  pushNode({
    tree: 'ship', id, b: { id: 'x', name: 'SYNERGIE', color: '#ffffff' }, r,
    x: pos.x, y: pos.y, icon, name, o: Object.assign({ all: true, kind: 'n' }, o),
  });
}
function C(b, id, r, lat, icon, name, o) {
  const branch = CONS_BRANCHES[b];
  const pos = polar(r, lat, branch.angle, 80, 95);
  pushNode({ tree: 'cons', id, b: branch, r, x: pos.x, y: pos.y, icon, name, o });
}
function pushNode({ tree, id, b, r, x, y, icon, name, o }) {
  const max = o.max === undefined ? 1 : o.max;
  const baseCost = tree === 'ship' ? Math.round(6 * Math.pow(3, r - 1)) : Math.round(1 + r * r * 0.8);
  const node = {
    tree, id, branch: b, r, x, y, icon, name,
    max,
    eff: o.eff || {},
    req: o.req || [],
    all: !!o.all,
    kind: o.kind || (max === 0 ? 'i' : 'm'),
    cur: tree === 'cons' ? 'd' : o.core ? 'c' : 'u',
    cost: o.core || o.cost || Math.max(1, Math.round(baseCost * (o.c || 1))),
    g: o.g || (max === 0 ? 1.6 : max <= 3 ? 2.2 : max <= 6 ? 1.55 : 1.38),
    desc: o.desc || '',
    noAuto: !!o.noAuto,
    asc: o.asc || 0,       // nombre d'hypersauts à avoir faits pour y accéder
  };
  NODES.push(node);
  NODE_BY_ID[id] = node;
}

/* ---------- ARMEMENT ---------- */
N(0, 'a1', 1, 0, 'dmg', 'Canons calibrés', { max: 10, eff: { dmgP: 10 } });
N(0, 'a2', 2, -1, 'rate', 'Cadence accrue', { max: 10, eff: { rateP: 6 }, req: ['a1'] });
N(0, 'a3', 2, 1, 'dmg', 'Munitions denses', { max: 10, eff: { dmgP: 12 }, req: ['a1'] });
N(0, 'a4', 3, -1.5, 'crit', 'Visée laser', { max: 10, eff: { critC: 2 }, req: ['a2'] });
N(0, 'a5', 3, 0, 'gun', 'Double canon', { kind: 'k', core: 2, eff: { proj: 1 }, req: ['a2', 'a3'], desc: 'Tire une salve de 2 obus.' });
N(0, 'a6', 3, 1.5, 'speed', 'Obus rapides', { max: 5, eff: { bulletSpeedP: 12, rangeP: 8 }, req: ['a3'] });
N(0, 'a7', 4, -2, 'crit', 'Munitions critiques', { max: 10, eff: { critM: 15 }, req: ['a4'] });
N(0, 'a8', 4, 0, 'pierce', 'Perforants', { kind: 'n', max: 3, c: 1.5, eff: { pierce: 1 }, req: ['a5'] });
N(0, 'a9', 4, 2, 'rate', 'Refroidissement', { max: 10, eff: { rateP: 6 }, req: ['a6'] });
N(0, 'a10', 5, -2.4, 'rear', 'Tourelle arrière', { kind: 'k', core: 4, eff: { rear: 1 }, req: ['a7'], desc: 'Un second canon couvre tes arrières.' });
N(0, 'a11', 5, 0, 'gun', 'Triple canon', { kind: 'k', core: 5, eff: { proj: 1 }, req: ['a8'], desc: 'Ajoute un obus à chaque salve.' });
N(0, 'a12', 5, 2.4, 'side', 'Canons latéraux', { kind: 'k', core: 4, eff: { side: 1 }, req: ['a9'], desc: 'Deux canons latéraux tirent en éventail à 60% des dégâts.' });
N(0, 'a13', 6, -2, 'bounce', 'Ricochet', { kind: 'n', max: 3, c: 1.5, eff: { ricochet: 1 }, req: ['a10'] });
N(0, 'a14', 6, -0.7, 'dmg', 'Calibre lourd', { max: 10, eff: { dmgP: 20 }, req: ['a11'] });
N(0, 'a15', 6, 0.7, 'exec', 'Exécuteur', { max: 5, eff: { execP: 20 }, req: ['a11'] });
N(0, 'a16', 6, 2, 'elite', 'Chasseur de têtes', { max: 10, eff: { eliteP: 15 }, req: ['a12'] });
N(0, 'a17', 7, 0, 'gun', 'Salve quadruple', { kind: 'k', core: 12, eff: { proj: 1 }, req: ['a14', 'a15'], desc: 'Ajoute un obus à chaque salve.' });
N(0, 'a18', 7, -2, 'glass', 'Canon de verre', { kind: 'k', core: 10, noAuto: true, eff: { glass: 1 }, req: ['a13'], desc: 'Tous les dégâts ×2, mais la coque perd 35%.' });
N(0, 'a19', 7, 2, 'cryo', 'Obus cryogéniques', { max: 5, eff: { cryo: 8 }, req: ['a16'] });
N(0, 'a20', 8, 0, 'inf', "Surcharge d'armement", { max: 0, eff: { dmgP: 15 }, req: ['a17'] });

/* ---------- MISSILES ---------- */
N(1, 'm1', 1, 0, 'missile', 'Lance-missiles', { kind: 'k', cost: 25, eff: { missile: 1 }, desc: 'Tire un missile guidé explosif toutes les 3 secondes.' });
N(1, 'm2', 2, -1, 'dmg', 'Charge creuse', { max: 10, eff: { missileDmgP: 15 }, req: ['m1'] });
N(1, 'm3', 2, 1, 'cd', 'Autochargeur', { max: 10, eff: { missileCdP: 4 }, req: ['m1'] });
N(1, 'm4', 3, -1.5, 'radius', 'Charge étendue', { max: 8, eff: { missileRadP: 10 }, req: ['m2'] });
N(1, 'm5', 3, 0, 'missile', 'Salve de missiles', { kind: 'n', max: 3, c: 1.6, eff: { missileN: 1 }, req: ['m2', 'm3'] });
N(1, 'm6', 3, 1.5, 'speed', 'Propulseur guidé', { max: 5, eff: { missileSpeedP: 12 }, req: ['m3'] });
N(1, 'm7', 4, -2, 'cluster', 'Sous-munitions', { kind: 'k', core: 3, eff: { cluster: 1 }, req: ['m4'], desc: "Chaque missile libère 3 éclats à l'explosion." });
N(1, 'm8', 4, 0, 'dmg', 'Ogive perforante', { max: 10, eff: { missileDmgP: 20 }, req: ['m5'] });
N(1, 'm9', 4, 2, 'mine', 'Mouilleur de mines', { kind: 'k', core: 3, eff: { mine: 1 }, req: ['m6'], desc: 'Dépose une mine de proximité toutes les 2,5 secondes.' });
N(1, 'm10', 5, -2.4, 'cluster', 'Fragments lourds', { kind: 'n', max: 3, c: 1.4, eff: { clusterN: 1 }, req: ['m7'] });
N(1, 'm11', 5, 0, 'nuke', 'Ogive thermique', { kind: 'n', max: 5, c: 1.4, eff: { nuke: 4 }, req: ['m8'] });
N(1, 'm12', 5, 1.8, 'dmg', 'Mines à fragmentation', { max: 10, eff: { mineDmgP: 20 }, req: ['m9'] });
N(1, 'm13', 5, 3, 'cd', 'Pose rapide', { max: 8, eff: { mineCdP: 5 }, req: ['m9'] });
N(1, 'm14', 6, -1, 'missile', 'Batterie lourde', { kind: 'n', max: 3, c: 1.8, eff: { missileN: 1 }, req: ['m10', 'm11'] });
N(1, 'm15', 6, 1, 'radius', 'Onde de souffle', { max: 8, eff: { mineRadP: 10, missileRadP: 5 }, req: ['m11', 'm12'] });
N(1, 'm16', 6, 2.8, 'mine', 'Champ de mines', { kind: 'n', max: 3, c: 1.5, eff: { mineN: 1 }, req: ['m13'] });
N(1, 'm17', 7, 0, 'inf', 'Surcharge balistique', { max: 0, eff: { missileDmgP: 15, mineDmgP: 15 }, req: ['m14', 'm15'] });

/* ---------- ÉNERGIE ---------- */
N(2, 'e1', 1, 0, 'arc', 'Arc électrique', { kind: 'k', cost: 25, eff: { arc: 1 }, desc: 'Foudroie la cible la plus proche et saute sur 2 autres, toutes les 1,6 s.' });
N(2, 'e2', 2, -1, 'dmg', 'Bobines tesla', { max: 10, eff: { arcDmgP: 15 }, req: ['e1'] });
N(2, 'e3', 2, 1, 'cd', 'Condensateurs', { max: 10, eff: { arcCdP: 4 }, req: ['e1'] });
N(2, 'e4', 3, -1.5, 'chain', 'Conducteur', { max: 6, eff: { arcChain: 1 }, req: ['e2'] });
N(2, 'e5', 3, 1.5, 'nova', 'Émetteur de nova', { kind: 'k', core: 2, eff: { nova: 1 }, req: ['e3'], desc: 'Émet une onde de choc circulaire toutes les 6 secondes.' });
N(2, 'e6', 4, -2, 'stun', 'Surtension', { max: 5, eff: { arcSlow: 10 }, req: ['e4'] });
N(2, 'e7', 4, -0.7, 'dmg', 'Haute tension', { max: 10, eff: { arcDmgP: 20 }, req: ['e4'] });
N(2, 'e8', 4, 0.7, 'dmg', 'Nova dense', { max: 10, eff: { novaDmgP: 20 }, req: ['e5'] });
N(2, 'e9', 4, 2, 'radius', 'Nova étendue', { max: 8, eff: { novaRadP: 10 }, req: ['e5'] });
N(2, 'e10', 5, 2.4, 'cd', 'Cycle court', { max: 8, eff: { novaCdP: 5 }, req: ['e9'] });
N(2, 'e11', 5, 0, 'beam', 'Rayon continu', { kind: 'k', core: 6, eff: { beam: 1 }, req: ['e7', 'e8'], desc: "Un rayon permanent traverse tout ce qui se trouve devant le vaisseau." });
N(2, 'e12', 5, -2.4, 'arc', 'Double décharge', { kind: 'n', max: 2, c: 1.5, eff: { arcBolts: 1 }, req: ['e6'] });
N(2, 'e13', 6, -1, 'dmg', 'Foyer focalisé', { max: 10, eff: { beamDmgP: 20 }, req: ['e11'] });
N(2, 'e14', 6, 1, 'range', 'Lentille longue', { max: 6, eff: { beamLenP: 12 }, req: ['e11'] });
N(2, 'e15', 6, 2.8, 'knock', 'Onde de choc', { max: 5, eff: { novaKnock: 40 }, req: ['e10'] });
N(2, 'e16', 6, -2.8, 'dmg', 'Arc-réacteur', { max: 10, eff: { arcDmgP: 10, novaDmgP: 10, beamDmgP: 10 }, req: ['e12'] });
N(2, 'e17', 7, 0, 'beam', 'Rayon large', { kind: 'k', core: 12, eff: { beamW: 2, beamDmgP: 50 }, req: ['e13', 'e14'] });
N(2, 'e18', 8, 0, 'inf', 'Surcharge énergétique', { max: 0, eff: { arcDmgP: 15, novaDmgP: 15, beamDmgP: 15 }, req: ['e17'] });

/* ---------- DRONES ---------- */
N(3, 'd1', 1, 0, 'drone', "Drone d'escorte", { kind: 'k', cost: 25, eff: { drones: 1 }, desc: 'Un drone orbite autour du vaisseau et tire tout seul.' });
N(3, 'd2', 2, -1, 'dmg', 'Micro-canons', { max: 10, eff: { droneDmgP: 15 }, req: ['d1'] });
N(3, 'd3', 2, 1, 'rate', 'Processeur de tir', { max: 10, eff: { droneRateP: 6 }, req: ['d1'] });
N(3, 'd4', 3, 0, 'drone', 'Deuxième drone', { kind: 'k', core: 2, eff: { drones: 1 }, req: ['d2', 'd3'] });
N(3, 'd5', 3, -1.8, 'range', 'Capteurs', { max: 6, eff: { droneRangeP: 10 }, req: ['d2'] });
N(3, 'd6', 3, 1.8, 'orbit', 'Lames orbitales', { max: 5, eff: { droneRam: 1 }, req: ['d3'] });
N(3, 'd7', 4, -1, 'dmg', 'Munitions intelligentes', { max: 10, eff: { droneDmgP: 20 }, req: ['d4'] });
N(3, 'd8', 4, 1, 'rate', 'Surcadençage', { max: 10, eff: { droneRateP: 8 }, req: ['d4'] });
N(3, 'd9', 5, 0, 'drone', 'Troisième drone', { kind: 'k', core: 5, eff: { drones: 1 }, req: ['d7', 'd8'] });
N(3, 'd10', 5, -2.4, 'collect', 'Drone collecteur', { kind: 'k', core: 3, eff: { droneCollect: 1 }, req: ['d5'], desc: "Ramène tout seul les unités éparpillées à l'écran." });
N(3, 'd11', 5, 2.4, 'heal', 'Drone médic', { kind: 'k', core: 3, eff: { regen: 0.3 }, req: ['d6'], desc: 'Répare 0,3% de coque par seconde.' });
N(3, 'd12', 6, -1, 'crit', 'Liaison de ciblage', { kind: 'k', core: 6, eff: { droneCrit: 1 }, req: ['d9'], desc: 'Les drones héritent de tes chances de critique.' });
N(3, 'd13', 6, 1, 'dmg', 'Essaim coordonné', { max: 10, eff: { droneDmgP: 25 }, req: ['d9'] });
N(3, 'd14', 7, 0, 'drone', 'Quatrième drone', { kind: 'k', core: 10, eff: { drones: 1 }, req: ['d12', 'd13'] });
N(3, 'd15', 7, -2.2, 'missile', 'Drones lance-missiles', { kind: 'k', core: 8, eff: { droneMissile: 1 }, req: ['d12'], desc: 'Chaque drone ajoute un missile à tes salves (Lance-missiles requis pour tirer).' });
N(3, 'd16', 7, 2.2, 'shield', 'Écran de drones', { kind: 'k', core: 8, eff: { droneBlock: 1 }, req: ['d13'], desc: 'Les drones interceptent les tirs ennemis.' });
N(3, 'd17', 8, 0, 'drone', 'Cinquième drone', { kind: 'k', core: 20, eff: { drones: 1 }, req: ['d14'] });
N(3, 'd18', 9, 0, 'inf', "Surcharge d'essaim", { max: 0, eff: { droneDmgP: 20 }, req: ['d17'] });

/* ---------- BLINDAGE ---------- */
N(4, 'b1', 1, 0, 'hull', 'Plaques renforcées', { max: 10, eff: { hullP: 15 } });
N(4, 'b2', 2, -1, 'regen', 'Nanoréparateurs', { max: 10, eff: { regen: 0.15 }, req: ['b1'] });
N(4, 'b3', 2, 1, 'armor', 'Alliage dense', { max: 10, eff: { armor: 4 }, req: ['b1'] });
N(4, 'b4', 3, -1.5, 'shield', 'Bouclier déflecteur', { kind: 'k', core: 2, eff: { shield: 1 }, req: ['b2'], desc: 'Ajoute un bouclier égal à 30% de ta coque, qui se recharge hors combat.' });
N(4, 'b5', 3, 0, 'hull', 'Coque lourde', { max: 10, eff: { hullP: 20 }, req: ['b2', 'b3'] });
N(4, 'b6', 3, 1.5, 'thorns', 'Pointes réactives', { max: 10, eff: { thornsP: 60 }, req: ['b3'] });
N(4, 'b7', 4, -2, 'shield', 'Déflecteur amplifié', { max: 10, eff: { shieldP: 20 }, req: ['b4'] });
N(4, 'b8', 4, -0.7, 'cd', 'Recharge rapide', { max: 8, eff: { shieldRegenP: 15 }, req: ['b4'] });
N(4, 'b9', 4, 0.7, 'invuln', 'Amortisseurs', { max: 5, eff: { invulnP: 20 }, req: ['b5'] });
N(4, 'b10', 4, 2, 'dodge', 'Micro-manœuvres', { max: 8, eff: { dodge: 2 }, req: ['b6'] });
N(4, 'b11', 5, -2.4, 'nova', 'Surcharge du bouclier', { kind: 'k', core: 4, eff: { shieldNova: 1 }, req: ['b7'], desc: 'Quand le bouclier cède, il explose et repousse tout autour de toi.' });
N(4, 'b12', 5, -0.8, 'repair', 'Récupération', { max: 8, eff: { repairKill: 0.03 }, req: ['b8', 'b9'] });
N(4, 'b13', 5, 0.8, 'hull', 'Cuirasse composite', { max: 10, eff: { hullP: 30 }, req: ['b9'] });
N(4, 'b14', 5, 2.4, 'mirror', 'Réflecteur', { max: 5, eff: { reflect: 6 }, req: ['b10'] });
N(4, 'b15', 6, 0, 'revive', 'Capsule de secours', { kind: 'k', core: 8, eff: { revive: 1 }, req: ['b12', 'b13'], desc: 'Une fois par vol, ressuscite à 50% de coque en repoussant tout.' });
N(4, 'b16', 6, 2, 'armor', 'Blindage réactif', { max: 10, eff: { armor: 8 }, req: ['b14', 'b13'] });
N(4, 'b17', 7, -1, 'last', 'Dernier rempart', { kind: 'k', core: 10, eff: { lastStand: 1 }, req: ['b15'], desc: 'Sous 25% de coque : +50% de tous les dégâts.' });
N(4, 'b18', 7, 1, 'revive', 'Seconde capsule', { kind: 'k', core: 25, eff: { revive: 1 }, req: ['b15'] });
N(4, 'b19', 8, 0, 'inf', 'Surcharge de coque', { max: 0, eff: { hullP: 20, armor: 3 }, req: ['b17', 'b18'] });

/* ---------- PROPULSION ---------- */
N(5, 'p1', 1, 0, 'speed', 'Réacteurs réglés', { max: 10, eff: { speedP: 3 } });
N(5, 'p2', 2, -1, 'accel', 'Injecteurs', { max: 8, eff: { accelP: 8 }, req: ['p1'] });
N(5, 'p3', 2, 1, 'dash', 'Propulseur de saut', { kind: 'k', cost: 35, eff: { dash: 1 }, req: ['p1'], desc: 'Barre espace ou Maj : un bond invulnérable, toutes les 4 secondes.' });
N(5, 'p4', 3, -1.5, 'speed', 'Postcombustion', { max: 10, eff: { speedP: 3 }, req: ['p2'] });
N(5, 'p5', 3, 0.2, 'cd', 'Recharge du saut', { max: 8, eff: { dashCdP: 5 }, req: ['p3'] });
N(5, 'p6', 3, 1.8, 'dash', 'Saut long', { max: 5, eff: { dashLenP: 12 }, req: ['p3'] });
N(5, 'p7', 4, -2, 'trail', 'Traînée plasma', { kind: 'k', core: 3, eff: { trail: 1 }, req: ['p4'], desc: 'Tes réacteurs laissent une traînée qui brûle les ennemis.' });
N(5, 'p8', 4, -0.4, 'dodge', 'Esquive cinétique', { max: 5, eff: { dodge: 2 }, req: ['p4', 'p5'] });
N(5, 'p9', 4, 1.2, 'exec', 'Éperon de saut', { kind: 'k', core: 3, eff: { dashDmg: 1 }, req: ['p5', 'p6'], desc: 'Le saut inflige 300% des dégâts du canon aux ennemis traversés.' });
N(5, 'p10', 5, -2.4, 'dmg', 'Plasma instable', { max: 10, eff: { trailDmgP: 25 }, req: ['p7'] });
N(5, 'p11', 5, -0.8, 'speed', 'Réacteurs ioniques', { max: 10, eff: { speedP: 3 }, req: ['p8'] });
N(5, 'p12', 5, 0.8, 'dmg', 'Éperon renforcé', { max: 10, eff: { dashDmgP: 30 }, req: ['p9'] });
N(5, 'p13', 5, 2.4, 'charge', 'Saut multiple', { kind: 'n', max: 2, c: 1.4, eff: { dashCharges: 1 }, req: ['p6'] });
N(5, 'p14', 6, -1.4, 'speed', 'Énergie cinétique', { max: 5, eff: { speedDmg: 6 }, req: ['p10', 'p11'] });
N(5, 'p15', 6, 1.4, 'nova', 'Onde de saut', { kind: 'k', core: 6, eff: { dashNova: 1 }, req: ['p12', 'p13'], desc: "L'arrivée du saut déclenche une explosion." });
N(5, 'p16', 7, 0, 'time', 'Saut opportuniste', { max: 5, eff: { dashReset: 4 }, req: ['p14', 'p15'] });
N(5, 'p17', 8, 0, 'inf', 'Surcharge propulsive', { max: 0, eff: { allDmgP: 8, speedP: 1 }, req: ['p16'] });

/* ---------- COLLECTE ---------- */
N(6, 'c1', 1, 0, 'magnet', 'Aimant', { max: 10, eff: { magnetP: 15 } });
N(6, 'c2', 2, -1, 'gain', 'Contrats de récupération', { max: 10, eff: { gainP: 10 }, req: ['c1'] });
N(6, 'c3', 2, 1, 'income', 'Récolteur automatique', { kind: 'n', max: 10, eff: { income: 0.5 }, req: ['c1'] });
N(6, 'c4', 3, -1.5, 'combo', 'Chaîne de destruction', { kind: 'k', core: 2, eff: { combo: 1 }, req: ['c2'], desc: "Enchaîner les éliminations augmente tes gains, jusqu'à +50%." });
N(6, 'c5', 3, 0, 'gain', 'Tri sélectif', { max: 10, eff: { gainP: 12 }, req: ['c2', 'c3'] });
N(6, 'c6', 3, 1.5, 'income', 'Flotte minière', { max: 10, eff: { income: 1.5 }, req: ['c3'] });
N(6, 'c7', 4, -2, 'combo', 'Chaîne étendue', { max: 8, eff: { comboMaxP: 25 }, req: ['c4'] });
N(6, 'c8', 4, -0.7, 'lucky', 'Jackpot', { max: 8, eff: { jackpot: 1 }, req: ['c5'] });
N(6, 'c9', 4, 0.7, 'core', 'Extraction de noyaux', { max: 8, eff: { coreC: 3 }, req: ['c5'] });
N(6, 'c10', 4, 2, 'offline', 'Entrepôt orbital', { max: 6, eff: { offlineH: 2 }, req: ['c6'] });
N(6, 'c11', 5, -2.4, 'magnet', 'Aimant quantique', { max: 10, eff: { magnetP: 25 }, req: ['c7'] });
N(6, 'c12', 5, -0.8, 'cargo', 'Balise de cargos', { max: 8, eff: { cargoP: 20 }, req: ['c8'] });
N(6, 'c13', 5, 0.8, 'gain', 'Bourse galactique', { max: 10, eff: { gainP: 20 }, req: ['c9'] });
N(6, 'c14', 5, 2.4, 'income', 'Raffinerie', { max: 10, eff: { incomeP: 30 }, req: ['c10'] });
N(6, 'c15', 6, -1.4, 'lucky', 'Gros lot', { max: 5, eff: { jackpotM: 5 }, req: ['c11', 'c12'] });
N(6, 'c16', 6, 0, 'interest', 'Intérêts composés', { max: 5, eff: { interest: 5 }, req: ['c12', 'c13'] });
N(6, 'c17', 6, 1.4, 'core', 'Forage profond', { kind: 'n', max: 5, c: 1.3, eff: { coreBoss: 1 }, req: ['c13', 'c14'] });
N(6, 'c18', 7, 0, 'vacuum', 'Collecte totale', { kind: 'k', core: 12, eff: { vacuum: 1 }, req: ['c16'], desc: "Tout ce qui se trouve à l'écran est attiré vers toi." });
N(6, 'c19', 8, 0, 'inf', 'Surcharge commerciale', { max: 0, eff: { gainP: 15 }, req: ['c18'] });

/* ---------- TACTIQUE ---------- */
N(7, 't1', 1, 0, 'analyze', 'Analyse de combat', { max: 10, eff: { allDmgP: 5 } });
N(7, 't2', 2, -1, 'slow', 'Champ de ralentissement', { max: 5, eff: { slowAura: 7 }, req: ['t1'] });
N(7, 't3', 2, 1, 'frenzy', 'Frénésie', { kind: 'k', cost: 35, eff: { frenzy: 1 }, req: ['t1'], desc: "Chaque élimination ajoute +1% de cadence (20 cumuls). S'estompe sans combat." });
N(7, 't4', 3, -1.5, 'boss', "Dossier d'ennemi", { max: 10, eff: { bossP: 20 }, req: ['t2'] });
N(7, 't5', 3, 0, 'threat', 'Appât', { kind: 'k', core: 2, noAuto: true, eff: { threatP: 25 }, req: ['t2', 't3'], desc: "Attire 25% d'ennemis en plus, et rapporte 25% d'unités en plus." });
N(7, 't6', 3, 1.5, 'frenzy', 'Frénésie prolongée', { max: 6, eff: { frenzyMaxP: 25 }, req: ['t3'] });
N(7, 't7', 4, -2, 'time', 'Réflexes augmentés', { kind: 'k', core: 3, eff: { dilate: 1 }, req: ['t4'], desc: 'Sous 30% de coque, le temps ralentit de 30%.' });
N(7, 't8', 4, -0.7, 'portal', 'Portail de saut', { kind: 'k', core: 4, eff: { portal: 1 }, req: ['t5'], desc: 'Permet de décoller depuis la moitié de ton meilleur secteur.' });
N(7, 't9', 4, 0.7, 'threat', 'Provocation', { max: 5, noAuto: true, eff: { threatP: 10 }, req: ['t5'] });
N(7, 't10', 4, 2, 'crit', 'Tir opportuniste', { max: 8, eff: { critC: 2 }, req: ['t6'] });
N(7, 't11', 5, -2.4, 'sector', 'Cartographie', { max: 5, eff: { sectorShort: 8 }, req: ['t7'] });
N(7, 't12', 5, -0.8, 'portal', 'Balise avancée', { max: 5, eff: { portalP: 8 }, req: ['t8'] });
N(7, 't13', 5, 0.8, 'elite', "Contrats d'élite", { max: 8, eff: { eliteC: 1 }, req: ['t9'] });
N(7, 't14', 5, 2.4, 'crit', 'Point faible', { max: 10, eff: { critM: 20 }, req: ['t10'] });
N(7, 't15', 6, -1.4, 'boss', 'Démolition', { max: 10, eff: { bossP: 40 }, req: ['t11', 't12'] });
N(7, 't16', 6, 1.4, 'dmg', 'Doctrine offensive', { max: 10, eff: { allDmgP: 10 }, req: ['t13', 't14'] });
N(7, 't17', 7, 0, 'hyper', "Moteur d'hypersaut", { kind: 'k', core: 15, eff: { dmP: 25 }, req: ['t15', 't16'] });
N(7, 't18', 8, 0, 'inf', 'Surcharge tactique', { max: 0, eff: { allDmgP: 10, gainP: 5 }, req: ['t17'] });

/* ---------- SYNERGIES ENTRE BRANCHES ---------- */
bridge(0, 1, 'x1', 5.6, 'nuke', 'Obus explosifs', { max: 5, eff: { explosive: 6 }, req: ['a9', 'm7'] });
bridge(1, 2, 'x2', 5.6, 'arc', 'Ogive à plasma', { kind: 'k', core: 5, eff: { plasma: 1 }, req: ['m9', 'e6'], desc: "Les explosions de missiles projettent un arc électrique." });
bridge(2, 3, 'x3', 5.6, 'chain', 'Drones tesla', { kind: 'k', core: 5, eff: { droneArc: 1 }, req: ['e9', 'd10'], desc: 'Chaque drone lance son propre éclair toutes les 3 secondes.' });
bridge(3, 4, 'x4', 5.6, 'heal', 'Nano-essaim', { max: 5, eff: { droneRegen: 0.04 }, req: ['d11', 'b7'] });
bridge(4, 5, 'x5', 5.6, 'thorns', 'Bélier', { kind: 'k', core: 5, eff: { ram: 1 }, req: ['b10', 'p7'], desc: 'Percuter un ennemi lui inflige 8× les dégâts du canon, et te blesse 30% de moins.' });
bridge(5, 6, 'x6', 5.6, 'magnet', 'Écope cinétique', { max: 5, eff: { magnetP: 20, gainP: 8 }, req: ['p13', 'c7'] });
bridge(6, 7, 'x7', 5.6, 'gain', 'Prime de guerre', { max: 5, eff: { bountyP: 50 }, req: ['c10', 't7'] });
bridge(7, 0, 'x8', 5.6, 'crit', 'Ciblage prédictif', { kind: 'k', core: 5, eff: { homing: 1, critC: 5 }, req: ['t10', 'a7'], desc: 'Tes obus se courbent vers leur cible, et +5% de chance de critique.' });

/* ---------- CONSTELLATION (matière noire, survit à l'hypersaut) ---------- */
C(0, 'zf1', 1, 0, 'dmg', 'Rage stellaire', { max: 10, eff: { gDmgP: 25 } });
C(0, 'zf2', 2, -1, 'rate', 'Pulsar', { max: 10, eff: { gRateP: 8 }, req: ['zf1'] });
C(0, 'zf3', 2, 1, 'crit', 'Œil de la naine', { max: 10, eff: { gCritC: 2 }, req: ['zf1'] });
C(0, 'zf4', 3, 0, 'dmg', 'Supernova', { max: 10, eff: { gDmgP: 50 }, req: ['zf2', 'zf3'] });
C(0, 'zf5', 4, 0, 'gun', 'Arsenal fantôme', { kind: 'k', cost: 40, eff: { proj: 1 }, req: ['zf4'], desc: 'Un obus supplémentaire par salve, de façon permanente.' });
C(0, 'zf6', 5, 0, 'inf', 'Trou noir', { max: 0, eff: { gDmgP: 100 }, req: ['zf5'] });

C(1, 'zc1', 1, 0, 'hull', 'Coque stellaire', { max: 10, eff: { gHullP: 25 } });
C(1, 'zc2', 2, -1, 'armor', 'Plaques de neutronium', { max: 10, eff: { gArmor: 6 }, req: ['zc1'] });
C(1, 'zc3', 2, 1, 'regen', 'Soleil intérieur', { max: 10, eff: { gRegen: 0.2 }, req: ['zc1'] });
C(1, 'zc4', 3, 0, 'hull', 'Colosse', { max: 10, eff: { gHullP: 50 }, req: ['zc2', 'zc3'] });
C(1, 'zc5', 4, 0, 'revive', 'Éternité', { kind: 'k', cost: 40, eff: { gRevive: 1 }, req: ['zc4'], desc: 'Une résurrection de plus à chaque vol.' });
C(1, 'zc6', 5, 0, 'inf', 'Horizon des événements', { max: 0, eff: { gHullP: 100 }, req: ['zc5'] });

C(2, 'zg1', 1, 0, 'gain', "Pluie d'or", { max: 10, eff: { gGainP: 30 } });
C(2, 'zg2', 2, -1, 'core', 'Cœur de pulsar', { max: 10, eff: { gCoreP: 20 }, req: ['zg1'] });
C(2, 'zg3', 2, 1, 'income', 'Mine perpétuelle', { max: 10, eff: { gIncomeP: 50 }, req: ['zg1'] });
C(2, 'zg4', 3, 0, 'gain', 'Nébuleuse dorée', { max: 10, eff: { gGainP: 60 }, req: ['zg2', 'zg3'] });
C(2, 'zg5', 4, 0, 'interest', 'Remise cosmique', { max: 8, eff: { discount: 4 }, req: ['zg4'] });
C(2, 'zg6', 5, 0, 'inf', 'Singularité dorée', { max: 0, eff: { gGainP: 100 }, req: ['zg5'] });

C(3, 'zv1', 1, 0, 'speed', 'Vent solaire', { max: 8, eff: { gSpeedP: 5 } });
C(3, 'zv2', 2, -1, 'magnet', 'Attraction gravitationnelle', { max: 8, eff: { gMagnetP: 25 }, req: ['zv1'] });
C(3, 'zv3', 2, 1, 'cd', 'Relativité', { max: 8, eff: { gCdP: 3 }, req: ['zv1'] });
C(3, 'zv4', 3, 0, 'dash', 'Saut natif', { kind: 'k', cost: 12, eff: { dash: 1 }, req: ['zv2', 'zv3'], desc: "Le propulseur de saut est toujours installé, même après un hypersaut." });
C(3, 'zv5', 4, 0, 'portal', 'Carte stellaire', { max: 5, eff: { gStart: 3 }, req: ['zv4'] });

C(4, 'za1', 1, 0, 'analyze', 'Capital de départ', { max: 10, eff: { startUnits: 500 } });
C(4, 'za2', 2, -1, 'core', 'Noyaux de réserve', { max: 10, eff: { startCores: 5 }, req: ['za1'] });
C(4, 'za3', 2, 1, 'offline', 'Veille prolongée', { max: 6, eff: { offlineH: 4 }, req: ['za1'] });
C(4, 'za4', 3, 0, 'hyper', 'Auto-achat', { kind: 'k', cost: 8, eff: { autoBuy: 1 }, req: ['za2', 'za3'], desc: "Débloque l'achat automatique des améliorations en unités (activable dans l'arbre)." });
C(4, 'za5', 4, 0, 'interest', 'Marché noir', { max: 8, eff: { discount: 4 }, req: ['za4'] });

C(5, 'zs1', 1, 0, 'analyze', 'Mémoire des vols', { max: 8, eff: { dmP: 10 } });
C(5, 'zs2', 2, -1, 'missile', 'Armes héritées', { kind: 'k', cost: 6, eff: { missile: 1 }, req: ['zs1'], desc: 'Le lance-missiles reste installé pour toujours.' });
C(5, 'zs3', 2, 1, 'drone', 'Escorte fidèle', { kind: 'k', cost: 6, eff: { drones: 1 }, req: ['zs1'], desc: 'Un drone de plus, pour toujours.' });
C(5, 'zs4', 3, 0, 'arc', 'Foudre apprivoisée', { kind: 'k', cost: 10, eff: { arc: 1 }, req: ['zs2', 'zs3'], desc: "L'arc électrique reste installé pour toujours." });
C(5, 'zs5', 4, 0, 'hyper', 'Conscience du vide', { max: 0, eff: { dmP: 25 }, req: ['zs4'] });

/* =====================================================================
   ARBRE PROFOND : ces compétences n'ouvrent qu'après un ou deux hypersauts.
   ===================================================================== */
const ASC1 = 1, ASC2 = 2;

/* ---------- Armement ---------- */
N(0, 'a21', 9, -2, 'dmg', 'Obus à uranium', { asc: ASC1, max: 10, eff: { dmgP: 30 }, req: ['a20', 'a18'] });
N(0, 'a22', 9, 2, 'rate', 'Culasse rotative', { asc: ASC1, max: 10, eff: { rateP: 8 }, req: ['a20', 'a19'] });
N(0, 'a23', 10, -2, 'crit', 'Télémétrie quantique', { asc: ASC1, max: 10, eff: { critM: 25 }, req: ['a21'] });
N(0, 'a24', 10, 0, 'gun', 'Salve quintuple', { asc: ASC1, kind: 'k', core: 30, eff: { proj: 1 }, req: ['a21', 'a22'], desc: 'Ajoute un obus à chaque salve.' });
N(0, 'a25', 10, 2, 'pierce', 'Perforants lourds', { asc: ASC1, kind: 'n', max: 3, eff: { pierce: 1 }, req: ['a22'] });
N(0, 'a26', 11, -1, 'bounce', 'Ricochet dirigé', { asc: ASC2, kind: 'n', max: 3, eff: { ricochet: 1 }, req: ['a23', 'a24'] });
N(0, 'a27', 11, 1, 'exec', 'Coup de grâce', { asc: ASC2, max: 5, eff: { execP: 40 }, req: ['a24', 'a25'] });
N(0, 'a28', 12, 0, 'gun', 'Salve sextuple', { asc: ASC2, kind: 'k', core: 60, eff: { proj: 1 }, req: ['a26', 'a27'], desc: 'Ajoute un obus à chaque salve.' });

/* ---------- Missiles ---------- */
N(1, 'm18', 9, -2, 'dmg', 'Ogive à antimatière', { asc: ASC1, max: 10, eff: { missileDmgP: 30 }, req: ['m17'] });
N(1, 'm19', 9, 2, 'dmg', 'Mines à antimatière', { asc: ASC1, max: 10, eff: { mineDmgP: 30 }, req: ['m17'] });
N(1, 'm20', 10, -2, 'cd', 'Silo automatique', { asc: ASC1, max: 8, eff: { missileCdP: 3 }, req: ['m18'] });
N(1, 'm21', 10, 0, 'missile', 'Batterie stratégique', { asc: ASC1, kind: 'k', core: 30, eff: { missileN: 2 }, req: ['m18', 'm19'] });
N(1, 'm22', 10, 2, 'mine', 'Mines en essaim', { asc: ASC1, kind: 'n', max: 3, eff: { mineN: 1 }, req: ['m19'] });
N(1, 'm23', 11, -1, 'nuke', 'Frappe thermique', { asc: ASC2, max: 5, eff: { nuke: 6 }, req: ['m20', 'm21'] });
N(1, 'm24', 11, 1, 'cluster', 'Bombes à sous-munitions', { asc: ASC2, kind: 'n', max: 3, eff: { clusterN: 2 }, req: ['m21', 'm22'] });
N(1, 'm25', 12, 0, 'radius', 'Souffle stellaire', { asc: ASC2, kind: 'k', core: 60, eff: { missileRadP: 60, mineRadP: 60 }, req: ['m23', 'm24'] });

/* ---------- Énergie ---------- */
N(2, 'e19', 9, -2, 'dmg', 'Foudre globulaire', { asc: ASC1, max: 10, eff: { arcDmgP: 30 }, req: ['e18', 'e16'] });
N(2, 'e20', 9, 2, 'dmg', 'Nova stellaire', { asc: ASC1, max: 10, eff: { novaDmgP: 30 }, req: ['e18', 'e15'] });
N(2, 'e21', 10, -2, 'chain', "Réseau d'éclairs", { asc: ASC1, max: 6, eff: { arcChain: 1 }, req: ['e19'] });
N(2, 'e22', 10, 0, 'beam', 'Rayon lourd', { asc: ASC1, kind: 'k', core: 30, eff: { beamW: 2, beamDmgP: 100 }, req: ['e19', 'e20'] });
N(2, 'e23', 10, 2, 'radius', 'Nova géante', { asc: ASC1, max: 8, eff: { novaRadP: 10 }, req: ['e20'] });
N(2, 'e24', 11, -1, 'arc', 'Tempête', { asc: ASC2, kind: 'n', max: 2, eff: { arcBolts: 1 }, req: ['e21', 'e22'] });
N(2, 'e25', 11, 1, 'cd', 'Réacteur à fusion', { asc: ASC2, max: 8, eff: { novaCdP: 3, arcCdP: 3 }, req: ['e22', 'e23'] });
N(2, 'e26', 12, 0, 'range', 'Lance-soleil', { asc: ASC2, kind: 'k', core: 60, eff: { beamLenP: 60, beamDmgP: 100 }, req: ['e24', 'e25'] });

/* ---------- Drones ---------- */
N(3, 'd19', 9, -2, 'dmg', "Canons d'escorte", { asc: ASC1, max: 10, eff: { droneDmgP: 30 }, req: ['d17'] });
N(3, 'd20', 9, 2, 'rate', 'Noyau de calcul', { asc: ASC1, max: 10, eff: { droneRateP: 8 }, req: ['d17'] });
N(3, 'd21', 10, -2, 'range', 'Sondes lointaines', { asc: ASC1, max: 6, eff: { droneRangeP: 10 }, req: ['d19'] });
N(3, 'd22', 10, 0, 'drone', 'Sixième drone', { asc: ASC1, kind: 'k', core: 30, eff: { drones: 1 }, req: ['d19', 'd20'] });
N(3, 'd23', 10, 2, 'orbit', 'Lames lourdes', { asc: ASC1, max: 5, eff: { droneRam: 1 }, req: ['d20'] });
N(3, 'd24', 11, -1, 'dmg', "Essaim d'élite", { asc: ASC2, max: 10, eff: { droneDmgP: 40 }, req: ['d21', 'd22'] });
N(3, 'd25', 11, 1, 'heal', 'Nuée réparatrice', { asc: ASC2, max: 5, eff: { droneRegen: 0.04 }, req: ['d22', 'd23'] });
N(3, 'd26', 12, 0, 'drone', 'Septième drone', { asc: ASC2, kind: 'k', core: 60, eff: { drones: 1 }, req: ['d24', 'd25'] });

/* ---------- Blindage ---------- */
N(4, 'b20', 9, -2, 'hull', 'Cuirasse de neutrons', { asc: ASC1, max: 10, eff: { hullP: 40 }, req: ['b19'] });
N(4, 'b21', 9, 2, 'armor', 'Plaques de plasma', { asc: ASC1, max: 10, eff: { armor: 10 }, req: ['b19'] });
N(4, 'b22', 10, -2, 'shield', 'Bouclier stellaire', { asc: ASC1, max: 10, eff: { shieldP: 30 }, req: ['b20'] });
N(4, 'b23', 10, 0, 'revive', 'Troisième capsule', { asc: ASC1, kind: 'k', core: 40, eff: { revive: 1 }, req: ['b20', 'b21'] });
N(4, 'b24', 10, 2, 'dodge', 'Furtivité', { asc: ASC1, max: 5, eff: { dodge: 2 }, req: ['b21'] });
N(4, 'b25', 11, -1, 'regen', 'Réparateurs quantiques', { asc: ASC2, max: 5, eff: { regen: 0.1 }, req: ['b22', 'b23'] });
N(4, 'b26', 11, 1, 'repair', 'Recyclage', { asc: ASC2, max: 5, eff: { repairKill: 0.02 }, req: ['b23', 'b24'] });
N(4, 'b27', 12, 0, 'hull', 'Forteresse', { asc: ASC2, kind: 'k', core: 60, eff: { hullP: 200 }, req: ['b25', 'b26'] });

/* ---------- Propulsion ---------- */
N(5, 'p18', 9, -2, 'speed', 'Réacteurs à plasma', { asc: ASC1, max: 10, eff: { speedP: 2 }, req: ['p17'] });
N(5, 'p19', 9, 2, 'cd', 'Saut instantané', { asc: ASC1, max: 8, eff: { dashCdP: 4 }, req: ['p17'] });
N(5, 'p20', 10, -2, 'trail', 'Plasma stellaire', { asc: ASC1, max: 10, eff: { trailDmgP: 40 }, req: ['p18'] });
N(5, 'p21', 10, 0, 'charge', 'Saut de réserve', { asc: ASC1, kind: 'k', core: 30, eff: { dashCharges: 1 }, req: ['p18', 'p19'] });
N(5, 'p22', 10, 2, 'dmg', "Éperon d'acier", { asc: ASC1, max: 10, eff: { dashDmgP: 50 }, req: ['p19'] });
N(5, 'p23', 11, -1, 'speed', 'Énergie relativiste', { asc: ASC2, max: 5, eff: { speedDmg: 6 }, req: ['p20', 'p21'] });
N(5, 'p24', 11, 1, 'time', 'Réflexe de saut', { asc: ASC2, max: 5, eff: { dashReset: 4 }, req: ['p21', 'p22'] });
N(5, 'p25', 12, 0, 'dash', 'Bond stellaire', { asc: ASC2, kind: 'k', core: 60, eff: { dashLenP: 50, allDmgP: 50 }, req: ['p23', 'p24'] });

/* ---------- Collecte ---------- */
N(6, 'c20', 9, -2, 'gain', 'Fonds interstellaire', { asc: ASC1, max: 10, eff: { gainP: 30 }, req: ['c19'] });
N(6, 'c21', 9, 2, 'income', 'Raffinerie orbitale', { asc: ASC1, max: 10, eff: { incomeP: 50 }, req: ['c19'] });
N(6, 'c22', 10, -2, 'lucky', 'Jackpot galactique', { asc: ASC1, max: 8, eff: { jackpot: 1 }, req: ['c20'] });
N(6, 'c23', 10, 0, 'core', 'Mine de noyaux', { asc: ASC1, kind: 'n', max: 3, eff: { coreBoss: 2 }, req: ['c20', 'c21'] });
N(6, 'c24', 10, 2, 'offline', 'Entrepôt géant', { asc: ASC1, max: 3, eff: { offlineH: 4 }, req: ['c21'] });
N(6, 'c25', 11, -1, 'combo', 'Chaîne infinie', { asc: ASC2, max: 5, eff: { comboMaxP: 50 }, req: ['c22', 'c23'] });
N(6, 'c26', 11, 1, 'cargo', 'Flotte de cargos', { asc: ASC2, max: 5, eff: { cargoP: 30 }, req: ['c23', 'c24'] });
N(6, 'c27', 12, 0, 'interest', 'Banque centrale', { asc: ASC2, kind: 'k', core: 60, eff: { interest: 25 }, req: ['c25', 'c26'] });

/* ---------- Tactique ---------- */
N(7, 't19', 9, -2, 'boss', 'Anéantissement', { asc: ASC1, max: 10, eff: { bossP: 80 }, req: ['t18'] });
N(7, 't20', 9, 2, 'dmg', 'Doctrine totale', { asc: ASC1, max: 10, eff: { allDmgP: 15 }, req: ['t18'] });
N(7, 't21', 10, -2, 'slow', 'Gel tactique', { asc: ASC1, max: 3, eff: { slowAura: 5 }, req: ['t19'] });
N(7, 't22', 10, 0, 'hyper', 'Second moteur', { asc: ASC1, kind: 'k', core: 30, eff: { dmP: 50 }, req: ['t19', 't20'] });
N(7, 't23', 10, 2, 'elite', "Prime d'élite", { asc: ASC1, max: 10, eff: { eliteP: 40 }, req: ['t20'] });
N(7, 't24', 11, -1, 'sector', 'Balise rapide', { asc: ASC2, max: 3, eff: { sectorShort: 4 }, req: ['t21', 't22'] });
N(7, 't25', 11, 1, 'portal', 'Hyperportail', { asc: ASC2, max: 3, eff: { portalP: 10 }, req: ['t22', 't23'] });
N(7, 't26', 12, 0, 'dmg', 'Commandant suprême', { asc: ASC2, kind: 'k', core: 60, eff: { allDmgP: 100 }, req: ['t24', 't25'] });

/* ---------- Secondes synergies ---------- */
bridge(0, 1, 'y1', 10.5, 'nuke', 'Salve explosive', { asc: ASC1, max: 5, eff: { explosive: 6 }, req: ['a25', 'm20'] });
bridge(1, 2, 'y2', 10.5, 'arc', 'Frappe ionisée', { asc: ASC1, max: 5, eff: { missileDmgP: 40, arcDmgP: 40 }, req: ['m22', 'e21'] });
bridge(2, 3, 'y3', 10.5, 'chain', 'Drones à plasma', { asc: ASC1, max: 5, eff: { droneDmgP: 40, novaDmgP: 40 }, req: ['e23', 'd21'] });
bridge(3, 4, 'y4', 10.5, 'shield', "Égide d'essaim", { asc: ASC1, max: 5, eff: { droneRegen: 0.04, shieldP: 30 }, req: ['d23', 'b22'] });
bridge(4, 5, 'y5', 10.5, 'armor', 'Blindage cinétique', { asc: ASC1, max: 5, eff: { armor: 10, speedDmg: 4 }, req: ['b24', 'p20'] });
bridge(5, 6, 'y6', 10.5, 'magnet', 'Récolte éclair', { asc: ASC1, max: 5, eff: { magnetP: 30, gainP: 15 }, req: ['p22', 'c22'] });
bridge(6, 7, 'y7', 10.5, 'gain', 'Contrats de guerre', { asc: ASC1, max: 5, eff: { bountyP: 75 }, req: ['c24', 't21'] });
bridge(7, 0, 'y8', 10.5, 'crit', 'Visée stratégique', { asc: ASC1, max: 5, eff: { critC: 3, critM: 30 }, req: ['t23', 'a23'] });

/* ---------- Constellation étendue ---------- */
C(0, 'zf7', 5, -1.6, 'crit', 'Éclat stellaire', { max: 10, eff: { gCritC: 2 }, req: ['zf5'] });
C(0, 'zf8', 5, 1.6, 'rate', "Cadence d'étoile", { max: 10, eff: { gRateP: 10 }, req: ['zf5'] });
C(0, 'zf9', 6, 0, 'dmg', 'Ère du feu', { max: 10, eff: { gDmgP: 100 }, req: ['zf7', 'zf8'] });
C(0, 'zf10', 7, 0, 'gun', 'Arsenal céleste', { kind: 'k', cost: 150, eff: { proj: 1 }, req: ['zf9'], desc: 'Un obus supplémentaire par salve, de façon permanente.' });

C(1, 'zc7', 5, -1.6, 'armor', 'Peau de naine blanche', { max: 10, eff: { gArmor: 10 }, req: ['zc5'] });
C(1, 'zc8', 5, 1.6, 'regen', 'Chaleur solaire', { max: 10, eff: { gRegen: 0.2 }, req: ['zc5'] });
C(1, 'zc9', 6, 0, 'hull', 'Titan éternel', { max: 10, eff: { gHullP: 100 }, req: ['zc7', 'zc8'] });
C(1, 'zc10', 7, 0, 'revive', 'Renaissance', { kind: 'k', cost: 150, eff: { gRevive: 1 }, req: ['zc9'], desc: 'Une résurrection de plus à chaque vol.' });

C(2, 'zg7', 5, -1.6, 'core', 'Filon de noyaux', { max: 10, eff: { gCoreP: 30 }, req: ['zg5'] });
C(2, 'zg8', 5, 1.6, 'income', 'Empire minier', { max: 10, eff: { gIncomeP: 100 }, req: ['zg5'] });
C(2, 'zg9', 6, 0, 'gain', 'Âge d\'or', { max: 10, eff: { gGainP: 100 }, req: ['zg7', 'zg8'] });
C(2, 'zg10', 7, 0, 'interest', 'Prix cassés', { kind: 'k', cost: 150, eff: { discount: 10 }, req: ['zg9'] });

C(3, 'zv6', 5, -1.2, 'speed', 'Comète', { max: 5, eff: { gSpeedP: 5 }, req: ['zv5'] });
C(3, 'zv7', 5, 1.2, 'cd', 'Temps replié', { max: 6, eff: { gCdP: 3 }, req: ['zv5'] });
C(3, 'zv8', 6, 0, 'magnet', 'Puits gravitationnel', { max: 5, eff: { gMagnetP: 40 }, req: ['zv6', 'zv7'] });
C(3, 'zv9', 7, 0, 'portal', 'Atlas des secteurs', { max: 3, eff: { gStart: 5 }, req: ['zv8'] });

C(4, 'za6', 5, -1.2, 'analyze', 'Héritage', { max: 10, eff: { startUnits: 5000 }, req: ['za5'] });
C(4, 'za7', 5, 1.2, 'core', 'Coffre de noyaux', { max: 10, eff: { startCores: 10 }, req: ['za5'] });
C(4, 'za8', 6, 0, 'offline', 'Sommeil cryogénique', { max: 5, eff: { offlineH: 6 }, req: ['za6', 'za7'] });
C(4, 'za9', 7, 0, 'income', 'Fortune familiale', { kind: 'k', cost: 120, eff: { startUnits: 100000 }, req: ['za8'] });

C(5, 'zs6', 5, -1.2, 'analyze', 'Archives du vide', { max: 8, eff: { dmP: 15 }, req: ['zs4'] });
C(5, 'zs7', 5, 1.2, 'nova', 'Nova héritée', { kind: 'k', cost: 20, eff: { nova: 1 }, req: ['zs4'], desc: "L'émetteur de nova reste installé pour toujours." });
C(5, 'zs8', 6, 0, 'shield', 'Bouclier hérité', { kind: 'k', cost: 40, eff: { shield: 1 }, req: ['zs6', 'zs7'], desc: 'Le bouclier déflecteur reste installé pour toujours.' });
C(5, 'zs9', 7, 0, 'beam', 'Rayon hérité', { kind: 'k', cost: 120, eff: { beam: 1 }, req: ['zs8'], desc: 'Le rayon continu reste installé pour toujours.' });

/* Parents → enfants, calculés une fois pour le tracé. */
for (const n of NODES) n.parents = n.req.map(id => NODE_BY_ID[id]);
