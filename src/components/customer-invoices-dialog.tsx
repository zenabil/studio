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
import { useMemo } from 'react';

interface CustomerInvoicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  salesHistory: SaleRecord[];
}

export function CustomerInvoicesDialog({ isOpen, onClose, customer, salesHistory }: CustomerInvoicesDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const { transactions, startingBalance } = useMemo(() => {
    if (!customer) {
      return { transactions: [], startingBalance: 0 };
    }

    const customerTransactions = salesHistory
      .filter(sale => sale.customerId === customer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalBalanceChange = customerTransactions.reduce((acc, tx) => acc + tx.totals.balance, 0);
    let runningBalance = customer.balance - totalBalanceChange;
    const startBalance = runningBalance;

    const statement = customerTransactions.map(tx => {
      let debit = 0;
      let credit = 0;
      let description = '';

      if (tx.items.length > 0) { // Sale
        const invoiceNumber = tx.id.startsWith('SALE-') ? tx.id.split('-')[1] : tx.id;
        description = `${t.customers.saleInvoice} #${invoiceNumber}`;
        debit = tx.totals.total;
        credit = tx.totals.amountPaid;
      } else { // Payment
        description = t.customers.paymentReceived;
        credit = tx.totals.amountPaid;
      }

      runningBalance += tx.totals.balance;

      return {
        id: tx.id,
        date: tx.date,
        description,
        debit,
        credit,
        balance: runningBalance
      };
    });

    return { transactions: statement, startingBalance: startBalance };

  }, [customer, salesHistory, t.customers]);


  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.customers.invoiceHistory} - {customer.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {transactions.length > 0 || startingBalance !== 0 ? (
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
