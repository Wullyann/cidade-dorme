# Cidade Dorme

Jogo online de dedução para o 8º A. Implementação funcional com servidor autoritativo, três interfaces e persistência. Não há jogadores fictícios no produto.

## Abrir no computador

Requer Node.js **24**, com a atualização de segurança mais recente da série. Não há dependências externas nem etapa de instalação.

1. Abra esta pasta no terminal.
2. Execute `node server.mjs` ou abra `iniciar.cmd` no Windows.
3. Acesse http://localhost:3000.
4. Abra “Sou professor”, crie uma sala, ajuste e **salve** as regras.
5. Guarde a chave de recuperação exibida no painel. Ela permite recuperar o professor em outro navegador.
6. Compartilhe o link dos alunos; abra “Telão” em outra aba ou no projetor.
7. Aguarde os alunos entrarem e inicie a partida.

O endereço localhost serve apenas ao próprio computador. Para computadores diferentes na mesma rede, use o IP do computador servidor na porta 3000, se a rede e o firewall permitirem. Para acesso pela internet, publique conforme abaixo. Não é necessário abrir portas do roteador na opção Render.

Alunos entram sem conta. Ao atualizar a página ou cair a conexão, retornam pelo mesmo navegador e endereço da sala. Não use navegação anônima se precisar manter a sessão depois de fechar a janela. Não compartilhe um mesmo perfil do navegador entre dois alunos. A chave do professor nunca aparece no link dos alunos.

## Publicar na internet com Render

Esta entrega não foi publicada. O ambiente conectado oferece hospedagem Sites baseada em Workers; esta aplicação foi feita para um processo Node.js contínuo com disco SQLite. Nenhum serviço Node com disco e conta de implantação foi configurado nesta sessão.

O arquivo `render.yaml` prepara um serviço Node, verificação de saúde e disco persistente de 1 GB. O plano configurado é `starter`; confira o custo apresentado pela plataforma antes de contratar. A hospedagem precisa continuar executando durante a aula.

1. Coloque **o conteúdo desta pasta** na raiz de um repositório Git seu. Não envie `data/`, `.qa/`, chaves ou arquivos `.env`.
2. No Render, conecte esse repositório e escolha **New → Blueprint** para usar `render.yaml`.
3. Quando solicitado, defina `TEACHER_KEY`: uma senha longa que só o professor conhece. É a chave para criar novas salas; cada sala também terá sua própria chave de recuperação.
4. Verifique o serviço e o disco apresentados e confirme a implantação na plataforma.
5. Aguarde a verificação de `/health` e abra a URL HTTPS fornecida pelo Render.
6. Crie uma sala pela URL HTTPS e compartilhe o link gerado com os alunos.

Se publicar esta pasta como subdiretório de outro repositório, informe esse caminho como Root Directory e ajuste o caminho do Blueprint.

Configuração manual equivalente: runtime Node 24; build `node --test`; start `node server.mjs`; `NODE_ENV=production`; `DATA_DIR=/var/data`; `TEACHER_KEY` definida; disco montado em `/var/data`; health check `/health`. `PORT` é fornecida pela hospedagem.

Use **uma instância**. Um banco SQLite local não pode ser compartilhado entre réplicas independentes. O disco precisa ser persistente: o sistema de arquivos padrão da hospedagem é temporário. O cookie em produção exige HTTPS. O acesso dos alunos é pelo link/código do jogo, sem login no provedor.

Referências oficiais consultadas em 23/10/2026:
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/disks
- https://render.com/docs/blueprint-spec
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html

## Alternativa: Docker em servidor próprio

```sh
docker build -t cidade-dorme .
docker volume create cidade-dados
docker run --name cidade-dorme --restart unless-stopped -p 3000:3000 --env-file /caminho/seguro/cidade.env -v cidade-dados:/data cidade-dorme
```

Crie o arquivo de ambiente fora do repositório com `TEACHER_KEY=uma-senha-longa`. O Dockerfile já define `NODE_ENV=production` e `DATA_DIR=/data`. Coloque o serviço atrás de HTTPS (Caddy, Nginx ou proxy da hospedagem). Preserve o cabeçalho Host e desative buffering da rota `/api/rooms/*/events`. Conexões SSE recebem heartbeat a cada 15 segundos; configure o proxy para aceitar conexões persistentes. A imagem usa a série oficial `node:24-bookworm-slim`.

## O que está implementado

- Professor: criação protegida por chave em produção, configuração, link/código, recuperação de acesso, remoção de entradas no lobby, sorteio, pausa, retomada, avanço, encerramento, papéis, ações secretas, progresso dos desafios e relatório JSON.
- Alunos: entrada sem conta, reconexão, papel privado, aliados de assassinos e detetives, habilidades, desafios, votação, causas privadas da própria morte e resultado.
- Telão: fases, relógio, participantes, presos, mortes, votação e vitória; sem ações ou papéis secretos.
- Servidor: sorteio criptográfico, estado persistido antes de transmitir, validação de fase e prazo, impedimento de ações/votos repetidos e recuperação após reinício.
- Desafios: 16 geradores/modelos em 10 categorias; números e símbolos variam. As tarefas de uma pessoa na mesma noite usam categorias diferentes. Respostas e tentativas são verificadas no servidor. Os modelos fixos podem reaparecer em noites posteriores; não é um banco curricular ilimitado.

## Decisões de regras

1. Primeira noite: sem detetives. Nas seguintes, cada detetive tem cronômetro individual, na ordem de entrada na sala. Se estiver morto, preso ou suspenso, seu turno é pulado. Um prisioneiro pendente é libertado quando não há possibilidade de decisão do detetive.
2. O detetive tem até o fim de seu cronômetro para decidir e agir. Libertar não reinicia o tempo. Executar encerra o turno. Prender ou investigar também encerra o turno e libera o próximo detetive imediatamente. Prisões têm efeito imediato.
3. Anjos e assassinos agem simultaneamente dentro da respectiva fase, com uma confirmação individual por noite. As fases duram o tempo configurado mesmo sem personagens ativos, deixando tempo para desafios; o professor pode avançá-las.
4. A proibição opcional de proteção repetida vale apenas para noites consecutivas. Uma noite sem proteger permite voltar ao mesmo alvo depois.
5. Assassinatos são resolvidos primeiro, com alvos repetidos deduplicados. Depois, sorteia-se uma pessoa entre os sobreviventes para a única verificação de morte natural. Portanto, uma vítima de assassinato não recebe uma segunda causa de morte.
6. A causa é privada. Mortes e execuções são anunciadas sem causa. A identidade do detetive que prende não é anunciada.
7. Risco individual: `base × (1 - redução/100) ^ tarefas_corretas`. Até três tarefas e redução de 25% por tarefa são os padrões. Presos podem realizar desafios. Mortos não podem. As tarefas só ficam disponíveis nas fases noturnas de habilidades.
8. Memória: o servidor só envia a sequência quando o aluno pede para vê-la, por sete segundos. A resposta só é aceita depois. Como em qualquer jogo no navegador, não é possível impedir que alguém fotografe ou registre os números exibidos; a resposta esperada nunca é enviada no estado dos desafios.
9. Voto é definitivo após confirmar. Cada vivo livre pode votar em qualquer vivo livre, inclusive em si, ou abster-se. Pluralidade elimina; empate ou nenhum voto não elimina; não há segundo turno.
10. Joker tem prioridade ao ser eliminado pela votação. Cidade vence quando não restam assassinos vivos. Assassinos só vencem automaticamente quando todos os vivos são assassinos. Nenhuma igualdade numérica basta. O professor pode definir um resultado manualmente.
11. Regras são configuradas e salvas no lobby. Para mudar a composição depois do início, crie outra partida. Remoção de participantes só existe no lobby, para evitar alterar as regras em andamento.
12. Se o servidor reiniciar, a partida é recuperada **pausada**, com o tempo restante preservado ou zero se já expirado. O professor precisa retomar. Isso evita que várias noites ocorram sem os alunos durante uma indisponibilidade.

## Testes e manutenção

```sh
node --test
```

Inclui regras, cronômetros, prisão, execuções, proteção, morte natural, desafios, voto, condições de vitória, autenticação, isolamento de segredos, concorrência com 35 conexões SSE, reconexão, persistência e timer real sem navegadores conectados.

`qa/browser.mjs` é uma conferência adicional de interface com Chrome instalado no caminho padrão do Windows. Execute da pasta pai com `node cidade-dorme/qa/browser.mjs`. Abre navegador sem janela, cinco sessões isoladas e salva capturas em `.qa/`. Não é requisito da aplicação nem da implantação.

Veja `VALIDACAO.md` para os resultados desta entrega. Os testes não substituem a primeira aula piloto nos netbooks e na rede do colégio.

Arquivos principais:
- `engine.mjs`: regras e projeções de estado por tipo de participante.
- `server.mjs`: HTTP, sessões, SQLite, SSE e cronômetros.
- `challenges.mjs`: banco parametrizado de minitarefas.
- `public/`: interfaces sem bibliotecas externas, fontes remotas ou imagens decorativas.
- `test/`: testes automatizados; não cria alunos fictícios no site real.

O servidor funciona em um processo, sem dependências de pacotes: Node.js 24 oferece HTTP, criptografia, testes e SQLite nativos. SSE transmite as mudanças às telas; ações usam POST. Cada evento inclui horário do servidor e prazo absoluto. O relógio visual não decide quando uma fase termina. As transações lógicas são síncronas: toda alteração é validada, gravada no SQLite e transmitida; uma falha restaura o estado anterior em memória.

As sessões usam cookies HttpOnly/SameSite, tokens aleatórios e somente o hash fica no banco. Em produção, os cookies também são Secure. Respostas de API não são armazenadas em cache. A API bloqueia origem diferente e recebe somente JSON nas alterações. Há limite de tamanho de requisição, tentativas de desafios e volume de requisições. O banco e relatórios são secretos e devem ficar restritos ao professor/operador.

O telão é acessível a quem conhece o código, como o lobby. Não exponha o código fora da turma. Não há chat embutido; o debate acontece em sala de aula. Não há painel para editar os enunciados pelo navegador nesta versão; o banco é ampliado no arquivo de desafios.

## Dados e recuperação

- `data/cidade.sqlite` é o arquivo principal local; `DATA_DIR` troca sua localização.
- Todas as ações aceitas são persistidas. Ao atualizar o navegador, o aluno mantém a sessão via cookie.
- Se o aluno apagar os cookies, não há recuperação por nome, pois isso permitiria assumir o personagem de outra pessoa. A versão atual não transfere sessões de aluno entre dispositivos durante a partida.
- Exporte o relatório pelo painel antes de excluir uma sala. O relatório contém papéis e eventos secretos; não compartilhe com a turma durante a partida.
- Depois da atividade, o professor pode excluir definitivamente a sala pelo painel, invalidando suas sessões.
- Para backup simples, pare o serviço e copie o diretório de dados inteiro. Não copie apenas o `.sqlite` enquanto há gravações, pois o modo WAL usa arquivos auxiliares. Em produção, configure backup apropriado do SQLite e teste a restauração antes de depender dele.
- Guarde a chave de recuperação de cada sala em local privado. Perder o cookie administrativo e essa chave exige intervenção do operador do banco.
