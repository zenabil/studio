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
import type { Supplier } from '@/lib/data';
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

interface MakeSupplierPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
  supplier: Supplier | null;
}

export function MakeSupplierPaymentDialog({ isOpen, onClose, onSave, supplier }: MakeSupplierPaymentDialogProps) {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const formSchema = z.object({
    amount: z.coerce
      .number({ invalid_type_error: t.customers.invalidAmount })
      .min(0.01, { message: t.customers.invalidAmountZero })
      .max(supplier?.balance || 0, { message: `${t.customers.paymentExceedsBalance} ${settings.currency}${supplier?.balance.toFixed(2)}` }),
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
  }, [isOpen, supplier, form]);

  if (!supplier) return null;

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
          <DialogTitle>{t.suppliers.makePayment}</DialogTitle>
          <DialogDescription>
            {t.suppliers.paymentFor}: {supplier.name} <br />
            {t.suppliers.currentBalance}: <span className="font-bold text-destructive">{settings.currency}{supplier.balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.suppliers.paymentAmount}</FormLabel>
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
