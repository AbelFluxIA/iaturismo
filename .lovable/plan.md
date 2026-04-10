

# Mural de Fotos — Plano Revisado

## Mudança principal
A IA que gera legendas e narrativa será o próprio sistema (via Lovable AI Gateway nas Edge Functions), não o n8n. O n8n apenas envia as fotos brutas.

## Fluxo

```text
WhatsApp → n8n (recebe foto)
  → POST /upload-mural-photo { phone, mural_title, photo_base64 }
  → Edge Function salva foto no storage
  → Edge Function chama Lovable AI para gerar legenda e texto narrativo
  → Retorna link do mural

POST /generate-mural-pdf { mural_id }
  → Edge Function busca fotos + narrativas
  → Gera PDF linha do tempo
  → Retorna URL do PDF
```

## O que será criado

### 1. Banco de dados (2 tabelas)

**`photo_murals`** — um mural por cliente/viagem
- `id`, `phone`, `title`, `description`, `share_code` (8 chars único), `cover_photo_url`, `pdf_url`, `created_at`

**`mural_photos`** — fotos individuais
- `id`, `mural_id` (FK), `photo_url`, `caption` (gerada pela IA), `narrative_text` (gerado pela IA), `order_index`, `created_at`

RLS: SELECT público (link funciona sem auth), INSERT/UPDATE via service_role.

### 2. Storage
- Novo bucket **`mural-photos`** (público)

### 3. Edge Functions (2 novas)

**`upload-mural-photo`**
- Recebe `{ phone, mural_title, photo_base64 }`
- Cria mural se não existir (gera share_code)
- Salva imagem no storage
- Chama Lovable AI (Gemini 2.5 Flash) para analisar a foto e gerar:
  - `caption`: legenda curta descritiva
  - `narrative_text`: texto narrativo como se fosse uma história de viagem
- Salva tudo no banco
- Retorna `{ mural_url, share_code, caption }`

**`generate-mural-pdf`**
- Recebe `{ mural_id }`
- Busca fotos em ordem com legendas e narrativas
- Gera PDF estilo linha do tempo (foto + narrativa alternando)
- Salva no storage, atualiza `pdf_url` no mural
- Retorna URL do PDF

### 4. Página web `/mural/:shareCode`
- Galeria bonita com as fotos
- Legendas da IA embaixo de cada foto
- Título da viagem no topo
- Botão para baixar PDF (se existir)
- Responsivo para mobile

### 5. Painel admin — aba "Murais"
- Lista todos os murais
- Ver fotos de cada mural
- Copiar link de compartilhamento
- Botão para gerar/regenerar PDF
- Botão para regenerar legendas de uma foto específica

## Detalhes técnicos

- A IA usará `google/gemini-2.5-flash` via Lovable AI Gateway para analisar cada foto e gerar legendas/narrativa em português
- O prompt pedirá para a IA descrever a foto no contexto de uma viagem, criando uma narrativa envolvente
- Fotos recebidas em base64, convertidas e salvas no bucket `mural-photos`
- O PDF narrativo terá layout de linha do tempo com fotos e texto alternando

