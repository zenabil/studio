'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useMemo } from 'react';
import type { SaleRecord } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';
import { calculateItemTotal } from '@/lib/utils';

export function SalesChart({ salesHistory }: { salesHistory: SaleRecord[] }) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const salesData = useMemo(() => {
    const productSales: { [key: string]: { productName: string, revenue: number } } = {};
    
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            const productName = item.name || 'Unknown Product';
            if (!productSales[item.id]) {
                productSales[item.id] = { productName, revenue: 0 };
            }
            productSales[item.id].revenue += calculateItemTotal(item);
        });
    });

    const allSales = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
    
    const topN = 10;
    if (allSales.length > topN) {
        const topSales = allSales.slice(0, topN);
        const otherSales = allSales.slice(topN);
        const otherRevenue = otherSales.reduce((sum, item) => sum + item.revenue, 0);

        return [
            ...topSales,
            { productName: t.reports.other, revenue: otherRevenue }
        ];
    }
    
    return allSales;

  }, [salesHistory, t.reports.other]);


  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={salesData}>
        <XAxis
          dataKey="productName"
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
          tickFormatter={(value) => `${settings.currency}${value}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number) => [`${settings.currency}${value.toFixed(2)}`, t.reports.sales]}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" name={t.reports.sales} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
