'use strict';
/* =====================================================================
   MUSIQUE GÉNÉRATIVE

   Six morceaux composés ici : quatre pour le vol (un par secteur, en
   rotation) et deux pour les boss. Chacun a sa tonalité, son tempo, sa
   batterie, sa basse et ses timbres. Un morceau avance par sections
   (intro, couplet, refrain, pont, reprise…) qui ajoutent ou retirent des
   instruments, et sa mélodie change un peu à chaque tour.

   La musique ne joue que pendant le vol : elle s'arrête dans les menus,
   en pause, et quand le jeu passe en arrière-plan.
   ===================================================================== */
const Music = (() => {
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
  };

  /* root : note MIDI de la basse. prog : degrés des accords, un par mesure. */
  const SONGS = [
    { id: 'neon', title: 'Néon', kind: 'flight', bpm: 124, root: 45, scale: 'minor', prog: [0, 5, 2, 6],
      drums: 'four', bass: 'octaves', lead: 'square', arp: 'up', seed: 11 },
    { id: 'derive', title: 'Dérive', kind: 'flight', bpm: 104, root: 50, scale: 'dorian', prog: [0, 3, 0, 6, 0, 3, 4, 6],
      drums: 'half', bass: 'synco', lead: 'soft', arp: 'updown', seed: 23 },
    { id: 'comete', title: 'Comète', kind: 'flight', bpm: 138, root: 40, scale: 'minor', prog: [0, 6, 5, 6],
      drums: 'break', bass: 'roll', lead: 'saw', arp: 'down', seed: 37 },
    { id: 'abysse', title: 'Abysse', kind: 'flight', bpm: 112, root: 37, scale: 'phrygian', prog: [0, 1, 0, 6],
      drums: 'four', bass: 'wobble', lead: 'pulse', arp: 'skip', seed: 53 },
    { id: 'alerte', title: 'Alerte rouge', kind: 'boss', bpm: 150, root: 41, scale: 'harmonic', prog: [0, 5, 6, 4],
      drums: 'double', bass: 'dist', lead: 'stab', arp: 'up', seed: 71 },
    { id: 'titan', title: 'Titan', kind: 'boss', bpm: 140, root: 38, scale: 'phrygian', prog: [0, 1, 6, 1],
      drums: 'march', bass: 'dist', lead: 'siren', arp: 'down', seed: 97 },
  ];
  const FLIGHT = SONGS.filter(s => s.kind === 'flight');
  const BOSSES = SONGS.filter(s => s.kind === 'boss');

  /* Batteries : 16 pas par mesure. */
  const DRUMS = {
    four:   { kick: ['x...x...x...x...'], snare: '....x.......x...', hat: '..x...x...x...x.' },
    half:   { kick: ['x.........x.....', 'x.........x..x..'], snare: '........x.......', hat: 'x.x.x.x.x.x.x.x.' },
    break:  { kick: ['x.....x...x.....', 'x.x...x.......x.'], snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.' },
    double: { kick: ['x.x.x.x.x.x.x.x.'], snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    march:  { kick: ['x..x..x.x..x..x.'], snare: '....x..x....x...', hat: 'x.x.x.x.x.x.x.x.' },
  };

  /* Déroulé d'un morceau : chaque section dit quels instruments jouent. */
  const FLIGHT_FORM = [
    { bars: 4, pad: 1, hat: 1 },
    { bars: 8, pad: 1, hat: 1, kick: 1, snare: 1, bass: 1, arp: 1, sub: 1 },
    { bars: 8, hat: 1, kick: 1, snare: 1, bass: 1, arp: 1, lead: 1, sub: 1 },
    { bars: 4, pad: 1, sub: 1, riser: 1 },
    { bars: 8, pad: 1, hat: 2, kick: 1, snare: 1, bass: 1, arp: 1, lead: 2, sub: 1 },
    { bars: 8, hat: 1, kick: 1, snare: 1, bass: 2, arp: 2, sub: 1 },
  ];
  const BOSS_FORM = [
    { bars: 2, alarm: 1, kick: 1, sub: 1 },
    { bars: 8, kick: 1, snare: 1, hat: 2, bass: 1, stab: 1, sub: 1 },
    { bars: 8, kick: 1, snare: 1, hat: 2, bass: 1, lead: 1, arp: 1, sub: 1 },
    { bars: 2, alarm: 1, riser: 1, sub: 1 },
    { bars: 8, kick: 1, snare: 1, hat: 2, bass: 2, lead: 2, stab: 1, sub: 1 },
  ];

  const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);

  /* Petit générateur pseudo-aléatoire : même graine, même mélodie. */
  function seeded(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const pickFrom = (r, list) => list[Math.floor(r() * list.length)];

  /* Une phrase de 2 mesures : notes longues et courtes, silences, appuis sur l'accord. */
  function makeMotif(r) {
    const notes = [];
    let s = 0;
    while (s < 32) {
      const len = pickFrom(r, [2, 2, 2, 4, 4, 1, 3, 6]);
      if (s % 4 !== 0 && r() < 0.28) { s += len; continue; }
      const strong = s % 8 === 0;
      const deg = strong ? pickFrom(r, [0, 2, 4, 7]) : pickFrom(r, [0, 1, 2, 3, 4, 5, 6, 7, 9]);
      notes.push({ s, len: Math.min(len, 32 - s), deg });
      s += len;
    }
    return notes;
  }
  /* À chaque tour, la phrase change un peu : quelques notes bougent. */
  function mutate(motif, r) {
    const copy = motif.map(n => ({ ...n }));
    const changes = 2 + Math.floor(r() * 2);
    for (let i = 0; i < changes; i++) {
      const n = copy[Math.floor(r() * copy.length)];
      if (n && n.s % 8 !== 0) n.deg += r() < 0.5 ? -1 : 1;
    }
    return copy;
  }

  /* ---------- Moteur sonore, utilisable en direct ou en rendu hors ligne ---------- */
  function createEngine(ac, out) {
    const master = ac.createGain();
    master.gain.value = 1;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    master.connect(comp).connect(out);

    // Écho pour la mélodie et les arpèges.
    const delay = ac.createDelay(1.5);
    const feedback = ac.createGain();
    feedback.gain.value = 0.3;
    const wet = ac.createGain();
    wet.gain.value = 0.22;
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(wet).connect(master);

    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Saturation pour les basses des boss.
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 3.2);
    }

    return { ac, master, delay, noise, curve };
  }

  function envelope(g, t, attack, hold, release, vol) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return t + attack + hold + release;
  }

  function makePlayer(eng, song, seed) {
    const { ac } = eng;
    const r = seeded(song.seed * 1000 + seed);
    const scale = SCALES[song.scale];
    const form = song.kind === 'boss' ? BOSS_FORM : FLIGHT_FORM;
    const drums = DRUMS[song.drums];
    const stepDur = 60 / song.bpm / 4;

    const bus = ac.createGain();
    bus.gain.value = 0;
    bus.connect(eng.master);
    const send = ac.createGain();
    send.gain.value = 1;
    send.connect(eng.delay);
    eng.delay.delayTime.setValueAtTime(stepDur * 3, ac.currentTime);

    let motifA = makeMotif(r);
    let motifB = makeMotif(r);
    let arpShape = song.arp;
    let leadOctave = 2;
    let section = 0, barInSection = 0, step = 0, pass = 0, totalBars = 0;
    let nextTime = 0;
    let started = false;

    const note = (deg, octave) => song.root + octave * 12 + 12 * Math.floor(deg / 7) + scale[((deg % 7) + 7) % 7];
    const chordOf = bar => song.prog[bar % song.prog.length];

    /* ---------- Instruments ---------- */
    function kick(t, vol = 1) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const end = envelope(g, t, 0.002, 0.03, 0.22, 0.9 * vol);
      o.connect(g).connect(bus);
      o.start(t); o.stop(end + 0.02);
    }
    function noiseHit(t, dur, vol, type, freq, q = 0.8, dest = bus) {
      const s = ac.createBufferSource();
      s.buffer = eng.noise;
      const f = ac.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ac.createGain();
      const end = envelope(g, t, 0.001, 0, dur, vol);
      s.connect(f).connect(g).connect(dest);
      s.start(t, Math.random() * 0.5);
      s.stop(end + 0.02);
    }
    function snare(t, vol = 1) {
      noiseHit(t, 0.16, 0.32 * vol, 'bandpass', 1900, 0.7);
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      const end = envelope(g, t, 0.001, 0, 0.09, 0.22 * vol);
      o.connect(g).connect(bus);
      o.start(t); o.stop(end + 0.02);
    }
    const hat = (t, vol = 1, open = false) => noiseHit(t, open ? 0.2 : 0.035, 0.1 * vol, 'highpass', 7600, 0.5);
    const crash = t => noiseHit(t, 1.4, 0.13, 'highpass', 4200, 0.3);

    function synth(t, midi, dur, o) {
      const freq = midiToHz(midi);
      const voices = o.voices || [{ type: o.type || 'square', detune: 0 }];
      const g = ac.createGain();
      let chain = g;
      if (o.filter) {
        const f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.Q.value = o.q || 1;
        f.frequency.setValueAtTime(o.filter, t);
        if (o.filterTo) f.frequency.exponentialRampToValueAtTime(o.filterTo, t + Math.max(0.05, dur * 0.9));
        if (o.wobble) {
          const lfo = ac.createOscillator();
          const depth = ac.createGain();
          lfo.frequency.value = o.wobble;
          depth.gain.value = o.filter * 0.8;
          lfo.connect(depth).connect(f.frequency);
          lfo.start(t); lfo.stop(t + dur + 0.6);
        }
        g.connect(f);
        chain = f;
      }
      if (o.drive) {
        const shaper = ac.createWaveShaper();
        shaper.curve = eng.curve;
        chain.connect(shaper);
        chain = shaper;
      }
      chain.connect(bus);
      if (o.send) {
        const s = ac.createGain();
        s.gain.value = o.send;
        chain.connect(s).connect(send);
      }
      const end = envelope(g, t, o.attack || 0.004, Math.max(0, dur - (o.attack || 0.004)), o.release || 0.12, o.vol);
      for (const v of voices) {
        const osc = ac.createOscillator();
        osc.type = v.type;
        osc.frequency.setValueAtTime(freq, t);
        if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(midiToHz(o.slideTo), t + dur);
        osc.detune.value = v.detune;
        if (o.vibrato) {
          const lfo = ac.createOscillator();
          const depth = ac.createGain();
          lfo.frequency.value = 5.5;
          depth.gain.value = o.vibrato;
          lfo.connect(depth).connect(osc.detune);
          lfo.start(t + 0.1); lfo.stop(end + 0.05);
        }
        osc.connect(g);
        osc.start(t); osc.stop(end + 0.05);
      }
    }

    /* La basse, différente pour chaque morceau. Retourne [demi-tons au-dessus de la fondamentale, durée en pas]. */
    function bassNote(s16, variant, bar) {
      switch (song.bass) {
        case 'octaves': return s16 % 2 === 0 ? [s16 % 4 === 0 ? 0 : 12, 1.6] : null;
        case 'synco': {
          const pat = variant === 2 ? 'x..x..x.x..x.x..' : 'x..x..x...x..x..';
          if (pat[s16] !== 'x') return null;
          return [s16 === 10 || s16 === 13 ? 7 : 0, 2.5];
        }
        case 'roll': return [[0, 0, 12, 0, 7, 0, 12, 10][s16 % 8] + (variant === 2 && s16 >= 8 ? 12 : 0), 0.9];
        case 'wobble': return s16 % 8 === 0 ? [bar % 2 && s16 === 8 ? 12 : 0, 7.5] : null;
        case 'dist': return s16 % 2 === 0 || variant === 2 ? [s16 === 14 ? 12 : 0, 0.9] : null;
        default: return null;
      }
    }
    function playBass(t, s16, variant, chord, bar) {
      const n = bassNote(s16, variant, bar);
      if (!n) return;
      const midi = note(chord, 0) + n[0];
      const dur = n[1] * stepDur;
      if (song.bass === 'wobble') {
        synth(t, midi, dur, { voices: [{ type: 'sawtooth', detune: 0 }, { type: 'square', detune: -8 }], vol: 0.15, filter: 380, q: 6, wobble: song.bpm / 60 * (variant === 2 ? 4 : 2), release: 0.1 });
      } else if (song.bass === 'dist') {
        synth(t, midi, dur, { type: 'sawtooth', vol: 0.12, filter: 1100, filterTo: 300, q: 3, drive: true, release: 0.05 });
      } else {
        synth(t, midi, dur, { type: song.bass === 'roll' ? 'sawtooth' : 'square', vol: 0.13, filter: 900, filterTo: 220, q: 4, release: 0.06 });
      }
    }

    function chordTones(chord, octave) {
      return [0, 2, 4, 7].map(d => note(chord + d, octave));
    }
    function playArp(t, s16, variant, chord) {
      const rate = song.bpm > 130 ? 1 : 2; // en 16e pour les morceaux rapides, en 8e sinon
      if (s16 % rate !== 0) return;
      const tones = chordTones(chord, variant === 2 ? 3 : 2);
      const i = Math.floor(s16 / rate);
      let pick;
      if (arpShape === 'up') pick = tones[i % 4];
      else if (arpShape === 'down') pick = tones[3 - (i % 4)];
      else if (arpShape === 'updown') pick = tones[[0, 1, 2, 3, 2, 1][i % 6]];
      else pick = tones[[0, 2, 1, 3][i % 4]];
      synth(t, pick + 12, stepDur * rate * 0.8, { type: 'square', vol: 0.045, filter: 2600, send: 0.6, release: 0.08 });
    }

    function playLead(t, bar, s16, variant, chord) {
      const motif = variant === 2 ? motifB : motifA;
      const pos = (bar % 2) * 16 + s16;
      const n = motif.find(m => m.s === pos);
      if (!n) return;
      const lift = variant === 2 ? 2 : 0; // la reprise répond une tierce plus haut
      const midi = note(chord + n.deg + lift, leadOctave);
      const dur = n.len * stepDur;
      const kind = song.lead;
      if (kind === 'soft') synth(t, midi, dur, { type: 'triangle', vol: 0.13, vibrato: 7, attack: 0.03, send: 0.5, release: 0.2 });
      else if (kind === 'saw') synth(t, midi, dur, { voices: [{ type: 'sawtooth', detune: -6 }, { type: 'sawtooth', detune: 6 }], vol: 0.06, filter: 2400, vibrato: 5, send: 0.45, release: 0.12 });
      else if (kind === 'pulse') synth(t, midi, dur, { voices: [{ type: 'square', detune: -10 }, { type: 'square', detune: 10 }], vol: 0.05, filter: 1800, vibrato: 4, send: 0.5, release: 0.15 });
      else if (kind === 'siren') synth(t, midi, dur, { type: 'sawtooth', vol: 0.06, filter: 2200, slideTo: midi + (n.len > 2 ? 2 : -1), send: 0.4, release: 0.08, drive: true });
      else if (kind === 'stab') synth(t, midi, Math.min(dur, stepDur * 2), { type: 'square', vol: 0.07, filter: 3000, send: 0.4, release: 0.06 });
      else synth(t, midi, dur, { type: 'square', vol: 0.065, filter: 3400, vibrato: 6, send: 0.45, release: 0.1 });
    }

    function playPad(t, chord, bars = 1) {
      const dur = stepDur * 16 * bars;
      for (const midi of [note(chord, 2), note(chord + 2, 2), note(chord + 4, 2)]) {
        synth(t, midi, dur, { voices: [{ type: 'sawtooth', detune: -9 }, { type: 'triangle', detune: 7 }], vol: 0.035, filter: 900, attack: 0.4, release: 0.8 });
      }
    }
    function playStab(t, chord) {
      for (const midi of [note(chord, 2), note(chord + 2, 2), note(chord + 4, 2)]) {
        synth(t, midi + 12, stepDur * 1.2, { type: 'sawtooth', vol: 0.045, filter: 2600, filterTo: 700, release: 0.05, drive: true });
      }
    }
    function playAlarm(t, s16) {
      if (s16 % 8 !== 0) return;
      const high = s16 === 0;
      synth(t, song.root + 36 + (high ? 7 : 0), stepDur * 7, { type: 'square', vol: 0.05, filter: 2400, slideTo: song.root + 36 + (high ? 0 : 7), release: 0.05, send: 0.3 });
    }
    function riser(t, bars) {
      const s = ac.createBufferSource();
      s.buffer = eng.noise;
      s.loop = true;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2;
      const dur = stepDur * 16 * bars;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + dur * 0.95);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      s.connect(f).connect(g).connect(bus);
      s.start(t); s.stop(t + dur + 0.1);
    }
    function sub(t, chord, bars) {
      synth(t, note(chord, -1), stepDur * 16 * bars * 0.95, { type: 'sine', vol: 0.2, attack: 0.02, release: 0.3 });
    }

    /* ---------- Un pas de séquenceur ---------- */
    function playStep(t) {
      const sec = form[section];
      const s16 = step % 16;
      const bar = totalBars;
      const chord = chordOf(bar);
      const lastBar = barInSection === sec.bars - 1;

      if (s16 === 0 && barInSection === 0 && (pass > 0 || section > 0) && (sec.kick || sec.alarm)) crash(t);
      if (sec.riser && s16 === 0 && barInSection === 0) riser(t, sec.bars);
      if (sec.pad && s16 === 0) playPad(t, chord);
      if (sec.stab && '..x...x...x.x...'[s16] === 'x') playStab(t, chord);
      if (sec.alarm) playAlarm(t, s16);
      // Basses profondes, de temps en temps : sur les débuts de mesures paires et les ponts.
      if (sec.sub && s16 === 0 && (bar % 2 === 0 || !sec.kick)) sub(t, chord, sec.kick ? 1 : 2);

      if (sec.kick) {
        const pats = drums.kick;
        if (pats[bar % pats.length][s16] === 'x') kick(t);
      }
      if (sec.snare) {
        if (lastBar && sec.bars >= 4 && s16 >= 12) snare(t, 0.5 + (s16 - 12) * 0.15); // roulement avant la section suivante
        else if (drums.snare[s16] === 'x') snare(t);
      }
      if (sec.hat) {
        if (drums.hat[s16] === 'x') hat(t, s16 % 4 === 2 ? 1 : 0.7);
        else if (sec.hat === 2) hat(t, 0.35);
        if (sec.hat === 2 && s16 === 14) hat(t, 0.8, true);
      }
      if (sec.bass) playBass(t, s16, sec.bass, chord, bar);
      if (sec.arp) playArp(t, s16, sec.arp, chord);
      if (sec.lead) playLead(t, bar, s16, sec.lead, chord);
    }

    function advance() {
      step++;
      if (step % 16 !== 0) return;
      totalBars++;
      barInSection++;
      if (barInSection < form[section].bars) return;
      barInSection = 0;
      section++;
      if (section < form.length) return;
      // Fin du morceau : on repart du début, avec une mélodie retouchée.
      section = song.kind === 'boss' ? 1 : 1; // l'intro ne revient pas
      pass++;
      motifA = mutate(motifA, r);
      motifB = pass % 2 === 0 ? makeMotif(r) : mutate(motifB, r);
      arpShape = pickFrom(r, ['up', 'down', 'updown', 'skip']);
      leadOctave = pass % 3 === 2 ? 3 : 2;
    }

    return {
      song,
      start(t) {
        nextTime = t;
        started = true;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(0.0001, t);
        bus.gain.linearRampToValueAtTime(1, t + 0.6);
      },
      schedule(until) {
        if (!started) return;
        while (nextTime < until) {
          playStep(nextTime);
          advance();
          nextTime += stepDur;
        }
      },
      resync(t) { if (nextTime < t) nextTime = t; },
      stop(t) {
        started = false;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(bus.gain.value, t);
        bus.gain.linearRampToValueAtTime(0, t + 0.5);
        setTimeout(() => { try { bus.disconnect(); send.disconnect(); } catch (err) { /* déjà débranché */ } }, 1500);
      },
    };
  }

  /* ---------- Pilotage en direct ---------- */
  const LOOKAHEAD = 0.15;
  let engine = null;
  let player = null;
  let active = false;   // le jeu est en vol, à l'écran
  let timer = null;
  let session = Math.floor(Math.random() * 1000);

  function ensureEngine() {
    const ac = Audio8.context();
    if (!ac) return null;
    if (!engine) engine = createEngine(ac, Audio8.musicOut());
    return engine;
  }

  function tick() {
    const ac = Audio8.context();
    if (!ac || !player || ac.state !== 'running') return;
    player.schedule(ac.currentTime + LOOKAHEAD);
  }

  function refresh() {
    const ac = Audio8.context();
    const playing = active && player && S.set.music && ac && !document.hidden;
    if (playing && !timer) {
      player.resync(ac.currentTime + 0.05);
      timer = setInterval(tick, 25);
      engine.master.gain.cancelScheduledValues(ac.currentTime);
      engine.master.gain.setValueAtTime(engine.master.gain.value, ac.currentTime);
      engine.master.gain.linearRampToValueAtTime(1, ac.currentTime + 0.3);
    } else if (!playing && timer) {
      clearInterval(timer);
      timer = null;
      if (engine && ac) {
        engine.master.gain.cancelScheduledValues(ac.currentTime);
        engine.master.gain.setValueAtTime(engine.master.gain.value, ac.currentTime);
        engine.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.25);
      }
    }
  }

  function switchTo(song, seed) {
    const eng = ensureEngine();
    if (!eng) return;
    if (player && player.song === song) return;
    const ac = eng.ac;
    if (player) player.stop(ac.currentTime);
    player = makePlayer(eng, song, seed);
    player.start(ac.currentTime + 0.35);
    refresh();
  }

  /* Un morceau de vol différent à chaque secteur. */
  function flight(sector) {
    switchTo(FLIGHT[(session + sector - 1) % FLIGHT.length], sector);
  }
  function boss(sector) {
    switchTo(BOSSES[(session + sector) % BOSSES.length], sector);
  }
  function stop() {
    const ac = Audio8.context();
    if (player && ac) player.stop(ac.currentTime);
    player = null;
    refresh();
  }
  function setActive(on) {
    active = on;
    refresh();
  }

  document.addEventListener('visibilitychange', refresh);

  /* Rendu hors ligne, pour vérifier les morceaux sans les écouter en direct. */
  async function render(songId, seconds, sampleRate = 22050) {
    const song = SONGS.find(s => s.id === songId);
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ac = new Offline(1, Math.ceil(seconds * sampleRate), sampleRate);
    const out = ac.createGain();
    out.gain.value = 0.32;
    out.connect(ac.destination);
    const eng = createEngine(ac, out);
    const p = makePlayer(eng, song, 1);
    p.start(0.05);
    p.schedule(seconds);
    const buffer = await ac.startRendering();
    return buffer.getChannelData(0);
  }

  return {
    flight, boss, stop, setActive, refresh, render, SONGS,
    get current() { return player ? player.song.id : null; },  // morceau choisi
    get playing() { return !!timer; },                         // en train de jouer
  };
})();
