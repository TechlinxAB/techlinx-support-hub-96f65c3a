
import React from 'react';
import { CompanyNewsBlock } from '@/types/companyNews';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NewsBlockEditorProps {
  block: CompanyNewsBlock;
  editedData: any;
  onFormChange: (field: string, value: any) => void;
  onNestedContentChange: (path: string[], value: any) => void;
}

export const NewsBlockEditor: React.FC<NewsBlockEditorProps> = ({
  block,
  editedData,
  onFormChange,
  onNestedContentChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={editedData?.title || ''}
          onChange={(e) => onFormChange('title', e.target.value)}
          placeholder="Enter block title"
        />
      </div>
      
      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={JSON.stringify(editedData?.content || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onFormChange('content', parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder="Enter block content (JSON format)"
          rows={10}
        />
      </div>
    </div>
  );
};
