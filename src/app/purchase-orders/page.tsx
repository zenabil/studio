
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Pencil, Trash2, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { useSettings } from '@/contexts/settings-context';
import type { PurchaseOrder, Supplier, SupplierInvoiceItem } from '@/contexts/data-context';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Loading from '@/app/loading';
import { Badge } from '@/components/ui/badge';
import { AddPurchaseOrderDialog } from '@/components/add-purchase-order-dialog';
import { AddSupplierInvoiceDialog } from '@/components/add-supplier-invoice-dialog';

export default function PurchaseOrdersPage() {
  const { t } = useLanguage();
  const { purchaseOrders, suppliers, deletePurchaseOrder, isLoading, addSupplierInvoice } = useData();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
  
  const purchaseOrdersWithSupplier = useMemo(() => {
    return purchaseOrders.map(po => {
      const supplier = suppliers.find(s => s.id === po.supplierId);
      const total = po.items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
      return {
        ...po,
        supplierName: supplier?.name || 'Unknown Supplier',
        total,
      };
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchaseOrders, suppliers]);

  const filteredPOs = useMemo(() => {
    if (!searchTerm) return purchaseOrdersWithSupplier;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return purchaseOrdersWithSupplier.filter(po => 
      po.id.toLowerCase().includes(lowerCaseSearchTerm) ||
      po.supplierName.toLowerCase().includes(lowerCaseSearchTerm) ||
      t.purchaseOrders.statuses[po.status].toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, purchaseOrdersWithSupplier, t.purchaseOrders.statuses]);

  const getStatusVariant = (status: PurchaseOrder['status']) => {
    switch (status) {
        case 'draft': return 'secondary';
        case 'sent': return 'default';
        case 'partially_received': return 'outline';
        case 'completed': return 'success';
        case 'cancelled': return 'destructive';
        default: return 'secondary';
    }
  }

  const handleOpenPODialog = (po: PurchaseOrder | null = null) => {
    setEditingPO(po);
    setIsPODialogOpen(true);
  };

  const handleOpenReceiveDialog = (po: PurchaseOrder) => {
    setPoToReceive(po);
    setIsInvoiceDialogOpen(true);
  }

  const handleOpenDeleteDialog = (po: PurchaseOrder) => {
    setPoToDelete(po);
  };

  const handleCloseDeleteDialog = () => {
    setPoToDelete(null);
  };
  
  const handleDeletePO = () => {
    if (!poToDelete) return;
    deletePurchaseOrder(poToDelete.id);
    toast({ title: t.purchaseOrders.poDeleted || "Purchase order deleted." });
    handleCloseDeleteDialog();
  };

  const handleSaveInvoice = async (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: 'master' | 'average' | 'none'; purchaseOrderId?: string; }) => {
    await addSupplierInvoice(invoiceData);
    toast({ title: t.suppliers.invoiceAdded });
    setIsInvoiceDialogOpen(false);
    setPoToReceive(null);
  };

  const supplierForInvoice = useMemo(() => {
    if (!poToReceive) return null;
    return suppliers.find(s => s.id === poToReceive.supplierId) || null;
  }, [poToReceive, suppliers]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold font-headline">{t.purchaseOrders.title}</h1>
          <div className="flex w-full gap-2 md:w-auto">
            <Input
              placeholder={t.purchaseOrders.searchPOs}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <Button onClick={() => handleOpenPODialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.purchaseOrders.addPO}
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
             <CardTitle>{t.purchaseOrders.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>{t.purchaseOrders.supplier}</TableHead>
                  <TableHead>{t.purchaseOrders.status}</TableHead>
                  <TableHead>{t.purchaseOrders.createdAt}</TableHead>
                  <TableHead className="text-right">{t.purchaseOrders.total}</TableHead>
                  <TableHead className="text-right">{t.purchaseOrders.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length > 0 ? (
                  filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono">{po.id.substring(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{po.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(po.status)}>{t.purchaseOrders.statuses[po.status]}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(po.createdAt), 'PP')}</TableCell>
                      <TableCell className="text-right">{settings.currency}{po.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {['sent', 'partially_received', 'draft'].includes(po.status) && (
                          <Button variant="outline" size="sm" onClick={() => handleOpenReceiveDialog(po)}>
                             <Truck className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                             {t.suppliers.receiveItems || 'Receive'}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title={t.purchaseOrders.editPO} onClick={() => handleOpenPODialog(po)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={t.delete} onClick={() => handleOpenDeleteDialog(po)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t.purchaseOrders.noPOs}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <AddPurchaseOrderDialog
        isOpen={isPODialogOpen}
        onClose={() => {setIsPODialogOpen(false); setEditingPO(null);}}
        purchaseOrderToEdit={editingPO}
      />

      {poToReceive && supplierForInvoice && (
          <AddSupplierInvoiceDialog
            isOpen={isInvoiceDialogOpen}
            onClose={() => setIsInvoiceDialogOpen(false)}
            onSave={handleSaveInvoice}
            supplier={supplierForInvoice}
            initialItems={poToReceive.items}
            purchaseOrderId={poToReceive.id}
          />
      )}
      
      <ConfirmDialog
        isOpen={!!poToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeletePO}
        title={t.purchaseOrders.deletePOTitle || "Delete Purchase Order"}
        description={t.purchaseOrders.deletePODescription || "Are you sure you want to delete this purchase order?"}
      />
    </>
  );
}
