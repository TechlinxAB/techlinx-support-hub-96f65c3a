import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { DashboardBlock } from '@/types/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader } from 'lucide-react';
import { Heading1, Heading2, Heading3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const CompanyDashboardPage = () => {
  const { currentUser, companies, dashboardBlocks, loadingDashboardBlocks, refetchDashboardBlocks } = useAppContext();
  const [sortedBlocks, setSortedBlocks] = useState<DashboardBlock[]>([]);
  
  // Find the current user's company
  const userCompany = companies.find(c => c.id === currentUser?.companyId);
  
  useEffect(() => {
    if (currentUser?.companyId) {
      refetchDashboardBlocks(currentUser.companyId);
    }
  }, [currentUser?.companyId]);
  
  useEffect(() => {
    // Sort blocks by position and filter to only include top-level blocks (no parentId)
    const topLevelBlocks = dashboardBlocks
      .filter(block => !block.parentId && block.companyId === currentUser?.companyId)
      .sort((a, b) => a.position - b.position);
    
    setSortedBlocks(topLevelBlocks);
  }, [dashboardBlocks, currentUser?.companyId]);
  
  // Get child blocks for a given parent ID
  const getChildBlocks = (parentId: string) => {
    return dashboardBlocks
      .filter(block => block.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  };
  
  // Render a specific block type
  const renderBlock = (block: DashboardBlock) => {
    // Check showTitle from both the block property and content
    const shouldShowTitle = block.showTitle !== false && block.content?.showTitle !== false;
    
    switch (block.type) {
      case 'heading':
        const level = block.content.level || 1;
        switch (level) {
          case 1:
            return (
              <div className="mt-6 mb-4">
                <h1 className="text-3xl font-bold">{block.content.text}</h1>
              </div>
            );
          case 2:
            return (
              <div className="mt-5 mb-3">
                <h2 className="text-2xl font-semibold">{block.content.text}</h2>
              </div>
            );
          default:
            return (
              <div className="mt-4 mb-2">
                <h3 className="text-xl font-medium">{block.content.text}</h3>
              </div>
            );
        }
      
      case 'text':
        return (
          <div className="prose max-w-none mb-4">
            {shouldShowTitle && <h3 className="text-lg font-medium mb-2">{block.title}</h3>}
            <div className="whitespace-pre-wrap">{block.content.text}</div>
          </div>
        );
      
      case 'card':
        return (
          <Card className="mb-4">
            <CardContent className="p-6">
              {shouldShowTitle && <h3 className="text-lg font-semibold mb-2">{block.title}</h3>}
              <h3 className="text-lg font-semibold mb-2">{block.content.title}</h3>
              <p className="text-muted-foreground">{block.content.content}</p>
              {block.content.action && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.open(block.content.action.link, '_blank')}
                >
                  {block.content.action.label}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      
      case 'faq':
        return (
          <>
            {shouldShowTitle && <h3 className="text-lg font-medium mb-2">{block.title}</h3>}
            <Accordion type="single" collapsible className="mb-6">
              {block.content.items?.map((faq: any, index: number) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        );
      
      case 'links':
        return (
          <>
            {shouldShowTitle && <h3 className="text-lg font-medium mb-2">{block.title}</h3>}
            <div className="flex flex-wrap gap-3 mb-6">
              {block.content.links?.map((link: any, index: number) => (
                <Button 
                  key={index}
                  variant="outline" 
                  onClick={() => window.open(link.url, '_blank')}
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </>
        );
      
      case 'dropdown':
        return (
          <>
            {shouldShowTitle && <h3 className="text-lg font-medium mb-2">{block.title}</h3>}
            <Tabs defaultValue="item-0" className="mb-6">
              <TabsList className="mb-2">
                {block.content.items?.map((item: any, index: number) => (
                  <TabsTrigger key={index} value={`item-${index}`}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {block.content.items?.map((item: any, index: number) => (
                <TabsContent key={index} value={`item-${index}`} className="p-4 border rounded-md">
                  {item.content}
                </TabsContent>
              ))}
            </Tabs>
          </>
        );
      
      case 'image':
        return (
          <div className="mb-4">
            {shouldShowTitle && <h3 className="text-lg font-medium mb-2">{block.title}</h3>}
            
            {block.content.url ? (
              <div className={`relative ${block.content.width ? '' : 'max-w-full'}`} style={{ 
                width: block.content.width || 'auto',
                maxWidth: '100%'
              }}>
                {block.content.height ? (
                  <AspectRatio ratio={16 / 9}>
                    <img 
                      src={block.content.url} 
                      alt={block.content.alt || block.title} 
                      className="rounded-md h-full w-full"
                      style={{
                        objectFit: block.content.objectFit || 'cover',
                        objectPosition: block.content.objectPosition || 'center'
                      }}
                    />
                  </AspectRatio>
                ) : (
                  <img 
                    src={block.content.url} 
                    alt={block.content.alt || block.title} 
                    className="max-w-full h-auto rounded-md"
                    style={{
                      objectFit: block.content.objectFit || 'cover',
                      objectPosition: block.content.objectPosition || 'center'
                    }}
                  />
                )}
                
                {block.content.caption && (
                  <p className="text-sm text-center mt-2 text-muted-foreground">
                    {block.content.caption}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-muted h-40 flex items-center justify-center rounded-md">
                <p className="text-muted-foreground">No image URL provided</p>
              </div>
            )}
          </div>
        );
      
      default:
        return <div>Unknown block type: {block.type}</div>;
    }
  };
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!userCompany) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          No company information found for your account. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {loadingDashboardBlocks ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          {sortedBlocks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No dashboard content available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedBlocks.map(block => (
                <div key={block.id} className="mb-4">
                  {renderBlock(block)}
                  
                  {/* Render child blocks if any */}
                  {getChildBlocks(block.id).map(childBlock => (
                    <div key={childBlock.id} className="ml-4 mt-2">
                      {renderBlock(childBlock)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyDashboardPage;
