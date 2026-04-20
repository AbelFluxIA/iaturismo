ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.generated_itineraries
ADD COLUMN IF NOT EXISTS interest_focus text,
ADD COLUMN IF NOT EXISTS interest_categories text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_customers_interests ON public.customers USING GIN(interests);