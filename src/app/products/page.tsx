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
import type { Product } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddProductDialog } from '@/components/add-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';

export default function ProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, addProduct, updateProduct, deleteProduct, isLoading } = useData();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);
  
  const handleOpenDialog = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  }

  const handleSaveProduct = (productData: Omit<Product, 'id'>, productId?: string) => {
    if (productId) {
      updateProduct(productId, productData);
      toast({
        title: t.products.productUpdated,
      });
    } else {
      addProduct(productData);
      toast({
        title: t.products.productAdded,
      });
    }
  };

  const handleOpenDeleteDialog = (product: Product) => {
    setProductToDelete(product);
  };

  const handleCloseDeleteDialog = () => {
      setProductToDelete(null);
  };

  const handleDeleteProduct = () => {
      if (!productToDelete) return;
      deleteProduct(productToDelete.id);
      toast({
          title: t.products.productDeleted,
      });
      handleCloseDeleteDialog();
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>{t.products.title}</CardTitle>
          <div className="flex w-full gap-2 md:w-auto">
            <Input
              placeholder={t.products.searchProducts}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <Button onClick={() => handleOpenDialog()}>
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
                <TableHead>{t.products.barcode}</TableHead>
                <TableHead className="text-right">{t.products.purchasePrice}</TableHead>
                <TableHead className="text-right">{t.products.price}</TableHead>
                <TableHead className="text-right">{t.products.stock}</TableHead>
                <TableHead className="text-right">{t.products.minStock}</TableHead>
                <TableHead className="text-right">{t.products.quantityPerBox}</TableHead>
                <TableHead className="text-right">{t.products.boxPrice}</TableHead>
                <TableHead className="text-right">{t.products.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className={product.stock <= (product.minStock || 0) ? 'bg-destructive/10' : ''}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.barcode}</TableCell>
                  <TableCell className="text-right">{settings.currency}{(product.purchasePrice || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{settings.currency}{product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
                  <TableCell className="text-right">{product.minStock || 0}</TableCell>
                  <TableCell className="text-right">{product.quantityPerBox || 0}</TableCell>
                  <TableCell className="text-right">{settings.currency}{(product.boxPrice || 0).toFixed(2)}</TableCell>
                   <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(product)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddProductDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
      />
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteProduct}
        title={t.products.deleteConfirmationTitle}
        description={t.products.deleteConfirmationMessage}
      />
    </>
  );
}
