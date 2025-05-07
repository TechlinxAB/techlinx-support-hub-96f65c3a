
import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const CompanyNewsPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { companies } = useAppContext();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Find the company
  const company = companies.find(c => c.id === companyId);
  
  useEffect(() => {
    const fetchArticles = async () => {
      if (companyId) {
        setLoading(true);
        try {
          // In a real implementation, fetch from the database
          // For now, use localStorage
          const storedArticles = localStorage.getItem(`company_news_articles_${companyId}`);
          const articlesData = storedArticles ? JSON.parse(storedArticles) : [];
          
          // Only show published articles to users
          const publishedArticles = articlesData.filter((article: any) => article.isPublished);
          setArticles(publishedArticles);
        } catch (error) {
          console.error('Error fetching articles:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchArticles();
  }, [companyId]);
  
  // Render blocks for a specific article
  const renderArticleBlocks = (article: any) => {
    if (!article.blocks || article.blocks.length === 0) {
      return <p className="text-muted-foreground">No content yet.</p>;
    }
    
    return article.blocks
      .sort((a: any, b: any) => a.position - b.position)
      .map((block: any) => {
        switch (block.type) {
          case 'heading':
            const HeadingTag = `h${block.content.level}` as keyof JSX.IntrinsicElements;
            return (
              <HeadingTag key={block.id} className={`font-bold mt-6 mb-2 ${block.content.level === 1 ? 'text-2xl' : block.content.level === 2 ? 'text-xl' : 'text-lg'}`}>
                {block.content.text}
              </HeadingTag>
            );
            
          case 'text':
            return (
              <p key={block.id} className="mb-4">
                {block.content.text}
              </p>
            );
            
          case 'image':
            return (
              <figure key={block.id} className="my-4">
                <img 
                  src={block.content.url} 
                  alt={block.content.alt} 
                  className="w-full rounded-lg" 
                />
                {block.content.caption && (
                  <figcaption className="text-center text-sm text-muted-foreground mt-2">
                    {block.content.caption}
                  </figcaption>
                )}
              </figure>
            );
            
          case 'quote':
            return (
              <blockquote key={block.id} className="border-l-4 border-primary pl-4 italic my-4">
                <p>{block.content.quote}</p>
                {block.content.author && (
                  <footer className="text-right text-sm text-muted-foreground">
                    — {block.content.author}
                  </footer>
                )}
              </blockquote>
            );
            
          case 'list':
            if (block.content.ordered) {
              return (
                <ol key={block.id} className="list-decimal pl-5 my-4 space-y-1">
                  {block.content.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              );
            } else {
              return (
                <ul key={block.id} className="list-disc pl-5 my-4 space-y-1">
                  {block.content.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
            }
            
          default:
            return null;
        }
      });
  };
  
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{company.name} - News</h1>
        <p className="text-muted-foreground">Latest updates and announcements</p>
      </div>
      
      <Separator />
      
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {articles.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No news articles available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            articles.map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{article.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(article.publishDate).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-4">{article.summary}</p>
                  {renderArticleBlocks(article)}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyNewsPage;
