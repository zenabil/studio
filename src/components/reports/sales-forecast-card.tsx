'use client';
import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { type Product } from '@/lib/data';
import { salesForecastFlow, type SalesForecastOutput } from '@/ai/flows/sales-forecast-flow';
import { format } from 'date-fns';
import { BrainCircuit, LineChart } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function SalesForecastCard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, salesHistory, isLoading: isDataLoading } = useData();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [forecast, setForecast] = useState<SalesForecastOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForecast = useCallback(async (productId: string) => {
    if (!productId) return;
    
    setIsLoading(true);
    setForecast(null);

    const product = products.find(p => p.id === productId);
    if (!product) {
      setIsLoading(false);
      return;
    }

    // Aggregate sales history by day for the selected product
    const dailySalesMap: { [date: string]: number } = {};
    salesHistory.forEach(sale => {
      sale.items.forEach(item => {
        if (item.id === productId) {
          const saleDate = format(new Date(sale.date), 'yyyy-MM-dd');
          dailySalesMap[saleDate] = (dailySalesMap[saleDate] || 0) + item.quantity;
        }
      });
    });

    const dailySales = Object.entries(dailySalesMap).map(([date, quantity]) => ({ date, quantity }));

    if (dailySales.length < 3) {
      toast({
        variant: 'destructive',
        title: t.errors.title,
        description: t.reports.notEnoughData
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await salesForecastFlow({
        productName: product.name,
        dailySales: dailySales
      });
      setForecast(result);
    } catch (error) {
      console.error("Sales forecast failed:", error);
      toast({
        variant: 'destructive',
        title: t.errors.title,
        description: t.errors.forecastError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [products, salesHistory, toast, t]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6" />
          {t.reports.salesForecast}
        </CardTitle>
        <CardDescription>{t.reports.salesForecastDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          onValueChange={(value) => {
            setSelectedProductId(value);
            handleForecast(value);
          }}
          disabled={isDataLoading || isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.reports.selectProduct} />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed p-4 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-4 w-48" />
            </div>
          ) : forecast ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">{t.reports.predictedSales} for {selectedProduct?.name}</p>
              <p className="text-6xl font-bold text-primary">{forecast.forecastedQuantity}</p>
              <p className="text-xs text-muted-foreground italic text-center max-w-sm">{forecast.reasoning}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
                <LineChart className="h-10 w-10 mb-2" />
                <p>{t.reports.selectProduct}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
