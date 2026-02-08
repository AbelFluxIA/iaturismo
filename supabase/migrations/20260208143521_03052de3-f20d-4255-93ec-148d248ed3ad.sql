-- Create storage bucket for travel PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-pdfs', 'travel-pdfs', true);

-- Allow public access to read PDFs
CREATE POLICY "Public can read travel PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'travel-pdfs');

-- Allow edge functions to insert PDFs (service role)
CREATE POLICY "Service role can insert travel PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'travel-pdfs');

-- Allow edge functions to update PDFs (service role)  
CREATE POLICY "Service role can update travel PDFs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'travel-pdfs');