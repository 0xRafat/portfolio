/*
 * Lattice engine
 * ---------------
 * Islamic star patterns generated with E. H. Hankin's "polygons in contact"
 * method (1925), as formalised by Craig Kaplan (2005):
 *   1. Cover the plane with a tiling of regular polygons.
 *   2. From the midpoint of every edge, cast two rays into each polygon,
 *      each leaning by the contact angle θ toward one end of the edge.
 *   3. Pair the rays greedily (shortest combined length first) and keep the
 *      two segments that run from the midpoints to the meeting point.
 * Every lattice on the site comes out of this file.
 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  // Regular polygon: centre (cx, cy), circumradius r, n sides, first vertex angle a0.
  function regular(cx, cy, r, n, a0) {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = a0 + (k * TAU) / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  /* ---------------------------------------------------------------- tilings
   * Each tiling gives:
   *   unit(s)        -> { w, h } of its rectangular translational cell
   *   cell(i, j, s)  -> the polygons that belong to cell (i, j)
   * `s` is the scale (edge length of the polygons).
   */
  const TILINGS = {
    // 4.8.8 — octagons and squares. Classic 8-fold Mamluk star.
    '8': {
      label: '8-fold',
      tiling: '4.8.8',
      range: [40, 78],
      angle: 67.5,
      unit(s) {
        const w = s * (1 + Math.SQRT2);
        return { w, h: w };
      },
      cell(i, j, s) {
        const w = s * (1 + Math.SQRT2);
        const R8 = s / (2 * Math.sin(Math.PI / 8));
        const r4 = s / Math.SQRT2;
        const cx = i * w, cy = j * w;
        return [
          regular(cx, cy, R8, 8, Math.PI / 8),
          regular(cx + w / 2, cy + w / 2, r4, 4, 0)
        ];
      }
    },
    // 6.6.6 — hexagons. 6-fold stars.
    '6': {
      label: '6-fold',
      tiling: '6.6.6',
      range: [32, 80],
      angle: 60,
      unit(s) {
        return { w: Math.sqrt(3) * s, h: 3 * s };
      },
      cell(i, j, s) {
        const w = Math.sqrt(3) * s, h = 3 * s;
        const cx = i * w, cy = j * h;
        return [
          regular(cx, cy, s, 6, Math.PI / 6),
          regular(cx + w / 2, cy + h / 2, s, 6, Math.PI / 6)
        ];
      }
    },
    // 4.6.12 — dodecagons, hexagons and squares. 12-fold rosettes.
    '12': {
      label: '12-fold',
      tiling: '4.6.12',
      range: [36, 76],
      angle: 60,
      unit(s) {
        const D = s * (3 + Math.sqrt(3));
        return { w: D, h: D * Math.sqrt(3) };
      },
      cell(i, j, s) {
        const D = s * (3 + Math.sqrt(3));
        const H = D * Math.sqrt(3);
        const R12 = s / (2 * Math.sin(Math.PI / 12));
        const R6 = s;
        const r4 = s / Math.SQRT2;
        const polys = [];
        // Two dodecagon centres per rectangular cell (triangular lattice).
        const centres = [
          [i * D, j * H],
          [i * D + D / 2, j * H + H / 2]
        ];
        for (const [cx, cy] of centres) {
          polys.push(regular(cx, cy, R12, 12, Math.PI / 12));
          // Squares sit half-way to the neighbours at 0°, 60°, 120°.
          for (const a of [0, 60, 120]) {
            const ux = Math.cos(a * DEG), uy = Math.sin(a * DEG);
            const mx = cx + (ux * D) / 2, my = cy + (uy * D) / 2;
            polys.push(regular(mx, my, r4, 4, a * DEG + Math.PI / 4));
          }
          // Hexagons sit at the centroids of the lattice triangles (30° and 90°),
          // with an edge facing each of the three dodecagons around them.
          for (const a of [30, 90]) {
            const d = D / Math.sqrt(3);
            const hx = cx + Math.cos(a * DEG) * d, hy = cy + Math.sin(a * DEG) * d;
            polys.push(regular(hx, hy, R6, 6, 0));
          }
        }
        return polys;
      }
    }
  };

  /* ---------------------------------------------------------- Hankin rays */
  function hankin(poly, theta) {
    const n = poly.length;
    // Normalise winding so "inward" is consistent.
    let area = 0;
    for (let k = 0; k < n; k++) {
      const [x1, y1] = poly[k], [x2, y2] = poly[(k + 1) % n];
      area += x1 * y2 - x2 * y1;
    }
    const sgn = area > 0 ? 1 : -1;
    const rays = [];
    const t = theta * DEG;
    for (let k = 0; k < n; k++) {
      const [x1, y1] = poly[k], [x2, y2] = poly[(k + 1) % n];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
      // Forward ray: rotate edge direction by +θ toward the interior.
      const a = sgn * t;
      rays.push({ e: k, x: mx, y: my,
        dx: dx * Math.cos(a) - dy * Math.sin(a),
        dy: dx * Math.sin(a) + dy * Math.cos(a) });
      // Backward ray: rotate the reversed direction by -θ.
      const b = -sgn * t;
      rays.push({ e: k, x: mx, y: my,
        dx: -dx * Math.cos(b) + dy * Math.sin(b),
        dy: -dx * Math.sin(b) - dy * Math.cos(b) });
    }
    // All pairwise intersections between rays from different edges.
    const pairs = [];
    for (let p = 0; p < rays.length; p++) {
      for (let q = p + 1; q < rays.length; q++) {
        const A = rays[p], B = rays[q];
        if (A.e === B.e) continue;
        const den = A.dx * B.dy - A.dy * B.dx;
        if (Math.abs(den) < 1e-9) continue;
        const ex = B.x - A.x, ey = B.y - A.y;
        const ta = (ex * B.dy - ey * B.dx) / den;
        const tb = (ex * A.dy - ey * A.dx) / den;
        if (ta <= 1e-6 || tb <= 1e-6) continue;
        pairs.push({ p, q, s: ta + tb, x: A.x + A.dx * ta, y: A.y + A.dy * ta });
      }
    }
    pairs.sort((u, v) => u.s - v.s);
    const used = new Uint8Array(rays.length);
    const segs = [];
    for (const pr of pairs) {
      if (used[pr.p] || used[pr.q]) continue;
      used[pr.p] = used[pr.q] = 1;
      segs.push([rays[pr.p].x, rays[pr.p].y, pr.x, pr.y]);
      segs.push([rays[pr.q].x, rays[pr.q].y, pr.x, pr.y]);
    }
    return segs;
  }

  /* ------------------------------------------------ merge across edges
   * A segment that leaves one polygon at an edge midpoint continues in a
   * straight line in the neighbour. Joining them gives long, continuous
   * strokes, which is what makes the "cutting" animation read well.
   */
  function merge(segs) {
    const key = (x, y) => Math.round(x * 20) + ',' + Math.round(y * 20);
    const byStart = new Map();
    segs.forEach((s, idx) => {
      const k = key(s[0], s[1]);
      if (!byStart.has(k)) byStart.set(k, []);
      byStart.get(k).push(idx);
    });
    const done = new Uint8Array(segs.length);
    const out = [];
    for (let i = 0; i < segs.length; i++) {
      if (done[i]) continue;
      const a = segs[i];
      const list = byStart.get(key(a[0], a[1])) || [];
      let joined = false;
      for (const j of list) {
        if (j === i || done[j]) continue;
        const b = segs[j];
        const ax = a[2] - a[0], ay = a[3] - a[1];
        const bx = b[2] - b[0], by = b[3] - b[1];
        const cross = ax * by - ay * bx;
        const dot = ax * bx + ay * by;
        const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
        if (Math.abs(cross) < 1e-3 * la * lb && dot < 0) {
          out.push([a[2], a[3], b[2], b[3]]);
          done[i] = done[j] = 1;
          joined = true;
          break;
        }
      }
      if (!joined) {
        out.push(a.slice());
        done[i] = 1;
      }
    }
    return out;
  }

  // Remove exact duplicates (shared geometry between neighbouring cells).
  function dedupe(segs) {
    const seen = new Set();
    const out = [];
    for (const s of segs) {
      const a = Math.round(s[0] * 10) + ',' + Math.round(s[1] * 10);
      const b = Math.round(s[2] * 10) + ',' + Math.round(s[3] * 10);
      const k = a < b ? a + '|' + b : b + '|' + a;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  }

  /* ------------------------------------------------------------- public */

  // Polygons covering the rectangle [x0,x1]×[y0,y1], with one cell origin at (ox, oy).
  function polygonsIn(fold, s, x0, y0, x1, y1, ox, oy) {
    const T = TILINGS[fold];
    const { w, h } = T.unit(s);
    const i0 = Math.floor((x0 - ox) / w) - 1, i1 = Math.ceil((x1 - ox) / w) + 1;
    const j0 = Math.floor((y0 - oy) / h) - 1, j1 = Math.ceil((y1 - oy) / h) + 1;
    const polys = [];
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const p of T.cell(i, j, s)) {
          polys.push(p.map(([x, y]) => [x + ox, y + oy]));
        }
      }
    }
    return polys;
  }

  /**
   * Segments for a rectangular region. The pattern is centred so that a
   * polygon centre (the main star) lands on (cx, cy).
   */
  function region(opts) {
    const { fold = '8', angle, size = 60, x = 0, y = 0, w, h, cx = x + w / 2, cy = y + h / 2 } = opts;
    const theta = angle == null ? TILINGS[fold].angle : angle;
    const polys = polygonsIn(fold, size, x, y, x + w, y + h, cx, cy);
    let segs = [];
    for (const p of polys) segs = segs.concat(hankin(p, theta));
    return merge(dedupe(segs));
  }

  /** One translational tile, for use inside an SVG <pattern>. */
  function tile(opts) {
    const { fold = '8', angle, size = 40 } = opts;
    const T = TILINGS[fold];
    const theta = angle == null ? T.angle : angle;
    const { w, h } = T.unit(size);
    // Generate a 3×3 neighbourhood; the pattern box clips the overflow.
    const polys = polygonsIn(fold, size, -w, -h, 2 * w, 2 * h, 0, 0);
    let segs = [];
    for (const p of polys) segs = segs.concat(hankin(p, theta));
    // Keep anything whose stroke could reach into the tile; <pattern> clips the rest.
    const m = size * 0.5;
    segs = merge(dedupe(segs)).filter(s =>
      Math.max(s[0], s[2]) > -m && Math.min(s[0], s[2]) < w + m &&
      Math.max(s[1], s[3]) > -m && Math.min(s[1], s[3]) < h + m);
    return { w, h, segs };
  }

  /** Construction lines (the underlying tiling) for diagrams. */
  function construction(opts) {
    const { fold = '8', size = 60, x = 0, y = 0, w, h, cx = x + w / 2, cy = y + h / 2 } = opts;
    return polygonsIn(fold, size, x, y, x + w, y + h, cx, cy);
  }

  function toPath(segs, digits = 2) {
    const f = v => +v.toFixed(digits);
    let d = '';
    for (const s of segs) d += 'M' + f(s[0]) + ' ' + f(s[1]) + 'L' + f(s[2]) + ' ' + f(s[3]);
    return d;
  }

  global.Lattice = { TILINGS, region, tile, construction, toPath, hankin };
})(window);
