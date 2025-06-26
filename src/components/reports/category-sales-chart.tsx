'use client';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { useMemo } from 'react';
import type { SaleRecord } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CategorySalesChart({ salesHistory }: { salesHistory: SaleRecord[] }) {
    const { t } = useLanguage();
    const { settings } = useSettings();

    const salesByCategory = useMemo(() => {
        const categoryRevenue: { [key: string]: number } = {};
        salesHistory.forEach(sale => {
            sale.items.forEach(item => {
                if (!categoryRevenue[item.category]) {
                    categoryRevenue[item.category] = 0;
                }
                categoryRevenue[item.category] += item.price * item.quantity;
            });
        });

        return Object.keys(categoryRevenue).map(category => ({
            name: category,
            revenue: categoryRevenue[category],
        }));
    }, [salesHistory]);

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
                    data={salesByCategory}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
                    {salesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}
