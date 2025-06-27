'use client';
import { useState, useMemo } from 'react';
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
import { SalesChart } from '@/components/reports/sales-chart';
import { CustomerPaymentsChart } from '@/components/reports/customer-payments-chart';
import { ProfitsChart } from '@/components/reports/profits-chart';
import { SalesOverTimeChart } from '@/components/reports/sales-over-time-chart';
import { CategorySalesChart } from '@/components/reports/category-sales-chart';
import { SalesForecastCard } from '@/components/reports/sales-forecast-card';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { DollarSign, ShoppingCart, Users, LineChart, Package, Crown } from 'lucide-react';
import type { Customer } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';

export default function ReportsPage() {
  const { t } = useLanguage();
  const { salesHistory, customers: allCustomers, products, isLoading } = useData();
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
  
  const { totalProfits, totalSales, customersInPeriod, bestSellers, totalProductsSold } = useMemo(() => {
      let profit = 0;
      let sales = 0;
      let productsSoldCount = 0;
      const customerSpending: { [key: string]: number } = {};
      const productQuantities: { [key: string]: number } = {};

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
              productsSoldCount += item.quantity;
              if (!productQuantities[item.id]) {
                  productQuantities[item.id] = 0;
              }
              productQuantities[item.id] += item.quantity;
          });
      });

      const customers: Customer[] = allCustomers
          .map(c => ({
              ...c,
              spent: customerSpending[c.id] || 0,
          }))
          .filter(c => c.spent > 0);

      const topSellers = Object.keys(productQuantities)
          .map(productId => {
              const product = products.find(p => p.id === productId);
              return {
                  name: product?.name || 'Unknown Product',
                  quantity: productQuantities[productId],
              };
          })
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

      return { 
          totalProfits: profit, 
          totalSales: sales, 
          customersInPeriod: customers,
          bestSellers: topSellers,
          totalProductsSold: productsSoldCount
      };
  }, [filteredSales, allCustomers, products]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">{t.reports.title}</h1>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              <CardTitle className="text-sm font-medium">{t.reports.productsSold}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{totalProductsSold}</div>
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
      
      <SalesForecastCard />

      <Card>
          <CardHeader>
            <CardTitle>{t.reports.salesOverTime}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesOverTimeChart salesHistory={filteredSales} />
          </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t.reports.productSales}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart salesHistory={filteredSales} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.categorySales}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySalesChart salesHistory={filteredSales} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle>{t.reports.bestSellers}</CardTitle>
                <CardDescription>{t.reports.top5byUnits}</CardDescription>
            </CardHeader>
            <CardContent>
                {bestSellers.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.products.name}</TableHead>
                                <TableHead className="text-right">{t.reports.unitsSold}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bestSellers.map((item, index) => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                     <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{t.reports.noSalesData}</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t.reports.customerPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPaymentsChart customers={customersInPeriod} />
          </CardContent>
        </Card>
      </div>
      
      <Card>
          <CardHeader>
            <CardTitle>{t.reports.productProfits}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ProfitsChart salesHistory={filteredSales} />
          </CardContent>
      </Card>
    </div>
  );
}
