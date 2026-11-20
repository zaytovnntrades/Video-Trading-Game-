// Market Apprentice: customizable characters.
// Chunky low-poly figures with jointed arms and legs, a forward-leaning sprint cycle,
// and spring-driven "ragdoll" wobble (Body physics: stiff / bouncy / floppy).
// Original designs, built entirely from code.
(() => {
  const OK = typeof THREE !== 'undefined';
  const AV = { supported: OK };
  window.Avatar = AV;
  if (!OK) { AV.preview = { start: () => false, update() {}, stop() {}, setRun() {} }; return; }

  const WOB = {
    stiff: { k: 220, d: 26, amp: 0.02 },
    bouncy: { k: 90, d: 9, amp: 0.06 },
    floppy: { k: 30, d: 3.2, amp: 0.17 },
  };
  const BUILD = { slim: [0.84, 0.88], athletic: [1, 1], bulky: [1.32, 1.3] };
  const HEAD = { normal: 1, big: 1.3, huge: 1.6 };

  const matCache = new Map();
  function lm(color, emissive) {
    const key = color + '|' + (emissive || '');
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshStandardMaterial({
        color, roughness: 0.7, metalness: 0.05, flatShading: true,
        emissive: emissive ? color : 0x000000, emissiveIntensity: emissive ? 0.9 : 0,
      }));
    }
    return matCache.get(key);
  }
  function box(w, h, d, color, x = 0, y = 0, z = 0, glow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(color, glow));
    m.position.set(x, y, z); return m;
  }
  function part(geo, color, x = 0, y = 0, z = 0, glow) {
    const m = new THREE.Mesh(geo, lm(color, glow)); m.position.set(x, y, z); return m;
  }
  const UP = new THREE.Vector3(0, 1, 0);

  // ---------------- build ----------------
  AV.build = function (cfg) {
    const [w, a] = BUILD[cfg.build] || BUILD.athletic;
    const HS = HEAD[cfg.head] || 1;
    const o = cfg.outfit, skin = cfg.skin, shirt = cfg.shirt, pants = cfg.pants, acc = cfg.accent;
    const upperArmC = o === 'singlet' ? skin : shirt;
    const foreArmC = o === 'tee' || o === 'singlet' ? skin : shirt;
    const thighC = o === 'singlet' ? shirt : pants;
    const shinC = o === 'tee' || o === 'singlet' ? skin : pants;

    const root = new THREE.Group();
    const hips = new THREE.Group(); hips.position.y = 1.03; root.add(hips);
    hips.add(box(0.5 * w, 0.26, 0.3, thighC));

    // torso (pivots at the waist so it can lean and wobble)
    const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
    const depth = 0.36 * (w > 1 ? 1.15 : 1);
    torso.add(box(0.62 * w, 0.66, depth, shirt, 0, 0.36, 0));
    if (w > 1.1) torso.add(box(0.7 * w, 0.24, depth + 0.02, shirt, 0, 0.56, 0)); // broad chest
    if (o === 'singlet') { torso.add(box(0.15 * w, 0.14, depth - 0.04, skin, -0.24 * w, 0.64, 0), box(0.15 * w, 0.14, depth - 0.04, skin, 0.24 * w, 0.64, 0)); }
    if (o === 'suit') { torso.add(box(0.18, 0.42, 0.02, '#ffffff', 0, 0.47, depth / 2 + 0.005), box(0.08, 0.38, 0.03, acc, 0, 0.45, depth / 2 + 0.02)); }
    if (o === 'track') { torso.add(box(0.04, 0.6, 0.02, '#e6edf3', 0, 0.36, depth / 2 + 0.005)); }
    if (o === 'hoodie') { torso.add(box(0.46 * w, 0.32, 0.16, shirt, 0, 0.74, -depth / 2 - 0.04), box(0.34 * w, 0.16, 0.02, acc, 0, 0.2, depth / 2 + 0.005)); }
    if (o === 'tee' || o === 'singlet') torso.add(box(0.3 * w, 0.1, 0.02, acc, 0, 0.5, depth / 2 + 0.005)); // chest stripe / logo
    torso.add(box(0.15, 0.1, 0.15, skin, 0, 0.73, 0)); // neck

    // head
    const headP = new THREE.Group(); headP.position.y = 0.78; torso.add(headP);
    const r = 0.27 * HS, hy = r * 0.95;
    const masked = cfg.face === 'mask';
    headP.add(part(new THREE.IcosahedronGeometry(r, 1), masked ? acc : skin, 0, hy, 0));
    const eyeY = hy + r * 0.08, eyeZ = r * 0.86;
    if (masked) {
      headP.add(box(0.13 * HS, 0.1 * HS, 0.03, '#ffffff', -0.1 * HS, eyeY, eyeZ), box(0.13 * HS, 0.1 * HS, 0.03, '#ffffff', 0.1 * HS, eyeY, eyeZ));
      headP.add(box(0.16 * HS, 0.07 * HS, 0.03, skin, 0, hy - r * 0.5, r * 0.8));
    }
    headP.add(box(0.055 * HS, 0.085 * HS, 0.03, '#111111', -0.1 * HS, eyeY, eyeZ + 0.02), box(0.055 * HS, 0.085 * HS, 0.03, '#111111', 0.1 * HS, eyeY, eyeZ + 0.02));
    headP.add(box(0.05 * HS, 0.07 * HS, 0.05, masked ? acc : skin, 0, hy - r * 0.15, r * 0.95)); // nose

    // hair (big hair styles flatten under a hat)
    const hc = cfg.hairColor;
    let hair = cfg.hair;
    if (cfg.hat !== 'none' && ['spiky', 'mohawk', 'afro'].includes(hair)) hair = 'buzz';
    const cap = (scale = 1.07, color = hc) => {
      const m = part(new THREE.SphereGeometry(r * scale, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), color, 0, hy, -r * 0.04);
      m.rotation.x = -0.25; return m;
    };
    if (!masked) {
      if (hair === 'buzz' || hair === 'spiky' || hair === 'ponytail') headP.add(cap());
      if (hair === 'spiky') {
        for (let i = 0; i < 9; i++) {
          const th = (i / 9) * Math.PI * 2, ph = 0.35 + (i % 3) * 0.18;
          const dir = new THREE.Vector3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th) - 0.35).normalize();
          const c = part(new THREE.ConeGeometry(0.075 * HS, 0.26 * HS, 5), hc);
          c.position.set(dir.x * r * 0.95, hy + dir.y * r * 0.95, dir.z * r * 0.95);
          c.quaternion.setFromUnitVectors(UP, dir);
          headP.add(c);
        }
      }
      if (hair === 'mohawk') headP.add(box(0.08 * HS, 0.26 * HS, r * 1.9, hc, 0, hy + r * 0.98, -r * 0.08));
      if (hair === 'afro') headP.add(part(new THREE.IcosahedronGeometry(r * 1.25, 1), hc, 0, hy + r * 0.55, -r * 0.45));
      if (hair === 'ponytail') { const t = part(new THREE.CylinderGeometry(0.07 * HS, 0.04 * HS, 0.42 * HS, 6), hc, 0, hy - r * 0.1, -r * 1.12); t.rotation.x = 0.45; headP.add(t); }
    }
    // hats
    if (cfg.hat === 'cap') { headP.add(cap(1.1, acc)); headP.add(box(r * 1.3, 0.04, r * 0.9, acc, 0, hy + r * 0.33, r * 0.95)); }
    if (cfg.hat === 'headband') {
      const hb = part(new THREE.CylinderGeometry(r * 1.0, r * 1.0, 0.09 * HS, 14, 1, true), acc, 0, hy + r * 0.38, 0);
      hb.material = hb.material.clone(); hb.material.side = THREE.DoubleSide; headP.add(hb);
    }
    if (cfg.hat === 'beanie') { headP.add(cap(1.12, acc)); headP.add(part(new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.12, 12), acc, 0, hy + r * 0.25, -r * 0.05)); headP.add(part(new THREE.IcosahedronGeometry(0.08 * HS, 0), '#e6edf3', 0, hy + r * 1.15, -r * 0.1)); }
    if (cfg.hat === 'tophat') {
      headP.add(part(new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.04, 16), '#1b1b1b', 0, hy + r * 0.85, 0));
      headP.add(part(new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.5 * HS, 14), '#1b1b1b', 0, hy + r * 0.85 + 0.25 * HS, 0));
      headP.add(part(new THREE.CylinderGeometry(r * 0.84, r * 0.84, 0.08, 14), acc, 0, hy + r * 0.85 + 0.06, 0));
    }
    if (cfg.hat === 'crown') {
      headP.add(part(new THREE.CylinderGeometry(r * 0.78, r * 0.72, 0.17 * HS, 10, 1), '#f5b942', 0, hy + r * 0.98, 0, true));
      for (let i = 0; i < 5; i++) { const th = i / 5 * Math.PI * 2; headP.add(part(new THREE.ConeGeometry(0.06 * HS, 0.16 * HS, 4), '#f5b942', Math.sin(th) * r * 0.75, hy + r * 0.98 + 0.15 * HS, Math.cos(th) * r * 0.75, true)); }
    }
    // face extras
    if (cfg.face === 'shades') headP.add(box(r * 1.5, 0.09 * HS, 0.05, '#111111', 0, eyeY, eyeZ + 0.04));
    if (cfg.face === 'visor') headP.add(box(r * 1.6, 0.11 * HS, 0.07, '#58a6ff', 0, eyeY, eyeZ + 0.04, true));
    if (cfg.face === 'mustache') headP.add(box(r * 0.75, 0.06 * HS, 0.05, hc, 0, hy - r * 0.38, r * 0.9));

    // arms: shoulder -> elbow -> hand
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * (0.31 * w + 0.09 * a), 0.62, 0); torso.add(sh);
      sh.add(box(0.17 * a, 0.38, 0.18 * a, upperArmC, 0, -0.17, 0));
      if (o === 'tee') sh.add(box(0.2 * a, 0.16, 0.21 * a, shirt, 0, -0.04, 0)); // sleeve
      const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
      el.add(box(0.15 * a, 0.32, 0.16 * a, foreArmC, 0, -0.15, 0));
      el.add(box(0.16 * a, 0.16, 0.16 * a, skin, 0, -0.36, 0));
      if (o === 'track' || o === 'suit') el.add(box(0.16 * a, 0.05, 0.17 * a, o === 'suit' ? '#ffffff' : '#e6edf3', 0, -0.29, 0));
      sh.rotation.z = s * 0.12;
      arms.push({ sh, el, s });
    }
    // legs: hip -> knee -> shoe
    const legs = [];
    for (const s of [-1, 1]) {
      const hp = new THREE.Group(); hp.position.set(s * 0.13 * w, -0.08, 0); hips.add(hp);
      hp.add(box(0.22 * w, 0.46, 0.24, thighC, 0, -0.21, 0));
      const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
      kn.add(box(0.19, 0.42, 0.21, shinC, 0, -0.2, 0));
      if (o === 'tee' || o === 'singlet') kn.add(box(0.2, 0.08, 0.22, '#e6edf3', 0, -0.36, 0)); // socks
      kn.add(box(0.22, 0.12, 0.38, cfg.shoes, 0, -0.45, 0.07));
      kn.add(box(0.23, 0.04, 0.39, '#e6edf3', 0, -0.5, 0.07)); // sole
      legs.push({ hp, kn });
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55 * Math.max(1, w * 0.9), 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; root.add(shadow);

    root.userData.av = { hips, torso, headP, arms, legs, phase: Math.random() * 6, sp: {}, wob: WOB[cfg.wobble] || WOB.bouncy, top: 1.91 + r * 1.9 + (cfg.hat === 'tophat' ? 0.5 * HS : 0) + (hair === 'afro' ? r * 0.8 : 0) };
    root.userData.cfgKey = JSON.stringify(cfg);
    return root;
  };

  // ---------------- animation ----------------
  function spring(A, key, obj, prop, target, W, h) {
    const s = A.sp[key] || (A.sp[key] = { v: 0 });
    s.v += ((target - obj.rotation[prop]) * W.k - s.v * W.d) * h;
    obj.rotation[prop] += s.v * h;
  }
  // m = movement amount 0 (idle) .. 1 (sprinting)
  AV.animate = function (root, dt, m, time) {
    const A = root.userData.av, W = A.wob;
    A.phase += dt * (2.5 + 11 * m);
    const ph = A.phase, sw = Math.sin(ph);
    A.legs[0].hp.rotation.x = -sw * 0.95 * m;
    A.legs[1].hp.rotation.x = sw * 0.95 * m;
    A.legs[0].kn.rotation.x = Math.max(0, Math.sin(ph - 1.3)) * 1.5 * m + 0.04;
    A.legs[1].kn.rotation.x = Math.max(0, Math.sin(ph + Math.PI - 1.3)) * 1.5 * m + 0.04;
    A.hips.position.y = 1.03 + Math.abs(Math.cos(ph)) * 0.11 * m;
    const idle = W.amp * (1 - m * 0.5);
    const steps = Math.max(1, Math.ceil(dt / 0.008)), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      spring(A, 'tx', A.torso, 'x', 0.4 * m + Math.sin(time * 1.1) * idle * 0.6, W, h);
      spring(A, 'tz', A.torso, 'z', Math.sin(time * 1.3) * idle + sw * 0.06 * m, W, h);
      spring(A, 'ty', A.torso, 'y', -sw * 0.18 * m, W, h);
      spring(A, 'hx', A.headP, 'x', -0.3 * m + Math.sin(time * 1.7 + 1) * idle, W, h);
      spring(A, 'hz', A.headP, 'z', Math.sin(time * 1.5 + 2) * idle * 1.6, W, h);
      A.arms.forEach((arm, j) => {
        const dir = j ? -1 : 1;
        spring(A, 'ax' + j, arm.sh, 'x', dir * sw * 1.2 * m + Math.sin(time * 1.9 + j * 2) * idle, W, h);
        spring(A, 'az' + j, arm.sh, 'z', arm.s * (0.12 + idle * 0.9 + Math.abs(Math.sin(time * 1.2 + j)) * idle), W, h);
        spring(A, 'ex' + j, arm.el, 'x', -(0.2 + 1.3 * m) + Math.sin(time * 2.3 + j) * idle * 0.8, W, h);
      });
    }
  };
  AV.dispose = function (root) {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  };

  // ---------------- customizer preview ----------------
  let pv = null;
  AV.preview = {
    start(container, cfg) {
      try {
        if (!pv) {
          const r = new THREE.WebGLRenderer({ antialias: true });
          r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
          const s = new THREE.Scene(); s.background = new THREE.Color(0x111823);
          s.add(new THREE.HemisphereLight(0xb8c8ff, 0x1a1410, 0.85));
          const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(3, 5, 4); s.add(key);
          const rim = new THREE.PointLight(0xf5b942, 0.9, 12); rim.position.set(-2.5, 2.5, -2.5); s.add(rim);
          const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.25, 32), new THREE.MeshStandardMaterial({ color: 0x1d2633, roughness: 0.6 }));
          pod.position.y = -0.125; s.add(pod);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xf5b942 }));
          ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; s.add(ring);
          const c = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
          pv = { r, s, c, rot: 0.5, run: false, drag: null, av: null, raf: 0, last: 0 };
          const el = r.domElement; el.style.touchAction = 'none'; el.style.cursor = 'grab';
          el.addEventListener('pointerdown', (e) => { pv.drag = { x: e.clientX, rot: pv.rot }; el.setPointerCapture(e.pointerId); });
          el.addEventListener('pointermove', (e) => { if (pv.drag) pv.rot = pv.drag.rot + (e.clientX - pv.drag.x) * 0.012; });
          const up = () => { pv.drag = null; };
          el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        }
        if (pv.r.domElement.parentNode !== container) container.appendChild(pv.r.domElement);
        this.update(cfg);
        pv.active = true; pv.last = 0;
        cancelAnimationFrame(pv.raf);
        const loop = (t) => {
          if (!pv.active) return;
          pv.raf = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (t - (pv.last || t)) / 1000); pv.last = t;
          const el = pv.r.domElement, w = container.clientWidth, hgt = container.clientHeight;
          if (w && hgt && (el.width !== Math.round(w * pv.r.getPixelRatio()) || el.height !== Math.round(hgt * pv.r.getPixelRatio()))) {
            pv.r.setSize(w, hgt, false); el.style.width = '100%'; el.style.height = '100%';
            pv.c.aspect = w / hgt; pv.c.updateProjectionMatrix();
          }
          const top = pv.av.userData.av.top;
          pv.c.position.set(0, top * 0.62, 3.2 + top * 1.25);
          pv.c.lookAt(0, top * 0.5, 0);
          if (!pv.drag) pv.rot += dt * (pv.run ? 0.15 : 0.35);
          pv.av.rotation.y = pv.rot;
          AV.animate(pv.av, dt, pv.run ? 1 : 0, t / 1000);
          pv.r.render(pv.s, pv.c);
        };
        pv.raf = requestAnimationFrame(loop);
        return true;
      } catch (e) { console.warn('preview failed', e); return false; }
    },
    update(cfg) {
      if (!pv) return;
      if (pv.av) { pv.s.remove(pv.av); AV.dispose(pv.av); }
      pv.av = AV.build(cfg); pv.s.add(pv.av);
    },
    setRun(b) { if (pv) pv.run = b; },
    stop() { if (pv) { pv.active = false; cancelAnimationFrame(pv.raf); } },
  };
})();
