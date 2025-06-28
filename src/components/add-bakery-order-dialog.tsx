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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect } from 'react';
import type { BakeryOrder } from '@/lib/data';

interface AddBakeryOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: { name: string; quantity: number }, orderId?: string) => Promise<void>;
  orderToEdit?: BakeryOrder | null;
}

export function AddBakeryOrderDialog({ isOpen, onClose, onSave, orderToEdit }: AddBakeryOrderDialogProps) {
  const { t } = useLanguage();
  const isNameDisabled = !!orderToEdit?.isRecurring;

  const formSchema = z.object({
    name: z.string().min(2, { message: t.customers.nameMinLength }),
    quantity: z.coerce.number().int().min(1, { message: t.bakeryOrders.quantityMin }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      quantity: 1,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (orderToEdit) {
        form.reset({
          name: orderToEdit.name,
          quantity: orderToEdit.quantity,
        });
      } else {
        form.reset({
          name: '',
          quantity: 1,
        });
      }
    }
  }, [isOpen, orderToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onSave(values, orderToEdit?.id);
      form.reset();
      onClose();
    } catch (error) {
      // Error is handled by the parent component (toast message)
      // We catch it here to prevent the dialog from closing on failure
      console.error(error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{orderToEdit ? t.bakeryOrders.editOrder : t.bakeryOrders.newOrder}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bakeryOrders.name}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.bakeryOrders.namePlaceholder} {...field} disabled={isNameDisabled} />
                  </FormControl>
                  {isNameDisabled && (
                    <FormDescription>
                      {t.bakeryOrders.editRecurringNameInfo}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bakeryOrders.quantity}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder={t.bakeryOrders.quantityPlaceholder} {...field} />
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
