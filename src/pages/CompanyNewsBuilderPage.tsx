import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CompanyNewsBlock, NewsBlockType } from '@/types/companyNews';
import { ArrowLeft, Trash2, Plus, ArrowUp, ArrowDown, Eye, Save, Loader2, Edit } from 'lucide-react';
import { useNewsBlocksFetcher } from '@/hooks/useNewsBlocksFetcher';
import { useNewsBlockEditor } from '@/hooks/useNewsBlockEditor';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Slider } from '@/components/ui/slider';

const CompanyNewsBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { 
    companies, 
    addCompanyNewsBlock, 
    updateCompanyNewsBlock,
    deleteCompanyNewsBlock, 
    publishCompanyNewsBlock,
    currentUser
  } = useAppContext();

  // Get blocks using our optimized fetcher 
  const { 
    blocks, 
    loading: loadingCompanyNewsBlocks, 
    refetch: refetchCompanyNewsBlocks,
    updateLocalBlock 
  } = useNewsBlocksFetcher(companyId);

  // State
  const [newBlockType, setNewBlockType] = useState<NewsBlockType>('heading');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [loading, setLoading] = useState(false);
  
  const company = companies.find(c => c.id === companyId);

  // Use our newsblock editor with optimistic updates
  const { 
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
  } = useNewsBlockEditor(blocks, {
    updateLocalBlock, // Pass the optimistic update function
    onSaveSuccess: () => {
      // Don't refetch after save - we already updated local state
      console.log('Save successful, updated local state');
    },
    onSaveError: (error) => {
      console.error('Error during save:', error);
      // Only refetch on error to recover correct state
      refetchCompanyNewsBlocks();
    }
  });

  const handleAddBlock = async () => {
    if (!companyId || !newBlockType || !newBlockTitle.trim()) {
      toast("Error", {
        description: "Company ID, block type and title are required"
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate new position as last position + 1
      const position = blocks.length > 0 
        ? Math.max(...blocks.map(b => b.position)) + 1 
        : 0;

      const newBlockId = await addCompanyNewsBlock({
        companyId,
        title: newBlockTitle,
        type: newBlockType,
        content: getDefaultContent(newBlockType),
        position,
        isPublished: false
      });

      if (newBlockId) {
        // Add block to local state optimistically
        const newBlock: CompanyNewsBlock = {
          id: newBlockId,
          companyId,
          title: newBlockTitle,
          type: newBlockType,
          content: getDefaultContent(newBlockType),
          position,
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUser?.id || '' // Fixed: added createdBy field
        };
        
        // Only refetch when adding a new block - we need the server-generated ID
        await refetchCompanyNewsBlocks();
        
        // After refetch, select the new block
        setSelectedBlockId(newBlockId);
        setNewBlockTitle('');
        
        toast.success("Block added successfully");
      }
    } catch (error) {
      console.error('Error adding block:', error);
      toast.error("Failed to add block", {
        description: error.message || "Please try again"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    setLoading(true);
    try {
      // Optimistically remove from local state
      const deletedBlock = blocks.find(b => b.id === blockId);
      const updatedBlocks = blocks.filter(b => b.id !== blockId);
      
      // If the deleted block is selected, select another one
      if (selectedBlockId === blockId) {
        setSelectedBlockId(updatedBlocks.length > 0 ? updatedBlocks[0].id : null);
      }
      
      // Delete from database
      await deleteCompanyNewsBlock(blockId);
      
      // Trigger refetch to ensure local state is consistent
      await refetchCompanyNewsBlocks();
      
      toast.success("Block deleted successfully");
    } catch (error) {
      console.error('Error deleting block:', error);
      toast.error("Failed to delete block", {
        description: error.message || "Please try again"
      });
      
      // Refetch to ensure state is correct after error
      await refetchCompanyNewsBlocks();
    } finally {
      setLoading(false);
    }
  };

  const handleMoveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    
    // Prevent multiple move operations at once
    if (loading) return;
    
    if (direction === 'up' && blockIndex > 0) {
      const targetBlock = newBlocks[blockIndex - 1];
      
      // Swap positions 
      const temp = targetBlock.position;
      targetBlock.position = block.position;
      block.position = temp;
      
      // Update positions in database with improved local state management
      setLoading(true);
      try {
        // Create a temporary sorted array for visual feedback
        const tempSortedBlocks = newBlocks.map(b => ({...b})).sort((a, b) => a.position - b.position);
        
        // Apply optimistic updates to local state FIRST for immediate visual feedback
        tempSortedBlocks.forEach(b => {
          updateLocalBlock({
            id: b.id,
            position: b.position
          });
        });
        
        // Show toast indicating the operation is in progress
        const toastId = toast.loading("Updating block position...");
        
        // Then make database updates
        await updateCompanyNewsBlock(block.id, { position: block.position });
        await updateCompanyNewsBlock(targetBlock.id, { position: targetBlock.position });
        
        // Force a refetch to ensure server and client state are in sync
        await refetchCompanyNewsBlocks();
        
        toast.success("Block position updated", { id: toastId });
      } catch (error: any) {
        console.error('Error moving block:', error);
        toast.error("Failed to move block", {
          description: error.message || "Please try again"
        });
        
        // Always refetch on error or success to ensure state consistency
        await refetchCompanyNewsBlocks();
      } finally {
        setLoading(false);
      }
    } 
    else if (direction === 'down' && blockIndex < newBlocks.length - 1) {
      const targetBlock = newBlocks[blockIndex + 1];
      
      const temp = targetBlock.position;
      targetBlock.position = block.position;
      block.position = temp;
      
      setLoading(true);
      try {
        // Create a temporary sorted array for visual feedback
        const tempSortedBlocks = newBlocks.map(b => ({...b})).sort((a, b) => a.position - b.position);
        
        // Apply optimistic updates to local state FIRST
        tempSortedBlocks.forEach(b => {
          updateLocalBlock({
            id: b.id,
            position: b.position
          });
        });
        
        // Show toast indicating the operation is in progress
        const toastId = toast.loading("Updating block position...");
        
        // Then make database updates
        await updateCompanyNewsBlock(block.id, { position: block.position });
        await updateCompanyNewsBlock(targetBlock.id, { position: targetBlock.position });
        
        // Force a refetch to ensure server and client state are in sync
        await refetchCompanyNewsBlocks();
        
        toast.success("Block position updated", { id: toastId });
      } catch (error: any) {
        console.error('Error moving block:', error);
        toast.error("Failed to move block", {
          description: error.message || "Please try again"
        });
        
        // Always refetch on error to ensure state consistency
        await refetchCompanyNewsBlocks();
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle toggle publish - fixed by removing the incorrect second argument
  const handleTogglePublish = async (blockId: string, isPublished: boolean) => {
    setLoading(true);
    try {
      // Optimistic update
      updateLocalBlock({
        id: blockId,
        isPublished
      });
      
      // Database update
      await publishCompanyNewsBlock(blockId, isPublished);
      
      toast.success(isPublished ? "Published" : "Unpublished", {
        description: `Block ${isPublished ? 'published' : 'unpublished'} successfully`
      });
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error("Error", {
        description: `Failed to ${isPublished ? 'publish' : 'unpublish'} block`
      });
      
      // Fix: call refetchCompanyNewsBlocks with only one argument
      await refetchCompanyNewsBlocks(true);
    } finally {
      setLoading(false);
    }
  };

  // Content editor based on block type
  const renderBlockEditor = () => {
    if (!selectedBlock || !editedBlockData || !editedBlockData.content) return null;

    // Make sure we have the necessary content structure for each block type
    const content = editedBlockData.content || getDefaultContent(selectedBlock.type);

    switch (selectedBlock.type) {
      case 'heading':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heading-level">Heading Level</Label>
              <Select 
                value={String(content.level || "2")} 
                onValueChange={(value) => handleFormChange('content.level', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select heading level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Heading 1 (Largest)</SelectItem>
                  <SelectItem value="2">Heading 2</SelectItem>
                  <SelectItem value="3">Heading 3</SelectItem>
                  <SelectItem value="4">Heading 4</SelectItem>
                  <SelectItem value="5">Heading 5</SelectItem>
                  <SelectItem value="6">Heading 6 (Smallest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading-text">Heading Text</Label>
              <Input 
                id="heading-text" 
                value={content.text || ''} 
                onChange={(e) => handleFormChange('content.text', e.target.value)}
              />
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-content">Text Content</Label>
              <Textarea 
                id="text-content" 
                rows={10}
                value={content.text || ''} 
                onChange={(e) => handleFormChange('content.text', e.target.value)}
              />
            </div>
          </div>
        );
      
      case 'card':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-title">Card Title</Label>
              <Input 
                id="card-title" 
                value={content.title || ''} 
                onChange={(e) => handleFormChange('content.title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-content">Card Content</Label>
              <Textarea 
                id="card-content" 
                rows={5}
                value={content.content || ''} 
                onChange={(e) => handleFormChange('content.content', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-icon">Icon (optional)</Label>
              <Input 
                id="card-icon" 
                placeholder="Icon name or URL"
                value={content.icon || ''} 
                onChange={(e) => handleFormChange('content.icon', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-label">Action Button Label</Label>
              <Input 
                id="action-label" 
                value={content.action?.label || ''} 
                onChange={(e) => handleNestedContentChange(['action', 'label'], e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-link">Action Button Link</Label>
              <Input 
                id="action-link" 
                value={content.action?.link || ''} 
                onChange={(e) => handleNestedContentChange(['action', 'link'], e.target.value)}
              />
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input 
                id="image-url" 
                value={content.url || ''} 
                onChange={(e) => handleFormChange('content.url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input 
                id="image-alt" 
                value={content.alt || ''} 
                onChange={(e) => handleFormChange('content.alt', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-caption">Caption (optional)</Label>
              <Input 
                id="image-caption" 
                value={content.caption || ''} 
                onChange={(e) => handleFormChange('content.caption', e.target.value)}
              />
            </div>
            
            {/* Image Width Control */}
            <div className="space-y-2">
              <Label htmlFor="image-width">Image Width ({content.width || '100%'})</Label>
              <div className="flex gap-4 items-center">
                <Slider 
                  id="image-width"
                  min={10}
                  max={100}
                  step={5}
                  defaultValue={[parseInt(content.width) || 100]}
                  onValueChange={(values) => handleFormChange('content.width', `${values[0]}%`)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Aspect Ratio Control for Widescreen Effect */}
            <div className="space-y-2">
              <Label htmlFor="image-aspect-ratio">Aspect Ratio</Label>
              <Select 
                value={content.aspectRatio || "16/9"} 
                onValueChange={(value) => handleFormChange('content.aspectRatio', value)}
              >
                <SelectTrigger id="image-aspect-ratio">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16/9">16:9 (Widescreen)</SelectItem>
                  <SelectItem value="21/9">21:9 (Ultra Widescreen)</SelectItem>
                  <SelectItem value="4/3">4:3 (Standard)</SelectItem>
                  <SelectItem value="1/1">1:1 (Square)</SelectItem>
                  <SelectItem value="9/16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Aspect Ratio (only shown when "custom" is selected) */}
            {content.aspectRatio === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-aspect-ratio">Custom Aspect Ratio (width/height)</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="custom-aspect-ratio-width" 
                    value={content.customAspectRatioWidth || '16'} 
                    onChange={(e) => handleFormChange('content.customAspectRatioWidth', e.target.value)}
                    className="w-20"
                  />
                  <span>/</span>
                  <Input 
                    id="custom-aspect-ratio-height" 
                    value={content.customAspectRatioHeight || '9'} 
                    onChange={(e) => handleFormChange('content.customAspectRatioHeight', e.target.value)}
                    className="w-20"
                  />
                </div>
              </div>
            )}

            {/* Object Fit Control */}
            <div className="space-y-2">
              <Label htmlFor="image-object-fit">Object Fit</Label>
              <Select 
                value={content.objectFit || "cover"} 
                onValueChange={(value) => handleFormChange('content.objectFit', value)}
              >
                <SelectTrigger id="image-object-fit">
                  <SelectValue placeholder="Select how the image should fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill space, may crop)</SelectItem>
                  <SelectItem value="contain">Contain (show full image)</SelectItem>
                  <SelectItem value="fill">Fill (stretch to fit)</SelectItem>
                  <SelectItem value="none">None (original size)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Object Position Control */}
            <div className="space-y-2">
              <Label htmlFor="image-object-position">Focus Point</Label>
              <Select 
                value={content.objectPosition || "center"} 
                onValueChange={(value) => handleFormChange('content.objectPosition', value)}
              >
                <SelectTrigger id="image-object-position">
                  <SelectValue placeholder="Select image focus point" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="top left">Top Left</SelectItem>
                  <SelectItem value="top right">Top Right</SelectItem>
                  <SelectItem value="bottom left">Bottom Left</SelectItem>
                  <SelectItem value="bottom right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {content.url && (
              <div className="mt-4 border rounded-md p-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div style={{ width: content.width || '100%' }}>
                  <AspectRatio 
                    ratio={
                      content.aspectRatio === 'custom'
                        ? parseInt(content.customAspectRatioWidth || '16') / parseInt(content.customAspectRatioHeight || '9')
                        : content.aspectRatio === '21/9' 
                          ? 21/9 
                          : content.aspectRatio === '16/9' 
                            ? 16/9 
                            : content.aspectRatio === '4/3' 
                              ? 4/3 
                              : content.aspectRatio === '1/1' 
                                ? 1 
                                : content.aspectRatio === '9/16'
                                  ? 9/16
                                  : 16/9
                    } 
                    className="bg-muted"
                  >
                    <img 
                      src={content.url} 
                      alt={content.alt} 
                      className="w-full h-full rounded-md"
                      style={{ 
                        objectFit: content.objectFit || 'cover',
                        objectPosition: content.objectPosition || 'center'
                      }}
                    />
                  </AspectRatio>
                  {content.caption && (
                    <p className="text-sm text-center mt-2">{content.caption}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'notice': 
        const noticeType = content.type || 'info';
        let bgColor = 'bg-blue-50';
        let borderColor = 'border-blue-300';
        let textColor = 'text-blue-800';
        
        switch (noticeType) {
          case 'warning':
            bgColor = 'bg-yellow-50';
            borderColor = 'border-yellow-300';
            textColor = 'text-yellow-800';
            break;
          case 'success':
            bgColor = 'bg-green-50';
            borderColor = 'border-green-300';
            textColor = 'text-green-800';
            break;
          case 'error':
            bgColor = 'bg-red-50';
            borderColor = 'border-red-300';
            textColor = 'text-red-800';
            break;
        }
        
        return (
          <div className={`mt-4 ${bgColor} ${borderColor} border-l-4 p-4 rounded`}>
            <h4 className={`font-medium ${textColor}`}>{content.title || 'Notice Title'}</h4>
            <p className={`mt-2 ${textColor}`}>{content.message || 'Notice message'}</p>
          </div>
        );
      
      case 'faq': 
        const faqItems = content.items || [];
        return (
          <div className="mt-4 space-y-6">
            {faqItems.length > 0 ? faqItems.map((item: any, index: number) => (
              <div key={index} className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor={`faq-question-${index}`}>Question {index + 1}</Label>
                  <Input 
                    id={`faq-question-${index}`}
                    value={item.question || ''} 
                    onChange={(e) => {
                      const newItems = [...editedBlockData.content.items];
                      newItems[index] = { ...newItems[index], question: e.target.value };
                      handleFormChange('content.items', newItems);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`faq-answer-${index}`}>Answer {index + 1}</Label>
                  <Textarea 
                    id={`faq-answer-${index}`}
                    rows={3}
                    value={item.answer || ''} 
                    onChange={(e) => {
                      const newItems = [...editedBlockData.content.items];
                      newItems[index] = { ...newItems[index], answer: e.target.value };
                      handleFormChange('content.items', newItems);
                    }}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    const newItems = editedBlockData.content.items.filter((_: any, i: number) => i !== index);
                    handleFormChange('content.items', newItems);
                  }}
                  disabled={editedBlockData.content.items.length <= 1}
                >
                  Remove Question
                </Button>
              </div>
            )) : (
              <div>
                <h4 className="font-medium">Sample Question</h4>
                <p className="mt-1">Sample Answer</p>
              </div>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                const newItems = [...(editedBlockData.content.items || []), { question: 'New Question', answer: 'Answer here...' }];
                handleFormChange('content.items', newItems);
              }}
            >
              Add Question
            </Button>
          </div>
        );
      
      case 'links': 
        const links = content.links || [];
        return (
          <div className="mt-4 space-y-6">
            {links.length > 0 ? links.map((link: any, index: number) => (
              <div key={index} className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor={`link-label-${index}`}>Link {index + 1} Label</Label>
                  <Input 
                    id={`link-label-${index}`}
                    value={link.label || ''} 
                    onChange={(e) => {
                      const newLinks = [...editedBlockData.content.links];
                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                      handleFormChange('content.links', newLinks);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`link-url-${index}`}>Link {index + 1} URL</Label>
                  <Input 
                    id={`link-url-${index}`}
                    value={link.url || ''} 
                    onChange={(e) => {
                      const newLinks = [...editedBlockData.content.links];
                      newLinks[index] = { ...newLinks[index], url: e.target.value };
                      handleFormChange('content.links', newLinks);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`link-icon-${index}`}>Icon (optional)</Label>
                  <Input 
                    id={`link-icon-${index}`}
                    value={link.icon || ''} 
                    onChange={(e) => {
                      const newLinks = [...editedBlockData.content.links];
                      newLinks[index] = { ...newLinks[index], icon: e.target.value || undefined };
                      handleFormChange('content.links', newLinks);
                    }}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    const newLinks = editedBlockData.content.links.filter((_: any, i: number) => i !== index);
                    handleFormChange('content.links', newLinks);
                  }}
                  disabled={editedBlockData.content.links.length <= 1}
                >
                  Remove Link
                </Button>
              </div>
            )) : (
              <div className="flex items-center">
                <a href="#" className="text-blue-600 hover:underline">Sample Link</a>
              </div>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                const newLinks = [...(editedBlockData.content.links || []), { label: 'New Link', url: '#' }];
                handleFormChange('content.links', newLinks);
              }}
            >
              Add Link
            </Button>
          </div>
        );
      
      case 'dropdown': 
        const dropdownTitle = content.title || 'Dropdown Title';
        const dropdownItems = content.items || [];
        
        return (
          <div className="mt-4">
            <h3 className="font-medium">{dropdownTitle}</h3>
            <div className="mt-2 border rounded-md divide-y">
              {dropdownItems.length > 0 ? dropdownItems.map((item: any, index: number) => (
                <div key={index} className="p-3">
                  <h4 className="text-sm font-medium">{item.label || `Item ${index + 1}`}</h4>
                  {item.content && <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>}
                </div>
              )) : (
                <div className="p-3">
                  <h4 className="text-sm font-medium">Sample Item</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Sample content</p>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return <div>Select a block type</div>;
    }
  };

  // Preview rendering based on block type
  const renderBlockPreview = (block: CompanyNewsBlock) => {
    // Get content based on whether the block is selected or not
    const content = selectedBlockId === block.id ? 
      editedBlockData.content || {} : 
      block.content || {};
    
    // Apply default content when needed
    const defaultContent = getDefaultContent(block.type);
    const displayContent = { ...defaultContent, ...content };
    
    switch (block.type) {
      case 'heading': 
        // Safely handle the heading level with a default
        const level = displayContent.level || 2; // Default to h2 if level is undefined
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag className={`mt-${level} font-bold`}>{displayContent.text || 'Heading Text'}</HeadingTag>;
      
      case 'text':
        return (
          <div className="prose max-w-none">
            <p>{displayContent.text || 'Text content goes here'}</p>
          </div>
        );
      
      case 'card':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{displayContent.title || 'Card Title'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{displayContent.content || 'Card content'}</p>
            </CardContent>
            {displayContent.action && (
              <CardFooter>
                <Button variant="outline" size="sm">
                  {displayContent.action.label || 'Action'}
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      
      case 'image':
        return (
          <div className="mt-4" style={{ width: displayContent.width || '100%' }}>
            {displayContent.url ? (
              <>
                <AspectRatio 
                  ratio={
                    displayContent.aspectRatio === 'custom'
                      ? parseInt(displayContent.customAspectRatioWidth || '16') / parseInt(displayContent.customAspectRatioHeight || '9')
                      : displayContent.aspectRatio === '21/9' 
                        ? 21/9 
                        : displayContent.aspectRatio === '16/9' 
                          ? 16/9 
                          : displayContent.aspectRatio === '4/3' 
                            ? 4/3 
                            : displayContent.aspectRatio === '1/1' 
                              ? 1 
                              : displayContent.aspectRatio === '9/16'
                                ? 9/16
                                : 16/9
                  } 
                  className="bg-muted"
                >
                  <img 
                    src={displayContent.url} 
                    alt={displayContent.alt || 'Image'} 
                    className="w-full h-full rounded-md"
                    style={{ 
                      objectFit: displayContent.objectFit || 'cover',
                      objectPosition: displayContent.objectPosition || 'center'
                    }}
                  />
                </AspectRatio>
                {displayContent.caption && (
                  <p className="text-sm text-center mt-2">{displayContent.caption}</p>
                )}
              </>
            ) : (
              <div className="h-40 bg-muted flex items-center justify-center rounded-md">
                <p className="text-muted-foreground">Image placeholder</p>
              </div>
            )}
          </div>
        );
      
      case 'notice': 
        const noticeType = displayContent.type || 'info';
        let bgColor = 'bg-blue-50';
        let borderColor = 'border-blue-300';
        let textColor = 'text-blue-800';
        
        switch (noticeType) {
          case 'warning':
            bgColor = 'bg-yellow-50';
            borderColor = 'border-yellow-300';
            textColor = 'text-yellow-800';
            break;
          case 'success':
            bgColor = 'bg-green-50';
            borderColor = 'border-green-300';
            textColor = 'text-green-800';
            break;
          case 'error':
            bgColor = 'bg-red-50';
            borderColor = 'border-red-300';
            textColor = 'text-red-800';
            break;
        }
        
        return (
          <div className={`mt-4 ${bgColor} ${borderColor} border-l-4 p-4 rounded`}>
            <h4 className={`font-medium ${textColor}`}>{displayContent.title || 'Notice Title'}</h4>
            <p className={`mt-2 ${textColor}`}>{displayContent.message || 'Notice message'}</p>
          </div>
        );
      
      case 'faq': 
        const faqPreviewItems = displayContent.items || [];
        return (
          <div className="mt-4 space-y-4">
            {faqPreviewItems.length > 0 ? faqPreviewItems.map((item: any, index: number) => (
              <div key={index}>
                <h4 className="font-medium">{item.question || `Question ${index + 1}`}</h4>
                <p className="mt-1">{item.answer || `Answer ${index + 1}`}</p>
              </div>
            )) : (
              <div>
                <h4 className="font-medium">Sample Question</h4>
                <p className="mt-1">Sample Answer</p>
              </div>
            )}
          </div>
        );
      
      case 'links': 
        const linksPreview = displayContent.links || [];
        return (
          <div className="mt-4 space-y-2">
            {linksPreview.length > 0 ? linksPreview.map((link: any, index: number) => (
              <div key={index} className="flex items-center">
                <a href={link.url || '#'} className="text-blue-600 hover:underline">
                  {link.label || `Link ${index + 1}`}
                </a>
              </div>
            )) : (
              <div className="flex items-center">
                <a href="#" className="text-blue-600 hover:underline">Sample Link</a>
              </div>
            )}
          </div>
        );
      
      case 'dropdown': 
        const dropdownPreviewTitle = displayContent.title || 'Dropdown Title';
        const dropdownPreviewItems = displayContent.items || [];
        
        return (
          <div className="mt-4">
            <h3 className="font-medium">{dropdownPreviewTitle}</h3>
            <div className="mt-2 border rounded-md divide-y">
              {dropdownPreviewItems.length > 0 ? dropdownPreviewItems.map((item: any, index: number) => (
                <div key={index} className="p-3">
                  <h4 className="text-sm font-medium">{item.label || `Item ${index + 1}`}</h4>
                  {item.content && <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>}
                </div>
              )) : (
                <div className="p-3">
                  <h4 className="text-sm font-medium">Sample Item</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Sample content</p>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate(`/company-news/${companyId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
          <h1 className="text-2xl font-bold">
            {company ? `${company.name} - News Builder` : 'News Builder'}
          </h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar with blocks list */}
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>News Blocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {blocks.length > 0 ? (
                <div className="space-y-2">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className={`flex items-center justify-between p-2 rounded-md border ${
                        selectedBlockId === block.id ? 'bg-muted border-primary' : 'hover:bg-accent'
                      } cursor-pointer`}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      <div className="truncate flex-1">
                        <div className="text-sm font-medium">{block.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {block.type} {block.isPublished ? '(Published)' : '(Draft)'}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          size="icon"
                          variant="ghost"
                          disabled={index === 0 || loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveBlock(block.id, 'up');
                          }}
                          className="h-7 w-7"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon"
                          variant="ghost"
                          disabled={index === blocks.length - 1 || loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveBlock(block.id, 'down');
                          }}
                          className="h-7 w-7"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">{loadingCompanyNewsBlocks ? 'Loading...' : 'No blocks created yet'}</p>
                </div>
              )}
              
              <div className="pt-4 space-y-4 border-t">
                <div className="space-y-3">
                  <Label htmlFor="new-block-type">Add New Block</Label>
                  <Select 
                    value={newBlockType} 
                    onValueChange={setNewBlockType as any}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select block type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heading">Heading</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="faq">FAQ</SelectItem>
                      <SelectItem value="links">Links</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="new-block-title">Block Title</Label>
                  <Input 
                    id="new-block-title" 
                    placeholder="Enter block title"
                    value={newBlockTitle}
                    onChange={(e) => setNewBlockTitle(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleAddBlock}
                  disabled={!newBlockTitle.trim() || loading}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Add Block</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Editor area */}
        <div className="md:col-span-9 space-y-4">
          {selectedBlock ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>{selectedBlock.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Label htmlFor="published" className="text-sm">Publish</Label>
                      <Switch 
                        id="published"
                        checked={editedBlockData?.isPublished || false}
                        onCheckedChange={(checked) => {
                          handleTogglePublish(selectedBlock.id, checked);
                        }}
                      />
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this news block.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteBlock(selectedBlock.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-4">
                    <div className="mb-4">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input 
                        id="edit-title"
                        value={editedBlockData?.title || ''}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="edit">
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </TabsTrigger>
                        <TabsTrigger value="preview">
                          <Eye className="h-4 w-4 mr-2" /> Preview
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="edit" className="mt-4">
                        {renderBlockEditor()}
                        
                        <div className="mt-6 flex items-center justify-end space-x-2">
                          <Button
                            variant="default"
                            onClick={saveCurrentBlock}
                            disabled={!hasUnsavedChanges || saving}
                          >
                            {saving ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                              <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="preview" className="mt-4">
                        <div className="p-4 border rounded-lg">
                          {renderBlockPreview(selectedBlock)}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-[400px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                {blocks.length > 0 ? 'Select a block to edit' : 'Create a new block to get started'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyNewsBuilderPage;
