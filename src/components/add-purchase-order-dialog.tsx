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
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Supplier, SupplierInvoiceItem, Product, PurchaseOrder } from '@/lib/data';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface AddPurchaseOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderToEdit?: PurchaseOrder | null;
}

const POItemSchema = z.object({
  productId: z.string().min(1, "Please select a product."),
  productName: z.string(),
  quantity: z.coerce.number().min(1),
  purchasePrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  supplierId: z.string().min(1, 'Please select a supplier.'),
  status: z.enum(['draft', 'sent', 'partially_received', 'completed', 'cancelled']),
  items: z.array(POItemSchema).min(1, "Please add at least one item."),
  notes: z.string().optional(),
});

export function AddPurchaseOrderDialog({ isOpen, onClose, purchaseOrderToEdit }: AddPurchaseOrderDialogProps) {
  const { t } = useLanguage();
  const { products, suppliers, addPurchaseOrder, updatePurchaseOrder, isLoading } = useData();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const supplierId = form.watch('supplierId');

  const availableProducts = useMemo(() => {
    if (!supplierId) return [];
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return [];
    return products.filter(p => p.category === supplier.productCategory);
  }, [supplierId, suppliers, products]);

  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      if (purchaseOrderToEdit) {
        form.reset({
          supplierId: purchaseOrderToEdit.supplierId,
          status: purchaseOrderToEdit.status,
          items: purchaseOrderToEdit.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
          })),
          notes: purchaseOrderToEdit.notes,
        });
      } else {
        form.reset({
          supplierId: '',
          status: 'draft',
          items: [],
          notes: '',
        });
      }
    }
  }, [isOpen, purchaseOrderToEdit, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      if (purchaseOrderToEdit) {
        await updatePurchaseOrder(purchaseOrderToEdit.id, values);
        toast({ title: t.purchaseOrders.poUpdated || "Purchase order updated." });
      } else {
        await addPurchaseOrder(values);
        toast({ title: t.purchaseOrders.poCreated });
      }
      onClose();
    } catch (error) {
        console.error("Failed to save Purchase Order", error);
        toast({ variant: 'destructive', title: t.errors.title, description: t.errors.unknownError });
    } finally {
        setIsSaving(false);
    }
  }

  const watchedItems = form.watch('items');
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
  }, [watchedItems]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{purchaseOrderToEdit ? t.purchaseOrders.editPO : t.purchaseOrders.addPO}</DialogTitle>
            <DialogDescription>
              {purchaseOrderToEdit ? `PO #${purchaseOrderToEdit.id.substring(0,8)}...` : t.purchaseOrders.createNewPO}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.purchaseOrders.supplier}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving || !!purchaseOrderToEdit}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t.purchaseOrders.selectSupplierPlaceholder || "Select a supplier"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.purchaseOrders.status}</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {Object.entries(t.purchaseOrders.statuses).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value as string}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <p className="text-sm font-medium">{t.suppliers.invoiceItems}</p>
              <ScrollArea className="h-60 pr-6 border rounded-md">
                <div className="p-2 space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field: selectField }) => (
                              <FormItem>
                                {index === 0 && <FormLabel>{t.suppliers.product}</FormLabel>}
                                <Select
                                  onValueChange={(value) => {
                                    const product = products.find(p => p.id === value);
                                    selectField.onChange(value);
                                    form.setValue(`items.${index}.productName`, product?.name || '');
                                    form.setValue(`items.${index}.purchasePrice`, product?.purchasePrice || 0);
                                  }}
                                  defaultValue={selectField.value}
                                  disabled={isSaving || !supplierId}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t.suppliers.categoryPlaceholder} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableProducts.length > 0 ? (
                                      availableProducts.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                        <div className="col-span-3">
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
                        <div className="col-span-3">
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
                        <div className="col-span-1 flex items-center justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSaving}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ productId: '', productName: '', quantity: 1, purchasePrice: 0 })}
                      disabled={isSaving || !supplierId}
                    >
                      <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                      {t.suppliers.addItem}
                    </Button>
                </div>
              </ScrollArea>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.purchaseOrders.notes || 'Notes'}</FormLabel>
                    <FormControl>
                        <Textarea placeholder={t.purchaseOrders.notesPlaceholder || "Add any notes for this purchase order..."} {...field} disabled={isSaving}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-right font-bold text-lg">
                  {t.pos.grandTotal}: {settings.currency}{totalAmount.toFixed(2)}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSaving}>
                    {t.suppliers.cancel}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={!form.formState.isValid || isSaving}>
                   {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {isSaving ? t.settings.saving : t.suppliers.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
