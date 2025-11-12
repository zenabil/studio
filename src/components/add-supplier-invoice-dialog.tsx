

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
import type { Supplier, SupplierInvoiceItem, Product, AddSupplierInvoiceData } from '@/contexts/data-context';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as FormDescriptionRadix,
} from '@/components/ui/form';
import { useEffect, useMemo, useState } from 'react';
import { useData } from '@/contexts/data-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AddProductDialog } from '@/components/add-product-dialog';

const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Please select a product."),
  productName: z.string(),
  quantity: z.coerce.number().min(1),
  purchasePrice: z.coerce.number().min(0),
  boxPrice: z.coerce.number().min(0).optional().or(z.literal('')).transform(val => val === '' ? null : val),
  quantityPerBox: z.coerce.number().int().min(0).optional().or(z.literal('')).transform(val => val === '' ? null : val),
  barcode: z.string().optional(),
});

const formSchema = z.object({
  supplierId: z.string(),
  items: z.array(invoiceItemSchema).min(1, "Please add at least one item to the invoice."),
  amountPaid: z.coerce.number().min(0).optional(),
  priceUpdateStrategy: z.enum(['master', 'average', 'none']).default('average'),
  purchaseOrderId: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

interface AddSupplierInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: FormSchemaType) => void;
  supplier: Supplier;
  initialItems?: SupplierInvoiceItem[];
  purchaseOrderId?: string;
}

export function AddSupplierInvoiceDialog({ isOpen, onClose, onSave, supplier, initialItems, purchaseOrderId }: AddSupplierInvoiceDialogProps) {
  const { t } = useLanguage();
  const { products, addProduct } = useData();
  const { settings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [addProductTargetIndex, setAddProductTargetIndex] = useState<number | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);

  const categorizedProducts = useMemo(() => {
    const grouped: { [category: string]: Product[] } = {};
    products.filter(p => !!p).forEach(p => {
        if (!grouped[p.category]) {
            grouped[p.category] = [];
        }
        grouped[p.category].push(p);
    });

    const sortedCategories = Object.keys(grouped).sort((a, b) => {
        if (a === supplier.productCategory) return -1;
        if (b === supplier.productCategory) return 1;
        return a.localeCompare(b);
    });
    
    return sortedCategories.map(category => ({
        name: category,
        products: grouped[category].sort((a,b) => a.name.localeCompare(b.name))
    }));
  }, [products, supplier.productCategory]);


  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  
  useEffect(() => {
    if (!watchedItems) {
      setTotalAmount(0);
      return;
    }
    const newTotal = watchedItems.reduce((acc, item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.purchasePrice) || 0;
        return acc + (quantity * price);
    }, 0);
    setTotalAmount(newTotal);
  }, [watchedItems]);


  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (!name || type !== 'change') return;
  
      const parts = name.split('.');
      if (parts.length < 3 || parts[0] !== 'items') return;
      
      const index = parseInt(parts[1], 10);
      if (isNaN(index)) return;
      
      const fieldName = parts[2] as keyof SupplierInvoiceItem;
      const item = value.items?.[index];
  
      if (!item) return;
  
      if (fieldName === 'boxPrice' || fieldName === 'quantityPerBox') {
        const boxPrice = item.boxPrice;
        const qtyPerBox = item.quantityPerBox;
  
        if (typeof boxPrice === 'number' && boxPrice > 0 && typeof qtyPerBox === 'number' && qtyPerBox > 0) {
          const newPurchasePrice = parseFloat((boxPrice / qtyPerBox).toFixed(2));
          if (item.purchasePrice !== newPurchasePrice) {
            form.setValue(`items.${index}.purchasePrice`, newPurchasePrice, { shouldValidate: true });
          }
        }
      } else if (fieldName === 'purchasePrice') {
        // When the user manually edits the purchase price, we should NOT automatically clear box pricing.
        // This allows them to adjust the unit price independently if needed.
        // The logic for calculating unit price from box price remains, but not the other way around.
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);


  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      form.reset({
        supplierId: supplier.id,
        items: initialItems || [],
        amountPaid: 0,
        priceUpdateStrategy: 'average',
        purchaseOrderId: purchaseOrderId || undefined,
      });
    }
  }, [isOpen, supplier, form, initialItems, purchaseOrderId]);

  function onSubmit(values: FormSchemaType) {
    setIsSaving(true);
    // onSave is not async, so we don't need a try/finally here.
    // The parent component handles the async logic and closes the dialog.
    onSave(values);
    onClose();
  }
  
  const handleSaveNewProduct = async (productData: Omit<Product, 'id'>, productId?: string) => {
    if (productId || addProductTargetIndex === null) return;

    try {
      const newProduct = await addProduct(productData);

      form.setValue(`items.${addProductTargetIndex}.productId`, newProduct.id, { shouldValidate: true });
      form.setValue(`items.${addProductTargetIndex}.productName`, newProduct.name);
      form.setValue(`items.${addProductTargetIndex}.purchasePrice`, newProduct.purchasePrice || 0);
      form.setValue(`items.${addProductTargetIndex}.boxPrice`, newProduct.boxPrice);
      form.setValue(`items.${addProductTargetIndex}.quantityPerBox`, newProduct.quantityPerBox);
      form.setValue(`items.${addProductTargetIndex}.barcode`, newProduct.barcodes.join(', ') || '');
      
      setIsAddProductDialogOpen(false);
    } catch (error) {
      // The context will show a toast on error, and the dialog will remain open.
      throw error;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t.suppliers.newInvoice}</DialogTitle>
            <DialogDescription>{t.suppliers.invoiceFor}: {supplier.name}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="h-72 pr-6">
                {fields.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">{t.suppliers.noItemsAdded}</p>
                  </div>
                ) : (
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
                                    const product = products.find(p => p.id === value);
                                    field.onChange(value);
                                    form.setValue(`items.${index}.productName`, product?.name || '');
                                    form.setValue(`items.${index}.purchasePrice`, product?.purchasePrice || 0);
                                    form.setValue(`items.${index}.boxPrice`, product?.boxPrice);
                                    form.setValue(`items.${index}.quantityPerBox`, product?.quantityPerBox);
                                    form.setValue(`items.${index}.barcode`, product?.barcodes?.join(', ') || '');
                                  }}
                                  onOpenChange={(isOpen) => {
                                      if(isOpen) {
                                          setAddProductTargetIndex(index);
                                      }
                                  }}
                                  defaultValue={field.value}
                                  disabled={isSaving}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t.suppliers.categoryPlaceholder} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <div
                                      onPointerDown={(e) => e.preventDefault()}
                                      className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-primary outline-none hover:bg-accent focus:bg-accent rtl:pl-2 rtl:pr-8"
                                      onClick={() => setIsAddProductDialogOpen(true)}
                                    >
                                      <PlusCircle className="absolute left-2 h-4 w-4 rtl:left-auto rtl:right-2" />
                                      <span>{t.suppliers.addNewProduct}</span>
                                    </div>
                                    <SelectSeparator />
                                    {categorizedProducts.length > 0 ? (
                                      categorizedProducts.map(group => (
                                        <SelectGroup key={group.name}>
                                          <SelectLabel>{group.name}</SelectLabel>
                                          {group.products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                          ))}
                                        </SelectGroup>
                                      ))
                                    ) : (
                                      <p className="p-2 text-sm text-muted-foreground">{t.suppliers.noProductsInCategory}</p>
                                    )}
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
                                <FormControl><Input type="text" {...field} readOnly disabled={isSaving} /></FormControl>
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
                                <FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving} /></FormControl>
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
                                <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving} /></FormControl>
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
                                <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} disabled={isSaving} /></FormControl>
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
                                <FormControl><Input type="number" step="1" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} disabled={isSaving} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSaving}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => append({ productId: '', productName: '', quantity: 1, purchasePrice: 0, boxPrice: null, quantityPerBox: null, barcode: '' })}
                  disabled={isSaving}
                >
                  <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                  {t.suppliers.addItem}
                </Button>
              </ScrollArea>
              <div className="flex justify-between items-start gap-8 pr-6 border-t pt-4">
                  <FormField
                    control={form.control}
                    name="priceUpdateStrategy"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{t.suppliers.updateMasterPrices}</FormLabel>
                        <FormDescriptionRadix>
                          {t.suppliers.updateMasterPricesDescription}
                        </FormDescriptionRadix>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                            disabled={isSaving}
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value="master" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {t.suppliers.updateMaster}
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value="average" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {t.suppliers.calculateAverage}
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value="none" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {t.suppliers.doNotUpdate}
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col items-end gap-4">
                      <FormField
                          control={form.control}
                          name="amountPaid"
                          render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                              <FormLabel className="text-base">{t.pos.amountPaid}:</FormLabel>
                              <FormControl>
                                  <Input className="w-32 text-base" type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <div className="text-right font-bold text-lg">
                          {t.pos.grandTotal}: {settings.currency}{totalAmount.toFixed(2)}
                      </div>
                  </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSaving}>
                    {t.suppliers.cancel}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={!form.formState.isValid || isSaving}>
                  {isSaving ? t.settings.saving : t.suppliers.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AddProductDialog
        isOpen={isAddProductDialogOpen}
        onClose={() => setIsAddProductDialogOpen(false)}
        onSave={handleSaveNewProduct}
        productToEdit={null}
        products={products}
      />
    </>
  );
}
