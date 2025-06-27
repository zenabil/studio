'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import type { Product, Customer, CartItem, SaleRecord } from '@/lib/data';
import {
  PlusCircle,
  MinusCircle,
  FileText,
  Printer,
  XCircle,
  Plus,
  X,
  Barcode,
  Search,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useData } from '@/contexts/data-context';
import { useToast } from '@/hooks/use-toast';
import { InvoiceDialog } from '@/components/invoice-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CustomerCombobox } from '@/components/customer-combobox';
import { useSettings } from '@/contexts/settings-context';
import { AddProductDialog } from './add-product-dialog';
import { calculateItemTotal } from '@/lib/utils';
import Loading from '@/app/loading';
import { PosProductCard } from './pos-product-card';

interface SaleSession {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomerId: string | null;
  amountPaid: number;
  discount: number;
}

export function PosView() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, customers, addSaleRecord, addProduct, isLoading } = useData();
  const { settings } = useSettings();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [sessions, setSessions] = useState<SaleSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [cartQuantities, setCartQuantities] = useState<{ [key: string]: string }>({});

  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const customerComboboxRef = useRef<HTMLButtonElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const amountPaidInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const createNewSession = useCallback((): SaleSession => {
    const saleNumbers = sessions
      .map(s => {
        // Match "Sale" or its translation followed by a number
        const saleName = t.pos.sale.replace(/ /g, '\\s'); // Handle potential spaces in translation
        const regex = new RegExp(`^${saleName}\\s(\\d+)$`, 'i');
        const match = s.name.match(regex);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
  
    const nextNumber = saleNumbers.length > 0 ? Math.max(...saleNumbers) + 1 : sessions.length + 1;
  
    return {
      id: `session-${new Date().getTime()}-${nextNumber}`,
      name: `${t.pos.sale} ${nextNumber}`,
      cart: [],
      selectedCustomerId: null,
      amountPaid: 0,
      discount: 0,
    };
  }, [sessions, t.pos.sale]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessions.length === 0) {
      const initialSession = createNewSession();
      setSessions([initialSession]);
      setActiveSessionId(initialSession.id);
    }
  }, [createNewSession, sessions.length]);

  const activeSession = useMemo(() => {
    if (!activeSessionId) return undefined;
    return sessions.find(s => s.id === activeSessionId);
  }, [sessions, activeSessionId]);
  
  useEffect(() => {
    if (sessions.length > 0 && !sessions.find(s => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const updateActiveSession = useCallback((data: Partial<Omit<SaleSession, 'id'>>) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId ? { ...session, ...data } : session
      )
    );
  }, [activeSessionId]);

  const handleQuantityChange = useCallback((productId: string, newQuantity: number) => {
    if (!activeSession) return;
    
    const finalQuantity = Math.max(0, newQuantity);

    const newCart = [...activeSession.cart];
    const existingItemIndex = newCart.findIndex(item => item.id === productId);

    if (existingItemIndex > -1) {
        if (finalQuantity > 0) {
            newCart[existingItemIndex].quantity = finalQuantity;
        } else {
            newCart.splice(existingItemIndex, 1);
        }
    }
    
    updateActiveSession({ cart: newCart });
  }, [activeSession, updateActiveSession]);
  
  const handleQuantityInputChange = (productId: string, value: string) => {
    setCartQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleQuantityInputBlur = (productId: string) => {
      const value = cartQuantities[productId] || '';
      const newQuantity = parseFloat(value);
      
      if (isNaN(newQuantity)) {
          handleQuantityChange(productId, 0);
      } else {
          handleQuantityChange(productId, newQuantity);
      }
  };

  const handleIncrementQuantity = (productId: string) => {
    const item = activeSession?.cart.find(i => i.id === productId);
    if (item) {
        handleQuantityChange(productId, item.quantity + 1);
    }
  };

  const handleDecrementQuantity = (productId: string) => {
    const item = activeSession?.cart.find(i => i.id === productId);
    if (item) {
        handleQuantityChange(productId, item.quantity - 1);
    }
  };

  useEffect(() => {
    if (activeSession) {
        const newQuantities: { [key: string]: string } = {};
        activeSession.cart.forEach(item => {
            newQuantities[item.id] = String(item.quantity);
        });
        setCartQuantities(newQuantities);
        // Resize refs array to match cart size
        quantityInputRefs.current = quantityInputRefs.current.slice(0, activeSession.cart.length);
    }
  }, [activeSession]);
  
  useEffect(() => {
    if (activeSession) {
      if (activeSession.selectedCustomerId) {
        const customer = customers.find(c => c.id === activeSession.selectedCustomerId);
        if (customer && activeSession.name !== customer.name.split(' ')[0]) {
          updateActiveSession({ name: customer.name.split(' ')[0] });
        }
      } else {
        // Check if the current name is a customer name, and if so, revert to a generic name
        const isCustomerName = customers.some(c => c.name.split(' ')[0] === activeSession.name);
        const saleName = t.pos.sale.replace(/ /g, '\\s');
        const isGenericName = new RegExp(`^${saleName}\\s\\d+$`, 'i').test(activeSession.name);

        if (isCustomerName || !isGenericName) {
            const saleNumbers = sessions
                .map(s => {
                    const regex = new RegExp(`^${saleName}\\s(\\d+)$`, 'i');
                    const match = s.name.match(regex);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .filter(n => n > 0);
            const nextNumber = saleNumbers.length > 0 ? Math.max(...saleNumbers) + 1 : sessions.length + 1;
            updateActiveSession({ name: `${t.pos.sale} ${nextNumber}` });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.selectedCustomerId, t.pos.sale, customers]);


  const addToCart = useCallback((product: Product) => {
    if (!activeSession) return;
    
    const newCart = [...activeSession.cart];
    const existingItemIndex = newCart.findIndex((item) => item.id === product.id);
  
    if (existingItemIndex > -1) {
      newCart[existingItemIndex].quantity += 1;
    } else {
      newCart.push({ ...product, quantity: 1 });
    }
    updateActiveSession({ cart: newCart });
  }, [activeSession, updateActiveSession]);
  
  const resetSale = useCallback(() => {
    if (!activeSessionId) return;
      updateActiveSession({
          cart: [],
          selectedCustomerId: null,
          amountPaid: 0,
          discount: 0,
      });
  }, [activeSessionId, updateActiveSession]);
  
  const addNewSession = () => {
    const newSession = createNewSession();
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };
  
  const closeSession = useCallback((sessionId: string) => {
      setSessions(prev => {
          const newSessions = prev.filter(s => s.id !== sessionId);
          if (newSessions.length === 0) {
              const newInitialSession = createNewSession();
              setActiveSessionId(newInitialSession.id)
              return [newInitialSession];
          }
          return newSessions;
      });
      setSessionToDelete(null);
  }, [createNewSession]);

  const handleCloseSession = (sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.cart.length > 0) {
          setSessionToDelete(sessionId);
      } else {
          closeSession(sessionId);
      }
  };


  const { subtotal, total } = useMemo(() => {
    const cart = activeSession?.cart || [];
    const discount = activeSession?.discount || 0;
    const subtotal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const total = Math.max(0, subtotal - discount);
    return { subtotal, total };
  }, [activeSession?.cart, activeSession?.discount]);

  useEffect(() => {
    if (activeSession) {
      updateActiveSession({ amountPaid: total });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, activeSessionId]);

  const balance = total > 0 ? total - (activeSession?.amountPaid || 0) : 0;

  const handleSaleCompletion = useCallback(() => {
    if (!activeSession || activeSession.cart.length === 0 || !activeSessionId) {
      toast({
        variant: "destructive",
        title: t.errors.title,
        description: t.errors.emptyCart,
      });
      return;
    }

    const totals = { subtotal, discount: activeSession.discount, total, amountPaid: activeSession.amountPaid, balance };
    addSaleRecord(activeSession.cart, activeSession.selectedCustomerId, totals);

    toast({
      title: t.pos.saleSuccessTitle,
      description: t.pos.saleSuccessMessage,
    });
    
    closeSession(activeSessionId);
  }, [activeSession, activeSessionId, addSaleRecord, balance, subtotal, t.errors.emptyCart, t.errors.title, t.pos.saleSuccessMessage, t.pos.saleSuccessTitle, toast, closeSession]);

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
        setNewProductBarcode(barcode);
        setIsAddProductDialogOpen(true);
    }
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  }, [addToCart, products, t, toast, setNewProductBarcode, setIsAddProductDialogOpen]);
  
  const handleBarcodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && barcodeInput.trim()) {
      event.preventDefault();
      handleScanSuccess(barcodeInput.trim());
    }
  };

  const handleSaveProduct = (productData: Omit<Product, 'id' | 'imageUrl'>) => {
    addProduct(productData);
    toast({
        title: t.products.productAdded,
    });
    setIsAddProductDialogOpen(false);
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInvoiceOpen || !!sessionToDelete || isAddProductDialogOpen) return;
      
      const activeElement = document.activeElement as HTMLElement;

      if (event.key === 'Enter' && activeElement === amountPaidInputRef.current) {
          if (activeSession && activeSession.cart.length > 0) {
            event.preventDefault();
            handleSaleCompletion();
          }
          return; 
      }
      
      if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) && !event.key.startsWith('F') && !event.ctrlKey) return;

      if (event.key === 'F1') { event.preventDefault(); searchInputRef.current?.select(); }
      if (event.key === 'F2') { event.preventDefault(); barcodeInputRef.current?.select(); }
      if (event.key === 'F4') { event.preventDefault(); customerComboboxRef.current?.focus(); }
      if (event.key === 'F6') { event.preventDefault(); resetSale(); }
      if (event.key === 'F7') {
        event.preventDefault();
        if (quantityInputRefs.current.length > 0) {
          const firstInput = quantityInputRefs.current[0];
          firstInput?.focus();
          firstInput?.select();
        }
      }
      if (event.key === 'F8') { event.preventDefault(); discountInputRef.current?.select(); }
      if (event.key === 'F9') { event.preventDefault(); amountPaidInputRef.current?.select(); }
      if (event.key === 'F10') { event.preventDefault(); handleSaleCompletion(); }

      if (event.ctrlKey && event.key.toLowerCase() === 'p') {
          event.preventDefault();
          if (activeSession && activeSession.cart.length > 0) setIsInvoiceOpen(true);
      }
      
      if (event.key === 'Escape') {
          event.preventDefault();
          resetSale();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isInvoiceOpen, sessionToDelete, isAddProductDialogOpen, resetSale, activeSession, handleSaleCompletion]);


  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  
  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          (selectedCategory === 'all' || p.category === selectedCategory) &&
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aHasBarcode = !!a.barcode && a.barcode.trim() !== '';
        const bHasBarcode = !!b.barcode && b.barcode.trim() !== '';
        if (aHasBarcode === bHasBarcode) {
          return 0;
        }
        return aHasBarcode ? 1 : -1;
      });
  }, [products, selectedCategory, searchTerm]);
  
  const selectedCustomer = customers.find(c => c.id === activeSession?.selectedCustomerId);

  if (isLoading) return <Loading />;
  if (!activeSessionId || !activeSession) return <Loading />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:h-[calc(100vh-6rem)]">
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex flex-col gap-4">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder={`${t.pos.searchProducts} (F1)`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
               </div>
               <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-grow">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      ref={barcodeInputRef}
                      placeholder={`${t.pos.scanBarcode} (F2)`}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      className="pl-10"
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
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-[55vh] lg:h-full">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 pr-4">
                {filteredProducts.map((product) => (
                   <PosProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      currency={settings.currency}
                      t={t}
                    />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <Tabs value={activeSessionId} onValueChange={setActiveSessionId} className="w-full">
                <div className="flex items-center gap-2">
                    <TabsList className="flex-grow justify-start h-auto p-1 overflow-x-auto">
                        {sessions.map(session => (
                            <TabsTrigger key={session.id} value={session.id} className="relative pr-8">
                                {session.name}
                                {sessions.length > 1 && (
                                    <button onClick={(e) => {e.stopPropagation(); handleCloseSession(session.id)}} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted-foreground/20">
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <Button size="icon" variant="outline" onClick={addNewSession} className="h-9 w-9 flex-shrink-0">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-48">
              {activeSession.cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-4" />
                  <p>{t.pos.addToCart}...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.pos.description}</TableHead>
                      <TableHead className="text-center w-32">
                        <div className="flex items-center justify-center gap-2">
                          {t.pos.quantity}
                          <kbd className="rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F7</kbd>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t.pos.total}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSession.cart.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                           <div className="flex items-center justify-center gap-1 w-28 mx-auto">
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 rounded-full" onClick={() => handleDecrementQuantity(item.id)}>
                                    <MinusCircle className="h-4 w-4" />
                                </Button>
                                <Input
                                    ref={(el) => (quantityInputRefs.current[index] = el)}
                                    type="text"
                                    value={cartQuantities[item.id] || ''}
                                    onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                    onBlur={() => handleQuantityInputBlur(item.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleQuantityInputBlur(item.id);
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="h-8 text-center w-full px-1 text-sm bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                />
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 rounded-full" onClick={() => handleIncrementQuantity(item.id)}>
                                    <PlusCircle className="h-4 w-4"/>
                                </Button>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {settings.currency}{calculateItemTotal(item).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
          <div className="mt-auto p-4 pt-0">
            <Separator className="mb-4" />
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t.pos.subtotal}</span><span>{settings.currency}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>{t.pos.discount}</span>
                        <kbd className="rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F8</kbd>
                    </div>
                    <Input ref={discountInputRef} type="number" value={activeSession.discount || ''} onChange={(e) => updateActiveSession({ discount: Math.max(0, Number(e.target.value))})} className="h-8 w-24 text-right" />
                </div>
                <Separator/>
                <div className="flex justify-between font-bold text-lg"><span>{t.pos.grandTotal}</span><span>{settings.currency}{total.toFixed(2)}</span></div>
            </div>
            <Separator className="my-4" />
             <div className="space-y-4">
                <div className="relative">
                    <CustomerCombobox
                    ref={customerComboboxRef}
                    customers={customers}
                    selectedCustomerId={activeSession.selectedCustomerId}
                    onSelectCustomer={(customerId) =>
                        updateActiveSession({ selectedCustomerId: customerId })
                    }
                    />
                    <kbd className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F4</kbd>
                </div>
                <div className="relative">
                    <Input ref={amountPaidInputRef} type="number" placeholder={t.pos.amountPaid} value={activeSession.amountPaid || ''} onChange={(e) => updateActiveSession({ amountPaid: Number(e.target.value)})} className="pr-9" />
                    <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F9</kbd>
                </div>
                <div className="flex justify-between text-sm font-medium text-destructive"><span>{t.pos.balance}</span><span>{settings.currency}{balance.toFixed(2)}</span></div>
             </div>
             <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsInvoiceOpen(true)} disabled={activeSession.cart.length === 0}>
                    <FileText className="h-4 w-4" />
                    {t.pos.invoice}
                </Button>
                <Button variant="destructive" onClick={resetSale}>
                    <XCircle className="h-4 w-4"/>
                    <span>{t.pos.newSale}</span>
                    <kbd className="rounded bg-background/20 text-destructive-foreground px-1.5 font-mono text-[10px] font-medium">F6</kbd>
                </Button>
             </div>
             <div className="mt-2">
                <Button variant="accent" className="w-full h-12 text-lg" onClick={handleSaleCompletion}>
                    <span>{t.pos.completeSale}</span>
                    <kbd className="rounded bg-background/20 text-accent-foreground px-1.5 font-mono text-[10px] font-medium">F10</kbd>
                </Button>
             </div>
          </div>
        </Card>
      </div>
      {isInvoiceOpen && <InvoiceDialog 
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        cart={activeSession.cart}
        customer={selectedCustomer}
        totals={{ subtotal, discount: activeSession.discount, total, amountPaid: activeSession.amountPaid, balance }}
      />}
      <ConfirmDialog
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => sessionToDelete && closeSession(sessionToDelete)}
        title={t.pos.confirmCloseSaleTitle}
        description={t.pos.confirmCloseSaleMessage}
      />
      <AddProductDialog
        isOpen={isAddProductDialogOpen}
        onClose={() => setIsAddProductDialogOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={null}
        initialBarcode={newProductBarcode}
      />
    </div>
  );
}
