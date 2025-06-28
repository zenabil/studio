
'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { useSettings } from '@/contexts/settings-context';
import type { Expense } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import Loading from '@/app/loading';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

export default function ExpensesPage() {
  const { t } = useLanguage();
  const { expenses, addExpense, updateExpense, deleteExpense, isLoading } = useData();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(expense => {
        if (!expense) return false;
        
        // Date range filter
        if (dateRange?.from) {
          const expenseDate = new Date(expense.date);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);

          const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
          toDate.setHours(23, 59, 59, 999);
          
          if (expenseDate < fromDate || expenseDate > toDate) {
            return false;
          }
        }
        
        // Search term filter
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        if (!lowerCaseSearchTerm) return true;
        
        return (
          expense.description.toLowerCase().includes(lowerCaseSearchTerm) ||
          expense.category.toLowerCase().includes(lowerCaseSearchTerm)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, dateRange]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const handleOpenDialog = (expense: Expense | null = null) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
  }

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>, expenseId?: string) => {
    try {
      if (expenseId) {
        await updateExpense(expenseId, expenseData);
        toast({ title: t.expenses.expenseUpdated });
      } else {
        await addExpense(expenseData);
        toast({ title: t.expenses.expenseAdded });
      }
    } catch (error) {
      throw error;
    }
  };
  
  const handleOpenDeleteDialog = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const handleCloseDeleteDialog = () => {
    setExpenseToDelete(null);
  };

  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    handleCloseDeleteDialog();
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold font-headline">{t.expenses.title}</h1>
          <div className="flex flex-col md:flex-row w-full gap-2 md:w-auto">
            <Input
              placeholder={t.expenses.searchExpenses}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.expenses.addExpense}
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
             <CardTitle>{t.expenses.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.expenses.date}</TableHead>
                  <TableHead>{t.expenses.category}</TableHead>
                  <TableHead>{t.expenses.description}</TableHead>
                  <TableHead className="text-right">{t.expenses.amount}</TableHead>
                  <TableHead className="text-right">{t.expenses.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'PP')}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell className="text-right">{settings.currency}{expense.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title={t.expenses.editExpense} onClick={() => handleOpenDialog(expense)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={t.expenses.deleteExpense} onClick={() => handleOpenDeleteDialog(expense)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {searchTerm || dateRange?.from ? t.expenses.noResultsFound : t.expenses.noExpenses}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="text-right text-lg font-bold">{t.expenses.totalExpenses}</TableCell>
                    <TableCell className="text-right text-lg font-bold">{settings.currency}{totalExpenses.toFixed(2)}</TableCell>
                    <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddExpenseDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveExpense}
        expenseToEdit={editingExpense}
      />
      
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteExpense}
        title={t.expenses.deleteConfirmationTitle}
        description={t.expenses.deleteConfirmationMessage}
      />
    </>
  );
}
