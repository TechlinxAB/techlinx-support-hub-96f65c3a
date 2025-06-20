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
import { Loader, PlusCircle, Trash, MoveUp, MoveDown, Edit, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';
import { hasCompanyAccess, isConsultant } from '@/utils/authHelpers';

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
  
  const { profile, session } = useAuth();
  
  const [sortedBlocks, setSortedBlocks] = useState<DashboardBlock[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<DashboardBlock | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>('text');
  const [formData, setFormData] = useState<any>({});
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchTriggered, setFetchTriggered] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const company = companies.find(c => c.id === companyId);
  
  useEffect(() => {
    const checkAccess = async () => {
      if (!companyId) {
        toast.error("Company ID is missing");
        navigate('/');
        return;
      }
      
      try {
        const isUserConsultant = await isConsultant();
        
        if (!isUserConsultant) {
          const hasAccess = await hasCompanyAccess(companyId);
          
          if (!hasAccess) {
            console.log("Access denied: User does not have permission to access this company");
            toast.error("You don't have permission to access this dashboard builder");
            navigate('/');
            return;
          }
        }
        
        setAuthChecked(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking access:", error);
        toast.error("Error verifying permissions");
        navigate('/');
      }
    };
    
    if (profile !== null && session !== null) {
      console.log("Checking access with profile:", profile?.role, "company ID:", companyId);
      checkAccess();
    }
  }, [profile, session, navigate, companyId]);
  
  useEffect(() => {
    if (companyId && !isLoading && authChecked && !fetchTriggered) {
      console.log("Fetching dashboard blocks for company:", companyId);
      refetchDashboardBlocks(companyId);
      setFetchTriggered(true);
    }
  }, [companyId, refetchDashboardBlocks, isLoading, fetchTriggered, authChecked]);
  
  useEffect(() => {
    if (dashboardBlocks.length > 0 && companyId) {
      const topLevelBlocks = dashboardBlocks
        .filter(block => !block.parentId && block.companyId === companyId)
        .sort((a, b) => a.position - b.position);
      
      setSortedBlocks(topLevelBlocks);
    }
  }, [dashboardBlocks, companyId]);
  
  const getChildBlocks = (parentId: string) => {
    return dashboardBlocks
      .filter(block => block.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  };
  
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
    setDialogOpen(false);
    setTimeout(() => {
      setEditingBlock(block);
      setSelectedBlockType(block.type);
      setFormData({
        ...block.content,
        blockTitle: block.title,
        showTitle: block.showTitle !== false
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
      
      if (!session) {
        console.error("No session found. User might be logged out.");
        toast.error("You must be logged in to save dashboard blocks", { id: toastId });
        return;
      }
      
      console.log("Current session:", session ? "Valid" : "Invalid");
      console.log("Access token available:", !!session?.access_token);
      
      const blockTitle = formData.blockTitle || `New ${selectedBlockType}`;
      const showTitle = formData.showTitle !== false;
      const { blockTitle: _, showTitle: __, ...contentData } = formData;
      
      // Add showTitle to content
      const contentWithShowTitle = {
        ...contentData,
        showTitle: showTitle
      };
      
      if (!companyId) {
        throw new Error("No company ID provided");
      }

      const currentUserId = session.user.id;
      
      if (!currentUserId) {
        throw new Error("Cannot determine user ID from session");
      }
      
      if (editingBlock) {
        console.log(`Updating block ID: ${editingBlock.id}`);
        
        await updateDashboardBlock(editingBlock.id, {
          title: blockTitle,
          content: contentWithShowTitle,
          type: selectedBlockType
        });
        
      } else {
        const maxPosition = sortedBlocks.length > 0
          ? Math.max(...sortedBlocks.map(b => b.position)) + 1
          : 0;
        
        console.log("Creating new block with:");
        console.log("- Company ID:", companyId);
        console.log("- User ID:", currentUserId);
        console.log("- Position:", maxPosition);
        
        await addDashboardBlock({
          companyId: companyId,
          title: blockTitle,
          content: contentWithShowTitle,
          type: selectedBlockType,
          position: maxPosition,
          createdBy: currentUserId
        });
      }
      
      toast.success("Block saved successfully", { id: toastId });
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving block:', error);
      toast.error(`Failed to save dashboard block: ${error.message || "Unknown error"}`);
    }
  };
  
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
  
  const renderBlockForm = () => {
    const commonFields = (
      <>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Block Title</label>
          <Input 
            value={formData.blockTitle || ''} 
            onChange={(e) => setFormData({ ...formData, blockTitle: e.target.value })}
            placeholder="Enter block title"
          />
        </div>
        
        <div className="mb-4 flex items-center space-x-2">
          <Switch 
            id="show-title"
            checked={formData.showTitle !== false} 
            onCheckedChange={(checked) => setFormData({ ...formData, showTitle: checked })}
          />
          <label htmlFor="show-title" className="text-sm font-medium">
            Show block title
          </label>
        </div>
      </>
    );
    
    switch (selectedBlockType) {
      case 'heading':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-1">Heading Text</label>
              <Input 
                value={formData.text || ''} 
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Enter heading text"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Heading Level</label>
              <Select
                value={formData.level?.toString() || '2'}
                onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select heading level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1 - Large</SelectItem>
                  <SelectItem value="2">H2 - Medium</SelectItem>
                  <SelectItem value="3">H3 - Small</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'text':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-1">Text Content</label>
              <Textarea 
                value={formData.text || ''} 
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Enter text content"
                rows={5}
              />
            </div>
          </div>
        );
        
      case 'card':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-1">Card Title</label>
              <Input 
                value={formData.title || ''} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter card title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Card Content</label>
              <Textarea 
                value={formData.content || ''} 
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter card content"
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Action Button (optional)</label>
              <Input 
                value={(formData.action?.label) || ''} 
                onChange={(e) => setFormData({ 
                  ...formData, 
                  action: { 
                    ...(formData.action || {}), 
                    label: e.target.value 
                  } 
                })}
                placeholder="Button label (leave empty to hide button)"
              />
            </div>
          </div>
        );
        
      case 'image':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <Input 
                value={formData.url || ''} 
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="Enter image URL"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Alt Text</label>
              <Input 
                value={formData.alt || ''} 
                onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                placeholder="Enter alt text for accessibility"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Caption (optional)</label>
              <Input 
                value={formData.caption || ''} 
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Enter image caption"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Width (optional)</label>
                <Input 
                  value={formData.width || ''} 
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="e.g., 100%, 400px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height (optional)</label>
                <Input 
                  value={formData.height || ''} 
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g., auto, 300px"
                />
              </div>
            </div>
          </div>
        );
        
      case 'faq':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-3">FAQ Items</label>
              
              {(formData.items || []).map((item: any, index: number) => (
                <div key={index} className="border rounded-md p-4 mb-3 bg-background">
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Question {index + 1}</label>
                    <Input 
                      value={item.question || ''} 
                      onChange={(e) => {
                        const newItems = [...(formData.items || [])];
                        newItems[index] = { ...newItems[index], question: e.target.value };
                        setFormData({ ...formData, items: newItems });
                      }}
                      placeholder="Enter question"
                    />
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Answer {index + 1}</label>
                    <Textarea 
                      value={item.answer || ''} 
                      onChange={(e) => {
                        const newItems = [...(formData.items || [])];
                        newItems[index] = { ...newItems[index], answer: e.target.value };
                        setFormData({ ...formData, items: newItems });
                      }}
                      placeholder="Enter answer"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      const newItems = [...(formData.items || [])];
                      newItems.splice(index, 1);
                      setFormData({ ...formData, items: newItems });
                    }}
                  >
                    Remove Item
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  const newItems = [...(formData.items || []), { question: '', answer: '' }];
                  setFormData({ ...formData, items: newItems });
                }}
              >
                Add FAQ Item
              </Button>
            </div>
          </div>
        );
        
      case 'links':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-3">Links</label>
              
              {(formData.links || []).map((link: any, index: number) => (
                <div key={index} className="border rounded-md p-4 mb-3 bg-background">
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Link Label {index + 1}</label>
                    <Input 
                      value={link.label || ''} 
                      onChange={(e) => {
                        const newLinks = [...(formData.links || [])];
                        newLinks[index] = { ...newLinks[index], label: e.target.value };
                        setFormData({ ...formData, links: newLinks });
                      }}
                      placeholder="Enter link text"
                    />
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">URL {index + 1}</label>
                    <Input 
                      value={link.url || ''} 
                      onChange={(e) => {
                        const newLinks = [...(formData.links || [])];
                        newLinks[index] = { ...newLinks[index], url: e.target.value };
                        setFormData({ ...formData, links: newLinks });
                      }}
                      placeholder="Enter URL"
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      const newLinks = [...(formData.links || [])];
                      newLinks.splice(index, 1);
                      setFormData({ ...formData, links: newLinks });
                    }}
                  >
                    Remove Link
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  const newLinks = [...(formData.links || []), { label: '', url: '' }];
                  setFormData({ ...formData, links: newLinks });
                }}
              >
                Add Link
              </Button>
            </div>
          </div>
        );
        
      case 'dropdown':
        return (
          <div className="space-y-4">
            {commonFields}
            
            <div>
              <label className="block text-sm font-medium mb-1">Dropdown Title</label>
              <Input 
                value={formData.title || ''} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter dropdown title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-3">Dropdown Items</label>
              
              {(formData.items || []).map((item: any, index: number) => (
                <div key={index} className="border rounded-md p-4 mb-3 bg-background">
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Item Label {index + 1}</label>
                    <Input 
                      value={item.label || ''} 
                      onChange={(e) => {
                        const newItems = [...(formData.items || [])];
                        newItems[index] = { ...newItems[index], label: e.target.value };
                        setFormData({ ...formData, items: newItems });
                      }}
                      placeholder="Enter item label"
                    />
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1">Item Content {index + 1}</label>
                    <Textarea 
                      value={item.content || ''} 
                      onChange={(e) => {
                        const newItems = [...(formData.items || [])];
                        newItems[index] = { ...newItems[index], content: e.target.value };
                        setFormData({ ...formData, items: newItems });
                      }}
                      placeholder="Enter item content"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      const newItems = [...(formData.items || [])];
                      newItems.splice(index, 1);
                      setFormData({ ...formData, items: newItems });
                    }}
                  >
                    Remove Item
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  const newItems = [...(formData.items || []), { label: '', content: '' }];
                  setFormData({ ...formData, items: newItems });
                }}
              >
                Add Dropdown Item
              </Button>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            <p>Please select a block type to continue</p>
          </div>
        );
    }
  };
  
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
      
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
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
