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
import { type Supplier } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, FilePlus, BookOpen } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AddSupplierDialog } from '@/components/add-supplier-dialog';
import { AddSupplierInvoiceDialog } from '@/components/add-supplier-invoice-dialog';
import { SupplierInvoicesDialog } from '@/components/supplier-invoices-dialog';
import Loading from '@/app/loading';

export default function SuppliersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addSupplierInvoice, supplierInvoices, products, isLoading } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [supplierForInvoice, setSupplierForInvoice] = useState<Supplier | null>(null);

  const [isViewInvoicesOpen, setIsViewInvoicesOpen] = useState(false);
  const [supplierToView, setSupplierToView] = useState<Supplier | null>(null);


  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.productCategory.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, searchTerm]);

  const handleOpenAddDialog = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsAddDialogOpen(true);
  };
  
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setEditingSupplier(null);
  }

  const handleSaveSupplier = (supplierData: Omit<Supplier, 'id'>, supplierId?: string) => {
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
    toast({ title: t.suppliers.supplierDeleted });
    handleCloseDeleteDialog();
  };

  const handleOpenInvoiceDialog = (supplier: Supplier) => {
    setSupplierForInvoice(supplier);
    setIsInvoiceDialogOpen(true);
  };

  const handleSaveInvoice = (invoiceData: any) => {
    addSupplierInvoice(invoiceData);
    toast({ title: t.suppliers.invoiceAdded });
    setIsInvoiceDialogOpen(false);
    setSupplierForInvoice(null);
  };

  const handleOpenViewInvoicesDialog = (supplier: Supplier) => {
    setSupplierToView(supplier);
    setIsViewInvoicesOpen(true);
  };

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
                <TableHead>{t.suppliers.name}</TableHead>
                <TableHead>{t.suppliers.phone}</TableHead>
                <TableHead>{t.suppliers.productCategory}</TableHead>
                <TableHead className="text-right">{t.suppliers.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>{supplier.productCategory}</TableCell>
                  <TableCell className="flex justify-end">
                    <Button variant="ghost" size="icon" title={t.suppliers.addInvoice} onClick={() => handleOpenInvoiceDialog(supplier)}>
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
              ))}
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
