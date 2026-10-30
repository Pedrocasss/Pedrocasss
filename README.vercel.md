# README com os SVG em tempo real (Vercel) — por aplicar

Troca preparada para o `README.md`, ainda **não aplicada**. Os painéis `eye`, `neofetch` e `calendar` passam a ser desenhados
pela função `api/[nome].js` no momento do pedido (contribuições com no máximo ~2–4 min de atraso, entre a cache da função
e a do camo do GitHub). O `stack` não depende de dados, mas também pode vir da função para ficar tudo num sítio.

Substituir `<projeto>` pelo nome do projeto no Vercel depois do primeiro deploy.

## Como fica

```html
<p align="center"><img src="https://<projeto>.vercel.app/api/eye" width="37%" alt="Rinnegan drawn in characters; the rings lit follow today's contributions"><img src="https://<projeto>.vercel.app/api/neofetch" width="62%" alt="neofetch: Pedro Silva, mid full-stack dev @ Doutor Energia, freelance @ POP TVDE. Builds backends, real-time systems, automations, integrations and applied AI. LogDriver coming soon. Contributions, streak and top languages updated live."></p>

<p align="center"><img src="https://<projeto>.vercel.app/api/stack" width="100%" alt="stack.yml, six paths. Backend & AI automations: JavaScript, TypeScript, Node.js, Express, Go, PHP, Laravel, C, C++, Python, Claude, Gemini. Infra: Docker, nginx, Linux, Azure, GitHub Actions, Prometheus, Grafana. Data: PostgreSQL (Neon), Redis, BullMQ, SQL. Integrations: Bitrix24 REST, WhatsApp, WebSockets, webhooks, Google Cloud Platform, Mailgun, Sweego, Twilio. Frontend: React, Vite, Tailwind, HTML, CSS, Vitest. Mobile: Kotlin, Expo."></p>

<p align="center"><img src="https://<projeto>.vercel.app/api/calendar" width="100%" alt="3D contribution calendar of the last 12 months, updated live"></p>
```

Os botões (`btn-linkedin.svg`, `btn-email.svg`) e o `astra.svg` ficam como estão, em `assets/`: são estáticos.

## Manter os `assets/` como reserva

- **Não apagar** `assets/eye.svg`, `neofetch.svg`, `calendar.svg` e `stack.svg`, nem desligar o Action de 15 em 15 minutos.
  São a reserva: a função serve-os se o desenho falhar, e voltar atrás é só repor as linhas `assets/<nome>.svg` no README.
- Atenção ao `scripts/check.js`: exige que **todos** os ficheiros de `assets/` apareçam no README. Ao aplicar a troca, ou se
  deixa uma referência a cada um (por exemplo num comentário HTML `<!-- reserva: assets/eye.svg ... -->`), ou se ajusta essa
  regra no mesmo commit. Sem isso, o Action passa a falhar no `check`.
- O Action continua a recolher os commits e as linguagens (a recolha completa demora ~1 min, não cabe num pedido HTTP);
  a função lê esse `data.json` diretamente do repo público e junta-lhe as contribuições ao vivo.
