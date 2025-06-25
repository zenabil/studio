'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useMemo } from 'react';
import type { SaleRecord } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';

export function ProfitsChart({ salesHistory }: { salesHistory: SaleRecord[] }) {
  const { t } = useLanguage();
  const { settings } = useSettings();

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
