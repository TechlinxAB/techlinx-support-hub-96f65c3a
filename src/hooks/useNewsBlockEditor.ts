
import { useState, useEffect, useRef } from 'react';
import { CompanyNewsBlock, NewsBlockType } from '@/types/companyNews';
import { useOptimizedNewsBlockSave } from './useOptimizedNewsBlockSave';

interface UseNewsBlockEditorOptions {
  onSaveSuccess?: () => void; 
  onSaveError?: (error: Error) => void;
}

export const useNewsBlockEditor = (
  blocks: CompanyNewsBlock[],
  options?: UseNewsBlockEditorOptions
) => {
  // State for selected block
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editedBlockData, setEditedBlockData] = useState<any>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialSelectedBlockId, setInitialSelectedBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('edit');

  // Get the save function from our optimized hook
  const { saving, debouncedSave, saveNewsBlock } = useOptimizedNewsBlockSave();

  // Selected block
  const selectedBlock = blocks.find(block => block.id === selectedBlockId);

  // Function to get default content based on block type
  const getDefaultContent = (type: NewsBlockType) => {
    switch (type) {
      case 'heading':
        return { level: 2, text: 'New Heading' };
      case 'text':
        return { text: 'Enter your text here...' };
      case 'card':
        return {
          title: 'Card Title',
          content: 'Card content goes here...',
          icon: '',
          action: { label: 'Learn More', link: '#' }
        };
      case 'faq':
        return {
          items: [
            { question: 'Frequently Asked Question', answer: 'Answer to the question.' }
          ]
        };
      case 'links':
        return {
          links: [
            { label: 'Link 1', url: '#', icon: '' },
            { label: 'Link 2', url: '#', icon: '' }
          ]
        };
      case 'dropdown':
        return {
          title: 'Dropdown Title',
          items: [
            { label: 'Item 1', content: 'Content for item 1' },
            { label: 'Item 2', content: 'Content for item 2' }
          ]
        };
      case 'image':
        return { url: '', alt: 'Image description', caption: '' };
      case 'notice':
        return { 
          type: 'info', 
          title: 'Notice Title', 
          message: 'Notice message goes here...' 
        };
      default:
        return {};
    }
  };

  // Initialize edited block data when selection changes
  useEffect(() => {
    if (selectedBlock && selectedBlockId !== initialSelectedBlockId) {
      // Initialize with default content based on block type if content is undefined
      const defaultContent = getDefaultContent(selectedBlock.type);
      
      // Make sure we have content with the correct structure
      const blockContent = selectedBlock.content || defaultContent;
      
      setEditedBlockData({
        title: selectedBlock.title,
        content: blockContent,
        isPublished: selectedBlock.isPublished
      });
      setHasUnsavedChanges(false);
      setInitialSelectedBlockId(selectedBlockId);
    }
  }, [selectedBlockId, initialSelectedBlockId, selectedBlock]);

  // When blocks array changes (after fetch/refetch), update the selected block data
  useEffect(() => {
    if (selectedBlockId && initialSelectedBlockId === selectedBlockId) {
      const currentBlock = blocks.find(b => b.id === selectedBlockId);
      if (currentBlock && !hasUnsavedChanges) {
        const defaultContent = getDefaultContent(currentBlock.type);
        const blockContent = currentBlock.content || defaultContent;
        
        setEditedBlockData({
          title: currentBlock.title,
          content: blockContent,
          isPublished: currentBlock.isPublished
        });
      }
    }
  }, [blocks, selectedBlockId, initialSelectedBlockId, hasUnsavedChanges]);

  // Auto-select first block when blocks load
  useEffect(() => {
    if (blocks.length > 0 && !selectedBlockId) {
      setSelectedBlockId(blocks[0].id);
    }
  }, [blocks, selectedBlockId]);

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    setEditedBlockData(prev => {
      if (field.startsWith('content.')) {
        const contentField = field.replace('content.', '');
        return {
          ...prev,
          content: {
            ...prev.content,
            [contentField]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
    setHasUnsavedChanges(true);
  };

  // Complex nested object change handler
  const handleNestedContentChange = (path: string[], value: any) => {
    setEditedBlockData((prev: any) => {
      const newContent = { ...prev.content };
      
      let current = newContent;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (Array.isArray(current[key])) {
          // If it's an array, make a copy
          current[key] = [...current[key]];
          current = current[key];
        } else {
          // If it's an object, make a copy
          current[key] = { ...current[key] };
          current = current[key];
        }
      }
      
      current[path[path.length - 1]] = value;
      
      return {
        ...prev,
        content: newContent
      };
    });
    
    setHasUnsavedChanges(true);
  };

  // Save current block
  const saveCurrentBlock = async () => {
    if (!selectedBlockId || !selectedBlock || !hasUnsavedChanges) return;
    
    try {
      await saveNewsBlock(
        selectedBlockId, 
        {
          title: editedBlockData.title,
          content: editedBlockData.content
        }, 
        {
          onSuccess: () => {
            setHasUnsavedChanges(false);
            options?.onSaveSuccess?.();
          },
          onError: (error) => {
            options?.onSaveError?.(error);
          }
        }
      );
    } catch (error) {
      console.error('Error saving block:', error);
      options?.onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Auto-save when changes are made
  useEffect(() => {
    if (selectedBlockId && hasUnsavedChanges) {
      const cleanup = debouncedSave(
        selectedBlockId, 
        {
          title: editedBlockData.title,
          content: editedBlockData.content
        },
        1500,
        {
          onSuccess: () => {
            setHasUnsavedChanges(false);
            options?.onSaveSuccess?.();
          },
          onError: (error) => {
            options?.onSaveError?.(error);
          }
        }
      );
      
      return cleanup;
    }
  }, [editedBlockData, hasUnsavedChanges, selectedBlockId, debouncedSave, options]);

  return {
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    editedBlockData,
    hasUnsavedChanges,
    saving,
    activeTab,
    setActiveTab,
    handleFormChange,
    handleNestedContentChange,
    saveCurrentBlock,
    getDefaultContent
  };
};
