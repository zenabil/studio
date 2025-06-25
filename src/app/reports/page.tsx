'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SalesChart } from '@/components/reports/sales-chart';
import { CustomerPaymentsChart } from '@/components/reports/customer-payments-chart';
import { ProfitsChart } from '@/components/reports/profits-chart';
import { useLanguage } from '@/contexts/language-context';

export default function ReportsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">{t.reports.title}</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.productSales}</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.customerPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPaymentsChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.productProfits}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitsChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
