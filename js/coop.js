'use strict';
/* =====================================================================
   COOPÉRATION EN LIGNE (2 joueurs)

   L'hôte fait tourner toute la partie. L'invité ne simule que son propre
   pilotage, pour répondre sans délai, et reçoit le reste :
   - "rt"  : images du monde 20 fois par seconde, en binaire compact ;
   - "ctl" : messages fiables en JSON (effets, gains, début et fin de vol).

   La liaison est directe entre les deux appareils (WebRTC). Le service
   PeerJS ne sert qu'à se trouver grâce au code de partie.
   ===================================================================== */
const Coop = (() => {
  const PROTOCOL = 3;
  const PREFIX = 'spacex-coop-v1-';
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const CODE_LENGTH = 4;
  const JOIN_TIMEOUT_MS = 20000;
  const SILENCE_LIMIT_MS = 15000;
  const SNAPSHOT_INTERVAL = 1 / 20;
  const AWARD_INTERVAL = 0.5;
  const POSITION_INTERVAL = 1 / 30;
  const MAX_BUFFERED = 256 * 1024;

  const ENEMY_NAMES = Object.keys(ENEMY_TYPES);
  const BOSS_OFFSET = 20;
  const PLAYER_BULLET_COLORS = ['#fff27a', '#ffb24a', '#9cffb0', '#7ff0ff'];
  const ENEMY_BULLET_COLORS = ['#ff5a8a', '#ffb24a', '#ffe14a', '#6cf06c', '#ff9d2e', '#d86cff', '#ff6cd0'];
  const NOVA_COLORS = ['#7ff0ff', '#4ad6ff', '#ffffff'];

  let role = null;      // null | 'host' | 'guest'
  let state = 'idle';   // idle | opening | waiting | connecting | ready
  let message = '';
  let code = '';
  let peer = null, ctl = null, rt = null;
  let mateInfo = null;  // statistiques et taille d'écran de l'autre joueur
  let localPaused = false, remotePaused = false;
  let lastHeard = 0;
  let joinTimer = null, pingTimer = null;
  let events = [];
  let snapT = 0, awardT = 0, posT = 0;
  let seq = 0, lastSeq = -1;
  let onChange = () => {};

  /* ---------- Salon ---------- */
  function notify(nextState, text = '') {
    state = nextState;
    message = text;
    onChange();
  }
  function makeCode() {
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return out;
  }
  const cleanCode = text => String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

  function peerSupported() { return typeof Peer !== 'undefined' && !!window.RTCPeerConnection; }

  function host() {
    if (!peerSupported()) { notify('idle', "Ce navigateur ne permet pas de jouer en ligne."); return; }
    reset();
    role = 'host';
    code = makeCode();
    notify('opening');
    peer = new Peer(PREFIX + code, { debug: 0 });
    peer.on('open', () => notify('waiting'));
    peer.on('connection', conn => {
      if (conn.label === 'ctl') {
        if (ctl && ctl.open) { conn.on('open', () => conn.close()); return; }
        ctl = conn;
        bindCtl(conn);
      } else if (conn.label === 'rt') {
        rt = conn;
        bindRt(conn);
      }
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') { host(); return; } // code déjà pris : on en tire un autre
      onPeerError(err);
    });
  }

  function join(rawCode) {
    if (!peerSupported()) { notify('idle', "Ce navigateur ne permet pas de jouer en ligne."); return; }
    const wanted = cleanCode(rawCode);
    if (wanted.length !== CODE_LENGTH) { notify('idle', `Le code contient ${CODE_LENGTH} caractères.`); return; }
    reset();
    role = 'guest';
    code = wanted;
    notify('connecting');
    peer = new Peer({ debug: 0 });
    peer.on('open', () => {
      ctl = peer.connect(PREFIX + code, { label: 'ctl', serialization: 'json', reliable: true });
      rt = peer.connect(PREFIX + code, { label: 'rt', serialization: 'raw', reliable: false });
      bindCtl(ctl);
      bindRt(rt);
    });
    peer.on('error', onPeerError);
    joinTimer = setTimeout(() => {
      if (state !== 'ready') fail('Connexion impossible. Le réseau bloque peut-être la liaison : essayez sur un autre réseau.');
    }, JOIN_TIMEOUT_MS);
  }

  function onPeerError(err) {
    if (state === 'ready') return; // le service de mise en relation n'est plus utile une fois connectés
    if (err.type === 'peer-unavailable') fail('Aucune partie avec ce code.');
    else if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(err.type)) {
      fail('Le service de connexion est injoignable. Réessaie dans un instant.');
    } else fail('La connexion a échoué.');
  }
  function fail(text) {
    reset();
    notify('idle', text);
  }

  function reset() {
    clearTimeout(joinTimer);
    clearInterval(pingTimer);
    const old = peer;
    peer = null; ctl = null; rt = null;
    if (old) { try { old.destroy(); } catch (err) { /* déjà fermé */ } }
    role = null;
    code = '';
    mateInfo = null;
    localPaused = false;
    remotePaused = false;
    events = [];
    lastSeq = -1;
    seq = 0;
  }

  /* Départ volontaire. */
  function leave() {
    const run = Game.net.run;
    const summary = role === 'guest' && Game.isFlying()
      ? { time: run.time, kills: run.kills, sector: run.sector, bosses: run.bossesKilled, abandoned: true }
      : null;
    send({ t: 'bye' });
    if (role === 'host') Game.removeMate();
    // Laisse partir le dernier message avant de couper.
    const closing = peer;
    peer = null;
    if (closing) setTimeout(() => { try { closing.destroy(); } catch (err) { /* déjà fermé */ } }, 150);
    reset();
    notify('idle');
    if (summary) Game.guestEnd(summary, false);
  }

  function onMateLost(text) {
    if (!role) return;
    const wasRole = role;
    const run = Game.net.run;
    const flying = Game.isFlying();
    if (wasRole === 'guest' && flying) {
      const summary = { time: run.time, kills: run.kills, sector: run.sector, bosses: run.bossesKilled };
      reset();
      notify('idle', text);
      Game.guestEnd(summary, true);
      return;
    }
    if (wasRole === 'host') Game.removeMate();
    reset();
    notify('idle', text);
    if (flying) UI.toast(text);
    UI.refreshAfterCoop();
  }

  /* ---------- Messages fiables ---------- */
  function send(msg) {
    if (ctl && ctl.open) {
      try { ctl.send(msg); } catch (err) { console.warn('Envoi impossible.', err); }
    }
  }

  function bindCtl(conn) {
    conn.on('open', () => {
      clearTimeout(joinTimer);
      lastHeard = performance.now();
      send({ t: 'hello', v: PROTOCOL, st: STATS, vw: Game.net.VW, vh: Game.net.VH });
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        send({ t: 'ping' });
        if (performance.now() - lastHeard > SILENCE_LIMIT_MS) onMateLost('La liaison avec ton coéquipier est perdue.');
      }, 2000);
    });
    conn.on('data', handleCtl);
    conn.on('close', () => {
      if (conn === ctl) onMateLost('Ton coéquipier a quitté la partie.');
    });
    conn.on('error', err => console.warn('Liaison :', err));
  }

  function handleCtl(msg) {
    lastHeard = performance.now();
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello':
        if (msg.v !== PROTOCOL) {
          fail('Vos versions du jeu sont différentes : rechargez la page tous les deux.');
          return;
        }
        mateInfo = { st: msg.st, vw: +msg.vw || 640, vh: +msg.vh || 360 };
        Game.updateView();
        notify('ready');
        break;
      case 'bye':
        onMateLost('Ton coéquipier a quitté la partie.');
        break;
      case 'stats':
        if (mateInfo) mateInfo.st = msg.st;
        Game.setMateStats(msg.st);
        break;
      case 'view':
        if (mateInfo) { mateInfo.vw = +msg.vw || 640; mateInfo.vh = +msg.vh || 360; Game.updateView(); }
        break;
      case 'pause':
        remotePaused = !!msg.on;
        break;
      case 'start':
        if (role === 'guest') {
          mateInfo = { st: msg.st, vw: 0, vh: 0 };
          lastSeq = -1;
          remotePaused = false;
          Game.startGuest({ sector: +msg.sector || 1, st: msg.st });
          UI.setScreen('fly');
        }
        break;
      case 'fx':
        if (role === 'guest') for (const ev of msg.e || []) applyEvent(ev);
        break;
      case 'award':
        if (role === 'guest') applyAward(+msg.u || 0, +msg.c || 0);
        break;
      case 'over':
        if (role === 'guest' && Game.isFlying()) Game.guestEnd(msg.r || {}, false);
        break;
    }
  }

  function applyAward(units, cores) {
    S.units += units;
    S.lifeUnits += units;
    S.ascUnits += units;
    S.cores += cores;
    const run = Game.net.run;
    if (run) { run.units += units; run.cores += cores; }
  }

  function applyEvent(ev) {
    const n = Game.net;
    switch (ev[0]) {
      case 'b': n.burst(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6]); break;
      case 'r': n.addRemoteRing(ev[1], ev[2], ev[3], ev[4]); break;
      case 'l': n.addRemoteBolt(ev[1], ev[2], ev[3]); break;
      case 'x': if (S.set.nums) n.addRemoteText(ev[1], ev[2], String(ev[3]), ev[4]); break;
      case 's':
        if (Object.prototype.hasOwnProperty.call(Audio8.fx, ev[1])) Audio8.fx[ev[1]]();
        break;
      case 'h': n.addShake(3); Audio8.fx.hurt(); UI.hurtFlash(); break;
      case 'k': n.addShake(ev[1]); break;
      case 'T': UI.toast(String(ev[1])); break;
      case 'B': UI.banner(String(ev[1]), String(ev[2]), !!ev[3]); break;
      case 'm':
        if (ev[1] === 'stop') Music.stop();
        else if (ev[1] === 'flight' || ev[1] === 'boss') Music[ev[1]](+ev[2] || 1);
        break;
      case 'S':
        noteSectorReached(+ev[1] || 1);
        Save.write();
        break;
      case 'd': {
        const me = n.me;
        if (me) me.charges = Math.min(me.st.dashCharges, me.charges + 1);
        break;
      }
    }
  }

  /* ---------- Côté hôte : ce qu'on fait partir ---------- */
  function queue(ev) {
    if (role === 'host' && events.length < 200) events.push(ev);
  }

  function flushEvents() {
    if (!events.length) return;
    const guest = Game.net.players.find(s => s.remote);
    const out = [];
    let textCount = 0;
    for (const ev of events) {
      if (ev[0] === 'b' || ev[0] === 'r' || ev[0] === 'x') {
        // Inutile d'envoyer ce que l'invité ne peut pas voir.
        if (guest && Math.hypot(ev[1] - guest.x, ev[2] - guest.y) > Math.hypot(mateInfo.vw, mateInfo.vh)) continue;
      }
      if (ev[0] === 'x' && ++textCount > 16) continue;
      out.push(ev);
    }
    events = [];
    if (out.length) send({ t: 'fx', e: out });
  }

  function flushAward() {
    const guest = Game.net.players.find(s => s.remote);
    if (!guest || (!guest.award.u && !guest.award.c)) return;
    send({ t: 'award', u: guest.award.u, c: guest.award.c });
    guest.award.u = 0;
    guest.award.c = 0;
  }

  /* Écriture binaire */
  const buffer = new ArrayBuffer(64 * 1024);
  const view = new DataView(buffer);
  let at = 0, originX = 0, originY = 0;
  const w8 = v => { view.setUint8(at, v & 0xff); at += 1; };
  const wi8 = v => { view.setInt8(at, clamp(Math.round(v), -127, 127)); at += 1; };
  const w16 = v => { view.setUint16(at, v & 0xffff, true); at += 2; };
  const w32 = v => { view.setUint32(at, v >>> 0, true); at += 4; };
  const wf = v => { view.setFloat32(at, v, true); at += 4; };
  const wx = v => { view.setInt16(at, clamp(Math.round((v - originX) * 2), -32768, 32767), true); at += 2; };
  const wy = v => { view.setInt16(at, clamp(Math.round((v - originY) * 2), -32768, 32767), true); at += 2; };
  const wa = a => w8(Math.round((((a % TAU) + TAU) % TAU) / TAU * 255));

  function encodeSnapshot() {
    const n = Game.net;
    const run = n.run;
    at = 0;
    originX = n.me.x;
    originY = n.me.y;
    w8(1);
    w32(++seq);
    wf(originX); wf(originY);
    wf(run.t); wf(run.dur); wf(run.time);
    w16(run.sector); w32(run.kills); w16(run.combo);
    w8(localPaused || remotePaused ? 1 : 0);

    for (const s of n.players) {
      wf(s.x); wf(s.y); wf(s.vx); wf(s.vy);
      wa(s.ang);
      wf(s.hull); wf(s.shield);
      w8(Math.min(255, Math.floor(s.frenzy)));
      w8(s.revives);
      w8((s.dead ? 1 : 0) | (s.invuln > 0 ? 2 : 0) | (s.flash > 0 ? 4 : 0) | (s.thrust ? 8 : 0)
        | (s.beam ? 16 : 0) | (s.dashT > 0 ? 32 : 0) | (s.fired ? 64 : 0) | (s.shieldT > 3 ? 128 : 0));
      s.fired = false;
      w8(Math.round(clamp(s.rescue / 3, 0, 1) * 255));
      if (s.beam) { wa(s.beam.a); w16(s.beam.len); w8(s.beam.w); }
      else { w8(0); w16(0); w8(0); }
      const patches = s.patches.slice(-24);
      w8(patches.length);
      for (const c of patches) { wx(c.x); wy(c.y); w8(Math.round(clamp(c.life, 0, 2.5) * 100)); }
    }

    w8(n.bosses.length);
    for (const boss of n.bosses) {
      w16(boss.nid);
      wf(boss.hp); wf(boss.maxHp);
      w8(boss.state || 0);
      wi8((boss.cx || 0) * 100); wi8((boss.cy || 0) * 100);
    }

    const enemies = n.enemies.filter(e => !e.dead);
    w16(enemies.length);
    for (const e of enemies) {
      w16(e.nid);
      w8(e.boss ? BOSS_OFFSET + e.bossIdx : ENEMY_NAMES.indexOf(e.type));
      wx(e.x); wy(e.y);
      wa(e.ang);
      w8((e.flash > 0 ? 1 : 0) | (e.elite ? 2 : 0));
      w8(Math.round(clamp(e.hp / e.maxHp, 0, 1) * 255));
    }

    const pb = n.pBullets;
    const pbCount = Math.min(pb.length, 300);
    w16(pbCount);
    for (let i = 0; i < pbCount; i++) {
      const b = pb[i];
      wx(b.x); wy(b.y); wi8(b.vx / 5); wi8(b.vy / 5);
      w8(Math.max(0, PLAYER_BULLET_COLORS.indexOf(b.color)));
    }

    const eb = n.eBullets;
    const ebCount = Math.min(eb.length, 400);
    w16(ebCount);
    for (let i = 0; i < ebCount; i++) {
      const b = eb[i];
      wx(b.x); wy(b.y); wi8(b.vx / 3); wi8(b.vy / 3);
      w8((Math.max(0, ENEMY_BULLET_COLORS.indexOf(b.color)) << 2) | (b.r & 3));
    }

    const ms = n.missiles;
    const msCount = Math.min(ms.length, 60);
    w8(msCount);
    for (let i = 0; i < msCount; i++) { wx(ms[i].x); wy(ms[i].y); wa(ms[i].ang); }

    const mn = n.mines;
    const mnCount = Math.min(mn.length, 60);
    w8(mnCount);
    for (let i = 0; i < mnCount; i++) { wx(mn[i].x); wy(mn[i].y); w8(mn[i].arm <= 0 ? 1 : 0); }

    const orbs = n.orbs;
    const orbCount = Math.min(orbs.length, 240);
    w16(orbCount);
    for (let i = 0; i < orbCount; i++) {
      const o = orbs[i];
      wx(o.x); wy(o.y); wi8(o.vx / 4); wi8(o.vy / 4);
      w8(o.kind === 'c' ? 1 : 0);
    }

    const nv = n.novas;
    const nvCount = Math.min(nv.length, 12);
    w8(nvCount);
    for (let i = 0; i < nvCount; i++) {
      const v = nv[i];
      wx(v.x); wy(v.y); w16(v.r); w16(v.max);
      w8(Math.max(0, NOVA_COLORS.indexOf(v.color)));
    }
    return buffer.slice(0, at);
  }

  function rtReady() {
    if (!rt || !rt.open) return false;
    const channel = rt.dataChannel;
    return !channel || channel.bufferedAmount < MAX_BUFFERED;
  }

  /* Appelé à chaque image, quel que soit l'écran affiché. */
  function tick(dt) {
    if (role !== 'host' || state !== 'ready' || !Game.isFlying()) return;
    snapT += dt;
    awardT += dt;
    if (snapT >= SNAPSHOT_INTERVAL) {
      snapT = 0;
      flushEvents();
      if (rtReady()) {
        try { rt.send(encodeSnapshot()); } catch (err) { console.warn('Image non envoyée.', err); }
      }
    }
    if (awardT >= AWARD_INTERVAL) {
      awardT = 0;
      flushAward();
    }
  }

  function hostOver(summary) {
    flushEvents();
    flushAward();
    send({ t: 'over', r: { time: summary.time, kills: summary.kills, sector: summary.sector, bosses: summary.bosses, bestCombo: summary.bestCombo } });
  }

  function startFlight(sector) {
    Game.start(sector);
    send({ t: 'start', sector, st: STATS });
  }

  function sendStats() {
    if (role && state === 'ready') send({ t: 'stats', st: STATS });
  }
  function sendView() {
    if (role && state === 'ready') send({ t: 'view', vw: Game.net.VW, vh: Game.net.VH });
  }
  function setLocalPause(on) {
    if (!role) { localPaused = false; return; }
    if (on === localPaused) return;
    localPaused = on;
    send({ t: 'pause', on });
  }

  /* ---------- Côté hôte : position de l'invité ---------- */
  function bindRt(conn) {
    conn.on('data', data => {
      lastHeard = performance.now();
      const buf = toBuffer(data);
      if (!buf) return;
      if (role === 'host') readGuestPosition(buf);
      else if (role === 'guest') decodeSnapshot(buf);
    });
    conn.on('error', err => console.warn('Liaison rapide :', err));
  }
  function toBuffer(data) {
    if (data instanceof ArrayBuffer) return data;
    if (ArrayBuffer.isView(data)) return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return null;
  }

  function readGuestPosition(buf) {
    if (buf.byteLength !== 28) return;
    const guest = Game.net.players.find(s => s.remote);
    if (!guest) return;
    const f = new Float32Array(buf);
    if (![f[1], f[2], f[3], f[4]].every(Number.isFinite)) return;
    guest.x = f[1];
    guest.y = f[2];
    guest.vx = f[3];
    guest.vy = f[4];
    guest.netAim = Number.isNaN(f[5]) ? null : f[5];
    guest.netDash = f[6] > 0;
  }

  /* ---------- Côté invité : ce qu'on reçoit ---------- */
  const enemyCache = new Map();
  let lastSnapAt = 0;
  const sprite = name => Sprites[name].n;

  function makeRemoteEnemy(nid, ty) {
    const isBoss = ty >= BOSS_OFFSET;
    const def = isBoss ? BOSSES[ty - BOSS_OFFSET] : null;
    const t = isBoss ? { sprite: def.sprite, ai: def.ai, noRot: true, dmg: 0 } : ENEMY_TYPES[ENEMY_NAMES[ty]];
    if (!t) return null;
    const spr = sprite(t.sprite);
    return {
      nid, t, def, type: isBoss ? 'boss' : ENEMY_NAMES[ty], boss: isBoss,
      r: isBoss ? Math.min(spr.width, spr.height) * 0.9 : Math.max(3, Math.min(spr.width, spr.height) * 0.42),
      drawScale: isBoss ? 2 : 1,
      x: 0, y: 0, px: 0, py: 0, nx: 0, ny: 0, vx: 0, vy: 0,
      ang: 0, flash: 0, elite: false, hp: 1, maxHp: 1, dead: false, state: 0, cx: 0, cy: 0, fresh: true,
    };
  }

  function decodeSnapshot(buf) {
    if (!Game.isFlying() || buf.byteLength < 40) return;
    const v = new DataView(buf);
    let o = 0;
    const r8 = () => v.getUint8(o++);
    const ri8 = () => v.getInt8(o++);
    const r16 = () => { const x = v.getUint16(o, true); o += 2; return x; };
    const r32 = () => { const x = v.getUint32(o, true); o += 4; return x; };
    const rf = () => { const x = v.getFloat32(o, true); o += 4; return x; };
    const ra = () => (r8() / 255) * TAU;

    if (r8() !== 1) return;
    const number = r32();
    if (number <= lastSeq) return; // image arrivée en retard : on l'ignore
    lastSeq = number;

    const n = Game.net;
    const run = n.run;
    const ox = rf(), oy = rf();
    const rx = () => { const x = v.getInt16(o, true); o += 2; return x / 2 + ox; };
    const ry = () => { const x = v.getInt16(o, true); o += 2; return x / 2 + oy; };

    run.t = rf(); run.dur = rf(); run.time = rf();
    run.sector = r16(); run.kills = r32(); run.combo = r16();
    remotePaused = r8() === 1 && !localPaused;

    const now = performance.now();
    for (const s of n.players) {
      const x = rf(), y = rf(), vx = rf(), vy = rf();
      s.ang = ra();
      s.hull = rf();
      s.shield = rf();
      s.frenzy = r8();
      s.revives = r8();
      const flags = r8();
      s.dead = !!(flags & 1);
      s.invuln = flags & 2 ? 1 : 0;
      s.flash = flags & 4 ? 0.1 : 0;
      s.shieldT = flags & 128 ? 4 : 0;
      s.rescue = (r8() / 255) * 3;
      const beamA = ra(), beamLen = r16(), beamW = r8();
      s.beam = flags & 16 ? { a: beamA, len: beamLen, w: beamW } : null;
      const patchCount = r8();
      s.patches.length = 0;
      for (let i = 0; i < patchCount; i++) s.patches.push({ x: rx(), y: ry(), life: r8() / 100, r: 8 });
      if (s === n.me) {
        if (flags & 64) Audio8.fx.shoot();
      } else {
        s.px = s.x; s.py = s.y; s.nx = x; s.ny = y;
        s.vx = vx; s.vy = vy;
        s.thrust = flags & 8 ? 1 : 0;
        s.dashT = flags & 32 ? 0.05 : 0;
      }
    }
    lastSnapAt = now;

    const bossData = new Map();
    const bossCount = r8();
    for (let i = 0; i < bossCount; i++) {
      const nid = r16();
      bossData.set(nid, { hp: rf(), maxHp: rf(), state: r8(), cx: ri8() / 100, cy: ri8() / 100 });
    }

    const enemyCount = r16();
    const list = n.enemies;
    list.length = 0;
    const seen = new Set();
    const bossList = [];
    for (let i = 0; i < enemyCount; i++) {
      const nid = r16(), ty = r8(), x = rx(), y = ry(), ang = ra(), fl = r8(), hp = r8();
      let e = enemyCache.get(nid);
      if (!e) {
        e = makeRemoteEnemy(nid, ty);
        if (!e) continue;
        e.x = x; e.y = y;
        enemyCache.set(nid, e);
      }
      e.px = e.x; e.py = e.y; e.nx = x; e.ny = y;
      e.ang = ang;
      e.flash = fl & 1 ? 0.1 : 0;
      e.elite = !!(fl & 2);
      e.hp = hp; e.maxHp = 255;
      seen.add(nid);
      list.push(e);
      if (e.boss) bossList.push(e);
    }
    for (const nid of enemyCache.keys()) if (!seen.has(nid)) enemyCache.delete(nid);

    for (const boss of bossList) {
      const data = bossData.get(boss.nid);
      if (data) Object.assign(boss, data);
    }
    n.bosses = bossList;

    const pb = n.pBullets;
    pb.length = 0;
    const pbCount = r16();
    for (let i = 0; i < pbCount; i++) {
      pb.push({ x: rx(), y: ry(), vx: ri8() * 5, vy: ri8() * 5, color: PLAYER_BULLET_COLORS[r8()] || PLAYER_BULLET_COLORS[0] });
    }
    const eb = n.eBullets;
    eb.length = 0;
    const ebCount = r16();
    for (let i = 0; i < ebCount; i++) {
      const b = { x: rx(), y: ry(), vx: ri8() * 3, vy: ri8() * 3 };
      const packed = r8();
      b.color = ENEMY_BULLET_COLORS[packed >> 2] || ENEMY_BULLET_COLORS[0];
      b.r = packed & 3;
      eb.push(b);
    }
    const ms = n.missiles;
    ms.length = 0;
    const msCount = r8();
    for (let i = 0; i < msCount; i++) ms.push({ x: rx(), y: ry(), ang: ra() });

    const mn = n.mines;
    mn.length = 0;
    const mnCount = r8();
    for (let i = 0; i < mnCount; i++) mn.push({ x: rx(), y: ry(), arm: r8() ? 0 : 1 });

    const orbs = n.orbs;
    orbs.length = 0;
    const orbCount = r16();
    for (let i = 0; i < orbCount; i++) {
      orbs.push({ x: rx(), y: ry(), vx: ri8() * 4, vy: ri8() * 4, kind: r8() ? 'c' : 'u' });
    }
    const nv = n.novas;
    nv.length = 0;
    const nvCount = r8();
    for (let i = 0; i < nvCount; i++) {
      nv.push({ x: rx(), y: ry(), r: r16(), max: r16(), color: NOVA_COLORS[r8()] || NOVA_COLORS[0] });
    }
  }

  /* Une image côté invité : pilotage local, puis on lisse ce qui vient du réseau. */
  function guestFrame(dt, active) {
    const n = Game.net;
    const me = n.me;
    const frozen = !active || remotePaused;
    n.setActor(me);
    if (!frozen && !me.dead) {
      n.moveShip(dt, Game.moveVector());
    } else {
      me.vx = 0;
      me.vy = 0;
      me.thrust = 0;
      Game.Input.dashQueued = false;
    }

    const k = clamp((performance.now() - lastSnapAt) * SNAPSHOT_INTERVAL, 0, 1);
    for (const e of n.enemies) { e.x = e.px + (e.nx - e.px) * k; e.y = e.py + (e.ny - e.py) * k; }
    for (const s of n.players) {
      if (s !== me && s.nx !== undefined) { s.x = s.px + (s.nx - s.px) * k; s.y = s.py + (s.ny - s.py) * k; }
    }
    if (!frozen) {
      for (const list of [n.pBullets, n.eBullets, n.orbs]) {
        for (const b of list) { b.x += b.vx * dt; b.y += b.vy * dt; }
      }
    }
    for (const s of n.players) {
      if (s.dead) continue;
      n.setActor(s);
      n.orbitDrones(dt);
    }
    n.setActor(me);
    n.updateFx(dt);

    posT += dt;
    if (posT >= POSITION_INTERVAL && !frozen) {
      posT = 0;
      sendPosition(me);
    }
  }

  function sendPosition(me) {
    if (!rtReady()) return;
    const input = Game.Input;
    const net = Game.net;
    const manual = S.set.aim === 'mouse' && input.mouseSeen;
    const aim = manual ? Math.atan2(input.my + net.camY - me.y, input.mx + net.camX - me.x) : NaN;
    const packet = new Float32Array([2, me.x, me.y, me.vx, me.vy, aim, me.dashT > 0 ? 1 : 0]);
    try { rt.send(packet.buffer); } catch (err) { console.warn('Position non envoyée.', err); }
  }

  /* Le mode hôte attend tant qu'un des deux joueurs est dans un menu. */
  function blocked() { return role === 'host' && (localPaused || remotePaused); }

  return {
    host, join, leave, cleanCode, tick, queue, hostOver, startFlight, sendStats, sendView, setLocalPause,
    guestFrame, blocked,
    mate() { return role === 'host' && state === 'ready' ? mateInfo : null; },
    get role() { return role; },
    get state() { return state; },
    get message() { return message; },
    get code() { return code; },
    get remotePaused() { return remotePaused; },
    set onChange(fn) { onChange = fn; },
  };
})();
