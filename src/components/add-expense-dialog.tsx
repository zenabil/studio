
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
import { Input } from './ui/input';
import { useLanguage } from '@/contexts/language-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect, useState } from 'react';
import type { Expense } from '@/lib/data';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';

interface AddExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<Expense, 'id'>, expenseId?: string) => Promise<void>;
  expenseToEdit: Expense | null;
}

export function AddExpenseDialog({ isOpen, onClose, onSave, expenseToEdit }: AddExpenseDialogProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const formSchema = z.object({
    date: z.date({
      required_error: t.expenses.dateRequired,
    }),
    category: z.string().min(1, { message: t.expenses.categoryRequired }),
    description: z.string().min(1, { message: t.expenses.descriptionRequired }),
    amount: z.coerce
      .number({ invalid_type_error: t.customers.invalidAmount })
      .min(0.01, { message: t.expenses.amountRequired }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      category: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      if (expenseToEdit) {
        form.reset({
          date: new Date(expenseToEdit.date),
          category: expenseToEdit.category,
          description: expenseToEdit.description,
          amount: expenseToEdit.amount,
        });
      } else {
        form.reset({
          date: new Date(),
          category: '',
          description: '',
          amount: undefined,
        });
      }
    }
  }, [isOpen, expenseToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const expenseData = {
      ...values,
      date: values.date.toISOString(),
    };
    try {
      await onSave(expenseData, expenseToEdit?.id);
      form.reset();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expenseToEdit ? t.expenses.editExpense : t.expenses.newExpense}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>{t.expenses.date}</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                             disabled={isSaving}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>{t.reports.pickDate}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.expenses.category}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.expenses.categoryPlaceholder} {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.expenses.description}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t.expenses.descriptionPlaceholder} {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.expenses.amount}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={t.expenses.amountPlaceholder} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSaving}>
                  {t.customers.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                {isSaving ? t.settings.saving : t.customers.save}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
