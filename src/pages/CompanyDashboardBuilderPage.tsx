
import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
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
import { toast } from 'sonner';

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
  
  const [sortedBlocks, setSortedBlocks] = useState<DashboardBlock[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<DashboardBlock | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>('text');
  const [formData, setFormData] = useState<any>({});
  const [isPreview, setIsPreview] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Find the company
  const company = companies.find(c => c.id === companyId);
  
  // Check auth in useEffect, not during render
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'consultant') {
      console.log("User is not a consultant, redirecting to home");
      setShouldRedirect(true);
    }
  }, [currentUser]);

  // Separate useEffect for navigation
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/');
    }
  }, [shouldRedirect, navigate]);
  
  useEffect(() => {
    if (companyId) {
      refetchDashboardBlocks(companyId);
    }
  }, [companyId, refetchDashboardBlocks]);
  
  useEffect(() => {
    // Sort blocks by position and filter to only include top-level blocks (no parentId)
    const topLevelBlocks = dashboardBlocks
      .filter(block => !block.parentId && block.companyId === companyId)
      .sort((a, b) => a.position - b.position);
    
    setSortedBlocks(topLevelBlocks);
  }, [dashboardBlocks, companyId]);
  
  // Get child blocks for a given parent ID
  const getChildBlocks = (parentId: string) => {
    return dashboardBlocks
      .filter(block => block.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  };
  
  const handleAddBlock = () => {
    setEditingBlock(null);
    setSelectedBlockType('text');
    setFormData({});
    setDialogOpen(true);
  };
  
  const handleEditBlock = (block: DashboardBlock) => {
    setEditingBlock(block);
    setSelectedBlockType(block.type);
    setFormData(block.content);
    setDialogOpen(true);
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
      
      if (editingBlock) {
        // Update existing block
        await updateDashboardBlock(editingBlock.id, {
          title: formData.title || editingBlock.title,
          content: formData,
          type: selectedBlockType
        });
      } else {
        // Create new block
        // Get max position for new block
        const maxPosition = sortedBlocks.length > 0
          ? Math.max(...sortedBlocks.map(b => b.position)) + 1
          : 0;
        
        await addDashboardBlock({
          companyId: companyId!,
          title: formData.title || `New ${selectedBlockType}`,
          content: formData,
          type: selectedBlockType,
          position: maxPosition
        });
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
    switch (selectedBlockType) {
      case 'heading':
        return (
          <div className="space-y-4">
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
        
      case 'faq':
        const items = formData.items || [{ question: '', answer: '' }];
        
        return (
          <div className="space-y-4">
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
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {block.type}
            </div>
            <CardTitle className="text-lg">{block.title}</CardTitle>
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
          <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-32">
            {JSON.stringify(block.content, null, 2)}
          </pre>
          
          {/* Child blocks */}
          {getChildBlocks(block.id).length > 0 && (
            <div className="mt-4 border-l-2 border-muted pl-4">
              <div className="text-sm font-medium mb-2">Child Blocks:</div>
              {getChildBlocks(block.id).map(childBlock => (
                <Card key={childBlock.id} className="mb-2">
                  <CardHeader className="py-2 px-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">{childBlock.title} ({childBlock.type})</div>
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
  
  // Show loading when checking auth
  if (shouldRedirect) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Redirecting...</span>
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Edit Block' : 'Add New Block'}</DialogTitle>
            <DialogDescription>
              Configure your dashboard block. Different block types have different options.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBlock}>{editingBlock ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDashboardBuilderPage;
