# Design: Atualizacao automatica do app Android

## Objetivo

O aplicativo instalado deve acompanhar atualizacoes publicadas na branch `master` sem exigir reinstalacao manual sempre que o admin/site mudar. Quando houver mudanca de binario Android, a atualizacao deve seguir o modelo da Google Play Store.

## Decisao

O app Android passa a carregar o admin publicado em `https://hellen-designer-admin.vercel.app` pelo WebView do Capacitor. Assim, alteracoes de front-end publicadas no admin entram no app instalado assim que a Vercel publica a nova versao.

Para atualizacoes de binario fora da Play Store, o canal atual e Firebase App Distribution:

- o GitHub Actions gera APK e AAB a cada push relevante na `master`;
- quando os secrets do Firebase estiverem configurados, o workflow envia o APK assinado para Firebase App Distribution;
- testers recebem email/notificacao e instalam a nova build pelo fluxo do Firebase App Tester;
- o APK e sempre assinado com a mesma chave para permitir atualizacao sobre a instalacao anterior.

Para Play Store no futuro:

- o AAB e o pacote usado pela Play Store;
- quando `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` estiver configurado, o workflow envia o AAB para a faixa `internal` com prioridade de in-app update `5`;
- usuarias instaladas pela Play Store recebem updates conforme as preferencias de auto-update do dispositivo;
- o app usa Google Play In-App Updates para iniciar um fluxo imediato quando a Play Store indicar que existe versao nova disponivel;
- o app mantem uma tela local de erro para falha de conexao com o admin online.

## Limites

APK instalado manualmente nao consegue se atualizar sozinho de forma silenciosa como a Play Store. Android exige mesmo `applicationId`, mesma assinatura e `versionCode` maior, e o usuario ou uma loja autorizada precisa aceitar/gerenciar a atualizacao. Portanto, distribuicao manual continua exigindo reinstalacao ou confirmacao de instalacao.

Firebase App Distribution reduz o trabalho manual, mas ainda depende da confirmacao da tester para instalar a nova versao.

O prompt de In-App Updates tambem depende de instalacao via Google Play e de uma versao nova estar disponivel para o usuario na faixa da Play Store.

## Requisitos externos

- App Android criado no Firebase com package `br.com.hellendesigner.app`.
- Firebase App Distribution API habilitada.
- Service account com permissao de Firebase App Distribution Admin.
- Secrets `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_ANDROID_APP_ID` e pelo menos um destino: `FIREBASE_TESTER_GROUPS` ou `FIREBASE_TESTERS`.
- Secrets de assinatura Android ja existentes devem continuar configurados.
- Para Play Store no futuro: app criado no Google Play Console, primeiro AAB enviado se necessario, secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` e permissao da service account para publicar.

## Verificacao

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run mobile:sync`
- build Android release no GitHub Actions com JDK 21
