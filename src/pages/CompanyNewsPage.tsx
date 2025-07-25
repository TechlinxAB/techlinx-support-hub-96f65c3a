import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CompanyNewsBlock } from '@/types/companyNews';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/components/ui/use-toast';
import { useNewsBlocksFetcher } from '@/hooks/useNewsBlocksFetcher';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const CompanyNewsPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, currentUser } = useAppContext();
  const { toast } = useToast();

  const { blocks, loading: loadingBlocks, error: fetchError, refetch } = useNewsBlocksFetcher(companyId);
  const [fetchInProgress, setFetchInProgress] = useState(false);
  
  const company = companies.find(c => c.id === companyId);
  const isConsultant = currentUser?.role === 'consultant';

  // Handle back navigation - go back to previous page or user dashboard
  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to user dashboard
      navigate('/');
    }
  };

  // Function to render a block based on its type
  const renderBlock = (block: CompanyNewsBlock) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.content.level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag className={`mt-${block.content.level} font-bold`}>{block.content.text}</HeadingTag>;
      
      case 'text':
        return (
          <div className="prose max-w-none my-4">
            <p className="whitespace-pre-wrap">{block.content.text}</p>
          </div>
        );
      
      case 'card':
        return (
          <Card className="my-4 p-4">
            <h3 className="text-lg font-semibold">{block.content.title}</h3>
            <p className="mt-2">{block.content.content}</p>
            {block.content.action && (
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href={block.content.action.link}>{block.content.action.label}</a>
                </Button>
              </div>
            )}
          </Card>
        );
      
      case 'image':
        return (
          <div className="my-4">
            <div style={{ 
              width: block.content.width || 'auto',
              maxWidth: '100%'
            }}>
              {block.content.height ? (
                <AspectRatio ratio={16/9}>
                  <img 
                    src={block.content.url} 
                    alt={block.content.alt || "Image"} 
                    className="w-full h-full rounded-md"
                    style={{
                      objectFit: block.content.objectFit || 'cover',
                      objectPosition: block.content.objectPosition || 'center'
                    }}
                  />
                </AspectRatio>
              ) : (
                <img 
                  src={block.content.url} 
                  alt={block.content.alt} 
                  className="max-w-full h-auto rounded-md"
                  style={{
                    objectFit: block.content.objectFit || 'cover',
                    objectPosition: block.content.objectPosition || 'center'
                  }}
                />
              )}
              {block.content.caption && (
                <p className="text-sm text-center mt-1 text-muted-foreground">{block.content.caption}</p>
              )}
            </div>
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
          <div className={`my-4 ${bgColor} ${borderColor} border-l-4 p-4 rounded`}>
            <h4 className={`font-medium ${textColor}`}>{block.content.title}</h4>
            <p className={`mt-2 ${textColor}`}>{block.content.message}</p>
          </div>
        );
      
      case 'faq':
        return (
          <Accordion type="single" collapsible className="my-4 w-full">
            {block.content.items.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="font-medium">{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        );
      
      case 'links':
        return (
          <div className="my-4">
            <ul className="space-y-2">
              {block.content.links.map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="text-blue-600 hover:underline flex items-center">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      
      case 'dropdown':
        return (
          <div className="my-4">
            <h3 className="font-semibold">{block.content.title}</h3>
            <Accordion type="single" collapsible className="mt-2">
              {block.content.items.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{item.label}</AccordionTrigger>
                  <AccordionContent>{item.content}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (fetchInProgress) return;
    setFetchInProgress(true);

    refetch(true)
      .finally(() => {
        setFetchInProgress(false);
      });
  }, [refetch, fetchInProgress]);

  // Show loading state
  if (loadingBlocks && !fetchError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-80" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Show error state
  if (fetchError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {company ? `${company.name} - News` : 'Company News'}
          </h1>
        </div>
        
        <Card className="p-6 border-red-200">
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-red-600">Error Loading Content</h2>
            <p className="text-muted-foreground mt-2">
              We're having trouble loading the news content. Please try again later.
            </p>
            <Button 
              className="mt-4"
              onClick={handleRefresh}
              disabled={fetchInProgress}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Filter blocks for display
  const displayBlocks = blocks
    .filter(block => isConsultant || block.isPublished);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {company ? `${company.name} - News` : 'Company News'}
          </h1>
        </div>
        
        {isConsultant && (
          <Button onClick={() => navigate(`/company-news-builder/${companyId}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit News
          </Button>
        )}
      </div>
      
      <Card className="p-6">
        {displayBlocks.length > 0 ? (
          <div className="space-y-4">
            {displayBlocks.map(block => (
              <div key={block.id} className={block.isPublished ? '' : 'opacity-50 border-l-4 border-yellow-300 pl-4'}>
                {!block.isPublished && isConsultant && (
                  <div className="text-sm text-yellow-600 mb-1">
                    Draft (only visible to consultants)
                  </div>
                )}
                {renderBlock(block)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold">No news published yet</h2>
            <p className="text-muted-foreground mt-2">
              There are currently no news items for this company
            </p>
            {isConsultant && (
              <Button 
                className="mt-4"
                onClick={() => navigate(`/company-news-builder/${companyId}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Create News
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CompanyNewsPage;
