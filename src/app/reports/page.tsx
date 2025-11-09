
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
import { CustomerSalesChart } from '@/components/reports/customer-sales-chart';
import { ProfitsChart } from '@/components/reports/profits-chart';
import { SalesOverTimeChart } from '@/components/reports/sales-over-time-chart';
import { CategorySalesChart } from '@/components/reports/category-sales-chart';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { DollarSign, ShoppingCart, Users, LineChart, Package, Crown, Receipt } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';
import { calculateItemTotal } from '@/lib/utils';
import { format } from 'date-fns';

export default function ReportsPage() {
  const { t } = useLanguage();
  const { salesHistory, customers: allCustomers, products, expenses, isLoading } = useData();
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
        if (!sale) return false;
        const saleDate = new Date(sale.date);
        return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [salesHistory, dateRange]);
  
  const { totalProfits, totalSales, uniqueCustomerCount, customersForChart, bestSellers, totalProductsSold, totalExpenses } = useMemo(() => {
      let profitFromSales = 0;
      let sales = 0;
      let productsSoldCount = 0;
      const customerSpending: { [key: string]: number } = {};
      const productQuantities: { [key: string]: number } = {};

      filteredSales.forEach(sale => {
          if (!sale) return;
          sales += sale.totals.total;
          if (sale.customerId) {
              if (!customerSpending[sale.customerId]) {
                  customerSpending[sale.customerId] = 0;
              }
              customerSpending[sale.customerId] += sale.totals.total;
          }

          sale.items.forEach(item => {
              if (!item) return;
              const revenue = calculateItemTotal(item);
              const cost = (item.purchasePrice || 0) * item.quantity;
              profitFromSales += revenue - cost;
              productsSoldCount += item.quantity;

              if (!productQuantities[item.id]) {
                  productQuantities[item.id] = 0;
              }
              productQuantities[item.id] += item.quantity;
          });
      });
      
      const filteredExpenses = expenses.filter(expense => {
        if (!expense) return false;
        if (!dateRange?.from) return true;
        const expenseDate = new Date(expense.date);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23, 59, 59, 999);
        return expenseDate >= fromDate && expenseDate <= toDate;
      });

      const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      const uniqueCustomersInPeriod = Object.keys(customerSpending);

      const customersWithSpending = allCustomers
          .filter(c => !!c && uniqueCustomersInPeriod.includes(c.id))
          .map(c => ({
              name: c.name,
              spent: customerSpending[c.id] || 0,
          }))
          .sort((a,b) => b.spent - a.spent);

      const topN = 5;
      let chartData: { name: string; spent: number }[] = customersWithSpending;

      if (customersWithSpending.length > topN) {
          const topPortion = customersWithSpending.slice(0, topN);
          const otherPortion = customersWithSpending.slice(topN);
          const otherTotalSpent = otherPortion.reduce((sum, item) => sum + item.spent, 0);
          
          if (otherTotalSpent > 0) {
            chartData = [
              ...topPortion,
              { name: t.reports.other, spent: otherTotalSpent }
            ];
          } else {
             chartData = topPortion;
          }
      }

      const topSellers = Object.keys(productQuantities)
          .map(productId => {
              const product = products.find(p => p && p.id === productId);
              return {
                  id: productId,
                  name: product?.name || 'Unknown Product',
                  quantity: productQuantities[productId],
              };
          })
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

      return { 
          totalProfits: profitFromSales - expenseTotal, 
          totalSales: sales, 
          uniqueCustomerCount: uniqueCustomersInPeriod.length,
          customersForChart: chartData,
          bestSellers: topSellers,
          totalProductsSold: productsSoldCount,
          totalExpenses: expenseTotal
      };
  }, [filteredSales, allCustomers, products, expenses, dateRange, t.reports.other]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">{t.reports.title}</h1>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
                <CardTitle className="text-sm font-medium">{t.reports.totalExpenses}</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{settings.currency}{totalExpenses.toFixed(2)}</div>
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
              <div className="text-2xl font-bold">+{uniqueCustomerCount}</div>
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
                                <TableRow key={item.id}>
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
            <CardTitle>{t.reports.customerSales}</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSalesChart customers={customersForChart} />
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
