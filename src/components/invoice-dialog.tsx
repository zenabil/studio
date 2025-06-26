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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from './ui/table';
import { Separator } from './ui/separator';
import {
    Package
  } from 'lucide-react';
import type { Product, Customer } from '@/lib/data';
import { useSettings } from '@/contexts/settings-context';
import { calculateItemTotal } from '@/lib/utils';

interface CartItem extends Product {
    quantity: number;
}

interface InvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  customer: Customer | undefined;
  totals: {
    subtotal: number;
    discount: number;
    total: number;
    amountPaid: number;
    balance: number;
  };
}

export function InvoiceDialog({ isOpen, onClose, cart, customer, totals }: InvoiceDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const invoiceId = `INV-${new Date().getTime().toString().slice(-6)}`;
  const today = new Date().toLocaleDateString();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl printable-area">
        <DialogHeader>
           <div className="flex items-center gap-4 text-primary">
              <Package className="w-10 h-10" />
              <DialogTitle className="text-3xl font-bold">{t.pos.invoice}</DialogTitle>
           </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-1">
          <div className="grid grid-cols-2 gap-4 my-6">
            <div>
              <h3 className="font-bold text-lg">{settings.companyInfo.name}</h3>
              <p className="text-sm text-muted-foreground">{settings.companyInfo.address}</p>
              <p className="text-sm text-muted-foreground">{settings.companyInfo.phone}</p>
              <p className="text-sm text-muted-foreground">{settings.companyInfo.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t.pos.invoiceNumber}</p>
              <p className="font-semibold">{invoiceId}</p>
              <p className="text-sm text-muted-foreground mt-2">{t.pos.date}</p>
              <p className="font-semibold">{today}</p>
            </div>
          </div>
          <Separator />
          <div className="my-6">
            <h4 className="font-semibold mb-1 text-muted-foreground">{t.pos.billedTo}:</h4>
            <p className="font-bold">{customer?.name || t.pos.noCustomer}</p>
            <p className="text-sm text-muted-foreground">{customer?.email}</p>
          </div>

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
              {cart.map(item => {
                const lineTotal = calculateItemTotal(item);
                const effectiveUnitPrice = item.quantity > 0 ? lineTotal / item.quantity : 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{settings.currency}{effectiveUnitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{settings.currency}{lineTotal.toFixed(2)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="text-right">{t.pos.subtotal}</TableCell>
                    <TableCell className="text-right font-medium">{settings.currency}{totals.subtotal.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={3} className="text-right">{t.pos.discount}</TableCell>
                    <TableCell className="text-right font-medium">-{settings.currency}{totals.discount.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="font-bold text-lg text-primary">
                    <TableCell colSpan={3} className="text-right">{t.pos.grandTotal}</TableCell>
                    <TableCell className="text-right">{settings.currency}{totals.total.toFixed(2)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t.pos.paymentReceived}</span>
              <span className="font-semibold">{settings.currency}{totals.amountPaid.toFixed(2)}</span>
            </div>
             <Separator className="my-2"/>
            <div className="flex justify-between items-center font-bold">
              <span>{t.pos.balance}</span>
              <span>{settings.currency}{totals.balance.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            {t.pos.thankYou}
          </div>
        </div>

        <DialogFooter className="non-printable">
          <Button variant="outline" onClick={() => window.print()}>{t.pos.printInvoice}</Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
