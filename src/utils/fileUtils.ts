
import { supabase } from '@/integrations/supabase/client';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const uploadFile = async (
  file: File,
  userId: string,
  caseId: string,
  type: 'case' | 'reply' = 'reply'
): Promise<FileUploadResult> => {
  try {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 10MB' };
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'File type not supported' };
    }

    // Create file path with user folder structure
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${userId}/${caseId}/${type}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('case-attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    return { success: true, filePath };
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error: 'Upload failed' };
  }
};

export const getFileUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('case-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
