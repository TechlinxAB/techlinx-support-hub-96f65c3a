
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader, PlusCircle, Trash, MoveUp, MoveDown, Edit, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

// Define types for news blocks
type NewsBlockType = 'headline' | 'paragraph' | 'image' | 'quote' | 'list';

interface NewsBlock {
  id: string;
  companyId: string;
  title: string;
  type: NewsBlockType;
  content: any;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublished: boolean;
}

const CompanyNewsBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { currentUser, companies } = useAppContext();
  const { toast } = useToast();
  
  const [newsBlocks, setNewsBlocks] = useState<NewsBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<NewsBlock | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<NewsBlockType>('paragraph');
  const [formData, setFormData] = useState<any>({});
  const [isPreview, setIsPreview] = useState(false);
  
  // Find the company
  const company = companies.find(c => c.id === companyId);
  
  // Temporarily disabled fetchNewsBlocks functionality
  /* 
  useEffect(() => {
    fetchNewsBlocks();
  }, [companyId]);
  
  const fetchNewsBlocks = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // This will be implemented once the company_news_blocks table exists
      setNewsBlocks([]);
    } catch (error) {
      console.error('Error fetching news blocks:', error);
      toast({
        title: "Error",
        description: "Failed to load news blocks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  */
  
  const handleAddBlock = () => {
    setEditingBlock(null);
    setSelectedBlockType('paragraph');
    setFormData({});
    setDialogOpen(true);
  };
  
  const handleEditBlock = (block: NewsBlock) => {
    setEditingBlock(block);
    setSelectedBlockType(block.type);
    setFormData(block.content);
    setDialogOpen(true);
  };
  
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this news block?')) return;
    
    try {
      // This will be implemented once the company_news_blocks table exists
      setNewsBlocks(newsBlocks.filter(block => block.id !== blockId));
      
      toast({
        title: "Success",
        description: "News block deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting block:', error);
      toast({
        title: "Error",
        description: "Failed to delete news block",
        variant: "destructive"
      });
    }
  };
  
  const handleMoveBlock = async (block: NewsBlock, direction: 'up' | 'down') => {
    const blocksCopy = [...newsBlocks];
    const currentIndex = blocksCopy.findIndex(b => b.id === block.id);
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap positions with the previous block
      const tempBlocksCopy = [...blocksCopy];
      const temp = tempBlocksCopy[currentIndex];
      tempBlocksCopy[currentIndex] = tempBlocksCopy[currentIndex - 1];
      tempBlocksCopy[currentIndex - 1] = temp;
      
      // Update the state
      setNewsBlocks(tempBlocksCopy);
      
      toast({
        title: "Success",
        description: "Block moved successfully"
      });
    }
    
    if (direction === 'down' && currentIndex < blocksCopy.length - 1) {
      // Swap positions with the next block
      const tempBlocksCopy = [...blocksCopy];
      const temp = tempBlocksCopy[currentIndex];
      tempBlocksCopy[currentIndex] = tempBlocksCopy[currentIndex + 1];
      tempBlocksCopy[currentIndex + 1] = temp;
      
      // Update the state
      setNewsBlocks(tempBlocksCopy);
      
      toast({
        title: "Success",
        description: "Block moved successfully"
      });
    }
  };
  
  const handleSaveBlock = async () => {
    try {
      if (editingBlock) {
        // Update existing block (in-memory only for now)
        const updatedBlocks = newsBlocks.map(block => {
          if (block.id === editingBlock.id) {
            return {
              ...block,
              title: formData.title || editingBlock.title,
              type: selectedBlockType,
              content: formData,
              updatedAt: new Date()
            };
          }
          return block;
        });
        
        setNewsBlocks(updatedBlocks);
        
        toast({
          title: "Success",
          description: "News block updated successfully"
        });
      } else {
        // Create new block (in-memory only for now)
        const newBlock: NewsBlock = {
          id: `temp-${Date.now()}`, // Temporary ID
          companyId: companyId || '',
          title: formData.title || `New ${selectedBlockType}`,
          type: selectedBlockType,
          content: formData,
          position: newsBlocks.length,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUser?.id || '',
          isPublished: false
        };
        
        setNewsBlocks([...newsBlocks, newBlock]);
        
        toast({
          title: "Success",
          description: "News block created successfully"
        });
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving block:', error);
      toast({
        title: "Error",
        description: "Failed to save news block",
        variant: "destructive"
      });
    }
  };
  
  const handleTogglePublish = async (blockId: string, currentStatus: boolean) => {
    try {
      // Update in-memory only for now
      const updatedBlocks = newsBlocks.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            isPublished: !currentStatus,
            updatedAt: new Date()
          };
        }
        return block;
      });
      
      setNewsBlocks(updatedBlocks);
      
      toast({
        title: "Success",
        description: `News block ${!currentStatus ? "published" : "unpublished"} successfully`
      });
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({
        title: "Error",
        description: "Failed to update publish status",
        variant: "destructive"
      });
    }
  };
  
  const renderBlockForm = () => {
    switch (selectedBlockType) {
      case 'headline':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Headline Text</label>
              <Input 
                value={formData.text || ''} 
                onChange={e => setFormData({ ...formData, text: e.target.value })} 
                placeholder="Headline text"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Level</label>
              <Select 
                value={String(formData.level || '1')} 
                onValueChange={value => setFormData({ ...formData, level: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select headline level" />
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
        
      case 'paragraph':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title (Optional)</label>
              <Input 
                value={formData.title || ''} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Paragraph title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea 
                value={formData.text || ''} 
                onChange={e => setFormData({ ...formData, text: e.target.value })} 
                placeholder="Paragraph content"
                rows={6}
              />
            </div>
          </div>
        );
        
      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input 
                value={formData.url || ''} 
                onChange={e => setFormData({ ...formData, url: e.target.value })} 
                placeholder="Image URL"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Alt Text</label>
              <Input 
                value={formData.alt || ''} 
                onChange={e => setFormData({ ...formData, alt: e.target.value })} 
                placeholder="Image alt text"
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
          </div>
        );
        
      case 'quote':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Quote Text</label>
              <Textarea 
                value={formData.text || ''} 
                onChange={e => setFormData({ ...formData, text: e.target.value })} 
                placeholder="Quote text"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Citation (Optional)</label>
              <Input 
                value={formData.citation || ''} 
                onChange={e => setFormData({ ...formData, citation: e.target.value })} 
                placeholder="Quote citation"
              />
            </div>
          </div>
        );
        
      case 'list':
        const items = formData.items || [''];
        
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">List Title (Optional)</label>
              <Input 
                value={formData.title || ''} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                placeholder="List title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">List Type</label>
              <Select 
                value={formData.listType || 'bullet'} 
                onValueChange={value => setFormData({ ...formData, listType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select list type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bullet">Bullet List</SelectItem>
                  <SelectItem value="numbered">Numbered List</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">List Items</label>
              {items.map((item: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index] = e.target.value;
                      setFormData({ ...formData, items: newItems });
                    }}
                    placeholder={`Item ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const newItems = items.filter((_: string, i: number) => i !== index);
                      setFormData({ ...formData, items: newItems.length ? newItems : [''] });
                    }}
                    disabled={items.length === 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              type="button"
              onClick={() => {
                setFormData({ ...formData, items: [...items, ''] });
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
        );
        
      default:
        return <div>Select a block type</div>;
    }
  };
  
  // Render a preview of a news block
  const renderBlockPreview = (block: NewsBlock) => {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2 pt-4 flex flex-row justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {block.type}
              </div>
              {block.isPublished ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Published</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Draft</span>
              )}
            </div>
            <CardTitle className="text-lg">{block.title}</CardTitle>
          </div>
          
          {!isPreview && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleTogglePublish(block.id, block.isPublished)}
              >
                {block.isPublished ? 'Unpublish' : 'Publish'}
              </Button>
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
          <h1 className="text-2xl font-bold tracking-tight">{company.name} - Company News Editor</h1>
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
              <PlusCircle className="h-4 w-4 mr-2" /> Add News Block
            </Button>
          )}
        </div>
      </div>
      
      <Separator />
      
      <Alert>
        <AlertDescription>
          Note: Company news feature is under development. News blocks will be stored in-memory only for now. 
          Please contact an administrator to enable persistent storage for news blocks.
        </AlertDescription>
      </Alert>
      
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          {newsBlocks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No news blocks yet. Add your first block to get started.</p>
                <Button onClick={handleAddBlock} className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add First Block
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {newsBlocks.map(block => (
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
            <DialogTitle>{editingBlock ? 'Edit News Block' : 'Add News Block'}</DialogTitle>
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
                  setFormData({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select block type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="headline">Headline</SelectItem>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="list">List</SelectItem>
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

export default CompanyNewsBuilderPage;
