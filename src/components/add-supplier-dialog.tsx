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
import type { Supplier } from '@/lib/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect, useMemo } from 'react';
import { Checkbox } from './ui/checkbox';
import { useData } from '@/contexts/data-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddSupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, 'id'>, id?: string) => void;
  supplierToEdit?: Supplier | null;
}

export function AddSupplierDialog({ isOpen, onClose, onSave, supplierToEdit }: AddSupplierDialogProps) {
  const { t } = useLanguage();
  const { products } = useData();

  const productCategories = useMemo(() => {
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  const formSchema = z.object({
    name: z.string().min(1, { message: t.suppliers.nameRequired }),
    phone: z.string().min(1, { message: t.suppliers.phoneRequired }),
    productCategory: z.string().min(1, { message: t.suppliers.categoryRequired }),
    visitDays: z.array(z.number()).optional(),
  });
  
  const days = [
    { id: 0, label: t.suppliers.days.sunday },
    { id: 1, label: t.suppliers.days.monday },
    { id: 2, label: t.suppliers.days.tuesday },
    { id: 3, label: t.suppliers.days.wednesday },
    { id: 4, label: t.suppliers.days.thursday },
    { id: 5, label: t.suppliers.days.friday },
    { id: 6, label: t.suppliers.days.saturday },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      productCategory: '',
      visitDays: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (supplierToEdit) {
        form.reset({
          name: supplierToEdit.name,
          phone: supplierToEdit.phone,
          productCategory: supplierToEdit.productCategory,
          visitDays: supplierToEdit.visitDays || [],
        });
      } else {
        form.reset({
          name: '',
          phone: '',
          productCategory: '',
          visitDays: [],
        });
      }
    }
  }, [supplierToEdit, form, isOpen]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values, supplierToEdit?.id);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplierToEdit ? t.suppliers.editSupplier : t.suppliers.addSupplier}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.suppliers.name}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.suppliers.namePlaceholder} {...field} />
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
                  <FormLabel>{t.suppliers.phone}</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder={t.suppliers.phonePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.suppliers.productCategory}</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.suppliers.categoryPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {productCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visitDays"
              render={() => (
                  <FormItem>
                      <FormLabel>{t.suppliers.visitDays}</FormLabel>
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 rounded-lg border p-4">
                          {days.map((day) => (
                              <FormField
                                  key={day.id}
                                  control={form.control}
                                  name="visitDays"
                                  render={({ field }) => {
                                      return (
                                          <FormItem
                                              key={day.id}
                                              className="flex flex-row items-center gap-2 space-y-0"
                                          >
                                              <FormControl>
                                                  <Checkbox
                                                      checked={field.value?.includes(day.id)}
                                                      onCheckedChange={(checked) => {
                                                          return checked
                                                              ? field.onChange([...(field.value || []), day.id])
                                                              : field.onChange(
                                                                  (field.value || []).filter(
                                                                      (value) => value !== day.id
                                                                  )
                                                              );
                                                      }}
                                                  />
                                              </FormControl>
                                              <FormLabel className="font-normal cursor-pointer">
                                                  {day.label}
                                              </FormLabel>
                                          </FormItem>
                                      );
                                  }}
                              />
                          ))}
                      </div>
                      <FormMessage />
                  </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t.suppliers.cancel}
                </Button>
              </DialogClose>
              <Button type="submit">{t.suppliers.save}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
