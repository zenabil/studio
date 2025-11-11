
'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useMemo } from 'react';
import type { SaleRecord } from '@/contexts/data-context';
import { useSettings } from '@/contexts/settings-context';
import { calculateItemTotal } from '@/lib/utils';

export function ProfitsChart({ salesHistory }: { salesHistory: SaleRecord[] }) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const profitsData = useMemo(() => {
    const productProfits: { [key: string]: { productName: string, profit: number } } = {};
    
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            const productName = item.name || 'Unknown Product';
            if (!productProfits[item.id]) {
                productProfits[item.id] = { productName, profit: 0 };
            }
            const revenue = calculateItemTotal(item);
            const cost = (item.purchasePrice || 0) * item.quantity;
            const profitPerItem = revenue - cost;
            productProfits[item.id].profit += profitPerItem;
        });
    });

    const allProfits = Object.values(productProfits)
        .filter(p => p.profit > 0)
        .sort((a, b) => b.profit - a.profit);
        
    const topN = 10;
    if (allProfits.length > topN) {
        const topProfits = allProfits.slice(0, topN);
        const otherProfits = allProfits.slice(topN);
        const otherTotalProfit = otherProfits.reduce((sum, item) => sum + item.profit, 0);

        return [
            ...topProfits,
            { productName: t.reports.other, profit: otherTotalProfit }
        ];
    }

    return allProfits;

  }, [salesHistory, t.reports.other]);


  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={profitsData}>
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
          formatter={(value: number) => [`${settings.currency}${value.toFixed(2)}`, t.reports.profits]}
        />
        <Bar dataKey="profit" fill="hsl(var(--accent))" name={t.reports.profits} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
