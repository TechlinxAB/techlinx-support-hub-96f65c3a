
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNewsBlocksFetcher } from '@/hooks/useNewsBlocksFetcher';
import { useNewsBlockEditor } from '@/hooks/useNewsBlockEditor';
import { hasCompanyAccess, isConsultant } from '@/utils/authHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader, Eye, Edit, Save, Plus, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NewsBlockEditor } from '@/components/news/NewsBlockEditor';
import { NewsBlockPreview } from '@/components/news/NewsBlockPreview';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CompanyNewsBuilderPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { profile, session } = useAuth();

  // Check access and fetch data
  const {
    blocks,
    loading: blocksLoading,
    error: blocksError,
    refetch: refetchBlocks,
    updateLocalBlock
  } = useNewsBlocksFetcher(companyId);

  // Editor functionality
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
    togglePublishStatus,
    getDefaultContent
  } = useNewsBlockEditor(blocks, {
    onSaveSuccess: () => {
      refetchBlocks();
    },
    onSaveError: (error) => {
      console.error('Save error:', error);
    },
    updateLocalBlock
  });

  // Access control check
  React.useEffect(() => {
    const checkAccess = async () => {
      if (!companyId || !profile || !session) return;
      
      try {
        const userIsConsultant = await isConsultant();
        
        if (!userIsConsultant) {
          const hasAccess = await hasCompanyAccess(companyId);
          if (!hasAccess) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to edit news for this company",
              variant: "destructive"
            });
            navigate('/');
            return;
          }
        }
      } catch (error) {
        console.error('Access check error:', error);
        toast({
          title: "Error",
          description: "Unable to verify access permissions",
          variant: "destructive"
        });
        navigate('/');
      }
    };

    checkAccess();
  }, [companyId, profile, session, navigate]);

  const handleCreateNewBlock = () => {
    console.log('Create new block functionality to be implemented');
  };

  const handleDeleteBlock = async () => {
    if (!selectedBlockId || !selectedBlock) return;
    
    if (!confirm(`Are you sure you want to delete "${selectedBlock.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('company_news_blocks')
        .delete()
        .eq('id', selectedBlockId);

      if (error) throw error;

      toast({
        title: "Block deleted",
        description: "The news block has been successfully deleted",
      });

      // Clear selection and refetch
      setSelectedBlockId(null);
      refetchBlocks();
    } catch (error) {
      console.error('Error deleting block:', error);
      toast({
        title: "Failed to delete block",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = () => {
    refetchBlocks(true);
  };

  if (blocksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading news blocks...</span>
      </div>
    );
  }

  if (blocksError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading news blocks: {blocksError.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company News Builder</h1>
          <p className="text-muted-foreground">Create and manage news content for your company</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateNewBlock}>
            <Plus className="h-4 w-4 mr-2" />
            New Block
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Block List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>News Blocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {blocks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No news blocks yet</p>
              ) : (
                blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedBlockId === block.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{block.title}</p>
                        <p className="text-xs text-muted-foreground">{block.type}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge variant={block.isPublished ? "default" : "secondary"} className="text-xs">
                          {block.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {!selectedBlock ? (
            <Card>
              <CardContent className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <p className="text-muted-foreground">Select a news block to edit</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedBlock.title}</CardTitle>
                    <p className="text-muted-foreground">Type: {selectedBlock.type}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Publish Toggle */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="publish-toggle"
                        checked={editedBlockData?.isPublished || false}
                        onCheckedChange={togglePublishStatus}
                        disabled={saving}
                      />
                      <Label htmlFor="publish-toggle" className="text-sm">
                        {editedBlockData?.isPublished ? 'Published' : 'Draft'}
                      </Label>
                    </div>

                    {/* Save Button */}
                    <Button 
                      onClick={saveCurrentBlock}
                      disabled={!hasUnsavedChanges || saving}
                      size="sm"
                    >
                      {saving ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edit">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="edit" className="mt-4">
                    <NewsBlockEditor
                      block={selectedBlock}
                      editedData={editedBlockData}
                      onFormChange={handleFormChange}
                      onNestedContentChange={handleNestedContentChange}
                      onDelete={handleDeleteBlock}
                    />
                  </TabsContent>
                  
                  <TabsContent value="preview" className="mt-4">
                    <NewsBlockPreview
                      block={{
                        ...selectedBlock,
                        title: editedBlockData?.title || selectedBlock.title,
                        content: editedBlockData?.content || selectedBlock.content
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyNewsBuilderPage;
