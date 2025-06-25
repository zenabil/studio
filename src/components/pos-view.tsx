'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { products, customers as initialCustomers, salesHistory as initialSalesHistory } from '@/lib/data';
import type { Product, Customer, CartItem, SaleRecord } from '@/lib/data';
import {
  PlusCircle,
  MinusCircle,
  FileText,
  Printer,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { InvoiceDialog } from '@/components/invoice-dialog';

export function PosView() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(initialSalesHistory);

  const taxRate = 0.1;

  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };
  
  const resetSale = () => {
    setCart([]);
    setSelectedCustomerId(null);
    setAmountPaid(0);
    setDiscount(0);
  }

  const { subtotal, tax, total } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  }, [cart, discount, taxRate]);

  const balance = total > 0 ? total - amountPaid : 0;

  const handleSaleCompletion = () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: t.errors.title,
        description: t.errors.emptyCart,
      });
      return;
    }

    const newSale: SaleRecord = {
        id: `SALE-${new Date().getTime()}`,
        customerId: selectedCustomerId,
        items: cart,
        totals: { subtotal, tax, discount, total, amountPaid, balance },
        date: new Date().toISOString(),
    };

    setSalesHistory(prev => [...prev, newSale]);

    if (selectedCustomerId) {
        setCustomers(prevCustomers => 
            prevCustomers.map(c => {
                if (c.id === selectedCustomerId) {
                    return {
                        ...c,
                        spent: c.spent + total,
                        balance: c.balance + balance,
                    }
                }
                return c;
            })
        );
    }

    toast({
      title: t.pos.saleSuccessTitle,
      description: t.pos.saleSuccessMessage,
    });
    
    resetSale();
  };

  const handleScanSuccess = useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
        addToCart(product);
        toast({
            title: t.pos.productAdded,
            description: `${product.name} ${t.pos.addedToCart}`,
        });
    } else {
        toast({
            variant: "destructive",
            title: t.errors.title,
            description: t.errors.productNotFound,
        });
    }
    setBarcodeInput('');
  }, [addToCart, t, toast]);
  
  const handleBarcodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && barcodeInput.trim()) {
      event.preventDefault();
      handleScanSuccess(barcodeInput.trim());
    }
  };


  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];
  
  const filteredProducts = products.filter(
    (p) =>
      (selectedCategory === 'all' || p.category === selectedCategory) &&
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="grid h-[calc(100vh-5rem)] grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Products Section */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder={t.pos.searchProducts}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                 <Input
                  placeholder={t.pos.scanBarcode}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                  <SelectValue placeholder={t.pos.allCategories} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? t.pos.allCategories : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden transition-all hover:scale-105 hover:shadow-lg">
                    <CardContent className="p-0">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={300}
                        height={200}
                        className="h-32 w-full object-cover"
                        data-ai-hint="food pastry"
                      />
                      <div className="p-3">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="p-2">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => addToCart(product)}
                      >
                        {t.pos.addToCart}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Cart and Payment Section */}
      <div className="lg:col-span-1">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>{t.pos.currentSale}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-48">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground">{t.pos.addToCart}...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.pos.description}</TableHead>
                      <TableHead className="text-center">{t.pos.quantity}</TableHead>
                      <TableHead className="text-right">{t.pos.total}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                           <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}><MinusCircle className="h-4 w-4" /></Button>
                                <span>{item.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}><PlusCircle className="h-4 w-4"/></Button>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${(item.price * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
          <div className="mt-auto p-6 pt-0">
            <Separator className="mb-4" />
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t.pos.subtotal}</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>{t.pos.tax}</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between items-center">
                    <span>{t.pos.discount}</span>
                    <Input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="h-8 w-24 text-right" />
                </div>
                <Separator/>
                <div className="flex justify-between font-bold text-lg"><span>{t.pos.grandTotal}</span><span>${total.toFixed(2)}</span></div>
            </div>
            <Separator className="my-4" />
             <div className="space-y-4">
                <Select
                  onValueChange={(value) =>
                    setSelectedCustomerId(value === 'none' ? null : value)
                  }
                  value={selectedCustomerId || 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.pos.selectCustomer} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.pos.noCustomer}</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder={t.pos.amountPaid} value={amountPaid || ''} onChange={(e) => setAmountPaid(Number(e.target.value))} />
                <div className="flex justify-between text-sm font-medium text-destructive"><span>{t.pos.balance}</span><span>${balance.toFixed(2)}</span></div>
             </div>
             <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsInvoiceOpen(true)} disabled={cart.length === 0}><FileText className="mr-2 h-4 w-4" />{t.pos.invoice}</Button>
                <Button variant="outline" onClick={() => window.print()} disabled={cart.length === 0}><Printer className="mr-2 h-4 w-4" />{t.pos.printInvoice}</Button>
             </div>
             <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="destructive" className="w-full" onClick={resetSale}><XCircle className="mr-2 h-4 w-4"/>{t.pos.newSale}</Button>
                <Button className="w-full col-span-1 bg-accent hover:bg-accent/90" onClick={handleSaleCompletion}>{t.pos.completeSale}</Button>
             </div>
          </div>
        </Card>
      </div>
      {isInvoiceOpen && <InvoiceDialog 
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        cart={cart}
        customer={selectedCustomer}
        totals={{ subtotal, tax, discount, total, amountPaid, balance }}
      />}
    </div>
  );
}
