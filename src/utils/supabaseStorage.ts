
import { supabase } from '@/integrations/supabase/client';

// Helper for file uploads
export const uploadAttachment = async (file: File, caseId: string, replyId: string) => {
  try {
    // Create a unique file path including the case and reply IDs
    const filePath = `${caseId}/${replyId}/${file.name}`;
    
    // Upload the file to storage
    const { data, error } = await supabase
      .storage
      .from('case-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    // Return the file path and metadata
    return {
      path: filePath,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};

// Helper to get a public URL for an attachment
export const getAttachmentUrl = (filePath: string) => {
  const { data } = supabase
    .storage
    .from('case-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};
