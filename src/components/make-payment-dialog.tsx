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
import { Input } from './ui/input';
import { useLanguage } from '@/contexts/language-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Customer } from '@/lib/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect } from 'react';

interface MakePaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number) => void;
  customer: Customer | null;
}

export function MakePaymentDialog({ isOpen, onClose, onSave, customer }: MakePaymentDialogProps) {
  const { t } = useLanguage();

  const formSchema = z.object({
    amount: z.coerce
      .number({ invalid_type_error: t.customers.invalidAmount })
      .min(0.01, { message: t.customers.invalidAmountZero })
      .max(customer?.balance || 0, { message: `${t.customers.paymentExceedsBalance} $${customer?.balance.toFixed(2)}` }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      amount: undefined,
    },
  });

  useEffect(() => {
    form.reset({ amount: undefined });
  }, [isOpen, customer, form]);

  if (!customer) return null;

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values.amount);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.customers.makePayment}</DialogTitle>
          <DialogDescription>
            {t.customers.forCustomer}: {customer.name} <br />
            {t.customers.currentBalance}: <span className="font-bold text-destructive">${customer.balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.customers.paymentAmount}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={t.customers.amountPlaceholder} {...field} autoFocus onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t.customers.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!form.formState.isValid}>{t.customers.save}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
