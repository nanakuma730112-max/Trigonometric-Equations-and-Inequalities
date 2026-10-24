'use strict';
const $ = i => document.getElementById(i), PI = Math.PI, TAU = 2 * PI;
const mod = (a, m) => ((a % m) + m) % m, gcd = (x, y) => y ? gcd(y, x % y) : x;
const fmt = (n, k = 2) => String(+(+n).toFixed(k)).replace('-', '−');
const HUE = { sin: 210, cos: 140, tan: 25 };
const dk = f => `hsl(${HUE[f]},80%,33%)`, lt = f => `hsl(${HUE[f]},55%,68%)`;
const ID = { a: 1, b: 1, c: 0, d: 0 };
const mkV = () => ({ xmin: -PI / 2, span: 5 * PI });
const mk1 = () => ({ th: 0, snap: true });
const mk2 = () => ({ fn: 'sin', th: 0, lo: 0, hi: 0, play: false, speed: 1, snap: true, hold: false, ...mkV() });
const mk3 = () => ({ fn: 'sin', th: PI / 3, a: 1, b: 1, cn: 0, d: 0, showBase: true, showNew: true,
  play: false, speed: 1, snap: true, xmin: -PI, span: 6 * PI });
const S = { tab: 1, u: 'rad', t1: mk1(), t2: mk2(), t3: mk3() };
let drag = 0;

/* ---------- 分数・角度の表記 ---------- */
const fr = (n, d) => `<span class="fr"><span>${n}</span><span>${d}</span></span>`;
function angParts(n) { const v = Math.abs(n), g = gcd(v, 12); return { s: n < 0 ? '−' : '', p: v / g, q: 12 / g }; }
function angHTML(n, unit) {                       // n は π/12 の整数倍
  if ((unit || S.u) === 'deg') return fmt(n * 15, 0) + '°';
  if (!n) return '0';
  const { s, p, q } = angParts(n), top = (p === 1 ? '' : p) + 'π';
  return s + (q === 1 ? top : fr(top, q));
}
const nearN = th => { const n = th / (PI / 12), r = Math.round(n); return Math.abs(n - r) < 1e-6 ? r : null; };
function angAny(th, unit) {                       // 任意の角
  const n = nearN(th); if (n !== null) return angHTML(n, unit);
  return (unit || S.u) === 'deg' ? fmt(th * 180 / PI, 1) + '°' : fmt(th, 3) + ' rad';
}
const angBoth = th => angAny(th) + '（' + angAny(th, S.u === 'deg' ? 'rad' : 'deg') + '）';
function cAng(ctx, n, x, y, fs, col) {            // canvas に教科書形式で描く
  ctx.fillStyle = col || '#14213d'; ctx.font = fs + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (S.u === 'deg') ctx.fillText(fmt(n * 15, 0) + '°', x, y);
  else if (!n) ctx.fillText('0', x, y);
  else {
    const { s, p, q } = angParts(n), top = (p === 1 ? '' : p) + 'π';
    if (q === 1) ctx.fillText(s + top, x, y);
    else {
      const w = Math.max(ctx.measureText(top).width, ctx.measureText(String(q)).width) + 4;
      const sw = s ? ctx.measureText(s).width + 3 : 0, x0 = x - (w + sw) / 2, fx = x0 + sw + w / 2;
      if (s) ctx.fillText(s, x0 + sw / 2 - 1, y);
      ctx.fillText(top, fx, y - fs * 0.55); ctx.fillText(String(q), fx, y + fs * 0.6);
      ctx.beginPath(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.3; ctx.moveTo(fx - w / 2, y); ctx.lineTo(fx + w / 2, y); ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/* ---------- 有名角の厳密な値 ---------- */
const RT = { 0: ['0', '1'], 2: ['1/2', '√3/2'], 3: ['√2/2', '√2/2'], 4: ['√3/2', '1/2'] };
const TM = { '0|1': '0', '1/2|√3/2': '√3/3', '√2/2|√2/2': '1', '√3/2|1/2': '√3', '1|0': null };
function exact(fn, n12) {
  const n = mod(Math.round(n12), 24), q = Math.floor(n / 6), r = n % 6;
  if (!RT[r]) return null;
  const [sr, cr] = RT[r], sm = q % 2 ? cr : sr, cm = q % 2 ? sr : cr;
  const ss = q < 2 ? '' : '−', cs = (q === 0 || q === 3) ? '' : '−';
  if (fn === 'sin') return { s: ss, v: sm };
  if (fn === 'cos') return { s: cs, v: cm };
  const tv = TM[sm + '|' + cm]; if (tv === null) return { undef: true };
  return { s: (ss === cs || tv === '0') ? '' : '−', v: tv };
}
function valHTML(e) {
  if (!e) return ''; if (e.undef) return '定義されない';
  const m = e.v.split('/'); return (e.v === '0' ? '' : e.s) + (m.length > 1 ? fr(m[0], m[1]) : m[0]);
}
const keyOf = e => e.undef ? 'undef' : (e.v === '0' ? '0' : e.s + e.v);
const keyHTML = k => k === 'undef' ? '定義されない' : valHTML({ s: k[0] === '−' ? '−' : '', v: k.replace('−', '') });
const snapAng = th => {
  const n = th / (PI / 12), r = Math.round(n);
  return ([0, 2, 3, 4].includes(mod(r, 24) % 6) && Math.abs(n - r) < 0.25) ? r * PI / 12 : th;
};
const F = (fn, x) => fn === 'sin' ? Math.sin(x) : fn === 'cos' ? Math.cos(x) : Math.tan(x);
const Gf = (fn, p, x) => p.a * F(fn, p.b * (x - p.c)) + p.d;
const P3 = s => ({ a: s.a, b: s.b, c: s.cn * PI / 12, d: s.d });
const FN = f => S['t' + f];

/* ---------- キャンバス ---------- */
const G = {};
['c1', 'c2c', 'c2g', 'c3c', 'c3g'].forEach(id => { G[id] = { cv: $(id), ctx: $(id).getContext('2d'), w: 0, h: 0, top: 0 }; });
const circ = t => t === 1 ? G.c1 : G['c' + t + 'c'], grf = t => G['c' + t + 'g'];
function layout() {
  const d = window.devicePixelRatio || 1;
  for (const k in G) {
    const g = G[k], r = g.cv.getBoundingClientRect(); g.w = r.width; g.h = r.height; g.top = r.top;
    if (r.width) { g.cv.width = Math.round(r.width * d); g.cv.height = Math.round(r.height * d); g.ctx.setTransform(d, 0, 0, d, 0, 0); }
  }
}
const ro = new ResizeObserver(layout); for (const k in G) ro.observe(G[k].cv);
const Rof = t => { const g = circ(t); return t === 1 ? Math.min(g.h / 3, g.w / 2.9) : Math.min(g.h / 2 / (t === 2 ? 1.6 : 4.2), g.w / 2.6); };
const sideBy = t => Math.abs(circ(t).top - grf(t).top) < 2;
const line = (ctx, x1, y1, x2, y2, col, w, dash) => {
  ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
};
const clamp = v => Math.max(-1e4, Math.min(1e4, v));

/* ---------- 単位円 ---------- */
function drawCircle(t, fn, th, o) {
  const g = circ(t); if (!g.w) return;
  const { ctx, w, h } = g, R = Rof(t), cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  line(ctx, 0, cy, w, cy, '#8a93a6', 1.5); line(ctx, cx, 0, cx, h, '#8a93a6', 1.5);
  ctx.beginPath(); ctx.strokeStyle = '#14213d'; ctx.lineWidth = 2.5; ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  if (o.labels) for (const n of FAM) {
    const a = n * PI / 12; ctx.beginPath(); ctx.fillStyle = '#14213d'; ctx.arc(cx + R * Math.cos(a), cy - R * Math.sin(a), 3, 0, TAU); ctx.fill();
    if (n < 24) cAng(ctx, n, cx + 1.24 * R * Math.cos(a), cy - 1.24 * R * Math.sin(a), 13, '#444');
  }
  const co = Math.cos(th), si = Math.sin(th), px = cx + R * co, py = cy - R * si, tm = mod(th, TAU);
  ctx.beginPath(); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.arc(cx, cy, R * 0.28, 0, -tm, true); ctx.stroke();
  let lvl = null, sx0 = 0, sy0 = 0;
  for (const f of (fn === 'all' ? ['sin', 'cos', 'tan'] : [fn])) {
    const col = dk(f);
    if (f === 'sin') { line(ctx, px, cy, px, py, col, 5); lvl = py; sx0 = px; sy0 = py; }
    else if (f === 'cos') {
      line(ctx, cx, cy, px, cy, col, 5);
      if (fn !== 'all') {
        lvl = cy - R * co; sx0 = cx; sy0 = lvl; line(ctx, px, cy, cx, lvl, col, 1.5, [5, 5]);
        ctx.beginPath(); ctx.fillStyle = col; ctx.arc(cx, lvl, 6, 0, TAU); ctx.fill();
      }
    } else {
      const ty = cy - R * clamp(Math.tan(th));
      line(ctx, cx + R, 0, cx + R, h, '#8a93a6', 1.5, [4, 4]);
      line(ctx, cx, cy, cx + R, ty, '#14213d', 1.5, [6, 5]); line(ctx, cx + R, cy, cx + R, ty, col, 5);
      if (fn !== 'all') { lvl = ty; sx0 = cx + R; sy0 = ty; }
    }
  }
  line(ctx, cx, cy, px, py, '#14213d', 2.5);
  if (o.link && sideBy(t) && lvl !== null && lvl > 0 && lvl < h) line(ctx, sx0, sy0, w, lvl, dk(fn), 1.5, [6, 5]);
  ctx.beginPath(); ctx.fillStyle = '#d62839'; ctx.arc(px, py, 10, 0, TAU); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#c0392b'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('θ', cx + R * 0.33, cy - 6);
  ctx.fillStyle = '#14213d'; ctx.font = '14px sans-serif'; ctx.fillText('x', w - 14, cy - 6); ctx.fillText('y', cx + 8, 16);
}

/* ---------- グラフ ---------- */
function curve(ctx, fn, p, g, s, col, wd, dash, x0, x1) {
  const sx = g.w / s.span, tan = fn === 'tan'; let pk = null, pen = false;
  ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.lineJoin = 'round';
  for (let px = 0; px <= g.w; px++) {
    const x = s.xmin + px / sx; if (x < x0 || x > x1) { pen = false; pk = null; continue; }
    const k = tan ? Math.floor((p.b * (x - p.c) + PI / 2) / PI) : 0, y = g.h / 2 - Rof(g.t) * Gf(fn, p, x);
    if (!isFinite(y) || Math.abs(y - g.h / 2) > 1e4) { pen = false; pk = k; continue; }
    if (tan && k !== pk) pen = false;
    pk = k; if (!pen) { ctx.moveTo(px, y); pen = true; } else ctx.lineTo(px, y);
  }
  ctx.stroke(); ctx.setLineDash([]);
}
function asym(ctx, p, g, s, col, x0, x1) {
  const sx = g.w / s.span, a = Math.max(s.xmin, x0), b = Math.min(s.xmin + s.span, x1);
  const f1 = p.b * (a - p.c), f2 = p.b * (b - p.c), lo = Math.min(f1, f2), hi = Math.max(f1, f2);
  for (let k = Math.ceil((lo - PI / 2) / PI); k <= Math.floor((hi - PI / 2) / PI); k++) {
    const x = (p.c + (PI / 2 + k * PI) / p.b - s.xmin) * sx; line(ctx, x, 0, x, g.h, col, 1.8, [2, 5]);
  }
}
function periodArrow(ctx, fn, p, g, s, X, Y) {
  const per = (fn === 'tan' ? PI : TAU) / Math.abs(p.b);
  let x0 = fn === 'sin' ? p.c + (p.a >= 0 ? PI / 2 : 3 * PI / 2) / p.b : fn === 'cos' ? p.c + (p.a >= 0 ? 0 : PI) / p.b : p.c;
  x0 += Math.ceil((s.xmin + 0.12 * s.span - x0) / per) * per;
  const yv = fn === 'tan' ? p.d : Math.abs(p.a) + p.d, xa = X(x0), xb = X(x0 + per);
  if (xb > g.w) return;
  const y = Math.max(Y(yv) - (fn === 'tan' ? 0 : 28), 46), col = '#7a1fa2';
  for (const x of [xa, xb]) { line(g.ctx, x, Y(yv), x, y + 6, col, 1.5, [3, 3]); g.ctx.beginPath(); g.ctx.fillStyle = col; g.ctx.arc(x, Y(yv), 5, 0, TAU); g.ctx.fill(); }
  line(ctx, xa, y, xb, y, col, 2.5);
  for (const [x, d] of [[xa, 1], [xb, -1]]) { ctx.beginPath(); ctx.fillStyle = col; ctx.moveTo(x, y); ctx.lineTo(x + d * 11, y - 6); ctx.lineTo(x + d * 11, y + 6); ctx.fill(); }
  ctx.fillStyle = col; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('周期', (xa + xb) / 2 - 36, y - 10);
  const n = per / (PI / 12);
  if (Math.abs(n - Math.round(n)) < 1e-6) cAng(ctx, Math.round(n), (xa + xb) / 2 + 12, y - 16, 15, col);
  else { ctx.fillStyle = col; ctx.fillText(fmt(per / PI, 2) + 'π', (xa + xb) / 2 + 20, y - 10); ctx.textBaseline = 'alphabetic'; }
}
function drawGraph(t) {
  const s = FN(t), g = grf(t); if (!g.w) return; g.t = t;
  const { ctx, w, h } = g, R = Rof(t), sx = w / s.span, cy = h / 2, fn = s.fn;
  const X = x => (x - s.xmin) * sx, Y = v => cy - R * v;
  ctx.clearRect(0, 0, w, h);
  const steps = [3, 6, 12, 24, 48, 96, 192]; let st = 3; for (const c of steps) { st = c; if (sx * st * PI / 12 >= 78) break; }
  const u = st * PI / 12;
  for (let i = Math.ceil(s.xmin / u); i * u <= s.xmin + s.span; i++) {
    const x = X(i * u); line(ctx, x, 0, x, h, i ? '#e1e5ee' : '#14213d', i ? 1 : 2.5);
    if (i) cAng(ctx, i * st, x, cy + 30, 16);
  }
  ctx.font = '16px sans-serif'; ctx.textAlign = 'left';
  for (let v = -Math.floor(cy / R); v <= Math.floor(cy / R); v++) {
    line(ctx, 0, Y(v), w, Y(v), v ? '#e1e5ee' : '#14213d', v ? 1 : 2.5);
    if (v) { ctx.fillStyle = '#14213d'; ctx.fillText(fmt(v, 0), 6, Y(v) - 4); }
  }
  const p = t === 2 ? ID : P3(s), x0 = t === 2 ? s.lo : -Infinity, x1 = t === 2 ? s.hi : Infinity;
  const showNew = t === 2 || s.showNew, showBase = t === 3 && s.showBase;
  if (fn === 'tan') {
    if (showBase) asym(ctx, ID, g, s, lt(fn), x0, x1);
    if (showNew && x1 > x0) asym(ctx, p, g, s, dk(fn), x0, x1);
  }
  if (showBase) curve(ctx, fn, ID, g, s, lt(fn), 4, [10, 7], x0, x1);
  if (showNew && x1 > x0) curve(ctx, fn, p, g, s, dk(fn), 4.5, null, x0, x1);
  if (t === 3 && showNew) periodArrow(ctx, fn, p, g, s, X, Y);
  const th = s.th, tx = X(th), idv = Y(clamp(F(fn, th))), ty = Y(clamp(Gf(fn, p, th)));
  if (sideBy(t) && idv > 0 && idv < h) line(ctx, 0, idv, Math.min(Math.max(tx, 0), w), idv, dk(fn), 1.5, [6, 5]);
  if (tx >= 0 && tx <= w) {
    if (showNew) line(ctx, tx, cy, tx, ty, dk(fn), 1.5, [4, 4]);
    if (t === 3) {
      ctx.beginPath(); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.arc(tx, idv, 6, 0, TAU); ctx.stroke();
      if (showBase) { ctx.beginPath(); ctx.strokeStyle = lt(fn); ctx.lineWidth = 3; ctx.arc(tx, Y(clamp(F(fn, th))), 9, 0, TAU); ctx.stroke(); }
    }
    if (showNew) { ctx.beginPath(); ctx.fillStyle = dk(fn); ctx.arc(tx, ty, 9, 0, TAU); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  }
  const rows = t === 3 ? [['変化前（薄い・破線）', lt(fn), [10, 7], 4, showBase], ['変化後（濃い・実線）', dk(fn), [], 4.5, showNew]].filter(r => r[4])
    : [['y = ' + fn + ' θ（動かした範囲）', dk(fn), [], 4.5]];
  ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
  const lw = Math.max(0, ...rows.map(r => ctx.measureText(r[0]).width)) + 56;
  if (rows.length) {
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(w - lw - 10, 8, lw, rows.length * 26 + 8);
    rows.forEach((r, i) => { const y = 28 + i * 26; line(ctx, w - lw - 2, y - 5, w - lw + 32, y - 5, r[1], r[3], r[2]); ctx.fillStyle = '#14213d'; ctx.fillText(r[0], w - lw + 40, y); });
  }
}

/* ---------- 情報表示 ---------- */
const cache = {};
const put = (id, h) => { if (cache[id] !== h) { $(id).innerHTML = h; cache[id] = h; } };
function trigVals(th, fns) {
  const n = nearN(th), co = Math.cos(th), si = Math.sin(th), un = Math.abs(co) < 1e-9;
  const val = f => {
    const e = n !== null ? exact(f, n) : null; if (e) return valHTML(e);
    if (f === 'tan' && un) return '定義されない'; return fmt(F(f, th), 3);
  };
  const P = n !== null && exact('sin', n) ? `P(<b>${valHTML(exact('cos', n))}</b>, <b>${valHTML(exact('sin', n))}</b>)` : `P(<b>${fmt(co, 3)}</b>, <b>${fmt(si, 3)}</b>)`;
  return `<span>θ = <b>${angBoth(th)}</b></span><span>点 ${P}</span>` + fns.map(f => `<span>${f} θ = <b>${val(f)}</b></span>`).join('');
}
function formulaH(fn, a, b, cn, d) {
  const A = a === 1 ? '' : a === -1 ? '−' : fmt(a), B = b === 1 ? '' : b === -1 ? '−' : fmt(b);
  const inner = cn ? (B ? B + '(' : '') + 'θ ' + (cn > 0 ? '−' : '+') + ' ' + angHTML(Math.abs(cn)) + (B ? ')' : '') : (B + 'θ');
  const D = d > 0 ? ' + ' + fmt(d) : d < 0 ? ' − ' + fmt(-d) : '';
  return 'y = ' + A + fn + (inner === 'θ' ? ' θ' : '(' + inner + ')') + D;
}
function perHTML(fn, b) {
  if (S.u === 'deg') return fmt((fn === 'tan' ? 180 : 360) / Math.abs(b), 1) + '°';
  const bn = Math.round(Math.abs(b) * 4), num = fn === 'tan' ? 4 : 8, g = gcd(num, bn), p = num / g, q = bn / g, top = (p === 1 ? '' : p) + 'π';
  return q === 1 ? top : fr(top, q);
}
function drawInfo() {
  if (S.tab === 1) put('i1', trigVals(S.t1.th, ['sin', 'cos', 'tan']));
  else if (S.tab === 2) put('i2', trigVals(S.t2.th, [S.t2.fn]));
  else {
    const s = S.t3, p = P3(s), fn = s.fn, th = s.th;
    const per = fn === 'tan' ? 'π' : '2π', gv = Gf(fn, p, th);
    const gs = fn === 'tan' && Math.abs(Math.cos(s.b * (th - p.c))) < 1e-9 ? '定義されない' : fmt(gv, 3);
    put('i3', `<div class="f">変化前　${formulaH(fn, 1, 1, 0, 0)}　→　変化後　${formulaH(fn, s.a, s.b, s.cn, s.d)}</div>`
      + `<span>周期：<b>${perHTML(fn, 1)}</b> → <b>${perHTML(fn, s.b)}</b></span>`
      + `<span>θ = <b>${angBoth(th)}</b></span><span>変化前 y = <b>${fn === 'tan' && Math.abs(Math.cos(th)) < 1e-9 ? '定義されない' : fmt(F(fn, th), 3)}</b></span><span>変化後 y = <b>${gs}</b></span>`);
  }
}
function outs3() {
  const s = S.t3, fn = s.fn, c = s.cn;
  $('la').innerHTML = (fn === 'tan' ? '縦の倍率 a：' : '振幅 a：') + '1 → ' + fmt(s.a);
  $('ha').textContent = fn === 'tan' ? 'tan に振幅はなく、縦方向の倍率になる。負なら上下反転。' : '|a| が大きいほど山が高く谷が深い。負なら上下反転。';
  $('lb').innerHTML = '周期（b = ' + fmt(s.b) + '）：' + perHTML(fn, 1) + ' → ' + perHTML(fn, s.b);
  $('lc').innerHTML = c > 0 ? '右へ移動：' + angHTML(c) : c < 0 ? '左へ移動：' + angHTML(-c) : '横の移動なし';
  $('ld').innerHTML = s.d > 0 ? '上へ移動：' + fmt(s.d) : s.d < 0 ? '下へ移動：' + fmt(-s.d) : '縦の移動なし';
}

/* ---------- 復習の問題 ---------- */
const FAM = [0, 2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24];
const POOL = []; for (let n = -30; n <= 48; n++) if ([0, 2, 3, 4].includes(mod(n, 24) % 6)) POOL.push(n);
const CS = ['0', '1/2', '√2/2', '√3/2', '1', '−1/2', '−√2/2', '−√3/2', '−1'];
const CT = ['0', '√3/3', '1', '√3', '−√3/3', '−1', '−√3', 'undef'];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const Q = { cur: null, sel: null, state: 0 };
function newQ() {
  const type = rnd(['sin', 'cos', 'tan', 'quad', 'sin', 'cos', 'tan']);
  if (type === 'quad') {
    const sp = rnd([1, -1]), cp = rnd([1, -1]);
    Q.cur = { type, sp, cp, ans: String(sp > 0 ? (cp > 0 ? 1 : 2) : (cp > 0 ? 4 : 3)), choices: ['1', '2', '3', '4'] };
  } else { const n = rnd(POOL); Q.cur = { type, n, ans: keyOf(exact(type, n)), choices: type === 'tan' ? CT : CS }; }
  Q.sel = null; Q.state = 0; renderQ();
}
function renderQ() {
  const q = Q.cur;
  put('qq', q.type === 'quad' ? `sin θ が${q.sp > 0 ? '正' : '負'}、cos θ が${q.cp > 0 ? '正' : '負'}となる象限を答えよ。`
    : `${q.type}(${angHTML(q.n, 'rad')}) を求めよ。`);
  put('qc', q.choices.map(k => `<button data-act="choose" data-k="${k}" class="${Q.sel === k ? 'sel' : ''}">${q.type === 'quad' ? '第' + k + '象限' : keyHTML(k)}</button>`).join(''));
  let r = '';
  if (Q.state === 1) r = Q.sel === null ? '答えを選んでから押してね。' : Q.sel === q.ans ? '<span class="ok">正解です！</span>' : '<span class="ng">おしい。単位円を動かして、もう一度考えてみよう。</span>';
  if (Q.state === 2) r = explain();
  put('qr', r);
}
function explain() {
  const q = Q.cur;
  if (q.type === 'quad') return `答え：<b>第${q.ans}象限</b><br>sin θ は y 座標、cos θ は x 座標。y ${q.sp > 0 ? '＞' : '＜'} 0（${q.sp > 0 ? '上' : '下'}半分）かつ x ${q.cp > 0 ? '＞' : '＜'} 0（${q.cp > 0 ? '右' : '左'}半分）の領域が第${q.ans}象限。`;
  const e = f => valHTML(exact(f, q.n)), ans = keyHTML(q.ans);
  const how = q.type === 'sin' ? `sin θ は y 座標なので ${e('sin')}` : q.type === 'cos' ? `cos θ は x 座標なので ${e('cos')}`
    : `tan θ = y/x = ${e('sin')} ÷ ${e('cos')}` + (exact('tan', q.n).undef ? '（x = 0 なので定義されない）' : ` = ${ans}`);
  return `答え：<b>${ans}</b><br>θ = ${angHTML(q.n, 'rad')} の動径と単位円の交点は P(${e('cos')}, ${e('sin')})。${how}。`
    + (q.n < 0 || q.n >= 24 ? `<br>動径の位置は ${angHTML(mod(q.n, 24), 'rad')} と同じ（2π の整数倍の差）。` : '');
}

/* ---------- 操作 ---------- */
function touch(s) { if (!s.hold) { s.lo = Math.min(s.lo, s.th); s.hi = Math.max(s.hi, s.th); } }
function follow(s) {
  if (s.xmin === undefined) return;
  const lo = s.xmin + 0.05 * s.span, hi = s.xmin + 0.95 * s.span;
  if (s.th > hi) s.xmin += s.th - hi; else if (s.th < lo) s.xmin -= lo - s.th;
}
function moved(t) { const s = FN(t); if (t === 2) touch(s); follow(s); }
function zoom(s, f, cx = 0.5) { const ns = Math.min(40 * PI, Math.max(PI / 2, s.span * f)), at = s.xmin + cx * s.span; s.xmin = at - cx * ns; s.span = ns; }
const bar = t => `<div class="grp">${['sin', 'cos', 'tan'].map(f => `<button data-act="fn" data-t="${t}" data-v="${f}">${f}</button>`).join('')}</div>
<button data-act="play" data-t="${t}" id="pl${t}">▶ 再生</button>
<button data-act="back" data-t="${t}">◀ 少し戻す</button><button data-act="fwd" data-t="${t}">少し進める ▶</button>
<label>速さ <select data-act="speed" data-t="${t}">${[0.25, 0.5, 1, 2, 4].map(v => `<option value="${v}"${v === 1 ? ' selected' : ''}>×${v}</option>`).join('')}</select></label>
<label class="chk"><input type="checkbox" data-act="snap" data-t="${t}" checked>有名角にスナップ</label>
${t === 2 ? '<label class="chk"><input type="checkbox" data-act="hold" data-t="2">描画を一時停止</label>'
    : '<label class="chk"><input type="checkbox" data-act="showBase" data-t="3" checked>変化前を表示</label><label class="chk"><input type="checkbox" data-act="showNew" data-t="3" checked>変化後を表示</label>'}
<button data-act="zo" data-t="${t}">− 縮小</button><button data-act="zi" data-t="${t}">＋ 拡大</button><button data-act="zv" data-t="${t}">表示を戻す</button>
<button data-act="reset" data-t="${t}">リセット</button>`;
document.querySelectorAll('[data-bar]').forEach(el => { el.innerHTML = bar(el.dataset.bar); });

function sync() {
  document.querySelectorAll('[data-act=tab]').forEach(b => b.classList.toggle('on', +b.dataset.t === S.tab));
  document.querySelectorAll('[data-act=unit]').forEach(b => b.classList.toggle('on', b.dataset.v === S.u));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'p' + S.tab));
  document.querySelectorAll('[data-act=fn]').forEach(b => b.classList.toggle('on', FN(b.dataset.t).fn === b.dataset.v));
  [2, 3].forEach(t => { $('pl' + t).textContent = FN(t).play ? '⏸ 一時停止' : '▶ 再生'; });
  put('fam', FAM.map(n => `<button data-act="famous" data-n="${n}">${angHTML(n)}</button>`).join('')
    + '<button data-act="shift" data-v="1">＋2π</button><button data-act="shift" data-v="-1">−2π</button><button data-act="neg">符号反転</button>');
  $('sa').value = S.t3.a; $('sb').value = S.t3.b; $('sc').value = S.t3.cn; $('sd').value = S.t3.d;
  outs3(); renderQ(); cache.i1 = cache.i2 = cache.i3 = null; setTimeout(layout, 0);
}
function act(a, t, el) {
  const s = t ? FN(t) : null;
  switch (a) {
    case 'tab': S.tab = t; break;
    case 'unit': S.u = el.dataset.v; break;
    case 'fn': s.fn = el.dataset.v; break;
    case 'play': s.play = !s.play; break;
    case 'back': s.th -= PI / 12; moved(t); break;
    case 'fwd': s.th += PI / 12; moved(t); break;
    case 'speed': s.speed = +el.value; break;
    case 'snap': case 'hold': case 'showBase': case 'showNew': s[a] = el.checked; break;
    case 'zi': zoom(s, 0.75); break; case 'zo': zoom(s, 1 / 0.75); break; case 'zv': Object.assign(s, t === 2 ? mkV() : { xmin: -PI, span: 6 * PI }); break;
    case 'reset': S['t' + t] = t === 1 ? mk1() : t === 2 ? mk2() : mk3(); document.querySelectorAll(`[data-t="${t}"][type=checkbox]`).forEach(c => { c.checked = c.dataset.act !== 'hold'; }); document.querySelectorAll(`select[data-t="${t}"]`).forEach(c => { c.value = 1; }); break;
    case 'famous': S.t1.th = +el.dataset.n * PI / 12; break;
    case 'shift': S.t1.th += +el.dataset.v * TAU; break;
    case 'neg': S.t1.th = -S.t1.th; break;
    case 'choose': Q.sel = el.dataset.k; Q.state = 0; break;
    case 'check': Q.state = 1; break;
    case 'reveal': Q.state = 2; S.t1.th = Q.cur.type === 'quad' ? S.t1.th : Q.cur.n * PI / 12; break;
    case 'next': newQ(); break;
  }
  sync();
}
document.addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b) act(b.dataset.act, +b.dataset.t || 0, b); });
document.addEventListener('change', e => { const b = e.target.closest('[data-act]'); if (b && b.tagName !== 'BUTTON') act(b.dataset.act, +b.dataset.t || 0, b); });
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.sl; if (!k) return;
  const s = S.t3; let v = +e.target.value;
  if (k === 'b' && v === 0) { v = s.b > 0 ? -0.25 : 0.25; e.target.value = v; }
  if (k === 'c') s.cn = v; else s[k] = v;
  outs3();
});

/* 単位円のドラッグ（何周でも・マウスとタッチ） */
function fromPtr(t, e) {
  const s = FN(t), g = circ(t), r = g.cv.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = r.height / 2 - (e.clientY - r.top);
  if (!x && !y) return;
  let d = Math.atan2(y, x) - mod(s.th, TAU); d = mod(d + PI, TAU) - PI; s.th += d;
  if (s.snap) s.th = snapAng(s.th);
  if (t > 1) moved(t);
}
[[1, 'c1'], [2, 'c2c'], [3, 'c3c']].forEach(([t, id]) => {
  const cv = $(id);
  cv.onpointerdown = e => { drag = t; cv.setPointerCapture(e.pointerId); fromPtr(t, e); };
  cv.onpointermove = e => { if (drag === t) fromPtr(t, e); };
  cv.onpointerup = cv.onpointercancel = () => { drag = 0; };
});
[[2, 'c2g'], [3, 'c3g']].forEach(([t, id]) => {
  const cv = $(id), s = FN; let px = null;
  cv.onpointerdown = e => { px = e.clientX; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (px !== null) { const q = s(t); q.xmin -= (e.clientX - px) * q.span / G[id].w; px = e.clientX; } };
  cv.onpointerup = cv.onpointercancel = () => { px = null; };
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom(s(t), e.deltaY > 0 ? 1.12 : 1 / 1.12, (e.clientX - cv.getBoundingClientRect().left) / G[id].w); }, { passive: false });
});

/* ---------- メインループ ---------- */
let last = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  try {
    const t = S.tab;
    if (t > 1) { const s = FN(t); if (s.play && !drag) { s.th += s.speed * dt; moved(t); } }
    if (t === 1) drawCircle(1, 'all', S.t1.th, { labels: true });
    else { const s = FN(t); drawCircle(t, s.fn, s.th, { link: true }); drawGraph(t); }
    drawInfo();
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}
newQ(); sync();
requestAnimationFrame(loop);
