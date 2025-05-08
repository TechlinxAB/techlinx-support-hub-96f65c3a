
-- Create a storage bucket for case attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-attachments', 'Case Attachments', true)
ON CONFLICT DO NOTHING;

-- Create policies to allow authenticated users to access the files
CREATE POLICY "Allow authenticated users to read case attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'case-attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload case attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case-attachments');

-- Create a table to store attachments metadata
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reply_id UUID NOT NULL REFERENCES public.replies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  CONSTRAINT fk_reply
    FOREIGN KEY (reply_id)
    REFERENCES public.replies(id)
    ON DELETE CASCADE
);

-- Create RLS policies for attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Everyone can view attachments
CREATE POLICY "Anyone can view attachments" 
ON public.attachments
FOR SELECT
USING (true);

-- Only authenticated users can insert attachments
CREATE POLICY "Authenticated users can insert attachments" 
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add any missing indexes
CREATE INDEX IF NOT EXISTS attachments_reply_id_idx ON public.attachments (reply_id);
