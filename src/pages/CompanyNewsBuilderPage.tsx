
import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CompanyNewsBlock, NewsBlockType } from '@/types/companyNews';
import { ArrowLeft, Trash2, Plus, ArrowUp, ArrowDown, Eye } from 'lucide-react';

const CompanyNewsBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    companies, 
    companyNewsBlocks, 
    addCompanyNewsBlock, 
    updateCompanyNewsBlock,
    deleteCompanyNewsBlock, 
    publishCompanyNewsBlock,
    refetchCompanyNewsBlocks,
    currentUser,
    loadingCompanyNewsBlocks
  } = useAppContext();

  // State
  const [blocks, setBlocks] = useState<CompanyNewsBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [loading, setLoading] = useState(false);

  // Form state for new blocks
  const [newBlockType, setNewBlockType] = useState<NewsBlockType>('heading');
  const [newBlockTitle, setNewBlockTitle] = useState('');

  const company = companies.find(c => c.id === companyId);

  useEffect(() => {
    if (companyId) {
      refetchCompanyNewsBlocks(companyId);
    }
  }, [companyId, refetchCompanyNewsBlocks]);

  useEffect(() => {
    if (!loadingCompanyNewsBlocks && companyId) {
      const companyBlocks = companyNewsBlocks
        .filter(block => block.companyId === companyId)
        .sort((a, b) => a.position - b.position);
      setBlocks(companyBlocks);

      // Select the first block if none selected
      if (companyBlocks.length > 0 && !selectedBlockId) {
        setSelectedBlockId(companyBlocks[0].id);
      }
    }
  }, [companyNewsBlocks, companyId, loadingCompanyNewsBlocks, selectedBlockId]);

  const selectedBlock = blocks.find(block => block.id === selectedBlockId);

  // Function to create default content based on block type
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

  const handleAddBlock = async () => {
    if (!companyId || !newBlockType || !newBlockTitle.trim()) {
      toast({
        title: "Error",
        description: "Company ID, block type and title are required",
        variant: "destructive"
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
        setSelectedBlockId(newBlockId);
        setNewBlockTitle('');
        toast({
          title: "Success",
          description: "Block added successfully"
        });
      }
    } catch (error) {
      console.error('Error adding block:', error);
      toast({
        title: "Error",
        description: "Failed to add block",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<CompanyNewsBlock>) => {
    setLoading(true);
    try {
      await updateCompanyNewsBlock(blockId, updates);
      toast({
        title: "Success",
        description: "Block updated successfully"
      });
    } catch (error) {
      console.error('Error updating block:', error);
      toast({
        title: "Error",
        description: "Failed to update block",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    setLoading(true);
    try {
      await deleteCompanyNewsBlock(blockId);
      setSelectedBlockId(blocks.length > 1 ? blocks[0].id : null);
      toast({
        title: "Success",
        description: "Block deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      toast({
        title: "Error",
        description: "Failed to delete block",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    
    if (direction === 'up' && blockIndex > 0) {
      const targetBlock = newBlocks[blockIndex - 1];
      
      // Swap positions
      const temp = targetBlock.position;
      targetBlock.position = block.position;
      block.position = temp;
      
      // Update in database
      setLoading(true);
      try {
        await updateCompanyNewsBlock(block.id, { position: block.position });
        await updateCompanyNewsBlock(targetBlock.id, { position: targetBlock.position });
        await refetchCompanyNewsBlocks(companyId);
      } catch (error) {
        console.error('Error moving block:', error);
        toast({
          title: "Error",
          description: "Failed to move block",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    } 
    else if (direction === 'down' && blockIndex < newBlocks.length - 1) {
      const targetBlock = newBlocks[blockIndex + 1];
      
      // Swap positions
      const temp = targetBlock.position;
      targetBlock.position = block.position;
      block.position = temp;
      
      // Update in database
      setLoading(true);
      try {
        await updateCompanyNewsBlock(block.id, { position: block.position });
        await updateCompanyNewsBlock(targetBlock.id, { position: targetBlock.position });
        await refetchCompanyNewsBlocks(companyId);
      } catch (error) {
        console.error('Error moving block:', error);
        toast({
          title: "Error",
          description: "Failed to move block",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTogglePublish = async (blockId: string, isPublished: boolean) => {
    setLoading(true);
    try {
      await publishCompanyNewsBlock(blockId, isPublished);
      toast({
        title: isPublished ? "Published" : "Unpublished",
        description: `Block ${isPublished ? 'published' : 'unpublished'} successfully`
      });
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({
        title: "Error",
        description: `Failed to ${isPublished ? 'publish' : 'unpublish'} block`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Content editor based on block type
  const renderBlockEditor = () => {
    if (!selectedBlock) return null;

    switch (selectedBlock.type) {
      case 'heading':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heading-level">Heading Level</Label>
              <Select 
                value={selectedBlock.content.level.toString()} 
                onValueChange={(value) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, level: parseInt(value) }
                })}
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
                value={selectedBlock.content.text} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, text: e.target.value }
                })}
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
                value={selectedBlock.content.text} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, text: e.target.value }
                })}
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
                value={selectedBlock.content.title} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, title: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-content">Card Content</Label>
              <Textarea 
                id="card-content" 
                rows={5}
                value={selectedBlock.content.content} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, content: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-icon">Icon (optional)</Label>
              <Input 
                id="card-icon" 
                placeholder="Icon name or URL"
                value={selectedBlock.content.icon || ''} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { 
                    ...selectedBlock.content, 
                    icon: e.target.value || undefined 
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-label">Action Button Label</Label>
              <Input 
                id="action-label" 
                value={selectedBlock.content.action?.label || ''} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { 
                    ...selectedBlock.content, 
                    action: { 
                      ...(selectedBlock.content.action || {}),
                      label: e.target.value
                    }
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-link">Action Button Link</Label>
              <Input 
                id="action-link" 
                value={selectedBlock.content.action?.link || ''} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { 
                    ...selectedBlock.content, 
                    action: { 
                      ...(selectedBlock.content.action || {}),
                      link: e.target.value
                    }
                  }
                })}
              />
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input 
                id="image-url" 
                value={selectedBlock.content.url} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, url: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input 
                id="image-alt" 
                value={selectedBlock.content.alt} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, alt: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-caption">Caption (optional)</Label>
              <Input 
                id="image-caption" 
                value={selectedBlock.content.caption || ''} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { 
                    ...selectedBlock.content, 
                    caption: e.target.value || undefined 
                  }
                })}
              />
            </div>
            {selectedBlock.content.url && (
              <div className="mt-4 border rounded-md p-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img 
                  src={selectedBlock.content.url} 
                  alt={selectedBlock.content.alt} 
                  className="max-w-full h-auto rounded-md"
                />
                {selectedBlock.content.caption && (
                  <p className="text-sm text-center mt-2">{selectedBlock.content.caption}</p>
                )}
              </div>
            )}
          </div>
        );
      
      case 'notice':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notice-type">Notice Type</Label>
              <Select 
                value={selectedBlock.content.type} 
                onValueChange={(value) => handleUpdateBlock(selectedBlock.id, {
                  content: { 
                    ...selectedBlock.content, 
                    type: value as 'info' | 'warning' | 'success' | 'error' 
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select notice type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-title">Notice Title</Label>
              <Input 
                id="notice-title" 
                value={selectedBlock.content.title} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, title: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-message">Notice Message</Label>
              <Textarea 
                id="notice-message" 
                rows={5}
                value={selectedBlock.content.message} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, message: e.target.value }
                })}
              />
            </div>
          </div>
        );
      
      // Add other block type editors here (FAQ, Links, Dropdown)
      case 'faq':
        return (
          <div className="space-y-6">
            {selectedBlock.content.items.map((item, index) => (
              <div key={index} className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor={`faq-question-${index}`}>Question {index + 1}</Label>
                  <Input 
                    id={`faq-question-${index}`}
                    value={item.question} 
                    onChange={(e) => {
                      const newItems = [...selectedBlock.content.items];
                      newItems[index] = { ...newItems[index], question: e.target.value };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, items: newItems }
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`faq-answer-${index}`}>Answer {index + 1}</Label>
                  <Textarea 
                    id={`faq-answer-${index}`}
                    rows={3}
                    value={item.answer} 
                    onChange={(e) => {
                      const newItems = [...selectedBlock.content.items];
                      newItems[index] = { ...newItems[index], answer: e.target.value };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, items: newItems }
                      });
                    }}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    const newItems = selectedBlock.content.items.filter((_, i) => i !== index);
                    handleUpdateBlock(selectedBlock.id, {
                      content: { ...selectedBlock.content, items: newItems }
                    });
                  }}
                  disabled={selectedBlock.content.items.length <= 1}
                >
                  Remove Question
                </Button>
              </div>
            ))}
            <Button 
              variant="outline"
              onClick={() => {
                const newItems = [...selectedBlock.content.items, { question: 'New Question', answer: 'Answer here...' }];
                handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, items: newItems }
                });
              }}
            >
              Add Question
            </Button>
          </div>
        );
      
      case 'links':
        return (
          <div className="space-y-6">
            {selectedBlock.content.links.map((link, index) => (
              <div key={index} className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor={`link-label-${index}`}>Link {index + 1} Label</Label>
                  <Input 
                    id={`link-label-${index}`}
                    value={link.label} 
                    onChange={(e) => {
                      const newLinks = [...selectedBlock.content.links];
                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, links: newLinks }
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`link-url-${index}`}>Link {index + 1} URL</Label>
                  <Input 
                    id={`link-url-${index}`}
                    value={link.url} 
                    onChange={(e) => {
                      const newLinks = [...selectedBlock.content.links];
                      newLinks[index] = { ...newLinks[index], url: e.target.value };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, links: newLinks }
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`link-icon-${index}`}>Icon (optional)</Label>
                  <Input 
                    id={`link-icon-${index}`}
                    value={link.icon || ''} 
                    onChange={(e) => {
                      const newLinks = [...selectedBlock.content.links];
                      newLinks[index] = { ...newLinks[index], icon: e.target.value || undefined };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, links: newLinks }
                      });
                    }}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    const newLinks = selectedBlock.content.links.filter((_, i) => i !== index);
                    handleUpdateBlock(selectedBlock.id, {
                      content: { ...selectedBlock.content, links: newLinks }
                    });
                  }}
                  disabled={selectedBlock.content.links.length <= 1}
                >
                  Remove Link
                </Button>
              </div>
            ))}
            <Button 
              variant="outline"
              onClick={() => {
                const newLinks = [...selectedBlock.content.links, { label: 'New Link', url: '#' }];
                handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, links: newLinks }
                });
              }}
            >
              Add Link
            </Button>
          </div>
        );

      case 'dropdown':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dropdown-title">Dropdown Title</Label>
              <Input 
                id="dropdown-title" 
                value={selectedBlock.content.title} 
                onChange={(e) => handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, title: e.target.value }
                })}
              />
            </div>
            
            {selectedBlock.content.items.map((item, index) => (
              <div key={index} className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor={`dropdown-label-${index}`}>Item {index + 1} Label</Label>
                  <Input 
                    id={`dropdown-label-${index}`}
                    value={item.label} 
                    onChange={(e) => {
                      const newItems = [...selectedBlock.content.items];
                      newItems[index] = { ...newItems[index], label: e.target.value };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, items: newItems }
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`dropdown-content-${index}`}>Item {index + 1} Content</Label>
                  <Textarea 
                    id={`dropdown-content-${index}`}
                    rows={3}
                    value={item.content} 
                    onChange={(e) => {
                      const newItems = [...selectedBlock.content.items];
                      newItems[index] = { ...newItems[index], content: e.target.value };
                      handleUpdateBlock(selectedBlock.id, {
                        content: { ...selectedBlock.content, items: newItems }
                      });
                    }}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    const newItems = selectedBlock.content.items.filter((_, i) => i !== index);
                    handleUpdateBlock(selectedBlock.id, {
                      content: { ...selectedBlock.content, items: newItems }
                    });
                  }}
                  disabled={selectedBlock.content.items.length <= 1}
                >
                  Remove Item
                </Button>
              </div>
            ))}
            <Button 
              variant="outline"
              onClick={() => {
                const newItems = [...selectedBlock.content.items, { label: 'New Item', content: 'Content here...' }];
                handleUpdateBlock(selectedBlock.id, {
                  content: { ...selectedBlock.content, items: newItems }
                });
              }}
            >
              Add Item
            </Button>
          </div>
        );
      
      default:
        return <p>No editor available for this block type.</p>;
    }
  };

  // Preview rendering based on block type
  const renderBlockPreview = (block: CompanyNewsBlock) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.content.level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag className={`mt-${block.content.level} font-bold`}>{block.content.text}</HeadingTag>;
      
      case 'text':
        return (
          <div className="prose max-w-none">
            <p>{block.content.text}</p>
          </div>
        );
      
      case 'card':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{block.content.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{block.content.content}</p>
            </CardContent>
            {block.content.action && (
              <CardFooter>
                <Button variant="outline" size="sm">
                  {block.content.action.label}
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      
      case 'image':
        return (
          <div className="mt-4">
            {block.content.url ? (
              <>
                <img 
                  src={block.content.url} 
                  alt={block.content.alt} 
                  className="max-w-full h-auto rounded-md"
                />
                {block.content.caption && (
                  <p className="text-sm text-center mt-2">{block.content.caption}</p>
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
        let bgColor = 'bg-blue-50';
        let borderColor = 'border-blue-300';
        let textColor = 'text-blue-800';
        
        switch (block.content.type) {
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
            <h4 className={`font-medium ${textColor}`}>{block.content.title}</h4>
            <p className={`mt-2 ${textColor}`}>{block.content.message}</p>
          </div>
        );
      
      // Add other block type previews here
      case 'faq':
        return (
          <div className="mt-4 space-y-4">
            {block.content.items.map((item, index) => (
              <div key={index}>
                <h4 className="font-medium">{item.question}</h4>
                <p className="mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        );
      
      case 'links':
        return (
          <div className="mt-4 space-y-2">
            {block.content.links.map((link, index) => (
              <div key={index} className="flex items-center">
                <a href={link.url} className="text-blue-600 hover:underline">{link.label}</a>
              </div>
            ))}
          </div>
        );
      
      case 'dropdown':
        return (
          <div className="mt-4">
            <h4 className="font-medium">{block.content.title}</h4>
            <div className="space-y-2 mt-2">
              {block.content.items.map((item, index) => (
                <div key={index} className="border p-2 rounded-md">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return <p>Preview not available for this block type.</p>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate('/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {company ? `${company.name} - News Editor` : 'Company News Editor'}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={() => navigate(`/company-news/${companyId}`)}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Published News
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar with block list */}
        <div className="md:col-span-3 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">News Blocks</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Select 
                value={newBlockType} 
                onValueChange={(value) => setNewBlockType(value as NewsBlockType)}
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
              <Input 
                placeholder="Block title" 
                value={newBlockTitle}
                onChange={(e) => setNewBlockTitle(e.target.value)}
              />
              <Button 
                className="w-full" 
                onClick={handleAddBlock} 
                disabled={loading || !newBlockTitle.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Block
              </Button>
            </div>
            
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {blocks.map((block) => (
                <div 
                  key={block.id}
                  className={`flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer ${
                    selectedBlockId === block.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${block.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <p className="truncate flex-1">{block.title}</p>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveBlock(block.id, 'up');
                      }}
                      disabled={blocks.indexOf(block) === 0 || loading}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveBlock(block.id, 'down');
                      }}
                      disabled={blocks.indexOf(block) === blocks.length - 1 || loading}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No blocks added yet
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main editor area */}
        <div className="md:col-span-9 border rounded-lg">
          {selectedBlock ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between border-b p-4">
                <TabsList>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="published" 
                      checked={selectedBlock.isPublished}
                      onCheckedChange={(checked) => handleTogglePublish(selectedBlock.id, checked)}
                      disabled={loading}
                    />
                    <Label htmlFor="published">{selectedBlock.isPublished ? 'Published' : 'Draft'}</Label>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          "{selectedBlock.title}" block.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteBlock(selectedBlock.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <TabsContent value="edit" className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="block-title">Block Title</Label>
                    <Input 
                      id="block-title"
                      value={selectedBlock.title}
                      onChange={(e) => handleUpdateBlock(selectedBlock.id, { title: e.target.value })}
                    />
                  </div>
                  
                  {renderBlockEditor()}
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="p-4 border-t">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Block Preview</h3>
                  <div className="p-4 border rounded-lg">
                    {renderBlockPreview(selectedBlock)}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="p-10 text-center">
              <h3 className="mb-2">Select a block to edit or create a new block</h3>
              <p className="text-muted-foreground">
                Use the sidebar on the left to manage your company news blocks
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyNewsBuilderPage;
