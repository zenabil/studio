'use client';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { Users } from 'lucide-react';
import type { Customer } from '@/lib/data';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CustomerSalesChart({ customers }: { customers: { name: string; spent: number }[] }) {
    const { t } = useLanguage();
    const { settings } = useSettings();

    if (customers.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">{t.reports.noSalesData}</p>
          </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
        <PieChart>
            <Tooltip
                contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
                formatter={(value: number) => [`${settings.currency}${value.toFixed(2)}`, t.reports.sales]}
            />
            <Legend />
            <Pie
            data={customers}
            dataKey="spent"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            fill="#8884d8"
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent === 0) return null;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                    {`${(percent * 100).toFixed(0)}%`}
                </text>
                );
            }}
            >
            {customers.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            </Pie>
        </PieChart>
        </ResponsiveContainer>
    );
}
