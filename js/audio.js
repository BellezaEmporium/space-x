'use strict';
/* Son 100% synthétisé : aucun fichier audio à charger. */
const Audio8 = (() => {
  let ac = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuf = null;
  const last = {};
  let seqTimer = null;
  let step = 0;
  let nextTime = 0;
  let intensity = 0;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.connect(master);
    musicBus = ac.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applySettings();
  }

  function applySettings() {
    if (!ac) return;
    sfxBus.gain.value = S.set.sound ? 1 : 0;
    musicBus.gain.value = S.set.music ? 0.32 : 0;
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

  /* ---------- Musique : boucle d'arpèges en la mineur, composée ici ---------- */
  const ROOTS = [110, 87.31, 130.81, 98];                  // la, fa, do, sol
  const ARP = [0, 12, 7, 12, 3, 12, 7, 15];                // base mineure
  const LEAD = [0, 0, 7, 0, 10, 0, 7, 3, 0, 12, 0, 10, 7, 0, 3, 5];

  function scheduleStep(t) {
    const bar = Math.floor(step / 16) % ROOTS.length;
    const root = ROOTS[bar];
    const s16 = step % 16;
    const semis = n => Math.pow(2, n / 12);

    if (s16 % 2 === 0) tone(root / 2, 0.16, 'triangle', 0.5, null, musicBus, t);
    if (s16 % 8 === 0) noise(0.12, 0.4, 180, t, musicBus);
    if (s16 % 8 === 4) noise(0.08, 0.2, 2500, t, musicBus);
    tone(root * 2 * semis(ARP[step % 8]), 0.09, 'square', 0.1, null, musicBus, t);

    if (intensity > 0.3 && LEAD[s16]) {
      tone(root * 4 * semis(LEAD[s16]), 0.11, 'sawtooth', 0.06, null, musicBus, t);
    }
    step++;
  }

  function startMusic() {
    if (!ac || seqTimer) return;
    nextTime = ac.currentTime + 0.05;
    seqTimer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      const bpmStep = 60 / (118 + intensity * 26) / 4;
      while (nextTime < ac.currentTime + 0.15) {
        if (S.set.music) scheduleStep(nextTime);
        nextTime += bpmStep;
      }
    }, 40);
  }
  function stopMusic() {
    clearInterval(seqTimer);
    seqTimer = null;
  }
  function setIntensity(v) { intensity = v; }

  return { init, fx, startMusic, stopMusic, setIntensity, applySettings };
})();
