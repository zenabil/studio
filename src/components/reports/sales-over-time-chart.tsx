'use client';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useMemo } from 'react';
import type { SaleRecord } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';
import { format } from 'date-fns';
import { LineChart as LineChartIcon } from 'lucide-react';

export function SalesOverTimeChart({ salesHistory }: { salesHistory: SaleRecord[] }) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const salesData = useMemo(() => {
    const dailySales: { [key: string]: number } = {};
    
    salesHistory.forEach(sale => {
        const saleDate = new Date(sale.date);
        if(isNaN(saleDate.getTime())) return;

        const day = format(saleDate, 'yyyy-MM-dd');
        if (!dailySales[day]) {
            dailySales[day] = 0;
        }
        dailySales[day] += sale.totals.total;
    });

    return Object.keys(dailySales)
        .sort()
        .map(day => ({
            date: format(new Date(day), 'MMM d'),
            [t.reports.sales]: dailySales[day],
        }));
  }, [salesHistory, t.reports.sales]);


  if (salesData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center">
        <LineChartIcon className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground mt-4">{t.reports.noSalesData}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
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
        <Legend />
        <Line type="monotone" dataKey={t.reports.sales} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
