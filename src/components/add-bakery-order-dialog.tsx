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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect } from 'react';
import type { BakeryOrder } from '@/app/bakery-orders/page';

interface AddBakeryOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Omit<BakeryOrder, 'id' | 'paid' | 'received' | 'date'>) => void;
}

export function AddBakeryOrderDialog({ isOpen, onClose, onSave }: AddBakeryOrderDialogProps) {
  const { t } = useLanguage();

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
      form.reset({
        name: '',
        quantity: 1,
      });
    }
  }, [form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.bakeryOrders.newOrder}</DialogTitle>
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
                    <Input placeholder={t.bakeryOrders.namePlaceholder} {...field} />
                  </FormControl>
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
