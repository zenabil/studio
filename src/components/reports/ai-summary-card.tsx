'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wand, LoaderCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { generateSummary } from '@/ai/flows/generate-summary-flow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AiSummaryCardProps {
  data: {
    totalSales: number;
    totalExpenses: number;
    totalProfits: number;
    topSellingProducts: { name: string; quantity: number }[];
    customerCount: number;
    salesCount: number;
  };
}

export function AiSummaryCard({ data }: AiSummaryCardProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummary(null);
    setError(null);
    
    if (data.salesCount === 0 && data.totalExpenses === 0) {
        setError(t.reports.noDataForSummary);
        setIsLoading(false);
        return;
    }

    try {
      const result = await generateSummary({ data, language });
      setSummary(result);
    } catch (e: any) {
        console.error(e);
        const errorMessage = e.message.includes("GEMINI_API_KEY") 
            ? t.errors.apiKeyMissing
            : t.errors.aiError;
        setError(errorMessage);
        toast({
            variant: 'destructive',
            title: t.errors.title,
            description: errorMessage,
        });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{t.reports.aiSummaryTitle}</CardTitle>
            <CardDescription>{t.reports.aiSummaryDescription}</CardDescription>
        </div>
        <Button onClick={handleGenerateSummary} disabled={isLoading}>
          {isLoading ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {t.settings.saving}...
            </>
          ) : (
            <>
              <Wand className="mr-2 h-4 w-4" />
              {t.reports.generateSummary}
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
            <div className="flex items-center justify-center p-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        )}
        {error && (
            <Alert variant="destructive">
                <AlertTitle>{t.errors.title}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {summary && (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/30 p-4">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
        )}
        {!isLoading && !summary && !error && (
            <div className="text-center text-muted-foreground p-8">
                <p>{t.reports.getInsights}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
