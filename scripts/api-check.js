// Teste da função do Vercel sem o Vercel: req/res falsos.
//   node scripts/api-check.js                  -> recurso ao data.json (sem token e com token inválido)
//   PROFILE_TOKEN=... node scripts/api-check.js -> também a recolha ao vivo
const assert = require('assert');
const { svgOk, semNomes } = require('./check');
const { contribuicoes } = require('./fetch-data');

const TOKEN = process.env.PROFILE_TOKEN;
function chamar(nome) {
  const handler = require('../api/[nome].js');
  const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b; } };
  return handler({ query: { nome } }, res).then(() => res);
}

(async () => {
  for (const [modo, tk] of [['sem token', ''], ['invalido', 'ghp_invalido'], ['vivo', TOKEN]]) {
    if (!tk && modo === 'vivo') { console.log('sem PROFILE_TOKEN: salto o teste ao vivo'); break; }
    process.env.PROFILE_TOKEN = tk;
    delete require.cache[require.resolve('../api/[nome].js')]; // instância nova = cache vazia
    for (const nome of ['eye', 'neofetch', 'calendar', 'stack']) {
      const t = Date.now();
      const res = await chamar(nome);
      assert.strictEqual(res.statusCode, 200, nome);
      assert.strictEqual(res.headers['content-type'], 'image/svg+xml');
      assert.strictEqual(res.headers['cache-control'], 'public, max-age=60, s-maxage=120, stale-while-revalidate=600');
      svgOk(nome, res.body);
      if (TOKEN) assert(!res.body.includes(TOKEN), 'token no SVG');
      console.log(`${modo.padEnd(9)} ${nome.padEnd(9)} ${(res.body.length / 1024).toFixed(1)} KB ${Date.now() - t} ms`);
    }
  }
  const r404 = await chamar('__proto__');
  assert.strictEqual(r404.statusCode, 404);
  if (TOKEN) semNomes(await contribuicoes(TOKEN));
  console.log('api ok');
})().catch(e => { console.error(e.message); process.exit(1); });
