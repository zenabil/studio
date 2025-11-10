'use client';
import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { TriangleAlert, CalendarClock } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { format } from 'date-fns';
import Loading from '@/app/loading';
import { cn } from '@/lib/utils';
import { calculateDebtAlerts } from '@/lib/utils';

export default function AlertsPage() {
  const { t } = useLanguage();
  const { products, customers, salesHistory, isLoading } = useData();
  const { settings } = useSettings();

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => !!product && product.stock <= (product.minStock || 0))
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  const debtAlerts = useMemo(() => {
    return calculateDebtAlerts(customers, salesHistory, settings.paymentTermsDays);
  }, [customers, salesHistory, settings.paymentTermsDays]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.alerts.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.alerts.lowStockAlertsTitle}</CardTitle>
          <CardDescription>{t.alerts.lowStockAlertsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.products.name}</TableHead>
                  <TableHead>{t.products.category}</TableHead>
                  <TableHead className="text-right">{t.alerts.currentStock}</TableHead>
                  <TableHead className="text-right">{t.products.minStock}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.id} className="bg-destructive/10 hover:bg-destructive/20">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      {product.stock}
                    </TableCell>
                    <TableCell className="text-right">{product.minStock || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <TriangleAlert className="h-16 w-16 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t.alerts.noAlerts}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>{t.alerts.debtAlertsTitle}</CardTitle>
            <CardDescription>{t.alerts.debtAlertsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
            {debtAlerts.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.alerts.customer}</TableHead>
                            <TableHead className="text-right">{t.alerts.balanceDue}</TableHead>
                            <TableHead className="text-right">{t.alerts.dueDate}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {debtAlerts.map((alert, index) => (
                            <TableRow key={index} className={cn(alert.isOverdue ? 'bg-destructive/20 hover:bg-destructive/30' : 'bg-destructive/10 hover:bg-destructive/20')}>
                                <TableCell className="font-medium">{alert.customerName}</TableCell>
                                <TableCell className="text-right font-bold text-destructive">
                                    {settings.currency}{alert.balance.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className='flex items-center justify-end gap-2'>
                                      <span>{format(alert.dueDate, 'PP')}</span>
                                      {alert.isOverdue && <span className="text-xs font-bold text-destructive">({t.alerts.overdue})</span>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <CalendarClock className="h-16 w-16 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{t.alerts.noDebtAlerts}</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
