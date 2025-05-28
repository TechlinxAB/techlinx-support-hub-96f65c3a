
import React from 'react';
import { CompanyNewsBlock } from '@/types/companyNews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NewsBlockPreviewProps {
  block: CompanyNewsBlock;
}

export const NewsBlockPreview: React.FC<NewsBlockPreviewProps> = ({ block }) => {
  const renderContent = () => {
    switch (block.type) {
      case 'text':
        return <p>{block.content?.text || 'No content'}</p>;
      case 'heading':
        const level = block.content?.level || 2;
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag className="font-bold">{block.content?.text || 'No heading'}</HeadingTag>;
      case 'card':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{block.content?.title || 'Card Title'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{block.content?.content || 'Card content'}</p>
            </CardContent>
          </Card>
        );
      default:
        return <pre className="text-sm">{JSON.stringify(block.content, null, 2)}</pre>;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="mb-2 text-sm text-gray-600">
        Preview ({block.type})
      </div>
      {renderContent()}
    </div>
  );
};
