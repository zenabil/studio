
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '@/contexts/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { Supplier, Product, SupplierInvoiceItem } from '@/contexts/data-context';
import { format } from 'date-fns';
import { Printer, Package, FilePlus } from 'lucide-react';
import Image from 'next/image';
import { useSettings } from '@/contexts/settings-context';

interface SupplierRestockListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  products: Product[];
  onCreatePO: (items: SupplierInvoiceItem[]) => void;
}

export function SupplierRestockListDialog({ isOpen, onClose, supplier, products, onCreatePO }: SupplierRestockListDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const productsToOrder = products.filter(p => (p.minStock || 0) - p.stock > 0);

  const handleCreatePO = () => {
     const items: SupplierInvoiceItem[] = productsToOrder.map(product => {
        const neededQuantity = (product.minStock || 0) - product.stock;
        let quantityToOrder = neededQuantity > 0 ? neededQuantity : 0;
  
        if (product.quantityPerBox && product.quantityPerBox > 0 && quantityToOrder > 0) {
          const numberOfBoxes = Math.ceil(quantityToOrder / product.quantityPerBox);
          quantityToOrder = numberOfBoxes * product.quantityPerBox;
        }
  
        return {
          productId: product.id,
          productName: product.name,
          quantity: quantityToOrder,
          purchasePrice: product.purchasePrice || 0,
          boxPrice: product.boxPrice,
          quantityPerBox: product.quantityPerBox,
          barcode: (product.barcodes || []).join(', '),
        };
      });
    onCreatePO(items);
    onClose();
  }

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="printable-area">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4 text-primary">
                {settings.companyInfo.logoUrl ? (
                  <Image
                    src={settings.companyInfo.logoUrl}
                    alt={`${settings.companyInfo.name} Logo`}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain rounded-md"
                    unoptimized
                  />
                ) : (
                  <Package className="w-10 h-10" />
                )}
                <DialogTitle className="text-3xl font-bold">{t.suppliers.restockList}</DialogTitle>
            </div>
            <DialogDescription>
              {t.suppliers.forSupplier}: {supplier.name} - {format(new Date(), 'PP')}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1">
            {products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.products.name}</TableHead>
                    <TableHead className="text-center">{t.products.stock}</TableHead>
                    <TableHead className="text-center">{t.products.minStock}</TableHead>
                    <TableHead className="text-right">{t.suppliers.quantityToOrder}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const neededQuantity = (product.minStock || 0) - product.stock;
                    let quantityToOrder = neededQuantity > 0 ? neededQuantity : 0;
                    let orderDescription = `${quantityToOrder}`;

                    if (product.quantityPerBox && product.quantityPerBox > 0 && quantityToOrder > 0) {
                        const numberOfBoxes = Math.ceil(quantityToOrder / product.quantityPerBox);
                        const finalOrderQuantity = numberOfBoxes * product.quantityPerBox;
                        orderDescription = `${finalOrderQuantity} (${numberOfBoxes} ${t.suppliers.boxes})`;
                    }
                    
                    return (
                        <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-center font-bold text-destructive">{product.stock}</TableCell>
                            <TableCell className="text-center">{product.minStock || 0}</TableCell>
                            <TableCell className="text-right font-bold">{orderDescription}</TableCell>
                        </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <Package className="h-16 w-16 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t.suppliers.noLowStockProducts}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="non-printable mt-6">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t.customers.close}
            </Button>
          </DialogClose>
          <Button variant="outline" onClick={() => window.print()} disabled={products.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              {t.suppliers.printList}
          </Button>
          <Button onClick={handleCreatePO} disabled={productsToOrder.length === 0}>
            <FilePlus className="mr-2 h-4 w-4" />
            {t.purchaseOrders.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
