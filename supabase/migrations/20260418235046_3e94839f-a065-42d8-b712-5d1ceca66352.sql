-- Altera o valor padrão da coluna free_credits de 2 para 3
ALTER TABLE public.customers 
ALTER COLUMN free_credits SET DEFAULT 3;