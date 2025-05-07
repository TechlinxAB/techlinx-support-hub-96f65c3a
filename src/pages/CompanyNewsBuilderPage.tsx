
import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { NewsBlock, NewsBlockType } from '@/types/newsTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader, PlusCircle, Trash, MoveUp, MoveDown, Edit, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const CompanyNewsBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { currentUser, companies } = useAppContext();
  
  const [newsBlocks, setNewsBlocks] = useState<NewsBlock[]>([]);
  const [loadingNewsBlocks, setLoadingNewsBlocks] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<NewsBlock | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<NewsBlockType>('text');
  const [formData, setFormData] = useState<any>({});
  const [isPreview, setIsPreview] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  
  // Find the company
  const company = companies.find(c => c.id === companyId);
  
  // In a real implementation, we would fetch blocks from the database
  // For now, we'll use a mock implementation
  useEffect(() => {
    const fetchNewsBlocks = async () => {
      if (companyId) {
        setLoadingNewsBlocks(true);
        try {
          // In a real implementation, fetch from the database
          // const { data, error } = await supabase
          //   .from('company_news_blocks')
          //   .select('*')
          //   .eq('companyId', companyId)
          //   .order('position');
          
          // For now, use mock data or localStorage
          const storedBlocks = localStorage.getItem(`company_news_blocks_${companyId}`);
          const blocks = storedBlocks ? JSON.parse(storedBlocks) : [];
          setNewsBlocks(blocks);
          
          // Fetch articles too
          const storedArticles = localStorage.getItem(`company_news_articles_${companyId}`);
          const articlesData = storedArticles ? JSON.parse(storedArticles) : [];
          setArticles(articlesData);
        } catch (error) {
          console.error('Error fetching news blocks:', error);
          toast({
            title: "Error",
            description: "Failed to fetch news blocks",
            variant: "destructive"
          });
        } finally {
          setLoadingNewsBlocks(false);
        }
      }
    };
    
    fetchNewsBlocks();
  }, [companyId]);
  
  const handleAddBlock = () => {
    setEditingBlock(null);
    setSelectedBlockType('text');
    setFormData({});
    setDialogOpen(true);
  };
  
  const handleEditBlock = (block: NewsBlock) => {
    setEditingBlock(block);
    setSelectedBlockType(block.type);
    setFormData(block.content);
    setDialogOpen(true);
  };
  
  const handleDeleteBlock = (blockId: string) => {
    if (confirm('Are you sure you want to delete this block?')) {
      // Remove the block from state
      const updatedBlocks = newsBlocks.filter(b => b.id !== blockId);
      setNewsBlocks(updatedBlocks);
      
      // Update localStorage for demo purposes
      localStorage.setItem(`company_news_blocks_${companyId}`, JSON.stringify(updatedBlocks));
      
      // In a real implementation, we would delete from the database
      // await supabase
      //   .from('company_news_blocks')
      //   .delete()
      //   .eq('id', blockId);
      
      toast({
        title: "Success",
        description: "Block deleted successfully"
      });
    }
  };
  
  const handleMoveBlock = (block: NewsBlock, direction: 'up' | 'down') => {
    // Get all blocks at the same level
    const blocksAtSameLevel = [...newsBlocks].sort((a, b) => a.position - b.position);
    
    const currentIndex = blocksAtSameLevel.findIndex(b => b.id === block.id);
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap positions with the previous block
      const previousBlock = blocksAtSameLevel[currentIndex - 1];
      const updatedBlocks = newsBlocks.map(b => {
        if (b.id === block.id) {
          return { ...b, position: previousBlock.position };
        } else if (b.id === previousBlock.id) {
          return { ...b, position: block.position };
        }
        return b;
      });
      
      setNewsBlocks(updatedBlocks);
      localStorage.setItem(`company_news_blocks_${companyId}`, JSON.stringify(updatedBlocks));
    }
    
    if (direction === 'down' && currentIndex < blocksAtSameLevel.length - 1) {
      // Swap positions with the next block
      const nextBlock = blocksAtSameLevel[currentIndex + 1];
      const updatedBlocks = newsBlocks.map(b => {
        if (b.id === block.id) {
          return { ...b, position: nextBlock.position };
        } else if (b.id === nextBlock.id) {
          return { ...b, position: block.position };
        }
        return b;
      });
      
      setNewsBlocks(updatedBlocks);
      localStorage.setItem(`company_news_blocks_${companyId}`, JSON.stringify(updatedBlocks));
    }
  };
  
  const handleSaveBlock = () => {
    try {
      if (editingBlock) {
        // Update existing block
        const updatedBlocks = newsBlocks.map(b => {
          if (b.id === editingBlock.id) {
            return {
              ...b,
              title: formData.title || editingBlock.title,
              content: formData,
              type: selectedBlockType,
              updatedAt: new Date()
            };
          }
          return b;
        });
        
        setNewsBlocks(updatedBlocks);
        localStorage.setItem(`company_news_blocks_${companyId}`, JSON.stringify(updatedBlocks));
        
        // In a real implementation, we would update in the database
        // await supabase
        //   .from('company_news_blocks')
        //   .update({
        //     title: formData.title || editingBlock.title,
        //     content: formData,
        //     type: selectedBlockType,
        //     updated_at: new Date()
        //   })
        //   .eq('id', editingBlock.id);
      } else {
        // Create new block
        const maxPosition = newsBlocks.length > 0
          ? Math.max(...newsBlocks.map(b => b.position)) + 1
          : 0;
        
        const newBlock: NewsBlock = {
          id: `news-block-${Date.now()}`,  // Generate a unique ID (use UUID in real app)
          companyId: companyId!,
          title: formData.title || `New ${selectedBlockType}`,
          content: formData,
          type: selectedBlockType,
          position: maxPosition,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUser!.id
        };
        
        const updatedBlocks = [...newsBlocks, newBlock];
        setNewsBlocks(updatedBlocks);
        localStorage.setItem(`company_news_blocks_${companyId}`, JSON.stringify(updatedBlocks));
        
        // In a real implementation, we would insert into the database
        // await supabase
        //   .from('company_news_blocks')
        //   .insert({
        //     company_id: companyId,
        //     title: formData.title || `New ${selectedBlockType}`,
        //     content: formData,
        //     type: selectedBlockType,
        //     position: maxPosition,
        //     created_by: currentUser.id
        //   });
      }
      
      setDialogOpen(false);
      toast({
        title: "Success",
        description: editingBlock ? "Block updated successfully" : "Block created successfully"
      });
    } catch (error) {
      console.error('Error saving block:', error);
      toast({
        title: "Error",
        description: "Failed to save block",
        variant: "destructive"
      });
    }
  };

  const handleCreateArticle = () => {
    setCurrentArticle({
      id: `news-article-${Date.now()}`,
      companyId: companyId,
      title: '',
      summary: '',
      publishDate: new Date(),
      isPublished: false,
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser?.id
    });
    setArticleDialogOpen(true);
  };
  
  const handleSaveArticle = () => {
    if (currentArticle) {
      if (currentArticle.id) {
        // Update existing article
        const updatedArticles = articles.map(a => 
          a.id === currentArticle.id ? currentArticle : a
        );
        setArticles(updatedArticles);
        localStorage.setItem(`company_news_articles_${companyId}`, JSON.stringify(updatedArticles));
      } else {
        // Create new article
        const newArticle = {
          ...currentArticle,
          id: `news-article-${Date.now()}`
        };
        const updatedArticles = [...articles, newArticle];
        setArticles(updatedArticles);
        localStorage.setItem(`company_news_articles_${companyId}`, JSON.stringify(updatedArticles));
      }
      
      setArticleDialogOpen(false);
      toast({
        title: "Success",
        description: "Article saved successfully"
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
                placeholder="Alt text for accessibility"
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
              <label className="text-sm font-medium">Quote</label>
              <Textarea 
                value={formData.quote || ''} 
                onChange={e => setFormData({ ...formData, quote: e.target.value })} 
                placeholder="Quote text"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Author (Optional)</label>
              <Input 
                value={formData.author || ''} 
                onChange={e => setFormData({ ...formData, author: e.target.value })} 
                placeholder="Quote author"
              />
            </div>
          </div>
        );
        
      case 'list':
        const items = formData.items || [''];
        
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="list-type"
                checked={formData.ordered || false}
                onCheckedChange={(checked) => setFormData({ ...formData, ordered: checked })}
              />
              <Label htmlFor="list-type">Ordered List</Label>
            </div>
            
            {items.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input 
                  value={item} 
                  onChange={e => {
                    const newItems = [...items];
                    newItems[index] = e.target.value;
                    setFormData({ ...formData, items: newItems });
                  }} 
                  placeholder={`List item ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    const newItems = items.filter((_: any, i: number) => i !== index);
                    setFormData({ ...formData, items: newItems.length ? newItems : [''] });
                  }}
                  disabled={items.length <= 1}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
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
            <Button onClick={handleCreateArticle}>
              <PlusCircle className="h-4 w-4 mr-2" /> New Article
            </Button>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Articles</CardTitle>
            </CardHeader>
            <CardContent>
              {articles.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No articles yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={handleCreateArticle}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Create Article
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <Card key={article.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{article.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.summary}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {loadingNewsBlocks ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {newsBlocks.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No blocks yet. Add your first block to get started.</p>
                    <Button onClick={handleAddBlock} className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" /> Add First Block
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {!isPreview && (
                    <div className="flex justify-end">
                      <Button onClick={handleAddBlock}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Block
                      </Button>
                    </div>
                  )}
                  <div>
                    {newsBlocks
                      .sort((a, b) => a.position - b.position)
                      .map(block => (
                        <div key={block.id} className="mb-4">
                          {renderBlockPreview(block)}
                        </div>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add/Edit Block Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Edit Block' : 'Add New Block'}</DialogTitle>
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
                  <SelectItem value="heading">Heading</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
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

      {/* Add/Edit Article Dialog */}
      <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{currentArticle?.id ? 'Edit Article' : 'Create Article'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title"
                value={currentArticle?.title || ''} 
                onChange={e => setCurrentArticle({...currentArticle, title: e.target.value})}
                placeholder="Article title" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea 
                id="summary"
                value={currentArticle?.summary || ''}
                onChange={e => setCurrentArticle({...currentArticle, summary: e.target.value})}
                placeholder="A brief summary of the article"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is-published"
                checked={currentArticle?.isPublished || false}
                onCheckedChange={(checked) => 
                  setCurrentArticle({...currentArticle, isPublished: checked})
                }
              />
              <Label htmlFor="is-published">Published</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setArticleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveArticle}>Save Article</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyNewsBuilderPage;
