-- Create table to store PDF generation metadata for dashboard
CREATE TABLE public.generated_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  destination TEXT,
  traveler_name TEXT,
  pdf_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  text_length INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries on dashboard
CREATE INDEX idx_generated_itineraries_created_at ON public.generated_itineraries(created_at DESC);

-- Enable RLS but allow service role to insert (edge function uses service role)
ALTER TABLE public.generated_itineraries ENABLE ROW LEVEL SECURITY;

-- Policy for service role to insert records (edge function)
CREATE POLICY "Service role can insert itineraries"
ON public.generated_itineraries
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy for anyone to read (public dashboard, or you can restrict later)
CREATE POLICY "Anyone can view itineraries"
ON public.generated_itineraries
FOR SELECT
USING (true);