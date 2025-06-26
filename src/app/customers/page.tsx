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

export default function CustomersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { customers, salesHistory, addCustomer, updateCustomer, deleteCustomer, makePayment, isLoading } = useData();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [viewingInvoicesFor, setViewingInvoicesFor] = useState<Customer | null>(null);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.spent - a.spent);
  }, [customers, searchTerm]);
  
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
      <Card>
        <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>{t.customers.title}</CardTitle>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.customers.name}</TableHead>
                <TableHead>{t.customers.email}</TableHead>
                <TableHead>{t.customers.phone}</TableHead>
                <TableHead className="text-center">{t.customers.settlementDay}</TableHead>
                <TableHead className="text-right">{t.customers.totalSpent}</TableHead>
                <TableHead className="text-right">{t.customers.balance}</TableHead>
                <TableHead className="text-right">{t.customers.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-center">{customer.settlementDay || '-'}</TableCell>
                  <TableCell className="text-right">{settings.currency}{customer.spent.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-bold ${customer.balance > 0 ? 'text-destructive' : 'text-green-500'}`}>
                    {settings.currency}{customer.balance.toFixed(2)}
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
