
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
    type Product,
    type Customer,
    type SaleRecord,
    type CartItem,
    type BakeryOrder,
    type Supplier,
    type SupplierInvoice,
    type SupplierInvoiceItem,
    type Expense,
} from '@/lib/data';
import {
    getProducts,
    getCustomers,
    getSalesHistory,
    getBakeryOrders,
    getSuppliers,
    getSupplierInvoices,
    getExpenses,
    restoreBackupData,
    addProductInDB,
    updateProductInDB,
    deleteProductInDB,
    addCustomerInDB,
    updateCustomerInDB,
    deleteCustomerInDB,
    processSale,
    processPayment,
    addBakeryOrderInDB,
    updateBakeryOrderInDB,
    deleteBakeryOrderInDB,
    saveBakeryOrders,
    addSupplierInDB,
    updateSupplierInDB,
    deleteSupplierInDB,
    processSupplierInvoice,
    processSupplierPayment,
    setAsRecurringTemplateInDB,
    deleteRecurringPatternInDB,
    addExpenseInDB,
    updateExpenseInDB,
    deleteExpenseInDB,
} from '@/lib/data-actions';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-context';
import { calculateUpdatedProductsForInvoice } from '@/lib/utils';

interface DataContextType {
    products: Product[];
    customers: Customer[];
    salesHistory: SaleRecord[];
    bakeryOrders: BakeryOrder[];
    suppliers: Supplier[];
    supplierInvoices: SupplierInvoice[];
    expenses: Expense[];
    isLoading: boolean;
    addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
    updateProduct: (productId: string, productData: Partial<Omit<Product, 'id'>>) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => Promise<Customer>;
    updateCustomer: (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => Promise<void>;
    makePayment: (customerId: string, amount: number) => Promise<void>;
    restoreData: (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[]; bakeryOrders: BakeryOrder[]; suppliers: Supplier[]; supplierInvoices: SupplierInvoice[]; expenses: Expense[]; }) => Promise<void>;
    addBakeryOrder: (orderData: Omit<BakeryOrder, 'id'>) => Promise<void>;
    updateBakeryOrder: (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => Promise<void>;
    deleteBakeryOrder: (orderId: string) => Promise<void>;
    deleteRecurringPattern: (orderName: string) => Promise<void>;
    setBakeryOrders: (orders: BakeryOrder[]) => Promise<void>;
    setAsRecurringTemplate: (templateId: string, isRecurring: boolean) => Promise<void>;
    addSupplier: (supplierData: Omit<Supplier, 'id' | 'balance'>) => Promise<void>;
    updateSupplier: (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addSupplierInvoice: (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string }) => Promise<void>;
    makePaymentToSupplier: (supplierId: string, amount: number) => Promise<void>;
    addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (expenseId: string, expenseData: Partial<Omit<Expense, 'id'>>) => Promise<void>;
    deleteExpense: (expenseId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
    const [bakeryOrders, setBakeryOrdersState] = useState<BakeryOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Refs to hold current state for stable callbacks, preventing unnecessary re-renders.
    const productsRef = useRef(products);
    useEffect(() => { productsRef.current = products; }, [products]);
    const customersRef = useRef(customers);
    useEffect(() => { customersRef.current = customers; }, [customers]);
    const salesHistoryRef = useRef(salesHistory);
    useEffect(() => { salesHistoryRef.current = salesHistory; }, [salesHistory]);
    const bakeryOrdersRef = useRef(bakeryOrders);
    useEffect(() => { bakeryOrdersRef.current = bakeryOrders; }, [bakeryOrders]);
    const suppliersRef = useRef(suppliers);
    useEffect(() => { suppliersRef.current = suppliers; }, [suppliers]);
    const supplierInvoicesRef = useRef(supplierInvoices);
    useEffect(() => { supplierInvoicesRef.current = supplierInvoices; }, [supplierInvoices]);
    const expensesRef = useRef(expenses);
    useEffect(() => { expensesRef.current = expenses; }, [expenses]);


    const syncData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [loadedProducts, loadedCustomers, loadedSalesHistory, loadedBakeryOrders, loadedSuppliers, loadedSupplierInvoices, loadedExpenses] = await Promise.all([
                getProducts(),
                getCustomers(),
                getSalesHistory(),
                getBakeryOrders(),
                getSuppliers(),
                getSupplierInvoices(),
                getExpenses(),
            ]);
            setProducts(loadedProducts);
            setCustomers(loadedCustomers);
            setSalesHistory(loadedSalesHistory);
            setBakeryOrdersState(loadedBakeryOrders);
            setSuppliers(loadedSuppliers);
            setSupplierInvoices(loadedSupplierInvoices);
            setExpenses(loadedExpenses);
        } catch (error) {
            console.error("Failed to sync data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        syncData();
    }, [syncData]);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'>): Promise<Product> => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
        };
        
        const previousProducts = productsRef.current;
        setProducts(current => [...current, newProduct]);
        try {
            await addProductInDB(newProduct);
            return newProduct;
        } catch (e) {
            setProducts(previousProducts);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to save product.'});
            throw e;
        }
    }, [t, toast]);

    const updateProduct = useCallback(async (productId: string, productData: Partial<Omit<Product, 'id'>>) => {
        const previousProducts = productsRef.current;
        setProducts(current => current.map(p => p.id === productId ? { ...p, ...productData, id: productId } : p));
        try {
            await updateProductInDB(productId, productData);
        } catch (e) {
            setProducts(previousProducts);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update product.'});
            throw e;
        }
    }, [t, toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        if (salesHistoryRef.current.some(sale => sale.items.some(item => item.id === productId)) || supplierInvoicesRef.current.some(invoice => invoice.items.some(item => item.productId === productId))) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.products.deleteErrorInUse });
            return;
        }

        const previousProducts = productsRef.current;
        setProducts(current => current.filter(p => p.id !== productId));
        try {
            await deleteProductInDB(productId);
            toast({ title: t.products.productDeleted });
        } catch (e) {
            setProducts(previousProducts);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete product.'});
        }
    }, [t, toast]);
    
    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>): Promise<Customer> => {
        const newCustomer: Customer = {
            id: `cust-${new Date().getTime()}`,
            spent: 0,
            balance: 0,
            ...customerData,
        };
        
        const previousCustomers = customersRef.current;
        setCustomers(current => [...current, newCustomer]);
        try {
            await addCustomerInDB(newCustomer);
            return newCustomer;
        } catch (e) {
            setCustomers(previousCustomers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add customer.'});
            throw e;
        }
    }, [t, toast]);
    
    const updateCustomer = useCallback(async (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => {
        const previousCustomers = customersRef.current;
        setCustomers(current => current.map(c => c.id === customerId ? { ...c, ...customerData, id: customerId } : c));
        try {
            await updateCustomerInDB(customerId, customerData);
        } catch (e) {
            setCustomers(previousCustomers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update customer.'});
            throw e;
        }
    }, [t, toast]);

    const deleteCustomer = useCallback(async (customerId: string) => {
        if (salesHistoryRef.current.some(sale => sale.customerId === customerId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.customers.deleteErrorInUse });
            return;
        }

        const previousCustomers = customersRef.current;
        setCustomers(current => current.filter(c => c.id !== customerId));
        try {
            await deleteCustomerInDB(customerId);
            toast({ title: t.customers.customerDeleted });
        } catch (e) {
            setCustomers(previousCustomers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete customer.'});
        }
    }, [t, toast]);
    
    const addSaleRecord = useCallback(async (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        const newSale: SaleRecord = { id: `SALE-${new Date().getTime()}`, customerId, items: cart, totals, date: new Date().toISOString() };

        const previousStates = { products: productsRef.current, customers: customersRef.current, salesHistory: salesHistoryRef.current };
        
        setProducts(current => current.map(p => {
            const itemInCart = cart.find(item => item.id === p.id);
            return itemInCart ? { ...p, stock: p.stock - itemInCart.quantity } : p;
        }));
        if (customerId) {
            setCustomers(current => current.map(c => c.id === customerId ? { ...c, spent: c.spent + totals.total, balance: c.balance + totals.balance } : c));
        }
        setSalesHistory(current => [...current, newSale]);

        try {
            await processSale({ saleRecord: newSale, cart });
        } catch (error) {
            setProducts(previousStates.products);
            setCustomers(previousStates.customers);
            setSalesHistory(previousStates.salesHistory);
            console.error("Sale completion failed:", error);
            throw error;
        }
    }, []);
    
    const makePayment = useCallback(async (customerId: string, amount: number) => {
        const paymentRecord: SaleRecord = { id: `PAY-${new Date().getTime()}`, customerId, items: [], totals: { subtotal: 0, discount: 0, total: amount, amountPaid: amount, balance: -amount }, date: new Date().toISOString() };

        const previousStates = { customers: customersRef.current, salesHistory: salesHistoryRef.current };

        setCustomers(current => current.map(c => c.id === customerId ? { ...c, balance: c.balance - amount } : c));
        setSalesHistory(current => [...current, paymentRecord]);

        try {
            await processPayment({ customerId, amount, paymentRecord });
        } catch (error) {
            setCustomers(previousStates.customers);
            setSalesHistory(previousStates.salesHistory);
            console.error("Failed to process payment:", error);
            toast({ variant: 'destructive', title: "Save Error", description: "Could not save payment data." });
        }
    }, [toast]);

    const addBakeryOrder = useCallback(async (orderData: Omit<BakeryOrder, 'id'>) => {
        const newOrder: BakeryOrder = { id: `b-order-${new Date().getTime()}`, ...orderData };
        const previousOrders = bakeryOrdersRef.current;
        setBakeryOrdersState(current => [...current, newOrder]);
        try {
            await addBakeryOrderInDB(newOrder);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add bakery order.'});
            throw e;
        }
    }, [t, toast]);

    const updateBakeryOrder = useCallback(async (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => {
        const previousOrders = bakeryOrdersRef.current;
        setBakeryOrdersState(current => current.map(o => o.id === orderId ? { ...o, ...orderData, id: orderId } : o));
        try {
            await updateBakeryOrderInDB(orderId, orderData);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update bakery order.'});
            throw e;
        }
    }, [t, toast]);
    
    const deleteBakeryOrder = useCallback(async (orderId: string) => {
        const previousOrders = bakeryOrdersRef.current;
        setBakeryOrdersState(current => current.filter(o => o.id !== orderId));
        try {
            await deleteBakeryOrderInDB(orderId);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete bakery order.'});
            throw e;
        }
    }, [t, toast]);

    const deleteRecurringPattern = useCallback(async (orderName: string) => {
        const previousOrders = bakeryOrdersRef.current;
        setBakeryOrdersState(current => current.filter(o => !(o.name === orderName && o.isRecurring)));
        try {
            await deleteRecurringPatternInDB(orderName);
            toast({ title: t.bakeryOrders.patternDeleted });
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete recurring order pattern.' });
        }
    }, [t, toast]);

    const setBakeryOrders = useCallback(async (orders: BakeryOrder[]) => {
       const previousOrders = bakeryOrdersRef.current;
       setBakeryOrdersState(orders);
       try {
           await saveBakeryOrders(orders);
       } catch (e) {
           setBakeryOrdersState(previousOrders);
           toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to save bakery orders.'});
           throw e;
       }
    }, [t, toast]);

    const setAsRecurringTemplate = useCallback(async (templateId: string, isRecurring: boolean) => {
        const previousOrders = bakeryOrdersRef.current;
        setBakeryOrdersState(current => {
            const templateOrder = current.find(o => o.id === templateId);
            if (!templateOrder) return current;
    
            if (isRecurring) {
                return current.map(o => {
                    if (o.name === templateOrder.name) {
                        return { ...o, isRecurring: o.id === templateId };
                    }
                    return o;
                });
            } else {
                return current.map(o => (o.id === templateId ? { ...o, isRecurring: false } : o));
            }
        });
    
        try {
            await setAsRecurringTemplateInDB(templateId, isRecurring);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update recurring status.'});
            throw e;
        }
    }, [t, toast]);

    const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
        const newSupplier: Supplier = { id: `supp-${new Date().getTime()}`, balance: 0, ...supplierData };
        const previousSuppliers = suppliersRef.current;
        setSuppliers(current => [...current, newSupplier]);
        try {
            await addSupplierInDB(newSupplier);
        } catch (e) {
            setSuppliers(previousSuppliers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add supplier.'});
            throw e;
        }
    }, [t, toast]);

    const updateSupplier = useCallback(async (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => {
        const previousSuppliers = suppliersRef.current;
        setSuppliers(current => current.map(s => s.id === supplierId ? { ...s, ...supplierData, id: supplierId } : s));
        try {
            await updateSupplierInDB(supplierId, supplierData);
        } catch (e) {
            setSuppliers(previousSuppliers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update supplier.'});
            throw e;
        }
    }, [t, toast]);

    const deleteSupplier = useCallback(async (supplierId: string) => {
        if (supplierInvoicesRef.current.some(invoice => invoice.supplierId === supplierId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.suppliers.deleteErrorInUse });
            return;
        }
        const previousSuppliers = suppliersRef.current;
        setSuppliers(current => current.filter(s => s.id !== supplierId));
        try {
            await deleteSupplierInDB(supplierId);
            toast({ title: t.suppliers.supplierDeleted });
        } catch (e) {
            setSuppliers(previousSuppliers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete supplier.'});
        }
    }, [t, toast]);
    
    const addSupplierInvoice = useCallback(async (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string }) => {
        const totalAmount = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
        const newInvoice: SupplierInvoice = { id: `SINV-${new Date().getTime()}`, date: new Date().toISOString(), isPayment: false, totalAmount, ...invoiceData };
        
        const previousStates = { products: productsRef.current, suppliers: suppliersRef.current, supplierInvoices: supplierInvoicesRef.current };

        setSupplierInvoices(current => [...current, newInvoice]);
        setSuppliers(current => current.map(s => s.id === invoiceData.supplierId ? { ...s, balance: (s.balance || 0) + (totalAmount - (invoiceData.amountPaid || 0)) } : s));
        
        const updatedProducts = calculateUpdatedProductsForInvoice(productsRef.current, invoiceData.items, invoiceData.priceUpdateStrategy as 'master' | 'average' | 'none');
        setProducts(updatedProducts);

        try {
            await processSupplierInvoice({ invoice: newInvoice, priceUpdateStrategy: invoiceData.priceUpdateStrategy });
        } catch (error) {
            setProducts(previousStates.products);
            setSuppliers(previousStates.suppliers);
            setSupplierInvoices(previousStates.supplierInvoices);
            console.error("Failed to process supplier invoice:", error);
            toast({ variant: 'destructive', title: "Save Error", description: "Could not save supplier invoice." });
        }
    }, [toast]);
    
    const makePaymentToSupplier = useCallback(async (supplierId: string, amount: number) => {
        const paymentRecord: SupplierInvoice = { id: `SPAY-${new Date().getTime()}`, supplierId, date: new Date().toISOString(), items: [], totalAmount: amount, isPayment: true, amountPaid: amount };
        
        const previousStates = { suppliers: suppliersRef.current, supplierInvoices: supplierInvoicesRef.current };
        
        setSuppliers(current => current.map(s => s.id === supplierId ? { ...s, balance: s.balance - amount } : s));
        setSupplierInvoices(current => [...current, paymentRecord]);

        try {
            await processSupplierPayment({ paymentRecord });
        } catch (error) {
            setSuppliers(previousStates.suppliers);
            setSupplierInvoices(previousStates.supplierInvoices);
            console.error("Failed to process supplier payment:", error);
            toast({ variant: 'destructive', title: "Save Error", description: "Could not save supplier payment." });
        }
    }, [toast]);

    const addExpense = useCallback(async (expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { id: `exp-${new Date().getTime()}`, ...expenseData };
        const previousExpenses = expensesRef.current;
        setExpenses(current => [...current, newExpense]);
        try {
            await addExpenseInDB(newExpense);
        } catch (e) {
            setExpenses(previousExpenses);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add expense.' });
            throw e;
        }
    }, [t, toast]);

    const updateExpense = useCallback(async (expenseId: string, expenseData: Partial<Omit<Expense, 'id'>>) => {
        const previousExpenses = expensesRef.current;
        setExpenses(current => current.map(e => e.id === expenseId ? { ...e, ...expenseData, id: expenseId } : e));
        try {
            await updateExpenseInDB(expenseId, expenseData);
        } catch (e) {
            setExpenses(previousExpenses);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update expense.' });
            throw e;
        }
    }, [t, toast]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        const previousExpenses = expensesRef.current;
        setExpenses(current => current.filter(e => e.id !== expenseId));
        try {
            await deleteExpenseInDB(expenseId);
            toast({ title: t.expenses.expenseDeleted });
        } catch (e) {
            setExpenses(previousExpenses);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete expense.' });
        }
    }, [t, toast]);

    const restoreData = useCallback(async (data: any) => {
        setIsLoading(true);
        try {
            await restoreBackupData(data);
            await syncData();
        } catch(error) {
            console.error("Failed to restore data:", error);
            throw error; 
        } finally {
            setIsLoading(false);
        }
    }, [syncData]);

    const value = useMemo(() => ({
        products,
        customers,
        salesHistory,
        bakeryOrders,
        suppliers,
        supplierInvoices,
        expenses,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSaleRecord,
        makePayment,
        restoreData,
        addBakeryOrder,
        updateBakeryOrder,
        deleteBakeryOrder,
        deleteRecurringPattern,
        setBakeryOrders,
        setAsRecurringTemplate,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierInvoice,
        makePaymentToSupplier,
        addExpense,
        updateExpense,
        deleteExpense,
    }), [
        products, customers, salesHistory, bakeryOrders, suppliers, supplierInvoices, expenses, isLoading,
        addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer,
        addSaleRecord, makePayment, restoreData, addBakeryOrder, updateBakeryOrder, deleteBakeryOrder,
        deleteRecurringPattern, setBakeryOrders, setAsRecurringTemplate, addSupplier, updateSupplier,
        deleteSupplier, addSupplierInvoice, makePaymentToSupplier, addExpense, updateExpense, deleteExpense
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
