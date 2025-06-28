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
import { type Supplier, type Product, type SupplierInvoice } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, FilePlus, BookOpen, Printer, Wallet, ChevronsUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AddSupplierDialog } from '@/components/add-supplier-dialog';
import { AddSupplierInvoiceDialog } from '@/components/add-supplier-invoice-dialog';
import { SupplierInvoicesDialog } from '@/components/supplier-invoices-dialog';
import { SupplierRestockListDialog } from '@/components/supplier-restock-list-dialog';
import Loading from '@/app/loading';
import { useSettings } from '@/contexts/settings-context';
import { MakeSupplierPaymentDialog } from '@/components/make-supplier-payment-dialog';

type SortableKeys = keyof Pick<Supplier, 'name' | 'phone' | 'productCategory' | 'balance'>;

export default function SuppliersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addSupplierInvoice, supplierInvoices, products, isLoading, makePaymentToSupplier } = useData();
  const { settings } = useSettings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [supplierForInvoice, setSupplierForInvoice] = useState<Supplier | null>(null);

  const [isViewInvoicesOpen, setIsViewInvoicesOpen] = useState(false);
  const [supplierToView, setSupplierToView] = useState<Supplier | null>(null);

  const [supplierForRestock, setSupplierForRestock] = useState<Supplier | null>(null);
  const [lowStockProductsForSupplier, setLowStockProductsForSupplier] = useState<Product[]>([]);
  
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({
    key: 'name',
    direction: 'ascending',
  });

  const filteredAndSortedSuppliers = useMemo(() => {
    let sortableSuppliers = [...suppliers];
    
    sortableSuppliers = sortableSuppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.productCategory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    sortableSuppliers.sort((a, b) => {
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

    return sortableSuppliers;
  }, [suppliers, searchTerm, sortConfig]);

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

  const handleOpenAddDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsAddDialogOpen(true);
  };
  
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setEditingSupplier(null);
  }

  const handleSaveSupplier = (supplierData: Omit<Supplier, 'id' | 'balance'>, supplierId?: string) => {
    if (supplierId) {
      updateSupplier(supplierId, supplierData);
      toast({ title: t.suppliers.supplierUpdated });
    } else {
      addSupplier(supplierData);
      toast({ title: t.suppliers.supplierAdded });
    }
  };
  
  const handleOpenDeleteDialog = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
  };

  const handleCloseDeleteDialog = () => {
    setSupplierToDelete(null);
  };

  const handleDeleteSupplier = () => {
    if (!supplierToDelete) return;
    deleteSupplier(supplierToDelete.id);
    handleCloseDeleteDialog();
  };

  const handleOpenInvoiceDialog = (supplier: Supplier) => {
    setSupplierForInvoice(supplier);
    setIsInvoiceDialogOpen(true);
  };

  const handleSaveInvoice = (invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>) => {
    addSupplierInvoice(invoiceData);
    toast({ title: t.suppliers.invoiceAdded });
    setIsInvoiceDialogOpen(false);
    setSupplierForInvoice(null);
  };

  const handleOpenViewInvoicesDialog = (supplier: Supplier) => {
    setSupplierToView(supplier);
    setIsViewInvoicesOpen(true);
  };

  const handleGenerateRestockList = (supplier: Supplier) => {
    const lowStockProducts = products.filter(p =>
        p.category === supplier.productCategory && p.stock <= (p.minStock || 0)
    );
    setLowStockProductsForSupplier(lowStockProducts);
    setSupplierForRestock(supplier);
  };
  
  const handleMakePayment = (amount: number) => {
    if (!payingSupplier) return;
    makePaymentToSupplier(payingSupplier.id, amount);
    toast({ title: t.suppliers.paymentSuccess });
    setPayingSupplier(null);
  };

  const dayNames = [
    t.suppliers.days.sunday,
    t.suppliers.days.monday,
    t.suppliers.days.tuesday,
    t.suppliers.days.wednesday,
    t.suppliers.days.thursday,
    t.suppliers.days.friday,
    t.suppliers.days.saturday,
  ];

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.suppliers.title}</h1>
        <div className="flex w-full gap-2 md:w-auto">
          <Input
            placeholder={t.suppliers.searchSuppliers}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <Button onClick={() => handleOpenAddDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.suppliers.addSupplier}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader sortKey="name">{t.suppliers.name}</SortableHeader>
                <SortableHeader sortKey="phone">{t.suppliers.phone}</SortableHeader>
                <SortableHeader sortKey="productCategory">{t.suppliers.productCategory}</SortableHeader>
                <TableHead>{t.suppliers.visitDays}</TableHead>
                <SortableHeader sortKey="balance" className="text-right">{t.suppliers.balance}</SortableHeader>
                <TableHead className="text-right">{t.suppliers.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSuppliers.length > 0 ? (
                filteredAndSortedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell>{supplier.productCategory}</TableCell>
                    <TableCell>
                      {supplier.visitDays && supplier.visitDays.length > 0
                          ? supplier.visitDays
                              .sort((a,b) => a - b)
                              .map(dayIndex => dayNames[dayIndex])
                              .join(', ')
                          : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${(supplier.balance || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                      {settings.currency}{(supplier.balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="flex justify-end">
                      {(supplier.balance || 0) > 0 && (
                        <Button variant="ghost" size="icon" title={t.suppliers.makePayment} onClick={() => setPayingSupplier(supplier)}>
                          <Wallet className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title={t.suppliers.generateRestockList} onClick={() => handleGenerateRestockList(supplier)}>
                          <Printer className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" title={t.suppliers.addInvoice} onClick={() => handleOpenInvoiceDialog(supplier)}>
                          <FilePlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={t.suppliers.viewInvoices} onClick={() => handleOpenViewInvoicesDialog(supplier)}>
                          <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={t.suppliers.editSupplier} onClick={() => handleOpenAddDialog(supplier)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={t.suppliers.delete} onClick={() => handleOpenDeleteDialog(supplier)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchTerm ? t.suppliers.noResultsFound : t.suppliers.noSuppliersYet}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AddSupplierDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseAddDialog}
        onSave={handleSaveSupplier}
        supplierToEdit={editingSupplier}
      />

      {supplierForInvoice && (
        <AddSupplierInvoiceDialog
          isOpen={isInvoiceDialogOpen}
          onClose={() => setIsInvoiceDialogOpen(false)}
          onSave={handleSaveInvoice}
          supplier={supplierForInvoice}
        />
      )}
      
       {supplierToView && (
        <SupplierInvoicesDialog
          isOpen={isViewInvoicesOpen}
          onClose={() => setIsViewInvoicesOpen(false)}
          supplier={supplierToView}
        />
      )}

      <SupplierRestockListDialog
        isOpen={!!supplierForRestock}
        onClose={() => setSupplierForRestock(null)}
        supplier={supplierForRestock}
        products={lowStockProductsForSupplier}
      />
      
      <MakeSupplierPaymentDialog
        isOpen={!!payingSupplier}
        onClose={() => setPayingSupplier(null)}
        onSave={handleMakePayment}
        supplier={payingSupplier}
      />

      <ConfirmDialog
        isOpen={!!supplierToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteSupplier}
        title={t.suppliers.deleteConfirmationTitle}
        description={t.suppliers.deleteConfirmationMessage}
      />
    </>
  );
}
