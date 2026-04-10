
-- Create photo_murals table
CREATE TABLE public.photo_murals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  title TEXT,
  description TEXT,
  share_code TEXT NOT NULL UNIQUE,
  cover_photo_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mural_photos table
CREATE TABLE public.mural_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mural_id UUID NOT NULL REFERENCES public.photo_murals(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  narrative_text TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on share_code for fast lookups
CREATE INDEX idx_photo_murals_share_code ON public.photo_murals(share_code);
CREATE INDEX idx_mural_photos_mural_id ON public.mural_photos(mural_id);
CREATE INDEX idx_photo_murals_phone ON public.photo_murals(phone);

-- Enable RLS
ALTER TABLE public.photo_murals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_photos ENABLE ROW LEVEL SECURITY;

-- Public SELECT for murals (so shared links work)
CREATE POLICY "Anyone can view murals" ON public.photo_murals FOR SELECT USING (true);
CREATE POLICY "Anyone can view mural photos" ON public.mural_photos FOR SELECT USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can insert murals" ON public.photo_murals FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update murals" ON public.photo_murals FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert mural photos" ON public.mural_photos FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update mural photos" ON public.mural_photos FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Storage bucket for mural photos
INSERT INTO storage.buckets (id, name, public) VALUES ('mural-photos', 'mural-photos', true);

-- Public read access for mural photos bucket
CREATE POLICY "Public read access for mural photos" ON storage.objects FOR SELECT USING (bucket_id = 'mural-photos');

-- Service role can upload to mural photos bucket
CREATE POLICY "Service role can upload mural photos" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'mural-photos');
