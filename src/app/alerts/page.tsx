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
import { addDays, differenceInCalendarDays, format, set, getDate, getMonth, getYear } from 'date-fns';

export default function AlertsPage() {
  const { t } = useLanguage();
  const { products, customers, salesHistory } = useData();
  const { settings } = useSettings();

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.stock <= (product.minStock || 0))
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  const debtAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts: { customerName: string; balance: number; dueDate: Date }[] = [];
    
    const indebtedCustomers = customers.filter(c => c.balance > 0);

    for (const customer of indebtedCustomers) {
        let dueDate: Date | null = null;

        if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
            // Logic for fixed settlement day of the month
            if (getDate(today) >= customer.settlementDay) {
                // If settlement day for this month has passed or is today, check next month's
                dueDate = new Date(getYear(today), getMonth(today) + 1, customer.settlementDay);
            } else {
                dueDate = set(today, { date: customer.settlementDay });
            }
        } else {
            // Fallback to original logic based on payment terms
            const debtCreatingSales = salesHistory
                .filter(s => s.customerId === customer.id && s.totals.balance > 0)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (debtCreatingSales.length > 0) {
                const oldestDebtSale = debtCreatingSales[0];
                dueDate = addDays(new Date(oldestDebtSale.date), settings.paymentTermsDays);
            }
        }
        
        if (dueDate && differenceInCalendarDays(dueDate, today) === 1) {
            alerts.push({
                customerName: customer.name,
                balance: customer.balance,
                dueDate: dueDate,
            });
        }
    }
    return alerts;
}, [customers, salesHistory, settings.paymentTermsDays]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.alerts.title}</CardTitle>
          <CardDescription>{t.alerts.description}</CardDescription>
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
                            <TableRow key={index} className="bg-destructive/10 hover:bg-destructive/20">
                                <TableCell className="font-medium">{alert.customerName}</TableCell>
                                <TableCell className="text-right font-bold text-destructive">
                                    {settings.currency}{alert.balance.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {format(alert.dueDate, 'PP')}
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
