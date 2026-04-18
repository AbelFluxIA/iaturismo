-- Adiciona coluna phone para vincular roteiros aos clientes
ALTER TABLE public.generated_itineraries 
ADD COLUMN IF NOT EXISTS phone text;

-- Índice para buscas rápidas por cliente
CREATE INDEX IF NOT EXISTS idx_generated_itineraries_phone 
ON public.generated_itineraries(phone);

CREATE INDEX IF NOT EXISTS idx_generated_itineraries_created_at 
ON public.generated_itineraries(created_at DESC);