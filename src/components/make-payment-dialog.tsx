
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
import type { Customer } from '@/contexts/data-context';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/settings-context';

interface MakePaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
  customer: Customer | null;
}

export function MakePaymentDialog({ isOpen, onClose, onSave, customer }: MakePaymentDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const formSchema = z.object({
    amount: z.coerce
      .number({ invalid_type_error: t.customers.invalidAmount })
      .min(0.01, { message: t.customers.invalidAmountZero })
      .max(customer?.balance || 0, { message: `${t.customers.paymentExceedsBalance} ${settings.currency}${customer?.balance.toFixed(2)}` }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      amount: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      form.reset({ amount: undefined });
    }
  }, [isOpen, customer, form]);

  if (!customer) return null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      await onSave(values.amount);
      onClose();
    } catch(e) {
        // Parent context will show toast
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.customers.makePayment}</DialogTitle>
          <DialogDescription>
            {t.customers.forCustomer}: {customer.name} <br />
            {t.customers.currentBalance}: <span className="font-bold text-destructive">{settings.currency}{customer.balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>{t.customers.paymentAmount}</FormLabel>
                    <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-xs"
                        onClick={() => form.setValue('amount', customer.balance, { shouldValidate: true })}
                    >
                      {t.customers.payFullAmount}
                    </Button>
                  </div>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={t.customers.amountPlaceholder} {...field} autoFocus onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} value={field.value ?? ''} disabled={isSaving} />
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
              <Button type="submit" disabled={!form.formState.isValid || isSaving}>
                {isSaving ? t.settings.saving : t.customers.save}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
