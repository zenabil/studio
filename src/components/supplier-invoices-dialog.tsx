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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from './ui/button';
import { useLanguage } from '@/contexts/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from './ui/table';
import type { Supplier, SupplierInvoice } from '@/lib/data';
import { useData } from '@/contexts/data-context';
import { format } from 'date-fns';
import { useSettings } from '@/contexts/settings-context';
import { useMemo } from 'react';

interface SupplierInvoicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierInvoicesDialog({ isOpen, onClose, supplier }: SupplierInvoicesDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { supplierInvoices: allInvoices } = useData();

  const supplierInvoices = useMemo(() => {
    if (!supplier) return [];
    return allInvoices
      .filter(inv => inv.supplierId === supplier.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allInvoices, supplier]);

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t.suppliers.invoiceHistory}</DialogTitle>
          <DialogDescription>{supplier.name}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {supplierInvoices.length > 0 ? (
             <Accordion type="single" collapsible className="w-full">
                {supplierInvoices.map((invoice) => (
                    <AccordionItem value={invoice.id} key={invoice.id}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span>{format(new Date(invoice.date), 'PPpp')}</span>
                                <span className="font-bold">{settings.currency}{invoice.totalAmount.toFixed(2)}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.suppliers.product}</TableHead>
                                        <TableHead className="text-center">{t.suppliers.quantity}</TableHead>
                                        <TableHead className="text-right">{t.suppliers.purchasePrice}</TableHead>
                                        <TableHead className="text-right">{t.pos.lineTotal}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoice.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.productName}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{settings.currency}{item.purchasePrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{settings.currency}{(item.quantity * item.purchasePrice).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                ))}
             </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t.suppliers.noInvoices}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t.customers.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
