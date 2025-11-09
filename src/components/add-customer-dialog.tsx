
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

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'spent' | 'balance'>, id?: string) => Promise<void>;
  customerToEdit?: Customer | null;
  customers: Customer[];
}

export function AddCustomerDialog({ isOpen, onClose, onSave, customerToEdit, customers }: AddCustomerDialogProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const formSchema = z
    .object({
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
        .transform((val) => (val === '' ? undefined : val)),
    })
    .superRefine((data, ctx) => {
      if (data.email) {
        const emailExists = customers.some(
          (customer) =>
            customer.email.toLowerCase() === data.email.toLowerCase() && customer.id !== customerToEdit?.id
        );
        if (emailExists) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t.customers.emailExists,
            path: ['email'],
          });
        }
      }
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
      setIsSaving(false);
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      await onSave(values, customerToEdit?.id);
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
                    <Input placeholder={t.customers.namePlaceholder} {...field} disabled={isSaving} />
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
                    <Input type="email" placeholder={t.customers.emailPlaceholder} {...field} disabled={isSaving} />
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
                    <Input type="tel" placeholder={t.customers.phonePlaceholder} {...field} disabled={isSaving} />
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
                    <Input type="number" min="1" max="31" placeholder={t.customers.settlementDayPlaceholder} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSaving} />
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
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t.settings.saving : t.customers.save}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    