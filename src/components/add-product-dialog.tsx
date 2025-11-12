
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
import type { Product } from '@/contexts/data-context';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect, useMemo, useState, useRef } from 'react';
import { BarcodeScannerDialog } from './barcode-scanner-dialog';
import { Barcode, Upload, Package } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';

type ProductFormData = Omit<Product, 'id'> & { imageFile?: File | null };

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData, id?:string) => Promise<void>;
  productToEdit?: Product | null;
  initialBarcode?: string;
  initialName?: string;
  products: Product[];
}

export function AddProductDialog({ isOpen, onClose, onSave, productToEdit, initialBarcode, initialName, products }: AddProductDialogProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formSchema = useMemo(() => {
    return z.object({
      name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
      category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
      purchasePrice: z.coerce.number().min(0, { message: 'Purchase price must be a positive number.' }),
      price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
      stock: z.coerce.number().int().min(0, { message: 'Stock must be a positive integer.' }),
      minStock: z.coerce.number().int().min(0, { message: 'Min. stock must be a positive integer.' }),
      quantityPerBox: z.coerce.number().int().min(0).optional().nullable(),
      boxPrice: z.coerce.number().min(0).optional().nullable(),
      barcodes: z.string(),
      imageUrl: z.string().optional().nullable(),
    }).superRefine((data, ctx) => {
        // Barcode check
        const barcodes = data.barcodes.split(',').map(b => b.trim()).filter(Boolean);
        if (barcodes.length > 0) {
            const allOtherBarcodes = new Set(
              products
                .filter(p => p.id !== productToEdit?.id)
                .flatMap(p => p.barcodes)
            );

            for (const barcode of barcodes) {
              if (allOtherBarcodes.has(barcode)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: t.products.barcodeExists.replace('{barcode}', barcode),
                  path: ['barcodes'],
                });
                break; // Stop after first barcode error to avoid spamming
              }
            }
        }
        
        // Box pricing cross-validation
        const hasBoxPrice = data.boxPrice !== undefined && data.boxPrice !== null && data.boxPrice > 0;
        const hasQuantityPerBox = data.quantityPerBox !== undefined && data.quantityPerBox !== null && data.quantityPerBox > 0;

        if (hasBoxPrice && !hasQuantityPerBox) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t.products.quantityPerBoxRequired,
                path: ['quantityPerBox'],
            });
        }

        if (hasQuantityPerBox && !hasBoxPrice) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t.products.boxPriceRequired,
                path: ['boxPrice'],
            });
        }
    });
  }, [products, productToEdit, t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      category: '',
      purchasePrice: 0,
      price: 0,
      stock: 0,
      minStock: 0,
      quantityPerBox: null,
      boxPrice: null,
      barcodes: '',
      imageUrl: null,
    },
  });
  
  useEffect(() => {
    if(isOpen) {
      setIsSaving(false);
      form.trigger(); // Trigger validation on open
      if (productToEdit) {
        form.reset({
          name: productToEdit.name,
          category: productToEdit.category,
          purchasePrice: productToEdit.purchasePrice || 0,
          price: productToEdit.price,
          stock: productToEdit.stock,
          minStock: productToEdit.minStock || 0,
          quantityPerBox: productToEdit.quantityPerBox || null,
          boxPrice: productToEdit.boxPrice || null,
          barcodes: (productToEdit.barcodes || []).join(', '),
          imageUrl: productToEdit.imageUrl || null,
        });
        setImagePreview(productToEdit.imageUrl || null);
      } else {
        form.reset({
          name: initialName || '',
          category: '',
          purchasePrice: 0,
          price: 0,
          stock: 0,
          minStock: 0,
          quantityPerBox: null,
          boxPrice: null,
          barcodes: initialBarcode || '',
          imageUrl: null,
        });
        setImagePreview(null);
      }
    }
  }, [productToEdit, form, isOpen, initialBarcode, initialName]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      const barcodesArray = values.barcodes.split(',').map(b => b.trim()).filter(Boolean);
      
      const dataToSave: ProductFormData = {
        ...values,
        quantityPerBox: values.quantityPerBox === undefined ? null : values.quantityPerBox,
        boxPrice: values.boxPrice === undefined ? null : values.boxPrice,
        imageUrl: imagePreview,
        barcodes: barcodesArray
      };

      await onSave(dataToSave, productToEdit?.id);
      form.reset();
      onClose();
    } catch (error) {
      // Error is handled in context/page, just prevent dialog from closing
      console.error("Failed to save product:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  const handleScanSuccess = (scannedBarcode: string) => {
    const currentBarcodes = form.getValues('barcodes');
    const newBarcodes = currentBarcodes ? `${currentBarcodes}, ${scannedBarcode}` : scannedBarcode;
    form.setValue('barcodes', newBarcodes, { shouldValidate: true });
    setIsScannerOpen(false);
  };
  
  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB size limit
        toast({
            variant: 'destructive',
            title: t.errors.title,
            description: t.errors.fileTooLarge,
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImagePreview(dataUrl);
        form.setValue('imageUrl', dataUrl, { shouldDirty: true });
    };
    reader.onerror = () => {
         toast({
            variant: 'destructive',
            title: t.errors.title,
            description: t.errors.fileReadError,
        });
    }
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{productToEdit ? t.products.editProduct : t.products.newProduct}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.products.name}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.products.namePlaceholder} {...field} disabled={isSaving}/>
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
                          <Input placeholder={t.products.categoryPlaceholder} {...field} disabled={isSaving}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
               <div className="space-y-2">
                  <Label>{t.settings.companyLogo}</Label>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-full h-24 rounded-lg border border-dashed flex items-center justify-center bg-muted/50">
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Product Preview" width={96} height={96} className="object-contain w-full h-full rounded-lg" unoptimized/>
                        ) : (
                            <Package className="w-10 h-10 text-muted-foreground"/>
                        )}
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={() => imageInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4"/>
                        {t.settings.uploadLogo}
                    </Button>
                     <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageFileChange}
                        accept="image/png, image/jpeg, image/gif"
                        className="hidden"
                     />
                  </div>
                </div>
            </div>
             
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.products.purchasePrice}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder={t.products.purchasePricePlaceholder} {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving}/>
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
                        <Input type="number" step="0.01" placeholder={t.products.pricePlaceholder} {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving}/>
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
                        <Input type="number" step="1" placeholder={t.products.stockPlaceholder} {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving}/>
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
                        <Input type="number" step="1" placeholder={t.products.minStockPlaceholder} {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} disabled={isSaving}/>
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
                        <Input type="number" step="1" placeholder={t.products.quantityPerBoxPlaceholder} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} disabled={isSaving}/>
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
                        <Input type="number" step="0.01" placeholder={t.products.boxPricePlaceholder} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} disabled={isSaving}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="barcodes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.products.barcodes}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder={t.products.barcodePlaceholder} {...field} disabled={isSaving} className="pr-10 rtl:pl-10 rtl:pr-2"/>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8 rtl:right-auto rtl:left-1"
                          onClick={() => setIsScannerOpen(true)}
                          title={t.pos.scanBarcode.replace('...','')}
                        >
                          <Barcode className="h-5 w-5" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSaving}>
                    {t.products.cancel}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>{isSaving ? t.settings.saving : t.products.save}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <BarcodeScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}

    