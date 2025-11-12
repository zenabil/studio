
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
import type { Supplier, SupplierInvoice } from '@/contexts/data-context';
import { useData } from '@/contexts/data-context';
import { format } from 'date-fns';
import { useSettings } from '@/contexts/settings-context';
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from './confirm-dialog';

interface SupplierInvoicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierInvoicesDialog({ isOpen, onClose, supplier }: SupplierInvoicesDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { supplierInvoices: allInvoices, deleteSupplierInvoice } = useData();
  const [invoiceToDelete, setInvoiceToDelete] = useState<SupplierInvoice | null>(null);

  const { transactions: transactionHistory, startingBalance } = useMemo(() => {
    if (!supplier) {
      return { transactions: [], startingBalance: 0 };
    }

    const supplierTransactions = allInvoices
      .filter(inv => inv.supplierId === supplier.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate the total change in balance from all recorded transactions for this supplier
    const totalBalanceChange = supplierTransactions.reduce((acc, tx) => {
        const balanceChangeForTx = tx.isPayment 
            ? -(tx.amountPaid || 0) // Payments decrease the balance
            : tx.totalAmount - (tx.amountPaid || 0); // Invoices increase balance by the unpaid amount
        return acc + balanceChangeForTx;
    }, 0);

    // Calculate the balance before any of these transactions took place
    const startBalance = (supplier.balance || 0) - totalBalanceChange;
    let runningBalance = startBalance;

    const statement = supplierTransactions.map(tx => {
      let debit = 0;
      let credit = 0;
      let description = '';

      if (tx.isPayment) {
        description = t.suppliers.payment;
        credit = tx.amountPaid || 0;
        debit = 0;
      } else {
        description = `${t.suppliers.invoice} #${tx.id.split('-')[1]}`;
        debit = tx.totalAmount;
        credit = tx.amountPaid || 0;
      }
      
      runningBalance += (debit - credit);

      return {
        ...tx, // pass full invoice object
        id: tx.id,
        date: tx.date,
        description,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return { transactions: statement, startingBalance: startBalance };
  }, [supplier, allInvoices, t]);

  const handleDelete = () => {
    if (invoiceToDelete) {
      deleteSupplierInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
    }
  };

  if (!supplier) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.suppliers.invoiceHistory}</DialogTitle>
          <DialogDescription>{supplier.name}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {transactionHistory.length > 0 || startingBalance !== 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.pos.date}</TableHead>
                  <TableHead>{t.suppliers.transaction}</TableHead>
                  <TableHead className="text-right">{t.suppliers.debit}</TableHead>
                  <TableHead className="text-right">{t.suppliers.credit}</TableHead>
                  <TableHead className="text-right">{t.suppliers.balance}</TableHead>
                  <TableHead className="text-right">{t.suppliers.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="font-medium">{t.customers.startingBalance}</TableCell>
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
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setInvoiceToDelete(tx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="text-lg">
                    <TableCell colSpan={5} className="text-right font-bold">{t.customers.totalDue}</TableCell>
                    <TableCell className="text-right font-bold">{settings.currency}{(supplier.balance || 0).toFixed(2)}</TableCell>
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
    <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action will reverse stock and balance changes and cannot be undone."
     />
    </>
  );
}
