'use client';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts';
import type { Customer } from '@/lib/data';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

export function CustomerPaymentsChart({ customers }: { customers: Customer[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Tooltip
            contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
            }}
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
