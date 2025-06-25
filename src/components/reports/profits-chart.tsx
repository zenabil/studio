'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { useMemo } from 'react';

export function ProfitsChart() {
  const { t } = useLanguage();
  const { salesHistory } = useData();

  const profitsData = useMemo(() => {
    const productProfits: { [key: string]: { productName: string, profit: number } } = {};
    
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            if (!productProfits[item.id]) {
                productProfits[item.id] = { productName: item.name, profit: 0 };
            }
            const profitPerItem = (item.price - (item.purchasePrice || 0)) * item.quantity;
            productProfits[item.id].profit += profitPerItem;
        });
    });

    return Object.values(productProfits).filter(p => p.profit > 0);
  }, [salesHistory]);


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
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, t.reports.profits]}
        />
        <Bar dataKey="profit" fill="hsl(var(--accent))" name={t.reports.profits} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
