'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
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
  const { products, customers, addSaleRecord } = useData();
  const { settings } = useSettings();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [sessions, setSessions] = useState<SaleSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
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
  }, [activeSession, t.pos.sale, customers]);


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
  }, [activeSession]);

  const updateQuantity = (productId: string, quantity: number) => {
    if (!activeSession) return;
    let newCart: CartItem[];
    const maxQuantity = 999999999999;
    
    let newQuantity = quantity;
    if (newQuantity > maxQuantity) {
        newQuantity = maxQuantity;
    }

    if (newQuantity <= 0) {
      newCart = activeSession.cart.filter((item) => item.id !== productId);
    } else {
      newCart = activeSession.cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    }
    updateActiveSession({ cart: newCart });
  };
  
  const resetSale = () => {
    if (!activeSessionId) return;
      updateActiveSession({
          cart: [],
          selectedCustomerId: null,
          amountPaid: 0,
          discount: 0,
      });
  }
  
  const addNewSession = () => {
    const newSession = createNewSession(sessions.length + 1);
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };
  
  const closeSession = (sessionId: string) => {
      if (!activeSessionId) return;
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
  };

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
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal - discount;
    return { subtotal, total };
  }, [activeSession]);

  const balance = total > 0 ? total - (activeSession?.amountPaid || 0) : 0;

  const handleSaleCompletion = () => {
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
  }, [addToCart, t, toast, products]);
  
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
  
  const selectedCustomer = customers.find(c => c.id === activeSession?.selectedCustomerId);

  if (!activeSessionId || !activeSession) {
    return null;
  }

  return (
    <div className="grid h-[calc(100vh-5rem)] grid-cols-1 gap-4 lg:grid-cols-3">
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
                          {settings.currency}{product.price.toFixed(2)}
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
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => {
                                        const newQuantity = parseFloat(e.target.value);
                                        if (!isNaN(newQuantity)) {
                                            updateQuantity(item.id, newQuantity);
                                        } else if (e.target.value === '') {
                                            updateQuantity(item.id, 0);
                                        }
                                    }}
                                    className="h-8 text-center w-full px-1"
                                    step="0.01"
                                    min="0"
                                    max="999999999999"
                                />
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                    <PlusCircle className="h-4 w-4"/>
                                </Button>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {settings.currency}{(item.price * item.quantity).toFixed(2)}
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
                    <span>{t.pos.discount}</span>
                    <Input type="number" value={activeSession.discount} onChange={(e) => updateActiveSession({ discount: Math.max(0, Number(e.target.value))})} className="h-8 w-24 text-right" />
                </div>
                <Separator/>
                <div className="flex justify-between font-bold text-lg"><span>{t.pos.grandTotal}</span><span>{settings.currency}{total.toFixed(2)}</span></div>
            </div>
            <Separator className="my-4" />
             <div className="space-y-4">
                <CustomerCombobox
                  customers={customers}
                  selectedCustomerId={activeSession.selectedCustomerId}
                  onSelectCustomer={(customerId) =>
                    updateActiveSession({ selectedCustomerId: customerId })
                  }
                />
                <Input type="number" placeholder={t.pos.amountPaid} value={activeSession.amountPaid || ''} onChange={(e) => updateActiveSession({ amountPaid: Number(e.target.value)})} />
                <div className="flex justify-between text-sm font-medium text-destructive"><span>{t.pos.balance}</span><span>{settings.currency}{balance.toFixed(2)}</span></div>
             </div>
             <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsInvoiceOpen(true)} disabled={activeSession.cart.length === 0}><FileText className="mr-2 h-4 w-4" />{t.pos.invoice}</Button>
                <Button variant="outline" onClick={() => window.print()} disabled={activeSession.cart.length === 0}><Printer className="mr-2 h-4 w-4" />{t.pos.printInvoice}</Button>
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
        cart={activeSession.cart}
        customer={selectedCustomer}
        totals={{ subtotal, discount: activeSession.discount, total, amountPaid: activeSession.amountPaid, balance }}
      />}
      <ConfirmDialog
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => closeSession(sessionToDelete!)}
        title={t.pos.confirmCloseSaleTitle}
        description={t.pos.confirmCloseSaleMessage}
      />
    </div>
  );
}
