
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, X, FileText, Image, File } from 'lucide-react';
import { formatFileSize } from '@/utils/fileUtils';

interface FileAttachmentProps {
  files: FileList | null;
  onFilesChange: (files: FileList | null) => void;
  multiple?: boolean;
  disabled?: boolean;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  files,
  onFilesChange,
  multiple = true,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesChange(e.target.files);
  };

  const handleRemoveFile = (index: number) => {
    if (!files) return;
    
    const dt = new DataTransfer();
    for (let i = 0; i < files.length; i++) {
      if (i !== index) {
        dt.items.add(files[i]);
      }
    }
    onFilesChange(dt.files.length > 0 ? dt.files : null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (file.type === 'application/pdf' || file.type.includes('document')) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const fileArray = files ? Array.from(files) : [];

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
        disabled={disabled}
      />

      <Button
        variant="outline"
        onClick={handleFileSelect}
        disabled={disabled}
        className="gap-2"
      >
        <Paperclip className="h-4 w-4" />
        Attach Files
      </Button>

      {fileArray.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Files:</p>
          <div className="space-y-1">
            {fileArray.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getFileIcon(file)}
                  <span className="text-sm truncate">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(file.size)}
                  </Badge>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
