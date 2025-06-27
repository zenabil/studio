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
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { useData } from '@/contexts/data-context';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface AddSupplierInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Omit<any, 'id' | 'date' | 'totalAmount'>) => void;
  supplier: Supplier;
}

const invoiceItemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string(),
    quantity: z.coerce.number().min(1),
    purchasePrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  supplierId: z.string(),
  items: z.array(invoiceItemSchema).min(1),
});

export function AddSupplierInvoiceDialog({ isOpen, onClose, onSave, supplier }: AddSupplierInvoiceDialogProps) {
  const { t } = useLanguage();
  const { products } = useData();

  const supplierProducts = useMemo(() => {
    return products.filter(p => p.category === supplier.productCategory);
  }, [products, supplier]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: supplier.id,
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchedItems = form.watch('items');
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
  }, [watchedItems]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        supplierId: supplier.id,
        items: [{ productId: '', productName: '', quantity: 1, purchasePrice: 0 }],
      });
    }
  }, [isOpen, supplier, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.suppliers.newInvoice}</DialogTitle>
          <DialogDescription>{t.suppliers.invoiceFor}: {supplier.name}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-72 pr-6">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
                             <div className="col-span-5">
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.productId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel>{t.suppliers.product}</FormLabel>}
                                            <Select
                                              onValueChange={(value) => {
                                                  const product = supplierProducts.find(p => p.id === value);
                                                  field.onChange(value);
                                                  form.setValue(`items.${index}.productName`, product?.name || '');
                                                  form.setValue(`items.${index}.purchasePrice`, product?.purchasePrice || 0);
                                              }}
                                              defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t.suppliers.categoryPlaceholder} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {supplierProducts.length > 0 ? supplierProducts.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    )) : <p className="p-2 text-sm text-muted-foreground">{t.suppliers.noProductsInCategory}</p>}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                 />
                             </div>
                              <div className="col-span-2">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel>{t.suppliers.quantity}</FormLabel>}
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                             <div className="col-span-3">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.purchasePrice`}
                                    render={({ field }) => (
                                        <FormItem>
                                            {index === 0 && <FormLabel>{t.suppliers.purchasePrice}</FormLabel>}
                                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                             <div className="col-span-2 flex items-center justify-end">
                                 <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                     <Trash2 className="h-4 w-4 text-destructive" />
                                 </Button>
                             </div>
                        </div>
                    ))}
                </div>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ productId: '', productName: '', quantity: 1, purchasePrice: 0 })}
                >
                    {t.suppliers.addItem}
                </Button>
            </ScrollArea>
             <div className="text-right font-bold text-lg pr-6">
                {t.pos.grandTotal}: {totalAmount.toFixed(2)}
            </div>
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
