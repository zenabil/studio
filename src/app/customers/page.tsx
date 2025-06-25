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
import { customers as initialCustomers, type Customer } from '@/lib/data';
import { useLanguage } from '@/contexts/language-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddCustomerDialog } from '@/components/add-customer-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil } from 'lucide-react';

export default function CustomersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);
  
  const handleOpenDialog = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  }

  const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'spent'>, customerId?: string) => {
    if (customerId) {
      setCustomers(prev =>
        prev.map(c =>
          c.id === customerId ? { ...c, ...customerData } : c
        )
      );
      toast({
        title: t.customers.customerUpdated,
      });
    } else {
      const newCustomer: Customer = {
        id: `cust-${new Date().getTime()}`,
        spent: 0,
        ...customerData,
      };
      setCustomers(prev => [newCustomer, ...prev]);
      toast({
        title: t.customers.customerAdded,
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t.customers.title}</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder={t.customers.searchCustomers}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <Button onClick={() => handleOpenDialog()}>
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
                <TableHead className="text-right">{t.customers.totalSpent}</TableHead>
                <TableHead className="text-right">{t.customers.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-right">${customer.spent.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(customer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddCustomerDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveCustomer}
        customerToEdit={editingCustomer}
      />
    </>
  );
}
