import { useState, useEffect, useRef } from 'react';
import { CompanyNewsBlock, NewsBlockType } from '@/types/companyNews';
import { useOptimizedNewsBlockSave } from './useOptimizedNewsBlockSave';
import { toast } from 'sonner';

interface UseNewsBlockEditorOptions {
  onSaveSuccess?: () => void; 
  onSaveError?: (error: Error) => void;
  updateLocalBlock?: (block: Partial<CompanyNewsBlock> & { id: string }) => void;
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
  const [localSaving, setLocalSaving] = useState(false);
  
  // Track manual save in progress
  const manualSaveInProgress = useRef(false);
  const lastAutoSaveAttempt = useRef<number>(0);
  const AUTO_SAVE_THROTTLE = 5000; // Increased to 5 seconds between auto-save attempts

  // Get the save function from our optimized hook
  const { saving, debouncedSave, saveNewsBlock, isSaving } = useOptimizedNewsBlockSave();

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

  // Save current block with enhanced feedback and optimistic updates
  const saveCurrentBlock = async () => {
    if (!selectedBlockId || !selectedBlock || !hasUnsavedChanges) return;
    if (manualSaveInProgress.current) return;
    
    manualSaveInProgress.current = true;
    setLocalSaving(true);
    
    // Apply optimistic update to local state immediately
    if (options?.updateLocalBlock) {
      options.updateLocalBlock({
        id: selectedBlockId,
        title: editedBlockData.title,
        content: editedBlockData.content
      });
    }
    
    try {
      await saveNewsBlock(
        selectedBlockId, 
        {
          title: editedBlockData.title,
          content: editedBlockData.content
        }, 
        {
          showToast: true,
          onStart: () => {
            setLocalSaving(true);
          },
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
      toast.error("Could not save changes", { 
        description: "Please try again",
        duration: 5000
      });
      options?.onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLocalSaving(false);
      manualSaveInProgress.current = false;
    }
  };

  // Auto-save when changes are made with improved throttling and optimistic updates
  useEffect(() => {
    if (selectedBlockId && hasUnsavedChanges) {
      // Throttle auto-save attempts much more aggressively
      const now = Date.now();
      if (now - lastAutoSaveAttempt.current < AUTO_SAVE_THROTTLE) {
        return;
      }
      
      lastAutoSaveAttempt.current = now;
      
      // Apply optimistic update first for better UX
      if (options?.updateLocalBlock) {
        options.updateLocalBlock({
          id: selectedBlockId,
          title: editedBlockData.title,
          content: editedBlockData.content
        });
      }
      
      const cleanup = debouncedSave(
        selectedBlockId, 
        {
          title: editedBlockData.title,
          content: editedBlockData.content
        },
        3000, // Increased debounce time to reduce save frequency
        {
          showToast: false, // Don't show toast for auto-saves
          onStart: () => {
            console.log("Auto-save starting...");
          },
          onSuccess: () => {
            setHasUnsavedChanges(false);
            console.log("Auto-save completed successfully");
            options?.onSaveSuccess?.();
          },
          onError: (error) => {
            console.error("Auto-save failed:", error.message);
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
    saving: saving || localSaving || isSaving,
    activeTab,
    setActiveTab,
    handleFormChange,
    handleNestedContentChange,
    saveCurrentBlock,
    getDefaultContent
  };
};
