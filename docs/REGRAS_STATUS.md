# App Sol · situação de cada regra

Conferência das Regras Vigentes (`/root/uploads/sol-docs/TripSol_Documentos/06_Desenvolvimento/Sol_App_Regras_Vigentes.md`, versão 1.0 de 25/10/2026) contra o que está no ar no app (PWA, painel.tripsol.com.br/app) e no bot (sol-agent).

Atualizado em 02/11/2026 · app 83c8fd2 · bot 0dde6d3.

Legenda: ✅ feito · 🟡 em parte · ⬜ falta · 🔒 depende de decisão, jurídico, pagamento ou fonte de dados de fora.

Decisão que muda uma regra: **RA-GER-06** (Flutter) foi trocada pelo dono do produto em 31/10/2026 por **PWA agora e Capacitor para as lojas**. O documento de regras precisa ser atualizado.

## Resumo

| Área | ✅ | 🟡 | ⬜ | 🔒 |
|---|---|---|---|---|
| GER · Princípios | 5 | 5 | 0 | 1 |
| CAD · Cadastro e login | 3 | 4 | 3 | 1 |
| MEN · Menores | 1 | 1 | 5 | 3 |
| IDI · Idioma e aparência | 1 | 0 | 3 | 1 |
| NAV · Navegação | 6 | 1 | 0 | 0 |
| ROT · Roteiros | 7 | 9 | 7 | 1 |
| GUI · Guia Sol | 1 | 4 | 1 | 2 |
| SOL · Conversa | 2 | 2 | 0 | 0 |
| TRA · Tradutor | 1 | 0 | 4 | 2 |
| ALE · Alertas | 0 | 0 | 9 | 1 |
| SEG · SOS | 4 | 2 | 1 | 1 |
| FOT · Álbum e fotos | 2 | 3 | 3 | 2 |
| IND · Indicação | 0 | 2 | 4 | 1 |
| PAG · Pagamentos | 0 | 0 | 0 | 6 |
| INI · Eventos, destinos e tempo | 1 | 1 | 1 | 2 |
| PRI · Privacidade | 0 | 0 | 3 | 2 |
| VER · Versão e estados | 0 | 1 | 2 | 0 |
| **Total (141)** | **34** | **35** | **46** | **26** |

Contagem feita por script sobre as linhas abaixo; as 141 regras do documento estão todas listadas.

## GER · Princípios gerais

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-GER-01 Regras iguais no app e no WhatsApp | 🟡 | Mesma conversa e limite diário somando os dois ✅. Cota semanal ainda só é mostrada, não bloqueia. |
| RA-GER-02 App só mostra; servidor decide | 🟡 | Preços, limites e cota vêm do servidor (`config.regras`). A cobrança do roteiro ainda usa os créditos antigos. |
| RA-GER-03 Valores por parâmetro, com histórico | 🟡 | Parâmetros no servidor por variável de ambiente. Falta o backoffice com histórico de alteração. |
| RA-GER-04 Conversa não libera pagamento/ativação | ✅ | Ativação só pelo servidor; sem link de pagamento configurado a conversa avisa e não ativa (só o modo teste ativa direto). |
| RA-GER-05 Permissão só na hora do uso | ✅ | Localização no cadastro com motivo; câmera e microfone só ao tocar. |
| RA-GER-06 App nativo em Flutter | 🔒 | Trocado por PWA + Capacitor (decisão de 31/10). Atualizar o documento. |
| RA-GER-07 Tom: sem travessão, 1 emoji | ✅ | Prompt e mensagens fixas revisados (bot df11018). |
| RA-GER-08 Fonte visível; sem dado, "Não há dados" | 🟡 | Tempo com "Fonte: Open-Meteo" ✅. Alertas oficiais ainda não existem. |
| RA-GER-09 Apoio informativo | ✅ | Textos de Segurança, SOS e termos. |
| RA-GER-10 Sem venda pelo medo | ✅ | Alerta de chuva não oferece a Guia. |
| RA-GER-11 95% no ar; roteiro em até 1 min | 🟡 | Roteiro pelo app medido em 57 s. Sem monitoramento de disponibilidade. |

## CAD · Cadastro, login e conta

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-CAD-01 Um número, uma conta, com código | ✅ | `login.service` (bot); conversa única com ou sem o 9. |
| RA-CAD-02 Código de 6 dígitos, 10 min; SMS depois de 1 min | 🟡 | 6 dígitos e 10 min ✅. Primeiro login começa pela mensagem da pessoa no WhatsApp (pedido do dono, 31/10). Falta SMS. **Depende da troca do webhook na Meta.** |
| RA-CAD-03 5 erros bloqueiam por 5 h | 🟡 | 5 erros invalidam o código. Falta o bloqueio de 5 h por número. |
| RA-CAD-04 "Confira seus dados" | ✅ | `/app/cadastro`, etapa 1. |
| RA-CAD-05 4 etapas + concluído | ✅ | Dados, Termos, Nascimento, Localização, Concluído. |
| RA-CAD-06 Sem aceite, sem conta; termos novos pedem novo aceite | 🟡 | Aceite registrado (`sol_consentimentos`) ✅. Falta a tela de nova versão dos termos. |
| RA-CAD-07 Sessão de 30 dias; aparelhos conectados | 🟡 | 30 dias ✅. Falta ver e encerrar aparelhos. |
| RA-CAD-08 Troca de número | ⬜ | |
| RA-CAD-09 Conta suspensa | ⬜ | Depende do backoffice. |
| RA-CAD-10 Atrito para número suspeito | ⬜ | Ainda não; depende do SMS e da consulta de linha. |
| RA-CAD-11 Fornecedor da consulta de linha | 🔒 | A definir (D-13). |

## MEN · Menores de idade

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-MEN-01 Conta restrita até o responsável | 🟡 | Menor de 18 vê "Conta restrita" com SOS (a tela Segurança abre mesmo sem concluir). Servidor recusa concluir o cadastro de menor (403). Falta o fluxo do responsável. |
| RA-MEN-02 Dados do responsável | ⬜ | |
| RA-MEN-03 ACEITO no WhatsApp e documento em 5 dias | ⬜ | |
| RA-MEN-04 Documento aceito e conferência | 🔒 | TODO-74 a 76. |
| RA-MEN-05 Compra de menor com aprovação | ⬜ | Depende de pagamentos. |
| RA-MEN-06 Menor não convida | ⬜ | |
| RA-MEN-07 Menor não envia foto para votação | ⬜ | Votação ainda não existe. |
| RA-MEN-08 Menor usa conversa traduzida | 🔒 | Sala traduzida ainda não existe; texto jurídico pendente. |
| RA-MEN-09 Data de nascimento só para idade | ✅ | `sol_cadastro.nascimento`, só para isso. |
| RA-MEN-10 ECA Digital | 🔒 | Advogado. |

## IDI · Idioma e aparência

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-IDI-01 5 idiomas (pt, en, es, ar, zh) | ⬜ | App só em português. |
| RA-IDI-02 Pílula de idioma nas boas-vindas | ⬜ | |
| RA-IDI-03 Vale o português nos termos | 🔒 | Junto com os termos traduzidos. |
| RA-IDI-04 Aparência automática, clara e escura | ⬜ | Item no Perfil marcado "Em breve". |
| RA-IDI-05 "Sua viagem inteligente", qualquer destino | ✅ | Boas-vindas e criar roteiro aceitam qualquer destino. |

## NAV · Navegação

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-NAV-01 Barra de 5 itens | ✅ | Início, Roteiros, Hoje/Criar, Guia Sol, Sol. |
| RA-NAV-02 Marcador ✓/× na Guia | ✅ | |
| RA-NAV-03 Tradutor fora da barra | ✅ | Pelo Início e pela conversa da Guia. |
| RA-NAV-04 Perfil pelo avatar | ✅ | |
| RA-NAV-05 Cartão da viagem em 4 estados | ✅ | Atual, próxima (faltam X dias), última viagem, nunca viajou. |
| RA-NAV-06 Cidade do cabeçalho | 🟡 | Localização → roteiro → cadastro ✅. Falta a tela "Escolher cidade". |
| RA-NAV-07 "Com e sem a Guia Sol" | ✅ | `/app/guia/comparar`, valores do servidor. |

## ROT · Roteiros

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-ROT-01 2 grátis por semana | ✅ | Contagem e "1 de 2 · renova domingo, 21h". Servidor recusa acima da cota (429); no modo teste e com a Guia vale o teto da Guia (30). |
| RA-ROT-02 R$ 4,90 por dia extra, cobrado antes | 🔒 | Depende de pagamentos (AbacatePay). |
| RA-ROT-03 Com a Guia: 30 por semana, até 7 dias | 🟡 | 7 dias ✅; contagem ✅; bloqueio não. |
| RA-ROT-04 Cota só depois de mostrado | 🟡 | Conta só roteiros gerados ✅. Falta "Tentar de novo" do mesmo pedido. |
| RA-ROT-05 Pedido idêntico devolve o existente | ⬜ | |
| RA-ROT-06 Regenerar | ⬜ | |
| RA-ROT-07 Editar e "Outra opção" só com a Guia | ✅ | Cadeado e "Com e sem a Guia". Edição feita pela conversa. |
| RA-ROT-08 Destino primeiro e 3 modos | 🟡 | Rápido e Personalizar ✅. "Falar o pedido" leva à conversa (áudio). |
| RA-ROT-09 Rápido: volta hoje às 22h | ✅ | |
| RA-ROT-10 Preferências e "Salvar como preferência" | 🟡 | Funciona, mas guarda no aparelho (não sincroniza com o WhatsApp). |
| RA-ROT-11 Tipos de roteiro | ✅ | |
| RA-ROT-12 Quem vai, crianças e pet | ✅ | |
| RA-ROT-13 Hospedagem só com pernoite; fontes | 🟡 | Pernoite ✅. Falta a busca de hospedagens. |
| RA-ROT-14 Busca de destino; sugestão até 150 km | 🟡 | "Para onde ir" até 150 km ✅. Busca de cidade ainda é campo livre. |
| RA-ROT-15 Destino sem dados | ⬜ | |
| RA-ROT-16 Distâncias por parada | 🟡 | Deslocamento escrito pela Sol em cada parada. |
| RA-ROT-17 Previsão por parada e maré | ⬜ | Previsão por dia na aba Informações. |
| RA-ROT-18 Passeios dependentes de maré | ⬜ | Depende da fonte de marés (TODO-24). |
| RA-ROT-19 Alerta Severo no dia a dia | ⬜ | Depende de alertas oficiais. |
| RA-ROT-20 Offline só com a Guia | ⬜ | |
| RA-ROT-21 Rota no Google Maps, Waze ou Mapas | ✅ | Com "Lembrar minha escolha". |
| RA-ROT-22 Checklist por tipo de viagem | ✅ | Nacional, internacional, criança, pet. |
| RA-ROT-23 Rascunho offline por 24 h | 🟡 | Rascunho fica no aparelho durante a sessão. |
| RA-ROT-24 Até 5 dias, 7 com a Guia | ✅ | App e servidor conferem. |

## GUI · Guia Sol

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-GUI-01 Planos por dia e por mês | 🔒 | Preços no servidor e na tela ✅; cobrança depende de pagamentos. |
| RA-GUI-02 Regras do plano mensal | 🔒 | TODO-21. |
| RA-GUI-03 Ativação só com roteiro e pagamento | 🟡 | Exige roteiro ✅; modo teste ativa sem pagamento. |
| RA-GUI-04 Aviso antes de terminar e estender | ⬜ | |
| RA-GUI-05 Uso justo: 100 mensagens e 50 fotos | 🟡 | 100 mensagens ✅; fotos não. |
| RA-GUI-06 Recursos só da Guia | 🟡 | Tradutor, editar e atalhos ✅; offline e alertas não. |
| RA-GUI-07 Sem roteiro: oferta | ✅ | |
| RA-GUI-08 Aviso de inatividade | 🟡 | Os avisos automáticos ainda rodam no servidor antigo. |

## SOL · Conversa com a Sol

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-SOL-01 Mesma conversa, texto, áudio e foto | ✅ | |
| RA-SOL-02 30 mensagens por dia, 1 imagem por viagem | 🟡 | 30 mensagens ✅; limite de imagem não. |
| RA-SOL-03 WhatsApp confirma preferências | 🟡 | Comportamento atual do bot; revisar com o documento. |
| RA-SOL-04 Áudio; nunca pagar por voz | ✅ | |

## TRA · Tradutor

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-TRA-01 Só com a Guia | ✅ | Cadeado sem a Guia. |
| RA-TRA-02 Limite de 50 por dia | ⬜ | Parâmetro existe; contagem não. |
| RA-TRA-03 Entrar na sala de outra pessoa | ⬜ | |
| RA-TRA-04 QR da sala | ⬜ | |
| RA-TRA-05 Código da sala | ⬜ | |
| RA-TRA-06 Conversa traduzida registrada | 🔒 | Depende do aviso jurídico (TODO-64). |
| RA-TRA-07 Aviso e guarda | 🔒 | TODO-64 e TODO-17. |

## ALE · Alertas e notificações

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-ALE-01 Só fontes oficiais | 🔒 | INMET não responde a partir do servidor; buscar outra forma de acesso. |
| RA-ALE-02 a RA-ALE-09 | ⬜ | Severo, banner, sino, Avisos, configurações e permissão de notificações. Próxima rodada (push). |
| RA-ALE-10 Avisos perdidos | ⬜ | A base de localização com consentimento já existe. |

## SEG · SOS e segurança

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-SEG-01 Escudo só no Início | ✅ | Atalhos no ícone e na tela de bloqueio precisam do app nas lojas (Capacitor). |
| RA-SEG-02 Aceite do SOS | ✅ | |
| RA-SEG-03 Segurar 2 s; avisar em sequência; SMS sem internet | 🟡 | Segurar 2 s ✅. Hoje a mensagem abre pronta no WhatsApp ou SMS. Envio automático precisa do servidor ou do app nativo. |
| RA-SEG-04 Contato avisado no cadastro | ⬜ | Contatos ficam no aparelho; falta guardar no servidor e avisar. |
| RA-SEG-05 Só números do Brasil | ✅ | |
| RA-SEG-06 SOS funciona com tudo desligado | ✅ | |
| RA-SEG-07 Telefones úteis e consulado | 🟡 | Telefones ✅; consulado não. |
| RA-SEG-08 Guarda dos acionamentos | 🔒 | Advogado. |

## FOT · Álbum, fotos, mural e votação

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-FOT-01 Álbum por viagem, até 5 MB | 🟡 | Fotos por viagem e compactação ✅; fila sem internet não. |
| RA-FOT-02 30 dias grátis e prorrogação | 🔒 | Depende de pagamentos. |
| RA-FOT-03 Limite do álbum | 🔒 | DEF-65. |
| RA-FOT-04 Marca d'água; compra sem marca | 🟡 | Marca d'água ✅; compra não. |
| RA-FOT-05 Link por viagem, 7 dias | 🟡 | Mural por link ✅; validade de 7 dias e desativar não. |
| RA-FOT-06 a RA-FOT-08 Votação por local | ⬜ | |
| RA-FOT-09 Votação do mês fora do MVP | ✅ | |
| RA-FOT-10 Viagens passadas com álbum | ✅ | |

## IND · Indicação e créditos

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-IND-01 Link de convite com QR | 🟡 | Link de indicação existe; QR não. |
| RA-IND-02 Ligado a quem convidou; 1 dia grátis da Guia | 🟡 | Ligação pelo link ✅. Dia grátis da Guia não. |
| RA-IND-03 Crédito só depois do cadastro e roteiro | ⬜ | O bot ainda conta o convertido pelo pagamento (regra antiga). |
| RA-IND-04 Patamares 3, 10 e 25 | ⬜ | |
| RA-IND-05 Validade de 30 dias e limites de resgate | ⬜ | |
| RA-IND-06 Selo Sol Original | ⬜ | |
| RA-IND-07 Validade do link e convite | 🔒 | TODO-77 a 79. |

## PAG · Pagamentos e devoluções

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-PAG-01 a RA-PAG-06 | 🔒 | Chave da AbacatePay inválida; app em modo teste (sem cobrança). |

## INI · Eventos, destinos e tempo

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-INI-01 e RA-INI-02 Eventos da Animus | 🔒 | Sem acesso à fonte. |
| RA-INI-03 Destinos com motivo; comparar até 3 | 🟡 | Recomendação com motivo ✅; comparar não. |
| RA-INI-04 Chip do tempo e previsão | ✅ | Fonte Open-Meteo (TODO-66 em aberto no documento). |
| RA-INI-05 Tábua de marés | ⬜ | TODO-24. |

## PRI · Privacidade e registro

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-PRI-01 Registro imutável, Meu histórico | ⬜ | |
| RA-PRI-02 Baixar meus dados | ⬜ | |
| RA-PRI-03 Anonimização | ⬜ | |
| RA-PRI-04 Revisão jurídica dos textos | 🔒 | Todos os textos novos estão marcados como provisórios. |
| RA-PRI-05 Memória por HMAC | 🔒 | Atrás de parecer jurídico. |

## VER · Versão, manutenção e estados

| Regra | Status | Onde / o que falta |
|---|---|---|
| RA-VER-01 Versão no Perfil; versão mínima | 🟡 | Versão (data e código) e "Procurar atualização" ✅. Falta SemVer e versão mínima. |
| RA-VER-02 Manutenção | ⬜ | |
| RA-VER-03 Atendimento | ⬜ | Número do suporte em aberto. |

## Dados de presença (base do TripGov)

- `sol_presenca`: check-in de atividade (sempre) e posição durante a viagem (só com consentimento ativo).
- `sol_consentimentos`: termos, SOS e localização, com versão e data; cada mudança é uma linha nova.
- `sol_cadastro`: data de nascimento e conclusão do cadastro.
- Tabelas com RLS ligado e sem políticas: só o servidor lê e grava.
- Falta: prazo de guarda (jurídico), agregação anônima e painel do TripGov.

## Auditoria de 2026-11-03 (segurança e bugs)

Corrigido no servidor: rotas internas e de teste exigem `X-Admin-Secret` (`ZYNK_ADMIN_SECRET`); webhooks de pagamento exigem o segredo da AbacatePay (`?webhookSecret=`); webhook do WhatsApp confere a assinatura da Meta quando `META_APP_SECRET` existe; `JWT_SECRET` e `META_VERIFY_TOKEN` obrigatórios; corpo JSON limitado a 200 kB; limites por IP, por telefone (OTP, chat, criar roteiro) e por dia (tradutor, áudio, sugestões); cota semanal aplicada; mensagem do chat até 2.000 caracteres; `days` do roteiro contado pelas datas; status do roteiro vira `generated`/`sent`; `phone` gravado em `generated_itineraries`; prompts sem travessão e com períodos fixos (Manhã/Tarde/Noite).

Corrigido no app: páginas públicas (`/r/código`, `/mural/código`) leem o banco por funções `security definer` (`roteiro_publico`, `mural_publico`, `mural_fotos_publicas`) e as tabelas `customers`, `generated_itineraries`, `customer_photos`, `photo_murals` e `mural_photos` ficaram fechadas para a chave anônima; parser do roteiro aceita Almoço/Jantar e traslados; links externos só http(s); sair apaga tudo `sol_*`; service worker não guarda mais `/rest` do Supabase; cadastro valida data real e até 120 anos; botão "Criar conta" do painel admin removido; alvos de toque ≥ 44 px; abas e chips do roteiro cabem no iPhone SE.

Pendente (precisa de ação fora do código): `META_APP_SECRET` no `.env` do bot; URL do webhook da AbacatePay com `?webhookSecret=`; desligar "Enable sign ups" no Supabase Auth; republicar a edge function `manage-customers` com checagem de login; RA-CAD-03 (bloqueio de 5 h), RA-CAD-06 (nova versão dos termos), RA-SEG-04 (contatos no servidor), RA-SEG-05 (conferir DDI 55), RA-ROT-05/06, RA-SOL-02 (1 imagem por viagem), RA-VER-01, RA-ALE-*.

## Onboarding (2026-11-04)

Depois de Termos e Nascimento: **Localização** (consentimento `localizacao_viagem` + permissão do celular; no app das lojas, pede "o tempo todo" para o trajeto com o app fechado) → **Gostos** (até 4 tipos de passeio; viram o padrão de Criar roteiro e o `touristProfile` da Sol) → **Viagem em mente** (destino e datas opcionais → "Montar roteiro para X" já preenchido) ou **Lugares que quer conhecer** (lista + outro). Dados em `sol_cadastro` (`gostos`, `viagem_*`, `lugares_desejados`). Quem já tinha cadastro vê a pergunta de localização uma vez na entrada (`/app/localizacao?primeira=1`). Decisão do fundador em 2026-11-04: a localização é pedida na entrada (diverge de RA-GER-05, "permissão só na hora do uso"); vale para PWA, Android e iPhone.

## Decisões do fundador em 2026-11-08 (ainda não refletidas nas Regras Vigentes)

- **Álbum/mural (RA-FOT):** enviar fotos é recurso da **Guia Sol** e só **durante a viagem** (chegada ≤ hoje ≤ volta do último roteiro). Depois da viagem a pessoa só vê, apaga e compartilha. Servidor: `estadoDoAlbum` (album.service) bloqueia `POST /api/app/chat/foto` com 403 e motivo (`sem_guia`, `sem_viagem`, `viagem_encerrada`); `POST /api/app/album/apagar`. Diverge de RA-FOT-02 (álbum grátis por 30 dias): precisa de decisão no documento.
- **RA-ROT-01 aplicado:** sem a Guia, o roteiro cobre 1 dia (`ROTEIRO_MAX_DAYS` padrão 1); a volta acompanha a chegada na tela Criar; o chat recusa pedidos de vários dias sem a Guia. Dias pagos (RA-ROT-02) continuam sem pagamento ativo.
- **Administração interna:** telefones em `ADMIN_PHONES` (.env do bot) veem Perfil → Administração (`/app/admin`): consulta por WhatsApp, ativa/desliga a Guia, +1 crédito, marca roteiro como pago. Rotas `/api/app/admin/*`.

## Indicação de amigos (2026-11-11) — RA-IND-01 a 05

Link `painel.tripsol.com.br/convite/CÓDIGO` com QR Code (Perfil → Créditos e indicações). O código fica no aparelho (`convite_sol`) até a pessoa concluir o cadastro; aí o servidor grava o vínculo (`sol_indicacoes`), só para conta nova, nunca para o próprio código, e dá 1 dia de Guia ao convidado. Convertido = cadastro pelo link + primeiro roteiro com data futura pronto. Patamares: 3 = 1 dia, 10 = 3 dias (liberam 24 h depois), 25 = Embaixador. Crédito vale 30 dias, usa primeiro o que vence antes, até 3 dias por viagem e 5 por mês (`sol_creditos_guia`, `sol_resgates_guia`). A Guia por crédito tem prazo (`sol_cadastro.guia_ate`) e desliga sozinha. Falta: alerta antifraude antes de liberar o patamar, selo Sol Original (RA-IND-06), convite passando pelas lojas (TODO-78) e a regra antiga de crédito por pagamento no WhatsApp continua ativa no bot.

## Pagamentos pela AbacatePay v2 (2026-11-12) — RA-PAG-06, RA-ROT-02

Uma cobrança por compra, com referência própria (`sol_pagamentos`). No app: Pix direto na tela (`/app/pagar/:ref`, QR Code + copia e cola, sem formulário; a tela consulta e libera sozinha) e botão de cartão (checkout da AbacatePay). No WhatsApp: a Sol manda o link do checkout da pessoa. Produtos: dia de roteiro R$ 4,90, Guia 1 dia R$ 9,90, Guia 30 dias R$ 29,90. Roteiro sem a Guia: até 5 dias; 1º dia grátis se houver grátis na semana, demais pagos; o roteiro é gerado quando o pagamento cai. Webhook `POST /webhook/abacatepay` confere segredo e assinatura. Falta: habilitar cartão na conta AbacatePay, reembolso, tela de compras, e um Pix real de teste. O modo demonstração (`DEMO_FREE_MODE`) continua ligado.

## Painel de administração, tela de erro e testes (2026-11-13)

**Painel da equipe** (`/app/admin`, só `ADMIN_PHONES`; cliente recebe 403 e volta ao perfil). Abas: Visão geral (contatos, uso, roteiros, pagamentos, logins, erros e custo de IA, com gráficos por dia), Saúde (banco, conexões, processador, memória, travamento do processo, disco, WhatsApp, serviços de fora, etapas e rotas), Usuários (busca por nome ou parte do número; ficha com linha do tempo: logins e motivo das falhas, roteiros, pagamentos, aceites, erros), Conversas (WhatsApp e app, em balões, com o canal de cada mensagem, somente leitura), Roteiros (lista, situação e texto), Logs (filtros por nível, número, etapa, texto) e Liberar (a tela antiga). Arquivos: `src/pages/app/AppAdmin.tsx` e `src/pages/app/admin/`; carregado só quando um admin abre. Servidor: `src/routes/admin.routes.ts`.

**Logs no banco**: tabela `sol_logs` (script `prisma/manual-sql/0002_sol_logs_e_canal.sql`; RLS ligada, só o bot lê). O logger grava em lotes, mascara tokens e chaves, guarda 30 dias (erros e avisos, 90). Cada pedido que muda algo, todo erro e toda resposta lenta ficam registrados (etapa `http`); consultas repetitivas ficam só nos contadores em memória. O login registra o motivo de cada falha (código errado, vencido, pedido vencido, mensagem do WhatsApp que não chegou, limite). `Message.canal` guarda `whatsapp` ou `app` (mensagens antigas: sem canal). Toda consulta da equipe a conversa, roteiro ou ficha fica registrada (etapa `admin`).

**Tela de erro com saída**: se uma tela quebrar, aparece "Algo deu errado nesta tela" com "Tentar de novo" e "Voltar ao início" (as abas continuam), e o erro vai sozinho para os Logs (`POST /api/app/erro-cliente`, etapa `app-cliente`, com tela, versão e aparelho). Antes o app inteiro ficava em branco, sem voltar e sem o botão de relato. O botão da Central de Bugs tenta conectar de novo quando falha.

**Roteiro rápido à noite**: das 20h às 5h começa às 9h (de amanhã, ou de hoje se já passou da meia-noite); antes, às 23h30 saía "começa 00:30" no dia errado.

**Modo de teste do servidor** (`MODO_CARGA=1`, arquivo `src/carga-mock.ts` no bot): simula WhatsApp, IA, Google, AbacatePay, clima, PDF e arquivos, com atraso parecido com o real. Recusa ligar na porta de produção ou com envios diários ligados. Serve para jornadas automáticas e teste de carga sem enviar mensagem nem gastar.

**Testes que passaram em 13/11**: jornada completa pela API (login real por código, cadastro, roteiro, conversa nos dois canais, Pix simulado, permissões entre usuários, 163 entradas inválidas sem nenhum erro 500, excluir conta) e pelas telas em iPhone 13, iPhone SE e Pixel 7 (caminho feliz; internet lenta, recarregar, toque duplo e botão voltar; servidor com erro e sem resposta em 16 telas; sessão vencida; ficar sem internet no meio). Corrigido no caminho: endereço de pagamento malformado dava erro 500.

## Teste de carga e estresse (2026-11-13)

Feito numa cópia de teste do bot (`MODO_CARGA=1`, porta 3002, serviços de fora simulados com atraso parecido com o real, mesmo banco, contas falsas `55009000xxxxx` apagadas no fim). O gerador de carga roda na mesma máquina de 1 núcleo, então os limites reais são um pouco maiores. Scripts: `carga.mjs` e `estresse.mjs` (pasta de trabalho da sessão; vale trazer para o repositório).

**Gargalo**: o banco (Supabase) fica em San Jose, Califórnia (AWS us-west-1) e o servidor em Boston: cada consulta custa ~80 ms só de viagem. Processador e memória ficaram folgados; o que limita é consultas por tela × 80 ms ÷ conexões abertas.

| Usuários ao mesmo tempo | Antes (3 conexões) | 12 conexões | 25 conexões + menos consultas (como está hoje) |
|---|---|---|---|
| 50 | 3,0 s | 0,2 s | - |
| 100 | 6,4 s | 0,5 s | - |
| 200 | 16 s, 8,5% de erro | 2,5 s | 0,15 s |
| 400 | - | ~6,5 s | 1,1 s |
| 600 | - | 11 s, 4% de erro | 2,2 s |
| 800 | - | 16 s, 5% de erro | 3,4 s |
| 1000 | - | 20 s, 6% de erro | 4,4 s, 0,4% de erro |

(tempo típico das telas comuns; a conversa com a Sol fica mais lenta antes: 3 s com 200 pessoas, 12 s com 400, 40 s com 1000.) O servidor não caiu em nenhum cenário; depois de um pico de 400 pessoas no mesmo instante, voltou ao normal em 20 s; 150 pessoas por 8 min sem degradação.

**Aplicado**: `DB_CONEXOES=25` (o banco aceita 60; cópias de teste junto devem usar no máximo 20); fila de 4 roteiros ao mesmo tempo (`ROTEIROS_SIMULTANEOS`, `fila.service.ts`); limite geral por sessão (300/min) com teto por IP de 3000/min (antes 300/min por IP barrava ~25 pessoas no mesmo wi-fi); id da conversa em memória por 2 min e perfil em paralelo (uma consulta a menos nas telas mais usadas); no máximo 12 arquivos grandes sendo tratados ao mesmo tempo (`ARQUIVOS_SIMULTANEOS`; 30 áudios de 12 MB juntos tinham levado a memória a 1,2 GB), o excedente recebe 503 "tente de novo"; teto de 50 mil pedidos de login em aberto; `requestTimeout` de 2 min.

**Outros resultados**: 500 mensagens de WhatsApp no mesmo segundo respondidas em 43 s; 60 pedidos de roteiro juntos saem todos, o último em ~5 min (a fila de 4 dá ~13 roteiros por minuto); 3 roteiros com a IA real ao mesmo tempo ficaram prontos em 18, 22 e 37 s; 20 mil pedidos de login de 4 mil endereços não afetaram a memória; 6 mil conexões presas não derrubaram o atendimento.

**Recomendações em aberto** (decisão do fundador): (1) pôr banco e servidor na mesma região, de preferência São Paulo: é o que mais aumenta a capacidade e deixa todas as telas mais rápidas; (2) conferir a cota da IA (Gemini) antes de subir a fila de roteiros; (3) servidor com 2 núcleos quando passar de ~400 pessoas simultâneas; (4) aviso por WhatsApp/push quando o roteiro fica pronto, para quem pegou fila.

## Contagem de dias, modo de teste e localização desligada (2026-11-13, decisão do fundador)

- **Dia de viagem**: sair hoje e voltar amanhã é **1 dia**. Dias = volta − chegada, no mínimo 1 (ir e voltar no mesmo dia também é 1). Vale para o limite (5 sem a Guia, 7 com) e para o preço (1º dia grátis, R$ 4,90 por dia a mais). Servidor: `diasDaViagem` em `pagamento.service.ts`; app: `diasDaViagem` em `src/lib/roteiro.ts`. O texto do roteiro continua cobrindo todas as datas (chegada e volta), agora com o número exato de datas (antes era arredondado para 1, 2, 3, 5, 7, 10 ou 15).
- **Modo grátis de teste** (`DEMO_FREE_MODE=true`): nenhum dia de roteiro é cobrado (antes só o 1º saía grátis, embora o app dissesse "grátis durante o teste").
- **Tela Criar**: fora do teste, quando há valor, um aviso mostra quantos dias, o que é grátis, quanto custa e o botão "Fazer só 1 dia, grátis"; a revisão mostra a linha "Valor" e o botão vira "Pagar R$ X e gerar".
- **Localização do celular desligada**: a permissão do app não basta. App Android: plugin próprio `LocalizacaoSol` (`android/app/src/main/java/br/com/tripsol/sol/LocalizacaoSolPlugin.java`) mostra o aviso do sistema para ligar a localização (ou abre os ajustes de Localização) antes de pedir a permissão; usado em Localização, cadastro, "usar minha localização", conversa e SOS, e uma vez por sessão para quem já consentiu. Site (PWA) e iPhone não conseguem abrir essa chave: o app explica onde ligar (`src/lib/gps.ts`). Sem testar em aparelho real até o fundador confirmar.
- **Em aberto**: os "créditos" antigos (`freeCredits`) não entram na conta nova do preço; no fluxo antigo do WhatsApp ainda existe a cobrança pela tabela antiga quando a pessoa tem roteiro grátis na semana mas não tem crédito. Decidir se os créditos viram roteiros grátis extras ou saem de cena.

## Roteiros melhores (2026-11-13) — pedido do fundador: "melhorar os 6 pontos"

O roteiro antigo (ex.: o de Blumenau do David em 10/11) inventava voo e aeroporto, não sabia de onde a pessoa saía, recomendava restaurante que o Google marca como fechado e tinha carta de 5 parágrafos. O que mudou:

1. **Sem suposições.** A tela Criar pergunta "Como você volta" (carro, avião, ônibus, moro ou já estou na cidade; opcional). Sem resposta, o roteiro vai até a hora de volta e não fala em aeroporto. O ponto de partida é a hospedagem ou a posição do celular (`pedido.partida`); sem os dois, a primeira parada diz só "Ponto de partida do dia". Bot: `roteiro-contexto.service.ts`, `buildLastDayInstruction` em `itinerary.agent.ts`, parâmetro `transporte_volta` na ferramenta do chat.
2. **Conferência no Google Maps** (`verificacao.service.ts`): cada parada é procurada no Places; se não existe, está fechada, fecha naquele dia e horário ou é mal avaliada (nota < 3,7 com 40+ avaliações), a IA troca por outra, em até 2 rodadas. O tempo de deslocamento passa a ser calculado pela distância real. O texto ganha "✅ Conferido no Google Maps" ou "⚠️ Confirme o funcionamento antes de ir". **Regra do Google** (Places API policies, conferida em 13/11): só o `place_id` pode ser guardado; horário, nota e nome não. Por isso os dados do Google servem só para decidir na hora, e o "aberto agora / horário de hoje / nota" é pedido ao vivo pelo app (`GET /api/app/local-info`) e mostrado com o crédito "Google Maps", sem gravar. Tetos: `GOOGLE_PLACES_CONFERENCIAS_DIA` (800) e `GOOGLE_PLACES_INFO_PESSOA_DIA` (80).
3. **Mais informação por parada**: 🕒 horário e tempo no local, 💰 custo, ☔ plano B se chover, 💬 por que para aquela pessoa; introdução de no máximo 2 parágrafos; almoço e jantar de verdade; sem paradas de enchimento (lembrancinhas, check-in). O app lê as linhas novas (`src/lib/roteiro.ts`) e mostra na atividade e na lista do dia. Emojis usados ficam dentro das faixas que o gerador de PDF remove (🕒 💰 ☔ 🎫 ✅), para o PDF não quebrar.
4. **Dados da pessoa**: gostos e lugares desejados do cadastro, lugares já feitos em roteiros anteriores no mesmo destino (não repete) e as avaliações. O primeiro tipo marcado no pedido define o perfil (Negócios deixou de virar "turista de lazer").
5. **Trocar esta atividade** (`POST /api/app/roteiro/trocar`, só com a Guia Sol, RA-ROT-07): troca uma parada por outra no mesmo horário, com o motivo (já conheço, caro, não é meu estilo, longe, coberto), confere no Google e atualiza o texto e a cópia do link público. O PDF não é refeito. **Gostei / não gostei** (`POST /api/app/roteiro/avaliar`, tabela `sol_avaliacoes`) para todos; entra nos próximos roteiros e é apagado junto com a conta.
6. **Eventos nas datas** (`eventos.service.ts`, tabela `sol_eventos`): uma busca por cidade e período, com fonte obrigatória, guardada por 24 h (lista vazia, 3 h). O roteiro inclui no máximo 2, com a linha "🎫 Evento … Fonte: …"; o app mostra o link da fonte.

Script SQL: `prisma/manual-sql/0003_roteiros_melhores.sql`. Medido em 13/11: roteiro de 1 dia pronto em ~30 s (antes ~18 s), com cerca de 10 consultas ao Google; no teste de Blumenau a conferência reprovou 2 restaurantes (um fechado, um fechado no horário) e trocou os dois.

Limites conhecidos: perfil de Negócios ainda mistura passeio turístico mais do que deveria; o PDF não muda depois de uma troca; o custo é estimado pela IA (marcado "estimado").

## Avisos da Guia Sol (2026-11-14) — fases 1 a 3 pedidas pelo fundador

**Fase 1, no ar**
- **Perto de você agora** (Início, só com a Guia; sem a Guia aparece com cadeado): até 6 lugares abertos, bem avaliados (nota 4+), a até 2,5 km, escolhidos pelo perfil (negócios: cafés, coworkings, centros de convenções; gastronomia: restaurantes, mercados; etc.) e pela hora do dia, sem repetir o que já está no roteiro. Vem do Google Maps na hora (`GET /api/app/perto`, `perto.service.ts`), não é guardado e mostra o crédito "Google Maps". Teto: 24 consultas por pessoa por dia.
- **Comunicados da equipe**: aba Comunicados no painel (`/app/admin?aba=comunicados`): título, texto, importância (informação, atenção, urgente), cidade (vazio = todos), duração (6 h a 7 dias) e link https opcional. Aparece no Início de quem está na cidade agora ou tem roteiro para ela (da véspera até a volta); a pessoa dispensa com o X. Tabela `sol_comunicados`.

**Fase 2, no ar**
- **Eventos da cidade** com fonte: no roteiro (até 2 por roteiro) e como aviso "Hoje em [cidade]" para quem está em viagem com a Guia. Endereços de passagem da busca (vertexaisearch) são trocados pelo endereço real da fonte; sem fonte real, o evento não entra.
- **A Sol sabe dos avisos na conversa** (app e WhatsApp): comunicados e avisos ativos entram no contexto.

**Fase 3, parte no ar**
- **Avisos automáticos** para quem está em viagem com a Guia (`avisos.service.ts`, tabela `sol_avisos`): tempestade ou chuva forte hoje (pela previsão do Open-Meteo), evento hoje, parada de hoje no roteiro que consta fechada no horário (horário desta semana no Google, já com feriado). São avaliados quando o app abre (no máximo 1 vez por hora por pessoa, em segundo plano) e aparecem no Início.
- **Envio pelo WhatsApp** já escrito (a cada 30 min; no máximo 3 por dia; das 8h às 21h; só com conversa nas últimas 24 h, porque fora disso o WhatsApp exige mensagem modelo paga), mas **só roda quando os envios agendados forem ligados** (`DISABLE_DAILY_JOBS` ainda está `true` até o bot antigo ser desligado).

**Não feito ainda**: notificação no celular com o app fechado (precisa de conta Firebase para o Android e de configuração de push para o PWA); resumo da manhã como mensagem; alertas oficiais do INMET (o endereço público não respondeu a partir deste servidor em 13/11).

Script SQL: `prisma/manual-sql/0004_avisos_da_guia.sql`. Excluir a conta apaga avaliações e avisos da pessoa.

## Pendências resolvidas e ajustes depois do roteiro de Foz (2026-11-14)

- **Alerta oficial do INMET** (`inmet.service.ts`, fonte `apiprevmet3.inmet.gov.br/avisos/ativos`): vira aviso para quem está em viagem com a Guia na cidade atingida, com o texto de risco e instrução do próprio INMET. Sem alerta oficial, vale a regra de previsão (tempestade ou chuva forte).
- **Resumo da manhã**: aviso "Bom dia! Seu dia em [cidade]" (tempo, primeira parada, eventos), criado só entre 7h e 11h59.
- **Envio ao celular** (`enviarAvisosPendentes`, a cada 30 min, 8h–21h, até 3 por dia): agora **ligado**, separado da trava dos envios diários (`AVISOS_WHATSAPP=false` desliga). Quem ligou as notificações do app recebe por lá; quem não ligou recebe pelo WhatsApp se conversou nas últimas 24 h.
- **Notificações do PWA (web push)**: `push.service.ts`, tabela `sol_push`, chaves `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` no `.env` do bot, `public/sol-push.js` no service worker, cartão "Avisos no celular" no Início (Guia) e liga/desliga em Localização. Funciona no Chrome do Android e no iPhone com o app na tela inicial (iOS 16.4+). **Não funciona no app Android das lojas** (precisa do Firebase). Testado até a notificação aparecer pelo service worker; a entrega real pelo Google/Apple falta confirmar num celular.
- **PDF refeito depois de trocar atividade**: 90 s depois da última troca, em segundo plano; o link público `/r/código` continua o mesmo e passa a apontar para o PDF novo.
- **Viagem de negócios**: segunda passada (`reforcarNegocios`) troca paradas turísticas do horário comercial por lugares de negócios, só em dia útil. Centro de convenções só entra com evento confirmado.
- **Achados no roteiro de Foz do fundador (14/11) e corrigidos**: (1) a posição do celular só serve de ponto de partida se a pessoa já está a até 80 km do destino (saía "3900 min de carro de onde você está" para quem pediu de casa); (2) a parada precisa caber no horário escrito na linha 🕒: antes da última entrada e com 45 min antes de fechar (`cabeNoHorarioEscrito`; as Cataratas tinham ido para as 17h com última entrada às 16h); (3) voo passa a reservar 3 h, não 5 h; (4) quando o ponto do mapa de um parque grande dá uma distância absurda, fica a estimativa da IA.
- **Cuidado com os testes antigos** `pw/atualizar.mjs` e `pw/transicao.mjs`: eles reescrevem `index.html` e apagam `dist` do projeto. Depois de rodar, conferir `git status` e restaurar.
