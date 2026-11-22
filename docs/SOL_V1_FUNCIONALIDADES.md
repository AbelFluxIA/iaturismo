# Sol · tudo o que existe hoje (versão 1)

Levantamento feito em 14/11/2026, a partir do código que está no ar e de `docs/REGRAS_STATUS.md`. Serve de base para projetar a versão 2.

Como ler: **No ar** = funcionando em produção. **Em parte** = funciona, com a limitação descrita. **Falta** = previsto nas Regras Vigentes e não feito. **Depende de fora** = espera decisão, jurídico, fornecedor ou conta de terceiro.

## 1. O que é a Sol hoje

A Sol é uma assistente de viagem que funciona em dois lugares, com a mesma conta e a mesma conversa:

- **WhatsApp**: a pessoa conversa com a Sol, pede roteiro, recebe o PDF e fala com a Guia durante a viagem.
- **App** (painel.tripsol.com.br/app): site que se instala no celular (PWA) e um app Android de teste (APK). As regras são as mesmas do WhatsApp; quem decide preço, limite e cota é sempre o servidor.

Dois produtos:

| Produto | O que é | Preço |
|---|---|---|
| **Roteiro** | Roteiro de viagem feito pela IA, conferido no Google Maps, com PDF | 2 grátis por semana (1 dia cada). Dia a mais: R$ 4,90 |
| **Guia Sol** | Companhia durante a viagem: conversa sem aperto de limite, avisos, lugares perto, tradutor, trocar atividade, álbum | R$ 9,90 por dia ou R$ 29,90 por 30 dias |

**Importante para a V2**: o **Pix funciona de verdade**: em 13/11 um testador comprou a Guia de 30 dias (R$ 29,90) pelo app e o pagamento caiu em 34 segundos. Mas, conferido no servidor em 14/11, o **modo de teste grátis** (`DEMO_FREE_MODE`) **continua ligado**: os dias de roteiro não são cobrados e o limite semanal é o da Guia (30). Para cobrar de verdade (2 grátis por semana e R$ 4,90 por dia a mais) é preciso desligar esse modo. O cartão ainda não está habilitado na AbacatePay.

## 2. Conta, login e cadastro

| Funcionalidade | Situação | Observação |
|---|---|---|
| Um número de WhatsApp = uma conta | No ar | Vale com ou sem o 9 |
| Login por código de 6 dígitos (10 min) | No ar | No primeiro acesso a pessoa manda uma mensagem pronta pelo WhatsApp e recebe o código. Sem SMS |
| Sessão de 30 dias | No ar | Falta ver e encerrar aparelhos conectados |
| Cadastro em etapas | No ar | Dados → Termos → Nascimento → Localização → Gostos (até 4) → Viagem em mente → Lugares que quer conhecer |
| Aceite dos termos registrado | No ar | Textos provisórios, sem revisão jurídica. Falta a tela de "nova versão dos termos" |
| Menor de 18 anos | Em parte | Vê "conta restrita" só com o SOS. Falta todo o fluxo do responsável |
| Perfil (nome, foto, preferências) | No ar | A foto é recortada pelo servidor |
| Excluir a conta | No ar | Apaga conversa, roteiros, fotos, avaliações e avisos |
| Bloqueio de 5 h após 5 erros de código | Falta | Hoje 5 erros só invalidam o código |
| Troca de número, conta suspensa, antifraude de número | Falta | |
| 5 idiomas e modo escuro | Falta | App só em português, tema claro |

## 3. Roteiros

### 3.1 Como a pessoa pede

| Funcionalidade | Situação | Observação |
|---|---|---|
| Roteiro rápido | No ar | Só o destino: começa em 1 hora e vai até 22h (à noite, fica para as 9h do dia seguinte) |
| Personalizar | No ar | Datas, quem vai (crianças, pet), tipos de passeio, custos, hospedagem, como volta (carro, avião, ônibus, mora na cidade) |
| Pedir conversando | No ar | Por texto ou áudio, no app ou no WhatsApp |
| Qualquer destino, no Brasil ou fora | No ar | A cidade é achada pelo estado ou país (ex.: Bonito - MS) |
| Sugestões "Para onde ir" | No ar | Destinos a até 150 km, com o motivo, foto, distância e clima. Falta comparar até 3 |
| Salvar como preferência | Em parte | Guarda no aparelho, não sincroniza com o WhatsApp |
| Busca de hospedagens | Falta | Hoje a pessoa só escreve o nome do hotel ou bairro |

### 3.2 Regras de quantidade e preço

- Sem a Guia: **2 roteiros grátis por semana** (renova domingo, 21h), 1 dia grátis; **até 5 dias**, cada dia a mais R$ 4,90, pago antes de gerar.
- Com a Guia: **30 roteiros por semana**, **até 7 dias**, sem cobrança por dia.
- Dia de viagem: sair hoje e voltar amanhã conta **1 dia**.
- Enquanto o modo de teste estiver ligado (estava em 14/11), os dias de roteiro não são cobrados.

### 3.3 O que o roteiro traz

Cada parada tem: horário, trajeto desde a parada anterior (calculado pela distância real), horário de funcionamento e tempo no local, custo estimado, por que foi escolhida para aquela pessoa, plano B se chover, curiosidade, evento do dia (com a fonte) e link do mapa.

### 3.4 Controle de qualidade automático (depois que a IA escreve)

Tudo isto roda sozinho antes de o roteiro chegar à pessoa:

- **Conferência no Google Maps**: cada lugar é procurado; se não existe, está fechado no dia e horário ou é mal avaliado, é trocado (até 2 tentativas). O que passa ganha o selo "Conferido no Google Maps".
- Roteiro incompleto, repetido ou com introdução duplicada é corrigido ou gerado de novo.
- Saem as paradas que não são programa (check-in, tempo livre, "fim do roteiro").
- Parada marcada antes de abrir vai para a abertura; perto demais do fechamento vai para mais cedo; a que continua fechada sai.
- Restaurante sem nome ("almoço em restaurante local") e lugar repetido em dois dias são trocados.
- Buraco de mais de 3 horas, dia sem almoço ou sem jantar: entra um lugar conferido.
- Tempo no local que atropela a próxima parada é ajustado.
- Último dia: nada em cima da hora de voltar; entra a ida para o aeroporto ou rodoviária quando falta.
- Viagem de negócios: pelo menos metade do horário comercial é lugar de negócios.
- Evento só entra se a página da fonte abre e fala do evento.
- Trava final: os ajustes nunca mudam o número de dias.

Tempo para ficar pronto: 20 a 60 segundos (5 dias, até 2 minutos). Até 4 roteiros são gerados ao mesmo tempo; o resto espera na fila.

**Limites conhecidos**: no fim da tarde muita atração já fechou e o intervalo pode ficar vazio; cidade pequena tem mais paradas com "confirme o funcionamento"; o custo é estimativa da IA.

### 3.5 Tela do roteiro no app

| Funcionalidade | Situação | Observação |
|---|---|---|
| Dia a dia, com marcar como feita | No ar | |
| Mapa com a rota do dia | No ar | Abre no Google Maps, Waze ou Mapas, com "lembrar minha escolha" |
| Tela de cada atividade | No ar | Foto do lugar, dados da parada, "aberto agora", horário de hoje e nota ao vivo do Google |
| Gostei / não gostei | No ar | Entra nos próximos roteiros |
| Trocar esta atividade | No ar, só com a Guia | Com o motivo; se o lugar consta fechado, troca direto por um aberto |
| Alterar o roteiro pela conversa | No ar, só com a Guia | |
| Checklist antes de sair | No ar | Nacional, internacional, criança, pet. Marcações ficam no aparelho |
| PDF | No ar | Botão na tela do roteiro e na aba Info; chega também na conversa. É refeito depois de uma troca |
| Link público do roteiro | No ar | painel.tripsol.com.br/r/código |
| Compartilhar o dia | No ar | |
| Botão "Hoje" na barra | No ar | Abre a viagem de agora ou a próxima |
| Regenerar, "tentar de novo" do mesmo pedido, pedido idêntico devolver o existente | Falta | |
| Uso sem internet (offline) | Falta | |
| Previsão por parada, marés | Falta | Depende de fonte de marés |

## 4. Guia Sol (durante a viagem)

| Funcionalidade | Situação | Observação |
|---|---|---|
| Ativação | No ar | Exige ter um roteiro. Compra por Pix funcionando; no modo de teste também dá para ativar sem pagar |
| Conversa com a Guia | No ar | Até 100 mensagens por dia |
| Perto de você agora | No ar | Até 6 lugares abertos, bem avaliados, a até 2,5 km, pelo perfil e pela hora. Fica no fim do Início |
| Avisos automáticos | No ar | Alerta oficial do INMET, tempestade ou chuva forte pela previsão, evento de hoje, parada do roteiro que consta fechada |
| Resumo da manhã | No ar | "Bom dia! Seu dia em...", entre 7h e 12h |
| Notificação no celular | No ar no PWA | Confirmada em iPhone real em 14/11. No máximo 2 por dia (3 se urgente): um resumo de manhã e depois só o que for importante. Evento não notifica sozinho |
| Aviso pelo WhatsApp | No ar | Para quem não ligou a notificação e conversou nas últimas 24 h |
| Comunicados da equipe | No ar | A equipe publica por cidade, com importância e duração |
| Tradutor | Em parte | Texto ou áudio para o idioma escolhido, com "Ouvir". Falta a contagem do limite (50 por dia) e a sala de conversa traduzida (QR, código) |
| Álbum: enviar fotos | No ar | Só com a Guia e só durante a viagem |
| Tela "Com e sem a Guia" | No ar | Valores vêm do servidor |
| Compra por indicação (dias grátis) | No ar | Ver seção 8 |
| Aviso antes de a Guia terminar e opção de estender | Falta | |
| Notificação no app Android nativo | Depende de fora | Precisa de um projeto Firebase |
| Lembretes diários antigos do WhatsApp (checklist da véspera, pesquisa pós-viagem, lembrete de inatividade) | Escritos, desligados neste servidor | Voltam quando o bot antigo for desligado |

**Prazo da Guia comprada:** vale até o último dia (1 dia, vários dias ou 30 dias), com ou sem viagem em andamento. Avisa a 3 dias, na véspera e no último dia; quando termina, pergunta se a pessoa quer manter e oferece assinar de novo. Renovar antes do fim soma no fim do prazo.

## 5. Conversa com a Sol (grátis)

| Funcionalidade | Situação | Observação |
|---|---|---|
| Mesma conversa no app e no WhatsApp | No ar | |
| Texto, áudio e foto | No ar | Áudio é transcrito |
| 30 mensagens por dia (somando app e WhatsApp) | No ar | |
| A Sol cria roteiro, consulta créditos, ativa a Guia, reenvia o roteiro e busca sugestões confiáveis | No ar | A conversa nunca libera pagamento sozinha |
| A Sol sabe dos avisos e comunicados do dia | No ar | |
| Links viram botões | No ar | "Mapa: nome do lugar", PDF, pagar, abrir roteiro |
| Limite de 1 imagem por viagem | Falta | |

## 6. Início do app e utilidades

| Funcionalidade | Situação | Observação |
|---|---|---|
| Barra de 5 itens | No ar | Início, Roteiros, Hoje ou Criar, Guia Sol, Sol |
| Cidade atual e temperatura | No ar | Falta a tela "Escolher cidade" |
| Avisos (só o título, toque abre) | No ar | |
| Cartão da viagem | No ar | Atual, próxima, última, nunca viajou |
| Previsão do tempo | No ar | Agora, próximas horas e 7 dias. A linha de hoje vale de agora até o fim do dia. Fonte: Open-Meteo |
| Álbum de fotos por viagem | No ar | Fotos por viagem, com marca d'água. Só a pessoa vê o álbum inteiro. Falta compra sem marca e votação |
| Compartilhar uma viagem | No ar | Link secreto de UMA viagem (fotos e imagem personalizada), vale 7 dias e a pessoa pode desligar. Não existe link do álbum inteiro. Na conversa, depois da imagem personalizada, o botão é "Compartilhar minha viagem" |
| Instalar o app (PWA) | No ar | Botão "Instalar o app" na tela de entrada, no Perfil e num cartão nas outras páginas. Android: um toque. iPhone: a Apple não permite instalar sozinho, o botão abre o passo a passo (3 toques). Aberto por dentro do Instagram etc.: manda abrir no Safari/Chrome |
| Atualização do app | No ar | Avisa quando há versão nova. Falta versão mínima e tela de manutenção |
| Tela de erro com saída | No ar | "Tentar de novo" e "Voltar ao início"; o erro vai sozinho para a equipe |
| Botão de relatar bug | No ar | É da Central de Bugs (projeto separado). No iPhone a captura de tela não funciona; anexa-se o print |

## 7. Segurança (SOS)

| Funcionalidade | Situação | Observação |
|---|---|---|
| Botão SOS (segurar 2 segundos) | Em parte | Abre a mensagem pronta no WhatsApp ou SMS com a localização. Não envia sozinho |
| Contatos de emergência e mensagem de socorro | Em parte | Ficam guardados só no aparelho |
| Aceite antes do primeiro uso | No ar | |
| Telefones úteis | No ar | Falta consulado |
| Funciona com a conta restrita | No ar | |

## 8. Indicação de amigos

No ar: link e QR Code de convite; o convidado ganha 1 dia de Guia; conta como convertido quem se cadastra pelo link e faz o primeiro roteiro com data futura. Patamares: 3 convertidos = 1 dia de Guia, 10 = 3 dias, 25 = Embaixador. O crédito vale 30 dias, até 3 dias por viagem e 5 por mês.

A página pública de uma viagem compartilhada leva ao convite de quem compartilhou ("Quero o meu também").

Falta: alerta antifraude, selo Sol Original, convite passando pelas lojas. A regra antiga de crédito por pagamento ainda existe no fluxo do WhatsApp.

## 9. Pagamentos

| Funcionalidade | Situação | Observação |
|---|---|---|
| Pix dentro do app (QR Code e copia e cola) | No ar | Primeiro Pix real em 13/11 (Guia 30 dias, R$ 29,90), liberado sozinho em 34 segundos |
| Cartão (página da AbacatePay) | Depende de fora | Habilitar na conta AbacatePay |
| Link de pagamento pelo WhatsApp | Pronto, sem pagamento real ainda | |
| Cobrança do dia de roteiro (R$ 4,90) | Pronta, desligada | Só cobra com o modo de teste desligado |
| Reembolso e tela "minhas compras" | Falta | |
| Créditos antigos (`freeCredits`) | Em aberto | Decidir se viram roteiros grátis ou saem |

## 10. Localização e privacidade

- Consentimento de localização durante a viagem, com finalidade explicada e revogável; pedido na entrada do app.
- Registro de presença (atividade feita e posição durante a viagem, só com consentimento): é a base pensada para o TripGov. Falta prazo de guarda, dados agregados anônimos e o painel.
- No Android, o app pede para ligar a localização do celular quando está desligada.
- Falta: "meu histórico", baixar meus dados, anonimização e revisão jurídica de todos os textos.

## 11. Painel da equipe (/app/admin)

Só para os números da equipe. Abas:

- **Visão geral**: contatos, uso, roteiros, pagamentos, logins, erros e custo de IA.
- **Saúde**: banco, servidor, WhatsApp e serviços de fora.
- **Usuários**: busca e ficha com linha do tempo (logins e motivo das falhas, roteiros, pagamentos, aceites, erros).
- **Conversas**: WhatsApp e app, somente leitura.
- **Roteiros**, **Logs** (30 dias; erros, 90) e **Comunicados**.
- **Liberar**: ativar a Guia, dar crédito, marcar roteiro como pago.

Toda consulta da equipe fica registrada. Existe também o painel antigo (/login), anterior ao app.

## 12. Onde tudo roda (resumo técnico)

| Peça | Onde |
|---|---|
| App | Site em React, publicado pela Vercel; APK Android feito com Capacitor |
| Servidor e bot | Node, em uma VPS de 1 núcleo (Boston) |
| Banco e arquivos | Supabase (Califórnia) |
| IA | Gemini (roteiros, eventos, trocas) e o modelo da conversa |
| Mapas e lugares | Google Places (só o identificador do lugar pode ser guardado; horário e nota são sempre consultados na hora) |
| Clima | Open-Meteo e alertas do INMET |
| Pagamento | AbacatePay |
| WhatsApp | API oficial da Meta |

**Capacidade medida** (teste de 13/11): até cerca de 400 pessoas ao mesmo tempo com telas rápidas; a conversa fica lenta antes disso. O que limita é a distância entre o servidor (Boston) e o banco (Califórnia).

## 13. Pendências e decisões em aberto

Dependem de você ou de terceiros:

1. Desligar o modo de teste grátis (`DEMO_FREE_MODE`) para os roteiros passarem a ser cobrados. O Pix já foi usado de verdade.
2. Habilitar cartão na AbacatePay.
3. Desligar o bot antigo (libera os lembretes diários do WhatsApp).
4. Projeto Firebase para notificação no Android nativo.
5. Publicar nas lojas (Google Play e App Store).
6. Revisão jurídica de termos, privacidade, SOS e menores.
7. Mudar banco e servidor para a mesma região (de preferência São Paulo).
8. Decidir o destino dos créditos antigos.
9. Trocar as chaves que foram coladas em conversa.
10. Na Central de Bugs: esconder a captura de tela onde o aparelho não suporta.

Previsto nas Regras Vigentes e ainda não feito (resumo): fluxo do responsável para menores; 5 idiomas e modo escuro; sala de conversa traduzida; offline; marés; votação de fotos; SOS com envio automático e contatos no servidor; histórico e download dos dados; tela de manutenção e versão mínima; eventos de fonte parceira.

## 14. O que os testes com usuários ensinaram (útil para a V2)

- A IA erra de formas diferentes a cada geração. O que deu resultado foi **conferir e corrigir por código depois de gerar**, não só melhorar a instrução dada à IA.
- **Link e evento precisam ser conferidos**: a IA inventa endereços com aparência real.
- **Menos notificação é melhor**: um resumo de manhã e só o que for importante depois.
- **Aviso tem de levar à ação**: "lugar fechado" precisa abrir a troca pronta, sem perguntar o motivo.
- **Informação do dia envelhece**: previsão e "aberto agora" têm de valer para o momento, não para o dia inteiro.
- **O PDF e outros itens escondidos em abas não são achados**: o que importa precisa estar na tela principal.
