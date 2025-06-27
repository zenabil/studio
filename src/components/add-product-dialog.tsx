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
import type { Product } from '@/lib/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect } from 'react';

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>, id?:string) => void;
  productToEdit?: Product | null;
  initialBarcode?: string;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  purchasePrice: z.coerce.number().min(0, { message: 'Purchase price must be a positive number.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  stock: z.coerce.number().int().min(0, { message: 'Stock must be a positive integer.' }),
  minStock: z.coerce.number().int().min(0, { message: 'Min. stock must be a positive integer.' }),
  quantityPerBox: z.coerce.number().int().min(0, { message: 'Quantity per box must be a positive integer.' }),
  boxPrice: z.coerce.number().min(0, { message: 'Box price must be a positive number.' }),
  barcode: z.string().min(1, { message: 'Barcode cannot be empty.' }),
});

export function AddProductDialog({ isOpen, onClose, onSave, productToEdit, initialBarcode }: AddProductDialogProps) {
  const { t } = useLanguage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      purchasePrice: 0,
      price: 0,
      stock: 0,
      minStock: 0,
      quantityPerBox: 0,
      boxPrice: 0,
      barcode: '',
    },
  });
  
  useEffect(() => {
    if(isOpen) {
      if (productToEdit) {
        form.reset({
          name: productToEdit.name,
          category: productToEdit.category,
          purchasePrice: productToEdit.purchasePrice || 0,
          price: productToEdit.price,
          stock: productToEdit.stock,
          minStock: productToEdit.minStock || 0,
          quantityPerBox: productToEdit.quantityPerBox || 0,
          boxPrice: productToEdit.boxPrice || 0,
          barcode: productToEdit.barcode,
        });
      } else {
        form.reset({
          name: '',
          category: '',
          purchasePrice: 0,
          price: 0,
          stock: 0,
          minStock: 0,
          quantityPerBox: 0,
          boxPrice: 0,
          barcode: initialBarcode || '',
        });
      }
    }
  }, [productToEdit, form, isOpen, initialBarcode]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values, productToEdit?.id);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{productToEdit ? t.products.editProduct : t.products.newProduct}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.products.name}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.products.namePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.products.category}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.products.categoryPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.purchasePrice}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder={t.products.purchasePricePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.price}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder={t.products.pricePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.stock}</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder={t.products.stockPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.minStock}</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder={t.products.minStockPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="quantityPerBox"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.quantityPerBox}</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder={t.products.quantityPerBoxPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="boxPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.boxPrice}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder={t.products.boxPricePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.products.barcode}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.products.barcodePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t.products.cancel}
                </Button>
              </DialogClose>
              <Button type="submit">{t.products.save}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
