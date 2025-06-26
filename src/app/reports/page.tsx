'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SalesChart } from '@/components/reports/sales-chart';
import { CustomerPaymentsChart } from '@/components/reports/customer-payments-chart';
import { ProfitsChart } from '@/components/reports/profits-chart';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { DollarSign, ShoppingCart, Users, LineChart } from 'lucide-react';
import type { Customer } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';

export default function ReportsPage() {
  const { t } = useLanguage();
  const { salesHistory, customers: allCustomers, isLoading } = useData();
  const { settings } = useSettings();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredSales = useMemo(() => {
    if (!dateRange?.from) {
      return salesHistory;
    }

    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    toDate.setHours(23, 59, 59, 999);

    return salesHistory.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [salesHistory, dateRange]);
  
  const { totalProfits, totalSales, customersInPeriod } = useMemo(() => {
      let profit = 0;
      let sales = 0;
      const customerSpending: { [key: string]: number } = {};

      filteredSales.forEach(sale => {
          sales += sale.totals.total;
          if (sale.customerId) {
              if (!customerSpending[sale.customerId]) {
                  customerSpending[sale.customerId] = 0;
              }
              customerSpending[sale.customerId] += sale.totals.total;
          }

          sale.items.forEach(item => {
              profit += (item.price - (item.purchasePrice || 0)) * item.quantity;
          });
      });

      const customers: Customer[] = allCustomers
          .map(c => ({
              ...c,
              spent: customerSpending[c.id] || 0,
          }))
          .filter(c => c.spent > 0);

      return { totalProfits: profit, totalSales: sales, customersInPeriod: customers };
  }, [filteredSales, allCustomers]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">{t.reports.title}</h1>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.reports.totalSales}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{settings.currency}{totalSales.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.reports.totalProfits}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{settings.currency}{totalProfits.toFixed(2)}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.customers.title}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{customersInPeriod.length}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.reports.sales}</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{filteredSales.length}</div>
            </CardContent>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.reports.productSales}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart salesHistory={filteredSales} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.customerPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPaymentsChart customers={customersInPeriod} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t.reports.productProfits}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ProfitsChart salesHistory={filteredSales} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
