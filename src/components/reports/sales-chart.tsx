'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { useMemo } from 'react';

export function SalesChart() {
  const { t } = useLanguage();
  const { salesHistory } = useData();

  const salesData = useMemo(() => {
    const productSales: { [key: string]: { productName: string, revenue: number } } = {};
    
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.id]) {
                productSales[item.id] = { productName: item.name, revenue: 0 };
            }
            productSales[item.id].revenue += (item.price * item.quantity);
        });
    });

    return Object.values(productSales);
  }, [salesHistory]);


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
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" name={t.reports.sales} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
