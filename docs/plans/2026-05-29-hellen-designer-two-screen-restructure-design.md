# Design: Hellen Designer Em Duas Telas

## Decisao

O projeto deixa de ser um sistema com area de cliente e passa a ter somente duas telas reais:

- `/`: landing page publica da Hellen Designer.
- `/admin`: painel privado para a Hellen gerir agenda, clientes, recebimentos, servicos, precos e fotos exibidas na landing.

A pasta e o package devem mudar de `hellen-brows` para `Hellen designer` / `hellen-designer`.

## Contexto

A base atual ja usa React, Vite, Supabase, Storage, agenda, clientes, pagamentos, produtos e administracao. Ela tambem carrega escopo antigo: area da cliente, checkout Asaas, sinal de reserva e agendamento autenticado publico. Esses fluxos nao fazem mais parte do produto.

## Abordagem Escolhida

Reestruturar a base existente, sem apagar o projeto inteiro. Isso preserva Supabase, Auth, Storage, build, lint e parte da logica admin, mas remove a experiencia publica de cliente e simplifica a superficie.

Alternativas avaliadas:

- Reescrita total: limpa mais rapido visualmente, mas aumenta risco de perder infra util de Supabase/Auth/Storage.
- Ajuste minimo: deixa codigo morto demais e mantem rotas que confundem o escopo.
- Reestrutura forte da base atual: melhor equilibrio entre velocidade, qualidade e risco.

## Arquitetura

### Landing Publica

Job: visitante vinda do Instagram entende quem e a Hellen, ve servicos/precos/fotos e chama no WhatsApp.

Conteudo:

- Marca Hellen Designer.
- Logo/assinatura e foto principal.
- WhatsApp, Instagram e endereco opcional.
- Servicos publicados, com nome, descricao curta, duracao e preco.
- Galeria de fotos/artes publicadas.
- CTA para WhatsApp com mensagem pronta.

Sem login, sem formulario de agenda e sem checkout.

### Admin Privado

Job: Hellen organiza a rotina do negocio entre atendimentos, com poucos cliques e informacao densa.

Modulos internos da tela `/admin`:

- Hoje: agenda do dia, proximos horarios, recebimentos e pendencias.
- Agenda: criar, editar, concluir, cancelar e marcar nao compareceu.
- Clientes: ficha, WhatsApp, observacoes e historico.
- Financeiro: valor cobrado, valor recebido, metodo e status.
- Landing: dados da marca, celular, Instagram, servicos/precos e fotos publicadas.

O admin continua protegido por Supabase Auth e perfil admin.

## Dados

Tabelas-alvo:

- `admin_profiles`: controle de acesso privado.
- `business_profile`: dados publicos da Hellen e canais.
- `services`: catalogo publicado na landing.
- `gallery_items`: fotos/artes da landing.
- `clients`: clientes internas.
- `appointments`: agenda operacional.
- `payments`: recebimentos por atendimento.

Leitura publica deve ser permitida apenas para `business_profile`, servicos ativos e galeria publicada. Escrita fica restrita ao admin.

## Design

Registro da landing: Brand.

Cena: cliente abre o link pelo Instagram no celular, em uma conversa de WhatsApp, procurando preco, confianca visual e um botao claro para chamar a Hellen.

Registro do admin: Product.

Cena: Hellen consulta o painel no celular ou notebook entre atendimentos, em ambiente de trabalho, precisando decidir rapidamente o que confirmar, cobrar, remarcar ou publicar.

Direcao visual:

- Fundo preto profundo.
- Dourado metalico como acento.
- Tipografia editorial para titulos da landing.
- Sans legivel e densa para o painel.
- Controles com raio baixo.
- Cards somente para itens repetidos e ferramentas reais.
- Sem area de cliente, sem tela de marketing de sistema e sem hero generico.

## Estados

Landing:

- default com dados publicados;
- vazio quando nao houver fotos ou servicos publicados;
- erro discreto se Supabase falhar, mantendo conteudo fallback;
- loading sem bloquear acesso ao WhatsApp.

Admin:

- login obrigatorio;
- sem permissao quando usuario nao for admin;
- listas vazias com acao principal;
- loading por modulo;
- erro inline em salvamentos;
- sucesso por status curto;
- estados de agenda: marcado, confirmado, concluido, nao compareceu, cancelado.

## Verificacao

- `npm run lint`
- `npm test`
- `npm run build`
- Smoke local em `/`, `/admin` e `/auth`.
- Verificacao responsiva em desktop e mobile.
- Conferir que nao ha rota publica de cliente ativa.
