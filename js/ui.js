'use strict';
/* Écrans, HUD, arbre de compétences, boucle principale. */

const $ = id => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches;

const UI = (() => {
  let screen = 'title';      // title | fly | pause | hangar | over
  let hangarFrom = 'title';  // d'où on vient quand on ferme l'arbre
  let optionsFrom = 'title';
  let hudTimer = 0;
  let helpTimer = 0;

  function show(id, on) { $(id).hidden = !on; }

  function setScreen(name) {
    screen = name;
    show('title', name === 'title');
    show('hud', name === 'fly' || name === 'pause');
    show('pause', name === 'pause');
    show('over', name === 'over');
    show('lobby', name === 'lobby');
    show('hangar', name === 'hangar');
    Coop.setLocalPause(Game.isFlying() && name !== 'fly');
    show('dashBtn', name === 'fly' && isTouch() && STATS.dash);
    if (name !== 'fly') $('hurt').className = '';
    if (name === 'title') refreshTitle();
    if (name === 'hangar') Tree.open();
    Music.setActive(name === 'fly'); // musique seulement en vol, jamais dans les menus
  }

  /* ---------- Vol ---------- */
  function launch() {
    Audio8.init();
    Audio8.applySettings();
    computeStats();
    if (Coop.role === 'guest') return; // c'est l'hôte qui lance le vol
    const start = validStartSector();
    setScreen('fly');
    if (Coop.role === 'host') Coop.startFlight(start);
    else Game.start(start);
    Save.write();
    if (!S.seenHelp) {
      S.seenHelp = true;
      const help = $('help');
      help.innerHTML = isTouch()
        ? 'Glisse le doigt pour <b>piloter</b>. Le tir est <b>automatique</b>. Ramasse les <b>unités</b> dorées : tu les dépenseras dans l\'<b>arbre</b>, de retour au hangar.'
        : '<b>ZQSD</b> ou <b>flèches</b> pour piloter. Le tir est <b>automatique</b>. Ramasse les <b>unités</b> dorées : tu les dépenseras dans l\'<b>arbre</b>, de retour au hangar.';
      help.hidden = false;
      helpTimer = 11;
    }
  }

  function pause() { if (screen === 'fly') setScreen('pause'); }
  function resume() { if (Game.isFlying()) { setScreen('fly'); } }

  function openHangar(from) {
    hangarFrom = from;
    setScreen('hangar');
  }
  function closeHangar() {
    Audio8.fx.click();
    if (hangarFrom === 'over') setScreen('over');
    else if (hangarFrom === 'lobby' && Coop.role) setScreen('lobby');
    else setScreen('title');
  }

  /* ---------- HUD ---------- */
  function updateHud(dt) {
    if (helpTimer > 0) {
      helpTimer -= dt;
      if (helpTimer <= 0) $('help').hidden = true;
    }
    hudTimer -= dt;
    if (hudTimer > 0) return;
    hudTimer = 0.08;
    const d = Game.hudData();
    if (!d) return;

    const hp = d.hull / d.maxHull;
    $('hullFill').style.width = `${clamp(hp * 100, 0, 100)}%`;
    $('hullFill').parentElement.classList.toggle('low', d.lowHull);
    $('hullText').textContent = `${fmt(Math.ceil(d.hull))}/${fmt(Math.ceil(d.maxHull))}`;
    $('hurt').classList.toggle('low', d.lowHull && screen === 'fly');

    $('shieldLine').hidden = d.maxShield <= 0;
    if (d.maxShield > 0) {
      $('shieldFill').style.width = `${clamp((d.shield / d.maxShield) * 100, 0, 100)}%`;
      $('shieldText').textContent = fmt(Math.ceil(d.shield));
    }
    $('mateLine').hidden = !d.mate;
    if (d.mate) {
      $('mateFill').style.width = `${clamp((d.mate.hull / d.mate.maxHull) * 100, 0, 100)}%`;
      $('mateFill').parentElement.classList.toggle('down', d.mate.dead);
      $('mateText').textContent = d.mate.dead ? 'À TERRE' : fmt(Math.ceil(d.mate.hull));
    }
    let coopText = '';
    if (Coop.role) {
      if (Coop.blocked() || (Coop.role === 'guest' && Coop.remotePaused)) coopText = 'PAUSE : ton coéquipier est dans un menu';
      else if (d.dead) coopText = d.rescue > 0 ? 'Réparation en cours…' : "À terre : ton coéquipier doit s'approcher pour te réparer";
      else if (d.mate && d.mate.dead) coopText = d.mate.rescue > 0 ? 'Réparation en cours, reste près de lui…' : 'Coéquipier à terre : va le rejoindre (flèche verte)';
    }
    $('coopStatus').hidden = !coopText;
    $('coopStatus').textContent = coopText;
    $('sectorText').textContent = `SECTEUR ${d.sector}`;
    $('progFill').style.width = `${d.prog * 100}%`;
    const revive = d.revives > 0 ? `  ·  ♥${d.revives}` : '';
    $('runStats').textContent = `${fmtTime(d.time)}  ·  ${fmt(d.kills)} épaves${revive}`;

    $('hudUnits').textContent = fmt(S.units);
    $('hudCores').textContent = fmt(S.cores);

    $('hudBoss').hidden = !d.boss;
    if (d.boss) {
      $('bossName').textContent = arcade(d.boss.name);
      $('bossFill').style.width = `${clamp((d.boss.hp / d.boss.maxHp) * 100, 0, 100)}%`;
    }
    $('comboText').textContent = d.comboBonus > 0.01 ? `COMBO +${Math.round(d.comboBonus * 100)}%` : '';
    $('frenzyText').textContent = d.frenzy > 1 ? `FRENESIE ${d.frenzy}` : '';

    if (d.dash) {
      const btn = $('dashBtn');
      btn.classList.toggle('empty', d.charges <= 0);
      btn.textContent = d.dashMax > 1 ? `SAUT ${d.charges}` : 'SAUT';
    }
  }

  function banner(title, sub, alert) {
    const el = $('banner');
    $('bannerTitle').textContent = arcade(title);
    $('bannerSub').textContent = sub || '';
    el.className = alert ? 'alert' : '';
    void el.offsetWidth; // relance l'animation
    el.classList.add('show');
  }
  const toastSeen = {};
  function toast(text) {
    const now = performance.now();
    if (toastSeen[text] && now - toastSeen[text] < 900) return;
    toastSeen[text] = now;
    const box = $('toasts');
    while (box.children.length >= 4) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }
  function hurtFlash() {
    const el = $('hurt');
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 60);
  }
  function bumpWallet() { /* la valeur du portefeuille est rafraîchie par le HUD */ }

  /* ---------- Bilan ---------- */
  function showOver(r) {
    const head = $('overTitle');
    head.textContent = r.lost ? 'LIAISON PERDUE' : r.abandoned ? 'RETOUR AU HANGAR' : 'VAISSEAU DETRUIT';
    head.classList.toggle('red', !r.abandoned);
    refreshOverButtons();
    const rows = [
      ['Temps de vol', fmtTime(r.time), ''],
      ['Secteur atteint', `${r.sector}${r.sector >= r.best ? ' (record)' : ''}`, ''],
      ['Épaves', fmt(r.kills), ''],
      ['Boss vaincus', fmt(r.bosses), ''],
      ['Unités gagnées', fmt(r.units), 'gold'],
    ];
    if (r.bonus > 0) rows.push(['Intérêts', `+${fmt(r.bonus)}`, 'gold']);
    if (r.cores > 0) rows.push(['Noyaux', `+${fmt(r.cores)}`, 'core']);
    rows.push(['Total en poche', fmt(S.units), 'gold']);
    $('overStats').innerHTML = rows.map(([k, v, c]) => `<div class="k">${k}</div><div class="v ${c}">${v}</div>`).join('');
    const n = affordableCount('ship');
    $('overHint').textContent = n > 0
      ? `${n} amélioration${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''} dans l'arbre !`
      : 'Continue : chaque épave rapproche la prochaine amélioration.';
    setScreen('over');
  }

  /* Sur le bilan aussi, on choisit d'où repartir. */
  function renderOverStart() {
    const show = startOptions().length > 1 && Coop.role !== 'guest';
    $('overSectorPick').hidden = !show;
    if (show) $('overSecValue').textContent = `SECTEUR ${validStartSector()}`;
  }

  function refreshOverButtons() {
    renderOverStart();
    const guest = Coop.role === 'guest';
    $('btnOverPlay').disabled = guest;
    $('btnOverPlay').textContent = guest ? "ATTENTE DE L'HOTE" : Coop.role === 'host' ? 'REDECOLLER ENSEMBLE' : 'REDECOLLER';
    $('btnOverLeave').hidden = !Coop.role;
  }
  function refreshAfterCoop() {
    refreshOverButtons();
    renderLobby();
    Tree.refreshTop(true);
  }

  /* ---------- Jouer à deux ---------- */
  function shareLink() {
    return `${location.origin}${location.pathname}?partie=${Coop.code}`;
  }
  function renderLobby() {
    const ready = Coop.state === 'ready';
    const hosting = Coop.role === 'host';
    const busy = Coop.state !== 'idle';
    $('lobbyChoice').hidden = busy;
    $('lobbyHost').hidden = !hosting || ready;
    $('lobbyCode').textContent = Coop.code;
    $('lobbyHostText').textContent = Coop.state === 'opening'
      ? 'Ouverture de la partie…'
      : 'Donne ce code à ton coéquipier :';
    $('btnCopyLink').hidden = Coop.state !== 'waiting' || !location.protocol.startsWith('http');
    let status = '';
    if (Coop.state === 'waiting') status = 'En attente de ton coéquipier…';
    else if (Coop.state === 'connecting') status = 'Connexion à la partie…';
    else if (ready) status = hosting ? 'Coéquipier connecté. Vous pouvez décoller !' : "Connecté. L'hôte lancera le vol.";
    $('lobbyStatus').textContent = status;
    $('lobbyError').textContent = Coop.message;
    $('btnCoopStart').hidden = !(ready && hosting);
    $('btnCoopTree').hidden = !ready;
    $('btnCoopBack').textContent = busy ? 'QUITTER' : 'RETOUR';
  }
  function openLobby() {
    renderLobby();
    setScreen('lobby');
  }

  /* ---------- Titre ---------- */
  function refreshTitle() {
    computeStats();
    const parts = [];
    if (S.runs > 0) parts.push(`Record : secteur ${S.bestEver}`);
    if (S.kills > 0) parts.push(`${fmt(S.kills)} épaves`);
    if (S.ascensions > 0) parts.push(`${S.ascensions} hypersaut${S.ascensions > 1 ? 's' : ''}`);
    const owned = NODES.filter(n => rank(n) > 0).length;
    if (owned) parts.push(`${owned}/${NODES.length} compétences`);
    $('titleStats').textContent = parts.join('  ·  ');
    $('btnPlay').textContent = S.runs > 0 ? 'REDECOLLER' : 'DECOLLER';
  }

  function drawTitleShip() {
    const c = $('titleShip');
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, c.width, c.height);
    const spr = Sprites.ship.n;
    const k = 8;
    const y = (c.height - spr.height * k) / 2 + Math.round(Math.sin(performance.now() / 500) * 4) * 2;
    x.drawImage(spr, (c.width - spr.width * k) / 2, y, spr.width * k, spr.height * k);
    if (Math.floor(performance.now() / 90) % 2 === 0) {
      x.fillStyle = '#ffe14a';
      x.fillRect(c.width / 2 - 8, y + spr.height * k, 16, 8);
      x.fillStyle = '#ff9d2e';
      x.fillRect(c.width / 2 - 4, y + spr.height * k + 8, 8, 8);
    }
  }

  /* ---------- Options ---------- */
  const OPTIONS = [
    { key: 'sound', label: 'Bruitages' },
    { key: 'music', label: 'Musique' },
    { key: 'aim', label: 'Visée', values: [['auto', 'Automatique'], ['mouse', 'Souris']] },
    { key: 'shake', label: "Tremblements de l'écran" },
    { key: 'crt', label: 'Effet écran cathodique' },
    { key: 'nums', label: 'Chiffres de dégâts' },
  ];
  function renderOptions() {
    const box = $('optionsList');
    box.innerHTML = '';
    for (const o of OPTIONS) {
      const b = document.createElement('button');
      b.className = 'opt';
      const val = S.set[o.key];
      const text = o.values ? o.values.find(v => v[0] === val)[1] : val ? 'OUI' : 'NON';
      const off = !o.values && !val;
      b.innerHTML = `<span>${o.label}</span><b class="${off ? 'off' : ''}">${text}</b>`;
      b.onclick = () => {
        if (o.values) {
          const i = o.values.findIndex(v => v[0] === S.set[o.key]);
          S.set[o.key] = o.values[(i + 1) % o.values.length][0];
        } else S.set[o.key] = !S.set[o.key];
        applySettings();
        Audio8.init();
        Audio8.fx.click();
        renderOptions();
        Save.write();
      };
      box.appendChild(b);
    }
  }
  function applySettings() {
    document.body.classList.toggle('no-crt', !S.set.crt);
    Audio8.applySettings();
  }
  function openOptions(from) {
    optionsFrom = from;
    renderOptions();
    show('options', true);
  }

  /* ---------- Confirmation ---------- */
  function confirmBox(title, text, yes, onYes) {
    $('dialogTitle').textContent = arcade(title);
    $('dialogText').textContent = text;
    $('dialogYes').textContent = yes;
    show('dialog', true);
    $('dialogYes').onclick = () => { show('dialog', false); onYes(); };
    $('dialogNo').onclick = () => { show('dialog', false); };
  }

  /* ---------- Touches ---------- */
  function bindKeys() {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (!$('dialog').hidden) { if (e.code === 'Escape') show('dialog', false); return; }
      if (!$('options').hidden) { if (e.code === 'Escape') show('options', false); return; }
      const key = e.key.toLowerCase();
      if (e.code === 'Escape' || key === 'p') {
        if (screen === 'fly') pause();
        else if (screen === 'pause') resume();
        else if (screen === 'hangar') closeHangar();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        if (screen === 'hangar') closeHangar();
        else if (screen === 'over') openHangar('over');
      } else if (key === 'm') {
        S.set.music = !S.set.music;
        S.set.sound = S.set.music;
        applySettings();
        toast(S.set.sound ? 'Son activé' : 'Son coupé');
      } else if (e.code === 'Enter') {
        if (screen === 'over' || screen === 'title') launch();
      }
    });
  }

  function bindButtons() {
    const on = (id, fn) => $(id).addEventListener('click', () => { Audio8.init(); fn(); });
    on('btnPlay', launch);
    on('btnTitleCoop', openLobby);
    on('btnCoopHost', () => Coop.host());
    on('btnCoopJoin', () => Coop.join($('joinCode').value));
    on('btnCoopStart', launch);
    on('btnCoopTree', () => openHangar('lobby'));
    on('btnCoopBack', () => {
      if (Coop.role) Coop.leave();
      setScreen('title');
    });
    on('btnOverLeave', () => {
      Coop.leave();
      setScreen('title');
    });
    on('btnCopyLink', async () => {
      try {
        await navigator.clipboard.writeText(shareLink());
        toast('Lien copié');
      } catch (err) {
        toast('Copie impossible : donne plutôt le code');
      }
    });
    $('joinCode').addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.code === 'Enter') { Audio8.init(); Coop.join($('joinCode').value); }
    });
    Coop.onChange = renderLobby;
    on('btnTitleTree', () => openHangar('title'));
    on('btnTitleOptions', () => openOptions('title'));
    on('btnResume', resume);
    on('btnPauseOptions', () => openOptions('pause'));
    on('btnAbandon', () => {
      if (Coop.role === 'guest') {
        confirmBox('QUITTER ?', 'Tu quittes la partie à deux. Toutes tes unités sont conservées.', 'QUITTER', () => {
          Coop.leave();
        });
        return;
      }
      const text = Coop.role === 'host'
        ? 'Le vol s\'arrête pour vous deux. Toutes les unités sont conservées.'
        : 'Le vol s\'arrête ici. Toutes tes unités sont conservées.';
      confirmBox('RENTRER ?', text, 'RENTRER', () => Game.abandon());
    });
    on('btnOverTree', () => openHangar('over'));
    on('btnOverPlay', launch);
    on('btnOptionsBack', () => show('options', false));
    on('btnWipe', () => {
      confirmBox('TOUT EFFACER ?', 'Unités, noyaux, matière noire, arbre : tout disparaîtra définitivement.', 'EFFACER', () => {
        if (Coop.role) Coop.leave();
        Save.wipe();
        computeStats();
        Game.clearAll();
        applySettings();
        show('options', false);
        setScreen('title');
      });
    });
    on('btnHudPause', pause);
    on('btnTreeBack', closeHangar);
    on('btnTreePlay', launch);
    on('tabShip', () => Tree.setTree('ship'));
    on('tabCons', () => Tree.setTree('cons'));
    on('btnCenter', () => Tree.center());
    on('btnZoomIn', () => Tree.zoomBy(1.25));
    on('btnZoomOut', () => Tree.zoomBy(0.8));
    const step = dir => { stepStartSector(dir); Tree.refreshTop(true); renderOverStart(); Save.write(); };
    on('secMinus', () => step(-1));
    on('secPlus', () => step(1));
    on('overSecMinus', () => step(-1));
    on('overSecPlus', () => step(1));
    $('autoBuyBox').addEventListener('change', e => { S.autoBuy = e.target.checked; Save.write(); });
    const dash = $('dashBtn');
    dash.addEventListener('pointerdown', e => { e.preventDefault(); Game.queueDash(); });
    // À deux, changer de fenêtre ne doit pas figer la partie de l'autre.
    window.addEventListener('blur', () => { if (screen === 'fly' && !Coop.role) pause(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Save.write(); if (screen === 'fly') pause(); }
    });
    window.addEventListener('beforeunload', () => Save.write());
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* Lien d'invitation : le code est déjà rempli, il ne reste qu'à rejoindre. */
  function handleInvite() {
    const invited = new URLSearchParams(location.search).get('partie');
    if (!invited) return;
    $('joinCode').value = Coop.cleanCode(invited);
    openLobby();
  }

  function getScreen() { return screen; }
  function isHangarFromFlight() { return Game.isFlying(); }

  return {
    setScreen, launch, updateHud, banner, toast, hurtFlash, bumpWallet, showOver, bindKeys, bindButtons, refreshAfterCoop, handleInvite,
    applySettings, refreshTitle, drawTitleShip, confirmBox, getScreen, isHangarFromFlight,
  };
})();

/* =====================================================================
   VUE DE L'ARBRE
   ===================================================================== */
const Tree = (() => {
  let cv, ctx, W = 0, H = 0, DPR = 1;
  let tree = 'ship';
  const cams = { ship: { x: 0, y: 0, z: 0.7 }, cons: { x: 0, y: 0, z: 0.9 } };
  let cam = cams.ship;
  let hover = null, selected = null;
  const fx = [];
  let panelKey = '';
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let t = 0;
  const bgStars = [];

  const SIZE = { m: 42, n: 50, k: 60, i: 60 };

  function init() {
    cv = $('treeCanvas');
    ctx = cv.getContext('2d');
    for (let i = 0; i < 260; i++) {
      bgStars.push({ x: rnd(-2200, 2200), y: rnd(-2200, 2200), d: rnd(0.25, 0.7), s: Math.random() < 0.15 ? 2 : 1 });
    }
    window.addEventListener('resize', resize);
    bindPointer();
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = Math.max(1, W * DPR);
    cv.height = Math.max(1, H * DPR);
  }

  function open() {
    resize();
    panelKey = '';
    setTree(tree);
    refreshTop(true);
  }
  function setTree(name) {
    tree = name;
    cam = cams[name];
    hover = null;
    selected = null;
    panelKey = '';
    $('tabShip').classList.toggle('active', name === 'ship');
    $('tabCons').classList.toggle('active', name === 'cons');
    if (!cam.fitted) { fit(); cam.fitted = true; }
    $('treeHint').textContent = isTouch()
      ? ''
      : 'Clic : acheter  ·  Maj+clic : acheter au maximum  ·  Molette : zoom  ·  Glisser : se déplacer';
  }
  function panelWidth() { return W > 760 ? 354 : 0; }
  function center() { fit(); }
  function fit() {
    const narrow = W <= 760;
    const avail = narrow ? Math.min(W, H * 0.52) : Math.min(W - panelWidth(), H - 70);
    cam.z = clamp(avail / (tree === 'ship' ? 1130 : 1000), 0.3, 1.1);
    cam.x = panelWidth() / 2 / cam.z;
    cam.y = (narrow ? H * 0.16 : -24) / cam.z;
  }
  function zoomBy(f, sx = (W - panelWidth()) / 2, sy = H / 2) {
    const before = toWorld(sx, sy);
    cam.z = clamp(cam.z * f, 0.18, 2.2);
    const after = toWorld(sx, sy);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }

  const toWorld = (sx, sy) => ({ x: (sx - W / 2) / cam.z + cam.x, y: (sy - H / 2) / cam.z + cam.y });
  const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });

  function nodeAt(sx, sy) {
    const w = toWorld(sx, sy);
    let best = null, bestD = Infinity;
    for (const n of NODES) {
      if (n.tree !== tree) continue;
      const half = SIZE[n.kind] / 2 + 3;
      const dx = Math.abs(n.x - w.x), dy = Math.abs(n.y - w.y);
      if (dx <= half && dy <= half) {
        const d = dx + dy;
        if (d < bestD) { bestD = d; best = n; }
      }
    }
    return best;
  }

  /* ---------- Pointeur ---------- */
  function bindPointer() {
    const pos = e => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    cv.addEventListener('pointerdown', e => {
      const at = pos(e);
      pointers.set(e.pointerId, at);
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
      if (pointers.size === 1) {
        drag = { x: at.x, y: at.y, camX: cam.x, camY: cam.y, moved: false, type: e.pointerType };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
        drag = null;
      }
    });
    cv.addEventListener('pointermove', e => {
      const at = pos(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, at);
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomBy(d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch.d = d;
        return;
      }
      if (drag) {
        const dx = at.x - drag.x, dy = at.y - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 6) {
          drag.moved = true;
          cv.classList.add('dragging');
        }
        if (drag.moved) {
          cam.x = clamp(drag.camX - dx / cam.z, -1900, 1900);
          cam.y = clamp(drag.camY - dy / cam.z, -1900, 1900);
        }
        return;
      }
      if (e.pointerType === 'mouse') {
        hover = nodeAt(at.x, at.y);
        cv.classList.toggle('pointing', !!hover);
      }
    });
    const up = e => {
      const at = pos(e);
      pointers.delete(e.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
      cv.classList.remove('dragging');
      if (drag && !drag.moved) click(at, e);
      drag = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; });
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = null; });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const at = pos(e);
      zoomBy(e.deltaY < 0 ? 1.13 : 0.885, at.x, at.y);
    }, { passive: false });
  }

  function click(at, e) {
    const n = nodeAt(at.x, at.y);
    if (!n) { selected = null; return; }
    selected = n;
    if (e.pointerType === 'mouse') {
      purchase(n, e.shiftKey);
    } else {
      Audio8.fx.click();
    }
  }

  function purchase(n, max) {
    Audio8.init();
    if (!canBuy(n)) { Audio8.fx.deny(); return false; }
    const before = rank(n);
    if (max) buyMax(n); else buyNode(n);
    if (rank(n) > before) {
      Audio8.fx.buy();
      fx.push({ x: n.x, y: n.y, t: 0, c: n.branch.color });
      panelKey = '';
      Game.onStatsChanged();
      refreshTop(true);
      Save.write();
      return true;
    }
    return false;
  }

  /* ---------- Barre du haut ---------- */
  let lastTop = '';
  function refreshTop(force) {
    const key = `${Math.floor(S.units)}|${S.cores}|${S.dm}|${S.startSector}|${S.best}`;
    if (!force && key === lastTop) return;
    lastTop = key;
    $('treeUnits').textContent = fmt(S.units);
    $('treeCores').textContent = fmt(S.cores);
    $('treeDm').textContent = fmt(S.dm);
    $('dmChip').hidden = S.dm <= 0 && S.ascensions === 0 && !hyperReady();

    const inc = incomePerSec();
    $('incomeChip').hidden = inc <= 0;
    if (inc > 0) $('incomeChip').textContent = `+${fmt(inc)}/s`;

    $('autoBuyWrap').hidden = !STATS.autoBuy;
    $('autoBuyBox').checked = !!S.autoBuy;

    const waitHost = Coop.role === 'guest';
    $('btnTreePlay').disabled = waitHost;
    $('btnTreePlay').textContent = waitHost ? "ATTENTE DE L'HOTE" : 'DECOLLER';
    const showPick = startOptions().length > 1 && !waitHost;
    $('sectorPick').hidden = !showPick;
    if (showPick) {
      $('secValue').textContent = `SECTEUR ${validStartSector()}`;
    }
  }

  /* ---------- Panneau d'information ---------- */
  function curLabel(cur) {
    return cur === 'u' ? 'U' : cur === 'c' ? '◆' : '✦';
  }
  function kindLabel(n) {
    if (n.kind === 'k') return 'Clé de voûte';
    if (n.kind === 'i') return 'Amélioration infinie';
    if (n.kind === 'n') return 'Notable';
    return 'Mineure';
  }

  function effectLines(n, r) {
    const out = [];
    for (const key in n.eff) {
      const label = STAT_LABELS[key];
      if (label) out.push(label(+(n.eff[key] * r).toFixed(2)));
    }
    return out;
  }

  function renderNode(n) {
    const r = rank(n);
    const color = n.branch.color;
    const parts = [];
    parts.push(`<h3 style="color:${color}">${arcade(n.name)}</h3>`);
    parts.push(`<div class="np-tag">${n.branch.name} · ${kindLabel(n)}</div>`);
    if (n.desc) parts.push(`<div class="np-desc">${n.desc}</div>`);

    const showEffects = !n.desc || n.max !== 1;
    if (showEffects) {
      const lines = effectLines(n, 1);
      const multi = n.max !== 1;
      const totals = r > 0 && multi ? effectLines(n, r) : [];
      parts.push('<ul class="np-eff">');
      for (const l of lines) parts.push(`<li>${l}${multi ? ' par rang' : ''}</li>`);
      for (const l of totals) parts.push(`<li class="total">Actuel : ${l}</li>`);
      parts.push('</ul>');
    }

    if (n.max > 1) {
      parts.push(`<div class="np-rank" style="--c:${color}">`);
      for (let i = 0; i < n.max; i++) parts.push(`<i class="${i < r ? 'on' : ''}"></i>`);
      parts.push('</div>');
    } else if (n.max === 0) {
      parts.push(`<div class="np-rank-text">Rang ${r} — sans limite</div>`);
    }

    if (isMaxed(n)) {
      parts.push('<div class="np-max">MAXIMUM ATTEINT</div>');
    } else if (!isUnlocked(n)) {
      if (n.asc && S.ascensions < n.asc) {
        parts.push(`<div class="np-req">Requiert : ${n.asc} hypersaut${n.asc > 1 ? 's' : ''} (déjà fait${S.ascensions > 1 ? 's' : ''} : ${S.ascensions})</div>`);
      }
      const need = n.parents.filter(p => rank(p) === 0).map(p => p.name);
      const glue = n.all ? ' et ' : ' ou ';
      if (need.length) parts.push(`<div class="np-req">Requiert : ${need.join(glue)}</div>`);
      const c = nodeCost(n);
      parts.push(`<div class="np-cost">${curLabel(n.cur)} ${fmt(c)}</div>`);
    } else {
      const c = nodeCost(n);
      const ok = wallet(n.cur) >= c;
      parts.push(`<div class="np-cost"><span class="${ok ? `can ${n.cur}` : 'cant'}">${curLabel(n.cur)} ${fmt(c)}</span></div>`);
      parts.push('<div class="np-actions">');
      parts.push(`<button class="btn primary small" id="npBuy" ${ok ? '' : 'disabled'}>ACHETER</button>`);
      if (n.max !== 1) parts.push(`<button class="btn small" id="npMax" ${ok ? '' : 'disabled'}>MAX</button>`);
      parts.push('</div>');
    }
    return parts.join('');
  }

  function statRow(k, v) { return `<div class="st-row"><span>${k}</span><span>${v}</span></div>`; }
  const pctStr = v => `${Math.round(v * 100)}%`;

  function renderStats() {
    const st = STATS;
    const avgCrit = 1 + st.critC * (st.critM - 1);
    const dps = st.cannonDmg * st.rate * st.salvo * avgCrit;
    const out = [];
    const owned = NODES.filter(n => n.tree === tree && rank(n) > 0).length;
    const total = NODES.filter(n => n.tree === tree).length;

    if (tree === 'cons') out.push(renderHyper());

    out.push(`<h3 style="color:var(--cyan)">${tree === 'ship' ? 'TON VAISSEAU' : 'BONUS PERMANENTS'}</h3>`);
    out.push(`<div class="np-tag">${owned}/${total} compétences acquises — ${isTouch() ? 'touche' : 'survole'} une case pour la détailler.</div>`);
    out.push('<div class="st-group">CANON</div>');
    out.push(statRow('Dégâts / seconde', fmt(dps)));
    out.push(statRow('Dégâts par obus', fmt(st.cannonDmg)));
    out.push(statRow('Cadence', `${fmt(st.rate)}/s`));
    out.push(statRow('Obus par salve', st.salvo));
    out.push(statRow('Critique', `${pctStr(st.critC)} (×${st.critM.toFixed(2).replace('.', ',')})`));
    if (st.pierce) out.push(statRow('Perforation', st.pierce));
    if (st.ricochet) out.push(statRow('Ricochets', st.ricochet));

    const extra = [];
    if (st.missile) extra.push(statRow('Missiles', `${fmt(st.missileDmg)} ×${st.missileN} / ${fmt(st.missileCd)} s`));
    if (st.mine) extra.push(statRow('Mines', `${fmt(st.mineDmg)} / ${fmt(st.mineCd)} s`));
    if (st.arc) extra.push(statRow('Arc', `${fmt(st.arcDmg)} / ${fmt(st.arcCd)} s`));
    if (st.nova) extra.push(statRow('Nova', `${fmt(st.novaDmg)} / ${fmt(st.novaCd)} s`));
    if (st.beam) extra.push(statRow('Rayon', `${fmt(st.beamDps)}/s`));
    if (st.drones) extra.push(statRow('Drones', `${st.drones} × ${fmt(st.droneDmg)}`));
    if (extra.length) { out.push('<div class="st-group">SYSTEMES</div>'); out.push(...extra); }

    out.push('<div class="st-group">SURVIE</div>');
    out.push(statRow('Coque', fmt(st.maxHull)));
    if (st.shield) out.push(statRow('Bouclier', fmt(st.maxHull * st.shieldMul)));
    if (st.armor) out.push(statRow('Réduction des dégâts', pctStr(1 - st.armorMul)));
    if (st.regen) out.push(statRow('Réparation', `${(st.regen * 100).toFixed(2).replace('.', ',')}%/s`));
    if (st.dodge) out.push(statRow('Esquive', pctStr(st.dodge)));
    if (st.revive) out.push(statRow('Résurrections', st.revive));

    out.push('<div class="st-group">BUTIN</div>');
    out.push(statRow('Multiplicateur', `×${st.gainMul.toFixed(2).replace('.', ',')}`));
    out.push(statRow('Aimant', fmt(st.magnet)));
    const inc = incomePerSec();
    if (inc > 0) out.push(statRow('Revenu passif', `${fmt(inc)}/s`));
    out.push(statRow('Meilleur secteur', S.best));

    if (tree === 'ship') {
      out.push('<div class="st-actions"><button id="npRespec" class="btn small">TOUT REMBOURSER</button></div>');
    }
    return out.join('');
  }

  function renderHyper() {
    const gain = hyperGain();
    const ready = hyperReady();
    const txt = ready
      ? `Détruis tout l'arbre (pas la Constellation) et repars du secteur 1, plus fort. Tu gagnes <b style="color:var(--dark)">✦ ${fmt(gain)}</b>.`
      : `Vaincs le boss du secteur ${HYPER_BOSS_SECTOR} pour l'activer. Record actuel : secteur ${S.best}.`;
    return `<div class="hyper-card"><h3>HYPERSAUT</h3><p>${txt}</p><button id="npHyper" class="btn ${ready ? 'primary' : ''} small" ${ready ? '' : 'disabled'}>LANCER L'HYPERSAUT</button></div>`;
  }

  function updatePanel() {
    const n = hover || selected;
    let key;
    if (n) {
      const c = nodeCost(n);
      key = `n|${n.id}|${rank(n)}|${wallet(n.cur) >= c}|${isUnlocked(n)}`;
    } else {
      key = `s|${tree}|${hyperReady()}|${hyperGain()}|${Math.round(STATS.maxHull)}|${Math.round(incomePerSec())}`;
    }
    if (key === panelKey) return;
    panelKey = key;
    const box = $('nodePanel');
    box.innerHTML = n ? renderNode(n) : renderStats();

    const buy = $('npBuy');
    if (buy) buy.onclick = () => purchase(n, false);
    const max = $('npMax');
    if (max) max.onclick = () => purchase(n, true);
    const res = $('npRespec');
    if (res) {
      res.onclick = () => UI.confirmBox('TOUT REMBOURSER ?', 'Toutes les compétences de l\'arbre sont retirées et tu récupères 100% des unités et des noyaux dépensés.', 'REMBOURSER', () => {
        respec();
        Game.onStatsChanged();
        panelKey = '';
        refreshTop(true);
      });
    }
    const hyp = $('npHyper');
    if (hyp) {
      hyp.onclick = () => UI.confirmBox('HYPERSAUT ?', `Tes unités, tes noyaux et tout l'arbre seront remis à zéro. La Constellation reste. Tu gagnes ✦ ${fmt(hyperGain())}.`, 'SAUTER', () => {
        const gain = doHyper();
        Audio8.init();
        Audio8.fx.hyper();
        UI.toast(`+${fmt(gain)} matière noire`);
        panelKey = '';
        refreshTop(true);
      });
    }
  }

  /* ---------- Dessin ---------- */
  function chamfer(x, y, s, c) {
    const h = s / 2;
    ctx.beginPath();
    ctx.moveTo(x - h + c, y - h);
    ctx.lineTo(x + h - c, y - h);
    ctx.lineTo(x + h, y - h + c);
    ctx.lineTo(x + h, y + h - c);
    ctx.lineTo(x + h - c, y + h);
    ctx.lineTo(x - h + c, y + h);
    ctx.lineTo(x - h, y + h - c);
    ctx.lineTo(x - h, y - h + c);
    ctx.closePath();
  }

  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* Icône teintée, mise en cache par couleur. */
  const tintCache = {};
  function tinted(icon, color) {
    const key = icon + color;
    if (tintCache[key]) return tintCache[key];
    const src = Icons[icon] || Icons.dmg;
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, 8, 8);
    tintCache[key] = c;
    return c;
  }

  function drawLines() {
    for (const n of NODES) {
      if (n.tree !== tree) continue;
      const a = toScreen(n.x, n.y);
      const col = n.branch.color;
      const parents = n.parents.length ? n.parents : [null];
      for (const par of parents) {
        const b = par ? toScreen(par.x, par.y) : toScreen(0, 0);
        const parentOwned = par ? rank(par) > 0 : true;
        const selfOwned = rank(n) > 0;
        let stroke, w;
        if (selfOwned && parentOwned) { stroke = col; w = 4; }
        else if (parentOwned) { stroke = hexA(col, 0.38); w = 2.5; }
        else { stroke = 'rgba(70,76,120,0.28)'; w = 2; }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = w * Math.max(0.6, cam.z);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  function drawNode(n) {
    const pos = toScreen(n.x, n.y);
    const size = SIZE[n.kind] * cam.z;
    const half = size / 2;
    if (pos.x < -size * 3 || pos.x > W + size * 3 || pos.y < -size * 3 || pos.y > H + size * 3) return;

    const r = rank(n);
    const unlocked = isUnlocked(n);
    const maxed = isMaxed(n);
    const afford = canBuy(n);
    const col = n.branch.color;
    const cut = n.kind === 'k' || n.kind === 'i' ? size * 0.28 : size * 0.14;
    const isHover = n === hover || n === selected;

    let fill, border, iconCol, bw = 2;
    if (maxed) { fill = col; border = '#ffffff'; iconCol = '#05060f'; }
    else if (r > 0) { fill = hexA(col, 0.3); border = col; iconCol = '#ffffff'; bw = 3; }
    else if (afford) { fill = '#1a1f3e'; border = col; iconCol = col; bw = 3; }
    else if (unlocked) { fill = '#10132a'; border = hexA(col, 0.55); iconCol = hexA(col, 0.75); }
    else { fill = '#0a0c1a'; border = '#262a48'; iconCol = '#3c4064'; }

    if (afford) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = hexA(col, 0.16 + pulse * 0.2);
      chamfer(pos.x, pos.y, size + (8 + pulse * 6) * cam.z, cut);
      ctx.fill();
    }

    chamfer(pos.x, pos.y, size, cut);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = bw * Math.max(0.7, cam.z);
    ctx.strokeStyle = isHover ? '#ffffff' : border;
    ctx.stroke();

    if (n.kind === 'k' || n.kind === 'i') {
      chamfer(pos.x, pos.y, size - 9 * cam.z, cut * 0.7);
      ctx.lineWidth = Math.max(1, cam.z);
      ctx.strokeStyle = n.kind === 'i' ? hexA('#ffffff', 0.5) : hexA(maxed ? '#05060f' : col, 0.5);
      ctx.stroke();
    }

    const scale = Math.max(1, Math.round((size * 0.62) / 8));
    const ic = 8 * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tinted(n.icon, iconCol), Math.round(pos.x - ic / 2), Math.round(pos.y - ic / 2), ic, ic);

    if (cam.z > 0.45 && n.max !== 1 && (r > 0 || unlocked)) {
      const txt = n.max === 0 ? `${r}` : `${r}/${n.max}`;
      ctx.font = `${Math.round(17 * Math.max(0.8, cam.z))}px VT323, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + 6;
      const bx = pos.x + half - w * 0.6, by = pos.y + half - 2;
      ctx.fillStyle = '#05060f';
      ctx.fillRect(bx - w / 2, by - 7, w, 14);
      ctx.fillStyle = maxed ? '#ffd84a' : '#ffffff';
      ctx.fillText(txt, bx, by);
    }

    if (cam.z > 0.72 || isHover) {
      ctx.font = `${Math.round(18 * Math.max(0.85, Math.min(cam.z, 1.2)))}px VT323, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const y = pos.y + half + 8 * cam.z;
      ctx.fillStyle = 'rgba(5,6,15,0.78)';
      const tw = ctx.measureText(n.name).width + 6;
      ctx.fillRect(pos.x - tw / 2, y - 1, tw, 17 * Math.max(0.85, Math.min(cam.z, 1.2)));
      ctx.fillStyle = unlocked ? (afford || r > 0 ? '#ffffff' : '#a6accf') : '#5c6088';
      ctx.fillText(n.name, pos.x, y);
    }
  }

  function drawCenter() {
    const c = toScreen(0, 0);
    const rad = 62 * cam.z;
    ctx.strokeStyle = '#2c3056';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, rad, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#0a0c1c';
    ctx.fill();
    const spr = Sprites.ship.n;
    const k = Math.max(1, Math.round(4 * cam.z));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, Math.round(c.x - (spr.width * k) / 2), Math.round(c.y - (spr.height * k) / 2), spr.width * k, spr.height * k);
  }

  /* Les cercles qui marquent où commence l'arbre profond. */
  const DEPTH_RINGS = [
    { radius: 1018, asc: 1, text: 'APRÈS 1 HYPERSAUT' },
    { radius: 1262, asc: 2, text: 'APRÈS 2 HYPERSAUTS' },
  ];
  function drawDepthRings() {
    if (tree !== 'ship') return;
    const c = toScreen(0, 0);
    for (const ring of DEPTH_RINGS) {
      if (S.ascensions >= ring.asc) continue;
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(154,168,255,0.45)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, ring.radius * cam.z, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  /* Le texte passe après les cases, pour rester lisible. */
  function drawDepthLabels() {
    if (tree !== 'ship') return;
    const c = toScreen(0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(13, Math.round(24 * cam.z))}px VT323, monospace`;
    for (const ring of DEPTH_RINGS) {
      if (S.ascensions >= ring.asc) continue;
      // En haut à droite du cercle, à l'écart des branches.
      const a = (-67.5 * Math.PI) / 180 + 0.2;
      const x = c.x + Math.cos(a) * ring.radius * cam.z, y = c.y + Math.sin(a) * ring.radius * cam.z;
      const w = ctx.measureText(ring.text).width + 10;
      ctx.fillStyle = '#05060f';
      ctx.fillRect(x - w / 2, y - 11, w, 22);
      ctx.fillStyle = '#9aa8ff';
      ctx.fillText(ring.text, x, y);
    }
  }

  function drawLabels() {
    const list = tree === 'ship' ? BRANCHES : CONS_BRANCHES;
    const reach = tree === 'ship' ? 158 : 118; // entre le vaisseau et la première case de chaque branche
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const px = Math.max(14, Math.round(22 * cam.z));
    ctx.font = `${px}px VT323, monospace`;
    for (const b of list) {
      const a = (b.angle * Math.PI) / 180;
      const pos = toScreen(Math.cos(a) * reach, Math.sin(a) * reach);
      const w = ctx.measureText(b.name).width + 8;
      ctx.fillStyle = '#05060f';
      ctx.fillRect(pos.x - w / 2, pos.y - px / 2 - 1, w, px + 1);
      ctx.fillStyle = b.color;
      ctx.fillText(b.name, pos.x, pos.y);
    }
  }

  function draw(dt) {
    t += dt;
    if (!W) resize();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = tree === 'ship' ? '#05060f' : '#070518';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#39406e';
    for (const s of bgStars) {
      const x = (s.x - cam.x * s.d) * cam.z * s.d + W / 2;
      const y = (s.y - cam.y * s.d) * cam.z * s.d + H / 2;
      if (x < 0 || x > W || y < 0 || y > H) continue;
      ctx.fillRect(x, y, s.s, s.s);
    }

    drawDepthRings();
    drawLines();
    drawCenter();
    for (const n of NODES) if (n.tree === tree) drawNode(n);
    drawLabels();
    drawDepthLabels();

    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      const pos = toScreen(f.x, f.y);
      const k = f.t / 0.45;
      if (k >= 1) { fx.splice(i, 1); continue; }
      chamfer(pos.x, pos.y, (50 + k * 90) * cam.z, 10 * cam.z);
      ctx.lineWidth = 3;
      ctx.strokeStyle = hexA(f.c, 1 - k);
      ctx.stroke();
    }
    updatePanel();
    refreshTop();
  }

  return { init, open, setTree, draw, center, zoomBy, refreshTop, resize };
})();

/* =====================================================================
   DÉMARRAGE & BOUCLE
   ===================================================================== */
(function main() {
  Save.load();
  computeStats();
  initSprites();
  initIcons();

  Game.init($('game'));
  Tree.init();
  UI.bindKeys();
  UI.bindButtons();
  UI.applySettings();
  UI.setScreen('title');
  UI.handleInvite();

  // Revenu hors ligne
  const away = claimOffline();
  if (away >= 1) {
    setTimeout(() => UI.toast(`Pendant ton absence : +${fmt(away)} unités`), 400);
  }

  // Revenu passif et auto-achat, indépendants de l'affichage.
  let lastIncome = Date.now();
  setInterval(() => {
    const now = Date.now();
    const elapsed = Math.min((now - lastIncome) / 1000, STATS.offlineH * 3600);
    lastIncome = now;
    const inc = incomePerSec();
    if (inc > 0) {
      const g = inc * elapsed;
      S.units += g;
      S.lifeUnits += g;
      S.ascUnits += g;
    }
    const n = Game.isFlying() ? 0 : autoBuyTick();
    if (n > 0) Game.onStatsChanged();
  }, 1000);

  setInterval(() => Save.write(), 10000);

  let last = performance.now();
  function advance(now) {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    const scr = UI.getScreen();
    if (scr === 'hangar') {
      Tree.draw(dt);
    } else {
      Game.frame(dt, scr === 'fly' && !Coop.blocked());
      if (scr === 'fly' || scr === 'pause') UI.updateHud(dt);
      if (scr === 'title') UI.drawTitleShip();
    }
    Coop.tick(dt);
  }
  function frame(now) {
    requestAnimationFrame(frame); // d'abord : une erreur ponctuelle ne doit pas figer tout le jeu
    advance(now);
  }
  requestAnimationFrame(frame);

  // À deux, la partie continue même si le navigateur cesse de dessiner cette fenêtre.
  setInterval(() => {
    const now = performance.now();
    if (Coop.role && now - last > 200) advance(now);
  }, 50);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker :', err));
  }
})();
