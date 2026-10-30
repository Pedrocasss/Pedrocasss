// Função do Vercel: /api/eye, /api/neofetch, /api/calendar, /api/stack -> SVG desenhado no momento do pedido.
// Contribuições ao vivo (1 pedido GraphQL, cache de 120 s por instância); commits e linguagens vêm do data.json
// que o Action atualiza de 15 em 15 minutos (a recolha completa demora ~1 min e não cabe num pedido HTTP).
// Se a API falhar ou não houver PROFILE_TOKEN, serve o data.json; se o desenho falhar, serve o assets/<nome>.svg.
const fs = require('fs');
const path = require('path');
const S = require('../scripts/svg');
const { contribuicoes } = require('../scripts/fetch-data');

const ROOT = path.join(__dirname, '..');
const TTL = 120e3;
const PANES = { eye: D => S.eye(D, 'c'), neofetch: S.fetchPane, calendar: S.calendar, stack: () => S.stackPane() };
const CACHE = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';
const local = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));

// data.json mais recente do repo público (o Action faz commit sem novo deploy); sem rede, o do deploy
async function base() {
  const b = local();
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${b.login}/${b.login}/main/data.json`, { signal: AbortSignal.timeout(3000) });
    return r.ok ? await r.json() : b;
  } catch { return b; }
}

let cache = { t: 0, p: null };
function dados() {
  if (cache.p && Date.now() - cache.t < TTL) return cache.p;
  const token = process.env.PROFILE_TOKEN;
  // a promessa fica em cache: pedidos simultâneos (o README pede 3 imagens de uma vez) fazem uma só recolha
  const p = base().then(b => !token ? b : contribuicoes(token)
    .then(c => ({ ...b, ...c }))
    // só a mensagem e cortada: a resposta da API nunca traz o token, mas não se arrisca a despejar objetos
    .catch(e => { console.warn('perfil: API do GitHub falhou, uso o data.json:', String(e.message).slice(0, 200)); return b; }));
  cache = { t: Date.now(), p };
  return p;
}

module.exports = async (req, res) => {
  const nome = String((req.query && req.query.nome) || '').replace(/\.svg$/, '');
  if (!Object.hasOwn(PANES, nome)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('nao existe: use eye, neofetch, calendar ou stack');
  }
  let svg;
  try {
    svg = PANES[nome](S.derive(await dados())).replace(/\n\s*/g, '\n');
  } catch (e) {
    console.warn(`perfil: desenho de ${nome} falhou, sirvo o assets/${nome}.svg:`, String(e.message).slice(0, 200));
    svg = fs.readFileSync(path.join(ROOT, 'assets', `${nome}.svg`), 'utf8');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', CACHE);
  res.end(svg);
};
