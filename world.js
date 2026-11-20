// Market Apprentice: 3D Trading Floor
// A walkable hub. Lesson booths open the Learn lessons, the Trading Desk opens Trade,
// the Mentor gives your next step, and Insight Orbs teach quick tips.
// Everything is built from code (no downloaded models or textures), so it works offline.
(() => {
  const W = { supported: false };
  window.World = W;
  function webglOK() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  W.supported = typeof THREE !== 'undefined' && webglOK();
  if (!W.supported) { W.enter = () => false; W.exit = () => {}; W.toast = () => {}; W.state = () => null; return; }

  const MA = () => window.MA;
  const $ = (s) => document.querySelector(s);
  const COL = { up: 0x26a69a, down: 0xef5350, accent: 0xf5b942, blue: 0x58a6ff, done: 0x3fb950, locked: 0x4a5462, purple: 0xa371f7 };
  const BOUNDS = 28.6, PR = 0.55; // room half-size, player radius
  let renderer, scene, camera, built = false, active = false, raf = 0, last = 0;
  let player, mentor, sculpture, deskTex, tickerTex, exitRing;
  const keys = new Set(), stick = { x: 0, y: 0 };
  const colliders = [], interactables = [], orbs = [], booths = [];
  let nearest = null, toastTimer = 0;

  // ---------- helpers ----------
  const mat = (color, emissive = 0, ei = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.55, metalness: 0.15, ...extra });
  function mesh(geo, material, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); return m; }
  function rrect(x, X, Y, w, h, r) {
    x.beginPath(); x.moveTo(X + r, Y); x.lineTo(X + w - r, Y); x.quadraticCurveTo(X + w, Y, X + w, Y + r);
    x.lineTo(X + w, Y + h - r); x.quadraticCurveTo(X + w, Y + h, X + w - r, Y + h); x.lineTo(X + r, Y + h);
    x.quadraticCurveTo(X, Y + h, X, Y + h - r); x.lineTo(X, Y + r); x.quadraticCurveTo(X, Y, X + r, Y); x.closePath();
  }
  // Floating text sign (a sprite that always faces the camera).
  function makeLabel(size = 1.6, w = 512, h = 160) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(size * w / h, size, 1);
    sp.renderOrder = 5;
    sp.set = (top, main, accent = '#f5b942') => {
      const x = c.getContext('2d');
      x.clearRect(0, 0, w, h);
      x.fillStyle = 'rgba(13,17,23,0.86)'; rrect(x, 4, 4, w - 8, h - 8, 26); x.fill();
      x.strokeStyle = accent; x.lineWidth = 5; rrect(x, 4, 4, w - 8, h - 8, 26); x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = accent; x.font = `700 ${Math.round(h * 0.2)}px system-ui,sans-serif`;
      x.fillText(top, w / 2, h * 0.3);
      x.fillStyle = '#e6edf3';
      let fs = Math.round(h * 0.3);
      x.font = `700 ${fs}px system-ui,sans-serif`;
      while (x.measureText(main).width > w - 40 && fs > 12) { fs -= 2; x.font = `700 ${fs}px system-ui,sans-serif`; }
      x.fillText(main, w / 2, h * 0.65);
      tex.needsUpdate = true;
    };
    return sp;
  }
  function makeCharacter(bodyColor, visorColor) {
    const g = new THREE.Group();
    const body = mesh(new THREE.CapsuleGeometry(0.42, 0.75, 6, 16), mat(bodyColor, bodyColor, 0.15), 0, 0.85, 0);
    const head = mesh(new THREE.SphereGeometry(0.34, 20, 16), mat(0xe9d7c3), 0, 1.75, 0);
    const visor = mesh(new THREE.BoxGeometry(0.46, 0.13, 0.12), mat(visorColor, visorColor, 1.2), 0, 1.78, 0.28);
    const shadow = mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }), 0, 0.02, 0);
    shadow.rotation.x = -Math.PI / 2;
    g.add(body, head, visor, shadow);
    g.userData = { body, head };
    return g;
  }
  const addBox = (minX, maxX, minZ, maxZ) => colliders.push({ t: 'box', minX, maxX, minZ, maxZ });
  const addCircle = (x, z, r) => colliders.push({ t: 'c', x, z, r });

  // ---------- world construction ----------
  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const view = $('#worldView');
    view.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a10);
    scene.fog = new THREE.Fog(0x070a10, 38, 75);
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x0b0f18, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(10, 25, 15); scene.add(sun);
    const glow = new THREE.PointLight(COL.accent, 1.2, 30); glow.position.set(0, 9, -6); scene.add(glow);
    const glow2 = new THREE.PointLight(COL.blue, 0.8, 26); glow2.position.set(0, 5, 10); scene.add(glow2);

    // floor + grid
    const floor = mesh(new THREE.PlaneGeometry(62, 64), mat(0x10151d, 0, 0, { roughness: 0.9 }), 0, 0, 1);
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const grid = new THREE.GridHelper(60, 30, 0x2b3a52, 0x1a2230); grid.position.y = 0.01; scene.add(grid);
    // walkway from the entrance
    const path = mesh(new THREE.PlaneGeometry(4, 18), mat(0x1b2433, COL.blue, 0.08), 0, 0.015, 20);
    path.rotation.x = -Math.PI / 2; scene.add(path);

    // walls (front is open so the camera can see in)
    const wallM = mat(0x161d28, 0, 0, { roughness: 0.8 });
    scene.add(mesh(new THREE.BoxGeometry(0.6, 7, 60), wallM, -30, 3.5, 0));
    scene.add(mesh(new THREE.BoxGeometry(0.6, 7, 60), wallM, 30, 3.5, 0));
    scene.add(mesh(new THREE.BoxGeometry(60.6, 7, 0.6), wallM, 0, 3.5, -30));
    // glowing trim strips
    const trim = new THREE.MeshBasicMaterial({ color: COL.accent });
    scene.add(mesh(new THREE.BoxGeometry(0.1, 0.12, 60), trim, -29.65, 0.6, 0));
    scene.add(mesh(new THREE.BoxGeometry(0.1, 0.12, 60), trim, 29.65, 0.6, 0));
    scene.add(mesh(new THREE.BoxGeometry(60, 0.12, 0.1), trim, 0, 0.6, -29.65));
    // front railing
    const rail = mat(0x2b3542, COL.blue, 0.2);
    scene.add(mesh(new THREE.BoxGeometry(22, 0.12, 0.12), rail, -19, 1, 29.6));
    scene.add(mesh(new THREE.BoxGeometry(22, 0.12, 0.12), rail, 19, 1, 29.6));
    // pillars
    for (const [x, z] of [[-27, -27], [27, -27], [-27, 27], [27, 27]]) {
      scene.add(mesh(new THREE.BoxGeometry(1.4, 7, 1.4), wallM, x, 3.5, z));
      scene.add(mesh(new THREE.BoxGeometry(1.45, 0.15, 1.45), new THREE.MeshBasicMaterial({ color: COL.blue }), x, 6.2, z));
      addBox(x - 0.7, x + 0.7, z - 0.7, z + 0.7);
    }

    buildTicker();
    buildSculpture();
    buildDesk();
    buildBooths();
    buildMentor();
    buildExit();
    buildOrbs();

    player = makeCharacter(0xf5b942, 0x58a6ff);
    player.position.set(0, 0, 23);
    player.rotation.y = Math.PI;
    scene.add(player);

    bindInput();
    built = true;
  }

  function buildTicker() {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#0b0f16'; x.fillRect(0, 0, 2048, 128);
    x.font = '700 64px ui-monospace,Menlo,monospace'; x.textBaseline = 'middle';
    const items = ['APPR +2.14%', 'CNDL -0.87%', 'TRND +1.32%', 'RISK -0.25%', 'STOP +0.66%', 'GRID +3.05%', 'WICK -1.48%', 'BULL +0.92%', 'BEAR -2.20%'];
    let px = 20;
    for (const it of items) {
      x.fillStyle = it.includes('+') ? '#26a69a' : '#ef5350';
      x.fillText(it + '  ◆', px, 66);
      px += x.measureText(it + '  ◆').width + 50;
    }
    tickerTex = new THREE.CanvasTexture(c);
    tickerTex.wrapS = THREE.RepeatWrapping; tickerTex.repeat.set(2, 1);
    const t = mesh(new THREE.PlaneGeometry(56, 1.8), new THREE.MeshBasicMaterial({ map: tickerTex }), 0, 5.6, -29.65);
    scene.add(t);
    const sign = makeLabel(2.4, 1024, 160); sign.set('WELCOME TO THE', 'MARKET APPRENTICE TRADING FLOOR');
    sign.position.set(0, 3.4, -29.3); scene.add(sign);
  }

  // A giant 3D candlestick chart that keeps playing.
  function buildSculpture() {
    const N = 30, g = new THREE.Group();
    g.position.set(0, 0, -8);
    g.add(mesh(new THREE.BoxGeometry(26, 0.8, 5), mat(0x1a2230, COL.blue, 0.12), 0, 0.4, 0));
    g.add(mesh(new THREE.BoxGeometry(26.2, 0.08, 5.2), new THREE.MeshBasicMaterial({ color: COL.blue }), 0, 0.82, 0));
    const upM = mat(COL.up, COL.up, 0.55), downM = mat(COL.down, COL.down, 0.55);
    const bodyG = new THREE.BoxGeometry(0.52, 1, 0.52), wickG = new THREE.BoxGeometry(0.09, 1, 0.09);
    const bars = [];
    for (let i = 0; i < N; i++) {
      const x = -11.6 + i * 0.8;
      const b = mesh(bodyG, upM, x, 2, 0), w = mesh(wickG, upM, x, 2, 0);
      g.add(b, w); bars.push({ b, w });
    }
    scene.add(g);
    addBox(-13.2, 13.2, -10.6, -5.4);
    const data = Engine.generate(20240607, 4000).candles;
    sculpture = { g, bars, data, k: 0, N, upM, downM, timer: 0 };
    const sign = makeLabel(1.3); sign.set('LIVE SIMULATED MARKET', 'Market Pulse');
    sign.position.set(0, 10.6, -8); scene.add(sign);
    updateSculpture();
  }
  function updateSculpture() {
    const s = sculpture, win = s.data.slice(s.k, s.k + s.N);
    let lo = Infinity, hi = -Infinity;
    for (const c of win) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); }
    const Y = (p) => 1 + (p - lo) / (hi - lo || 1) * 8;
    win.forEach((c, i) => {
      const { b, w } = s.bars[i], m = c.c >= c.o ? s.upM : s.downM;
      b.material = m; w.material = m;
      const y0 = Y(Math.min(c.o, c.c)), y1 = Y(Math.max(c.o, c.c));
      b.scale.y = Math.max(0.06, y1 - y0); b.position.y = (y0 + y1) / 2;
      const wl = Y(c.l), wh = Y(c.h);
      w.scale.y = Math.max(0.06, wh - wl); w.position.y = (wl + wh) / 2;
    });
    drawDeskScreen(win);
  }

  function buildDesk() {
    const g = new THREE.Group(); g.position.set(0, 0, 4);
    g.add(mesh(new THREE.BoxGeometry(7.4, 1.05, 1.7), mat(0x222c3a, 0, 0), 0, 0.53, 0));
    g.add(mesh(new THREE.BoxGeometry(7.5, 0.06, 1.8), new THREE.MeshBasicMaterial({ color: COL.accent }), 0, 1.07, 0));
    const c = document.createElement('canvas'); c.width = 512; c.height = 288;
    deskTex = new THREE.CanvasTexture(c); deskTex.userData = { c };
    const screenM = new THREE.MeshBasicMaterial({ map: deskTex });
    const frameM = mat(0x0d1117, 0, 0);
    [[-2.45, 0.42], [0, 0], [2.45, -0.42]].forEach(([x, ry], i) => {
      const s = i === 1 ? 1.15 : 1;
      const f = mesh(new THREE.BoxGeometry(2.3 * s, 1.35 * s, 0.1), frameM, x, 2.0, -0.35); f.rotation.y = ry;
      const p = mesh(new THREE.PlaneGeometry(2.16 * s, 1.22 * s), screenM, x, 2.0, -0.29); p.rotation.y = ry;
      if (i !== 1) { p.position.x += Math.sin(ry) * 0.06; }
      g.add(f, p);
    });
    scene.add(g);
    addBox(-3.8, 3.8, 3.0, 5.0);
    const sign = makeLabel(1.3); sign.set('TRADE · $10,000 FAKE MONEY', 'Trading Desk');
    sign.position.set(0, 3.7, 4); scene.add(sign);
    interactables.push({ kind: 'desk', x: 0, z: 6.2, r: 2.6, title: 'Open the Trading Desk (Trade)' });
  }
  function drawDeskScreen(win) {
    if (!deskTex) return;
    const c = deskTex.userData.c, x = c.getContext('2d'), w = c.width, h = c.height;
    x.fillStyle = '#0d1117'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#1e2836'; x.lineWidth = 1;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * h / 6); x.lineTo(w, i * h / 6); x.stroke(); }
    let lo = Infinity, hi = -Infinity;
    for (const k of win) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); }
    const Y = (p) => 20 + (hi - p) / (hi - lo || 1) * (h - 40), slot = w / win.length;
    win.forEach((k, i) => {
      const col = k.c >= k.o ? '#26a69a' : '#ef5350', cx = (i + 0.5) * slot;
      x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2;
      x.beginPath(); x.moveTo(cx, Y(k.h)); x.lineTo(cx, Y(k.l)); x.stroke();
      const y0 = Y(Math.max(k.o, k.c)), y1 = Y(Math.min(k.o, k.c));
      x.fillRect(cx - slot * 0.32, y0, slot * 0.64, Math.max(2, y1 - y0));
    });
    const lastC = win[win.length - 1];
    x.fillStyle = '#f5b942'; x.font = '700 26px system-ui,sans-serif'; x.fillText('$' + lastC.c.toFixed(2), 14, 34);
    deskTex.needsUpdate = true;
  }

  // Lesson booths: lessons 1-4 on the left wall (front to back), 5-8 on the right wall (back to front).
  const BOOTH_SPOTS = [[-23, 15], [-23, 5], [-23, -5], [-23, -15], [23, -15], [23, -5], [23, 5], [23, 15]];
  function buildBooths() {
    const lessons = MA().LESSONS;
    lessons.forEach((lesson, i) => {
      const [x, z] = BOOTH_SPOTS[i];
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const side = x < 0 ? 1 : -1; // faces the room centre
      const panel = mesh(new THREE.BoxGeometry(0.3, 4.2, 4.4), mat(0x1a2230, 0, 0), -side * 2.6, 2.1, 0);
      const ped = mesh(new THREE.CylinderGeometry(1.0, 1.25, 1.0, 28), mat(0x222c3a, 0, 0), 0, 0.5, 0);
      const ringM = new THREE.MeshBasicMaterial({ color: COL.accent, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const ring = mesh(new THREE.RingGeometry(1.7, 2.0, 48), ringM, 0, 0.03, 0); ring.rotation.x = -Math.PI / 2;
      const holoM = mat(COL.accent, COL.accent, 0.9);
      const holo = mesh(new THREE.OctahedronGeometry(0.55), holoM, 0, 2.0, 0);
      const stripM = new THREE.MeshBasicMaterial({ color: COL.accent });
      const strip = mesh(new THREE.BoxGeometry(0.06, 4.2, 0.12), stripM, -side * 2.44, 2.1, 0);
      g.add(panel, ped, ring, holo, strip);
      const sign = makeLabel(1.25); sign.position.set(0, 3.7, 0); g.add(sign);
      scene.add(g);
      addCircle(x, z, 1.25);
      addBox(x - side * 2.6 - 0.2, x - side * 2.6 + 0.2, z - 2.2, z + 2.2);
      booths.push({ lesson, i, ringM, holoM, stripM, holo, sign });
      interactables.push({ kind: 'lesson', id: lesson.id, i, x: x + side * 2.3, z, r: 2.4, title: `Lesson ${i + 1}: ${lesson.title}` });
    });
    refreshBooths();
  }
  function refreshBooths() {
    const done = MA().progress().done;
    for (const b of booths) {
      const d = done.includes(b.lesson.id), open = MA().isUnlocked(b.i);
      const col = d ? COL.done : open ? COL.accent : COL.locked;
      b.ringM.color.setHex(col); b.stripM.color.setHex(col);
      b.holoM.color.setHex(col); b.holoM.emissive.setHex(col); b.holoM.emissiveIntensity = open ? 0.9 : 0.15;
      b.status = d ? 'done' : open ? 'open' : 'locked';
      b.sign.set(`LESSON ${b.i + 1} · ${d ? 'COMPLETE ✓' : open ? 'OPEN' : 'LOCKED'}`, b.lesson.title.replace(/:.*$/, ''), d ? '#3fb950' : open ? '#f5b942' : '#6b7685');
    }
  }

  function buildMentor() {
    mentor = makeCharacter(0x6e40c9, 0xf5b942);
    mentor.position.set(4.2, 0, 19.5); mentor.rotation.y = -0.6;
    scene.add(mentor);
    const sign = makeLabel(1.0); sign.set('MENTOR', 'Ask: what next?', '#a371f7');
    sign.position.set(0, 2.9, 0); mentor.add(sign);
    addCircle(4.2, 19.5, 0.6);
    interactables.push({ kind: 'mentor', x: 4.2, z: 19.5, r: 2.4, title: 'Talk to the Mentor' });
  }

  function buildExit() {
    exitRing = mesh(new THREE.TorusGeometry(1.6, 0.14, 12, 48), new THREE.MeshBasicMaterial({ color: COL.blue }), -6, 1.9, 27.6);
    scene.add(exitRing);
    const disc = mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshBasicMaterial({ color: COL.blue, transparent: true, opacity: 0.18, side: THREE.DoubleSide }), -6, 1.9, 27.6);
    scene.add(disc);
    const sign = makeLabel(0.9); sign.set('EXIT', 'Main menu', '#58a6ff'); sign.position.set(-6, 4.1, 27.6); scene.add(sign);
    interactables.push({ kind: 'exit', x: -6, z: 26.4, r: 2.0, title: 'Exit to the main menu' });
  }

  // Insight orbs: walk into them to learn a quick tip.
  const TIPS = [
    'Plan the trade, trade the plan. Decide entry, stop and target before you click.',
    'Risk 1–2% of your account per trade. Survival comes first, profits second.',
    'A stop-loss is not a sign of weakness. It is the price where your idea is proven wrong.',
    'With a 1:2 risk-reward you only need to win about 1 trade in 3 to break even.',
    'The trend is your friend: higher highs and higher lows = uptrend.',
    'Support is a floor, resistance is a ceiling. More touches = stronger level.',
    'Never move your stop further away to "give it room". That is how small losses become big ones.',
    'No setup? No trade. Sitting in cash is a valid position.',
    'Moving averages lag. Use them to confirm a trend, not to predict one.',
    'Review your losing trades. Your mistakes are your best teacher.',
  ];
  const ORB_SPOTS = [[-14, 22], [14, 23], [-17, 0], [17, 0], [-10, -20], [10, -20], [-26, 24], [26, -25], [-26, -25], [14, 12]];
  function buildOrbs() {
    const got = MA().store.get('ma.orbs', []);
    const geo = new THREE.IcosahedronGeometry(0.38, 1);
    ORB_SPOTS.forEach(([x, z], i) => {
      const m = mesh(geo, mat(0xffd27a, COL.accent, 1.3), x, 1.2, z);
      const halo = mesh(new THREE.RingGeometry(0.55, 0.7, 32), new THREE.MeshBasicMaterial({ color: COL.accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 0, 0, 0);
      m.add(halo);
      m.visible = !got.includes(i);
      scene.add(m);
      orbs.push({ i, m, halo, x, z, phase: i * 0.7 });
    });
  }
  function collectOrb(o) {
    o.m.visible = false;
    const got = MA().store.get('ma.orbs', []);
    if (!got.includes(o.i)) { got.push(o.i); MA().store.set('ma.orbs', got); }
    W.toast(`<b>Insight orb ${got.length}/${ORB_SPOTS.length}</b><br>${TIPS[o.i]}`, 6500);
    updateHud();
  }

  // ---------- rank / HUD ----------
  const RANKS = [['Intern', 0], ['Apprentice', 20], ['Junior Trader', 45], ['Trader', 70], ['Senior Trader', 95], ['Master Trader', 115]];
  function rankInfo() {
    const lessons = MA().progress().done.length;
    const orbN = MA().store.get('ma.orbs', []).length;
    const rec = MA().store.get('ma.records', null);
    const pts = lessons * 10 + orbN * 2 + (rec ? 5 + Math.round(Math.min(100, rec.bestDiscipline) / 5) : 0);
    let r = 0; while (r < RANKS.length - 1 && pts >= RANKS[r + 1][1]) r++;
    const next = RANKS[r + 1];
    return { pts, name: RANKS[r][0], next: next ? next[0] : null, need: next ? next[1] : RANKS[r][1], from: RANKS[r][1], lessons, orbN };
  }
  W.rankInfo = rankInfo;
  function updateHud() {
    const r = rankInfo();
    const pctv = r.next ? Math.round((r.pts - r.from) / (r.need - r.from) * 100) : 100;
    $('#wHud').innerHTML = `<div class="w-rank">${r.name}</div>
      <div class="w-bar"><i style="width:${pctv}%"></i></div>
      <div class="w-sub">${r.next ? `${r.pts}/${r.need} XP to ${r.next}` : `${r.pts} XP · top rank!`}</div>
      <div class="w-sub">Lessons ${r.lessons}/8 · Orbs ${r.orbN}/${ORB_SPOTS.length}</div>`;
  }

  // ---------- interactions ----------
  function interact() {
    if (!nearest) return;
    const it = nearest;
    if (it.kind === 'lesson') {
      const b = booths[it.i];
      if (b.status === 'locked') { W.toast(`<b>Locked.</b> Finish Lesson ${it.i}: ${MA().LESSONS[it.i - 1].title} first.`); return; }
      MA().fromWorld(); MA().openLesson(it.id);
    } else if (it.kind === 'desk') { MA().fromWorld(); MA().show('trade'); }
    else if (it.kind === 'exit') { MA().toMenu(); }
    else if (it.kind === 'mentor') mentorTalk();
  }
  function mentorTalk() {
    const done = MA().progress().done, L = MA().LESSONS, rec = MA().store.get('ma.records', null), r = rankInfo();
    const nextI = L.findIndex((l) => !done.includes(l.id));
    let msg;
    if (done.length === 0) msg = `Welcome to the floor, apprentice. Every pro started exactly where you are.<br><br><b>Your first step:</b> walk to <b>Booth 1</b> on the <b>left wall</b> (it's glowing gold). Booths unlock one at a time.`;
    else if (nextI >= 0) msg = `Good work: ${done.length} of 8 lessons done.<br><br><b>Next:</b> Booth ${nextI + 1}, <i>${L[nextI].title}</i>, on the <b>${nextI < 4 ? 'left' : 'right'} wall</b>.<br><br>Tip: you can also practise at the Trading Desk any time.`;
    else if (!rec) msg = `You've finished every lesson. Now it's time to prove it.<br><br><b>Next:</b> go to the <b>Trading Desk</b> in the middle of the floor, pick the <b>Trend Following</b> playbook and aim for a <b>discipline score of 70+</b>.`;
    else msg = `Rank: <b>${r.name}</b>. Your best discipline score is <b>${rec.bestDiscipline}/100</b>.<br><br>${rec.bestDiscipline < 70 ? 'Get your discipline to 70+: a stop on every trade, risk 2% or less, and targets at least 1.5× your risk.' : 'Try each playbook on the same market using “Replay this market”, and learn which strategy fits which conditions.'}${r.orbN < ORB_SPOTS.length ? `<br><br>There are still <b>${ORB_SPOTS.length - r.orbN} insight orbs</b> hidden around the floor.` : ''}`;
    MA().modal(`<h2 style="color:#a371f7">Mentor</h2><p>${msg}</p><div class="row" style="margin-top:14px"><button class="primary" data-close>Got it</button></div>`);
  }

  // ---------- input ----------
  function bindInput() {
    const modalOpen = () => !$('#modal').hidden;
    document.addEventListener('keydown', (e) => {
      if (!active || modalOpen() || e.target.matches('input,select,textarea')) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'e' || k === 'enter' || k === ' ') { if (!e.repeat) interact(); return; }
      keys.add(k);
    });
    document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());
    $('#wPrompt').addEventListener('click', interact);
    $('#wMenu').addEventListener('click', () => MA().toMenu());
    $('#wHelp').addEventListener('click', () => MA().modal(`<h2>How to play</h2>
      <p><b>Move:</b> WASD or arrow keys (hold Shift to run). On a phone, drag the joystick in the bottom-left.<br>
      <b>Interact:</b> walk up to something and press <b>E</b>, or tap the button that appears.</p>
      <p><b>Lesson booths</b> line the left and right walls (1–4 on the left, 5–8 on the right). <span style="color:#f5b942">Gold</span> = open, <span style="color:#3fb950">green</span> = complete, grey = locked.<br>
      <b>Trading Desk</b> (centre): practise in the simulated market.<br>
      <b>Mentor</b> (purple, near the entrance): tells you your next step.<br>
      <b>Insight orbs</b>: 10 glowing orbs hidden around the floor, each with a pro tip.</p>
      <p>Earn XP to rank up from Intern to Master Trader: lessons (10 XP), orbs (2 XP) and Trade sessions (up to 25 XP for discipline).</p>
      <div class="row" style="margin-top:14px"><button class="primary" data-close>Let's go</button></div>`));
    // virtual joystick
    const base = $('#wStick'), knob = base.querySelector('i');
    let pid = null;
    const move = (e) => {
      const r = base.getBoundingClientRect(), R = r.width / 2;
      let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
      const len = Math.hypot(dx, dy); if (len > R) { dx *= R / len; dy *= R / len; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      stick.x = dx / R; stick.y = dy / R;
    };
    base.addEventListener('pointerdown', (e) => { pid = e.pointerId; base.setPointerCapture(pid); move(e); e.preventDefault(); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === pid) move(e); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; stick.x = stick.y = 0; knob.style.transform = ''; };
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
    window.addEventListener('resize', () => { if (active) resize(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });
  }

  function blocked(x, z) {
    if (x < -BOUNDS || x > BOUNDS || z < -BOUNDS || z > BOUNDS) return true;
    for (const c of colliders) {
      if (c.t === 'box') { if (x > c.minX - PR && x < c.maxX + PR && z > c.minZ - PR && z < c.maxZ + PR) return true; }
      else if (Math.hypot(x - c.x, z - c.z) < c.r + PR) return true;
    }
    return false;
  }

  // ---------- loop ----------
  function resize() {
    const v = $('#worldView'), w = v.clientWidth, h = v.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 62 : 50;
    camera.updateProjectionMatrix();
  }
  const camOff = new THREE.Vector3(), camTarget = new THREE.Vector3();
  function frame(t) {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    // keep the drawing buffer matched to the on-screen size (it is 0 while the screen is hidden)
    const v = renderer.domElement;
    if (Math.abs(v.width - Math.round(v.clientWidth * renderer.getPixelRatio())) > 1 || Math.abs(v.height - Math.round(v.clientHeight * renderer.getPixelRatio())) > 1) resize();
    const time = t / 1000;

    // movement
    let dx = stick.x, dz = stick.y;
    if (keys.has('w') || keys.has('arrowup')) dz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dz += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    const len = Math.hypot(dx, dz);
    const moving = len > 0.08;
    if (moving) {
      if (len > 1) { dx /= len; dz /= len; }
      const sp = (keys.has('shift') ? 11 : 7) * dt;
      const p = player.position;
      if (!blocked(p.x + dx * sp, p.z)) p.x += dx * sp;
      if (!blocked(p.x, p.z + dz * sp)) p.z += dz * sp;
      const target = Math.atan2(dx, dz);
      let diff = target - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.rotation.y += diff * Math.min(1, dt * 12);
    }
    const ud = player.userData;
    ud.body.position.y = 0.85 + (moving ? Math.abs(Math.sin(time * 11)) * 0.12 : Math.sin(time * 2) * 0.02);
    ud.head.position.y = ud.body.position.y + 0.9;

    // camera follows
    const portrait = camera.aspect < 1;
    camOff.set(0, portrait ? 15 : 10.5, portrait ? 14 : 12.5);
    camTarget.copy(player.position).add(camOff);
    camera.position.lerp(camTarget, Math.min(1, dt * 5));
    camera.lookAt(player.position.x, 1.2, player.position.z - (portrait ? 3 : 2));

    // ambient animation
    sculpture.timer += dt;
    if (sculpture.timer > 0.9) { sculpture.timer = 0; sculpture.k = (sculpture.k + 1) % (sculpture.data.length - sculpture.N); updateSculpture(); }
    tickerTex.offset.x = (tickerTex.offset.x + dt * 0.035) % 1;
    for (const b of booths) { b.holo.rotation.y += dt * 1.2; b.holo.position.y = 2.0 + Math.sin(time * 2 + b.i) * 0.15; }
    exitRing.rotation.z += dt * 0.8;
    mentor.userData.body.position.y = 0.85 + Math.sin(time * 2.2) * 0.04;
    mentor.lookAt(player.position.x, 0, player.position.z);
    for (const o of orbs) {
      if (!o.m.visible) continue;
      o.m.position.y = 1.2 + Math.sin(time * 2.5 + o.phase) * 0.25;
      o.m.rotation.y += dt * 2; o.halo.lookAt(camera.position);
      if (Math.hypot(player.position.x - o.x, player.position.z - o.z) < 1.3) collectOrb(o);
    }

    // nearest interactable
    let best = null, bd = Infinity;
    for (const it of interactables) {
      const d = Math.hypot(player.position.x - it.x, player.position.z - it.z);
      if (d < it.r && d < bd) { best = it; bd = d; }
    }
    if (best !== nearest) {
      nearest = best;
      const pr = $('#wPrompt');
      if (best) {
        const locked = best.kind === 'lesson' && booths[best.i].status === 'locked';
        pr.innerHTML = `<kbd>E</kbd> ${locked ? '&#128274; ' : ''}${best.title}`;
        pr.classList.toggle('locked', locked);
        pr.hidden = false;
      } else pr.hidden = true;
    }
    renderer.render(scene, camera);
  }

  // ---------- public API ----------
  W.enter = () => {
    try { if (!built) build(); } catch (e) { console.warn('3D world failed to start', e); W.supported = false; return false; }
    document.body.classList.toggle('touch', matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0);
    active = true; last = 0; keys.clear(); nearest = null; $('#wPrompt').hidden = true;
    resize(); refreshBooths(); updateHud();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    if (!MA().store.get('ma.worldIntro', false)) { MA().store.set('ma.worldIntro', true); setTimeout(() => $('#wHelp').click(), 400); }
    return true;
  };
  W.exit = () => { active = false; cancelAnimationFrame(raf); keys.clear(); stick.x = stick.y = 0; };
  W.toast = (html, ms = 4500) => {
    const t = $('#wToast'); t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  };
  // Read-only state for automated tests.
  W.state = () => (built ? { x: player.position.x, z: player.position.z, nearest: nearest && (nearest.id || nearest.kind), active } : null);
  W.teleport = (x, z) => { if (built) { player.position.set(x, 0, z); } };
})();
