'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLanguage } from '@/contexts/language-context';
import { Bread } from 'lucide-react';

export default function BakeryOrdersPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.bakeryOrders.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.bakeryOrders.title}</CardTitle>
          <CardDescription>{t.bakeryOrders.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Bread className="h-16 w-16 text-muted-foreground/50" />
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
