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
import { TriangleAlert, CalendarClock, MessageSquare } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { addDays, differenceInCalendarDays, format, set, getDate, getMonth, getYear } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Loading from '@/app/loading';

export default function AlertsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, customers, salesHistory, isLoading } = useData();
  const { settings } = useSettings();

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.stock <= (product.minStock || 0))
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  const debtAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts: { customerName: string; balance: number; dueDate: Date; phone: string; totalDue: number; }[] = [];
    
    const indebtedCustomers = customers.filter(c => c.balance > 0);

    for (const customer of indebtedCustomers) {
        const customerTransactionsDesc = salesHistory
          .filter(s => s.customerId === customer.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let oldestDebtDate: Date | null = null;
        let tempBalance = customer.balance;
        for (const tx of customerTransactionsDesc) {
            if (tempBalance > 0) {
                oldestDebtDate = new Date(tx.date);
                tempBalance -= tx.totals.balance;
            } else {
                break; 
            }
        }
        
        let alertDueDate: Date | null = null;
        if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
            const todayDate = getDate(today);
            const currentMonth = getMonth(today);
            const currentYear = getYear(today);

            if (todayDate >= customer.settlementDay) {
                alertDueDate = new Date(currentYear, currentMonth + 1, customer.settlementDay);
            } else {
                alertDueDate = set(today, { date: customer.settlementDay });
            }
        } else if (oldestDebtDate) {
            alertDueDate = addDays(oldestDebtDate, settings.paymentTermsDays);
        }
        
        if (alertDueDate && differenceInCalendarDays(alertDueDate, today) === 1) {
            let lateFees = 0;
            if (oldestDebtDate) {
              let feeDueDate: Date | null = null;
              if (customer.settlementDay && customer.settlementDay >= 1 && customer.settlementDay <= 31) {
                  const todayDate = getDate(today);
                  const currentMonth = getMonth(today);
                  const currentYear = getYear(today);

                  let lastSettlementDate: Date;
                  if (todayDate > customer.settlementDay) {
                      lastSettlementDate = new Date(currentYear, currentMonth, customer.settlementDay);
                  } else {
                      lastSettlementDate = new Date(currentYear, currentMonth - 1, customer.settlementDay);
                  }
                  
                  if (oldestDebtDate < lastSettlementDate) {
                      feeDueDate = lastSettlementDate;
                  }
              } else {
                  feeDueDate = addDays(oldestDebtDate, settings.paymentTermsDays);
              }
              
              if (feeDueDate && today > feeDueDate) {
                const daysOverdue = differenceInCalendarDays(today, feeDueDate);
                if (daysOverdue > 0 && customer.balance > 0) {
                  lateFees = daysOverdue * (customer.balance * (settings.lateFeePercentage / 100));
                }
              }
            }

            alerts.push({
                customerName: customer.name,
                balance: customer.balance,
                dueDate: alertDueDate,
                phone: customer.phone,
                totalDue: customer.balance + lateFees
            });
        }
    }
    return alerts;
  }, [customers, salesHistory, settings.paymentTermsDays, settings.lateFeePercentage]);

  const handleSendSms = (alert: (typeof debtAlerts)[0]) => {
    if (!alert.phone) {
      toast({
        variant: 'destructive',
        title: t.errors.title,
        description: t.alerts.noPhoneNumber,
      });
      return;
    }

    const message = t.alerts.smsBody
      .replace('{customerName}', alert.customerName)
      .replace('{currency}', settings.currency)
      .replace('{balance}', alert.totalDue.toFixed(2))
      .replace('{dueDate}', format(alert.dueDate, 'PP'));

    const phoneNumber = alert.phone.replace(/[^0-9+]/g, ''); // Clean the phone number
    const smsUri = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;

    // This will attempt to open the default SMS application.
    window.open(smsUri, '_self');

    toast({
      title: t.alerts.smsSent,
      description: t.alerts.smsRedirect,
    });
  };

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
                            <TableHead className="text-right">{t.products.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {debtAlerts.map((alert, index) => (
                            <TableRow key={index} className="bg-destructive/10 hover:bg-destructive/20">
                                <TableCell className="font-medium">{alert.customerName}</TableCell>
                                <TableCell className="text-right font-bold text-destructive">
                                    {settings.currency}{alert.totalDue.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    {format(alert.dueDate, 'PP')}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" title={t.alerts.sendSms} onClick={() => handleSendSms(alert)}>
                                      <MessageSquare className="h-4 w-4" />
                                  </Button>
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
