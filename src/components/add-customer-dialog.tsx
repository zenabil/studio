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

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'spent' | 'balance'>, id?: string) => void;
  customerToEdit?: Customer | null;
}

export function AddCustomerDialog({ isOpen, onClose, onSave, customerToEdit }: AddCustomerDialogProps) {
  const { t } = useLanguage();

  const formSchema = z.object({
    name: z.string().min(2, { message: t.customers.nameMinLength }),
    email: z.string().email({ message: t.customers.emailInvalid }).or(z.literal('')),
    phone: z.string().optional(),
    settlementDay: z.coerce
        .number()
        .int()
        .min(1, { message: t.customers.settlementDayInvalid })
        .max(31, { message: t.customers.settlementDayInvalid })
        .optional()
        .or(z.literal(''))
        .transform(val => val === '' ? undefined : val),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      settlementDay: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        form.reset({
          name: customerToEdit.name,
          email: customerToEdit.email,
          phone: customerToEdit.phone,
          settlementDay: customerToEdit.settlementDay || undefined,
        });
      } else {
        form.reset({
          name: '',
          email: '',
          phone: '',
          settlementDay: undefined,
        });
      }
    }
  }, [customerToEdit, form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values, customerToEdit?.id);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customerToEdit ? t.customers.editCustomer : t.customers.newCustomer}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.customers.name}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.customers.namePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.customers.email}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t.customers.emailPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.customers.phone}</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder={t.customers.phonePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settlementDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.customers.settlementDay}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="31" placeholder={t.customers.settlementDayPlaceholder} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
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
              <Button type="submit">{t.customers.save}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
