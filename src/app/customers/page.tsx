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
import { type Customer, type SaleRecord } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddCustomerDialog } from '@/components/add-customer-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, FileSearch, Wallet } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CustomerInvoicesDialog } from '@/components/customer-invoices-dialog';
import { MakePaymentDialog } from '@/components/make-payment-dialog';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';
import { addDays, differenceInCalendarDays } from 'date-fns';

type CustomerWithFees = Customer & { lateFees: number; totalDue: number; };

export default function CustomersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { customers, salesHistory, addCustomer, updateCustomer, deleteCustomer, makePayment, isLoading } = useData();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [viewingInvoicesFor, setViewingInvoicesFor] = useState<CustomerWithFees | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);

  const customersWithFees: CustomerWithFees[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return customers
      .map(customer => {
        if (customer.balance <= 0 || !settings.lateFeePercentage || settings.lateFeePercentage <= 0) {
          return { ...customer, lateFees: 0, totalDue: customer.balance };
        }

        const oldestDebtSale = salesHistory
          .filter(s => s.customerId === customer.id && s.totals.balance > 0)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

        if (!oldestDebtSale) {
          return { ...customer, lateFees: 0, totalDue: customer.balance };
        }

        const dueDate = addDays(new Date(oldestDebtSale.date), settings.paymentTermsDays);
        let lateFees = 0;
        
        if (today > dueDate) {
          const daysOverdue = differenceInCalendarDays(today, dueDate);
          if (daysOverdue > 0) {
            lateFees = daysOverdue * (customer.balance * (settings.lateFeePercentage / 100));
          }
        }

        return { ...customer, lateFees, totalDue: customer.balance + lateFees };
      })
      .filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.spent - a.spent);
  }, [customers, salesHistory, settings.paymentTermsDays, settings.lateFeePercentage, searchTerm]);
  
  const handleOpenAddDialog = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsAddDialogOpen(true);
  };
  
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCustomer(null);
  }

  const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>, customerId?: string) => {
    if (customerId) {
      updateCustomer(customerId, customerData);
      toast({
        title: t.customers.customerUpdated,
      });
    } else {
      addCustomer(customerData);
      toast({
        title: t.customers.customerAdded,
      });
    }
  };
  
  const handleOpenDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const handleCloseDeleteDialog = () => {
    setCustomerToDelete(null);
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;

    deleteCustomer(customerToDelete.id);
    toast({
        title: t.customers.customerDeleted,
    });
    handleCloseDeleteDialog();
  };
  
  const handleMakePayment = (amount: number) => {
    if (!payingCustomer) return;

    makePayment(payingCustomer.id, amount);
    
    toast({
        title: t.customers.paymentSuccess,
    });

    setPayingCustomer(null);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold font-headline">{t.customers.title}</h1>
        <div className="flex w-full gap-2 md:w-auto">
          <Input
            placeholder={t.customers.searchCustomers}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <Button onClick={() => handleOpenAddDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.customers.addCustomer}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.customers.name}</TableHead>
                <TableHead>{t.customers.email}</TableHead>
                <TableHead>{t.customers.phone}</TableHead>
                <TableHead className="text-center">{t.customers.settlementDay}</TableHead>
                <TableHead className="text-right">{t.customers.totalSpent}</TableHead>
                <TableHead className="text-right">{t.customers.balance}</TableHead>
                <TableHead className="text-right">{t.customers.lateFees}</TableHead>
                <TableHead className="text-right">{t.customers.totalDue}</TableHead>
                <TableHead className="text-right">{t.customers.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersWithFees.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-center">{customer.settlementDay || '-'}</TableCell>
                  <TableCell className="text-right">{settings.currency}{customer.spent.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{settings.currency}{customer.balance.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">{settings.currency}{customer.lateFees.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-bold ${customer.totalDue > 0 ? 'text-destructive' : 'text-success'}`}>
                    {settings.currency}{customer.totalDue.toFixed(2)}
                  </TableCell>
                  <TableCell className="flex justify-end">
                    {customer.balance > 0 && (
                      <Button variant="ghost" size="icon" title={t.customers.makePayment} onClick={() => setPayingCustomer(customer)}>
                          <Wallet className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title={t.customers.viewInvoices} onClick={() => setViewingInvoicesFor(customer)}>
                        <FileSearch className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title={t.customers.editCustomer} onClick={() => handleOpenAddDialog(customer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title={t.customers.delete} onClick={() => handleOpenDeleteDialog(customer)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CustomerInvoicesDialog
        isOpen={!!viewingInvoicesFor}
        onClose={() => setViewingInvoicesFor(null)}
        customer={viewingInvoicesFor}
        salesHistory={salesHistory}
      />
      <AddCustomerDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseAddDialog}
        onSave={handleSaveCustomer}
        customerToEdit={editingCustomer}
      />
       <MakePaymentDialog
        isOpen={!!payingCustomer}
        onClose={() => setPayingCustomer(null)}
        onSave={handleMakePayment}
        customer={payingCustomer}
      />
      <ConfirmDialog
        isOpen={!!customerToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteCustomer}
        title={t.customers.deleteConfirmationTitle}
        description={t.customers.deleteConfirmationMessage}
      />
    </>
  );
}
