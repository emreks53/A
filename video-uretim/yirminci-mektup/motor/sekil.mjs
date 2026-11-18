// Geometri: şekil = alt yolların listesi [{ pts: [[x,y],...], kapali: bool }].
// SVG yol yazısı (d) çözücü, temel şekiller, dönüşüm, yeniden örnekleme, Path2D'ye çevirme.
import { Path2D } from './temel.mjs';

// ---------------------------------------------------------------- SVG yolu çözücü
export function svg(d, adim = 2.5) {
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  let i = 0;
  const num = () => parseFloat(toks[i++]);
  const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  const yollar = [];
  let cur = null;
  let x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0;
  let cmd = '', prev = '';
  const yeni = () => {
    cur = { pts: [[x, y]], kapali: false };
    yollar.push(cur);
  };
  const ekle = (px, py) => {
    if (!cur) yeni();
    cur.pts.push([px, py]);
  };
  const kubik = (x1, y1, x2, y2, x3, y3) => {
    const L = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
    const n = Math.max(2, Math.ceil(L / adim));
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      ekle(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
    }
    x = x3; y = y3;
  };
  const kuadratik = (x1, y1, x2, y2) => {
    const L = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.ceil(L / adim));
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      ekle(u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2);
    }
    x = x2; y = y2;
  };
  const yay = (rx, ry, rot, buyuk, yon, x2, y2) => {
    // SVG uç nokta parametrelemesinden merkez parametrelemesine
    if (rx === 0 || ry === 0) { ekle(x2, y2); x = x2; y = y2; return; }
    const phi = (rot * Math.PI) / 180, cs = Math.cos(phi), sn = Math.sin(phi);
    const dx = (x - x2) / 2, dy = (y - y2) / 2;
    const x1p = cs * dx + sn * dy, y1p = -sn * dx + cs * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num_ = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let co = Math.sqrt(Math.max(0, num_ / den));
    if (buyuk === yon) co = -co;
    const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
    const cx = cs * cxp - sn * cyp + (x + x2) / 2, cy = sn * cxp + cs * cyp + (y + y2) / 2;
    const ang = (ux, uy, vx, vy) => {
      const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      return a;
    };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!yon && dt > 0) dt -= 2 * Math.PI;
    if (yon && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(2, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / adim));
    for (let k = 1; k <= n; k++) {
      const t = t1 + (dt * k) / n;
      ekle(cx + rx * Math.cos(t) * cs - ry * Math.sin(t) * sn, cy + rx * Math.cos(t) * sn + ry * Math.sin(t) * cs);
    }
    x = x2; y = y2;
  };
  while (i < toks.length) {
    if (!isNum()) { cmd = toks[i++]; }
    else if (cmd === 'M') cmd = 'L';
    else if (cmd === 'm') cmd = 'l';
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (C) {
      case 'M': x = ox + num(); y = oy + num(); sx = x; sy = y; yeni(); break;
      case 'L': { const nx = ox + num(), ny = oy + num(); ekle(nx, ny); x = nx; y = ny; break; }
      case 'H': { const nx = ox + num(); ekle(nx, y); x = nx; break; }
      case 'V': { const ny = oy + num(); ekle(x, ny); y = ny; break; }
      case 'C': { const a = ox + num(), b = oy + num(), c = ox + num(), d2 = oy + num(), e = ox + num(), f = oy + num(); lcx = c; lcy = d2; kubik(a, b, c, d2, e, f); break; }
      case 'S': {
        const rx_ = /[CS]/i.test(prev) ? 2 * x - lcx : x, ry_ = /[CS]/i.test(prev) ? 2 * y - lcy : y;
        const c = ox + num(), d2 = oy + num(), e = ox + num(), f = oy + num(); lcx = c; lcy = d2; kubik(rx_, ry_, c, d2, e, f); break;
      }
      case 'Q': { const a = ox + num(), b = oy + num(), e = ox + num(), f = oy + num(); lqx = a; lqy = b; kuadratik(a, b, e, f); break; }
      case 'T': {
        const a = /[QT]/i.test(prev) ? 2 * x - lqx : x, b = /[QT]/i.test(prev) ? 2 * y - lqy : y;
        const e = ox + num(), f = oy + num(); lqx = a; lqy = b; kuadratik(a, b, e, f); break;
      }
      case 'A': { const rx = num(), ry = num(), rot = num(), la = num(), sw = num(), ex = ox + num(), ey = oy + num(); yay(rx, ry, rot, !!la, !!sw, ex, ey); break; }
      case 'Z': if (cur) { cur.kapali = true; x = sx; y = sy; cur = null; } break;
      default: i++;
    }
    prev = cmd;
  }
  return yollar.filter((p) => p.pts.length > 1);
}

// ---------------------------------------------------------------- temel şekiller
export function elips(cx, cy, rx, ry, n = 0) {
  n = n || Math.max(24, Math.ceil((Math.PI * 2 * Math.max(rx, ry)) / 3));
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return [{ pts, kapali: true }];
}
export const daire = (cx, cy, r) => elips(cx, cy, r, r);
export function cokgen(pts, kapali = true) {
  return [{ pts: pts.map((p) => [p[0], p[1]]), kapali }];
}
export function dikdortgen(x, y, w, h) {
  return cokgen([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
}
export function yuvarlakDikdortgen(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return svg(`M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`);
}
/** Yaprak: (0,0)'dan (boy,0)'a uzanan, en geniş yeri genislik olan sivri yaprak */
export function yaprak(boy, genislik, egri = 0) {
  const g = genislik / 2;
  return svg(`M0 0C${boy * 0.25} ${-g * 1.25 + egri} ${boy * 0.7} ${-g * 0.95 + egri} ${boy} ${egri * 0.6}C${boy * 0.7} ${g * 0.95 + egri} ${boy * 0.25} ${g * 1.25 + egri} 0 0Z`);
}
/** Damla: üstte sivri, altta yuvarlak; merkez (0,0) alt dairenin merkezi */
export function damla(r) {
  return svg(`M0 ${-r * 2.4}C${r * 0.35} ${-r * 1.5} ${r} ${-r * 0.75} ${r} 0A${r} ${r} 0 0 1 ${-r} 0C${-r} ${-r * 0.75} ${-r * 0.35} ${-r * 1.5} 0 ${-r * 2.4}Z`);
}
/** Kalp: merkez (0,0), en ~2r */
export function kalp(r) {
  return svg(`M0 ${r * 0.95}C${-r * 0.2} ${r * 0.72} ${-r * 1.05} ${r * 0.2} ${-r * 1.05} ${-r * 0.32}C${-r * 1.05} ${-r * 0.82} ${-r * 0.62} ${-r * 1.05} ${-r * 0.42} ${-r * 1.05}C${-r * 0.18} ${-r * 1.05} ${-r * 0.04} ${-r * 0.9} 0 ${-r * 0.62}C${r * 0.04} ${-r * 0.9} ${r * 0.18} ${-r * 1.05} ${r * 0.42} ${-r * 1.05}C${r * 0.62} ${-r * 1.05} ${r * 1.05} ${-r * 0.82} ${r * 1.05} ${-r * 0.32}C${r * 1.05} ${r * 0.2} ${r * 0.2} ${r * 0.72} 0 ${r * 0.95}Z`);
}
/** Yıldız (n köşeli), iç/dış yarıçap */
export function yildiz(cx, cy, n, rd, ri, a0 = -Math.PI / 2) {
  const pts = [];
  for (let k = 0; k < n * 2; k++) {
    const r = k % 2 ? ri : rd;
    const a = a0 + (k * Math.PI) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return cokgen(pts);
}
/** Sivri kemer (pencere/kapı): taban (x,y) sol alt, en w, gövde boyu h, kemer boyu k */
export function sivriKemer(x, y, w, h, k = w * 0.75) {
  const r = w / 2;
  return svg(`M${x} ${y}V${y - h}C${x} ${y - h - k * 0.55} ${x + r * 0.55} ${y - h - k * 0.85} ${x + r} ${y - h - k}C${x + r * 1.45} ${y - h - k * 0.85} ${x + w} ${y - h - k * 0.55} ${x + w} ${y - h}V${y}Z`);
}

// ---------------------------------------------------------------- dönüşüm ve ölçü
export function donustur(sekil, { x = 0, y = 0, s = 1, sx = s, sy = s, r = 0 } = {}) {
  const c = Math.cos(r), sn = Math.sin(r);
  return sekil.map((p) => ({
    kapali: p.kapali,
    acik: p.acik,
    pts: p.pts.map(([px, py]) => {
      const a = px * sx, b = py * sy;
      return [x + a * c - b * sn, y + a * sn + b * c];
    }),
  }));
}
export function sinir(sekil) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of sekil) for (const [x, y] of p.pts) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
export function birlestir(...sekiller) {
  return sekiller.flat();
}
export function path2d(sekil) {
  const p = new Path2D();
  for (const yol of sekil) {
    const pts = yol.pts;
    if (!pts.length) continue;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) p.lineTo(pts[k][0], pts[k][1]);
    if (yol.kapali) p.closePath();
  }
  return p;
}
export function yolCiz(ctx, sekil) {
  for (const yol of sekil) {
    const pts = yol.pts;
    if (!pts.length) continue;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    if (yol.kapali) ctx.closePath();
  }
}
/** Nokta şeklin içinde mi (çift-tek kuralı) */
export function icinde(sekil, x, y) {
  let ic = false;
  for (const yol of sekil) {
    const p = yol.pts;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) ic = !ic;
    }
  }
  return ic;
}
/** Yay uzunluğuna göre yeniden örnekleme */
export function yenidenOrnekle(pts, adim = 3, kapali = false) {
  const p = kapali ? [...pts, pts[0]] : pts;
  const out = [p[0]];
  let kalan = adim;
  for (let i = 1; i < p.length; i++) {
    let [ax, ay] = p[i - 1];
    const [bx, by] = p[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (seg >= kalan) {
      const t = kalan / seg;
      ax = ax + (bx - ax) * t;
      ay = ay + (by - ay) * t;
      out.push([ax, ay]);
      seg -= kalan;
      kalan = adim;
    }
    kalan -= seg;
  }
  if (!kapali) out.push(p[p.length - 1]);
  return out;
}
export function yolUzunlugu(pts, kapali = false) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (kapali && pts.length > 1) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}
/** Yolun baştan itibaren 'oran' kadarı (çizerek giriş için) */
export function yolKes(pts, oran, kapali = false) {
  const p = kapali ? [...pts, pts[0]] : pts;
  const L = yolUzunlugu(p) * oran;
  const out = [p[0]];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (acc + seg >= L) {
      const t = (L - acc) / (seg || 1);
      out.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]);
      return out;
    }
    acc += seg;
    out.push(p[i]);
  }
  return out;
}
/** Chaikin yumuşatma */
export function yumusat(pts, tur = 2, kapali = true) {
  let p = pts;
  for (let k = 0; k < tur; k++) {
    const q = [];
    const n = p.length;
    for (let i = 0; i < (kapali ? n : n - 1); i++) {
      const a = p[i], b = p[(i + 1) % n];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!kapali) { q.unshift(p[0]); q.push(p[n - 1]); }
    p = q;
  }
  return p;
}
