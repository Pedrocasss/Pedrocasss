// Desenho de todos os SVG do perfil («輪廻 · terminal»). Recebe o data.json e devolve strings SVG.
// Todo o texto vai em paths (fontes OFL em ../fonts), por isso não depende das fontes de quem vê.
const path = require('path');
const ot = require('opentype.js');

const FD = path.join(__dirname, '..', 'fonts');
const F = {
  jp: ot.loadSync(path.join(FD, 'NotoSerifJP-Black-subset.ttf')), // subconjunto: só os kanji usados
  cz: ot.loadSync(path.join(FD, 'Cinzel-SemiBold.ttf')),
  mono: ot.loadSync(path.join(FD, 'JetBrainsMono-Medium.ttf')),
};
const C = { bg: '#0B0B0F', lav: '#C9B6F2', mid: '#8E7CC3', deep: '#3B2A63', ink: '#E6E0F5', line: '#2A1F45', dim: '#8A80A6' };
const RM = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
const NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
const fmt = n => n.toLocaleString('en-US');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------- dados configuráveis (o que não vem da API) ----------
const PROFILE = {
  role: 'mid full-stack @ Doutor Energia',
  side: 'freelance @ POP TVDE',
  builds: ['backends · real-time systems', 'automations · integrations · AI'],
  next: 'LogDriver - coming soon',
  linkedin: 'https://www.linkedin.com/in/pedro-silva-a09aba252/',
  email: 'pedroacnesisma@gmail.com',
  stack: [
    ['天道', 'backend &\nai_automations', 'JavaScript · TypeScript · Node.js · Express · Go · PHP · Laravel · C · C++\nPython · Claude · Gemini · AI automations'],
    ['修羅道', 'infra', 'Docker · nginx · Linux · Azure · GitHub Actions · Prometheus · Grafana'],
    ['人間道', 'data', 'PostgreSQL (Neon) · Redis · BullMQ · SQL'],
    ['餓鬼道', 'integrations', 'Bitrix24 REST · WhatsApp · WebSockets · webhooks · Google Cloud Platform\nMailgun · Sweego · Twilio'],
    ['畜生道', 'frontend', 'React · Vite · Tailwind · HTML · CSS · Vitest'],
    ['地獄道', 'mobile', 'Kotlin · Expo'],
  ],
};

// ---------- texto -> paths ----------
function tp(font, s, x, y, size, anchor = 'start', ls = 0) {
  for (const ch of s) if (ch !== ' ' && !font.charToGlyphIndex(ch)) throw new Error(`glifo em falta: ${ch} em "${s}"`);
  const chars = [...s];
  const w = chars.reduce((a, ch) => a + font.getAdvanceWidth(ch, size), 0) + ls * (chars.length - 1);
  let cx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x, d = '';
  for (const ch of chars) { d += font.getPath(ch, cx, y, size).toPathData(1); cx += font.getAdvanceWidth(ch, size) + ls; }
  return d;
}
// mono: cada glifo definido uma vez em <defs> e repetido com <use>; '❯' é desenhado (a fonte não o tem)
function glyphs() {
  const defs = new Map();
  // um caráter: <use> do glifo (definido na primeira vez)
  const u = (ch, x, y, size) => {
    const id = `m${size}_${ch.codePointAt(0).toString(36)}`;
    if (!defs.has(id)) {
      let d;
      if (ch === '❯') { const k = size / 15; d = `M${1.5 * k} ${-10 * k}L${7.5 * k} ${-5 * k}L${1.5 * k} 0L${1.5 * k} ${-2.6 * k}L${4.6 * k} ${-5 * k}L${1.5 * k} ${-7.4 * k}Z`; }
      else { if (!F.mono.charToGlyphIndex(ch)) throw new Error('mono sem glifo ' + ch); d = F.mono.getPath(ch, 0, 0, size).toPathData(1); }
      defs.set(id, `<path id="${id}" d="${d}"/>`);
    }
    return `<use xlink:href="#${id}" x="${x.toFixed(1)}" y="${y}"/>`;
  };
  return {
    u,
    t(s, x, y, size, fill, extra = '') {
      let out = '', cx = x;
      for (const ch of s) {
        if (ch !== ' ') out += u(ch, cx, y, size);
        cx += size * 0.6;
      }
      return `<g fill="${fill}"${extra}>${out}</g>`;
    },
    defs: () => [...defs.values()].join(''),
  };
}
function win(g, w, h, title) {
  return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="${C.bg}" stroke="${C.line}" stroke-width="1.5"/>
<circle cx="24" cy="20" r="5.5" fill="${C.deep}"/><circle cx="42" cy="20" r="5.5" fill="${C.mid}"/><circle cx="60" cy="20" r="5.5" fill="${C.lav}"/>
${g.t(title, 80, 25, 13, C.dim)}<line x1="1" y1="38" x2="${w - 1}" y2="38" stroke="${C.line}"/>`;
}
function kfAnim(attr, dur, kf, fn, extra = '') {
  return `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" keyTimes="${kf.map(k => +(k[0] / dur).toFixed(4)).join(';')}" values="${kf.map(fn).join(';')}"${extra}/>`;
}

// entrada em SMIL: sem animação (imagem estática, pré-visualização) fica tudo visível
function appear(delay, dx, dy, dur) {
  const T = +delay + dur, a = +(delay / T).toFixed(3);
  return `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${a};1" dur="${T.toFixed(2)}s" fill="freeze"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${dx} ${dy};${dx} ${dy};0 0" keyTimes="0;${a};1" dur="${T.toFixed(2)}s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;.2 .7 .2 1"/>`;
}

// ---------- números derivados do data.json ----------
function derive(data) {
  const days = data.weeks.flat().map(([date, count]) => ({ date, count }));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) streak++; else if (i === days.length - 1) continue; else break; }
  let best = 0, run = 0;
  for (const d of days) { run = d.count > 0 ? run + 1 : 0; best = Math.max(best, run); }
  const lt = Object.values(data.langs).reduce((a, b) => a + b, 0) || 1;
  const today = days.at(-1);
  const D = {
    ...data, days, streak, best,
    today: today.count, todayDate: today.date,
    maxDay: Math.max(1, ...days.map(d => d.count)),
    active: days.filter(d => d.count > 0).length,
    years: Math.floor((new Date(data.generatedAt) - new Date(data.createdAt)) / 3.15576e10),
    langPct: Object.entries(data.langs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, b]) => [n, Math.round(b / lt * 100)]),
  };
  D.rings = [1, 3, 6, 10, 15, 20].filter(t => D.today >= t).length; // 0 = olho fechado ... 20+ = 6 anéis
  return D;
}
const short = n => n.replace('JavaScript', 'JS').replace('TypeScript', 'TS');

// ---------- olho em caracteres ----------
// Cada célula da grelha é sombreada (luminância -> rampa de caracteres, com cor própria) para dar volume:
// esclera, íris lavanda com os 6 anéis sempre desenhados (os acesos = contribuições de hoje), pupila, reflexo, pálpebras e prega.
const RAMP = ' .:-=+*#%@';
const FS = 7, CW = FS * 0.6, LH = 7, COLS = 78, ROWS = 46;
const PW = 340, PH = 480, OX = (PW - COLS * CW) / 2, OY = 86;
const ECX = 170, YC = 250, A = 158, HU = 92, HL = 94; // cantos do olho na linha YC; HU/HL = altura das pálpebras de cima/baixo
const ICX = ECX, ICY = YC + 2, RI = 100, RP = 0.14;    // íris (raio em px) e pupila (fração do raio)
const RINGS = [1, 2, 3, 4, 5, 6].map(i => RP + (1 - RP) * i / 6); // o 6.º anel é a borda da íris
const DIRS = { c: [0, 0, 'center'], n: [0, -2, 'north'], ne: [4, -2, 'north-east'], e: [5, 0, 'east'], se: [4, 2, 'south-east'], s: [0, 2, 'south'], sw: [-4, 2, 'south-west'], w: [-5, 0, 'west'], nw: [-4, -2, 'north-west'] };

const clamp = v => Math.max(0, Math.min(1, v));
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
// cor entre a e b -> #rgb (4 bits por canal): poucos grupos de cor e menos bytes
const col = (a, b, t) => '#' + hex(a).map((v, i) => Math.round((v + (hex(b)[i] - v) * clamp(t)) / 17).toString(16)).join('');
const ramp = l => RAMP[Math.round(clamp(l) * (RAMP.length - 1))];
const hash = (r, c) => { const s = Math.sin(r * 127.1 + c * 311.7) * 43758.5453; return s - Math.floor(s); };
// Bézier cúbica: y(x) por amostragem (as curvas das pálpebras são monótonas em x) e o "d" para o SVG
function bez(p) {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, k = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
    pts.push([0, 1].map(j => k.reduce((a, w, n) => a + w * p[n][j], 0)));
  }
  const y = x => {
    if (x <= pts[0][0] || x >= pts.at(-1)[0]) return null;
    const i = pts.findIndex(q => q[0] >= x), [a, b] = [pts[i - 1], pts[i]];
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  };
  return { y, d: `M${p[0].map(v => v.toFixed(1))}C${p.slice(1).flat().map(v => v.toFixed(1))}` };
}
const L0 = [ECX - A, YC + 5], L1 = [ECX + A, YC - 3]; // canto interior um pouco mais baixo que o exterior
// pálpebra de cima com abertura s (1 = aberta, 0 = linha dos cantos, -1 = fechada sobre a de baixo)
const upper = s => bez([L0, [ECX - A * 0.5, YC - HU * s / 0.75], [ECX + A * 0.42, YC - HU * s / 0.75], L1]);
const lower = bez([L0, [ECX - A * 0.42, YC + HL / 0.75], [ECX + A * 0.55, YC + HL / 0.75], L1]);
const crease = s => bez([[ECX - A * 0.75, YC - 34], [ECX - A * 0.42, YC - (HU * s + 12) / 0.75], [ECX + A * 0.4, YC - (HU * s + 12) / 0.75], [ECX + A * 0.92, YC - 34]]);

// uma linha (bordo da pálpebra, prega) em caracteres: escolhidos pelo declive e pela altura dentro da célula
function lineChars(curve, put, color, x0 = 0, x1 = PW) {
  for (let c = 0; c < COLS; c++) {
    const x = OX + (c + 0.5) * CW;
    if (x < x0 || x > x1) continue;
    const y = curve.y(x), ya = curve.y(x - CW / 2), yb = curve.y(x + CW / 2);
    if (y == null || ya == null || yb == null) continue;
    const r = Math.floor((y - OY) / LH), f = (y - OY) / LH - r, dy = yb - ya;
    const ch = Math.abs(dy) > LH * 0.6 ? (dy < 0 ? '/' : '\\') : f > 0.66 ? '_' : f > 0.33 ? '-' : '\'';
    put(ch, c, r, typeof color === 'function' ? color(x) : color);
  }
}

function eye(D, dir = 'c') {
  const g = glyphs();
  const head = win(g, PW, PH, 'rinnegan.ascii');
  const layers = {};
  const put = layer => (ch, c, r, fill) => {
    if (ch === ' ' || r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const L = layers[layer] ||= new Map();
    L.set(fill, (L.get(fill) || '') + g.u(ch, OX + c * CW, +(OY + r * LH + LH / 2 + FS * 0.28).toFixed(1), FS));
  };
  const emit = layer => [...(layers[layer] || new Map())].map(([f, s]) => `<g fill="${f}">${s}</g>`).join('');
  const cells = fn => { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) fn(OX + (c + 0.5) * CW, OY + (r + 0.5) * LH, r, c); };
  const on = RINGS.slice(0, D.rings); // os anéis acendem de dentro para fora
  const sOpen = 0.9 + D.rings / 60; // sem contribuições a pálpebra desce um pouco; o olho nunca fecha
  const up = upper(sOpen);
  const inEye = (x, y) => { const a = up.y(x), b = lower.y(x); return a != null && b != null && y > a && y < b; };

  // 1) esclera (fixa): mais escura nos cantos e junto à pálpebra de baixo
  const scl = put('scl');
  cells((x, y, r, c) => {
    if (!inEye(x, y) || Math.hypot(x - ICX, y - ICY) < RI - 26) return; // o que fica sempre debaixo da íris não se desenha
    const u = (x - ECX) / A;
    const l = (0.58 - 0.46 * u * u + (hash(r, c) - 0.5) * 0.12) * Math.min(1, 0.45 + (lower.y(x) - y) / 14);
    scl(ramp(l), c, r, col('#4a4362', '#f0ecf7', l * 1.6));
  });

  // 2) íris (move-se): degradé lavanda com fibras e luz de cima-esquerda; anéis apagados = sulcos escuros, acesos = brilho
  const iris = put('iris'), lit = put('lit');
  cells((x, y, r, c) => {
    const dx = x - ICX, dy = y - ICY, d = Math.hypot(dx, dy) / RI;
    if (d > 1.03) return;
    const hl = Math.hypot(dx + RI * 0.34, dy + RI * 0.38);                                      // reflexo da luz na córnea
    if (hl < 9) return iris(hl < 4 ? '@' : hl < 6.5 ? '#' : '*', c, r, hl < 6.5 ? '#fff' : '#e6dcf7');
    if (Math.hypot(dx - RI * 0.27, dy - RI * 0.3) < 3.5) return iris('+', c, r, '#d4c8ee');
    if (d < RP) return;                                                                         // pupila
    const ang = Math.atan2(dy, dx), rho = d * RI, near = RINGS.reduce((m, q) => Math.abs(d - q) < Math.abs(d - m) ? q : m);
    // anel com uma célula de espessura: a meia largura é a projeção da célula na direção do raio
    const hw = 0.5 * (Math.abs(dx) * CW + Math.abs(dy) * LH) / rho, w = 1 - Math.abs(rho - near * RI) / hw;
    if (w > 0 && on.includes(near)) return lit(ramp(0.7 + 0.3 * w), c, r, col('#e2d6ff', '#ffffff', w));
    if (w > 0) return iris(w > 0.5 ? '.' : ':', c, r, '#5e4d8c');
    const l = 0.66 + 0.14 * (1 - d) + 0.05 * Math.sin(ang * 19 + d * 7) - 0.08 * (dx + dy) / RI - 0.22 * Math.max(0, d - 0.88) / 0.12;
    iris(ramp(l), c, r, col('#b39ddb', '#e8cdf2', (l - 0.55) * 3));
  });

  // 3) prega da pálpebra e bordos (aberto, meio, fechado); o de baixo é fixo
  const skin = put('skin');
  lineChars(crease(sOpen), skin, x => col('#241f36', '#4f4473', 1 - ((x - ECX) / A / 0.8) ** 2), ECX - A * 0.6, ECX + A * 0.78);
  const lid = (s, name) => {
    const p = put(name), cv = upper(s);
    lineChars(cv, p, x => col('#6a5a96', '#ece4ff', 1.3 - ((x - ECX) / A) ** 2));
  };
  lid(sOpen, 'lo'); lid(sOpen * 0.4, 'lh'); lid(-1, 'lc');
  lineChars(lower, put('low'), x => col('#2f2846', '#7a68ad', 1 - ((x - ECX) / A) ** 2));

  // animações (SMIL e CSS, sem JS): piscar aos saltos e o olhar a vaguear devagar
  const dur = 9, bl = [[0, 1]];
  for (const [t, dbl] of [[2.6, 0], [6.4, 1]]) {
    bl.push([t, 0.5], [t + 0.07, 0], [t + 0.16, 0.5], [t + 0.24, 1]);
    if (dbl) bl.push([t + 0.42, 0.5], [t + 0.49, 0], [t + 0.58, 0.5], [t + 0.66, 1]);
  }
  bl.push([dur, 1]);
  const disc = ' calcMode="discrete"';
  const clipUp = s => `${upper(s).d}V${PH}H${L0[0]}Z`;
  const dAnim = kfAnim('d', dur, bl, k => clipUp(k[1] === 1 ? sOpen : k[1] ? sOpen * 0.4 : -1.05), disc);
  const vis = st => kfAnim('opacity', dur, bl, k => +(k[1] === st), disc);
  const [gx, gy, label] = DIRS[dir];
  const gaze = dir === 'c'
    ? `<animateTransform attributeName="transform" type="translate" dur="16s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.12;.22;.36;.46;.6;.7;.82;.9;1" values="0 0;0 0;-16 2;-16 2;12 -3;12 -3;6 4;6 4;0 0;0 0" keySplines="${Array(9).fill('.45 0 .55 1').join(';')}"/>` : '';
  const fx = `<filter id="gl" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="sc" cx="${ICX}" cy="${ICY}" r="${A}" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#2c2840"/><stop offset="1" stop-color="#121019"/></radialGradient><radialGradient id="ir"><stop offset=".14" stop-color="#0b0b0f"/><stop offset=".2" stop-color="#6e5a9e"/><stop offset=".85" stop-color="#5c4a8a"/><stop offset="1" stop-color="#2e2450"/></radialGradient>
<filter id="sh" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>`;
  const ring = (qs, stroke, sw) => `<g fill="none" stroke="${stroke}" stroke-width="${sw}">${qs.map(q => `<circle cx="${ICX}" cy="${ICY}" r="${(q * RI).toFixed(1)}"/>`).join('')}</g>`;
  const body = `<defs>${fx}<clipPath id="ce"><path d="${lower.d}V${OY}H${L0[0]}Z"/></clipPath><clipPath id="cu"><path d="${clipUp(sOpen)}">${dAnim}</path></clipPath></defs>
${emit('skin')}<g clip-path="url(#ce)"><g clip-path="url(#cu)"><rect x="0" y="${OY}" width="${PW}" height="${ROWS * LH}" fill="url(#sc)"/>${emit('scl')}
<g transform="translate(${gx * 4} ${gy * 3})"><g>${gaze}<circle cx="${ICX}" cy="${ICY}" r="${RI + 2}" fill="url(#ir)"/>${ring(RINGS.filter(q => !on.includes(q)), '#140e24', 2.6)}${emit('iris')}<g class="lit" filter="url(#gl)">${ring(on, '#e9ddff', 1.6)}${emit('lit')}</g></g></g>
<path d="${up.d}" fill="none" stroke="${C.bg}" stroke-width="16" opacity=".8" filter="url(#sh)"/></g></g>
${emit('low')}<g>${vis(1)}${emit('lo')}</g><g opacity="0">${vis(0.5)}${emit('lh')}</g><g opacity="0">${vis(0)}${emit('lc')}</g>`;
  const css = `<style>.lit{animation:lit 3.2s ease-in-out infinite}@keyframes lit{50%{opacity:.7}}${RM}</style>`;
  const foot = g.t(dir === 'c' ? 'gaze: wandering' : `gaze: ${label}`, 22, PH - 54, 13, C.lav) + g.t(`rings lit: ${D.rings}/6 (today ${D.today})`, 22, PH - 32, 12, C.dim);
  const kanji = `<path d="${tp(F.jp, '輪廻眼', PW - 22, 76, 26, 'end', 2)}" fill="${C.lav}"/>` + g.t('RINNEGAN', 22, 72, 13, C.mid);
  return `<svg ${NS} width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Rinnegan drawn in characters, ${D.rings} of 6 rings lit by today's ${D.today} contributions">
<title>rinnegan.ascii</title><defs>${g.defs()}${css}</defs>${head}${kanji}${body}${foot}</svg>`;
}

// ---------- ficha neofetch ----------
function fetchPane(D) {
  const g = glyphs(), W = 560, H = 480, x0 = 24, k = 15, lh = 19;
  const winSvg = win(g, W, H, 'pedro@rinnegan: ~ $ neofetch');
  const st = PROFILE.stack;
  const L = [
    ['pedro'], ['---------------'],
    ['Role', PROFILE.role], ['Side', PROFILE.side],
    ['Builds', PROFILE.builds[0]], ['', PROFILE.builds[1]],
    ['Next', PROFILE.next],
    ['Uptime', `${D.years}y on GitHub · ${D.ownRepos} own repos`],
    ['Backend', 'Node · Express · TS · Go · PHP · C/C++'],
    ['Front', 'React · Vite · Tailwind · HTML · CSS'],
    ['Mobile', 'Kotlin · Expo'],
    ['Data', 'PostgreSQL/Neon · Redis · BullMQ'],
    ['Infra', 'Docker · nginx · Azure · Grafana'],
    ['Integr', 'Bitrix24 · WhatsApp · GCP · Twilio'],
    ['Contrib', `${fmt(D.total)} / 12 mo · today ${D.today}`],
    ['Streak', `${D.streak}d · best ${D.best}d · ${D.active} days`],
    ['Repos', `${D.workedRepos} worked on · ${fmt(D.commitsAll)} commits`],
    ['Contact', PROFILE.linkedin.replace(/^https:\/\/www\.|\/$/g, '')],
  ];
  let body = '';
  L.forEach((l, i) => {
    const y = 64 + i * lh;
    const s = i === 0 ? g.t('pedro', x0, y, k, C.lav) + g.t('@rinnegan', x0 + 5 * k * 0.6, y, k, C.ink)
      : i === 1 ? g.t(l[0], x0, y, k, C.deep)
        : g.t(l[0], x0, y, k, C.lav) + g.t(l[1], x0 + 9 * k * 0.6, y, k, C.ink);
    body += `<g>${appear((0.15 + i * 0.09).toFixed(2), -6, 0, .35)}${s}</g>`;
  });
  const yL = 64 + L.length * lh + 6, tot = D.langPct.reduce((a, l) => a + l[1], 0) || 1;
  const shades = [C.lav, C.mid, '#6D59A8', '#54428A', C.deep];
  let lx = x0 + 9 * k * 0.6, bar = '';
  D.langPct.forEach(([, p], i) => { const w = (W - 48 - 9 * k * 0.6) * p / tot; bar += `<rect x="${lx.toFixed(1)}" y="${yL - 11}" width="${Math.max(1, w - 2).toFixed(1)}" height="9" rx="2" fill="${shades[i]}"/>`; lx += w; });
  const langs = g.t('Langs', x0, yL, k, C.lav) + bar + g.t(D.langPct.slice(0, 4).map(([n, p]) => `${short(n)} ${p}%`).join(' · '), x0 + 9 * k * 0.6, yL + 18, 12, C.dim);
  const pal = [C.bg, C.deep, '#54428A', C.mid, '#AD98E0', C.lav, C.ink, '#fff'].map((c, i) => `<rect x="${x0 + i * 30}" y="${H - 34}" width="26" height="14" fill="${c}" stroke="${C.line}"/>`).join('');
  const cur = `<rect class="cur" x="${x0 + 8 * 30 + 8}" y="${H - 34}" width="9" height="15" fill="${C.lav}"/>`;
  return `<svg ${NS} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`neofetch: Pedro Silva, ${PROFILE.role}, ${PROFILE.side}. Builds ${PROFILE.builds.join(', ')}. ${PROFILE.next}. ${fmt(D.total)} contributions in 12 months, ${D.streak}-day streak. Top languages: ${D.langPct.map(([n, p]) => `${n} ${p}%`).join(', ')}.`)}">
<title>pedro@rinnegan · neofetch</title><defs>${g.defs()}<style>.cur{animation:cur 1s steps(1) infinite}@keyframes cur{50%{opacity:0}}${RM}</style></defs>
${winSvg}${body}<g>${appear(1.9, -6, 0, .35)}${langs}</g>${pal}${cur}</svg>`;
}

// ---------- stack.yml: os seis caminhos ----------
function stackPane() {
  const g = glyphs(), W = 900, x0 = 24, lh = 34, linhas = (s) => Math.max(s[1].split('\n').length, s[2].split('\n').length),
    rows = PROFILE.stack.reduce((n, s) => n + linhas(s), 0), H = 120 + rows * lh, xTech = x0 + 88 + 15 * 0.6 * 16;
  const winSvg = win(g, W, H, 'pedro@rinnegan: ~/six-paths');
  let body = `<g>${appear(.1, -6, 0, .35)}${g.t('❯', x0, 66, 15, C.lav)}${g.t('cat stack.yml', x0 + 18, 66, 15, C.ink)}</g>`;
  let i = 0; // linha visual; rótulo e tech com \n continuam na linha seguinte (o kanji só na primeira, os «:» só no fim do rótulo)
  PROFILE.stack.forEach((s) => {
    const [kj, key, tech] = s, ks = key.split('\n'), ts = tech.split('\n');
    for (let j = 0; j < linhas(s); j++) {
      const y = 104 + i * lh;
      const kjD = j === 0 ? `<path d="${tp(F.jp, kj, x0 + 2, y + 1, 19, 'start', 1)}" fill="${C.mid}"/>` : '';
      const rot = ks[j] ? g.t(ks[j] + (j === ks.length - 1 ? ':' : ''), x0 + 88, y, 15, C.lav) : '';
      body += `<g>${appear((0.35 + i * 0.16).toFixed(2), -6, 0, .35)}${kjD}${rot}${ts[j] ? g.t(ts[j], xTech, y, 14, C.ink) : ''}</g>`;
      i++;
    }
  });
  const yEnd = 104 + rows * lh + 4;
  body += `<g>${appear((0.4 + rows * 0.16).toFixed(2), -6, 0, .35)}${g.t('❯', x0, yEnd, 15, C.lav)}<rect class="cur" x="${x0 + 18}" y="${yEnd - 13}" width="9" height="16" fill="${C.lav}"/></g>`;
  return `<svg ${NS} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc('stack.yml, six paths: ' + PROFILE.stack.map(s => `${s[1].replace(/\n/g, ' ')}:${s[2].replace(/\n/g, ' · ')}`).join('; '))}">
<title>stack.yml</title><defs>${g.defs()}<style>.cur{animation:cur 1s steps(1) infinite}@keyframes cur{50%{opacity:0}}${RM}</style></defs>
${winSvg}${body}</svg>`;
}

// ---------- botões de contacto (cada um vai num <a><img>) ----------
function button(kind) {
  const g = glyphs(), H = 52;
  const cfg = {
    linkedin: { w: 236, cmd: 'open linkedin', icon: `<rect x="16" y="15" width="22" height="22" rx="4" fill="none" stroke="${C.lav}" stroke-width="1.8"/>${g.t('in', 20, 31, 12, C.lav)}` },
    email: { w: 218, cmd: 'mail pedro', icon: `<rect x="15" y="17" width="24" height="18" rx="3" fill="none" stroke="${C.lav}" stroke-width="1.8"/><path d="M16 19l11 8 11-8" fill="none" stroke="${C.lav}" stroke-width="1.8"/>` },
    chess: { w: 168, cmd: 'off: chess', icon: `<g transform="translate(18 13)" fill="${C.lav}"><circle cx="9" cy="5" r="4.2"/><path d="M5.2 10h7.6l1.8 10H3.4Z"/><rect x="1" y="21" width="16" height="4" rx="1.5"/></g>`, tag: true },
  }[kind];
  const text = g.t('❯', 50, 31, 14, C.mid) + g.t(cfg.cmd, 66, 31, 14, C.ink);
  return `<svg ${NS} width="${cfg.w}" height="${H}" viewBox="0 0 ${cfg.w} ${H}" role="img" aria-label="${kind}">
<defs>${g.defs()}</defs><rect x="1" y="1" width="${cfg.w - 2}" height="${H - 2}" rx="10" fill="${C.bg}" stroke="${cfg.tag ? C.line : C.mid}" stroke-width="1.5"${cfg.tag ? ' stroke-dasharray="4 4"' : ''}/>
${cfg.icon}${text}</svg>`;
}

// ---------- calendário isométrico ----------
function calendar(D) {
  const g = glyphs(), W = 900, H = 380;
  const u = [13.4, 4.1], v = [-7.6, 4.4], gap = 0.84, O = [96, 128];
  const tops = ['#1A1428', C.deep, '#5E4A99', C.mid, '#AD98E0', C.lav];
  const lvl = c => c === 0 ? 0 : Math.min(5, 1 + Math.floor(Math.sqrt(c / D.maxDay) * 5));
  const darken = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
  const P = (w, d, a, b, h) => [O[0] + (w + a) * u[0] + (d + b) * v[0], O[1] + (w + a) * u[1] + (d + b) * v[1] - h];
  const poly = (pts, fill, cls = '') => `<path${cls} d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}Z" fill="${fill}"/>`;
  let weeksSvg = '';
  D.weeks.forEach((wk, w) => {
    let s = '';
    wk.forEach(([date, c]) => {
      const d = new Date(date + 'T00:00:00Z').getUTCDay(), L = lvl(c);
      const h = c ? 3 + 74 * Math.sqrt(c / D.maxDay) : 0;
      const p0 = P(w, d, 0, 0, 0), p1 = P(w, d, gap, 0, 0), p2 = P(w, d, gap, gap, 0), p3 = P(w, d, 0, gap, 0);
      const up = p => [p[0], p[1] - h];
      if (h) s += poly([p3, p2, up(p2), up(p3)], darken(tops[L], 0.62)) + poly([p1, p2, up(p2), up(p1)], darken(tops[L], 0.42));
      s += poly([up(p0), up(p1), up(p2), up(p3)], tops[L], date === D.todayDate ? ' class="today"' : '');
    });
    weeksSvg += `<g>${appear(w * 0.035, 0, -26, .7)}${s}</g>`;
  });
  let months = '', last = '';
  D.weeks.forEach((wk, w) => {
    const m = wk[0][0].slice(0, 7);
    if (m !== last && w > 0 && w < D.weeks.length - 1) {
      const mm = new Date(m + '-01T00:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const p = P(w, 7, 0, 0.6, 0);
      months += g.t(mm, p[0] - 6, p[1] + 14, 11, C.dim);
    }
    last = m;
  });
  const head = `<path d="${tp(F.jp, '一年', 24, 46, 26, 'start', 2)}" fill="${C.lav}"/>` + g.t('contributions · last 12 months', 92, 42, 14, C.ink);
  const stats = [[fmt(D.total), 'total'], [`${D.maxDay}`, 'busiest day'], [`${D.active}`, 'active days'], [`${D.streak}d`, 'streak'], [`${D.today}`, 'today']]
    .map(([n, l], i) => g.t(n, 600 + (i % 3) * 100, 74 + Math.floor(i / 3) * 50, 20, C.lav) + g.t(l, 600 + (i % 3) * 100, 92 + Math.floor(i / 3) * 50, 11, C.dim)).join('');
  return `<svg ${NS} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="3D contribution calendar: ${fmt(D.total)} contributions in the last 12 months, busiest day ${D.maxDay}, ${D.active} active days, ${D.streak}-day streak.">
<title>Contribution calendar, 3D</title><defs>${g.defs()}<style>.today{animation:td 1.4s ease-in-out 2.2s infinite}@keyframes td{50%{fill:#fff}}${RM}</style></defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${C.bg}" stroke="${C.line}" stroke-width="1.5"/>
${head}${stats}${weeksSvg}${months}</svg>`;
}

function astra() {
  const W = 900, H = 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Per aspera ad astra">
<path d="${tp(F.cz, 'PER ASPERA AD ASTRA', 450, 42, 24, 'middle', 6)}" fill="${C.lav}"/>
<line x1="40" y1="34" x2="230" y2="34" stroke="${C.deep}"/><line x1="670" y1="34" x2="860" y2="34" stroke="${C.deep}"/></svg>`;
}

module.exports = { PROFILE, DIRS, derive, eye, fetchPane, stackPane, button, calendar, astra, fmt };
