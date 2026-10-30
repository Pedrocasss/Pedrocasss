// Verificação antes do commit do Action: se algo falhar, o Action para e o README fica como estava.
// svgOk() também é usada pelo teste da função do Vercel (scripts/api-check.js).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function svgOk(f, s) {
  assert(Buffer.byteLength(s) < 150 * 1024, `${f} passa dos 150 KB`);
  assert(s.startsWith('<svg') && s.trimEnd().endsWith('</svg>'), `${f} mal formado`);
  assert(!/<script|<foreignObject|href="http/i.test(s), `${f} tem algo que o GitHub corta`);
  assert(/role="img"/.test(s) && /aria-label="[^"]+"/.test(s), `${f} sem acessibilidade`);
}
// o data.json vai para o repo público: só contagens, nunca nomes de repos privados ("dono/repo")
const semNomes = data => assert(!JSON.stringify(data).includes('/'), 'data.json não pode levar nomes de repos');

module.exports = { svgOk, semNomes };

if (require.main === module) {
  const ROOT = path.join(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
  assert(data.weeks.length >= 52, 'calendário com menos de 52 semanas');
  assert(data.total > 0 && Object.keys(data.langs).length > 0, 'dados vazios (token sem acesso?)');
  semNomes(data);

  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) {
    svgOk(f, fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'));
    assert(readme.includes(`assets/${f}`), `${f} não está no README`);
  }
  console.log('check ok');
}
