
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
import type { Product, Customer, CartItem, SaleRecord } from '@/contexts/data-context';
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
  LayoutGrid,
  List,
  LoaderCircle,
  Box,
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
import { AddCustomerDialog } from './add-customer-dialog';
import { calculateItemTotal, cn } from '@/lib/utils';
import Loading from '@/app/loading';
import { PosProductCard } from './pos-product-card';
import { BarcodeScannerDialog } from './barcode-scanner-dialog';

interface SaleSession {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomerId: string | null;
  amountPaid: number;
  discount: number;
}

const SESSIONS_STORAGE_KEY = 'frucio-pos-sessions';
const POS_VIEW_MODE_KEY = 'frucio-pos-view-mode';

export function PosView() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, customers, addSaleRecord, addProduct, isLoading, addCustomer } = useData();
  const { settings } = useSettings();
  
  const [sessions, setSessions] = useState<SaleSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [cartQuantities, setCartQuantities] = useState<{ [key: string]: string }>({});

  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCompletingSale, setIsCompletingSale] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const customerComboboxRef = useRef<HTMLButtonElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const amountPaidInputRef = useRef<HTMLInputElement | null>(null);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cartEndRef = useRef<HTMLTableRowElement | null>(null);
  
  useEffect(() => {
    const savedViewMode = localStorage.getItem(POS_VIEW_MODE_KEY) as 'grid' | 'list' | null;
    if (savedViewMode) {
        setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
      localStorage.setItem(POS_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const createNewSession = useCallback((currentSessions: SaleSession[]): SaleSession => {
    const saleNumbers = currentSessions
      .map(s => {
        const saleName = t.pos.sale.replace(/ /g, '\\s'); 
        const regex = new RegExp(`^${saleName}\\s(\\d+)$`, 'i');
        const match = s.name.match(regex);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
  
    const nextNumber = saleNumbers.length > 0 ? Math.max(...saleNumbers) + 1 : currentSessions.length + 1;
  
    return {
      id: `session-${new Date().getTime()}-${nextNumber}`,
      name: `${t.pos.sale} ${nextNumber}`,
      cart: [],
      selectedCustomerId: null,
      amountPaid: 0,
      discount: 0,
    };
  }, [t.pos.sale]);

  // This effect runs ONCE on mount to load sessions from localStorage or create a new one.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSessionsRaw = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (savedSessionsRaw) {
          const savedData = JSON.parse(savedSessionsRaw);
          // Basic validation
          if (Array.isArray(savedData.sessions) && savedData.sessions.length > 0 && typeof savedData.activeSessionId === 'string') {
            setSessions(savedData.sessions);
            setActiveSessionId(savedData.activeSessionId);
            return; // Exit after successful load
          }
        }
      } catch (error) {
        console.error("Failed to load sessions from localStorage", error);
        localStorage.removeItem(SESSIONS_STORAGE_KEY); // Clear corrupted data
      }
    }
    
    // If no saved data, or if loading failed, create a new initial session.
    const initialSession = createNewSession([]);
    setSessions([initialSession]);
    setActiveSessionId(initialSession.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewSession]);

  // This effect runs whenever sessions or the active session ID changes, to save the state.
  useEffect(() => {
    // Don't save on the initial empty state before hydration.
    if (typeof window !== 'undefined' && sessions.length > 0) {
        try {
            const dataToSave = {
                sessions,
                activeSessionId,
            };
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
            console.error("Failed to save sessions to localStorage", error);
        }
    }
  }, [sessions, activeSessionId]);


  // Synchronize cart data with the master product list from context
  useEffect(() => {
    if (sessions.length === 0 || products.length === 0) {
      return;
    }
  
    setSessions(currentSessions => {
      let hasOverallChanges = false;
  
      const newSyncedSessions = currentSessions.map(session => {
        const quantityAdjustments: { productName: string; oldQty: number; newQty: number }[] = [];
        const deletedProductNames: string[] = [];
  
        // Create a fresh cart based on the latest product data
        const newCart = session.cart
          .map(cartItem => {
            const productFromDb = products.find(p => p.id === cartItem.id);
  
            // Handle deleted product
            if (!productFromDb) {
              deletedProductNames.push(cartItem.name);
              return null;
            }
  
            // Handle stock adjustment
            const newQuantity = Math.min(cartItem.quantity, productFromDb.stock);
            if (newQuantity < cartItem.quantity) {
              quantityAdjustments.push({
                productName: productFromDb.name,
                oldQty: cartItem.quantity,
                newQty: newQuantity,
              });
            }
  
            // Construct the updated cart item, preserving the locked-in price and adjusted quantity.
            return {
              ...productFromDb,      // All latest data from the DB
              price: cartItem.price, // The price at the time of adding to cart is locked.
              quantity: newQuantity, // The current quantity in cart, adjusted for stock.
            };
          })
          .filter((item): item is CartItem => item !== null);
  
        // Determine if there were any significant changes that require user notification
        const hasDeletions = deletedProductNames.length > 0;
        const hasAdjustments = quantityAdjustments.length > 0;
        const hasSignificantChanges = hasDeletions || hasAdjustments;
  
        // Even if no notifications, the cart data might have changed (e.g., category update)
        const hasAnyChange = JSON.stringify(session.cart) !== JSON.stringify(newCart);

        if (hasAnyChange) {
            hasOverallChanges = true;

            if (hasSignificantChanges) {
                // Show toasts for the critical changes
                quantityAdjustments.forEach(adj => {
                    toast({
                        variant: 'destructive',
                        title: t.pos.stockAdjustedTitle,
                        description: t.pos.stockAdjustedMessage
                            .replace('{productName}', adj.productName)
                            .replace('{newQty}', String(adj.newQty)),
                    });
                });
                deletedProductNames.forEach(name => {
                    toast({
                        variant: 'destructive',
                        title: t.pos.productRemovedTitle,
                        description: t.pos.productRemovedMessage
                            .replace('{productName}', name),
                    });
                });
            }

            return { ...session, cart: newCart };
        }
  
        // If no changes at all, return the original session object to avoid re-renders.
        return session;
      });
  
      // Only update the state if there were any changes across any session.
      if (hasOverallChanges) {
        return newSyncedSessions;
      }
  
      return currentSessions;
    });
  }, [products, t.pos.stockAdjustedMessage, t.pos.stockAdjustedTitle, t.pos.productRemovedMessage, t.pos.productRemovedTitle, toast]);

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
    
    const productDetails = products.find(p => p.id === productId);
    if (!productDetails) return;

    let finalQuantity = Math.max(0, newQuantity);
    
    if (finalQuantity > productDetails.stock) {
        finalQuantity = productDetails.stock;
        toast({
            variant: 'destructive',
            title: t.errors.title,
            description: t.errors.quantityExceedsStock
                .replace('{productName}', productDetails.name)
                .replace('{stock}', String(productDetails.stock)),
        });
    }

    const newCart = activeSession.cart.map(item => 
        item.id === productId ? { ...item, quantity: finalQuantity } : item
    ).filter(item => item.quantity > 0);
    
    updateActiveSession({ cart: newCart });
  }, [activeSession, updateActiveSession, products, t, toast]);
  
  const handleQuantityInputChange = (productId: string, value: string) => {
    setCartQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const handleQuantityInputBlur = (productId: string) => {
      const value = cartQuantities[productId] || '';
      const newQuantity = parseFloat(value);
      
      const item = activeSession?.cart.find(i => i.id === productId);

      if (isNaN(newQuantity) && item) {
          setCartQuantities(prev => ({ ...prev, [productId]: String(item.quantity) }));
      } else {
          handleQuantityChange(productId, newQuantity);
      }
  };

  const handleQuantityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    const cart = activeSession?.cart;
    if (!cart) return;

    const commitChange = () => {
        const item = cart[currentIndex];
        if (item) handleQuantityInputBlur(item.id);
    };

    if (event.key === 'Enter' || event.key === 'ArrowDown') {
        event.preventDefault();
        commitChange();
        const nextIndex = currentIndex + 1;
        if (nextIndex < cart.length) {
            quantityInputRefs.current[nextIndex]?.focus();
            quantityInputRefs.current[nextIndex]?.select();
        } else {
            discountInputRef.current?.focus();
            discountInputRef.current?.select();
        }
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        commitChange();
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            quantityInputRefs.current[prevIndex]?.focus();
            quantityInputRefs.current[prevIndex]?.select();
        } else {
            barcodeInputRef.current?.focus();
            barcodeInputRef.current?.select();
        }
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
  
  const removeFromCart = useCallback((productId: string) => {
    if (!activeSession) return;
    const newCart = activeSession.cart.filter(item => item.id !== productId);
    updateActiveSession({ cart: newCart });
  }, [activeSession, updateActiveSession]);


  useEffect(() => {
    if (activeSession) {
        const newQuantities: { [key: string]: string } = {};
        activeSession.cart.forEach(item => {
            newQuantities[item.id] = String(item.quantity);
        });
        setCartQuantities(newQuantities);
        quantityInputRefs.current = quantityInputRefs.current.slice(0, activeSession.cart.length);
    }
  }, [activeSession]);

  useEffect(() => {
    // A small delay allows the DOM to update before we try to scroll
    if (activeSession && activeSession.cart.length > 0) {
        setTimeout(() => {
            cartEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 0);
    }
  }, [activeSession?.cart.length]);


  const addToCart = useCallback((product: Product, quantityToAdd: number = 1) => {
    if (!activeSession) return;

    if (product.stock <= 0) {
       toast({
         variant: 'destructive',
         title: t.errors.title,
         description: t.errors.outOfStock.replace('{productName}', product.name),
       });
       return;
    }

    const existingItem = activeSession.cart.find(item => item.id === product.id);
    const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

    if (currentQuantityInCart + quantityToAdd > product.stock) {
        toast({
            variant: 'destructive',
            title: t.errors.title,
            description: t.errors.quantityExceedsStock
                .replace('{productName}', product.name)
                .replace('{stock}', String(product.stock)),
        });
        return;
    }
    
    const newCart = [...activeSession.cart];
    const existingItemIndex = newCart.findIndex((item) => item.id === product.id);
    
    if (existingItemIndex > -1) {
        newCart[existingItemIndex].quantity += quantityToAdd;
    } else {
        newCart.push({ ...product, quantity: quantityToAdd });
    }
    updateActiveSession({ cart: newCart });
  }, [activeSession, updateActiveSession, t, toast]);
  
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
    const newSession = createNewSession(sessions);
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };
  
  const closeSession = useCallback((sessionId: string) => {
      setSessions(prevSessions => {
          const updatedSessions = prevSessions.filter(s => s.id !== sessionId);

          if (updatedSessions.length === 0) {
              const newSession = createNewSession(updatedSessions);
              setActiveSessionId(newSession.id);
              return [newSession];
          } else {
              if (activeSessionId === sessionId) {
                  setActiveSessionId(updatedSessions[0].id);
              }
              return updatedSessions;
          }
      });
      setSessionToDelete(null);
  }, [activeSessionId, createNewSession]);

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
    
    const subtotalValue = cart.reduce((sum, item) => {
      return sum + calculateItemTotal(item);
    }, 0);

    const roundedSubtotal = parseFloat(subtotalValue.toFixed(2));
    const totalValue = Math.max(0, roundedSubtotal - discount);
    const roundedTotal = parseFloat(totalValue.toFixed(2));

    return { subtotal: roundedSubtotal, total: roundedTotal };
  }, [activeSession?.cart, activeSession?.discount]);

  const balance = total > 0 ? parseFloat((total - (activeSession?.amountPaid || 0)).toFixed(2)) : 0;

  const handleSaleCompletion = useCallback(async () => {
    if (isCompletingSale || !activeSession || activeSession.cart.length === 0 || !activeSessionId) {
      if (!isCompletingSale && (!activeSession || activeSession.cart.length === 0)) {
        toast({
          variant: "destructive",
          title: t.errors.title,
          description: t.errors.emptyCart,
        });
      }
      return;
    }

    setIsCompletingSale(true);
    const totals = { subtotal, discount: activeSession.discount, total, amountPaid: activeSession.amountPaid, balance };
    
    try {
      await addSaleRecord(activeSession.cart, activeSession.selectedCustomerId, totals);

      toast({
        title: t.pos.saleSuccessTitle,
        description: t.pos.saleSuccessMessage,
      });
      
      closeSession(activeSessionId);
    } catch (error) {
        console.error("Sale completion failed:", error);
        toast({
            variant: "destructive",
            title: t.errors.title,
            description: error instanceof Error ? error.message : t.errors.unknownError,
        });
    } finally {
        setIsCompletingSale(false);
    }
  }, [activeSession, activeSessionId, addSaleRecord, balance, subtotal, total, t, toast, closeSession, isCompletingSale]);

  const handleScanSuccess = useCallback((barcode: string) => {
    const product = products.find(p => p && p.barcodes.includes(barcode));
    if (product) {
        addToCart(product, 1);
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
  }, [addToCart, products, t, toast]);
  
  const handleBarcodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && barcodeInput.trim()) {
      event.preventDefault();
      handleScanSuccess(barcodeInput.trim());
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'>, productId?: string) => {
    if (productId) return; 
    
    try {
        const newProduct = await addProduct(productData);

        toast({ title: t.products.productAdded });
        
        addToCart(newProduct, 1);
        setIsAddProductDialogOpen(false);
    } catch (error) {
        // Let the dialog handle the error state
        throw error;
    }
  };
  
  const handleSaveNewCustomer = async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
    try {
      const newCustomer = await addCustomer(customerData);
      toast({ title: t.customers.customerAdded });
      updateActiveSession({ selectedCustomerId: newCustomer.id });
      setIsAddCustomerDialogOpen(false);
    } catch (error) {
      console.error("Failed to add new customer from POS:", error);
      throw error; 
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInvoiceOpen || !!sessionToDelete || isAddProductDialogOpen || isAddCustomerDialogOpen) return;
      
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
      if (event.key === 'F10') {
        event.preventDefault();
        if (activeSession && activeSession.cart.length > 0) {
          handleSaleCompletion();
        }
      }

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
  }, [isInvoiceOpen, sessionToDelete, isAddProductDialogOpen, isAddCustomerDialogOpen, resetSale, activeSession, handleSaleCompletion]);


  const categories = useMemo(() => ['all', ...Array.from(new Set(products.filter(p => !!p).map((p) => p.category)))], [products]);
  
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return products
      .filter(p => !!p)
      .filter(
        (p) => {
          const categoryFilter = selectedCategory === 'all' || p.category === selectedCategory;
          if (!categoryFilter) return false;

          if (!lowerCaseSearchTerm) return true;

          const nameMatch = p.name.toLowerCase().includes(lowerCaseSearchTerm);
          const categoryMatch = p.category.toLowerCase().includes(lowerCaseSearchTerm);
          const barcodeMatch = (p.barcodes || []).some(b => b.toLowerCase().includes(lowerCaseSearchTerm));
          
          return nameMatch || categoryMatch || barcodeMatch;
        }
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedCategory, searchTerm]);
  
  const selectedCustomer = useMemo(() => customers.find(c => c && c.id === activeSession?.selectedCustomerId), [customers, activeSession?.selectedCustomerId]);

  if (isLoading || !sessions.length) return <Loading />;
  if (!activeSessionId || !activeSession) return <Loading />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:h-[calc(100vh-6rem)]">
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        ref={searchInputRef}
                        placeholder={`${t.pos.searchProducts} (F1)`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-10 rtl:pr-10 rtl:pl-10"
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rtl:right-auto rtl:left-2"
                          onClick={() => setSearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full md:w-auto md:min-w-[200px]">
                      <SelectValue placeholder={t.pos.allCategories} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.pos.allCategories}</SelectItem>
                      {categories.filter(c => c !== 'all').map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-grow flex items-center gap-2">
                    <div className="relative flex-grow">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        ref={barcodeInputRef}
                        placeholder={`${t.pos.scanBarcode} (F2)`}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeKeyDown}
                        className="pl-10 rtl:pr-10 rtl:pl-2"
                      />
                    </div>
                     <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                       <Barcode className="h-5 w-5" />
                     </Button>
                  </div>
                  
                  <div className="flex items-center rounded-md bg-muted p-1">
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-background shadow-sm' : ''}`}
                        title={t.pos.gridView}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className={`h-8 w-8 ${viewMode === 'list' ? 'bg-background shadow-sm' : ''}`}
                        title={t.pos.listView}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-[55vh] lg:h-full">
              {filteredProducts.length > 0 ? (
                viewMode === 'grid' ? (
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
                ) : (
                  <div className="pr-4">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>{t.products.name}</TableHead>
                                  <TableHead>{t.products.category}</TableHead>
                                  <TableHead className="text-right">{t.products.price}</TableHead>
                                  <TableHead className="text-right">{t.products.stock}</TableHead>
                                  <TableHead className="text-right">{t.products.actions}</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {filteredProducts.map((product) => {
                                  const isOutOfStock = product.stock <= 0;
                                  const canSellByBox = product.quantityPerBox && product.quantityPerBox > 0 && product.boxPrice && product.boxPrice > 0;
                                  return (
                                  <TableRow key={product.id} className={cn(isOutOfStock && "opacity-60")}>
                                      <TableCell className="font-medium">{product.name}</TableCell>
                                      <TableCell>{product.category}</TableCell>
                                      <TableCell className="text-right">{settings.currency}{product.price.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">{product.stock}</TableCell>
                                      <TableCell className="text-right">
                                          <div className="flex justify-end items-center gap-2">
                                              {canSellByBox && (
                                                  <Button
                                                      size="icon"
                                                      variant="outline"
                                                      onClick={() => addToCart(product, product.quantityPerBox!)}
                                                      disabled={isOutOfStock || product.stock < product.quantityPerBox!}
                                                      title={`${t.pos.addBox} (${product.quantityPerBox})`}
                                                  >
                                                      <Box className="h-4 w-4" />
                                                  </Button>
                                              )}
                                              <Button
                                                  size="sm"
                                                  onClick={() => addToCart(product, 1)}
                                                  disabled={isOutOfStock}
                                                  variant="outline"
                                              >
                                                  <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                                                  {t.pos.addToCart}
                                              </Button>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                                  )
                              })}
                          </TableBody>
                      </Table>
                  </div>
                )
              ) : (
                  <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                    <Search className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-semibold text-lg">{t.pos.noProductsFound}</p>
                    <p className="text-sm">{t.pos.tryDifferentKeywords}</p>
                    {searchTerm && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            setNewProductName(searchTerm);
                            setIsAddProductDialogOpen(true);
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                          {t.pos.addProductButton.replace('{productName}', searchTerm)}
                        </Button>
                    )}
                  </div>
                )}
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
                            <TabsTrigger key={session.id} value={session.id} className="relative pr-8 rtl:pl-8 rtl:pr-2">
                                {session.name}
                                {sessions.length > 1 && (
                                    <button onClick={(e) => {e.stopPropagation(); handleCloseSession(session.id)}} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted-foreground/20 cursor-pointer rtl:right-auto rtl:left-1">
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
          <CardContent className="flex-grow flex flex-col">
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
                        {t.pos.quantity}
                        <kbd className="ml-2 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F7</kbd>
                      </TableHead>
                      <TableHead className="text-right">{t.pos.total}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSession.cart.map((item, index) => {
                      const isLastItem = index === activeSession.cart.length - 1;
                      return (
                      <TableRow key={item.id} ref={isLastItem ? cartEndRef : null}>
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
                                    onKeyDown={(e) => handleQuantityKeyDown(e, index)}
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
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
            <div className="mt-auto">
                <div className="flex justify-between items-center rounded-lg bg-primary/10 p-3 mt-4 font-bold text-primary text-3xl">
                <span>{t.pos.grandTotal}</span>
                <span>{settings.currency}{total.toFixed(2)}</span>
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4 pt-4">
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t.pos.subtotal}</span><span>{settings.currency}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                    <span>{t.pos.discount}</span>
                    <kbd className="rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">F8</kbd>
                    </div>
                    <Input 
                    ref={discountInputRef} 
                    type="number" 
                    value={activeSession.discount || ''} 
                    onChange={(e) => { const val = parseFloat(e.target.value); updateActiveSession({ discount: Math.max(0, isNaN(val) ? 0 : val)})}} 
                    className="h-8 w-24 text-right" 
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const lastCartItemIndex = (activeSession?.cart?.length || 0) - 1;
                            if (lastCartItemIndex >= 0) {
                                quantityInputRefs.current[lastCartItemIndex]?.focus();
                                quantityInputRefs.current[lastCartItemIndex]?.select();
                            }
                        } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            amountPaidInputRef.current?.focus();
                            amountPaidInputRef.current?.select();
                        }
                    }}
                    />
                </div>
                </div>
              <Separator/>
              <div className='z-10 relative'>
                <CustomerCombobox
                  ref={customerComboboxRef}
                  customers={customers}
                  selectedCustomerId={activeSession.selectedCustomerId}
                  onSelectCustomer={(customerId) =>
                    updateActiveSession({ selectedCustomerId: customerId })
                  }
                  onAddNewCustomer={() => setIsAddCustomerDialogOpen(true)}
                />
              </div>
              <div className="relative">
                <Input 
                  ref={amountPaidInputRef} 
                  type="number" 
                  placeholder={t.pos.amountPaid} 
                  value={activeSession.amountPaid || ''} 
                  onChange={(e) => { const val = parseFloat(e.target.value); updateActiveSession({ amountPaid: Math.max(0, isNaN(val) ? 0 : val)})}} 
                  className="pr-9 rtl:pl-9 rtl:pr-2"
                  onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          discountInputRef.current?.focus();
                          discountInputRef.current?.select();
                      }
                  }}
                />
                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground rtl:right-auto rtl:left-2">F9</kbd>
              </div>
              <div className="flex justify-between text-sm font-medium text-destructive"><span>{t.pos.balance}</span><span>{settings.currency}{balance.toFixed(2)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setIsInvoiceOpen(true)} disabled={activeSession.cart.length === 0}>
                <FileText className="h-4 w-4"/>
                {t.pos.invoice}
              </Button>
              <Button variant="destructive" onClick={resetSale}>
                <XCircle className="h-4 w-4"/>
                <span>{t.pos.newSale}</span>
                <kbd className="rounded bg-background/20 text-destructive-foreground px-1.5 font-mono text-[10px] font-medium">F6</kbd>
              </Button>
            </div>
            <div className="mt-2">
              <Button variant="accent" className="w-full h-12 text-lg" onClick={handleSaleCompletion} disabled={!activeSession || activeSession.cart.length === 0 || isCompletingSale}>
                {isCompletingSale ? (
                  <>
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    {t.settings.saving.replace('...', '')}...
                  </>
                ) : (
                  <>
                    <span>{t.pos.completeSale}</span>
                    <kbd className="rounded bg-background/20 text-accent-foreground px-1.5 font-mono text-[10px] font-medium">F10</kbd>
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
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
        confirmText={t.pos.closeButton}
        confirmVariant="destructive"
      />
      <AddProductDialog
        isOpen={isAddProductDialogOpen}
        onClose={() => {
          setIsAddProductDialogOpen(false);
          setNewProductBarcode('');
          setNewProductName('');
        }}
        onSave={handleSaveProduct}
        productToEdit={null}
        initialBarcode={newProductBarcode}
        initialName={newProductName}
        products={products}
      />
      <AddCustomerDialog
        isOpen={isAddCustomerDialogOpen}
        onClose={() => setIsAddCustomerDialogOpen(false)}
        onSave={handleSaveNewCustomer}
        customerToEdit={null}
        customers={customers}
      />
       <BarcodeScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(barcode) => {
          handleScanSuccess(barcode);
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
}
