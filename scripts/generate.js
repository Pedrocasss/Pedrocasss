// data.json -> assets/*.svg. Corre depois do fetch-data.js (no Action) ou à mão.
const fs = require('fs');
const path = require('path');
const S = require('./svg');

const ROOT = path.join(__dirname, '..');
const D = S.derive(JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8')));
const out = {
  'eye.svg': S.eye(D, 'c'),
  'neofetch.svg': S.fetchPane(D),
  'calendar.svg': S.calendar(D),
  'stack.svg': S.stackPane(),
  'btn-linkedin.svg': S.button('linkedin'),
  'btn-email.svg': S.button('email'),
  'astra.svg': S.astra(),
};
fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
for (const [name, svg] of Object.entries(out)) {
  fs.writeFileSync(path.join(ROOT, 'assets', name), svg.replace(/\n\s*/g, '\n'));
  console.log(name.padEnd(18), (Buffer.byteLength(svg) / 1024).toFixed(1), 'KB');
}
