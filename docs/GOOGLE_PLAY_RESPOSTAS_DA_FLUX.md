# Sol: páginas públicas no ar e respostas da Flux (Google Play)

Resposta ao pacote `Sol_Paginas_para_a_Fluxv2` (briefing `00_LEIA-ME_Flux`, requisitos RA-WEB e perguntas PF-01 a PF-50). Data: 25/11/2026. App `1f89097`+ / servidor `eb1ac68`+.

## 1. O que está no ar

| Página | Endereço que funciona hoje | Situação |
|---|---|---|
| Política de Privacidade | https://painel.tripsol.com.br/sol/privacidade | Texto final 1.0, WhatsApp preenchido |
| Termos de Uso | https://painel.tripsol.com.br/sol/termos | Texto final 1.0, WhatsApp preenchido |
| Suporte e contatos | https://painel.tripsol.com.br/sol/suporte | Texto final 1.0, **sem o horário de atendimento** (falta informar) |
| Excluir conta | https://painel.tripsol.com.br/sol/excluir-conta | Texto final 1.0 e **formulário funcionando** |

Conferido: abrem sem login, em https, HTML comum, no celular e no computador; nome do app e desenvolvedor no topo; razão social, CNPJ, data e versão no rodapé; os quatro rodapés se ligam; nenhuma chamada a serviço de fora (sem anúncio nem Analytics); nenhum `{{...}}` sobrando.

**Endereço `tripsol.com.br/sol/...` ainda não.** O site `www.tripsol.com.br` é outro projeto na Vercel, e a Flux não tem o código nem o acesso dele neste servidor. Para os endereços oficiais funcionarem, quem cuida desse projeto acrescenta no `vercel.json` dele, antes da regra geral:

```json
{ "source": "/sol/:pagina(privacidade|termos|suporte|excluir-conta)", "destination": "https://painel.tripsol.com.br/sol/:pagina" }
```

Com isso `tripsol.com.br/sol/privacidade` mostra a mesma página, sem redirecionar. O formulário de exclusão já está preparado para rodar nos dois endereços. **Até lá, não cadastrar `tripsol.com.br/sol/...` no Play Console** (hoje esse endereço abre a página inicial do site, não a política). Dá para cadastrar o endereço `painel.tripsol.com.br/sol/...`, que é estável, mas trocar depois exige avisar o Google.

## 2. Exclusão de conta: como ficou

- **No app** (Perfil → Excluir minha conta) e **na página pública**: os dois registram o mesmo pedido.
- **7 dias de espera.** Entrar na conta nesse período cancela o pedido (e o Início avisa). A sessão que estava aberta antes do pedido deixa de valer, então a pessoa precisa entrar de novo para continuar usando.
- **Execução:** de hora em hora o servidor apaga as contas cuja espera terminou. Se falhar, tenta de novo na hora seguinte e registra erro quando passa de 13 dias. O registro do pedido fica sem telefone (data, origem, resultado).
- **Resumo antes de confirmar:** o que é apagado, o que é mantido e, se houver Guia paga, o aviso com a data.
- **Confirmação:** tela com as datas (espera e conclusão) e mensagem no WhatsApp.
- **Proteção:** 20 pedidos de código por hora por endereço; 5 códigos errados bloqueiam o número por 5 horas (RA-CAD-03, que também passou a valer para entrar no app); o passe da página não serve como sessão do app.
- **Conta de teste das lojas:** o revisor vê "pedido registrado", mas a conta nunca é apagada.

**Diferença em relação ao briefing (seção 3):** o código **não é enviado para um número digitado**. A pessoa toca em "Pedir o código pelo WhatsApp", o WhatsApp abre com uma mensagem pronta e a Sol responde com o código. É o mesmo login do app. Motivo: a Sol só consegue mandar mensagem para quem falou com ela nas últimas 24 horas (regra do WhatsApp); para mandar primeiro seria preciso um modelo de mensagem aprovado pela Meta, que não existe. Vantagem: só o dono do número consegue pedir, e a página nunca revela se um número tem conta.

## 3. Mudanças que fiz nos textos (para o David aprovar)

Só onde o texto mandava a pessoa fazer algo que não existe. Todo o resto está igual ao recebido.

| Página | Texto recebido | Texto publicado |
|---|---|---|
| Excluir conta, "Como pedir" 1 | "Informe o número de WhatsApp cadastrado na Sol." | "Toque em Pedir o código pelo WhatsApp, no fim desta página. O WhatsApp abre com uma mensagem pronta para a Sol: envie do número cadastrado." |
| Excluir conta, "Como pedir" 2 | "Digite o código de 6 dígitos que enviamos pelo WhatsApp (ou por SMS, se você pedir)." | "A Sol responde com um código de 6 dígitos. Digite o código nesta página." |
| Excluir conta, formulário | Campo de telefone, "Enviar código pelo WhatsApp", "Receber por SMS" | Botão do WhatsApp, campo do código, resumo e confirmação (sem SMS) |
| Suporte, contato | "Atendimento {{HORARIO_ATENDIMENTO}}." | Frase retirada até o horário ser informado |
| Suporte, "Como entro no app?" | "Informe o número de WhatsApp e digite o código de 6 dígitos que enviamos." | "Toque em 'Entrar com meu WhatsApp'. O WhatsApp abre com uma mensagem pronta para a Sol: envie e digite no app o código de 6 dígitos que ela responde." |
| Suporte, "Não recebi o código." | "Espere 1 minuto e toque em 'Receber o código por SMS'." | "Confira se a mensagem para a Sol foi enviada pelo WhatsApp e espere 1 minuto." |
| Privacidade (só estilo) | Tabelas sem estilo | Tabelas com borda, ajustadas para caber no celular |

`{{WHATSAPP_SOL}}` foi preenchido com o número que o app já usa para falar com a Sol (final 1245). Se o número oficial de suporte for outro, é só avisar.

## 4. Onde o texto promete e o app ainda não faz

A política precisa bater com o app (RA-DIA-09). Estes pontos estão **publicados como vieram**, mas hoje não são verdade no app. Para cada um, ou o app muda, ou o texto muda.

| # | O texto diz | O app faz hoje | Peso |
|---|---|---|---|
| 1 | Pagamento "pelo Google Play ou por Pix"; assinaturas canceladas no Google Play | **Só Pix (AbacatePay).** Não há Google Play Billing nem assinatura | **Bloqueia a publicação** (ver PF-42) |
| 2 | Perfil → Privacidade → "Apagar meus dados" (apagar só uma parte) | **Não existe.** Dá para apagar foto por foto no Álbum; o resto não | Alto: três páginas citam |
| 3 | Código por SMS | Não existe SMS, só WhatsApp | Médio (termos, privacidade §3, RA-CAD-02) |
| 4 | Firebase Crashlytics, relatórios "sem dados pessoais" e chave "Enviar relatórios de falhas" | Não há Crashlytics. Os erros vão para o **servidor da própria Sol**, **com o telefone da conta**, e não há chave para desligar | Alto: a declaração de Segurança dos dados fala em Crashlytics |
| 5 | Coleta de e-mail e, para compra, CPF | O app **não pede e-mail nem CPF** | Baixo (texto declara a mais) |
| 6 | Contatos de emergência guardados pela Sol, "avisados do cadastro e podem recusar" | Contatos ficam **só no aparelho**; ninguém é avisado do cadastro | Médio |
| 7 | SOS avisa os contatos "pelo WhatsApp (e por SMS quando não há internet)" | O SOS abre a mensagem pronta no WhatsApp ou no SMS **do próprio celular**, para a pessoa enviar. O servidor não envia nada | Médio (texto sensível) |
| 8 | Registros de acionamento do SOS guardados 5 anos | Não há registro de SOS no servidor | Médio |
| 9 | Registros de acesso (IP, data e hora) por 6 meses | Registros ficam **30 dias** (erros 90) e nem todo acesso é gravado | Médio (Marco Civil) |
| 10 | Roteiros e uso da Guia anonimizados por 10 anos após a exclusão | A exclusão **apaga** roteiros e conversas (não anonimiza) | Baixo ("até 10 anos" comporta apagar) |
| 11 | Compras "separadas do seu perfil" | O registro de pagamento continua com o **telefone** | Médio |
| 12 | "Você pode denunciar outro usuário ou conteúdo dentro do app" | Não há botão de denunciar. Na v1 também não há conteúdo de um usuário visto por outro, fora o link de viagem compartilhado | Médio (declaração do Play, PF-29) |
| 13 | Localização "quando você permite", sem falar de segundo plano | O app Android pede localização **em segundo plano** ("o tempo todo") para o acompanhamento da viagem | Alto: o Google confere (RA-WEB-13) |
| 14 | Adolescentes: localização só com contatos do responsável, privacidade mais protetora por padrão | Existe a etapa "menor" no cadastro; essas duas garantias não estão implementadas | Médio |
| 15 | Mensagem final quando a exclusão termina | Só chega se a pessoa falou com a Sol nas últimas 24 h (regra do WhatsApp) | Baixo |
| 16 | Nome do app "Sol: Sua viagem inteligente" | No Play Console o app está como "Sol - Guia de Viagens"; o ícone instalado diz "Sol" | Alto: o nome da página tem de ser igual ao da loja |

Fora da lista, mas o Google pergunta: o app também envia dados a **serviços que a política cobre só de forma genérica** (seção 5, PF-22).

## 5. Respostas às perguntas técnicas

**A. Conta de teste do revisor**
- **PF-01.** Sim. Existe um número de teste em produção, com conta pronta. O número e o código ficam no servidor (`REVISOR_PHONE`, `REVISOR_CODE`); passo por canal reservado, não por este arquivo.
- **PF-02.** Sim: código fixo, sem WhatsApp nem SMS, funciona a qualquer hora e de qualquer país. Caminho: "Entrar com meu WhatsApp" → "Receber o código pelo meu número" → digita o número e o código.
- **PF-03.** **Ainda não.** Conferido em 25/11: a conta de teste existe, mas está vazia (sem roteiro e sem Guia). Antes de mandar para revisão a Flux deixa nela um roteiro pronto e a Guia ligada (sem prazo). Álbum pago não existe na v1.
- **PF-04.** O SOS não envia nada pelo servidor (abre o WhatsApp do aparelho), então não há disparo real pela Sol. Cobrança: só acontece se o revisor pagar um Pix. A conta de teste não é apagada pelo pedido de exclusão.
- **PF-05.** Escrevo o passo a passo (português e inglês) quando o fluxo de localização em segundo plano estiver conferido em aparelho.

**B. Build e assinatura**
- **PF-06.** `br.com.tripsol.sol`.
- **PF-07.** Sim, Play App Signing (chave do app com o Google). A chave de envio fica com a Flux, fora do repositório.
- **PF-08.** Enviado ao teste interno: versão 1.0, código 1. Pronto para envio: 1.1, código 2. Regra: o código sobe 1 a cada envio.
- **PF-09.** Alvo 36 (Android 16), mínimo 24 (Android 7).
- **PF-10.** **Não é Flutter.** É Capacitor 7 (o mesmo app web empacotado), decisão de 31/10. Comando: `./gradlew bundleRelease`.
- **PF-11.** Já temos acesso; o primeiro envio foi feito em 20/11 pela conta do Abel.
- **PF-12.** Não há ofuscação (sem mapping.txt) nem código nativo próprio com símbolos. O aviso do Play sobre isso é só informativo.

**C. Permissões**
- **PF-13.** `INTERNET`; `ACCESS_COARSE_LOCATION` e `ACCESS_FINE_LOCATION` (o que há perto, roteiro, SOS); `ACCESS_BACKGROUND_LOCATION` (acompanhar a viagem com o app fechado); `FOREGROUND_SERVICE` e `FOREGROUND_SERVICE_LOCATION` (serviço que mantém a localização ligada, com notificação fixa); `POST_NOTIFICATIONS` (essa notificação).
- **PF-14.** Sim, usa. Função: "Localização durante a viagem" (acompanhar o trajeto e avisar o que há por perto). A pessoa vê uma tela do app explicando, aceita, e só então o Android pergunta. **Ainda não testado em aparelho real**; o vídeo para o Google depende disso.
- **PF-15.** Sim, tipo `location` (biblioteca `@capacitor-community/background-geolocation`).
- **PF-16.** Não lê nem envia SMS. O SOS abre o aplicativo de SMS do celular com a mensagem pronta (sem permissão).
- **PF-17.** Câmera e arquivos: só pelo seletor do sistema ao mandar foto (sem permissão no manifesto). Microfone: gravação de áudio na conversa, pelo navegador interno. Contatos e calendário: não. Notificações: sim.
- **PF-18.** Mostra 190, 192, 193 e 199 como links que abrem o discador. Não liga sozinho.
- **PF-19.** Não declara `AD_ID`.
- **PF-20.** Sessão do app (token de 30 dias) guardada no aparelho. No PWA, a inscrição de notificação do navegador fica no servidor até a pessoa desligar ou excluir a conta. Não há identificador de publicidade.

**D. Bibliotecas e dados enviados**
- **PF-21.** Capacitor 7.6 (core, android, splash-screen), background-geolocation 1.3, play-services-location 21.0.1, Supabase JS 2.95, Leaflet e MapLibre (mapas), jsPDF, qrcode. Lista completa no `package.json` do repositório.
- **PF-22.** Do servidor: **Google Gemini** (texto das conversas e do pedido de roteiro; EUA), **OpenAI** (a foto enviada, para o comentário da Guia; EUA), **Meta WhatsApp** (mensagens e número), **Google Places/Maps** (nome de lugares e coordenadas), **AbacatePay** (valor e referência do Pix; Brasil), **Pexels** (nome do destino), **Open-Meteo e INMET** (coordenadas da cidade), **Supabase** (banco e arquivos) e **Vercel** (site). Do aparelho, direto: **OpenStreetMap/Nominatim e OSRM** (coordenadas, para endereço e rota), **OpenFreeMap** (mapa), **Open-Meteo** (coordenadas, previsão), **Wikimedia** (nome do lugar, para foto). No PWA há ainda o botão de relatar erro, que envia texto e imagem para a Central de Bugs (ferramenta da Flux); no app Android ele não aparece.
- **PF-23.** Nenhum SDK de anúncio, atribuição ou Analytics.
- **PF-24.** Crashlytics **não está instalado**. Ver item 4 da seção 4.
- **PF-25.** Android vitals é do próprio Play; sem mapeamento porque não há ofuscação.
- **PF-26.** Tudo em HTTPS. Sem exceção de texto puro.
- **PF-27.** O token fica no armazenamento do app (isolado pelo sistema, `allowBackup` desligado), **sem criptografia própria**. Fotos e mensagens ficam no servidor.

**E. Interações entre usuários**
- **PF-28.** Bloquear: não existe. "Não" está certo.
- **PF-29.** Denunciar: **não existe**. A declaração "Sim" precisa virar "Não", ou o botão precisa ser feito.
- **PF-30.** Moderação: não. "Não" está certo.
- **PF-31.** Na v1 um usuário não conversa com outro. O único conteúdo que sai é o link de uma viagem (fotos), enviado por quem compartilha.
- **PF-32.** Não entre usuários do app. No SOS, a localização vai na mensagem que a própria pessoa envia aos seus contatos pelo WhatsApp ou SMS.
- **PF-33.** Fotos e comentários da Guia aparecem para quem recebe o link da viagem (7 dias, pode ser desligado).
- **PF-34.** Sim, há conteúdo de IA (roteiros e Guia). Não há filtro próprio além do do provedor; há avaliação de roteiro e de parada, mas não um "reportar resposta" na conversa.

**F. Exclusão e privacidade**
- **PF-35.** Sim, e agora com 7 dias de espera (seção 2).
- **PF-36.** A rotina apaga banco e arquivos. Não alcança: cópias de segurança do Supabase (prazo a confirmar no plano contratado) e o que já foi enviado a provedores de IA e à Meta.
- **PF-37.** Não. Hoje são 30 dias (seção 4, item 9).
- **PF-38.** Não. O SOS não passa pelo servidor.
- **PF-39.** A Flux fez (seção 1). O login por WhatsApp e código foi reaproveitado.
- **PF-40.** `www.tripsol.com.br` está na Vercel, em projeto que a Flux não acessa deste servidor. Falta saber de quem é a conta.
- **PF-41.** Decisão do Abel.

**G. Compras**
- **PF-42.** **Não usa Google Play Billing.** Conferido na regra do Google em 25/11: app do Play que cobra por recurso digital dentro do app **precisa** usar a cobrança do Google; no Brasil existe o programa de "escolha do usuário", em que o Pix pode aparecer **ao lado** da cobrança do Google, mas a página do programa não prevê só o Pix. Do jeito que está, a versão de produção tende a ser recusada.
- **PF-43.** Não há inscrição no programa. Quem pede é o dono da conta do Play.
- **PF-44.** Não há IDs de produto do Google. No servidor os tipos são `roteiro`, `guia_dia` e `guia_mes`. Não existe assinatura nem produto de álbum.
- **PF-45.** Não se aplica ainda.
- **PF-46.** Não há reembolso automático. Hoje é manual.

**H. Testes e publicação**
- **PF-47.** Já estamos no teste interno (lista "Testadores Iniciais", 3 pessoas).
- **PF-48.** Primeiro build assinado: 20/11. Build "com tudo desta lista": depende das decisões da seção 6.
- **PF-49.** iPhone: só o PWA. Não há build para a App Store.
- **PF-50.** Não há ambiente separado. O revisor usa produção com a conta de teste.

## 6. O que preciso de volta

1. **Horário de atendimento** do WhatsApp (para a página de Suporte).
2. **Aprovar ou corrigir** as mudanças de texto da seção 3.
3. **Quem cuida de `www.tripsol.com.br`**, para pôr a regra da seção 1.
4. **Pagamento no Android (item 1 da seção 4):** integrar a cobrança do Google, ou tirar a venda de dentro do app Android. Sem isso a produção não passa.
5. Para cada item da seção 4: muda o app ou muda o texto. Sugestão de ordem: 16 (nome), 13 (segundo plano na política), 2 (Apagar meus dados), 4 (relatórios de erro), 12 (denunciar), 9 (registros de acesso).
6. **Nome do app** igual nas páginas e na loja.
