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

  const transactions = useMemo(() => {
    if (!supplier) return { transactions: [], startingBalance: 0 };

    const supplierTransactions = allInvoices
      .filter(inv => inv.supplierId === supplier.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const statement: { id: string; date: string; description: string; debit: number; credit: number; balance: number; }[] = [];
    let balanceBeforeTransaction = supplier.balance;

    // Iterate backwards from the most recent transaction to calculate historical balances
    for (let i = supplierTransactions.length - 1; i >= 0; i--) {
      const tx = supplierTransactions[i];
      const balanceAfterTransaction = balanceBeforeTransaction;
      
      if (tx.isPayment) {
        // This was a payment, so to get the balance *before*, we add the amount back.
        balanceBeforeTransaction += tx.totalAmount;
        statement.unshift({
            id: tx.id,
            date: tx.date,
            description: t.suppliers.payment,
            debit: 0,
            credit: tx.totalAmount,
            balance: balanceAfterTransaction
        });
      } else {
        // This was an invoice, so to get the balance *before*, we subtract the amount.
        balanceBeforeTransaction -= tx.totalAmount;
        statement.unshift({
            id: tx.id,
            date: tx.date,
            description: `${t.suppliers.invoice} #${tx.id.split('-')[1]}`,
            debit: tx.totalAmount,
            credit: 0,
            balance: balanceAfterTransaction
        });
      }
    }
    
    return { transactions: statement, startingBalance: balanceBeforeTransaction };
  }, [supplier, allInvoices, t]);

  if (!supplier) return null;

  const { transactions: transactionHistory, startingBalance } = transactions;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.suppliers.invoiceHistory}</DialogTitle>
          <DialogDescription>{supplier.name}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {transactionHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.pos.date}</TableHead>
                  <TableHead>{t.suppliers.transaction}</TableHead>
                  <TableHead className="text-right">{t.suppliers.debit}</TableHead>
                  <TableHead className="text-right">{t.suppliers.credit}</TableHead>
                  <TableHead className="text-right">{t.suppliers.balance}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">{t.customers.startingBalance}</TableCell>
                  <TableCell className="text-right font-medium">{settings.currency}{startingBalance.toFixed(2)}</TableCell>
                </TableRow>
                {transactionHistory.map((tx) => (
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
                    <TableCell className="text-right font-bold">{settings.currency}{supplier.balance.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
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
