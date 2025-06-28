
'use client';
import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { summarizeSalesFlow, type SummarizeSalesInput } from '@/ai/flows/summarize-sales-flow';
import { BrainCircuit, BotMessageSquare, Sparkles, LoaderCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface AIReportSummaryCardProps {
    reportData: Omit<SummarizeSalesInput, 'dateRange' | 'currency'>;
    dateRange: DateRange | undefined;
    currency: string;
    isDataLoading: boolean;
}

export function AIReportSummaryCard({ reportData, dateRange, currency, isDataLoading }: AIReportSummaryCardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateSummary = useCallback(async () => {
    setIsLoading(true);
    setSummary(null);

    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    const flowInput: SummarizeSalesInput = {
        ...reportData,
        dateRange: { from: fromDate, to: toDate },
        currency,
    };

    try {
      const result = await summarizeSalesFlow(flowInput);
      setSummary(result.summary);
    } catch (error) {
      console.error("AI summary generation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      toast({
        variant: 'destructive',
        title: t.errors.title,
        description: errorMessage.includes('API key') ? t.errors.apiKeyMissing : t.errors.aiError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportData, dateRange, currency, toast, t]);
  
  const canGenerate = reportData.totalSales > 0 || reportData.totalExpenses > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotMessageSquare className="h-6 w-6" />
          {t.reports.aiSummaryTitle}
        </CardTitle>
        <CardDescription>{t.reports.aiSummaryDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGenerateSummary}
          disabled={isDataLoading || isLoading || !canGenerate}
          className="w-full"
        >
          {isLoading ? (
             <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> {t.settings.saving}...</>
          ) : (
             <><Sparkles className="mr-2 h-4 w-4" /> {t.reports.generateSummary}</>
          )}
        </Button>
        
        <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none rounded-lg border p-4 min-h-[150px] transition-all",
            !summary && !isLoading && "flex items-center justify-center text-center text-muted-foreground",
        )}>
           {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
            </div>
           ) : summary ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
           ) : (
            <div className="flex flex-col items-center">
                <BrainCircuit className="h-10 w-10 mb-2" />
                <p>{canGenerate ? t.reports.getInsights : t.reports.noDataForSummary}</p>
            </div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
