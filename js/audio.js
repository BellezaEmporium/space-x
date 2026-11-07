'use strict';
/* Son 100% synthétisé : aucun fichier audio à charger. */
// Volume de la musique : assez fort pour bien s'entendre par-dessus les bruitages.
const MUSIC_LEVEL = 1;

const Audio8 = (() => {
  let ac = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuf = null;
  const last = {};

  /* Crée le son au premier geste, puis le réveille à chaque geste s'il s'est endormi
     (onglet changé, appel reçu, retour en arrière…). */
  function init() {
    if (ac) {
      if (ac.state !== 'running' && !document.hidden) ac.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone : sans ceci, le bouton silencieux du téléphone coupe tout le son du jeu.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (err) { /* non pris en charge */ }
    ac = new AC();
    // Un son vide joué pendant le geste débloque l'audio sur les navigateurs mobiles.
    const unlock = ac.createBufferSource();
    unlock.buffer = ac.createBuffer(1, 1, 22050);
    unlock.connect(ac.destination);
    unlock.start(0);
    if (ac.state !== 'running') ac.resume().catch(() => {});
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.connect(master);
    musicBus = ac.createGain();
    musicBus.gain.value = MUSIC_LEVEL;
    musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applySettings();
  }

  function applySettings() {
    if (!ac) return;
    sfxBus.gain.value = S.set.sound ? (S.set.sfxVol || 100) / 100 : 0;
    musicBus.gain.value = S.set.music ? MUSIC_LEVEL * (S.set.musicVol || 100) / 100 : 0;
    Music.refresh();
  }

  /* Jeu en arrière-plan ou fermé : plus aucun son. */
  function silenceInBackground() {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else ac.resume();
  }
  document.addEventListener('visibilitychange', silenceInBackground);
  window.addEventListener('pagehide', () => { if (ac) ac.suspend(); });
  window.addEventListener('pageshow', () => { if (ac && !document.hidden) ac.resume().catch(() => {}); });
  for (const type of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(type, () => init(), { capture: true, passive: true });
  }

  /* État du son, affiché dans les options pour comprendre un silence. */
  function status() {
    const supported = !!(window.AudioContext || window.webkitAudioContext);
    let engine = 'pas encore démarré (touche l\'écran ou une touche)';
    if (!supported) engine = 'non pris en charge par ce navigateur';
    else if (ac) engine = ac.state === 'running' ? 'actif' : `en veille (${ac.state})`;
    return { supported, running: !!ac && ac.state === 'running', engine };
  }

  /* Petit test audible : un accord sur les bruitages, puis une basse sur la musique. */
  function test() {
    init();
    if (!ac) return;
    const t = ac.currentTime + 0.05;
    [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'square', 0.12, null, sfxBus, t + i * 0.12));
    [55, 82.4, 110].forEach((f, i) => tone(f, 0.45, 'sawtooth', 0.35, null, musicBus, t + 0.45 + i * 0.3));
  }

  function tone(freq, dur, type, vol, slide, bus, when) {
    if (!ac) return;
    const t = when || ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(bus || sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, cutoff, when, bus) {
    if (!ac) return;
    const t = when || ac.currentTime;
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.playbackRate.value = rnd(0.7, 1.2);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(bus || sfxBus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  /* Limite la fréquence d'un son pour éviter la saturation. */
  function gate(key, ms) {
    const now = performance.now();
    if (last[key] && now - last[key] < ms) return false;
    last[key] = now;
    return true;
  }

  const fx = {
    shoot() { if (gate('s', 70)) tone(rnd(820, 980), 0.06, 'square', 0.035, 240); },
    hit() { if (gate('h', 50)) tone(rnd(260, 340), 0.04, 'square', 0.03, 120); },
    kill() { if (gate('k', 45)) { noise(0.14, 0.13, 1800); tone(rnd(180, 240), 0.1, 'square', 0.05, 50); } },
    bigKill() { if (gate('bk', 120)) { noise(0.5, 0.35, 2400); tone(160, 0.45, 'sawtooth', 0.12, 30); } },
    pickup() { if (gate('p', 45)) tone(rnd(1050, 1320), 0.05, 'triangle', 0.05, 1800); },
    core() { tone(660, 0.1, 'square', 0.09); tone(990, 0.2, 'square', 0.09, null, null, ac ? ac.currentTime + 0.09 : 0); },
    missile() { if (gate('m', 110)) { noise(0.16, 0.06, 3000); tone(300, 0.15, 'sawtooth', 0.04, 700); } },
    boom() { if (gate('b', 90)) { noise(0.3, 0.2, 1300); tone(110, 0.25, 'square', 0.08, 35); } },
    arc() { if (gate('a', 90)) { noise(0.07, 0.08, 6000); tone(1400, 0.06, 'sawtooth', 0.035, 300); } },
    nova() { tone(90, 0.5, 'sawtooth', 0.14, 400); noise(0.4, 0.1, 900); },
    dash() { noise(0.2, 0.1, 5000); tone(240, 0.18, 'square', 0.06, 900); },
    hurt() { if (gate('hu', 90)) { noise(0.16, 0.2, 900); tone(140, 0.16, 'square', 0.12, 60); } },
    shieldHit() { if (gate('sh', 90)) tone(1200, 0.1, 'triangle', 0.09, 500); },
    alarm() {
      if (!ac) return;
      for (let i = 0; i < 4; i++) {
        tone(520, 0.28, 'square', 0.1, 780, null, ac.currentTime + i * 0.38);
      }
    },
    sector() {
      if (!ac) return;
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.1, null, null, ac.currentTime + i * 0.09));
    },
    death() { noise(1, 0.4, 1500); tone(220, 1, 'sawtooth', 0.15, 28); },
    buy() { tone(740, 0.06, 'square', 0.08); tone(1110, 0.1, 'square', 0.08, null, null, ac ? ac.currentTime + 0.05 : 0); },
    deny() { tone(150, 0.14, 'square', 0.09, 90); },
    click() { tone(520, 0.03, 'square', 0.06); },
    hyper() {
      if (!ac) return;
      tone(80, 1.6, 'sawtooth', 0.2, 2200);
      noise(1.6, 0.2, 6000);
    },
  };

  return { init, fx, applySettings, status, test, context: () => ac, musicOut: () => musicBus };
})();
