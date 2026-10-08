/*
 * Mohamed Rafat · portfolio
 * Everything that moves. Content works without it; this file adds the light,
 * the lattice, the drawings and the choreography.
 */
(function () {
  'use strict';

  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  const motion = !!(G && ST) && !reduced;
  const Lattice = window.Lattice;
  const Sun = window.Sun;

  // Nothing waits for an animation that can never run.
  if (!G || !ST) html.classList.remove('js');
  if (G && ST) G.registerPlugin(ST);
  if (G && Split) G.registerPlugin(Split);

  const barH = () => parseFloat(getComputedStyle(html).getPropertyValue('--bar-h')) || 64;

  /* =================================================================== GEOMETRY */
  const PANEL = { w: 400, h: 640, cx: 200, cy: 330 };
  const DENSITY = { '8': 2.6, '6': 2, '12': 3.86 };          // star diameter ÷ polygon edge
  const RANGE = { '8': [45, 78], '6': [50, 80], '12': [50, 76] };
  const DEFAULT = { fold: '8', angle: 67.5 };
  const state = { fold: DEFAULT.fold, angle: DEFAULT.angle };
  const edge = (fold, diameter) => diameter / DENSITY[fold];
  const SCREEN_D = 80;                                       // star size on the hero screen
  const CUT = { spread: 1.35, line: 0.75 };
  const ZOOM_MAX = 52;
  const FOLD_NAME = { '8': '8-fold', '6': '6-fold', '12': '12-fold' };

  // Two-centred pointed arch, concentric for every inset.
  function arch(inset) {
    const R = 300 - inset;
    const ay = 300 - Math.sqrt(R * R - 10000);
    const b = 620 - inset;
    return `M${inset} ${b}L${inset} 300A${R} ${R} 0 0 1 200 ${ay.toFixed(2)}A${R} ${R} 0 0 1 ${400 - inset} 300L${400 - inset} ${b}Z`;
  }
  $$('[data-arch]').forEach(p => p.setAttribute('d', arch(+p.dataset.arch)));

  /* ============================================================ SHARED PATTERNS */
  const PATTERNS = [
    { id: 'lat-sun', d: SCREEN_D, align: true },
    { id: 'lat-shutter', d: 58 },
    { id: 'lat-door', d: 46 },
    { id: 'lat-swatch', d: 17 }
  ];
  function buildPatterns() {
    for (const P of PATTERNS) {
      const el = document.getElementById(P.id);
      if (!el) continue;
      const t = Lattice.tile({ fold: state.fold, angle: state.angle, size: edge(state.fold, P.d) });
      el.setAttribute('width', t.w.toFixed(3));
      el.setAttribute('height', t.h.toFixed(3));
      if (P.align) el.setAttribute('patternTransform', `translate(${PANEL.cx} ${PANEL.cy})`);
      el.firstElementChild.setAttribute('d', Lattice.toPath(t.segs));
    }
  }

  /* =============================================================== THE SCREEN */
  const hero = $('.hero');
  const screenSvg = $('[data-screen]');
  const slot = $('[data-screen-slot]');
  const linesG = $('[data-lattice-lines]');
  const depthP = $('[data-lattice-depth]');
  const interior = $('.arch-interior', screenSvg);

  function screenSegments() {
    const segs = Lattice.region({
      fold: state.fold, angle: state.angle, size: edge(state.fold, SCREEN_D),
      x: 0, y: 0, w: PANEL.w, h: PANEL.h, cx: PANEL.cx, cy: PANEL.cy
    });
    return segs
      .filter(s => Math.max(s[0], s[2]) > 12 && Math.min(s[0], s[2]) < 388 && Math.max(s[1], s[3]) > 30 && Math.min(s[1], s[3]) < 608)
      .map(s => {
        const d1 = Math.hypot(s[0] - PANEL.cx, s[1] - PANEL.cy);
        const d2 = Math.hypot(s[2] - PANEL.cx, s[3] - PANEL.cy);
        return d1 <= d2 ? [s[0], s[1], s[2], s[3], d1] : [s[2], s[3], s[0], s[1], d2];
      });
  }

  // Draw the lattice as one path (crisp at any zoom).
  function drawScreen() {
    const segs = screenSegments();
    const d = Lattice.toPath(segs);
    depthP.setAttribute('d', d);
    linesG.textContent = '';
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('class', 'lattice-path');
    p.setAttribute('d', d);
    linesG.appendChild(p);
    return segs;
  }

  // The laser cut is drawn on a canvas laid exactly over the screen: hundreds of
  // growing lines per frame are cheap there, and the SVG takes over when it ends.
  function makeCutter(segs) {
    const css = getComputedStyle(screenSvg);
    const hex = v => { const m = /#([0-9a-f]{6})/i.exec(v || ''); const n = parseInt(m ? m[1] : 'ffc36a', 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    const hot = hex(css.getPropertyValue('--hot')), ember = hex(css.getPropertyValue('--ember')), cold = hex(css.getPropertyValue('--scr-lattice'));
    // Cooling like metal: hot gold, through ember, to the lattice colour.
    const shades = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16;
      const [a, b, u] = t < .5 ? [hot, ember, t * 2] : [ember, cold, (t - .5) * 2];
      return `rgb(${a.map((h, j) => Math.round(h + (b[j] - h) * u)).join(',')})`;
    });
    let max = 1;
    for (const s of segs) max = Math.max(max, s[4]);
    const lines = segs.map(s => ({ x: s[0], y: s[1], dx: s[2] - s[0], dy: s[3] - s[1], delay: (s[4] / max) * CUT.spread }));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const k = geo.k0;
    const c = document.createElement('canvas');
    c.className = 'cut-canvas';
    c.setAttribute('aria-hidden', 'true');
    c.width = Math.ceil(PANEL.w * k * dpr);
    c.height = Math.ceil(PANEL.h * k * dpr);
    c.style.cssText = `left:${geo.ox}px;top:${geo.oy}px;width:${PANEL.w * k}px;height:${PANEL.h * k}px`;
    hero.appendChild(c);
    const ctx = c.getContext('2d');
    const clip = new Path2D(arch(16));
    let alive = true;
    return {
      max,
      draw(t) {
        if (!alive) return;
        ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
        ctx.clearRect(0, 0, PANEL.w, PANEL.h);
        ctx.save();
        ctx.clip(clip);
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'square';
        for (const l of lines) {
          const p = (t - l.delay) / CUT.line;
          if (p <= 0.02) continue;
          const q = p >= 1 ? 1 : p;
          const e = 1 - Math.pow(1 - q, 2.2);
          ctx.strokeStyle = shades[Math.round(clamp((q - .55) / .45, 0, 1) * 16)];
          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x + l.dx * e, l.y + l.dy * e);
          ctx.stroke();
        }
        ctx.restore();
      },
      remove() { alive = false; c.remove(); }
    };
  }
  let finishCut = null;

  // Map panel units onto .screen-slot, then zoom toward the central star.
  const geo = { W: 1, H: 1, k0: 1, ox: 0, oy: 0 };
  let zoomP = 0;
  function measureScreen() {
    const hr = hero.getBoundingClientRect();
    const sr = slot.getBoundingClientRect();
    geo.W = hr.width; geo.H = hr.height;
    geo.k0 = sr.width / PANEL.w;
    geo.ox = sr.left - hr.left; geo.oy = sr.top - hr.top;
    hero.style.setProperty('--halo-x', (geo.ox + PANEL.cx * geo.k0).toFixed(1) + 'px');
    hero.style.setProperty('--halo-y', (geo.oy + PANEL.cy * geo.k0).toFixed(1) + 'px');
    setZoom(zoomP);
  }
  function setZoom(p) {
    zoomP = p;
    if (p > 0.001 && finishCut) finishCut();
    const { W, H, k0, ox, oy } = geo;
    const k = k0 * Math.pow(ZOOM_MAX, p);
    const sx0 = ox + PANEL.cx * k0, sy0 = oy + PANEL.cy * k0;
    const m = 1 - Math.pow(1 - p, 2);
    const sx = sx0 + (W / 2 - sx0) * m;
    const sy = sy0 + (H / 2 - sy0) * m;
    screenSvg.setAttribute('viewBox',
      `${(PANEL.cx - sx / k).toFixed(3)} ${(PANEL.cy - sy / k).toFixed(3)} ${(W / k).toFixed(3)} ${(H / k).toFixed(3)}`);
  }

  /* ========================================================= LIGHT & THE SUN */
  const sunpatch = $('[data-sunpatch]');
  const sunReading = $('[data-sun-reading]');
  const lightBtn = $('[data-light-toggle]');
  const lightLabel = $('[data-light-label]');
  const themeMeta = $('meta[name="theme-color"]');
  const Light = { mode: html.dataset.light || 'auto' };
  const compass = az => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];

  function resolveTheme(mode) {
    if (mode === 'day' || mode === 'night') return mode;
    return Sun.position(new Date()).alt > -2 ? 'day' : 'night';
  }
  function updateLightUI() {
    lightLabel.textContent = { auto: 'Auto', day: 'Day', night: 'Night' }[Light.mode];
    const now = Light.mode === 'auto' ? 'automatic, following the sun over Assiut' : Light.mode;
    const next = { auto: 'day', day: 'night', night: 'automatic' }[Light.mode];
    lightBtn.setAttribute('aria-label', `Lighting: ${now}. Switch to ${next}.`);
    syncThemeColor();
  }
  // Mobile browser chrome takes the colour of whichever surface is under the bar.
  function syncThemeColor() {
    if (!themeMeta) return;
    const c = getComputedStyle(html).getPropertyValue('--bar-bg').trim();
    if (c) themeMeta.content = c;
  }
  function updateSun() {
    const { alt, az } = Sun.position(new Date());
    if (sunReading) sunReading.textContent = alt > 0 ? `Sun ${Math.round(alt)}° ${compass(az)}` : 'Sun below the horizon';
    html.toggleAttribute('data-golden', alt > -2 && alt < 12);
    // Shadow of the screen: low sun, longer and softer; morning and evening lean opposite ways.
    const skew = clamp((180 - az) * 0.3, -32, 32);
    const sy = 1 + clamp((32 - Math.max(alt, 0)) / 64, 0, 0.42);
    const blur = 1.6 + clamp((40 - Math.max(alt, 0)) / 30, 0, 1.4);
    sunpatch.style.setProperty('--sun-skew', skew.toFixed(1) + 'deg');
    sunpatch.style.setProperty('--sun-sy', sy.toFixed(3));
    sunpatch.style.setProperty('--sun-blur', blur.toFixed(2) + 'px');
  }
  function applyLight(mode) {
    Light.mode = mode;
    html.dataset.light = mode;
    html.dataset.theme = resolveTheme(mode);
    try { mode === 'auto' ? localStorage.removeItem('mr-light') : localStorage.setItem('mr-light', mode); } catch (e) { /* private mode */ }
    updateLightUI();
    updateSun();
  }
  lightBtn.addEventListener('click', () => {
    const next = { auto: 'day', day: 'night', night: 'auto' }[Light.mode];
    const before = html.dataset.theme;
    if (!document.startViewTransition || reduced || resolveTheme(next) === before) { applyLight(next); return; }
    const r = lightBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    html.classList.add('vt-busy');
    const vt = document.startViewTransition(() => applyLight(next));
    vt.ready.then(() => {
      html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(.2,.7,.1,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
    vt.finished.finally(() => html.classList.remove('vt-busy'));
  });

  // Clock in Assiut, and auto lighting that crosses sunrise and sunset on its own.
  const clock = $('[data-clock]');
  const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Cairo' });
  function tick() {
    const now = new Date();
    clock.textContent = clockFmt.format(now);
    clock.setAttribute('datetime', now.toISOString());
    if (Light.mode === 'auto') {
      const t = resolveTheme('auto');
      if (t !== html.dataset.theme) { html.dataset.theme = t; updateLightUI(); }
    }
    updateSun();
  }

  /* =================================================================== CURSOR */
  function initCursor() {
    if (!fine) return;
    const cad = $('.cad');
    const rx = $('[data-cad-x]'), ry = $('[data-cad-y]'), label = $('[data-cad-label]');
    const pad = n => String(Math.max(0, Math.round(n))).padStart(4, '0');
    let mx = -100, my = -100, raf = 0, target = null, on = false;
    const SNAP = 'a, button, label, input, summary, [data-snap]';

    function render() {
      raf = 0;
      cad.style.setProperty('--cx', mx + 'px');
      cad.style.setProperty('--cy', my + 'px');
      rx.textContent = 'X ' + pad(mx);
      ry.textContent = 'Y ' + pad(window.scrollY + my);
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        const p = 6;
        cad.classList.toggle('label-below', r.top < 26);
        cad.style.setProperty('--sx', (r.left - p) + 'px');
        cad.style.setProperty('--sy', (r.top - p) + 'px');
        cad.style.setProperty('--sw', (r.width + p * 2) + 'px');
        cad.style.setProperty('--sh', (r.height + p * 2) + 'px');
      }
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(render); };
    function kind(el) {
      if (el.dataset.cadLabel) return el.dataset.cadLabel;
      if (el.matches('a[href^="mailto:"]')) return 'email';
      if (el.matches('a[target="_blank"]')) return 'external';
      if (el.matches('a')) return 'link';
      if (el.matches('input[type="range"]')) return 'slider';
      if (el.matches('input, label')) return 'option';
      return 'button';
    }
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (!on) { on = true; html.classList.add('has-cad'); }
      mx = e.clientX; my = e.clientY;
      request();
    }, { passive: true });
    addEventListener('scroll', request, { passive: true });
    document.addEventListener('pointerover', e => {
      const el = e.target.closest && e.target.closest(SNAP);
      if (el === target) return;
      target = el;
      cad.classList.toggle('is-snapped', !!el);
      if (el) label.textContent = kind(el);
      request();
    });
    document.addEventListener('pointerdown', () => cad.classList.add('is-down'));
    document.addEventListener('pointerup', () => cad.classList.remove('is-down'));
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) { mx = my = -100; request(); } });
  }

  /* ============================================================== NAV, RULER */
  const sections = $$('main > section, body > footer');
  const navLinks = $$('.bar-nav a');
  const ruler = $('[data-ruler]');
  const rulerMarks = $('[data-ruler-marks]');
  let markEls = [];

  function buildRuler() {
    if (!ruler || getComputedStyle(ruler).display === 'none') return;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    rulerMarks.textContent = '';
    markEls = [];
    for (const s of sections) {
      if (!s.dataset.sheet) continue;
      const top = s.getBoundingClientRect().top + window.scrollY;
      const li = document.createElement('li');
      li.style.setProperty('--at', clamp(top / max, 0, 1).toFixed(4));
      const a = document.createElement('a');
      a.href = '#' + (s.id || 'top');
      a.tabIndex = -1;
      a.textContent = s.dataset.sheet;
      li.appendChild(a);
      rulerMarks.appendChild(li);
      markEls.push({ li, s });
    }
  }

  function onScroll() {
    const line = barH() + 1;
    const throughScreen = zoomP > 0.88;
    let current = null;
    for (const s of sections) {
      if (s === hero && throughScreen) continue;
      const r = s.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { current = s; break; }
    }
    if (!current) current = throughScreen ? sections[1] : sections[0];
    const surface = current.dataset.surface || 'exterior';
    if (html.dataset.surface !== surface) { html.dataset.surface = surface; syncThemeColor(); }

    const id = current.id;
    navLinks.forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (ruler) {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      ruler.style.setProperty('--progress', clamp(window.scrollY / max, 0, 1).toFixed(4));
      markEls.forEach(m => m.li.classList.toggle('is-on', m.s === current || (m.s.id === 'contact' && current.classList.contains('brief'))));
    }
  }

  /* ================================================================== GANTT */
  const gantt = $('[data-gantt]');
  function ym(s, endOfMonth) {
    const [y, m] = s.split('-').map(Number);
    if (!m) return endOfMonth ? Date.UTC(y + 1, 0, 1) - 1 : Date.UTC(y, 0, 1);
    return endOfMonth ? Date.UTC(y, m, 1) - 1 : Date.UTC(y, m - 1, 1);
  }
  function layoutGantt() {
    if (!gantt) return;
    const from = ym(gantt.dataset.from), to = ym(gantt.dataset.to);
    const span = to - from;
    const now = Date.now();
    const f = t => clamp((t - from) / span, 0, 1);
    gantt.style.setProperty('--t', f(now).toFixed(4));
    const axis = $('[data-gantt-axis]', gantt);
    const y0 = new Date(from).getUTCFullYear(), y1 = new Date(to).getUTCFullYear();
    let a = '';
    for (let y = y0; y < y1; y++) a += `<span class="yr" style="--at:${f(Date.UTC(y, 0, 1)).toFixed(4)}">${y}</span>`;
    const label = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date(now));
    a += `<span class="today-label">Today · ${label}</span>`;
    axis.innerHTML = a;

    $$('.g-row', gantt).forEach(row => {
      const s = row.dataset.start, e = row.dataset.end, kind = row.dataset.kind;
      const yearOnly = /^\d{4}$/.test(s);
      if (kind === 'mile') {
        const t = yearOnly ? Date.UTC(+s, 6, 1) : ym(s);
        row.style.setProperty('--s', f(t).toFixed(4));
        return;
      }
      const start = ym(s);
      const end = e === 'now' ? now : ym(e, true);
      const solidEnd = kind === 'plan' ? Math.min(now, end) : end;
      row.style.setProperty('--s', f(start).toFixed(4));
      row.style.setProperty('--e', f(kind === 'plan' ? end : solidEnd).toFixed(4));
      if (kind === 'plan') row.style.setProperty('--now-e', f(solidEnd).toFixed(4));
      // A start known only to the year fades in across that year, instead of claiming January.
      if (yearOnly) {
        const yearEnd = Date.UTC(+s + 1, 0, 1);
        const fz = clamp((Math.min(yearEnd, solidEnd) - start) / Math.max(1, solidEnd - start), 0, 1);
        row.dataset.fuzzy = '';
        row.style.setProperty('--fz', (fz * 85).toFixed(1) + '%');
      }
    });
  }

  /* ============================================================== GENERATOR */
  const genForm = $('[data-gen-form]');
  const GEN_D = 132;
  function polyPath(poly) { return 'M' + poly.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z'; }
  function renderGen() {
    if (!genForm) return;
    const fold = genForm.fold.value;
    const angle = +genForm.angle.value;
    const size = edge(fold, GEN_D);
    const box = { fold, angle, size, x: 0, y: 0, w: 480, h: 480, cx: 240, cy: 240 };
    $('[data-gen-lattice]').setAttribute('d', Lattice.toPath(Lattice.region(box)));
    const polys = Lattice.construction(box);
    $('[data-gen-construction]').innerHTML = `<path d="${polys.map(polyPath).join('')}"/>`;
    // Hankin rays of the central polygon, plus the contact angle at one midpoint.
    const sides = +fold;
    const centre = polys.find(p => p.length === sides && Math.hypot(
      p.reduce((s, q) => s + q[0], 0) / p.length - 240, p.reduce((s, q) => s + q[1], 0) / p.length - 240) < 1);
    let rays = '';
    if (centre) {
      const segs = Lattice.hankin(centre, angle);
      rays += `<path d="${Lattice.toPath(segs)}"/>`;
      const [a, b] = [centre[0], centre[1]];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const ang1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const ray = segs.find(s => Math.hypot(s[0] - mx, s[1] - my) < .01 &&
        Math.cos(Math.atan2(s[3] - s[1], s[2] - s[0]) - ang1) > 0);
      if (ray) {
        const ang2 = Math.atan2(ray[3] - ray[1], ray[2] - ray[0]);
        let delta = ang2 - ang1;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        const r = 40;
        const p1 = [mx + r * Math.cos(ang1), my + r * Math.sin(ang1)];
        const p2 = [mx + r * Math.cos(ang2), my + r * Math.sin(ang2)];
        const mid = ang1 + delta / 2;
        rays += `<path class="gen-edge" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/>`;
        rays += `<path class="gen-arc" d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}"/>`;
        rays += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5"/>`;
        rays += `<text x="${(mx + (r + 16) * Math.cos(mid)).toFixed(1)}" y="${(my + (r + 16) * Math.sin(mid) + 6).toFixed(1)}" text-anchor="middle">θ</text>`;
      }
    }
    $('[data-gen-rays]').innerHTML = rays;
    const tiling = Lattice.TILINGS[fold].tiling;
    $('[data-gen-angle-out]').textContent = angle + '°';
    genForm.angle.setAttribute('aria-valuetext', `${angle} degrees`);
    $('[data-gen-readout]').textContent = `${tiling} tiling · ${FOLD_NAME[fold]} · θ ${angle}°`;
  }
  function setFold(fold, keepAngle) {
    const [lo, hi] = RANGE[fold];
    const input = genForm.angle;
    input.min = lo; input.max = hi;
    if (!keepAngle) input.value = Lattice.TILINGS[fold].angle;
    input.value = clamp(+input.value, lo, hi);
  }
  function applyPattern(fold, angle) {
    state.fold = fold; state.angle = angle;
    buildPatterns();
    drawScreen();
    $('[data-dim-pattern]').textContent = `${FOLD_NAME[fold]} · θ ${angle}°`;
    setFavicon();
  }
  function initGenerator() {
    if (!genForm) return;
    let raf = 0;
    const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderGen(); }); };
    genForm.addEventListener('input', e => {
      if (e.target.name === 'fold') setFold(e.target.value, false);
      if (e.target.name === 'construction') $('.gen').classList.toggle('hide-construction', !e.target.checked);
      queue();
    });
    const status = $('[data-gen-status]');
    genForm.addEventListener('submit', e => {
      e.preventDefault();
      applyPattern(genForm.fold.value, +genForm.angle.value);
      status.textContent = `Done. The facade, the shutters and the doors are re-cut at ${FOLD_NAME[state.fold]}, θ ${state.angle}°.`;
    });
    $('[data-gen-reset]').addEventListener('click', () => {
      genForm.fold.value = DEFAULT.fold;
      setFold(DEFAULT.fold, false);
      genForm.angle.value = DEFAULT.angle;
      renderGen();
      applyPattern(DEFAULT.fold, DEFAULT.angle);
      status.textContent = 'Back to the original 8-fold screen.';
    });
    setFold(state.fold, true);
    renderGen();
  }

  function setFavicon() {
    const segs = Lattice.region({ fold: state.fold, angle: state.angle, size: edge(state.fold, 54), x: -40, y: -40, w: 80, h: 80, cx: 0, cy: 0 });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64"><defs><clipPath id="c"><circle r="30"/></clipPath></defs><circle r="31" fill="#A9472A"/><g clip-path="url(#c)"><path d="${Lattice.toPath(segs, 1)}" fill="none" stroke="#1F3560" stroke-width="4.5"/></g></svg>`;
    const link = $('link[rel="icon"]');
    if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ================================================================== COPY */
  function initCopy() {
    $$('[data-copy]').forEach(btn => {
      const label = $('[data-copy-label]', btn);
      label.setAttribute('aria-live', 'polite');
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;left:-999px';
          document.body.appendChild(ta); ta.select();
          try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
          ta.remove();
        }
        label.textContent = ok ? 'Copied' : 'Select and copy';
        btn.classList.toggle('is-done', ok);
        clearTimeout(btn._t);
        btn._t = setTimeout(() => { label.textContent = 'Copy'; btn.classList.remove('is-done'); }, 2200);
      });
    });
  }

  /* ================================================================== MENU */
  let lenis = null;
  function initMenu() {
    const menu = $('#menu');
    if (!menu) return;
    const supported = typeof menu.showPopover === 'function';
    if (!supported) {
      const btn = $('.menu-btn');
      btn.addEventListener('click', () => menu.classList.toggle('is-open'));
    }
    menu.addEventListener('toggle', e => {
      if (!lenis) return;
      if (e.newState === 'open') lenis.stop(); else lenis.start();
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => { if (supported) menu.hidePopover(); }));
  }

  /* ============================================================== DIAGRAMS */
  // Plate 01: a request travels down the stack and the response comes back up.
  function bldgLoop(root) {
    const floors = $$('[data-floor]', root);
    const car = $('[data-car]', root), shaft = $('.shaft', root);
    const req = $('[data-req]', root), res = $('[data-res]', root);
    const method = $('[data-req-method]', root), path = $('[data-req-path]', root), code = $('[data-res-code]', root);
    const calls = [
      ['GET', '/api/donations', '200 OK'],
      ['POST', '/api/beneficiaries', '201 Created'],
      ['GET', '/api/distributions/12', '200 OK'],
      ['PUT', '/api/donations/7', '204 No Content']
    ];
    let i = 0, tl = null, live = false;
    const yOf = f => f.offsetTop + f.offsetHeight / 2 - car.offsetHeight / 2 - car.offsetTop;
    function play() {
      const [m, p, c] = calls[i];
      i = (i + 1) % calls.length;
      tl = G.timeline({ onComplete: () => { if (live) play(); } });
      tl.call(() => {
        method.textContent = m; path.textContent = p; code.textContent = 'awaiting response';
        res.classList.remove('is-in'); car.classList.remove('is-up');
      })
        .set(car, { y: 0 })
        .fromTo(req, { opacity: .25, x: -8 }, { opacity: 1, x: 0, duration: .45, ease: 'expo.out' });
      floors.forEach((f, n) => {
        tl.to(car, { y: yOf(f), duration: n === floors.length - 1 ? .55 : .42, ease: 'power2.inOut' })
          .call(() => f.classList.add('is-hit'))
          .call(() => f.classList.remove('is-hit'), null, '+=.42');
      });
      tl.call(() => car.classList.add('is-up'), null, '+=.1')
        .to(car, { y: 0, duration: 1, ease: 'power2.inOut' }, '+=.15')
        .call(() => { code.textContent = c; res.classList.add('is-in'); })
        .fromTo(res, { x: 8 }, { x: 0, duration: .4, ease: 'expo.out' })
        .to({}, { duration: 1.3 });
    }
    ST.create({
      trigger: root, start: 'top 90%', end: 'bottom 10%',
      onToggle: self => {
        live = self.isActive;
        if (live && (!tl || !tl.isActive())) { if (tl && tl.progress() < 1) tl.resume(); else play(); }
        else if (!live && tl) tl.pause();
      }
    });
    if (shaft) shaft.setAttribute('aria-hidden', 'true');
  }

  // Plate 02: rows in the desktop client sync one by one.
  function winLoop(root) {
    const rows = $$('[data-row]', root);
    const pills = rows.map(r => $('[data-pill]', r));
    const ids = rows.map(r => r.firstElementChild);
    const status = $('.win-status', root), sync = $('[data-sync]', root);
    let batch = 0, tl = null, live = false;
    function play() {
      tl = G.timeline({ onComplete: () => { if (live) play(); } });
      tl.call(() => {
        status.classList.remove('is-done');
        sync.textContent = 'Syncing through HttpClient';
        pills.forEach(p => { p.textContent = 'pending'; p.classList.remove('is-synced'); });
        ids.forEach((el, n) => { el.textContent = String(412 + batch * rows.length + n).padStart(4, '0'); });
        batch = (batch + 1) % 6;
      })
        .fromTo(rows, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .5, stagger: .1, ease: 'expo.out' });
      pills.forEach(p => {
        tl.call(() => { p.textContent = 'synced'; p.classList.add('is-synced'); }, null, '+=.55');
      });
      tl.call(() => { status.classList.add('is-done'); sync.textContent = `Up to date · ${rows.length} records synced`; }, null, '+=.3')
        .to({}, { duration: 1.8 })
        .to(rows, { opacity: 0, x: 10, duration: .35, stagger: .05, ease: 'power2.in' });
    }
    ST.create({
      trigger: root, start: 'top 90%', end: 'bottom 10%',
      onToggle: self => {
        live = self.isActive;
        if (live && (!tl || !tl.isActive())) { if (tl && tl.progress() < 1) tl.resume(); else play(); }
        else if (!live && tl) tl.pause();
      }
    });
  }

  /* ========================================================== CHOREOGRAPHY */
  // Animations in About wait for the screen to dissolve, instead of playing unseen under the hero.
  const handoff = { queue: [], done: false };
  function playHandoff() {
    if (handoff.done) return;
    handoff.done = true;
    handoff.queue.forEach((get, n) => G.delayedCall(0.15 + n * 0.08, () => { const tw = get(); if (tw) tw.play(); }));
  }
  const deferToHandoff = el => !handoff.done && html.classList.contains('has-zoom') && !!el.closest('.about-body, .about .sheet-head');

  function intro() {
    const en = $('.hn-en'), ar = $('.hn-ar');
    const panel = $('.screen-panel', screenSvg);
    const segs = drawScreen();
    const cutter = makeCutter(segs);
    const max = cutter.max;

    // The laser opens the screen from the centre outward; light floods in behind the cut.
    const defs = $('defs', screenSvg);
    const cp = document.createElementNS(SVGNS, 'clipPath');
    cp.id = 'cut-reveal';
    const circle = document.createElementNS(SVGNS, 'circle');
    circle.setAttribute('cx', PANEL.cx); circle.setAttribute('cy', PANEL.cy); circle.setAttribute('r', 0);
    cp.appendChild(circle); defs.appendChild(cp);
    interior.setAttribute('clip-path', 'url(#cut-reveal)');
    linesG.style.visibility = 'hidden';

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      finishCut = null;
      cutter.remove();
      linesG.style.visibility = '';
      interior.removeAttribute('clip-path');
      cp.remove();
    };
    finishCut = finish;

    const T0 = 0.55;
    const clockT = { t: 0 };
    G.set(panel, { opacity: 0, y: 18 });
    G.set([en, ar], { opacity: 1, '--sweep': '-15%' });
    en.classList.add('is-sweeping');
    ar.classList.add('is-sweeping');

    const tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(panel, { opacity: 1, y: 0, duration: 1 }, 0.05)
      .to(clockT, { t: CUT.spread + CUT.line, duration: CUT.spread + CUT.line, ease: 'none', onUpdate: () => cutter.draw(clockT.t) }, T0)
      .to(circle, { attr: { r: max + 60 }, duration: CUT.spread + 0.25, ease: 'none' }, T0 + 0.32);
    tl
      .fromTo('.hero-eyebrow', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1 }, 0.15)
      .to(en, { '--sweep': '135%', duration: 1.55, ease: 'power2.inOut', onComplete: () => en.classList.remove('is-sweeping') }, 0.2)
      .to(ar, { '--sweep': '135%', duration: 1.25, ease: 'power2.inOut', onComplete: () => ar.classList.remove('is-sweeping') }, 0.85)
      .fromTo('[data-rise]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: .09 }, 0.95)
      .fromTo('.titleblock .tb-cell', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .9, stagger: .06 }, 1.25)
      .fromTo('.screen-slot .dim, .screen-slot .callout', { opacity: 0 }, { opacity: 1, duration: 1, stagger: .12 }, T0 + CUT.spread + 0.4)
      .fromTo(sunpatch, { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'power2.out' }, T0 + CUT.spread + 0.2)
      .fromTo(depthP, { opacity: 0 }, { opacity: 1, duration: .8 }, T0 + CUT.spread + 0.5)
      .call(finish, null, T0 + CUT.spread + CUT.line + 0.05);
    addEventListener('resize', finish, { once: true });
    return tl;
  }

  function heroZoom() {
    if (innerHeight < 520) return;
    const fill = document.createElement('div');
    fill.className = 'hero-handoff';
    fill.setAttribute('aria-hidden', 'true');
    hero.appendChild(fill);
    // About slides in underneath the pinned hero, exactly one hero-height up.
    const setH = () => html.style.setProperty('--hero-h', hero.offsetHeight + 'px');
    setH();
    html.classList.add('has-zoom');
    ST.addEventListener('refreshInit', setH);
    const z = { p: 0 };
    const tl = G.timeline({
      scrollTrigger: {
        trigger: hero, start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.15),
        pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onLeave: playHandoff,
        onRefresh: self => { if (self.progress > 0.95) playHandoff(); }
      }
    });
    tl.to('.hero-copy', { opacity: 0, xPercent: -6, duration: .3, ease: 'power2.in' }, 0)
      .to('.screen-slot', { opacity: 0, duration: .14, ease: 'none' }, 0)
      .to('.titleblock', { opacity: 0, y: 26, duration: .22, ease: 'power2.in' }, 0)
      .to(sunpatch, { opacity: 0, duration: .3, ease: 'none' }, 0)
      .to(z, { p: 1, duration: 1, ease: 'power2.in', onUpdate: () => { setZoom(z.p); onScroll(); } }, 0)
      .to(fill, { opacity: 1, duration: .08, ease: 'none' }, .86)
      .to(hero, { autoAlpha: 0, duration: .07, ease: 'none' }, .93)
      .call(playHandoff, null, .95);
  }

  // Either scroll-triggered, or held until the hero hands over (for About).
  function when(el, start, make) {
    if (deferToHandoff(el)) {
      const tw = make(null).pause();
      handoff.queue.push(() => tw);
      return tw;
    }
    return make({ trigger: el, start, once: true });
  }

  // Headings, sheet heads and plain reveals inside one section.
  function revealsIn(root) {
    // Section headings: lines rise out of their own masks.
    $$('.h2[data-reveal]', root).forEach(h => {
      h.removeAttribute('data-reveal');
      if (!Split) return;
      const deferred = deferToHandoff(h);
      let current = null;
      if (deferred) handoff.queue.unshift(() => current);
      Split.create(h, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: self => {
          current = G.from(self.lines, {
            yPercent: 110, duration: 1.25, stagger: .09, ease: 'expo.out',
            paused: deferred && !handoff.done,
            scrollTrigger: deferred ? undefined : { trigger: h, start: 'top 86%', once: true }
          });
          return current;
        }
      });
    });
    $$('[data-reveal]', root).forEach(el => {
      when(el, 'top 88%', st => G.from(el, { opacity: 0, y: 30, duration: 1.1, ease: 'expo.out', scrollTrigger: st || undefined }));
    });
    $$('.sheet-head', root).forEach(h => {
      when(h, 'top 92%', st => G.fromTo(h, { clipPath: 'inset(0 100% 0 0)', opacity: 0 }, {
        clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 1.4, ease: 'expo.inOut', scrollTrigger: st || undefined
      }));
    });
  }

  function initAbout(root) {
    revealsIn(root);
    // The shutters open from the moment the interior is reached.
    const win = $('[data-shutters]', root);
    if (win) {
      G.fromTo(win, { '--open': 0, '--zoom': 1.16 }, {
        '--open': 1, '--zoom': 1.02, ease: 'none',
        scrollTrigger: { trigger: '.about', start: 'top top', end: () => '+=' + Math.round(innerHeight * .7), scrub: .6 }
      });
    }
    G.from('.spec-row', { opacity: 0, x: -18, duration: .8, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: '.spec', start: 'top 86%', once: true } });
    const num = $('[data-count]');
    if (num) {
      const target = +num.dataset.count, o = { v: 0 };
      num.textContent = '0.00';
      ST.create({ trigger: num, start: 'top 92%', once: true, onEnter: () => G.to(o, { v: target, duration: 1.8, ease: 'expo.out', onUpdate: () => { num.textContent = o.v.toFixed(2); } }) });
    }
    G.from('.mat', { opacity: 0, y: 22, duration: .9, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.mat-list', start: 'top 85%', once: true } });
    G.from('.mat-swatch', { clipPath: 'inset(0 100% 0 0)', duration: 1.1, stagger: .08, ease: 'expo.inOut', scrollTrigger: { trigger: '.mat-list', start: 'top 85%', once: true } });
  }

  function initWork(root) {
    revealsIn(root);
    initGenerator();
    // Drawings slide in on their sheets, corners first.
    $$('.plate', root).forEach(p => {
      const fig = $('.plate-figure', p), text = $('.plate-text', p);
      const tl = G.timeline({ scrollTrigger: { trigger: p, start: 'top 78%', once: true } });
      tl.from($$('.corner', p), { scale: 0, duration: .6, stagger: .05, ease: 'back.out(3)' }, 0)
        .from($('.drawing', p), { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.inOut' }, 0.1)
        .from(text.children, { opacity: 0, y: 24, duration: 1, stagger: .07, ease: 'expo.out' }, 0.15)
        .from($('figcaption', fig), { opacity: 0, duration: .8 }, 0.9);
    });
    bldgLoop($('[data-bldg]', root));
    winLoop($('[data-win]', root));
  }

  function initExperience(root) {
    revealsIn(root);
    // Bars are poured from their start dates.
    if (gantt) {
      const tl = G.timeline({ scrollTrigger: { trigger: gantt, start: 'top 80%', once: true } });
      tl.from('.gantt-axis .yr', { opacity: 0, y: 8, duration: .6, stagger: .06, ease: 'expo.out' }, 0)
        .from('.g-row', { opacity: 0, y: 18, duration: .8, stagger: .08, ease: 'expo.out' }, 0.1)
        .from('.g-bar', { scaleX: 0, duration: 1.3, stagger: .1, ease: 'expo.inOut' }, 0.35)
        .from('.g-plan', { scaleX: 0, duration: 1, ease: 'expo.inOut' }, 1)
        .from('.g-mile', { scale: 0, rotate: -135, duration: .8, ease: 'back.out(2)' }, 0.9)
        .from('.gantt-axis .today-label', { opacity: 0, y: -10, duration: .7, ease: 'expo.out' }, 1.1);
    }
  }

  function initBrief() {
    // The arcade rises, then a lantern lights the sentence word by word.
    const arcade = $('[data-arcade]');
    if (arcade) G.from(arcade, { yPercent: 62, ease: 'none', scrollTrigger: { trigger: '.brief', start: 'top bottom', end: 'top 35%', scrub: true } });
    const brief = $('[data-brief]');
    const lantern = $('[data-lantern]');
    if (brief && Split) {
      const section = brief.closest('.brief');
      const split = Split.create(brief, { type: 'words', wordsClass: 'word' });
      const words = split.words;
      G.set(words, { opacity: .2 });
      const lx = G.quickTo(lantern, 'x', { duration: .9, ease: 'power3' });
      const ly = G.quickTo(lantern, 'y', { duration: .9, ease: 'power3' });
      const moveLantern = prog => {
        const w = words[Math.min(words.length - 1, Math.floor(prog * words.length))];
        if (!w) return;
        const r = w.getBoundingClientRect(), sr = section.getBoundingClientRect();
        lx(r.left - sr.left + r.width / 2);
        ly(r.top - sr.top + r.height / 2);
      };
      G.timeline({
        scrollTrigger: {
          trigger: brief, start: 'top 80%', end: 'bottom 42%', scrub: .5,
          onUpdate: self => moveLantern(self.progress),
          onToggle: self => G.to(lantern, { opacity: self.isActive ? 1 : 0, duration: .8 })
        }
      }).to(words, { opacity: 1, stagger: .1, duration: .3, ease: 'none' });
      G.fromTo('[data-brief-ar]', { clipPath: 'inset(0 0 0 100%)' }, {
        clipPath: 'inset(0 0 0 0%)', duration: 1.8, ease: 'power2.inOut',
        scrollTrigger: { trigger: '[data-brief-ar]', start: 'top 88%', once: true }
      });
    }
  }

  function initContact(root) {
    revealsIn(root);
    // The doors swing open as you arrive.
    const doorway = $('[data-doorway]', root);
    if (doorway) {
      G.set(doorway, { '--open': 0 });
      const doors = $$('[data-door]', doorway);
      G.set(doors, { autoAlpha: 1 });
      const inside = $$('.door-inside > *', doorway);
      G.set(inside, { opacity: 0, y: 18 });
      ST.create({
        trigger: doorway, start: 'top 62%', once: true,
        onEnter: () => {
          G.timeline()
            .to(doorway, { '--open': 1, duration: 2.4, ease: 'power3.inOut' }, 0)
            .to(inside, { opacity: 1, y: 0, duration: 1, stagger: .08, ease: 'expo.out' }, 0.75)
            .to(doors, { autoAlpha: 0, duration: .7, ease: 'power1.in' }, 1.75);
        }
      });
    }
  }

  function initFooter() {
    G.from('.fb-cell', { opacity: 0, y: 14, duration: .8, stagger: .05, ease: 'expo.out', scrollTrigger: { trigger: '.fblock', start: 'top 95%', once: true } });
  }

  // Each section sets up its animations only when it comes within reach,
  // so the first screen is not waiting on work for the last one.
  function lazySections() {
    const map = new Map([
      ['.about', initAbout], ['.work', initWork], ['.experience', initExperience],
      ['.brief', initBrief], ['.contact', initContact], ['.footer', initFooter]
    ]);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const fn = e.target.__init;
        e.target.__init = null;
        if (fn) fn(e.target);
      });
    }, { rootMargin: '150% 0px 150% 0px' });
    map.forEach((fn, sel) => {
      const el = $(sel);
      if (!el) return;
      el.__init = fn;
      io.observe(el);
    });
  }

  function lightFollowsPointer() {
    if (!fine) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    hero.addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - .5) * -30;
      ty = (e.clientY / innerHeight - .5) * -16;
    });
    hero.addEventListener('pointerleave', () => { tx = ty = 0; });
    G.ticker.add(() => {
      if (Math.abs(tx - cx) < .02 && Math.abs(ty - cy) < .02) return;
      cx += (tx - cx) * .05; cy += (ty - cy) * .05;
      sunpatch.style.setProperty('--sp-x', cx.toFixed(2) + 'px');
      sunpatch.style.setProperty('--sp-y', cy.toFixed(2) + 'px');
    });
  }

  /* ================================================================== BOOT */
  function boot() {
    // First screen only: everything below the fold is set up on approach.
    buildPatterns();
    updateLightUI();
    tick();
    setInterval(tick, 20000);
    measureScreen();

    if (motion) {
      if (window.Lenis) {
        lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, anchors: true, autoRaf: false });
        lenis.on('scroll', () => { ST.update(); onScroll(); });
        G.ticker.add(time => lenis.raf(time * 1000));
        G.ticker.lagSmoothing(0);
      }
      intro();
      heroZoom();
      ST.addEventListener('refresh', () => { measureScreen(); buildRuler(); onScroll(); });
      ST.refresh();
      lazySections();
      lightFollowsPointer();
    } else {
      drawScreen();
      initGenerator();
      buildRuler();
    }

    // Cheap, non-visual setup after the first frame.
    requestAnimationFrame(() => setTimeout(() => {
      layoutGantt();
      initCursor();
      initCopy();
      initMenu();
      const year = $('[data-year]');
      if (year) year.textContent = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date());
    }, 0));
    addEventListener('scroll', onScroll, { passive: true });
    let rt = 0;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { measureScreen(); layoutGantt(); buildRuler(); onScroll(); }, 120);
    });
    onScroll();
    html.classList.add('is-ready');
    window.__site = { lenis, applyPattern, setZoom };
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1400))]).then(boot);
})();
