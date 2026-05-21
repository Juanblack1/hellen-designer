# Design: Fotos Nos Cards De Servico

## Contexto

A selecao de servico no agendamento precisa ficar mais visual e facil de entender. A decisao aprovada foi usar upload real de fotos pelo admin, em vez de depender apenas de links externos.

## Escopo

- Trocar o seletor de servico por cards clicaveis.
- Mostrar imagem, nome, preco, duracao, categoria e descricao em cada card.
- Criar um bucket no Supabase Storage para fotos de servicos.
- Permitir que apenas admin envie, troque e remova imagens do bucket.
- Salvar o caminho da imagem em `service_catalog.image_path`.
- Usar imagem padrao visual quando o servico ainda nao tiver foto cadastrada.

## Arquitetura

- Bucket: `service-images`, publico para leitura das imagens no site.
- Escrita: restrita a usuarios autenticados que passam em `app_private.is_booking_admin()`.
- Tabela: `service_catalog` recebe `image_path text` com limite de tamanho.
- Frontend: deriva a URL publica com `supabase.storage.from('service-images').getPublicUrl(image_path)`.
- CSP: permite carregar imagens do Supabase Storage.

## Admin

- Cada servico ganha controle de arquivo `image/*`.
- Validacao no cliente: somente `jpg`, `png`, `webp` ou `avif`, ate 2 MB.
- Upload usa caminho versionado por timestamp para evitar cache antigo.
- Apos upload e update no catalogo, o card passa a mostrar a nova foto.

## Cliente

- A etapa de escolha do servico vira grid de cards.
- Card selecionado recebe borda e brilho dourado.
- O resumo do agendamento continua mostrando o servico escolhido.

## Validacao

- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- `git diff --check`
- Smoke em `/cliente`, `/admin` e `/auth?mode=sign-in`.
