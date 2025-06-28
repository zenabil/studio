'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
    type Product,
    type Customer,
    type SaleRecord,
    type CartItem,
    type BakeryOrder,
    type Supplier,
    type SupplierInvoice,
    type SupplierInvoiceItem,
} from '@/lib/data';
import {
    getProducts,
    getCustomers,
    getSalesHistory,
    getBakeryOrders,
    getSuppliers,
    getSupplierInvoices,
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
    setRecurringStatusForOrderNameInDB,
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
    isLoading: boolean;
    addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
    updateProduct: (productId: string, productData: Partial<Omit<Product, 'id'>>) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => Promise<void>;
    updateCustomer: (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
    addSaleRecord: (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => Promise<void>;
    makePayment: (customerId: string, amount: number) => Promise<void>;
    restoreData: (data: { products: Product[]; customers: Customer[]; salesHistory: SaleRecord[]; bakeryOrders: BakeryOrder[]; suppliers: Supplier[]; supplierInvoices: SupplierInvoice[] }) => Promise<void>;
    addBakeryOrder: (orderData: Omit<BakeryOrder, 'id'>) => Promise<void>;
    updateBakeryOrder: (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => Promise<void>;
    deleteBakeryOrder: (orderId: string) => Promise<void>;
    setBakeryOrders: (orders: BakeryOrder[]) => Promise<void>;
    setRecurringStatusForOrderName: (orderName: string, isRecurring: boolean) => Promise<void>;
    addSupplier: (supplierData: Omit<Supplier, 'id' | 'balance'>) => Promise<void>;
    updateSupplier: (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    addSupplierInvoice: (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string }) => Promise<void>;
    makePaymentToSupplier: (supplierId: string, amount: number) => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(true);

    const syncData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [loadedProducts, loadedCustomers, loadedSalesHistory, loadedBakeryOrders, loadedSuppliers, loadedSupplierInvoices] = await Promise.all([
                getProducts(),
                getCustomers(),
                getSalesHistory(),
                getBakeryOrders(),
                getSuppliers(),
                getSupplierInvoices(),
            ]);
            setProducts(loadedProducts);
            setCustomers(loadedCustomers);
            setSalesHistory(loadedSalesHistory);
            setBakeryOrdersState(loadedBakeryOrders);
            setSuppliers(loadedSuppliers);
            setSupplierInvoices(loadedSupplierInvoices);
        } catch (error) {
            console.error("Failed to sync data:", error);
            // Don't toast here as it can be triggered by the key error which is handled in data-actions
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial data load
    useEffect(() => {
        syncData();
    }, [syncData]);

    const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
        const newProduct: Product = {
            id: `prod-${new Date().getTime()}`,
            ...productData,
        };
        
        const previousProducts = products;
        setProducts(current => [...current, newProduct]);
        try {
            await addProductInDB(newProduct);
            return newProduct;
        } catch (e) {
            setProducts(previousProducts);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to save product.'});
            throw e;
        }
    };

    const updateProduct = async (productId: string, productData: Partial<Omit<Product, 'id'>>) => {
        const previousProducts = products;
        setProducts(current => current.map(p => p.id === productId ? { ...p, ...productData, id: productId } : p));
        try {
            await updateProductInDB(productId, productData);
        } catch (e) {
            setProducts(previousProducts);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update product.'});
            throw e;
        }
    };

    const deleteProduct = async (productId: string) => {
        if (salesHistory.some(sale => sale.items.some(item => item.id === productId)) || supplierInvoices.some(invoice => invoice.items.some(item => item.productId === productId))) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.products.deleteErrorInUse });
            return;
        }

        const previousProducts = products;
        setProducts(current => current.filter(p => p.id !== productId));
        try {
            await deleteProductInDB(productId);
            toast({ title: t.products.productDeleted });
        } catch (e) {
            setProducts(previousProducts);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete product.'});
        }
    };

    const addCustomer = async (customerData: Omit<Customer, 'id' | 'spent' | 'balance'>) => {
        const newCustomer: Customer = {
            id: `cust-${new Date().getTime()}`,
            spent: 0,
            balance: 0,
            ...customerData,
        };
        
        const previousCustomers = customers;
        setCustomers(current => [...current, newCustomer]);
        try {
            await addCustomerInDB(newCustomer);
        } catch (e) {
            setCustomers(previousCustomers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add customer.'});
            throw e;
        }
    };
    
    const updateCustomer = async (customerId: string, customerData: Partial<Omit<Customer, 'id' | 'spent' | 'balance'>>) => {
        const previousCustomers = customers;
        setCustomers(current => current.map(c => c.id === customerId ? { ...c, ...customerData, id: customerId } : c));
        try {
            await updateCustomerInDB(customerId, customerData);
        } catch (e) {
            setCustomers(previousCustomers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update customer.'});
            throw e;
        }
    };

    const deleteCustomer = async (customerId: string) => {
        if (salesHistory.some(sale => sale.customerId === customerId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.customers.deleteErrorInUse });
            return;
        }

        const previousCustomers = customers;
        setCustomers(current => current.filter(c => c.id !== customerId));
        try {
            await deleteCustomerInDB(customerId);
            toast({ title: t.customers.customerDeleted });
        } catch (e) {
            setCustomers(previousCustomers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete customer.'});
        }
    };
    
    const addSaleRecord = async (cart: CartItem[], customerId: string | null, totals: SaleRecord['totals']) => {
        const newSale: SaleRecord = { id: `SALE-${new Date().getTime()}`, customerId, items: cart, totals, date: new Date().toISOString() };

        const previousStates = { products, customers, salesHistory };
        
        // Optimistic UI updates
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
            throw error; // Re-throw to be handled by the UI component
        }
    };
    
    const makePayment = async (customerId: string, amount: number) => {
        const paymentRecord: SaleRecord = { id: `PAY-${new Date().getTime()}`, customerId, items: [], totals: { subtotal: 0, discount: 0, total: amount, amountPaid: amount, balance: -amount }, date: new Date().toISOString() };

        const previousStates = { customers, salesHistory };

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
    };

    const addBakeryOrder = async (orderData: Omit<BakeryOrder, 'id'>) => {
        const newOrder: BakeryOrder = { id: `b-order-${new Date().getTime()}`, ...orderData };
        const previousOrders = bakeryOrders;
        setBakeryOrdersState(current => [...current, newOrder]);
        try {
            await addBakeryOrderInDB(newOrder);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add bakery order.'});
            throw e;
        }
    };

    const updateBakeryOrder = async (orderId: string, orderData: Partial<Omit<BakeryOrder, 'id'>>) => {
        const previousOrders = bakeryOrders;
        setBakeryOrdersState(current => current.map(o => o.id === orderId ? { ...o, ...orderData, id: orderId } : o));
        try {
            await updateBakeryOrderInDB(orderId, orderData);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update bakery order.'});
            throw e;
        }
    };
    
    const deleteBakeryOrder = async (orderId: string) => {
        const previousOrders = bakeryOrders;
        setBakeryOrdersState(current => current.filter(o => o.id !== orderId));
        try {
            await deleteBakeryOrderInDB(orderId);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete bakery order.'});
            throw e;
        }
    };

    const setBakeryOrders = async (orders: BakeryOrder[]) => {
       const previousOrders = bakeryOrders;
       setBakeryOrdersState(orders);
       try {
           await saveBakeryOrders(orders);
       } catch (e) {
           setBakeryOrdersState(previousOrders);
           toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to save bakery orders.'});
           throw e;
       }
    }

    const setRecurringStatusForOrderName = async (orderName: string, isRecurring: boolean) => {
        const previousOrders = bakeryOrders;
        setBakeryOrdersState(current => current.map(o => o.name === orderName ? { ...o, isRecurring } : o));
        try {
            await setRecurringStatusForOrderNameInDB(orderName, isRecurring);
        } catch (e) {
            setBakeryOrdersState(previousOrders);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update recurring status.'});
            throw e;
        }
    };

    const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'balance'>) => {
        const newSupplier: Supplier = { id: `supp-${new Date().getTime()}`, balance: 0, ...supplierData };
        const previousSuppliers = suppliers;
        setSuppliers(current => [...current, newSupplier]);
        try {
            await addSupplierInDB(newSupplier);
        } catch (e) {
            setSuppliers(previousSuppliers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to add supplier.'});
            throw e;
        }
    };

    const updateSupplier = async (supplierId: string, supplierData: Partial<Omit<Supplier, 'id' | 'balance'>>) => {
        const previousSuppliers = suppliers;
        setSuppliers(current => current.map(s => s.id === supplierId ? { ...s, ...supplierData, id: supplierId } : s));
        try {
            await updateSupplierInDB(supplierId, supplierData);
        } catch (e) {
            setSuppliers(previousSuppliers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to update supplier.'});
            throw e;
        }
    };

    const deleteSupplier = async (supplierId: string) => {
        if (supplierInvoices.some(invoice => invoice.supplierId === supplierId)) {
            toast({ variant: 'destructive', title: t.errors.title, description: t.suppliers.deleteErrorInUse });
            return;
        }
        const previousSuppliers = suppliers;
        setSuppliers(current => current.filter(s => s.id !== supplierId));
        try {
            await deleteSupplierInDB(supplierId);
            toast({ title: t.suppliers.supplierDeleted });
        } catch (e) {
            setSuppliers(previousSuppliers);
            toast({ variant: 'destructive', title: t.errors.title, description: 'Failed to delete supplier.'});
        }
    };
    
    const addSupplierInvoice = async (invoiceData: { supplierId: string; items: SupplierInvoiceItem[]; amountPaid?: number; priceUpdateStrategy: string }) => {
        const totalAmount = invoiceData.items.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
        const newInvoice: SupplierInvoice = { id: `SINV-${new Date().getTime()}`, date: new Date().toISOString(), isPayment: false, totalAmount, ...invoiceData };
        
        const previousStates = { products, suppliers, supplierInvoices };

        // Optimistic update
        setSupplierInvoices(current => [...current, newInvoice]);
        setSuppliers(current => current.map(s => s.id === invoiceData.supplierId ? { ...s, balance: (s.balance || 0) + (totalAmount - (invoiceData.amountPaid || 0)) } : s));
        
        // Use the centralized utility function for product updates
        const updatedProducts = calculateUpdatedProductsForInvoice(products, invoiceData.items, invoiceData.priceUpdateStrategy as 'master' | 'average' | 'none');
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
    };
    
    const makePaymentToSupplier = async (supplierId: string, amount: number) => {
        const paymentRecord: SupplierInvoice = { id: `SPAY-${new Date().getTime()}`, supplierId, date: new Date().toISOString(), items: [], totalAmount: amount, isPayment: true, amountPaid: amount };
        
        const previousStates = { suppliers, supplierInvoices };
        
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
    };

    const restoreData = async (data: any) => {
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
    };

    const value = {
        products,
        customers,
        salesHistory,
        bakeryOrders,
        suppliers,
        supplierInvoices,
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
        setBakeryOrders,
        setRecurringStatusForOrderName,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierInvoice,
        makePaymentToSupplier,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
