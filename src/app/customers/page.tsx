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
import { type Customer } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddCustomerDialog } from '@/components/add-customer-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, FileSearch, Wallet, ChevronsUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CustomerInvoicesDialog } from '@/components/customer-invoices-dialog';
import { MakePaymentDialog } from '@/components/make-payment-dialog';
import { useSettings } from '@/contexts/settings-context';
import Loading from '@/app/loading';

type SortableKeys = keyof Pick<Customer, 'name' | 'email' | 'phone' | 'spent' | 'balance' | 'settlementDay'>;


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

  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({
    key: 'spent',
    direction: 'descending',
  });

  const filteredAndSortedCustomers = useMemo(() => {
    // Filter out any potentially invalid customer entries (null, undefined) to prevent crashes
    let sortableCustomers = customers.filter(c => !!c); 
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    if (lowerCaseSearchTerm) {
        sortableCustomers = sortableCustomers.filter(customer =>
          (customer.name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          (customer.email || '').toLowerCase().includes(lowerCaseSearchTerm) ||
          (customer.phone || '').toLowerCase().includes(lowerCaseSearchTerm)
        );
    }
    
    sortableCustomers.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sortableCustomers;
  }, [customers, searchTerm, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortableKeys, children: React.ReactNode, className?: string }) => (
      <TableHead className={`cursor-pointer hover:bg-muted/50 ${className || ''}`} onClick={() => requestSort(sortKey)}>
          <div className="flex items-center">
              {children}
              {getSortIcon(sortKey)}
          </div>
      </TableHead>
  );
  
  const handleOpenAddDialog = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsAddDialogOpen(true);
  };
  
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCustomer(null);
  }

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>, customerId?: string) => {
    if (customerId) {
      await updateCustomer(customerId, customerData);
      toast({
        title: t.customers.customerUpdated,
      });
    } else {
      await addCustomer(customerData);
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
    handleCloseDeleteDialog();
  };
  
  const handleMakePayment = async (amount: number) => {
    if (!payingCustomer) return;

    await makePayment(payingCustomer.id, amount);
    
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
                <SortableHeader sortKey="name">{t.customers.name}</SortableHeader>
                <SortableHeader sortKey="email">{t.customers.email}</SortableHeader>
                <SortableHeader sortKey="phone">{t.customers.phone}</SortableHeader>
                <SortableHeader sortKey="settlementDay" className="text-center">{t.customers.settlementDay}</SortableHeader>
                <SortableHeader sortKey="spent" className="text-right">{t.customers.totalSpent}</SortableHeader>
                <SortableHeader sortKey="balance" className="text-right">{t.customers.balance}</SortableHeader>
                <TableHead className="text-right">{t.customers.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-center">{customer.settlementDay || '-'}</TableCell>
                  <TableCell className="text-right">{settings.currency}{customer.spent.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-bold ${customer.balance > 0 ? 'text-destructive' : 'text-success'}`}>
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
