
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '@/contexts/language-context';
import type { Product, SaleRecord } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';
import { useMemo } from 'react';
import { calculateItemTotal } from '@/lib/utils';
import { LineChart as LineChartIcon, TrendingUp, Package } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ProductSalesHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  salesHistory: SaleRecord[];
}

export function ProductSalesHistoryDialog({ isOpen, onClose, product, salesHistory }: ProductSalesHistoryDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const { salesData, totalRevenue, totalUnitsSold } = useMemo(() => {
    if (!product) {
      return { salesData: [], totalRevenue: 0, totalUnitsSold: 0 };
    }

    const dailySales: { [date: string]: number } = {};
    let revenue = 0;
    let unitsSold = 0;

    salesHistory.forEach(sale => {
      sale.items.forEach(item => {
        if (item.id === product.id) {
          const saleDate = format(new Date(sale.date), 'yyyy-MM-dd');
          dailySales[saleDate] = (dailySales[saleDate] || 0) + item.quantity;
          revenue += calculateItemTotal(item);
          unitsSold += item.quantity;
        }
      });
    });
    
    const chartData = Object.keys(dailySales)
        .sort()
        .map(day => ({
            date: format(new Date(day), 'MMM d'),
            [t.pos.quantity]: dailySales[day],
        }));

    return { salesData: chartData, totalRevenue: revenue, totalUnitsSold: unitsSold };

  }, [product, salesHistory, t.pos.quantity]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.products.salesHistoryFor.replace('{productName}', product.name)}</DialogTitle>
          <DialogDescription>{product.category}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t.products.totalRevenue}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{settings.currency}{totalRevenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t.products.totalUnitsSold}</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUnitsSold}</div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t.reports.salesOverTime}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    {salesData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={salesData}>
                                <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                />
                                <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                allowDecimals={false}
                                />
                                <Tooltip
                                contentStyle={{
                                    background: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                                formatter={(value: number) => [value, t.pos.quantity]}
                                />
                                <Legend />
                                <Line type="monotone" dataKey={t.pos.quantity} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-center text-muted-foreground">
                            <LineChartIcon className="h-12 w-12 mb-4 opacity-50" />
                            <p>{t.products.noSalesData}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t.customers.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
