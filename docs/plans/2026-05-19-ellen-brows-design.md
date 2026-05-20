# Design: Ellen Martins Brows

## Direcao

O produto sera um site de agendamento para uma profissional de sobrancelhas. A direcao visual e beauty editorial: fundo nude/cream, marrom espresso, terracotta, tipografia serifada elegante e composicoes com cards flutuantes. A inspiracao vem do universo de sobrancelhas premium no Instagram, sem copiar imagens, textos ou identidade visual dos perfis indicados.

## Experiencia

A primeira dobra deve vender confianca e desejo: proposta clara, CTA de agendamento, prova de metodo e imagem original do olhar. A secao de servicos organiza as opcoes com duracao e preco. O formulario coleta os dados necessarios sem exigir login para reduzir friccao.

## Arquitetura

React/Vite entrega uma SPA estatica na Vercel. Supabase fornece Auth e Postgres. O cliente usa apenas URL e anon key publicas. A protecao real fica no banco com RLS: qualquer visitante pode inserir um pedido, mas apenas clientes autenticadas veem seus proprios pedidos e admins veem tudo.

## Componentes

- Hero editorial com CTA e arte SVG original.
- Strip de prova/beneficios.
- Grid de servicos.
- Formulario de agendamento.
- Auth box para login/cadastro.
- Listagem protegida de agendamentos.

## Dados e Erros

O catalogo tenta carregar de `service_catalog` e usa fallback local se o Supabase estiver indisponivel. O formulario mostra status de sucesso/erro em `aria-live`. Se as variaveis de ambiente nao existirem, o site continua carregando e informa que o banco precisa ser configurado.

## Testes

Validar com lint, build, conferencia de segredos no git e smoke test no deploy.
