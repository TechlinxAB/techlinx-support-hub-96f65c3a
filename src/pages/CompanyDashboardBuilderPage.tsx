import React, { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardBlock, BlockType } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader, PlusCircle, Trash, MoveUp, MoveDown, Edit, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const CompanyDashboardBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { 
    currentUser, 
    companies, 
    dashboardBlocks, 
    loadingDashboardBlocks, 
    refetchDashboardBlocks,
    addDashboardBlock,
    updateDashboardBlock,
    deleteDashboardBlock
  } = useAppContext();
  
  const { profile } = useAuth();
  
  const [sortedBlocks, setSortedBlocks] = useState<DashboardBlock[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<DashboardBlock | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>('text');
  const [formData, setFormData] = useState<any>({});
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchTriggered, setFetchTriggered] = useState(false); // Add flag to track if fetch has been triggered
  
  // Find the company
  const company = companies.find(c => c.id === companyId);
  
  // Check auth in useEffect, not during render
  useEffect(() => {
    const checkAccess = async () => {
      // Wait until we have the profile data to make the role check
      if (profile !== null) {
        console.log("Checking access, user role:", profile?.role, "company ID:", companyId);
        
        if (profile?.role !== 'consultant') {
          console.log("Access denied: User is not a consultant");
          toast.error("You don't have permission to access the dashboard builder");
          navigate('/');
          return;
        }
        
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [profile, navigate, companyId]);
  
  // Fix infinite reloading by using a flag to ensure we only fetch once
  useEffect(() => {
    if (companyId && !isLoading && !fetchTriggered) {
      console.log("Fetching dashboard blocks for company:", companyId);
      refetchDashboardBlocks(companyId);
      setFetchTriggered(true); // Set flag to prevent continuous fetching
    }
  }, [companyId, refetchDashboardBlocks, isLoading, fetchTriggered]);
  
  // Update the sorted blocks when dashboard blocks change
  useEffect(() => {
    // Sort blocks by position and filter to only include top-level blocks (no parentId)
    if (dashboardBlocks.length > 0 && companyId) {
      const topLevelBlocks = dashboardBlocks
        .filter(block => !block.parentId && block.companyId === companyId)
        .sort((a, b) => a.position - b.position);
      
      setSortedBlocks(topLevelBlocks);
    }
  }, [dashboardBlocks, companyId]);
  
  // Get child blocks for a given parent ID
  const getChildBlocks = (parentId: string) => {
    return dashboardBlocks
      .filter(block => block.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  };
  
  // Create a memoized function to handle manual refetching
  const handleManualRefetch = useCallback(() => {
    if (companyId) {
      refetchDashboardBlocks(companyId);
      toast.success("Dashboard data refreshed");
    }
  }, [companyId, refetchDashboardBlocks]);
  
  const handleAddBlock = () => {
    setEditingBlock(null);
    setSelectedBlockType('text');
    setFormData({});
    setDialogOpen(true);
  };
  
  const handleEditBlock = (block: DashboardBlock) => {
    // Reset the dialog state completely before opening with new data
    setDialogOpen(false); // Close first to ensure state reset
    
    // Use a small timeout to ensure React has time to process the close before reopening
    setTimeout(() => {
      setEditingBlock(block);
      setSelectedBlockType(block.type);
      setFormData({
        ...block.content,
        blockTitle: block.title, // Store the current block title
        showTitle: block.showTitle !== false // Default to true if not explicitly set to false
      });
      setDialogOpen(true);
    }, 50);
  };
  
  const handleDeleteBlock = async (blockId: string) => {
    if (confirm('Are you sure you want to delete this block?')) {
      await deleteDashboardBlock(blockId);
    }
  };
  
  const handleMoveBlock = async (block: DashboardBlock, direction: 'up' | 'down') => {
    const blocksAtSameLevel = dashboardBlocks
      .filter(b => 
        (b.parentId === block.parentId || (!b.parentId && !block.parentId)) && 
        b.companyId === block.companyId
      )
      .sort((a, b) => a.position - b.position);
    
    const currentIndex = blocksAtSameLevel.findIndex(b => b.id === block.id);
    
    if (direction === 'up' && currentIndex > 0) {
      const previousBlock = blocksAtSameLevel[currentIndex - 1];
      await updateDashboardBlock(block.id, { position: previousBlock.position });
      await updateDashboardBlock(previousBlock.id, { position: block.position });
    }
    
    if (direction === 'down' && currentIndex < blocksAtSameLevel.length - 1) {
      const nextBlock = blocksAtSameLevel[currentIndex + 1];
      await updateDashboardBlock(block.id, { position: nextBlock.position });
      await updateDashboardBlock(nextBlock.id, { position: block.position });
    }
  };
  
  const handleSaveBlock = async () => {
    try {
      const toastId = toast.loading("Saving dashboard block...");
      
      // Extract the block title from formData
      const blockTitle = formData.blockTitle || `New ${selectedBlockType}`;
      // Extract showTitle option
      const showTitle = formData.showTitle !== false; // Default to true if not explicitly set to false
      
      console.log('Saving block with showTitle:', showTitle, 'and formData:', formData);
      
      // Remove blockTitle and showTitle from the content data
      const { blockTitle: _, showTitle: __, ...contentData } = formData;
      
      if (editingBlock) {
        // Update existing block
        await updateDashboardBlock(editingBlock.id, {
          title: blockTitle,
          content: contentData,
          type: selectedBlockType,
          showTitle: showTitle
        });
        
        console.log('Updated block with showTitle:', showTitle);
      } else {
        // Create new block
        // Get max position for new block
        const maxPosition = sortedBlocks.length > 0
          ? Math.max(...sortedBlocks.map(b => b.position)) + 1
          : 0;
        
        await addDashboardBlock({
          companyId: companyId!,
          title: blockTitle,
          content: contentData,
          type: selectedBlockType,
          position: maxPosition,
          showTitle: showTitle
        });
        
        console.log('Created new block with showTitle:', showTitle);
      }
      
      toast.success("Block saved successfully", { id: toastId });
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving block:', error);
      toast.error("Failed to save dashboard block", {
        description: error.message || "Please try again"
      });
    }
  };
  
  const renderBlockForm = () => {
    // Common title field and visibility toggle to be shown for all block types
    const commonTitleField = (
      <div className="mb-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Block Title/Name</label>
          <Input 
            value={formData.blockTitle || ''}
            onChange={e => setFormData({ ...formData, blockTitle: e.target.value })}
            placeholder="Enter block title"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="show-title"
            checked={formData.showTitle !== false} // Default to true if not explicitly false
            onCheckedChange={checked => setFormData({ ...formData, showTitle: checked })}
          />
          <label htmlFor="show-title" className="text-sm font-medium">
            Show title on dashboard
          </label>
        </div>
      </div>
    );
    
    switch (selectedBlockType) {
      case 'heading':
        return (
          <div className="space-y-4">
            {commonTitleField}
            <div>
              <label className="text-sm font-medium">Text</label>
              <Input 
                value={formData.text || ''} 
                onChange={e => setFormData({ ...formData, text: e.target.value })} 
                placeholder="Heading text"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Level</label>
              <Select 
                value={String(formData.level || '1')} 
                onValueChange={value => setFormData({ ...formData, level: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select heading level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Heading 1 (Largest)</SelectItem>
                  <SelectItem value="2">Heading 2</SelectItem>
                  <SelectItem value="3">Heading 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'text':
        return (
          <div className="space-y-4">
            {commonTitleField}
            <div>
              <label className="text-sm font-medium">Text</label>
              <Textarea 
                value={formData.text || ''} 
                onChange={e => setFormData({ ...formData, text: e.target.value })} 
                placeholder="Content text"
                rows={6}
              />
            </div>
          </div>
        );
        
      case 'card':
        return (
          <div className="space-y-4">
            {commonTitleField}
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={formData.title || ''} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Card title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea 
                value={formData.content || ''} 
                onChange={e => setFormData({ ...formData, content: e.target.value })} 
                placeholder="Card content"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action (Optional)</label>
              <Input 
                value={formData.action?.label || ''} 
                onChange={e => setFormData({ 
                  ...formData, 
                  action: { ...formData.action, label: e.target.value } 
                })} 
                placeholder="Button label"
              />
              <Input 
                value={formData.action?.link || ''} 
                onChange={e => setFormData({ 
                  ...formData, 
                  action: { ...formData.action, link: e.target.value } 
                })} 
                placeholder="Button link URL"
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            {commonTitleField}
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input 
                value={formData.url || ''} 
                onChange={e => setFormData({ ...formData, url: e.target.value })} 
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Alt Text</label>
              <Input 
                value={formData.alt || ''} 
                onChange={e => setFormData({ ...formData, alt: e.target.value })} 
                placeholder="Image description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Caption (Optional)</label>
              <Input 
                value={formData.caption || ''} 
                onChange={e => setFormData({ ...formData, caption: e.target.value })} 
                placeholder="Image caption"
              />
            </div>
            
            {/* New image styling controls */}
            <div className="border p-4 rounded-md bg-muted/20">
              <h4 className="text-sm font-medium mb-3">Image Display Options</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Width</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="text"
                      value={formData.width || ''} 
                      onChange={e => setFormData({ ...formData, width: e.target.value })} 
                      placeholder="e.g., 100%, 500px"
                      className="w-full"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFormData({ ...formData, width: '100%' })}
                      className="whitespace-nowrap"
                    >
                      Full Width
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a value like "100%" or "500px"
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Object Fit</label>
                  <Select 
                    value={formData.objectFit || 'cover'} 
                    onValueChange={value => setFormData({ ...formData, objectFit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select how the image should fit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover (fill container, crop if needed)</SelectItem>
                      <SelectItem value="contain">Contain (show full image)</SelectItem>
                      <SelectItem value="fill">Fill (stretch to fit)</SelectItem>
                      <SelectItem value="none">None (original size)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Object Position</label>
                  <div className="grid grid-cols-3 gap-2 my-2">
                    {['top left', 'top', 'top right', 'left', 'center', 'right', 'bottom left', 'bottom', 'bottom right'].map(position => (
                      <Button 
                        key={position}
                        variant={formData.objectPosition === position ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, objectPosition: position })}
                        className="h-8"
                      >
                        {position}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Fixed Height</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Switch
                      id="use-fixed-height"
                      checked={!!formData.height}
                      onCheckedChange={checked => {
                        if (checked) {
                          setFormData({ ...formData, height: "auto" });
                        } else {
                          const { height, ...rest } = formData;
                          setFormData(rest);
                        }
                      }}
                    />
                    <label htmlFor="use-fixed-height" className="text-sm">
                      Use aspect ratio container
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {formData.url && (
              <div className="mt-2 border rounded p-3">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <div style={{ 
                  width: formData.width || 'auto',
                  maxWidth: '100%'
                }}>
                  {formData.height ? (
                    <AspectRatio ratio={16/9}>
                      <img 
                        src={formData.url} 
                        alt={formData.alt || "Preview"} 
                        className="rounded-md w-full h-full"
                        style={{
                          objectFit: formData.objectFit || 'cover',
                          objectPosition: formData.objectPosition || 'center'
                        }}
                      />
                    </AspectRatio>
                  ) : (
                    <img 
                      src={formData.url} 
                      alt={formData.alt || "Preview"} 
                      className="max-w-full h-auto rounded-md"
                      style={{
                        objectFit: formData.objectFit || 'cover',
                        objectPosition: formData.objectPosition || 'center'
                      }}
                    />
                  )}
                  {formData.caption && (
                    <p className="text-sm text-center mt-1">{formData.caption}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'faq':
        const items = formData.items || [{ question: '', answer: '' }];
        
        return (
          <div className="space-y-4">
            {commonTitleField}
            {items.map((item: any, index: number) => (
              <div key={index} className="space-y-2 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium">Question {index + 1}</label>
                  <Input 
                    value={item.question} 
                    onChange={e => {
                      const newItems = [...items];
                      newItems[index].question = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }} 
                    placeholder="FAQ question"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Answer {index + 1}</label>
                  <Textarea 
                    value={item.answer} 
                    onChange={e => {
                      const newItems = [...items];
                      newItems[index].answer = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }} 
                    placeholder="FAQ answer"
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newItems = items.filter((_: any, i: number) => i !== index);
                    setFormData({ ...formData, items: newItems.length ? newItems : [{ question: '', answer: '' }] });
                  }}
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => {
                setFormData({ ...formData, items: [...items, { question: '', answer: '' }] });
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add FAQ Item
            </Button>
          </div>
        );
        
      case 'links':
        const links = formData.links || [{ label: '', url: '' }];
        
        return (
          <div className="space-y-4">
            {commonTitleField}
            {links.map((link: any, index: number) => (
              <div key={index} className="space-y-2 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium">Label {index + 1}</label>
                  <Input 
                    value={link.label} 
                    onChange={e => {
                      const newLinks = [...links];
                      newLinks[index].label = e.target.value;
                      setFormData({ ...formData, links: newLinks });
                    }} 
                    placeholder="Link label"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL {index + 1}</label>
                  <Input 
                    value={link.url} 
                    onChange={e => {
                      const newLinks = [...links];
                      newLinks[index].url = e.target.value;
                      setFormData({ ...formData, links: newLinks });
                    }} 
                    placeholder="Link URL"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newLinks = links.filter((_: any, i: number) => i !== index);
                    setFormData({ ...formData, links: newLinks.length ? newLinks : [{ label: '', url: '' }] });
                  }}
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => {
                setFormData({ ...formData, links: [...links, { label: '', url: '' }] });
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add Link
            </Button>
          </div>
        );
        
      case 'dropdown':
        const dropdownItems = formData.items || [{ label: '', content: '' }];
        
        return (
          <div className="space-y-4">
            {commonTitleField}
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={formData.title || ''} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Dropdown title"
              />
            </div>
            {dropdownItems.map((item: any, index: number) => (
              <div key={index} className="space-y-2 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium">Tab Label {index + 1}</label>
                  <Input 
                    value={item.label} 
                    onChange={e => {
                      const newItems = [...dropdownItems];
                      newItems[index].label = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }} 
                    placeholder="Tab label"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tab Content {index + 1}</label>
                  <Textarea 
                    value={item.content} 
                    onChange={e => {
                      const newItems = [...dropdownItems];
                      newItems[index].content = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }} 
                    placeholder="Tab content"
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newItems = dropdownItems.filter((_: any, i: number) => i !== index);
                    setFormData({ ...formData, items: newItems.length ? newItems : [{ label: '', content: '' }] });
                  }}
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => {
                setFormData({ ...formData, items: [...dropdownItems, { label: '', content: '' }] });
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add Tab Item
            </Button>
          </div>
        );
        
      default:
        return <div>Select a block type</div>;
    }
  };
  
  // Render a preview of a dashboard block
  const renderBlockPreview = (block: DashboardBlock) => {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2 pt-4 flex flex-row justify-between items-center">
          <div>
            {!isPreview && (
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {block.type}
              </div>
            )}
            {(block.showTitle !== false) && (
              <CardTitle className="text-lg">{block.title}</CardTitle>
            )}
          </div>
          
          {!isPreview && (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => handleMoveBlock(block, 'up')}>
                <MoveUp className="h-4 w-4" />
                <span className="sr-only">Move up</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleMoveBlock(block, 'down')}>
                <MoveDown className="h-4 w-4" />
                <span className="sr-only">Move down</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleEditBlock(block)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(block.id)}>
                <Trash className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isPreview ? (
            <div className="p-4 border rounded-md bg-white">
              {renderBlockContent(block)}
            </div>
          ) : (
            <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-32">
              {JSON.stringify(block.content, null, 2)}
            </pre>
          )}
          
          {/* Child blocks */}
          {getChildBlocks(block.id).length > 0 && (
            <div className="mt-4 border-l-2 border-muted pl-4">
              <div className="text-sm font-medium mb-2">Child Blocks:</div>
              {getChildBlocks(block.id).map(childBlock => (
                <Card key={childBlock.id} className="mb-2">
                  <CardHeader className="py-2 px-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        {childBlock.showTitle !== false ? childBlock.title : ''} ({childBlock.type})
                      </div>
                      {!isPreview && (
                        <div className="flex">
                          <Button variant="ghost" size="sm" onClick={() => handleEditBlock(childBlock)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(childBlock.id)}>
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // New function to render block content based on type
  const renderBlockContent = (block: DashboardBlock) => {
    const content = block.content || {};
    
    switch (block.type) {
      case 'heading': {
        const level = content.level || 2;
        const text = content.text || 'Heading';
        
        if (level === 1) return <h1 className="text-3xl font-bold">{text}</h1>;
        if (level === 2) return <h2 className="text-2xl font-bold">{text}</h2>;
        return <h3 className="text-xl font-bold">{text}</h3>;
      }
      
      case 'text':
        return (
          <div className="prose max-w-none">
            {content.text ? (
              <p>{content.text}</p>
            ) : (
              <p className="text-muted-foreground">No text content</p>
            )}
          </div>
        );
      
      case 'card':
        return (
          <Card>
            <CardHeader>
              <CardTitle>{content.title || 'Card Title'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{content.content || 'Card content'}</p>
            </CardContent>
            {content.action?.label && (
              <div className="p-4 pt-0">
                <Button variant="outline" size="sm">
                  {content.action.label}
                </Button>
              </div>
            )}
          </Card>
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            {content.url ? (
              <div style={{ 
                width: content.width || 'auto',
                maxWidth: '100%'
              }}>
                {content.height ? (
                  <AspectRatio ratio={16/9}>
                    <img 
                      src={content.url} 
                      alt={content.alt || 'Image'} 
                      className="w-full h-full rounded-md"
                      style={{
                        objectFit: content.objectFit || 'cover',
                        objectPosition: content.objectPosition || 'center'
                      }}
                    />
                  </AspectRatio>
                ) : (
                  <img 
                    src={content.url} 
                    alt={content.alt || 'Image'} 
                    className="max-w-full h-auto rounded-md"
                    style={{
                      objectFit: content.objectFit || 'cover',
                      objectPosition: content.objectPosition || 'center'
                    }}
                  />
                )}
                {content.caption && (
                  <p className="text-sm text-center mt-1 text-muted-foreground">
                    {content.caption}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-muted h-32 flex items-center justify-center rounded-md">
                <p className="text-muted-foreground">No image provided</p>
              </div>
            )}
          </div>
        );
      
      case 'faq':
        return (
          <div className="space-y-4">
            {content.items?.length > 0 ? (
              content.items.map((item: any, i: number) => (
                <div key={i} className="border-b pb-3">
                  <h4 className="font-medium text-lg">{item.question || `Question ${i + 1}`}</h4>
                  <p className="mt-1">{item.answer || `Answer ${i + 1}`}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No FAQ items</p>
            )}
          </div>
        );
      
      case 'links':
        return (
          <div className="space-y-2">
            {content.links?.length > 0 ? (
              content.links.map((link: any, i: number) => (
                <div key={i} className="flex items-center">
                  <a href={link.url || '#'} className="text-primary hover:underline">
                    {link.label || `Link ${i + 1}`}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No links</p>
            )}
          </div>
        );
      
      case 'dropdown':
        return (
          <div>
            <h3 className="font-medium">{content.title || 'Dropdown'}</h3>
            <div className="mt-2 border rounded-lg">
              {content.items?.length > 0 ? (
                content.items.map((item: any, i: number) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <h4 className="font-medium">{item.label || `Item ${i + 1}`}</h4>
                    {item.content && <p className="mt-1 text-sm">{item.content}</p>}
                  </div>
                ))
              ) : (
                <div className="p-3 text-muted-foreground">No dropdown items</div>
              )}
            </div>
          </div>
        );
      
      default:
        return <div className="text-muted-foreground">Preview not available for this block type</div>;
    }
  };
  
  // Show loading when checking permissions or fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard builder...</span>
      </div>
    );
  }
  
  if (!company) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Company not found. Please check the company ID.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company.name} - Dashboard Builder</h1>
          <p className="text-muted-foreground">Create and manage dashboard content for this company</p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={handleManualRefetch}
            className="flex items-center gap-1"
          >
            <Loader className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            variant={isPreview ? "outline" : "default"}
            className="flex items-center gap-1"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? (
              <>
                <Edit className="h-4 w-4" /> Edit Mode
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Preview Mode
              </>
            )}
          </Button>
          
          {!isPreview && (
            <Button onClick={handleAddBlock}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Block
            </Button>
          )}
        </div>
      </div>
      
      <Separator />
      
      {loadingDashboardBlocks ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          {sortedBlocks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No dashboard blocks yet. Add your first block to get started.</p>
                <Button onClick={handleAddBlock} className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add First Block
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedBlocks.map(block => (
                <div key={block.id} className="mb-4">
                  {renderBlockPreview(block)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Add/Edit Block Dialog */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          // If dialog is being closed, reset all related state
          if (!open) {
            setDialogOpen(false);
            // No need to reset other state here as we'll set them properly before opening again
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{editingBlock ? 'Edit Block' : 'Add New Block'}</DialogTitle>
            <DialogDescription>
              Configure your dashboard block. Different block types have different options.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Block Type</label>
                <Select 
                  value={selectedBlockType}
                  onValueChange={(value) => {
                    setSelectedBlockType(value as BlockType);
                    setFormData({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select block type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heading">Heading</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="links">Links</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {selectedBlockType && (
                <div className="border rounded-md p-4 bg-muted/10">
                  {renderBlockForm()}
                </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBlock}>{editingBlock ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDashboardBuilderPage;
