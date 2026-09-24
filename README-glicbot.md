# Como colocar o GlicBot pra funcionar

## Por que precisa de um servidor, se o resto do app é só front-end?

O resto do GlicHelp roda 100% no navegador (`localStorage`), o que funciona
porque não lida com nenhum segredo. O GlicBot é diferente: ele precisa de uma
chave de API pra falar com o modelo de IA, e **qualquer chave colocada em um
arquivo `.js` do front-end fica visível pra qualquer pessoa que abrir o
DevTools do navegador** — ela poderia ser copiada e usada por qualquer um às
suas custas. Por isso existe o `server/`: um proxy mínimo que guarda a chave
em segredo e é o único que fala com a NVIDIA NIM.

## Passo a passo

1. **Copie `glicbot.js` para dentro da pasta `Js/`** do projeto GlicHelp,
   substituindo o link quebrado que já existe em `glicbot.html`.

2. **Pegue uma chave de API gratuita** em https://build.nvidia.com/ (crie
   conta, gera um saldo de créditos grátis).

3. **Configure o servidor:**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # edite o .env e cole sua chave em NVIDIA_API_KEY
   npm start
   ```
   Isso sobe o proxy em `http://localhost:3001`.

4. **Abra o GlicHelp normalmente** (o `glicbot.html`) com o servidor rodando
   em paralelo. A constante `GLICBOT_API_URL` no `glicbot.js` já aponta pra
   `http://localhost:3001/api/glicbot`.

5. **Quando for hospedar de verdade:** suba o conteúdo de `server/` em
   qualquer lugar que rode Node (Render, Railway, uma VM da faculdade etc.) e
   atualize `GLICBOT_API_URL` no `glicbot.js` pra apontar pra essa URL.

## O que esta versão já faz

- Responde só com base na `BASE_CONHECIMENTO` (as 5 categorias dos chips:
  hipoglicemia, hiperglicemia, alimentação, exercício, insulina) — nível
  "esforço mínimo" do roteiro que já está no `CLAUDE.md`: sem busca vetorial,
  a base inteira vira contexto em toda pergunta.
- O modelo é instruído a admitir quando não sabe, em vez de inventar.
- Cada pergunta é logada (console no servidor, e console + `localStorage` no
  navegador) com sucesso/erro, tempo de resposta e tokens consumidos.
- CORS restrito às origens em `ALLOWED_ORIGINS`, limite de tamanho de
  pergunta e rate limiting (10 perguntas/minuto por IP) — protegem o crédito
  gratuito da NVIDIA contra uso repetido ou de fora do app.
- `.env` já entra no `.gitignore` do `server/` — a chave nunca vai pro Git.

**Se usar Live Server do VS Code (ou outra porta) para abrir o HTML**, defina
`ALLOWED_ORIGINS` no `.env` com a origem exata, ex.:
`ALLOWED_ORIGINS=http://127.0.0.1:5500`. Abrir o arquivo direto (duplo clique)
já funciona com o padrão.

## O que ainda falta (fases seguintes)

- Trocar a base fixa por busca de verdade quando o conteúdo crescer demais
  pra caber num prompt só.
- Persistir os logs em algum lugar além do `localStorage` do navegador.
- Decidir onde hospedar o `server/` em produção (e então atualizar
  `ALLOWED_ORIGINS` com o domínio real do GlicHelp).
