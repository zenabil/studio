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
import { TriangleAlert } from 'lucide-react';

export default function AlertsPage() {
  const { t } = useLanguage();
  const { products } = useData();

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.stock <= (product.minStock || 0))
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  return (
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
  );
}
