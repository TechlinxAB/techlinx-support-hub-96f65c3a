
import React from 'react';
import { CompanyNewsBlock } from '@/types/companyNews';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';

interface NewsBlockEditorProps {
  block: CompanyNewsBlock;
  editedData: any;
  onFormChange: (field: string, value: any) => void;
  onNestedContentChange: (path: string[], value: any) => void;
  onDelete?: () => void;
}

export const NewsBlockEditor: React.FC<NewsBlockEditorProps> = ({
  block,
  editedData,
  onFormChange,
  onNestedContentChange,
  onDelete
}) => {
  const renderBlockTypeFields = () => {
    switch (block.type) {
      case 'text':
        return (
          <div>
            <Label htmlFor="text-content">Text Content</Label>
            <Textarea
              id="text-content"
              value={editedData?.content?.text || ''}
              onChange={(e) => onNestedContentChange(['text'], e.target.value)}
              placeholder="Enter your text content here..."
              rows={6}
            />
          </div>
        );

      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="heading-text">Heading Text</Label>
              <Input
                id="heading-text"
                value={editedData?.content?.text || ''}
                onChange={(e) => onNestedContentChange(['text'], e.target.value)}
                placeholder="Enter heading text"
              />
            </div>
            <div>
              <Label htmlFor="heading-level">Heading Level</Label>
              <select
                id="heading-level"
                value={editedData?.content?.level || 2}
                onChange={(e) => onNestedContentChange(['level'], parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value={1}>H1 - Large</option>
                <option value={2}>H2 - Medium</option>
                <option value={3}>H3 - Small</option>
              </select>
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="card-title">Card Title</Label>
              <Input
                id="card-title"
                value={editedData?.content?.title || ''}
                onChange={(e) => onNestedContentChange(['title'], e.target.value)}
                placeholder="Enter card title"
              />
            </div>
            <div>
              <Label htmlFor="card-content">Card Content</Label>
              <Textarea
                id="card-content"
                value={editedData?.content?.content || ''}
                onChange={(e) => onNestedContentChange(['content'], e.target.value)}
                placeholder="Enter card content"
                rows={4}
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={editedData?.content?.url || ''}
                onChange={(e) => onNestedContentChange(['url'], e.target.value)}
                placeholder="Enter image URL"
              />
            </div>
            <div>
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input
                id="image-alt"
                value={editedData?.content?.alt || ''}
                onChange={(e) => onNestedContentChange(['alt'], e.target.value)}
                placeholder="Enter alt text for accessibility"
              />
            </div>
            <div>
              <Label htmlFor="image-caption">Caption (optional)</Label>
              <Input
                id="image-caption"
                value={editedData?.content?.caption || ''}
                onChange={(e) => onNestedContentChange(['caption'], e.target.value)}
                placeholder="Enter image caption"
              />
            </div>
          </div>
        );

      case 'faq':
        const faqItems = editedData?.content?.items || [];
        return (
          <div className="space-y-4">
            <Label>FAQ Items</Label>
            {faqItems.map((item: any, index: number) => (
              <div key={index} className="border rounded-md p-4 space-y-2">
                <div>
                  <Label>Question {index + 1}</Label>
                  <Input
                    value={item.question || ''}
                    onChange={(e) => {
                      const newItems = [...faqItems];
                      newItems[index] = { ...newItems[index], question: e.target.value };
                      onNestedContentChange(['items'], newItems);
                    }}
                    placeholder="Enter question"
                  />
                </div>
                <div>
                  <Label>Answer {index + 1}</Label>
                  <Textarea
                    value={item.answer || ''}
                    onChange={(e) => {
                      const newItems = [...faqItems];
                      newItems[index] = { ...newItems[index], answer: e.target.value };
                      onNestedContentChange(['items'], newItems);
                    }}
                    placeholder="Enter answer"
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newItems = faqItems.filter((_: any, i: number) => i !== index);
                    onNestedContentChange(['items'], newItems);
                  }}
                >
                  Remove Item
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const newItems = [...faqItems, { question: '', answer: '' }];
                onNestedContentChange(['items'], newItems);
              }}
            >
              Add FAQ Item
            </Button>
          </div>
        );

      case 'notice':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="notice-type">Notice Type</Label>
              <select
                id="notice-type"
                value={editedData?.content?.type || 'info'}
                onChange={(e) => onNestedContentChange(['type'], e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
            </div>
            <div>
              <Label htmlFor="notice-title">Notice Title</Label>
              <Input
                id="notice-title"
                value={editedData?.content?.title || ''}
                onChange={(e) => onNestedContentChange(['title'], e.target.value)}
                placeholder="Enter notice title"
              />
            </div>
            <div>
              <Label htmlFor="notice-message">Notice Message</Label>
              <Textarea
                id="notice-message"
                value={editedData?.content?.message || ''}
                onChange={(e) => onNestedContentChange(['message'], e.target.value)}
                placeholder="Enter notice message"
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <Label htmlFor="content">Content (JSON)</Label>
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
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="title">Block Title</Label>
          <Input
            id="title"
            value={editedData?.title || ''}
            onChange={(e) => onFormChange('title', e.target.value)}
            placeholder="Enter block title"
          />
        </div>
        
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="ml-4"
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Block
          </Button>
        )}
      </div>
      
      {renderBlockTypeFields()}
    </div>
  );
};
