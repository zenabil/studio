'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '@/contexts/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Customer, SaleRecord } from '@/lib/data';
import { format } from 'date-fns';

interface CustomerInvoicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  salesHistory: SaleRecord[];
}

export function CustomerInvoicesDialog({ isOpen, onClose, customer, salesHistory }: CustomerInvoicesDialogProps) {
  const { t } = useLanguage();

  if (!customer) return null;

  const customerInvoices = salesHistory
    .filter(sale => sale.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.customers.invoiceHistory} - {customer.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {customerInvoices.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {customerInvoices.map((invoice) => {
                if (invoice.items.length > 0) {
                  // This is a sales invoice
                  return (
                    <AccordionItem value={invoice.id} key={invoice.id}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4 text-sm">
                          <span>{`${t.pos.invoice} ${invoice.id}`}</span>
                          <span>{format(new Date(invoice.date), 'PPpp')}</span>
                          <span className="font-bold">${invoice.totals.total.toFixed(2)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t.pos.description}</TableHead>
                              <TableHead className="text-center">{t.pos.quantity}</TableHead>
                              <TableHead className="text-right">{t.pos.unitPrice}</TableHead>
                              <TableHead className="text-right">{t.pos.lineTotal}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.items.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="mt-4 text-right space-y-1 text-sm pr-4">
                            <p>{t.pos.subtotal}: <span className="font-medium">${invoice.totals.subtotal.toFixed(2)}</span></p>
                            <p>{t.pos.discount}: <span className="font-medium">-${invoice.totals.discount.toFixed(2)}</span></p>
                            <p className="font-bold text-base">{t.pos.grandTotal}: <span className="font-bold">${invoice.totals.total.toFixed(2)}</span></p>
                            <p>{t.pos.paymentReceived}: <span className="font-semibold">${invoice.totals.amountPaid.toFixed(2)}</span></p>
                            <p>{t.pos.balance}: <span className="font-semibold">${invoice.totals.balance.toFixed(2)}</span></p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                } else {
                  // This is a payment record
                  return (
                     <AccordionItem value={invoice.id} key={invoice.id}>
                        <AccordionTrigger>
                          <div className="flex justify-between w-full pr-4 text-sm text-green-500">
                              <span>{t.customers.paymentReceived}</span>
                              <span>{format(new Date(invoice.date), 'PPpp')}</span>
                              <span className="font-bold">${invoice.totals.amountPaid.toFixed(2)}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <p className="px-4 py-2">
                            {t.customers.paymentOf}
                            <span className="font-semibold"> ${invoice.totals.amountPaid.toFixed(2)} </span>
                            {t.customers.wasRecordedOn} {format(new Date(invoice.date), 'PPpp')}.
                           </p>
                        </AccordionContent>
                    </AccordionItem>
                  );
                }
              })}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t.customers.noInvoices}</p>
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
