# Sol v1: respostas da Flux ao pacote de 25/11/2026

Resposta a `Sol_Pacote_para_a_Flux_2026-11-25`, `Sol_Pendencias_do_App_para_a_Flux` e às perguntas PF-51 a PF-64. Data: 26/11/2026. Servidor `1ff5217`, app `65c8145`.

## 1. Os três ajustes legais: feitos e no ar

| Ajuste | O que existia | O que mudou | Situação |
|---|---|---|---|
| **TODO-467** Registros de acesso por 6 meses | O servidor guardava rota e horário de parte dos pedidos por 30 dias, **sem o IP**. Ou seja, não havia registro de acesso como a lei pede | Registro novo, com **IP, data e hora**, guardado por 6 meses e apagado sozinho depois | No ar desde 26/11 |
| **TODO-468** Compras por 5 anos | A exclusão da conta já mantinha o registro do pagamento, mas sem marcar nada nem ter prazo de descarte | O registro fica 5 anos, marcado como de conta excluída, e é apagado sozinho depois | No ar desde 26/11 |
| **TODO-469** Menor de 13 anos | A data de nascimento era pedida, mas qualquer idade concluía (menor de 18 ficava com conta restrita) | Menor de 13 não conclui, a conta é apagada na hora e nada fica guardado | No ar desde 26/11 |

Esforço: os três foram feitos e testados em 26/11. Não há custo novo relevante (o volume é pequeno).

### 1.1 Registros de acesso (PF-64)

- **Onde ficam:** tabela própria no banco da Sol (`sol_acessos`), separada dos logs técnicos.
- **O que é gravado:** IP de quem usa o app, data e hora, e se foi uso do app ou entrada na conta. Um registro por conta e por IP a cada hora (o app conversa com o servidor a cada poucos segundos; gravar cada pedido não acrescentaria informação).
- **Conta excluída:** o telefone sai do registro; ficam o IP, a hora e uma referência anônima da conta. O registro continua até completar 6 meses.
- **Limpeza:** uma vez por dia, apaga o que passou de 6 meses.
- **Conferido no ar:** um acesso feito pelo site grava o IP de quem acessou, não o do servidor intermediário.
- **Limites, para o David saber:**
  - Os registros começam em 26/11/2026. Não há IP dos acessos anteriores.
  - Conversa pelo WhatsApp não tem IP (a Meta não informa). O registro cobre o app e o site.
  - Os critérios de aceite 1 e 2 (existir aos 6 meses, sumir depois) foram testados com registros de data antiga criados para o teste.

### 1.2 Registros de compra (o que o app faz na exclusão)

- **Fica:** valor, data, meio de pagamento, identificador do pagamento (Pix ou checkout), tipo do item e o número de telefone.
- **Sai:** o conteúdo do pedido (destino e datas do roteiro comprado), o código do Pix e o link do checkout.
- **Entrar de novo com o mesmo número:** cria uma conta nova, sem Guia e sem compras. Testado.
- **Limpeza:** apaga registros de compra com mais de 5 anos, contados da data do pagamento.

**Dois pontos para o David decidir:**
1. **Com ou sem o telefone?** `Sol_Pendencias_do_App` pede o registro "separado da conta"; o texto 1.1 da privacidade diz "ligados ao número de telefone da conta". Hoje o telefone **fica** (como no texto 1.1). Tirar é uma linha de mudança.
2. **5 anos a partir de quê?** O título do TODO-468 diz "5 anos após excluir a conta"; o critério de aceite diz "registro com mais de 5 anos". Implementado pelo critério: 5 anos da data do pagamento. Se for da data da exclusão, também é uma linha.

### 1.3 Menor de 13 anos

- Data que dá menos de 13 anos: aparece "Você ainda não pode usar a Sol. Quando puder, a gente te espera por aqui.", o app sai da conta, e o servidor apaga a conta na hora (nome, aceite dos termos, tudo).
- A tela da data não mostra a idade mínima, e a mensagem de recusa também não.
- No máximo 3 datas recusadas em 24 horas, por aparelho e por número. Na 4ª tentativa, mesmo com data de adulto: "Muitas tentativas com datas diferentes. Tente de novo amanhã ou fale com o suporte da Sol."
- 13 a 17 anos: conta restrita. O servidor recusa roteiro e compra (antes só a tela barrava), e a pessoa não consegue trocar a data sozinha para virar adulta.
- 18 ou mais: segue normal.

**O que NÃO existe (RA-MEN-02 a 05):** o menor informar o responsável, o responsável confirmar pelo WhatsApp, o envio e a conferência do documento, e a aprovação de compra. Hoje a conta de 13 a 17 fica restrita e não tem como ser liberada. É uma construção à parte, e várias regras dela ainda estão "A definir" (RA-MEN-04, 10 e 14).

## 2. Páginas legais, versão 1.1

- **Montadas e conferidas, mas não publicadas**, como pedido (esperando a liberação do David e a leitura do advogado). Estão em `docs/paginas-legais-v1.1/` no repositório do app. No ar continua a versão 1.0.
- Publicar leva poucos minutos depois do "pode".
- Conferido: nenhum `{{...}}`, nenhum "Crashlytics", nenhum "Apagar meus dados", nenhum SMS no login (sobra só "SMS do seu celular" no SOS, que está certo).

**Ajustes que mantive sobre o texto 1.1, pelo mesmo motivo de antes** (o texto manda fazer algo que não existe):

| Página | Texto 1.1 | Como fica |
|---|---|---|
| Excluir conta, passo 1 | "Informe o número de WhatsApp cadastrado na Sol." | "Toque em Pedir o código pelo WhatsApp, no fim desta página. O WhatsApp abre com uma mensagem pronta para a Sol: envie do número cadastrado." |
| Excluir conta, passo 2 | "Digite o código de 6 dígitos que enviamos pelo WhatsApp." | "A Sol responde com um código de 6 dígitos. Digite o código nesta página." |
| Suporte, "Como entro no app?" | "Informe o número de WhatsApp e digite o código de 6 dígitos que enviamos." | "Toque em 'Entrar com meu WhatsApp'. O WhatsApp abre com uma mensagem pronta para a Sol: envie e digite no app o código de 6 dígitos que ela responde." |

**Atenção: são dois números de WhatsApp diferentes.** O texto 1.1 dá (11) 98299-6711 como "WhatsApp da Sol". O número que responde pela Sol (códigos de entrada e de exclusão, conversa, Guia) é outro: +55 47 99614-1245. Na página de exclusão montada, o código é pedido ao número da Sol (47) e a ajuda para quem não recebe o código aponta para o suporte (11). Se a regra é "o mesmo WhatsApp em todo lugar", precisa decidir: ou o texto chama o (11) de "WhatsApp de suporte", ou o suporte passa a ser pelo número da Sol.

**PF-63 (SMS):** não existe SMS em lugar nenhum. O formulário de exclusão publicado nunca teve o botão, e a API não tem o parâmetro `canal`. Nada a remover.

## 3. Respostas às perguntas

- **PF-51.** Guarda a data de nascimento (cadastro). Não guarda CPF, e-mail nem documento.
- **PF-52.** (a) Feito (seção 1.3). (b) Na v1 não há interação entre usuários nem localização compartilhada entre contas, então não há o que restringir. (c) Sinalização de idade do Android: não avaliado; depende de o app estar na Play Store.
- **PF-54.** Sim. Antes do pedido do Android há uma tela do app dizendo que, quando ligada, a Sol registra a localização "mesmo com o app fechado, só nos dias de uma viagem com roteiro", e orientando a escolher "Permitir o tempo todo". Aparece no cadastro e em Perfil → Localização durante a viagem. O texto não é palavra por palavra o da seção 10 de `Sol_Publicacao_nas_Lojas`; se precisar ser idêntico, é troca rápida.
- **PF-55.** Sim, pede as duas. Lista completa na PF-13 do relatório anterior; nada mudou no pacote.
- **PF-56.** Não pelo servidor. No SOS, a posição vai na mensagem que a própria pessoa envia pelo WhatsApp ou SMS do celular.
- **PF-57 e PF-58.** **Não consigo fazer daqui:** exige um Android de verdade na mão. O que deixo pronto: a conta de teste com roteiro e Guia (PF-03, abaixo) e o disparo de um alerta de teste para ela na hora da gravação, é só combinar o horário. Quem tiver o aparelho grava a tela seguindo `Sol_Roteiro_Video_Localizacao_Play`.
- **PF-59.** Viável. Unir o número com e sem o 9 o servidor já faz ao identificar a conta. Marcar contas internas e de teste e filtrar as métricas do painel é trabalho pequeno; faço quando for prioridade.
- **PF-60.** Ver seção 4.
- **PF-61.** Ver seção 5.
- **PF-62.** A Flux não administra `www.tripsol.com.br`: o projeto não está neste servidor nem na conta de código que usamos. É outro projeto na Vercel; quem criou o site (ou quem tem a conta da Vercel dele) é quem consegue pôr a regra. Com o acesso, a mudança leva minutos. As páginas e o formulário já aceitam os dois endereços.
- **PF-63.** Respondida na seção 2.
- **PF-64.** Respondida na seção 1.1.
- **Rótulo do ícone.** Dá para trocar "Sol" pelo nome completo, mas o Android corta o texto embaixo do ícone em cerca de 12 letras ("Sol: Sua via…"). Recomendo manter "Sol" no ícone. No PWA o nome completo já aparece na instalação.
- **PF-03 (conta de teste).** Feita em 26/11: cadastro concluído, termos aceitos, Guia ligada sem data de fim e um roteiro de 5 dias em João Pessoa (26 a 30/11). O roteiro tem data: antes de mandar para a revisão do Google eu gero um novo para a semana do envio.

## 4. Google Play Faturamento (PF-60)

**O que precisa ser construído:**
1. No app Android: biblioteca de cobrança do Google, tela de pagamento com Google e Pix lado a lado, estado "Aguardando confirmação", restaurar compras.
2. No servidor: conferir o token de cada compra na API do Google, conceder o item, consumir o item, receber os avisos do Google (devolução e estorno) e conciliação diária.
3. Painel: lista das compras do Google.

**O que depende do David antes de começar:**
- Perfil de pagamentos no Play Console e os quatro produtos criados com os preços em reais.
- Uma conta de serviço do Google com acesso à API do Play, entregue à Flux.
- Inscrição no programa de escolha de faturamento (Google e Pix juntos).
- Contas de teste de licença e um Android de verdade para testar a compra.
- Decisão do TODO-21 (Guia de 30 dias como compra avulsa ou assinatura). Recomendo começar como compra avulsa de 30 dias, que é o que o Pix já faz; assinatura acrescenta renovação, cancelamento e mais avisos.

**Esforço:** a parte de código (app e servidor), sem assinatura, é de cerca de uma semana de trabalho depois que os itens acima existirem. A compra só pode ser testada de verdade com o app instalado pela Play Store (teste interno), então o prazo real depende mais das liberações do Google do que do código. Com assinatura, acrescentar alguns dias.

**Ponto de atenção:** no programa de escolha, cada venda por Pix feita dentro do app Android também precisa ser informada ao Google. Não conferi os detalhes dessa obrigação; confiro na documentação do Google quando a inscrição for feita.

## 5. Dados que saem para outros provedores (PF-61)

Conferido no código em 26/11. "Guarda ou treina" **não foi conferido** nos contratos de cada provedor: precisa ser lido nos termos de cada um (ponto para o advogado).

| Provedor | O que recebe | Recebe telefone? |
|---|---|---|
| **OpenAI** | Texto da conversa com a Sol e com a Guia (inclui o primeiro nome, o roteiro resumido, a cidade e, com a Guia, as coordenadas de onde a pessoa está); a foto enviada, para o comentário do álbum; o áudio gravado, para virar texto; o texto do tradutor | Não |
| **Google Gemini** | Pedido de roteiro (primeiro nome, destino, datas, grupo, interesses, orçamento, hospedagem); perguntas de busca da Guia (com cidade, coordenadas, hora e orçamento) | Não |
| **Meta (WhatsApp)** | Número de telefone e o conteúdo das mensagens trocadas pelo WhatsApp, incluindo os códigos de acesso | Sim |
| **Google Maps / Places** | Nome de lugares e coordenadas | Não |
| **AbacatePay** | Valor e referência da compra | Não |
| **Supabase** (banco e arquivos) e **Vercel** (site) | Tudo o que a Sol guarda passa por eles como hospedagem | Sim (hospedagem) |
| **Pexels** | Nome do destino | Não |
| **Open-Meteo, INMET** | Coordenadas da cidade | Não |
| **OpenStreetMap, OSRM, OpenFreeMap, Wikimedia** (direto do aparelho) | Coordenadas ou nome do lugar, para endereço, rota, mapa e foto | Não |

Para a declaração do Play: conversa, foto, áudio e localização aproximada e precisa saem para provedores de IA que tratam os dados em nome da Sol.

## 6. O que continua com a Flux

| Item | Situação |
|---|---|
| Publicar as páginas 1.1 | Pronto para publicar; aguardando o "pode" do David |
| Regra em `www.tripsol.com.br` | Depende de quem administra aquele site |
| Google Play Faturamento | Aguardando os itens da seção 4 |
| Vídeo da localização em segundo plano | Precisa de um Android de verdade; a Flux apoia com a conta e o alerta de teste |
| Fluxo do responsável pelo menor (RA-MEN-02 a 05) | Não construído; aguardando as regras "A definir" |

## 7. Também foi corrigido desde o último relatório (25 e 26/11)

Para atualizar as respostas anteriores:
- **PF-34:** a Guia agora tem regra de emergência (190, 192, 193 na primeira linha) e não indica dose de remédio.
- **O link público do roteiro** (`/r/código`) não abria para visitante; corrigido.
- **Termos e maioridade** passaram a valer no servidor para gerar roteiro e pagar.
- **Nome do app:** "Sol: Sua viagem inteligente" no título e na instalação do PWA.
- **Arquivo da loja:** o de hoje é a versão 1.4, código 5 (`sol-android-loja-v5.aab`), já com o bloqueio de menor de 13 anos.
