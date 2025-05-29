
-- Create storage bucket for case attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-attachments', 'case-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can upload case attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view case attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'case-attachments');

CREATE POLICY "Users can delete their own case attachments" ON storage.objects
FOR DELETE USING (bucket_id = 'case-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
