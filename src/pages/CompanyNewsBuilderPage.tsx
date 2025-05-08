import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { CompanyNewsBlock, NewsBlockType } from '@/types/companyNews';
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner';
import { useNewsBlocksFetcher } from '@/hooks/useNewsBlocksFetcher';
import { useNewsBlockEditor } from '@/hooks/useNewsBlockEditor';

const CompanyNewsBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { 
    currentUser,
    companies,
    addCompanyNewsBlock,
    updateCompanyNewsBlock,
    deleteCompanyNewsBlock,
    publishCompanyNewsBlock
  } = useAppContext();
  
  const { 
    blocks, 
    loading, 
    error, 
    refetch, 
    updateLocalBlock 
  } = useNewsBlocksFetcher(companyId);
  
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
    updateLocalBlock: updateLocalBlock
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<NewsBlockType>('text');
  const [formData, setFormData] = useState<any>({});
  const [isPreview, setIsPreview] = useState(false);
  
  // Find the company
  const company = companies.find(c => c.id === companyId);
  
  const handleAddBlock = () => {
    setFormData({});
    setDialogOpen(true);
  };
  
  const handleEditBlock = (block: CompanyNewsBlock) => {
    setSelectedBlockId(block.id);
  };
  
  const handleDeleteBlock = async (blockId: string) => {
    if (confirm('Are you sure you want to delete this block?')) {
      await deleteCompanyNewsBlock(blockId);
      toast.success("Block deleted successfully");
    }
  };
  
  const handleMoveBlock = async (block: CompanyNewsBlock, direction: 'up' | 'down') => {
    const blocksAtSameLevel = blocks
      .filter(b => 
        (b.parentId === block.parentId || (!b.parentId && !block.parentId)) && 
        b.companyId === block.companyId
      )
      .sort((a, b) => a.position - b.position);
    
    const currentIndex = blocksAtSameLevel.findIndex(b => b.id === block.id);
    
    if (direction === 'up' && currentIndex > 0) {
      const previousBlock = blocksAtSameLevel[currentIndex - 1];
      await updateCompanyNewsBlock(block.id, { position: previousBlock.position });
      await updateCompanyNewsBlock(previousBlock.id, { position: block.position });
    }
    
    if (direction === 'down' && currentIndex < blocksAtSameLevel.length - 1) {
      const nextBlock = blocksAtSameLevel[currentIndex + 1];
      await updateCompanyNewsBlock(block.id, { position: nextBlock.position });
      await updateCompanyNewsBlock(nextBlock.id, { position: block.position });
    }
  };
  
  const handleSaveBlock = async () => {
    try {
      if (!companyId) {
        toast.error("Company ID is missing");
        return;
      }
      
      if (selectedBlock) {
        // Update existing block
        await updateCompanyNewsBlock(selectedBlock.id, {
          title: formData.title || selectedBlock.title,
          content: formData,
          type: selectedBlockType
        });
        toast.success("Block updated successfully");
      } else {
        // Create new block
        const maxPosition = blocks.length > 0
          ? Math.max(...blocks.map(b => b.position)) + 1
          : 0;
        
        await addCompanyNewsBlock({
          companyId: companyId!,
          title: formData.title || `New ${selectedBlockType}`,
          content: formData,
          type: selectedBlockType,
          position: maxPosition
        });
        toast.success("Block added successfully");
      }
      
      setDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving block:', error);
      toast.error("Failed to save block", {
        description: error.message || "Please try again"
      });
    }
  };
  
  const handlePublishToggle = async (blockId: string, isPublished: boolean) => {
    try {
      
      // Update local state optimistically
      updateLocalBlock({
        id: blockId,
        isPublished: isPublished
      });
      
      // Database update - calling with just blockId
      await publishCompanyNewsBlock(blockId);
      
      toast.success(isPublished ? "Published" : "Unpublished", {
        description: `Block ${isPublished ? 'published' : 'unpublished'} successfully`
      });
    } catch (error) {
      console.error('Error publishing block:', error);
      
      toast.error("Failed to update", {
        description: "Could not update publish status"
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
                value={String(formData.level || '2')} 
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
  const renderBlockPreview = (block: CompanyNewsBlock) => {
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
        </CardContent>
      </Card>
    );
  };
  
  if (!currentUser || currentUser.role !== 'consultant') {
    navigate('/');
    return null;
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
          <h1 className="text-2xl font-bold tracking-tight">{company.name} - News Builder</h1>
          <p className="text-muted-foreground">Create and manage news content for this company</p>
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
      
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Block List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>News Blocks</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {blocks.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No news blocks yet. Add your first block to get started.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {blocks.map(block => (
                      <Button
                        key={block.id}
                        variant={selectedBlockId === block.id ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedBlockId(block.id)}
                      >
                        {block.title}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Block Editor */}
          <div className="lg:col-span-2">
            {selectedBlock ? (
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Edit Block</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="publish-status"
                      checked={editedBlockData.isPublished}
                      onCheckedChange={(checked) => {
                        handlePublishToggle(selectedBlock.id, checked);
                        handleFormChange('isPublished', checked);
                      }}
                    />
                    <Label htmlFor="publish-status">
                      {editedBlockData.isPublished ? 'Published' : 'Draft'}
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="edit" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="edit" onClick={() => setActiveTab('edit')}>Edit</TabsTrigger>
                      <TabsTrigger value="preview" onClick={() => setActiveTab('preview')}>Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Title</label>
                          <Input 
                            value={editedBlockData.title || ''} 
                            onChange={e => handleFormChange('title', e.target.value)} 
                            placeholder="Block title"
                          />
                        </div>
                        
                        {/* Render block-specific form */}
                        {selectedBlock.type && (
                          <div className="border rounded-md p-4 bg-muted/10">
                            {(() => {
                              switch (selectedBlock.type) {
                                case 'heading':
                                  return (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-sm font-medium">Text</label>
                                        <Input
                                          value={editedBlockData.content?.text || ''}
                                          onChange={e => handleFormChange('content.text', e.target.value)}
                                          placeholder="Heading text"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Level</label>
                                        <Select
                                          value={String(editedBlockData.content?.level || '2')}
                                          onValueChange={value => handleFormChange('content.level', Number(value))}
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
                                          value={editedBlockData.content?.text || ''}
                                          onChange={e => handleFormChange('content.text', e.target.value)}
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
                                          value={editedBlockData.content?.title || ''}
                                          onChange={e => handleFormChange('content.title', e.target.value)}
                                          placeholder="Card title"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Content</label>
                                        <Textarea
                                          value={editedBlockData.content?.content || ''}
                                          onChange={e => handleFormChange('content.content', e.target.value)}
                                          placeholder="Card content"
                                          rows={4}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">Action (Optional)</label>
                                        <Input
                                          value={editedBlockData.content?.action?.label || ''}
                                          onChange={e => handleNestedContentChange(['action', 'label'], e.target.value)}
                                          placeholder="Button label"
                                        />
                                        <Input
                                          value={editedBlockData.content?.action?.link || ''}
                                          onChange={e => handleNestedContentChange(['action', 'link'], e.target.value)}
                                          placeholder="Button link URL"
                                        />
                                      </div>
                                    </div>
                                  );
                                  
                                case 'faq':
                                  const items = editedBlockData.content?.items || [{ question: '', answer: '' }];
                                  
                                  return (
                                    <div className="space-y-4">
                                      {items.map((item: any, index: number) => (
                                        <div key={index} className="space-y-2 pb-4 border-b">
                                          <div>
                                            <label className="text-sm font-medium">Question {index + 1}</label>
                                            <Input
                                              value={item.question}
                                              onChange={e => handleNestedContentChange(['items', index, 'question'], e.target.value)}
                                              placeholder="FAQ question"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium">Answer {index + 1}</label>
                                            <Textarea
                                              value={item.answer}
                                              onChange={e => handleNestedContentChange(['items', index, 'answer'], e.target.value)}
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
                                              handleNestedContentChange(['items'], newItems.length ? newItems : [{ question: '', answer: '' }]);
                                            }}
                                          >
                                            <Trash className="h-4 w-4 mr-1" /> Remove
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          handleNestedContentChange(['items'], [...items, { question: '', answer: '' }]);
                                        }}
                                      >
                                        <PlusCircle className="h-4 w-4 mr-1" /> Add FAQ Item
                                      </Button>
                                    </div>
                                  );
                                  
                                case 'links':
                                  const links = editedBlockData.content?.links || [{ label: '', url: '' }];
                                  
                                  return (
                                    <div className="space-y-4">
                                      {links.map((link: any, index: number) => (
                                        <div key={index} className="space-y-2 pb-4 border-b">
                                          <div>
                                            <label className="text-sm font-medium">Label {index + 1}</label>
                                            <Input
                                              value={link.label}
                                              onChange={e => handleNestedContentChange(['links', index, 'label'], e.target.value)}
                                              placeholder="Link label"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium">URL {index + 1}</label>
                                            <Input
                                              value={link.url}
                                              onChange={e => handleNestedContentChange(['links', index, 'url'], e.target.value)}
                                              placeholder="Link URL"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                              const newLinks = links.filter((_: any, i: number) => i !== index);
                                              handleNestedContentChange(['links'], newLinks.length ? newLinks : [{ label: '', url: '' }]);
                                            }}
                                          >
                                            <Trash className="h-4 w-4 mr-1" /> Remove
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          handleNestedContentChange(['links'], [...links, { label: '', url: '' }]);
                                        }}
                                      >
                                        <PlusCircle className="h-4 w-4 mr-1" /> Add Link
                                      </Button>
                                    </div>
                                  );
                                  
                                case 'dropdown':
                                  const dropdownItems = editedBlockData.content?.items || [{ label: '', content: '' }];
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-sm font-medium">Title</label>
                                        <Input
                                          value={editedBlockData.content?.title || ''}
                                          onChange={e => handleFormChange('content.title', e.target.value)}
                                          placeholder="Dropdown title"
                                        />
                                      </div>
                                      {dropdownItems.map((item: any, index: number) => (
                                        <div key={index} className="space-y-2 pb-4 border-b">
                                          <div>
                                            <label className="text-sm font-medium">Tab Label {index + 1}</label>
                                            <Input
                                              value={item.label}
                                              onChange={e => handleNestedContentChange(['items', index, 'label'], e.target.value)}
                                              placeholder="Tab label"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium">Tab Content {index + 1}</label>
                                            <Textarea
                                              value={item.content}
                                              onChange={e => handleNestedContentChange(['items', index, 'content'], e.target.value)}
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
                                              handleNestedContentChange(['items'], newItems.length ? newItems : [{ label: '', content: '' }]);
                                            }}
                                          >
                                            <Trash className="h-4 w-4 mr-1" /> Remove
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          handleNestedContentChange(['items'], [...dropdownItems, { label: '', content: '' }]);
                                        }}
                                      >
                                        <PlusCircle className="h-4 w-4 mr-1" /> Add Tab Item
                                      </Button>
                                    </div>
                                  );
                                  
                                default:
                                  return <div>Select a block type</div>;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="preview">
                      {renderBlockPreview(selectedBlock)}
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-between">
                    <Button variant="destructive" onClick={() => handleDeleteBlock(selectedBlock.id)}>
                      <Trash className="h-4 w-4 mr-2" /> Delete Block
                    </Button>
                    <Button 
                      onClick={saveCurrentBlock} 
                      disabled={!hasUnsavedChanges || saving}
                    >
                      {saving ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Select a block to edit, or add a new block.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Add/Edit Block Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBlock ? 'Edit Block' : 'Add New Block'}</DialogTitle>
            <DialogDescription>
              Configure your news block. Different block types have different options.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Block Type</label>
              <Select 
                value={selectedBlockType}
                onValueChange={(value) => {
                  setSelectedBlockType(value as NewsBlockType);
                  setFormData(getDefaultContent(value as NewsBlockType));
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
