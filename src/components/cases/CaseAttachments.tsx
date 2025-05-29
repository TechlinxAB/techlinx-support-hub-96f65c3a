import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Image, File, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatFileSize } from '@/utils/fileUtils';
import { useToast } from '@/components/ui/use-toast';

interface CaseAttachment {
  id: string;
  file_name: string;
  file_path: string;
  content_type: string;
  size: number;
  created_at: string;
  reply_id?: string;
}

interface CaseAttachmentsProps {
  caseId: string;
}

export const CaseAttachments: React.FC<CaseAttachmentsProps> = ({ caseId }) => {
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const { data, error } = await supabase
          .from('case_attachments')
          .select('*')
          .eq('case_id', caseId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setAttachments(data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [caseId]);

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (contentType === 'application/pdf' || contentType.includes('document')) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const handleDownload = async (attachment: CaseAttachment) => {
    try {
      console.log('Attempting to download attachment:', attachment);
      
      // Get the public URL directly since the bucket is now public
      const { data } = await supabase.storage
        .from('case-attachments')
        .getPublicUrl(attachment.file_path);
      
      if (!data?.publicUrl) {
        toast({
          title: "Download failed",
          description: "Could not generate download link.",
          variant: "destructive",
        });
        return;
      }
      
      // Fetch the file as a blob with proper headers to force download
      const response = await fetch(data.publicUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Create a blob URL and force download
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element for download
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = attachment.file_name;
      downloadLink.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the blob URL
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      toast({
        title: "Download started",
        description: `Downloading ${attachment.file_name}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the file.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return null;
  }

  const caseAttachments = attachments.filter(att => !att.reply_id);
  const replyAttachments = attachments.filter(att => att.reply_id);

  return (
    <div className="space-y-4">
      {caseAttachments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Case Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {caseAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(attachment.content_type)}
                    <div>
                      <p className="font-medium text-sm">{attachment.file_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(attachment.size)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
