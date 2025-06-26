'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
  const { products, customers, addSaleRecord, addProduct } = useData();
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
  
  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const customerComboboxRef = useRef<HTMLButtonElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const amountPaidInputRef = useRef<HTMLInputElement>(null);
  
  const createNewSession = useCallback((index: number): SaleSession => ({
    id: `session-${new Date().getTime()}-${index}`,
    name: `${t.pos.sale} ${index}`,
    cart: [],
    selectedCustomerId: null,
    amountPaid: 0,
    discount: 0,
  }), [t.pos.sale]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessions.length === 0) {
      const initialSession = createNewSession(1);
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

  const updateActiveSession = (data: Partial<Omit<SaleSession, 'id'>>) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId ? { ...session, ...data } : session
      )
    );
  };
  
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (!activeSession) return;
  
    const finalQuantity = Math.min(newQuantity, 999999999999);
  
    if (isNaN(finalQuantity) || finalQuantity <= 0) {
      const newCart = activeSession.cart.filter(item => item.id !== productId);
      updateActiveSession({ cart: newCart });
      setCartQuantities(prev => {
          const next = {...prev};
          delete next[productId];
          return next;
      });
    } else {
      const newCart = activeSession.cart.map(item =>
        item.id === productId ? { ...item, quantity: finalQuantity } : item
      );
      updateActiveSession({ cart: newCart });
      setCartQuantities(prev => ({ ...prev, [productId]: String(finalQuantity) }));
    }
  };

  const handleCartQuantityChange = (productId: string, value: string) => {
    setCartQuantities(prev => ({ ...prev, [productId]: value }));
  
    if (!activeSession) return;
    
    const newQuantity = parseFloat(value);
    
    if (!isNaN(newQuantity) && newQuantity > 0) {
        const finalQuantity = Math.min(newQuantity, 999999999999);
        const newCart = activeSession.cart.map(item =>
            item.id === productId ? { ...item, quantity: finalQuantity } : item
        );
        updateActiveSession({ cart: newCart });
    }
  };

  const handleCartQuantityBlur = (productId: string) => {
      if (!activeSession) return;
      const value = cartQuantities[productId] ?? '';
      const newQuantity = parseFloat(value);
      
      if (isNaN(newQuantity) || newQuantity <= 0) {
          updateQuantity(productId, 0);
      } else {
          updateQuantity(productId, newQuantity);
      }
  };
  
  useEffect(() => {
    if (activeSession) {
        const newQuantities: { [key: string]: string } = {};
        activeSession.cart.forEach(item => {
            newQuantities[item.id] = String(item.quantity);
        });
        setCartQuantities(newQuantities);
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
              const sessionIndex = sessions.findIndex(s => s.id === activeSessionId);
              if (sessionIndex !== -1) {
                const defaultName = `${t.pos.sale} ${sessionIndex + 1}`;
                if (activeSession.name !== defaultName) {
                  updateActiveSession({ name: defaultName });
                }
              }
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.selectedCustomerId, t.pos.sale, customers]);


  const addToCart = useCallback((product: Product) => {
    if (!activeSession) return;
    
    const newCart = [...activeSession.cart];
    const existingItemIndex = newCart.findIndex((item) => item.id === product.id);
  
    let finalQuantity;
    if (existingItemIndex > -1) {
      finalQuantity = newCart[existingItemIndex].quantity + 1;
      newCart[existingItemIndex].quantity = finalQuantity;
    } else {
      finalQuantity = 1;
      newCart.push({ ...product, quantity: finalQuantity });
    }
    updateActiveSession({ cart: newCart });
    // Sync the visual input state
    setCartQuantities(prev => ({...prev, [product.id]: String(finalQuantity)}))
  }, [activeSession]);
  
  const resetSale = useCallback(() => {
    if (!activeSessionId) return;
      updateActiveSession({
          cart: [],
          selectedCustomerId: null,
          amountPaid: 0,
          discount: 0,
      });
  }, [activeSessionId]);
  
  const addNewSession = () => {
    const newSession = createNewSession(sessions.length + 1);
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };
  
  const closeSession = useCallback((sessionId: string) => {
      setSessions(prev => {
          const newSessions = prev.filter(s => s.id !== sessionId);
          if (newSessions.length === 0) {
              const newInitialSession = createNewSession(1);
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
    const total = subtotal - discount;
    return { subtotal, total };
  }, [activeSession]);

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

  const handleSaveProduct = (productData: Omit<Product, 'id'>) => {
    addProduct(productData);
    toast({
        title: t.products.productAdded,
    });
    setIsAddProductDialogOpen(false);
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Do not trigger shortcuts if a dialog is open.
      if (isInvoiceOpen || !!sessionToDelete || isAddProductDialogOpen) {
        return;
      }
      
      const activeElement = document.activeElement as HTMLElement;

      // Handle Enter on specific input
      if (event.key === 'Enter' && activeElement === amountPaidInputRef.current) {
          if (activeSession && activeSession.cart.length > 0) {
            event.preventDefault();
            handleSaleCompletion();
          }
          return; 
      }

      // Allow typing in inputs, but capture function keys and special combos
      if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) && !event.key.startsWith('F') && !event.ctrlKey) {
        return;
      }

      // Global shortcuts
      if (event.key === 'F1') { event.preventDefault(); searchInputRef.current?.select(); }
      if (event.key === 'F2') { event.preventDefault(); barcodeInputRef.current?.select(); }
      if (event.key === 'F4') { event.preventDefault(); customerComboboxRef.current?.focus(); }
      if (event.key === 'F8') { event.preventDefault(); discountInputRef.current?.select(); }
      if (event.key === 'F9') { event.preventDefault(); amountPaidInputRef.current?.select(); }
      if (event.key === 'F10') { event.preventDefault(); handleSaleCompletion(); }

      if (event.ctrlKey && event.key.toLowerCase() === 'p') {
          event.preventDefault();
          if (activeSession && activeSession.cart.length > 0) {
              setIsInvoiceOpen(true);
          }
      }
      
      if (event.key === 'Escape') {
          event.preventDefault();
          resetSale();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInvoiceOpen, sessionToDelete, isAddProductDialogOpen, resetSale, activeSession, handleSaleCompletion]);


  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];
  
  const filteredProducts = products.filter(
    (p) =>
      (selectedCategory === 'all' || p.category === selectedCategory) &&
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedCustomer = customers.find(c => c.id === activeSession?.selectedCustomerId);

  if (!activeSessionId || !activeSession) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:h-[calc(100vh-5rem)]">
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    placeholder={t.pos.searchProducts}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-9"
                  />
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F1</kbd>
                </div>
                 <div className="relative">
                  <Input
                    ref={barcodeInputRef}
                    placeholder={t.pos.scanBarcode}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    className="pr-9"
                  />
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F2</kbd>
                </div>
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
            <ScrollArea className="h-[50vh] lg:h-[calc(100vh-14rem)]">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden transition-all hover:scale-105 hover:shadow-lg flex flex-col">
                    <CardContent className="p-3 flex-grow flex flex-col justify-center items-center text-center">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {settings.currency}{product.price.toFixed(2)}
                      </p>
                    </CardContent>
                    <CardFooter className="p-2 mt-auto">
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

      <div className="lg:col-span-1">
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
                    {activeSession.cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                           <div className="flex items-center justify-center gap-1 w-28 mx-auto">
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                    <MinusCircle className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="text"
                                    value={cartQuantities[item.id] || ''}
                                    onChange={(e) => handleCartQuantityChange(item.id, e.target.value)}
                                    onBlur={() => handleCartQuantityBlur(item.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCartQuantityBlur(item.id);
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="h-8 text-center w-full px-1 text-sm"
                                />
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
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
          <div className="mt-auto p-6 pt-0">
            <Separator className="mb-4" />
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t.pos.subtotal}</span><span>{settings.currency}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>{t.pos.discount}</span>
                        <kbd className="rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F8</kbd>
                    </div>
                    <Input ref={discountInputRef} type="number" value={activeSession.discount} onChange={(e) => updateActiveSession({ discount: Math.max(0, Number(e.target.value))})} className="h-8 w-24 text-right" />
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
                <Button variant="outline" onClick={() => setIsInvoiceOpen(true)} disabled={activeSession.cart.length === 0} className="justify-between w-full">
                    <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t.pos.invoice}
                    </span>
                    <kbd className="hidden rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">Ctrl+P</kbd>
                </Button>
                <Button variant="outline" onClick={() => window.print()} disabled={activeSession.cart.length === 0}><Printer className="mr-2 h-4 w-4" />{t.pos.printInvoice}</Button>
             </div>
             <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="destructive" className="w-full justify-between" onClick={resetSale}>
                    <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4"/>
                        {t.pos.newSale}
                    </span>
                    <kbd className="hidden rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">Esc</kbd>
                </Button>
                <Button className="w-full col-span-1 bg-accent hover:bg-accent/90 justify-between" onClick={handleSaleCompletion}>
                    <span>{t.pos.completeSale}</span>
                    <kbd className="hidden rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">F10</kbd>
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
