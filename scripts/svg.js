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
  return {
    t(s, x, y, size, fill, extra = '') {
      let out = '', cx = x;
      for (const ch of s) {
        if (ch !== ' ') {
          const id = `m${size}_${ch.codePointAt(0).toString(36)}`;
          if (!defs.has(id)) {
            let d;
            if (ch === '❯') { const k = size / 15; d = `M${1.5 * k} ${-10 * k}L${7.5 * k} ${-5 * k}L${1.5 * k} 0L${1.5 * k} ${-2.6 * k}L${4.6 * k} ${-5 * k}L${1.5 * k} ${-7.4 * k}Z`; }
            else { if (!F.mono.charToGlyphIndex(ch)) throw new Error('mono sem glifo ' + ch); d = F.mono.getPath(ch, 0, 0, size).toPathData(1); }
            defs.set(id, `<path id="${id}" d="${d}"/>`);
          }
          out += `<use xlink:href="#${id}" x="${cx.toFixed(1)}" y="${y}"/>`;
        }
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
const CW = 7.8, LH = 13, FS = 13, COLS = 38, ROWS = 21;
const PW = 340, PH = 480, OX = (PW - COLS * CW) / 2, OY = 110;
const ECX = OX + COLS * CW / 2, ECY = OY + ROWS * LH / 2 - 4;
const A = 146, HH = 104, RI = 92;
const inAlm = (x, y, f = 1) => { const u = (x - ECX) / A; return Math.abs(u) < 1 && Math.abs(y - ECY) < HH * f * (1 - u * u); };
const almPath = f => `M${ECX - A} ${ECY}Q${ECX} ${ECY - 2 * HH * f} ${ECX + A} ${ECY}Q${ECX} ${ECY + 2 * HH * 0.9 * f} ${ECX - A} ${ECY}Z`;
const DIRS = { c: [0, 0, 'center'], n: [0, -2, 'north'], ne: [4, -2, 'north-east'], e: [5, 0, 'east'], se: [4, 2, 'south-east'], s: [0, 2, 'south'], sw: [-4, 2, 'south-west'], w: [-5, 0, 'west'], nw: [-4, -2, 'north-west'] };

function eye(D, dir = 'c') {
  const g = glyphs();
  const head = win(g, PW, PH, 'rinnegan.ascii');
  const cell = (c, r) => [OX + c * CW + CW / 2, OY + r * LH + LH / 2];
  const outline = f => {
    let up = '', lo = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const [x, y] = cell(c, r);
      if (!inAlm(x, y, f)) continue;
      if (!inAlm(x, y - LH, f)) up += g.t(Math.abs(x - ECX) > A * 0.86 ? (x < ECX ? '<' : '>') : '=', x - CW / 2, y + 4, FS, C.lav);
      else if (!inAlm(x, y + LH, f)) lo += g.t('-', x - CW / 2, y + 4, FS, C.mid);
    }
    return up + lo;
  };
  const closed = Array.from({ length: COLS - 2 }, (_, c) => g.t(c === 0 ? '<' : c === COLS - 3 ? '>' : '=', OX + (c + 1) * CW, ECY + 4, FS, C.lav)).join('');
  let scl = '';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const [x, y] = cell(c, r);
    if (inAlm(x, y, 0.92) && (r + c) % 3 === 0) scl += g.t('.', x - CW / 2, y + 4, FS, '#3E335C');
  }
  // íris: anéis «O» (quantos = commits de hoje), pupila «@»
  let iris = `<circle cx="${ECX}" cy="${ECY}" r="${RI + 3}" fill="${C.bg}"/>`;
  const ringsR = [0.95, 0.74, 0.53, 0.32].slice(0, Math.ceil(D.rings * 4 / 6));
  for (let r = -10; r <= 10; r++) for (let c = -14; c <= 14; c++) {
    const x = ECX + c * CW, y = ECY + r * LH, d = Math.hypot(x - ECX, y - ECY) / RI;
    if (d > 1.02) continue;
    let ch = null, col = C.mid;
    if (d < 0.13) { ch = '@'; col = C.ink; }
    else if (ringsR.some(q => Math.abs(d - q) < 0.075)) { ch = 'O'; col = C.lav; }
    else if (d < 0.95) { ch = (r + c) % 2 ? ':' : '.'; col = d < 0.5 ? '#6D59A8' : C.mid; }
    if (ch) iris += g.t(ch, x - CW / 2, y + 4, FS, col);
  }
  const [dx, dy, label] = DIRS[dir];
  // piscar aos saltos (aberto, meio, fechado) em ciclo irregular; sem commits hoje, fica meio fechado
  const dur = 13, sleepy = D.rings === 0, bl = [[0, sleepy ? 0.5 : 1]];
  for (const [t, dbl] of [[3.0, 0], [7.4, 1], [10.6, 0]]) {
    const o = sleepy ? 0.5 : 1;
    bl.push([t, 0.5], [t + 0.08, 0], [t + 0.18, 0.5], [t + 0.26, o]);
    if (dbl) bl.push([t + 0.42, 0.5], [t + 0.5, 0], [t + 0.6, 0.5], [t + 0.68, o]);
  }
  bl.push([dur, sleepy ? 0.5 : 1]);
  const disc = ' calcMode="discrete"';
  const dAnim = kfAnim('d', dur, bl, k => almPath(Math.max(k[1], 0.001)), disc);
  const vis = st => kfAnim('opacity', dur, bl, k => +(k[1] === st), disc);
  const gaze = dir === 'c'
    ? `<animateTransform attributeName="transform" type="translate" dur="11s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;.18;.36;.5;.68;.84" values="0 0;${-4 * CW} 0;${4 * CW} ${-LH};${2 * CW} ${LH};${-3 * CW} ${-LH};0 0"/>` : '';
  const body = `<defs><clipPath id="ec"><path d="${almPath(1)}">${dAnim}</path></clipPath></defs>
<g clip-path="url(#ec)">${scl}<g transform="translate(${dx * CW} ${dy * LH})"><g>${gaze}${iris}</g></g></g>
<g>${vis(1)}${outline(1)}</g><g opacity="0">${vis(0.5)}${outline(0.5)}</g><g opacity="0">${vis(0)}${closed}</g>`;
  const foot = g.t(dir === 'c' ? 'gaze: wandering' : `gaze: ${label}`, 22, PH - 54, 13, C.lav) + g.t(`rings lit: ${D.rings}/6 (today ${D.today})`, 22, PH - 32, 12, C.dim);
  const kanji = `<path d="${tp(F.jp, '輪廻眼', PW - 22, 76, 26, 'end', 2)}" fill="${C.lav}"/>` + g.t('RINNEGAN', 22, 72, 13, C.mid);
  return `<svg ${NS} width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Rinnegan drawn in characters, ${D.rings} of 6 rings lit by today's ${D.today} contributions">
<title>rinnegan.ascii</title><defs>${g.defs()}</defs>${head}${kanji}${body}${foot}</svg>`;
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
