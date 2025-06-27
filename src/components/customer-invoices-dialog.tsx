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
import type { Customer, SaleRecord } from '@/lib/data';
import { format } from 'date-fns';
import { useSettings } from '@/contexts/settings-context';

interface CustomerInvoicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  salesHistory: SaleRecord[];
}

export function CustomerInvoicesDialog({ isOpen, onClose, customer, salesHistory }: CustomerInvoicesDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  if (!customer) return null;

  const customerInvoices = salesHistory
    .filter(sale => sale.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate running balance history by working backwards from the current balance
  const transactions = [];
  let balanceBeforeTransaction = customer.balance;

  for (const invoice of customerInvoices) {
    const balanceAfterTransaction = balanceBeforeTransaction;
    let debit = 0;
    let credit = 0;
    let description = '';

    if (invoice.items.length > 0) { // It's a Sale
      description = `${t.customers.saleInvoice} #${invoice.id.split('-')[1]}`;
      debit = invoice.totals.total;
      credit = invoice.totals.amountPaid;
      // Calculate balance before this transaction by reversing the operation
      balanceBeforeTransaction -= invoice.totals.balance;
    } else { // It's a Payment
      description = t.customers.paymentReceived;
      credit = invoice.totals.amountPaid;
      // Calculate balance before this transaction by reversing the operation
      balanceBeforeTransaction += credit;
    }

    transactions.push({
      id: invoice.id,
      date: invoice.date,
      description,
      debit,
      credit,
      balance: balanceAfterTransaction,
    });
  }
  transactions.reverse(); // Reverse to show oldest first
  const startingBalance = balanceBeforeTransaction;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.customers.invoiceHistory} - {customer.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.pos.date}</TableHead>
                  <TableHead>{t.customers.transaction}</TableHead>
                  <TableHead className="text-right">{t.customers.debit}</TableHead>
                  <TableHead className="text-right">{t.customers.credit}</TableHead>
                  <TableHead className="text-right">{t.customers.balance}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">{t.customers.startingBalance}</TableCell>
                  <TableCell className="text-right font-medium">{settings.currency}{startingBalance.toFixed(2)}</TableCell>
                </TableRow>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), 'PP')}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className={`text-right ${tx.debit > 0 ? 'text-destructive' : ''}`}>
                      {tx.debit > 0 ? `${settings.currency}${tx.debit.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className={`text-right ${tx.credit > 0 ? 'text-green-500' : ''}`}>
                      {tx.credit > 0 ? `${settings.currency}${tx.credit.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{settings.currency}{tx.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="text-lg">
                    <TableCell colSpan={4} className="text-right font-bold">{t.customers.totalDue}</TableCell>
                    <TableCell className="text-right font-bold">{settings.currency}{customer.balance.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
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
