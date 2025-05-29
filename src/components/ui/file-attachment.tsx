
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, X, Upload, FileText, Image, File } from 'lucide-react';
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
  const [dragOver, setDragOver] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      onFilesChange(droppedFiles);
    }
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
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? handleFileSelect : undefined}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {multiple ? 'Click to select files or drag and drop' : 'Click to select a file or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOC, DOCX, XLS, XLSX, Images (Max 10MB each)
          </p>
        </div>
      </div>

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
