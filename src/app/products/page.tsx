'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
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
import { PlusCircle, Pencil, Trash2, ChevronsUpDown, ArrowDown, ArrowUp, LineChart } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';
import { ProductSalesHistoryDialog } from '@/components/product-sales-history-dialog';

type SortableKeys = keyof Pick<Product, 'name' | 'category' | 'purchasePrice' | 'price' | 'stock' | 'minStock' | 'quantityPerBox' | 'boxPrice'>;

export default function ProductsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, salesHistory, addProduct, updateProduct, deleteProduct, isLoading } = useData();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [viewingProductHistory, setViewingProductHistory] = useState<Product | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({
    key: 'name',
    direction: 'ascending',
  });

  const filteredAndSortedProducts = useMemo(() => {
    let sortableProducts = products
      .filter(product => !!product)
      .filter(product => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (product.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (product.category || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (product.barcodes || []).some(b => b.toLowerCase().includes(lowerCaseSearchTerm))
      });
      
    sortableProducts.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sortableProducts;
  }, [products, searchTerm, sortConfig]);
  
  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortableKeys, children: React.ReactNode, className?: string }) => (
      <TableHead className={`cursor-pointer hover:bg-muted/50 ${className}`} onClick={() => requestSort(sortKey)}>
          <div className="flex items-center">
              {children}
              {getSortIcon(sortKey)}
          </div>
      </TableHead>
  );
  
  const handleOpenDialog = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>, productId?: string) => {
    try {
      if (productId) {
        await updateProduct(productId, productData);
        toast({
          title: t.products.productUpdated,
        });
      } else {
        await addProduct(productData);
        toast({
          title: t.products.productAdded,
        });
      }
    } catch (error) {
      // The context shows the error toast.
      // We just need to re-throw so the dialog can catch it and not close.
      throw error;
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
      // Toast is shown in context if deletion is blocked
      handleCloseDeleteDialog();
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.products.title}</h1>
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
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="name">{t.products.name}</SortableHeader>
                <SortableHeader sortKey="category">{t.products.category}</SortableHeader>
                <TableHead>{t.products.barcodes}</TableHead>
                <SortableHeader sortKey="purchasePrice" className="text-right">{t.products.purchasePrice}</SortableHeader>
                <SortableHeader sortKey="price" className="text-right">{t.products.price}</SortableHeader>
                <SortableHeader sortKey="stock" className="text-right">{t.products.stock}</SortableHeader>
                <SortableHeader sortKey="minStock" className="text-right">{t.products.minStock}</SortableHeader>
                <SortableHeader sortKey="quantityPerBox" className="text-right">{t.products.quantityPerBox}</SortableHeader>
                <SortableHeader sortKey="boxPrice" className="text-right">{t.products.boxPrice}</SortableHeader>
                <TableHead className="text-right">{t.products.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((product) => (
                  <TableRow key={product.id} className={product.stock <= (product.minStock || 0) ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{(product.barcodes || []).join(', ')}</TableCell>
                    <TableCell className="text-right">{settings.currency}{(product.purchasePrice || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{settings.currency}{product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{product.stock}</TableCell>
                    <TableCell className="text-right">{product.minStock || 0}</TableCell>
                    <TableCell className="text-right">{product.quantityPerBox || 0}</TableCell>
                    <TableCell className="text-right">{settings.currency}{(product.boxPrice || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" title={t.products.viewSalesHistory} onClick={() => setViewingProductHistory(product)}>
                          <LineChart className="h-4 w-4" />
                       </Button>
                      <Button variant="ghost" size="icon" title={t.products.editProduct} onClick={() => handleOpenDialog(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={t.products.delete} onClick={() => handleOpenDeleteDialog(product)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    {searchTerm ? t.products.noResultsFound : t.products.noProductsYet}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddProductDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
        products={products}
      />
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteProduct}
        title={t.products.deleteConfirmationTitle}
        description={t.products.deleteConfirmationMessage}
      />
      <ProductSalesHistoryDialog
        isOpen={!!viewingProductHistory}
        onClose={() => setViewingProductHistory(null)}
        product={viewingProductHistory}
        salesHistory={salesHistory}
      />
    </>
  );
}
