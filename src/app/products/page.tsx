'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
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
import { products as initialProducts, type Product } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddProductDialog } from '@/components/add-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';

export default function ProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleAddProduct = (newProductData: Omit<Product, 'id' | 'imageUrl'>) => {
    const newProduct: Product = {
      id: `prod-${new Date().getTime()}`,
      imageUrl: 'https://placehold.co/300x200',
      ...newProductData,
    };
    setProducts(prev => [newProduct, ...prev]);
    toast({
      title: t.products.productAdded,
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t.products.title}</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder={t.products.searchProducts}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.products.addProduct}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.products.name}</TableHead>
                <TableHead>{t.products.category}</TableHead>
                <TableHead className="text-right">{t.products.price}</TableHead>
                <TableHead className="text-right">{t.products.stock}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddProductDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddProduct={handleAddProduct}
      />
    </>
  );
}
