// Recolhe os números do perfil e grava data.json. Sem dependências (Node 20+, fetch nativo).
// Precisa de um token PESSOAL (classic PAT com `repo` e `read:org`) em PROFILE_TOKEN:
// o GITHUB_TOKEN do Actions só vê este repo e não conta os privados nem as organizações.
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.PROFILE_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) { console.error('falta PROFILE_TOKEN (ou GH_TOKEN)'); process.exit(1); }
const H = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'profile-generator', Accept: 'application/vnd.github+json' };

async function gql(query) {
  const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors || j));
  return j.data;
}
async function rest(url) {
  const r = await fetch(url.startsWith('http') ? url : 'https://api.github.com/' + url, { headers: H });
  return r;
}
async function paged(url) {
  const out = [];
  for (let next = url; next;) {
    const r = await rest(next);
    if (!r.ok) throw new Error(`${r.status} em ${next}`);
    out.push(...await r.json());
    next = (r.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/)?.[1];
  }
  return out;
}
// número de commits do autor no repo: com per_page=1, a última página = total
async function commitCount(full, login) {
  const r = await rest(`repos/${full}/commits?author=${login}&per_page=1`);
  if (r.status === 409 || r.status === 404) return 0; // repo vazio ou sem acesso
  if (!r.ok) throw new Error(`${r.status} em commits de ${full}`);
  const last = (r.headers.get('link') || '').match(/[?&]page=(\d+)>;\s*rel="last"/);
  return last ? +last[1] : (await r.json()).length;
}

(async () => {
  const v = await gql(`query{viewer{login createdAt followers{totalCount}
    repositories(ownerAffiliations:OWNER){totalCount}
    contributionsCollection{restrictedContributionsCount contributionCalendar{totalContributions
      weeks{contributionDays{date contributionCount}}}}}}`);
  const me = v.viewer;
  const repos = (await paged('user/repos?affiliation=owner,collaborator,organization_member&per_page=100')).filter(r => !r.fork);
  const langs = {}, worked = [];
  for (const r of repos) {
    const n = await commitCount(r.full_name, me.login);
    if (!n) continue;
    worked.push([r.full_name, n]);
    const lr = await rest(`repos/${r.full_name}/languages`);
    if (lr.ok) for (const [l, b] of Object.entries(await lr.json())) langs[l] = (langs[l] || 0) + b;
  }
  const cal = me.contributionsCollection.contributionCalendar;
  const data = {
    login: me.login,
    generatedAt: new Date().toISOString(),
    createdAt: me.createdAt,
    followers: me.followers.totalCount,
    ownRepos: me.repositories.totalCount,
    privateContributions: me.contributionsCollection.restrictedContributionsCount,
    total: cal.totalContributions,
    weeks: cal.weeks.map(w => w.contributionDays.map(d => [d.date, d.contributionCount])),
    // só contagens: os nomes dos repos privados não saem para o repo público
    workedRepos: worked.length,
    commitsAll: worked.reduce((a, w) => a + w[1], 0),
    langs,
  };
  fs.writeFileSync(path.join(__dirname, '..', 'data.json'), JSON.stringify(data));
  console.log(`ok: ${data.total} contribuições, ${data.workedRepos} repos com commits, ${Object.keys(langs).length} linguagens`);
})().catch(e => { console.error(e.message); process.exit(1); });
