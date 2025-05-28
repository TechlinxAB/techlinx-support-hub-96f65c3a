
import React from 'react';
import { NewsBlockType } from '@/types/companyNews';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NewsBlockTypeSelectorProps {
  value: NewsBlockType;
  onChange: (type: NewsBlockType) => void;
}

export const NewsBlockTypeSelector: React.FC<NewsBlockTypeSelectorProps> = ({
  value,
  onChange
}) => {
  const blockTypes: { value: NewsBlockType; label: string }[] = [
    { value: 'text', label: 'Text Block' },
    { value: 'heading', label: 'Heading' },
    { value: 'card', label: 'Card' },
    { value: 'faq', label: 'FAQ' },
    { value: 'links', label: 'Links' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'image', label: 'Image' },
    { value: 'notice', label: 'Notice' }
  ];

  return (
    <Select value={value} onValueChange={(value) => onChange(value as NewsBlockType)}>
      <SelectTrigger>
        <SelectValue placeholder="Select block type" />
      </SelectTrigger>
      <SelectContent>
        {blockTypes.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
