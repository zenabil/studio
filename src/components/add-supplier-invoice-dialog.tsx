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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/language-context';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Supplier, SupplierInvoiceItem, SupplierInvoice } from '@/lib/data';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';

interface AddSupplierInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Omit<SupplierInvoice, 'id' | 'date' | 'totalAmount'>) => void;
  supplier: Supplier;
}

const invoiceItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  quantity: z.coerce.number().min(1),
  purchasePrice: z.coerce.number().min(0),
  boxPrice: z.coerce.number().min(0).optional(),
  quantityPerBox: z.coerce.number().int().min(0).optional(),
  barcode: z.string().optional(),
});

const formSchema = z.object({
  supplierId: z.string(),
  items: z.array(invoiceItemSchema).min(1),
  amountPaid: z.coerce.number().min(0).optional(),
});

export function AddSupplierInvoiceDialog({ isOpen, onClose, onSave, supplier }: AddSupplierInvoiceDialogProps) {
  const { t } = useLanguage();
  const { products } = useData();
  const { settings } = useSettings();

  const supplierProducts = useMemo(() => {
    return products.filter(p => p.category === supplier.productCategory);
  }, [products, supplier]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: supplier.id,
      items: [],
      amountPaid: 0,
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
    const subscription = form.watch((value, { name, type }) => {
      if (name && (name.endsWith('.boxPrice') || name.endsWith('.quantityPerBox'))) {
        const index = parseInt(name.split('.')[1], 10);
        const item = value.items?.[index];
        if (item && typeof item.boxPrice === 'number' && typeof item.quantityPerBox === 'number' && item.quantityPerBox > 0) {
           const calculatedPrice = parseFloat((item.boxPrice / item.quantityPerBox).toFixed(2));
           form.setValue(`items.${index}.purchasePrice`, calculatedPrice, { shouldValidate: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  useEffect(() => {
    if (isOpen) {
      form.reset({
        supplierId: supplier.id,
        items: [{ productId: '', productName: '', quantity: 1, purchasePrice: 0, boxPrice: undefined, quantityPerBox: undefined, barcode: '' }],
        amountPaid: 0,
      });
    }
  }, [isOpen, supplier, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
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
                    <div className="col-span-3">
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
                                form.setValue(`items.${index}.boxPrice`, product?.boxPrice);
                                form.setValue(`items.${index}.quantityPerBox`, product?.quantityPerBox);
                                form.setValue(`items.${index}.barcode`, product?.barcodes?.[0] || '');
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
                        name={`items.${index}.barcode`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>{t.products.barcodes}</FormLabel>}
                            <FormControl><Input type="text" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
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
                    <div className="col-span-2">
                       <FormField
                        control={form.control}
                        name={`items.${index}.purchasePrice`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>{t.products.purchasePrice}</FormLabel>}
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <div className="col-span-2">
                       <FormField
                        control={form.control}
                        name={`items.${index}.boxPrice`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>{t.products.boxPrice}</FormLabel>}
                            <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <div className="col-span-1">
                       <FormField
                        control={form.control}
                        name={`items.${index}.quantityPerBox`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>{t.products.quantityPerBox}</FormLabel>}
                            <FormControl><Input type="number" step="1" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
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
                onClick={() => append({ productId: '', productName: '', quantity: 1, purchasePrice: 0, boxPrice: undefined, quantityPerBox: undefined, barcode: '' })}
              >
                {t.suppliers.addItem}
              </Button>
            </ScrollArea>
             <div className="flex justify-end items-center gap-8 pr-6 border-t pt-4">
                 <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormLabel className="text-base">{t.pos.amountPaid}:</FormLabel>
                        <FormControl>
                            <Input className="w-32 text-base" type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <div className="text-right font-bold text-lg">
                    {t.pos.grandTotal}: {settings.currency}{totalAmount.toFixed(2)}
                 </div>
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
